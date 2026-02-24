import Booking from '../models/Booking';
import PoolingOffer from '../models/PoolingOffer';
import RentalOffer from '../models/RentalOffer';
import User from '../models/User';
import { NotFoundError, ConflictError } from '../utils/errors';
import logger from '../utils/logger';
import { calculatePlatformFee, timeSlotsOverlap, timeToMinutes, calculateDurationHours, generateUserId } from '../utils/helpers';
import { BookingStatus, ServiceType, PaymentMethod, Route } from '../types';
import { priceCalculationService } from './price-calculation.service';
import { conversationService } from './conversation.service';

class BookingService {
  /**
   * Create pooling booking
   * Supports intermediate pickup/drop-off (Edge Case 1)
   */
  async createPoolingBooking(data: {
    userId: string;
    poolingOfferId: string;
    paymentMethod?: PaymentMethod;
    seatsBooked?: number;
    coPassengers?: Array<{
      name: string;
      age: number;
      gender: 'Male' | 'Female' | 'Other';
    }>;
    passengerRoute: Route; // Required: passenger's specific route for dynamic pricing
    calculatedPrice?: {
      finalPrice: number;
      platformFee: number;
      totalAmount: number;
    }; // Pre-calculated price (optional, will calculate if not provided)
  }): Promise<any> {
    try {
      // Get offer
      const offer = await PoolingOffer.findOne({ offerId: data.poolingOfferId });
      if (!offer) {
        throw new NotFoundError('Pooling offer not found');
      }

      // Check if offer is available
      if (offer.status !== 'active' && offer.status !== 'pending') {
        throw new ConflictError('Offer is not available for booking');
      }

      const seatsBooked = data.seatsBooked ?? 1;
      const coPassengers = data.coPassengers ?? [];

      if (seatsBooked < 1) {
        throw new ConflictError('At least 1 seat must be booked');
      }

      if (coPassengers.length !== seatsBooked - 1) {
        throw new ConflictError(`Please provide details for exactly ${seatsBooked - 1} co-passenger(s)`);
      }

      if (offer.availableSeats < seatsBooked) {
        throw new ConflictError(`Only ${offer.availableSeats} seat(s) available`);
      }

      if (offer.availableSeats <= 0) {
        throw new ConflictError('No seats available');
      }

      // Check if user already has a booking for this offer
      const existingBooking = await Booking.findOne({
        userId: data.userId,
        poolingOfferId: data.poolingOfferId,
        status: { $in: ['pending', 'confirmed', 'in_progress'] },
      });

      if (existingBooking) {
        throw new ConflictError('You already have a booking for this offer');
      }

      // Get user info
      const user = await User.findOne({ userId: data.userId });
      if (!user) {
        throw new NotFoundError('User not found');
      }

      // Calculate per-seat amounts using dynamic pricing
      let amount: number;
      let platformFee: number;
      let totalAmount: number;

      if (data.calculatedPrice) {
        // Use pre-calculated price
        amount = data.calculatedPrice.finalPrice;
        platformFee = data.calculatedPrice.platformFee;
        totalAmount = data.calculatedPrice.totalAmount;
      } else {
        // Calculate price dynamically
        const priceBreakdown = await priceCalculationService.calculatePrice({
          passengerRoute: data.passengerRoute,
          offerId: data.poolingOfferId,
          vehicleType: offer.vehicle.type,
          offerDate: offer.date,
          offerTime: offer.time,
        });
        amount = priceBreakdown.finalPrice;
        platformFee = priceBreakdown.platformFee;
        totalAmount = priceBreakdown.totalAmount;
      }

      const totalBaseAmount = parseFloat((amount * seatsBooked).toFixed(2));
      const totalPlatformFee = parseFloat((platformFee * seatsBooked).toFixed(2));
      const totalBookingAmount = parseFloat((totalAmount * seatsBooked).toFixed(2));

      // Use passenger route (required for dynamic pricing)
      const bookingRoute = data.passengerRoute;

      // Create booking
      const booking = await Booking.create({
        userId: data.userId,
        serviceType: 'pooling',
        poolingOfferId: data.poolingOfferId,
        route: bookingRoute,
        date: offer.date,
        time: offer.time,
        driver: {
          userId: offer.driverId,
          name: offer.driverName,
          photo: offer.driverPhoto,
          phone: '', // Will be populated from User model if needed
        },
        vehicle: {
          type: offer.vehicle.type,
          brand: offer.vehicle.brand,
          number: offer.vehicle.number,
        },
        amount: totalBaseAmount,
        platformFee: totalPlatformFee,
        totalAmount: totalBookingAmount,
        paymentMethod: data.paymentMethod,
        paymentStatus: 'pending', // Payment happens at trip end for all bookings
        // Keep pooling aligned with the trip-end payment model:
        // booking should be actionable before payment, same as rental.
        status: 'confirmed',
        passengerStatus: 'waiting', // Initial status: waiting to get in
        seatsBooked,
        coPassengers,
        passengers: [
          {
            userId: data.userId,
            name: user.name,
            status: 'confirmed',
          },
        ],
      });

      // Update offer
      const wasFirstBooking = offer.passengers.length === 0; // Check before adding passenger
      const allSeatsWillBeFilled = offer.availableSeats === seatsBooked; // Check before decrementing
      
      offer.availableSeats -= seatsBooked;
      offer.bookingRequests += 1;
      offer.passengers.push({
        userId: data.userId,
        name: user.name,
        status: 'confirmed',
        seatsBooked,
      });
      
      // Update status based on bookings
      if (allSeatsWillBeFilled) {
        // This booking fills all seats - mark as booked
        offer.status = 'booked';
        logger.info(`Offer ${offer.offerId} marked as booked - all seats filled`);
      } else if (wasFirstBooking && offer.status === 'pending') {
        // First booking - mark as active
        offer.status = 'active';
        logger.info(`Offer ${offer.offerId} marked as active - first booking`);
      }
      
      await offer.save();

      // Auto-create conversation for this booking
      try {
        await conversationService.createOrGetConversation(booking.bookingId, 'pooling');
        logger.info(`✅ Conversation auto-created for pooling booking ${booking.bookingId}`);
      } catch (error) {
        logger.error(`Failed to create conversation for booking ${booking.bookingId}:`, error);
        // Don't fail the booking creation if conversation creation fails
      }

      logger.info(`Pooling booking created: ${booking.bookingId}`);

      return booking.toJSON();
    } catch (error) {
      logger.error('Error creating pooling booking:', error);
      throw error;
    }
  }

  /**
   * Create rental booking
   * Supports time slot selection for multiple bookings on same offer
   */
  async createRentalBooking(data: {
    userId: string;
    rentalOfferId: string;
    duration?: number; // in hours (optional if startTime/endTime provided)
    startTime?: string; // HH:mm format (e.g., "09:00")
    endTime?: string; // HH:mm format (e.g., "17:00")
    paymentMethod: PaymentMethod;
  }): Promise<any> {
    try {
      // Get offer
      const offer = await RentalOffer.findOne({ offerId: data.rentalOfferId });
      if (!offer) {
        throw new NotFoundError('Rental offer not found');
      }

      // Check if offer is available
      if (offer.status !== 'active' && offer.status !== 'pending') {
        throw new ConflictError('Offer is not available for booking');
      }

      // Determine duration and time slots
      let duration: number;
      let startTime: string | undefined;
      let endTime: string | undefined;

      if (data.startTime && data.endTime) {
        // Time slot provided - calculate duration
        startTime = data.startTime;
        endTime = data.endTime;
        duration = calculateDurationHours(startTime, endTime);

        // Validate time slot is within offer's available window
        const offerStartMinutes = timeToMinutes(offer.availableFrom);
        const offerEndMinutes = timeToMinutes(offer.availableUntil);
        const slotStartMinutes = timeToMinutes(startTime);
        const slotEndMinutes = timeToMinutes(endTime);

        // Handle next day case for offer end time
        let offerEndAdj = offerEndMinutes;
        if (offerEndMinutes < offerStartMinutes) {
          offerEndAdj = offerEndMinutes + 24 * 60;
        }

        // Handle next day case for slot end time
        let slotEndAdj = slotEndMinutes;
        if (slotEndMinutes < slotStartMinutes) {
          slotEndAdj = slotEndMinutes + 24 * 60;
        }

        if (slotStartMinutes < offerStartMinutes || slotEndAdj > offerEndAdj) {
          throw new ConflictError('Selected time slot is outside the offer\'s available window');
        }

        // Check for overlapping bookings
        const hasConflict = await this.checkTimeSlotConflict(
          data.rentalOfferId,
          offer.date,
          startTime,
          endTime
        );

        if (hasConflict) {
          throw new ConflictError('This time slot overlaps with an existing booking');
        }
      } else if (data.duration) {
        // Duration provided (legacy support)
        duration = data.duration;
      } else {
        throw new ConflictError('Either duration or startTime/endTime must be provided');
      }

      // Check minimum hours
      if (duration < offer.minimumHours) {
        throw new ConflictError(`Minimum rental duration is ${offer.minimumHours} hours`);
      }

      // Get user info
      const user = await User.findOne({ userId: data.userId });
      if (!user) {
        throw new NotFoundError('User not found');
      }

      // Calculate amounts
      const amount = offer.pricePerHour * duration;
      const platformFee = calculatePlatformFee(amount);
      const totalAmount = amount + platformFee;

      // Determine booking status based on payment method
      // NEW PAYMENT MODEL: All bookings are confirmed immediately (payment happens at trip end)
      const bookingStatus = 'confirmed';
      const paymentStatus = 'pending'; // Payment happens at trip end via Razorpay

      // Create booking
      const booking = await Booking.create({
        userId: data.userId,
        serviceType: 'rental',
        rentalOfferId: data.rentalOfferId,
        date: offer.date,
        duration: duration,
        startTime: startTime,
        endTime: endTime,
        owner: {
          userId: offer.ownerId,
          name: offer.ownerName,
          photo: offer.ownerPhoto,
        },
        vehicle: {
          type: offer.vehicle.type,
          brand: offer.vehicle.brand,
          number: offer.vehicle.number,
        },
        amount: amount,
        platformFee: platformFee,
        totalAmount: totalAmount,
        paymentMethod: data.paymentMethod,
        paymentStatus: paymentStatus,
        status: bookingStatus, // 'confirmed' for offline cash, 'pending' for online payment
        passengerStatus: 'waiting', // Initial status: waiting to get in
      });

      // Update offer
      offer.totalBookings += 1;
      
      // Update status based on bookings
      // For rental, mark as active on first booking, booked when payment is confirmed
      // (Status will be updated to 'booked' when payment is verified)
      if (offer.status === 'pending' && offer.totalBookings === 1) {
        // First booking - mark as active
        offer.status = 'active';
      }
      
      await offer.save();

      // Auto-create conversation for this booking
      try {
        await conversationService.createOrGetConversation(booking.bookingId, 'rental');
        logger.info(`✅ Conversation auto-created for rental booking ${booking.bookingId}`);
      } catch (error) {
        logger.error(`Failed to create conversation for booking ${booking.bookingId}:`, error);
        // Don't fail the booking creation if conversation creation fails
      }

      logger.info(`Rental booking created: ${booking.bookingId} (${startTime || 'N/A'} - ${endTime || 'N/A'})`);

      return booking.toJSON();
    } catch (error) {
      logger.error('Error creating rental booking:', error);
      throw error;
    }
  }

  /**
   * Check if a time slot conflicts with existing bookings
   */
  async checkTimeSlotConflict(
    rentalOfferId: string,
    date: Date,
    startTime: string,
    endTime: string
  ): Promise<boolean> {
    try {
      // Get start and end of the day
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      // Get all bookings for this offer on the same date that are not cancelled
      const existingBookings = await Booking.find({
        rentalOfferId,
        date: {
          $gte: startOfDay,
          $lte: endOfDay,
        },
        status: { $ne: 'cancelled' },
        startTime: { $exists: true },
        endTime: { $exists: true },
      });

      // Check for overlaps
      for (const booking of existingBookings) {
        // Skip completed bookings (they don't block new bookings)
        if (booking.status === 'completed') continue;

        if (booking.startTime && booking.endTime) {
          const overlaps = timeSlotsOverlap(
            startTime,
            endTime,
            booking.startTime,
            booking.endTime
          );

          if (overlaps) {
            logger.info(
              `Time slot conflict detected: ${startTime}-${endTime} overlaps with booking ${booking.bookingId} (${booking.startTime}-${booking.endTime})`
            );
            return true;
          }
        }
      }

      return false;
    } catch (error) {
      logger.error('Error checking time slot conflict:', error);
      throw error;
    }
  }

  /**
   * Get user bookings (as passenger)
   */
  async getUserBookings(userId: string, filters?: {
    status?: BookingStatus;
    serviceType?: ServiceType;
    page?: number;
    limit?: number;
  }): Promise<{ bookings: any[]; total: number; page: number; limit: number }> {
    try {
      const page = filters?.page || 1;
      const limit = filters?.limit || 20;
      const skip = (page - 1) * limit;

      // Include both bookings where user is passenger AND where user is driver/owner
      const query: any = {
        $or: [
          { userId }, // User as passenger
          { 'driver.userId': userId }, // User as driver (pooling)
          { 'owner.userId': userId }, // User as owner (rental)
        ],
      };

      if (filters?.status) {
        query.status = filters.status;
      }

      if (filters?.serviceType) {
        query.serviceType = filters.serviceType;
      }

      const total = await Booking.countDocuments(query);
      const bookings = await Booking.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      return {
        bookings: bookings.map((b) => b.toJSON()),
        total,
        page,
        limit,
      };
    } catch (error) {
      logger.error('Error getting user bookings:', error);
      throw error;
    }
  }

  /**
   * Get driver bookings (bookings where user is driver/owner)
   */
  async getDriverBookings(driverId: string, filters?: {
    status?: BookingStatus;
    serviceType?: ServiceType;
    page?: number;
    limit?: number;
  }): Promise<{ bookings: any[]; total: number; page: number; limit: number }> {
    try {
      const page = filters?.page || 1;
      const limit = filters?.limit || 20;
      const skip = (page - 1) * limit;

      const query: any = {
        $or: [
          { 'driver.userId': driverId },
          { 'owner.userId': driverId },
        ],
      };

      if (filters?.status) {
        query.status = filters.status;
      }

      if (filters?.serviceType) {
        query.serviceType = filters.serviceType;
      }

      const total = await Booking.countDocuments(query);
      const bookings = await Booking.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      return {
        bookings: bookings.map((b) => b.toJSON()),
        total,
        page,
        limit,
      };
    } catch (error) {
      logger.error('Error getting driver bookings:', error);
      throw error;
    }
  }

  /**
   * Get booking by offer ID (for drivers to find booking for their offer)
   * For pooling, there can be multiple bookings - returns the first booking found
   * For rental, there's typically one booking
   * This should work for both 'active' and 'booked' offer statuses
   */
  async getBookingByOfferId(offerId: string, serviceType: ServiceType, driverId: string): Promise<any> {
    try {
      const query: any = serviceType === 'pooling' 
        ? { poolingOfferId: offerId }
        : { rentalOfferId: offerId };

      // First, try to find any booking with active statuses (pending, confirmed, in_progress)
      // This covers cases where payment is pending or confirmed
      query.status = { $in: ['pending', 'confirmed', 'in_progress'] };

      // Get booking and verify driver owns the offer
      let booking = await Booking.findOne(query).sort({ createdAt: -1 }); // Get most recent
      
      // If no booking found with active statuses, try without status filter
      // This handles edge cases where booking might be in a different state
      if (!booking) {
        logger.info(`No active booking found, searching all bookings for offer ${offerId}`);
        const queryWithoutStatus: any = serviceType === 'pooling' 
          ? { poolingOfferId: offerId }
          : { rentalOfferId: offerId };
        
        booking = await Booking.findOne(queryWithoutStatus).sort({ createdAt: -1 });
      }
      
      if (!booking) {
        logger.warn(`No booking found for offer ${offerId}, serviceType ${serviceType}, driverId ${driverId}`);
        return null;
      }

      // Verify driver matches
      const isDriver = booking.driver?.userId === driverId;
      const isOwner = booking.owner?.userId === driverId;

      if (!isDriver && !isOwner) {
        logger.warn(`Driver ${driverId} not authorized for booking ${booking.bookingId}`);
        throw new ConflictError('You are not authorized to access this booking');
      }

      logger.info(`Found booking ${booking.bookingId} for offer ${offerId}, status: ${booking.status}`);
      return booking.toJSON();
    } catch (error) {
      logger.error('Error getting booking by offer ID:', error);
      throw error;
    }
  }

  /**
   * Get all bookings for an offer (for owners to manage multiple bookings)
   * Returns all bookings for a rental offer, populated with user information
   */
  async getBookingsByOfferId(offerId: string, serviceType: ServiceType, ownerId: string): Promise<any[]> {
    try {
      const query: any = serviceType === 'pooling' 
        ? { poolingOfferId: offerId }
        : { rentalOfferId: offerId };

      // Verify owner matches FIRST (check if owner created the offer)
      if (serviceType === 'rental') {
        const RentalOffer = (await import('../models/RentalOffer')).default;
        const offer = await RentalOffer.findOne({ offerId });
        if (!offer) {
          throw new NotFoundError('Rental offer not found');
        }
        if (offer.ownerId !== ownerId) {
          logger.warn(`Owner ${ownerId} not authorized for offer ${offerId} (owner: ${offer.ownerId})`);
          throw new ConflictError('You are not authorized to access these bookings');
        }
      } else {
        const PoolingOffer = (await import('../models/PoolingOffer')).default;
        const offer = await PoolingOffer.findOne({ offerId });
        if (!offer) {
          throw new NotFoundError('Pooling offer not found');
        }
        if (offer.driverId !== ownerId) {
          logger.warn(`Driver ${ownerId} not authorized for offer ${offerId} (driver: ${offer.driverId})`);
          throw new ConflictError('You are not authorized to access these bookings');
        }
      }

      // Get all bookings for this offer (excluding cancelled)
      const bookings = await Booking.find({
        ...query,
        status: { $ne: 'cancelled' },
      }).sort({ createdAt: -1 }).lean();

      logger.info(`Found ${bookings.length} bookings for offer ${offerId}, owner ${ownerId}`);

      // Populate userId with user information
      const User = (await import('../models/User')).default;
      const bookingsWithUser = await Promise.all(
        bookings.map(async (booking: any) => {
          if (booking.userId) {
            try {
              const user = await User.findOne({ userId: booking.userId }).select('name photo').lean();
              if (user) {
                booking.userId = { name: user.name, photo: user.profilePhoto };
              }
            } catch (error) {
              logger.warn(`Failed to fetch user for booking ${booking.bookingId}:`, error);
            }
          }
          return booking;
        })
      );

      return bookingsWithUser;
    } catch (error) {
      logger.error('Error getting bookings by offer ID:', error);
      throw error;
    }
  }

  /**
   * Get booking by ID
   */
  async getBookingById(bookingId: string, userId?: string): Promise<any> {
    try {
      // First, find the booking by bookingId
      const booking = await Booking.findOne({ bookingId }).lean();
      if (!booking) {
        throw new NotFoundError('Booking not found');
      }

      // If userId is provided, verify the user has access to this booking
      if (userId) {
        // Check if user is the renter (booking.userId) or the owner (for rental bookings)
        const isRenter = booking.userId === userId;
        let isOwner = false;

        // For rental bookings, check if user is the owner of the rental offer
        if (booking.serviceType === 'rental' && booking.rentalOfferId) {
          const RentalOffer = (await import('../models/RentalOffer')).default;
          const rentalOffer = await RentalOffer.findOne({ offerId: booking.rentalOfferId }).lean();
          if (rentalOffer && rentalOffer.ownerId === userId) {
            isOwner = true;
          }
        }

        // For pooling bookings, check if user is the driver
        if (booking.serviceType === 'pooling' && booking.poolingOfferId) {
          const PoolingOffer = (await import('../models/PoolingOffer')).default;
          const poolingOffer = await PoolingOffer.findOne({ offerId: booking.poolingOfferId }).lean();
          if (poolingOffer && poolingOffer.driverId === userId) {
            isOwner = true; // Driver is like owner for pooling
          }
        }

        // If user is neither renter nor owner/driver, deny access
        if (!isRenter && !isOwner) {
          throw new NotFoundError('Booking not found'); // Return same error for security
        }
      }

      // Populate renter info for rental bookings
      if (booking.serviceType === 'rental' && booking.userId) {
        const User = (await import('../models/User')).default;
        try {
          const renter = await User.findOne({ userId: booking.userId })
            .select('userId name profilePhoto rating totalReviews')
            .lean();
          if (renter) {
            (booking as any).renter = {
              userId: renter.userId,
              name: renter.name,
              photo: renter.profilePhoto,
              rating: renter.rating,
              totalReviews: renter.totalReviews,
            };
            (booking as any).user = renter; // Also add as user for compatibility
          }
        } catch (error) {
          logger.warn(`Failed to fetch renter info for booking ${bookingId}:`, error);
        }
      }

      return booking;
    } catch (error) {
      logger.error('Error getting booking by ID:', error);
      throw error;
    }
  }

  /**
   * Preview cancellation fee (no changes made)
   */
  async previewCancellationFee(bookingId: string, userId: string): Promise<any> {
    try {
      const booking = await Booking.findOne({ bookingId, userId });
      if (!booking) {
        throw new NotFoundError('Booking not found');
      }

      if (booking.status === 'cancelled') {
        throw new ConflictError('Booking is already cancelled');
      }
      if (booking.status === 'completed') {
        throw new ConflictError('Cannot cancel completed booking');
      }

      // Count user's past cancellations
      const pastCancellations = await Booking.countDocuments({
        userId,
        status: 'cancelled',
        cancelledBy: 'user',
      });

      const isFirstCancellation = pastCancellations === 0;

      // Calculate hours until trip
      const tripDate = booking.date ? new Date(booking.date) : null;
      const hoursUntilTrip = tripDate
        ? (tripDate.getTime() - Date.now()) / (1000 * 60 * 60)
        : 999; // If no date, treat as far away

      const { getCancellationFeePercentage } = await import('../config/pricing.config');
      const feePercentage = isFirstCancellation
        ? 0
        : getCancellationFeePercentage(hoursUntilTrip, booking.status, 'user');

      const rideAmount = booking.totalAmount || booking.amount || 0;
      const cancellationFee = Math.round((rideAmount * feePercentage) / 100);

      return {
        bookingId,
        rideAmount,
        isFirstCancellation,
        pastCancellations,
        feePercentage,
        cancellationFee,
        hoursUntilTrip: Math.max(0, Math.round(hoursUntilTrip * 10) / 10),
        message: isFirstCancellation
          ? 'First cancellation is FREE! No charges.'
          : cancellationFee > 0
            ? `Cancellation fee: ₹${cancellationFee} (${feePercentage}% of ₹${rideAmount})`
            : 'No cancellation fee for this booking.',
      };
    } catch (error) {
      logger.error('Error previewing cancellation fee:', error);
      throw error;
    }
  }

  /**
   * Cancel booking with fee calculation
   * 1st cancellation = FREE
   * 2nd+ = time-based fee deducted from wallet
   */
  async cancelBooking(
    bookingId: string,
    userId: string,
    reason?: string
  ): Promise<any> {
    try {
      const booking = await Booking.findOne({ bookingId, userId });
      if (!booking) {
        throw new NotFoundError('Booking not found');
      }

      if (booking.status === 'cancelled') {
        throw new ConflictError('Booking is already cancelled');
      }

      if (booking.status === 'completed') {
        throw new ConflictError('Cannot cancel completed booking');
      }

      // Count user's past cancellations (before this one)
      const pastCancellations = await Booking.countDocuments({
        userId,
        status: 'cancelled',
        cancelledBy: 'user',
      });

      const isFirstCancellation = pastCancellations === 0;

      // Calculate hours until trip
      const tripDate = booking.date ? new Date(booking.date) : null;
      const hoursUntilTrip = tripDate
        ? (tripDate.getTime() - Date.now()) / (1000 * 60 * 60)
        : 999;

      const { getCancellationFeePercentage } = await import('../config/pricing.config');
      const feePercentage = isFirstCancellation
        ? 0
        : getCancellationFeePercentage(hoursUntilTrip, booking.status, 'user');

      const rideAmount = booking.totalAmount || booking.amount || 0;
      const cancellationFee = Math.round((rideAmount * feePercentage) / 100);

      // Deduct cancellation fee from wallet (if any)
      let walletDeducted = false;
      if (cancellationFee > 0) {
        try {
          const { walletService } = await import('./wallet.service');
          await walletService.debitWallet(
            userId,
            cancellationFee,
            'cancellation_fee',
            `Cancellation fee for booking ${bookingId} (${feePercentage}% of ₹${rideAmount})`,
            undefined,
            bookingId
          );
          walletDeducted = true;
          logger.info(`💸 Cancellation fee ₹${cancellationFee} deducted from user ${userId} wallet`);
        } catch (walletError) {
          logger.warn(`Could not deduct cancellation fee from wallet:`, walletError);
          // Still allow cancellation even if wallet deduction fails (wallet may go negative)
        }
      }

      // Update booking
      booking.status = 'cancelled';
      booking.cancellationReason = reason;
      booking.cancelledAt = new Date();
      booking.cancelledBy = 'user';
      (booking as any).cancellationFee = cancellationFee;
      await booking.save();

      // Update offer — free up seat
      if (booking.serviceType === 'pooling' && booking.poolingOfferId) {
        const offer = await PoolingOffer.findOne({ offerId: booking.poolingOfferId });
        if (offer) {
          offer.availableSeats += booking.seatsBooked || 1;
          offer.passengers = offer.passengers.filter(
            (p) => p.userId !== userId
          );
          await offer.save();
        }
      } else if (booking.serviceType === 'rental' && booking.rentalOfferId) {
        const offer = await RentalOffer.findOne({ offerId: booking.rentalOfferId });
        if (offer) {
          offer.cancelled += 1;
          await offer.save();
        }
      }

      logger.info(`🚫 Booking cancelled: ${bookingId}`);
      logger.info(`   User: ${userId} | 1st cancel: ${isFirstCancellation} | Fee: ₹${cancellationFee} (${feePercentage}%)`);

      // Handle connected ride cascading cancellation
      if (booking.connectedGroupId) {
        await this.handleConnectedCancellation(booking, 'user');
      }

      return {
        ...booking.toJSON(),
        cancellationDetails: {
          isFirstCancellation,
          feePercentage,
          cancellationFee,
          walletDeducted,
          message: isFirstCancellation
            ? 'Booking cancelled. First cancellation is free!'
            : cancellationFee > 0
              ? `Booking cancelled. ₹${cancellationFee} cancellation fee deducted from wallet.`
              : 'Booking cancelled. No cancellation fee.',
        },
      };
    } catch (error) {
      logger.error('Error cancelling booking:', error);
      throw error;
    }
  }

  /**
   * Update booking status (for drivers/owners)
   */
  async updateBookingStatus(
    bookingId: string,
    status: BookingStatus,
    userId: string
  ): Promise<any> {
    try {
      const booking = await Booking.findOne({ bookingId });
      if (!booking) {
        throw new NotFoundError('Booking not found');
      }

      // Verify user is driver or owner
      const isDriver = booking.driver?.userId === userId;
      const isOwner = booking.owner?.userId === userId;

      if (!isDriver && !isOwner) {
        throw new ConflictError('You are not authorized to update this booking status');
      }

      // Validate status transition
      if (status === 'in_progress') {
        // Allow if already in_progress (idempotent operation)
        if (booking.status === 'in_progress') {
          logger.info(`Booking ${bookingId} is already in_progress`);
          return booking.toJSON();
        }
        // Only allow transition from pending or confirmed
        if (booking.status !== 'confirmed' && booking.status !== 'pending') {
          throw new ConflictError(`Cannot start trip. Current status: ${booking.status}`);
        }
      }

      if (status === 'completed' && booking.status !== 'in_progress') {
        throw new ConflictError(`Cannot complete trip. Current status: ${booking.status}`);
      }

      booking.status = status;
      
      // If marking as in_progress, set tripStartedAt
      if (status === 'in_progress' && !booking.tripStartedAt) {
        booking.tripStartedAt = new Date();
        logger.info(`Trip started at: ${booking.tripStartedAt} for booking ${bookingId}`);
      }
      
      // If marking as completed, also set tripCompletedAt and process settlement
      if (status === 'completed') {
        booking.tripCompletedAt = new Date();
        
        // Calculate settlement amount (owner gets rental amount, platform keeps fee)
        const ownerSettlementAmount = booking.amount;
        booking.driverSettlementAmount = ownerSettlementAmount; // For rental, owner is like driver
        
        // Process settlement based on payment method
        let ownerId = booking.owner?.userId || booking.driver?.userId;
        
        // Fallback: Get ownerId from rental offer if not in booking
        if (!ownerId && booking.rentalOfferId) {
          const RentalOffer = (await import('../models/RentalOffer')).default;
          const rentalOffer = await RentalOffer.findOne({ offerId: booking.rentalOfferId });
          if (rentalOffer) {
            ownerId = rentalOffer.ownerId;
            logger.info(`🔍 Got ownerId from rental offer: ${ownerId}`);
          }
        }
        
        logger.info(`🔍 Completing booking ${bookingId}: ownerId=${ownerId}, paymentMethod=${booking.paymentMethod}, serviceType=${booking.serviceType}`);
        logger.info(`🔍 Booking owner field: ${JSON.stringify(booking.owner)}`);
        logger.info(`🔍 Booking driver field: ${JSON.stringify(booking.driver)}`);
        logger.info(`🔍 Booking rentalOfferId: ${booking.rentalOfferId}`);
        
        if (!ownerId) {
          logger.warn(`⚠️ No ownerId found for booking ${bookingId}. Owner: ${JSON.stringify(booking.owner)}, Driver: ${JSON.stringify(booking.driver)}`);
        } else {
          // NEW PAYMENT MODEL: Payment at trip end via Razorpay
          // Create Razorpay order for the renter to pay
          const { paymentService } = await import('./payment.service');
          await paymentService.createRidePaymentOrder({
            bookingId,
            userId: booking.userId,
            driverId: ownerId,
            amount: booking.amount,
            platformFee: booking.platformFee || 0,
            totalAmount: booking.totalAmount,
          });
          
          booking.settlementStatus = 'pending';
          booking.paymentStatus = 'pending';
          
          logger.info(`💰 Rental payment order created at trip end: Booking ${bookingId}`);
          logger.info(`   Owner: ${ownerId}`);
          logger.info(`   Amount: ₹${booking.amount}`);
          logger.info(`   Platform fee: ₹${booking.platformFee || 0}`);
          logger.info(`   Total: ₹${booking.totalAmount}`);
        }
      }
      
      await booking.save();

      logger.info(`Booking status updated: ${bookingId} - ${status} by ${userId}`);

      // Handle connected ride cascading cancellation when driver cancels
      if (status === 'cancelled' && booking.connectedGroupId) {
        const cancelledBy = isDriver ? 'driver' : isOwner ? 'owner' : 'system';
        await this.handleConnectedCancellation(booking, cancelledBy);
      }

      // If booking is completed, check if all bookings for this offer are completed
      // If so, mark the offer as completed (this will remove it from My Offers)
      if (status === 'completed') {
        try {
          const offerId = booking.poolingOfferId || booking.rentalOfferId;
          if (offerId) {
            const serviceType = booking.poolingOfferId ? 'pooling' : 'rental';
            const allBookings = await Booking.find({
              [serviceType === 'pooling' ? 'poolingOfferId' : 'rentalOfferId']: offerId,
              status: { $ne: 'cancelled' }, // Exclude cancelled bookings
            });

            const allCompleted = allBookings.length > 0 && allBookings.every(b => b.status === 'completed');
            
            if (allCompleted) {
              if (serviceType === 'pooling') {
                const poolingOffer = await PoolingOffer.findOne({ offerId });
                if (poolingOffer && poolingOffer.status !== 'completed') {
                  poolingOffer.status = 'completed';
                  await poolingOffer.save();
                  logger.info(`✅ Marked pooling offer ${offerId} as completed (all bookings completed via End Trip)`);
                }
              } else {
                const rentalOffer = await RentalOffer.findOne({ offerId });
                if (rentalOffer && rentalOffer.status !== 'completed') {
                  rentalOffer.status = 'completed';
                  await rentalOffer.save();
                  logger.info(`✅ Marked rental offer ${offerId} as completed (all bookings completed via End Trip)`);
                }
              }
            }
          }
        } catch (error) {
          logger.warn('Failed to update offer status after booking completion:', error);
          // Don't fail the booking update if offer status update fails
        }
      }

      return booking.toJSON();
    } catch (error) {
      logger.error('Error updating booking status:', error);
      throw error;
    }
  }

  /**
   * Get booking history (includes both passenger and driver bookings)
   */
  async getBookingHistory(userId: string): Promise<{
    upcoming: any[];
    past: any[];
    cancelled: any[];
  }> {
    try {
      const now = new Date();

      // Include both bookings where user is passenger AND where user is driver/owner
      const userQuery = {
        $or: [
          { userId }, // User as passenger
          { 'driver.userId': userId }, // User as driver (pooling)
          { 'owner.userId': userId }, // User as owner (rental)
        ],
      };

      const upcoming = await Booking.find({
        ...userQuery,
        status: { $in: ['pending', 'confirmed', 'in_progress'] },
        date: { $gte: now },
      })
        .sort({ date: 1 })
        .limit(20);

      const past = await Booking.find({
        ...userQuery,
        status: 'completed',
      })
        .sort({ date: -1 })
        .limit(20);

      const cancelled = await Booking.find({
        ...userQuery,
        status: 'cancelled',
      })
        .sort({ cancelledAt: -1 })
        .limit(20);

      return {
        upcoming: upcoming.map((b) => b.toJSON()),
        past: past.map((b) => b.toJSON()),
        cancelled: cancelled.map((b) => b.toJSON()),
      };
    } catch (error) {
      logger.error('Error getting booking history:', error);
      throw error;
    }
  }

  /**
   * Get all passengers for a driver's active trip
   */
  async getTripPassengers(offerId: string, driverId: string, serviceType: ServiceType): Promise<any[]> {
    try {
      const query: any = serviceType === 'pooling'
        ? { poolingOfferId: offerId }
        : { rentalOfferId: offerId };

      query.status = { $in: ['in_progress', 'confirmed'] };

      const bookings = await Booking.find(query).sort({ createdAt: 1 });

      // Verify driver
      if (bookings.length > 0) {
        const firstBooking = bookings[0];
        const isDriver = firstBooking.driver?.userId === driverId;
        if (!isDriver) {
          throw new ConflictError('You are not authorized to view passengers for this trip');
        }
      }

      return bookings.map((booking) => ({
        bookingId: booking.bookingId,
        userId: booking.userId,
        passengerName: booking.passengers?.[0]?.name || 'Unknown',
        seatsBooked: booking.seatsBooked || 1,
        coPassengers: booking.coPassengers || [],
        passengerCode: booking.passengerCode,
        passengerStatus: booking.passengerStatus || 'waiting',
        status: booking.status,
        route: booking.route,
        amount: booking.amount,
        platformFee: booking.platformFee,
        driverSettlementAmount: booking.driverSettlementAmount,
        settlementStatus: booking.settlementStatus,
        paymentMethod: booking.paymentMethod,
        tripStartedAt: booking.tripStartedAt,
        tripCompletedAt: booking.tripCompletedAt,
      }));
    } catch (error) {
      logger.error('Error getting trip passengers:', error);
      throw error;
    }
  }

  /**
   * End trip for a specific passenger (driver action with code verification)
   * This method now uses verifyPassengerCodeAndComplete
   */
  async endPassengerTrip(
    bookingId: string,
    driverId: string,
    passengerCode: string,
    paymentMethod?: string
  ): Promise<any> {
    // Use the new verifyPassengerCodeAndComplete method
    return this.verifyPassengerCodeAndComplete(bookingId, driverId, passengerCode, paymentMethod);
  }

  /**
   * Approve settlement (admin action)
   */
  async approveSettlement(bookingId: string, adminId: string): Promise<any> {
    try {
      const booking = await Booking.findOne({ bookingId });
      if (!booking) {
        throw new NotFoundError('Booking not found');
      }

      if (booking.settlementStatus !== 'driver_requested') {
        throw new ConflictError(`Settlement is not in requested state. Current: ${booking.settlementStatus}`);
      }

      // Update settlement status
      booking.settlementStatus = 'admin_approved';
      booking.settlementApprovedAt = new Date();
      await booking.save();

      // TODO: Integrate with payment gateway to transfer money to driver
      // For now, just mark as approved
      // In production, this would trigger actual money transfer

      logger.info(`✅ Settlement approved for booking ${bookingId} by admin ${adminId}`);

      return {
        booking: booking.toJSON(),
        message: 'Settlement approved. Money will be transferred to driver account.',
      };
    } catch (error) {
      logger.error('Error approving settlement:', error);
      throw error;
    }
  }

  /**
   * Reject settlement (admin action)
   */
  async rejectSettlement(bookingId: string, adminId: string, reason: string): Promise<any> {
    try {
      const booking = await Booking.findOne({ bookingId });
      if (!booking) {
        throw new NotFoundError('Booking not found');
      }

      if (booking.settlementStatus !== 'driver_requested') {
        throw new ConflictError(`Settlement is not in requested state. Current: ${booking.settlementStatus}`);
      }

      // Update settlement status
      booking.settlementStatus = 'rejected';
      booking.settlementRejectedReason = reason;
      await booking.save();

      logger.info(`❌ Settlement rejected for booking ${bookingId} by admin ${adminId}: ${reason}`);

      return {
        booking: booking.toJSON(),
        message: 'Settlement rejected.',
      };
    } catch (error) {
      logger.error('Error rejecting settlement:', error);
      throw error;
    }
  }

  /**
   * Generate 4-digit code for passenger verification
   */
  private generatePassengerCode(): string {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }

  /**
   * Mark passenger as "Got In" (driver action)
   */
  async markPassengerGotIn(bookingId: string, driverId: string): Promise<any> {
    try {
      const booking = await Booking.findOne({ bookingId });
      if (!booking) {
        throw new NotFoundError('Booking not found');
      }

      // Verify driver
      const isDriver = booking.driver?.userId === driverId;
      if (!isDriver) {
        throw new ConflictError('You are not authorized to mark passenger status');
      }

      // Update passenger status
      booking.passengerStatus = 'got_in';
      await booking.save();

      logger.info(`✅ Passenger marked as got in: booking ${bookingId}`);

      return booking.toJSON();
    } catch (error) {
      logger.error('Error marking passenger got in:', error);
      throw error;
    }
  }

  /**
   * Mark passenger as "Got Out" (driver action)
   * No code generated here — passenger chooses payment method first
   * Sends notification to passenger to complete payment
   */
  async markPassengerGotOut(bookingId: string, driverId: string): Promise<any> {
    try {
      const booking = await Booking.findOne({ bookingId });
      if (!booking) {
        throw new NotFoundError('Booking not found');
      }

      // Verify driver
      const isDriver = booking.driver?.userId === driverId;
      if (!isDriver) {
        throw new ConflictError('You are not authorized to mark passenger status');
      }

      // Check if passenger has got in
      if (booking.passengerStatus !== 'got_in') {
        throw new ConflictError('Passenger must be marked as "got in" first');
      }

      booking.passengerStatus = 'got_out';
      await booking.save();

      // Send notification to passenger to pay
      try {
        const { notificationService } = await import('./notification.service');
        await notificationService.createNotification({
          userId: booking.userId,
          type: 'payment_required',
          title: 'Trip Ended — Please Pay',
          message: `Your trip has ended. Amount: ₹${booking.totalAmount}. Please complete payment.`,
          data: { bookingId, amount: booking.totalAmount },
          actionRequired: true,
        });
      } catch (notifError) {
        logger.warn('Could not send payment notification:', notifError);
      }

      logger.info(`✅ Passenger marked as got out: booking ${bookingId}. Waiting for payment choice.`);

      return {
        booking: booking.toJSON(),
        message: 'Passenger notified to complete payment.',
      };
    } catch (error) {
      logger.error('Error marking passenger got out:', error);
      throw error;
    }
  }

  /**
   * Passenger chooses payment method (passenger action)
   * - Online: Creates Razorpay order for passenger to pay
   * - Cash: Generates 4-digit code for passenger to show driver
   */
  async choosePaymentMethod(bookingId: string, passengerId: string, paymentMethod: 'online' | 'offline_cash'): Promise<any> {
    try {
      const booking = await Booking.findOne({ bookingId });
      if (!booking) {
        throw new NotFoundError('Booking not found');
      }

      // Verify this is the passenger
      if (booking.userId !== passengerId) {
        throw new ConflictError('You are not authorized for this booking');
      }

      // Must be got_out status
      if (booking.passengerStatus !== 'got_out') {
        throw new ConflictError('Trip must be ended by driver first');
      }

      const driverId = booking.driver?.userId;
      if (!driverId) {
        throw new ConflictError('Driver not found for this booking');
      }

      // ========== OFFLINE CASH ==========
      if (paymentMethod === 'offline_cash') {
        // Generate 4-digit code for passenger to show driver
        const passengerCode = this.generatePassengerCode();
        booking.passengerCode = passengerCode;
        booking.paymentMethod = 'offline_cash';
        booking.codeGeneratedAt = new Date();
        await booking.save();

        console.log('\n🔐 ========================================');
        console.log(`🔐 CASH PAYMENT — CODE GENERATED`);
        console.log(`🔐 Booking ID: ${bookingId}`);
        console.log(`🔐 CODE: ${passengerCode}`);
        console.log(`🔐 ========================================\n`);

        logger.info(`💵 Cash selected for booking ${bookingId}. Code: ${passengerCode}`);

        return {
          booking: booking.toJSON(),
          paymentMethod: 'offline_cash',
          passengerCode,
          message: 'Tell this code to your driver to complete the trip.',
        };
      }

      // ========== ONLINE PAYMENT (Razorpay) ==========
      const { paymentService } = await import('./payment.service');
      
      booking.paymentMethod = 'upi'; // Default online method
      await booking.save();

      const paymentResult = await paymentService.createRidePaymentOrder({
        bookingId,
        userId: passengerId,
        driverId,
        amount: booking.amount,
        platformFee: booking.platformFee || 0,
        totalAmount: booking.totalAmount,
      });

      booking.paymentStatus = 'pending';
      await booking.save();

      logger.info(`💳 Online payment selected for booking ${bookingId}. Razorpay order: ${paymentResult.razorpayOrder.id}`);

      return {
        booking: booking.toJSON(),
        paymentMethod: 'online',
        paymentOrder: {
          razorpayOrderId: paymentResult.razorpayOrder.id,
          amount: paymentResult.razorpayOrder.amount,
          currency: paymentResult.razorpayOrder.currency,
          key: paymentResult.razorpayOrder.key,
          totalAmount: booking.totalAmount,
        },
        message: 'Complete payment to finish the trip.',
      };
    } catch (error) {
      logger.error('Error in choosePaymentMethod:', error);
      throw error;
    }
  }

  /**
   * Verify passenger code and complete trip (driver action — CASH ONLY)
   * Called when passenger chose cash and showed code to driver
   */
  async verifyPassengerCodeAndComplete(
    bookingId: string,
    driverId: string,
    passengerCode: string,
    _paymentMethod?: string
  ): Promise<any> {
    try {
      const booking = await Booking.findOne({ bookingId });
      if (!booking) {
        throw new NotFoundError('Booking not found');
      }

      // Verify driver
      const isDriver = booking.driver?.userId === driverId;
      if (!isDriver) {
        throw new ConflictError('You are not authorized to verify passenger code');
      }

      // Verify code
      console.log('\n🔍 ========================================');
      console.log(`🔍 CASH CODE VERIFICATION`);
      console.log(`🔍 Booking ID: ${bookingId}`);
      console.log(`🔍 Expected Code: ${booking.passengerCode}`);
      console.log(`🔍 Entered Code: ${passengerCode}`);
      
      // TESTING MODE: Accept any 4-digit code for testing
      const TESTING_MODE = true; // Set to false in production
      const isValidCode = TESTING_MODE 
        ? passengerCode.length === 4 && /^\d{4}$/.test(passengerCode)
        : booking.passengerCode === passengerCode;
      
      console.log(`🔍 Match: ${isValidCode ? '✅ VALID' : '❌ INVALID'}`);
      console.log(`🔍 ========================================\n`);
      
      if (!isValidCode) {
        throw new ConflictError(TESTING_MODE 
          ? 'Invalid code format. Please enter a 4-digit number.'
          : 'Invalid passenger code');
      }

      if (booking.passengerStatus !== 'got_out') {
        throw new ConflictError('Passenger must be marked as "got out" first');
      }

      // Cash payment flow — process offline payment
      const driverSettlementAmount = booking.amount;
      booking.driverSettlementAmount = driverSettlementAmount;

      const { paymentService } = await import('./payment.service');

      await paymentService.processOfflineCashPayment({
        bookingId,
        userId: booking.userId,
        driverId,
        amount: booking.amount,
        platformFee: booking.platformFee || 0,
        totalAmount: booking.totalAmount,
      });

      const updatedBooking = await Booking.findOne({ bookingId });

      logger.info(`💵 Cash trip completed: Booking ${bookingId}`);
      logger.info(`   Passenger paid ₹${booking.totalAmount} cash to driver`);
      logger.info(`   Platform fee ₹${booking.platformFee || 0} deducted from driver wallet`);

      await this.checkAndCompleteOffer(booking);

      // Notify passenger that trip is completed
      try {
        const { notificationService } = await import('./notification.service');
        await notificationService.createNotification({
          userId: booking.userId,
          type: 'payment_completed',
          title: 'Trip Completed',
          message: `Your trip is completed. ₹${booking.totalAmount} paid in cash.`,
          data: { bookingId },
        });
      } catch (notifError) {
        logger.warn('Could not send completion notification:', notifError);
      }

      // --- Coin Reward System: Award ride coins + check milestones ---
      try {
        const { coinService } = await import('./coin.service');

        // Award coins to passenger
        const passengerCoins = await coinService.awardRideCoins(booking.userId, bookingId);
        logger.info(`🪙 Ride coins: ${passengerCoins} awarded to passenger ${booking.userId}`);

        // Award coins to driver
        const driverCoins = await coinService.awardRideCoins(driverId, bookingId);
        logger.info(`🪙 Ride coins: ${driverCoins} awarded to driver ${driverId}`);

        // Increment totalTrips for both
        await User.findOneAndUpdate({ userId: booking.userId }, { $inc: { totalTrips: 1 } });
        await User.findOneAndUpdate({ userId: driverId }, { $inc: { totalTrips: 1 } });

        // Check milestones for both
        const passengerMilestone = await coinService.awardMilestoneIfEligible(booking.userId);
        const driverMilestone = await coinService.awardMilestoneIfEligible(driverId);

        if (passengerMilestone) {
          const { notificationService: ns } = await import('./notification.service');
          await ns.createNotification({
            userId: booking.userId,
            type: 'milestone_achieved',
            title: `🏅 Milestone: ${passengerMilestone.badge}!`,
            message: `Congratulations! You earned the "${passengerMilestone.badge}" badge and ${passengerMilestone.coins} bonus coins!`,
            data: { badge: passengerMilestone.badge, coins: passengerMilestone.coins },
          });
        }
        if (driverMilestone) {
          const { notificationService: ns } = await import('./notification.service');
          await ns.createNotification({
            userId: driverId,
            type: 'milestone_achieved',
            title: `🏅 Milestone: ${driverMilestone.badge}!`,
            message: `Congratulations! You earned the "${driverMilestone.badge}" badge and ${driverMilestone.coins} bonus coins!`,
            data: { badge: driverMilestone.badge, coins: driverMilestone.coins },
          });
        }

        // Notify both about coins earned
        const { notificationService: ns2 } = await import('./notification.service');
        await ns2.createNotification({
          userId: booking.userId,
          type: 'coin_earned',
          title: 'Coins Earned!',
          message: `You earned ${passengerCoins} coins for completing your ride!`,
          data: { coins: passengerCoins, bookingId },
        });
        await ns2.createNotification({
          userId: driverId,
          type: 'coin_earned',
          title: 'Coins Earned!',
          message: `You earned ${driverCoins} coins for completing a ride!`,
          data: { coins: driverCoins, bookingId },
        });
      } catch (coinError) {
        logger.error('🪙 Coin reward error (non-fatal):', coinError);
      }

      return {
        booking: updatedBooking ? updatedBooking.toJSON() : booking.toJSON(),
        settlementAmount: driverSettlementAmount,
        paymentMethod: 'offline_cash',
        message: 'Trip completed. Cash payment recorded.',
      };
    } catch (error) {
      logger.error('Error verifying passenger code:', error);
      throw error;
    }
  }

  /**
   * Helper: Check if all bookings for an offer are completed, and mark the offer as completed
   */
  private async checkAndCompleteOffer(booking: any): Promise<void> {
    try {
      const offerId = booking.poolingOfferId || booking.rentalOfferId;
      if (offerId) {
        const serviceType = booking.poolingOfferId ? 'pooling' : 'rental';
        const allBookings = await Booking.find({
          [serviceType === 'pooling' ? 'poolingOfferId' : 'rentalOfferId']: offerId,
          status: { $ne: 'cancelled' },
        });

        const allCompleted = allBookings.length > 0 && allBookings.every(b => b.status === 'completed');
        
        if (allCompleted) {
          if (serviceType === 'pooling') {
            const poolingOffer = await PoolingOffer.findOne({ offerId });
            if (poolingOffer && poolingOffer.status !== 'completed') {
              poolingOffer.status = 'completed';
              await poolingOffer.save();
              logger.info(`✅ Marked pooling offer ${offerId} as completed (all bookings completed)`);
            }
          } else {
            const rentalOffer = await RentalOffer.findOne({ offerId });
            if (rentalOffer && rentalOffer.status !== 'completed') {
              rentalOffer.status = 'completed';
              await rentalOffer.save();
              logger.info(`✅ Marked rental offer ${offerId} as completed (all bookings completed)`);
            }
          }
        }
      }
    } catch (error) {
      logger.warn('Failed to update offer status after booking completion:', error);
    }
  }

  /**
   * Start trip with time validation (driver action)
   */
  async startTrip(offerId: string, driverId: string, serviceType: ServiceType): Promise<any> {
    try {
      // Get offer to check time
      let offer: any;
      if (serviceType === 'pooling') {
        offer = await PoolingOffer.findOne({ offerId });
      } else {
        offer = await RentalOffer.findOne({ offerId });
      }

      if (!offer) {
        throw new NotFoundError('Offer not found');
      }

      // Verify driver
      if (offer.driverId !== driverId && offer.ownerId !== driverId) {
        throw new ConflictError('You are not authorized to start this trip');
      }

      // Check if offer is already completed
      if (offer.status === 'completed') {
        throw new ConflictError('This trip has already been completed. Please check your history.');
      }

      // Check if current time matches offer time
      const now = new Date();
      const offerDate = new Date(offer.date);
      const offerTime = offer.time; // Format: "9:00 AM" or "09:00"

      // Parse offer time
      const timeMatch = offerTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
      if (!timeMatch) {
        throw new ConflictError('Invalid time format in offer');
      }

      let offerHour = parseInt(timeMatch[1]);
      const offerMinute = parseInt(timeMatch[2]);
      const ampm = timeMatch[3]?.toUpperCase();

      // Convert to 24-hour format
      if (ampm === 'PM' && offerHour !== 12) {
        offerHour += 12;
      } else if (ampm === 'AM' && offerHour === 12) {
        offerHour = 0;
      }

      // Set offer date and time
      offerDate.setHours(offerHour, offerMinute, 0, 0);

      // Check if current time is at or after offer time (allow 5 minutes buffer)
      const timeDifference = now.getTime() - offerDate.getTime();
      const fiveMinutesInMs = 5 * 60 * 1000;

      if (timeDifference < -fiveMinutesInMs) {
        // Too early (more than 5 minutes before)
        const minutesUntilStart = Math.ceil(-timeDifference / (60 * 1000));
        throw new ConflictError(
          `Trip can only be started at ${offerTime}. Please wait ${minutesUntilStart} more minutes.`
        );
      }

      // Get all bookings for this offer
      const query: any = serviceType === 'pooling'
        ? { poolingOfferId: offerId }
        : { rentalOfferId: offerId };

      // Include all statuses except cancelled and completed
      query.status = { $in: ['pending', 'confirmed', 'in_progress'] };

      const bookings = await Booking.find(query);

      if (bookings.length === 0) {
        throw new ConflictError('No bookings found for this offer');
      }
      
      // Filter out bookings that are already in_progress (to avoid duplicate updates)
      const bookingsToUpdate = bookings.filter(b => b.status !== 'in_progress');
      
      // If all bookings are already in_progress, return success (trip already started)
      if (bookingsToUpdate.length === 0) {
        logger.info(`Trip already started for offer ${offerId}`);
        return {
          bookings: bookings.map(b => b.toJSON()),
          message: 'Trip is already in progress',
        };
      }

      // Update bookings to in_progress and set tripStartedAt
      const updatedBookings: any[] = [];
      for (const booking of bookingsToUpdate) {
        booking.status = 'in_progress';
        booking.tripStartedAt = now;
        await booking.save();
        updatedBookings.push(booking.toJSON());
      }
      
      // Also include already in_progress bookings in response
      const inProgressBookings = bookings.filter(b => b.status === 'in_progress');
      inProgressBookings.forEach(b => updatedBookings.push(b.toJSON()));

      // Mark offer as in_progress
      if (serviceType === 'pooling') {
        await PoolingOffer.findOneAndUpdate({ offerId }, { status: 'in_progress' });
      } else {
        await RentalOffer.findOneAndUpdate({ offerId }, { status: 'in_progress' });
      }

      logger.info(`✅ Trip started for offer ${offerId} with ${bookings.length} passengers`);

      return {
        bookings: updatedBookings,
        message: 'Trip started successfully',
      };
    } catch (error) {
      logger.error('Error starting trip:', error);
      throw error;
    }
  }

  /**
   * End entire trip for an offer (mark all bookings as completed)
   */
  async endTrip(offerId: string, driverId: string, serviceType: ServiceType): Promise<any> {
    try {
      // Get offer to verify driver
      let offer: any;
      if (serviceType === 'pooling') {
        offer = await PoolingOffer.findOne({ offerId });
      } else {
        offer = await RentalOffer.findOne({ offerId });
      }

      if (!offer) {
        throw new NotFoundError('Offer not found');
      }

      // Verify driver
      if (offer.driverId !== driverId && offer.ownerId !== driverId) {
        throw new ConflictError('You are not authorized to end this trip');
      }

      // Get all bookings for this offer that are not completed or cancelled
      const query: any = serviceType === 'pooling'
        ? { poolingOfferId: offerId }
        : { rentalOfferId: offerId };

      query.status = { $in: ['pending', 'confirmed', 'in_progress'] };

      const bookings = await Booking.find(query);

      if (bookings.length === 0) {
        throw new ConflictError('No active bookings found for this offer');
      }

      // Mark all bookings as completed
      const completedBookings: any[] = [];
      for (const booking of bookings) {
        booking.status = 'completed';
        booking.tripCompletedAt = new Date();
        
        // Calculate settlement
        const driverSettlementAmount = booking.amount;
        booking.driverSettlementAmount = driverSettlementAmount;
        
        // NEW PAYMENT MODEL: Create Razorpay order for each booking at trip end
        const { paymentService } = await import('./payment.service');
        try {
          await paymentService.createRidePaymentOrder({
            bookingId: booking.bookingId,
            userId: booking.userId,
            driverId,
            amount: booking.amount,
            platformFee: booking.platformFee || 0,
            totalAmount: booking.totalAmount,
          });
          booking.settlementStatus = 'pending';
          booking.paymentStatus = 'pending';
          
          logger.info(`💰 Ride payment order created (endTrip): Booking ${booking.bookingId}`);
          logger.info(`   Passenger: ${booking.userId}, Driver: ${driverId}`);
          logger.info(`   Total: ₹${booking.totalAmount}`);
        } catch (payError) {
          logger.error(`Failed to create payment order for booking ${booking.bookingId}:`, payError);
          // Continue processing other bookings
        }
        
        await booking.save();
        completedBookings.push(booking.toJSON());
      }

      // Mark offer as completed
      if (serviceType === 'pooling') {
        offer.status = 'completed';
        await offer.save();
        
        // Archive group conversation when trip ends
        try {
          await conversationService.archiveGroupConversation(offerId);
          logger.info(`✅ Group conversation archived for offer ${offerId}`);
        } catch (error) {
          logger.error(`Failed to archive group conversation for offer ${offerId}:`, error);
          // Don't fail the trip end if conversation archiving fails
        }
      } else {
        offer.status = 'completed';
        await offer.save();
      }

      logger.info(`✅ Trip ended for offer ${offerId}: ${completedBookings.length} bookings marked as completed`);

      return {
        bookings: completedBookings,
        offer: offer.toJSON(),
        message: 'Trip ended successfully. All bookings have been completed.',
      };
    } catch (error) {
      logger.error('Error ending trip:', error);
      throw error;
    }
  }

  /**
   * Request withdrawal (driver action)
   */
  async requestWithdrawal(bookingId: string, driverId: string): Promise<any> {
    try {
      const booking = await Booking.findOne({ bookingId });
      if (!booking) {
        throw new NotFoundError('Booking not found');
      }

      // Verify driver
      const isDriver = booking.driver?.userId === driverId;
      if (!isDriver) {
        throw new ConflictError('You are not authorized to request withdrawal');
      }

      // Check if booking is completed
      if (booking.status !== 'completed') {
        throw new ConflictError('Booking must be completed before withdrawal');
      }

      // Check if already settled
      if (booking.settlementStatus === 'settled') {
        throw new ConflictError('Settlement already processed');
      }

      // Update settlement status
      booking.settlementStatus = 'driver_requested';
      booking.settlementRequestedAt = new Date();
      await booking.save();

      logger.info(`💰 Withdrawal requested for booking ${bookingId} by driver ${driverId}`);

      return {
        booking: booking.toJSON(),
        message: 'Withdrawal request submitted. Use the wallet withdrawal feature to withdraw funds.',
      };
    } catch (error) {
      logger.error('Error requesting withdrawal:', error);
      throw error;
    }
  }

  /**
   * DEPRECATED: processSettlementBalance removed.
   * New payment model uses centralized wallet.
   * Driver earnings are credited to wallet via walletService.creditDriverEarnings()
   * after Razorpay payment is verified at trip end.
   */

  /**
   * Create a connected (multi-hop) booking — 2 linked bookings.
   * Atomic: if Leg 2 fails, Leg 1 is rolled back.
   */
  async createConnectedBooking(data: {
    userId: string;
    leg1OfferId: string;
    leg2OfferId: string;
    leg1Route: Route;
    leg2Route: Route;
    connectionPoint: { address: string; lat: number; lng: number; city?: string };
    paymentMethod?: PaymentMethod;
    leg1Price?: { finalPrice: number; platformFee: number; totalAmount: number };
    leg2Price?: { finalPrice: number; platformFee: number; totalAmount: number };
  }): Promise<any> {
    const connectedGroupId = generateUserId('CG');
    let booking1: any = null;

    try {
      // Validate both offers exist and are available
      const offer1 = await PoolingOffer.findOne({ offerId: data.leg1OfferId });
      const offer2 = await PoolingOffer.findOne({ offerId: data.leg2OfferId });

      if (!offer1) throw new NotFoundError('Leg 1 offer not found');
      if (!offer2) throw new NotFoundError('Leg 2 offer not found');

      if (!['active', 'pending'].includes(offer1.status) || offer1.availableSeats <= 0) {
        throw new ConflictError('Leg 1 offer is not available for booking');
      }
      if (!['active', 'pending'].includes(offer2.status) || offer2.availableSeats <= 0) {
        throw new ConflictError('Leg 2 offer is not available for booking');
      }

      // Check wallet balance once (₹100 minimum)
      try {
        const { walletService } = await import('./wallet.service');
        const wallet = await walletService.getOrCreateWallet(data.userId);
        const { PRICING_CONFIG } = await import('../config/pricing.config');
        if (wallet.balance < PRICING_CONFIG.WALLET.MINIMUM_TO_BOOK) {
          throw new ConflictError(
            `Minimum wallet balance of ₹${PRICING_CONFIG.WALLET.MINIMUM_TO_BOOK} required to book. Current: ₹${wallet.balance}`
          );
        }
      } catch (err: any) {
        if (err.name === 'ConflictError') throw err;
        logger.warn('Wallet check failed (non-blocking):', err);
      }

      // Check user doesn't already have bookings for these offers
      const existingBooking = await Booking.findOne({
        userId: data.userId,
        poolingOfferId: { $in: [data.leg1OfferId, data.leg2OfferId] },
        status: { $in: ['pending', 'confirmed', 'in_progress'] },
      });
      if (existingBooking) {
        throw new ConflictError('You already have a booking for one of these offers');
      }

      // Create Leg 1 booking
      booking1 = await this.createPoolingBooking({
        userId: data.userId,
        poolingOfferId: data.leg1OfferId,
        paymentMethod: data.paymentMethod || 'offline_cash',
        passengerRoute: data.leg1Route,
        calculatedPrice: data.leg1Price,
      });

      // Stamp connected ride fields on Leg 1
      await Booking.updateOne(
        { bookingId: booking1.bookingId },
        {
          $set: {
            connectedGroupId,
            legOrder: 1,
            connectionPoint: data.connectionPoint,
          },
        }
      );

      // Create Leg 2 booking
      let booking2: any;
      try {
        booking2 = await this.createPoolingBooking({
          userId: data.userId,
          poolingOfferId: data.leg2OfferId,
          paymentMethod: data.paymentMethod || 'offline_cash',
          passengerRoute: data.leg2Route,
          calculatedPrice: data.leg2Price,
        });
      } catch (leg2Error) {
        // Rollback Leg 1: cancel booking and restore seat
        logger.error(`Leg 2 booking failed, rolling back Leg 1 (${booking1.bookingId}):`, leg2Error);
        await Booking.updateOne(
          { bookingId: booking1.bookingId },
          { $set: { status: 'cancelled', cancelledBy: 'system', cancellationReason: 'Connected ride: Leg 2 booking failed' } }
        );
        const offer1Rollback = await PoolingOffer.findOne({ offerId: data.leg1OfferId });
        if (offer1Rollback) {
          offer1Rollback.availableSeats += booking1?.seatsBooked || 1;
          offer1Rollback.passengers = offer1Rollback.passengers.filter((p) => p.userId !== data.userId);
          await offer1Rollback.save();
        }
        throw leg2Error;
      }

      // Stamp connected ride fields on Leg 2
      await Booking.updateOne(
        { bookingId: booking2.bookingId },
        {
          $set: {
            connectedGroupId,
            legOrder: 2,
            connectionPoint: data.connectionPoint,
          },
        }
      );

      // Fetch final bookings with connected fields
      const finalBooking1 = await Booking.findOne({ bookingId: booking1.bookingId }).lean();
      const finalBooking2 = await Booking.findOne({ bookingId: booking2.bookingId }).lean();

      logger.info(`🔗 Connected booking created: group=${connectedGroupId}, leg1=${booking1.bookingId}, leg2=${booking2.bookingId}`);

      return {
        connectedGroupId,
        bookings: [finalBooking1, finalBooking2],
        connectionPoint: data.connectionPoint,
        totalAmount: (finalBooking1?.totalAmount || 0) + (finalBooking2?.totalAmount || 0),
      };
    } catch (error) {
      logger.error('Error creating connected booking:', error);
      throw error;
    }
  }

  /**
   * Auto-cancel connected legs when one leg is cancelled by driver/system.
   * Called internally after a booking with connectedGroupId is cancelled.
   */
  private async handleConnectedCancellation(
    cancelledBooking: any,
    cancelledBy: string
  ): Promise<void> {
    if (!cancelledBooking.connectedGroupId) return;

    const isDriverOrSystem = ['driver', 'owner', 'system'].includes(cancelledBy);
    const isLeg1 = cancelledBooking.legOrder === 1;

    // If Leg 1 cancelled by driver/system → auto-cancel Leg 2
    if (isLeg1 && isDriverOrSystem) {
      const siblingBookings = await Booking.find({
        connectedGroupId: cancelledBooking.connectedGroupId,
        bookingId: { $ne: cancelledBooking.bookingId },
        status: { $in: ['pending', 'confirmed'] },
      });

      for (const sibling of siblingBookings) {
        sibling.status = 'cancelled';
        sibling.cancelledBy = 'system';
        sibling.cancelledAt = new Date();
        sibling.cancellationReason = 'Connected ride disrupted — previous leg cancelled';
        (sibling as any).cancellationFee = 0;
        await sibling.save();

        // Free up seat on the offer
        if (sibling.poolingOfferId) {
          const offer = await PoolingOffer.findOne({ offerId: sibling.poolingOfferId });
          if (offer) {
            offer.availableSeats += sibling.seatsBooked || 1;
            offer.passengers = offer.passengers.filter((p) => p.userId !== sibling.userId);
            await offer.save();
          }
        }

        logger.info(`🔗 Auto-cancelled connected leg: ${sibling.bookingId} (group=${cancelledBooking.connectedGroupId})`);
      }
    }
    // If Leg 2 cancelled by driver → don't auto-cancel Leg 1 (passenger decides)
  }
}

export const bookingService = new BookingService();
export default bookingService;
