import Booking from '../models/Booking';
import PoolingOffer from '../models/PoolingOffer';
import RentalOffer from '../models/RentalOffer';
import User from '../models/User';
import { NotFoundError, ConflictError } from '../utils/errors';
import logger from '../utils/logger';
import { calculatePlatformFee, timeSlotsOverlap, timeToMinutes, calculateDurationHours } from '../utils/helpers';
import { BookingStatus, ServiceType, PaymentMethod, Route } from '../types';
import { priceCalculationService } from './price-calculation.service';
import { conversationService } from './conversation.service';
import { snapToRoad } from '../utils/maps';
import { roadMatchingService } from './road-matching.service';

class BookingService {
  /**
   * Create pooling booking
   * Supports intermediate pickup/drop-off (Edge Case 1)
   */
  async createPoolingBooking(data: {
    userId: string;
    poolingOfferId: string;
    paymentMethod: PaymentMethod;
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

      // Calculate amounts using dynamic pricing
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

      // Use passenger route (required for dynamic pricing)
      const bookingRoute = data.passengerRoute;

      // Snap passenger coordinates to roads and store segment references (NEW - road-aware)
      interface PassengerSegment {
        roadId: string;
        direction: 'forward' | 'backward' | 'bidirectional';
        lat: number;
        lng: number;
        estimatedTime: Date;
      }
      let passengerPickupSegment: PassengerSegment | undefined = undefined;
      let passengerDropSegment: PassengerSegment | undefined = undefined;
      let matchingConfidence: number | undefined = undefined;

      try {
        // Snap pickup and drop coordinates to roads
        const pickupMatch = await snapToRoad(
          data.passengerRoute.from.lat,
          data.passengerRoute.from.lng
        );
        const dropMatch = await snapToRoad(
          data.passengerRoute.to.lat,
          data.passengerRoute.to.lng
        );

        if (pickupMatch && dropMatch && offer.route.roadSegments && offer.route.roadSegments.length > 0) {
          // Calculate estimated times based on offer date/time
          const offerDateTime = new Date(offer.date);
          const timeMatch = offer.time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
          if (timeMatch) {
            let hour = parseInt(timeMatch[1]);
            const minute = parseInt(timeMatch[2]);
            const ampm = timeMatch[3]?.toUpperCase();
            
            if (ampm === 'PM' && hour !== 12) {
              hour += 12;
            } else if (ampm === 'AM' && hour === 12) {
              hour = 0;
            }
            
            offerDateTime.setHours(hour, minute, 0, 0);
          }

          // Validate road-aware match and get confidence score
          const roadMatch = await roadMatchingService.validateRoadAwareMatch(
            offer.route.roadSegments,
            data.passengerRoute.from.lat,
            data.passengerRoute.from.lng,
            data.passengerRoute.to.lat,
            data.passengerRoute.to.lng,
            false // hasRecentDeviation
          );

          matchingConfidence = roadMatch.confidence;

          // Store segment references if match is valid
          // Validate array bounds before accessing segments
          if (
            roadMatch.isValid &&
            roadMatch.pickupSegmentIndex !== undefined &&
            roadMatch.dropSegmentIndex !== undefined &&
            roadMatch.pickupSegmentIndex >= 0 &&
            roadMatch.dropSegmentIndex >= 0 &&
            roadMatch.pickupSegmentIndex < offer.route.roadSegments.length &&
            roadMatch.dropSegmentIndex < offer.route.roadSegments.length
          ) {
            const pickupSeg = offer.route.roadSegments[roadMatch.pickupSegmentIndex];
            const dropSeg = offer.route.roadSegments[roadMatch.dropSegmentIndex];

            passengerPickupSegment = {
              roadId: pickupMatch.roadId,
              direction: pickupMatch.direction,
              lat: pickupMatch.lat,
              lng: pickupMatch.lng,
              estimatedTime: pickupSeg.estimatedTime,
            };

            passengerDropSegment = {
              roadId: dropMatch.roadId,
              direction: dropMatch.direction,
              lat: dropMatch.lat,
              lng: dropMatch.lng,
              estimatedTime: dropSeg.estimatedTime,
            };

            logger.info(
              `Stored road segments for booking: pickup=${pickupMatch.roadId}, drop=${dropMatch.roadId}, confidence=${matchingConfidence.toFixed(2)}`
            );
          } else {
            logger.warn(
              `Road match validation failed or invalid segment indices: isValid=${roadMatch.isValid}, ` +
              `pickupIndex=${roadMatch.pickupSegmentIndex}, dropIndex=${roadMatch.dropSegmentIndex}, ` +
              `reason=${roadMatch.reason || 'unknown'}`
            );
          }
        } else {
          logger.warn(
            `Cannot store road segments: pickupMatch=${!!pickupMatch}, dropMatch=${!!dropMatch}, ` +
            `roadSegmentsAvailable=${!!(offer.route.roadSegments && offer.route.roadSegments.length > 0)}`
          );
        }
      } catch (error) {
        logger.warn('Failed to snap passenger coordinates to roads, continuing without road segments:', error);
        // Continue without road segments - booking will still be created
      }

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
        amount: amount,
        platformFee: platformFee,
        totalAmount: totalAmount,
        paymentMethod: data.paymentMethod,
        paymentStatus: data.paymentMethod === 'offline_cash' ? 'pending' : 'pending', // Offline cash is pending until end of trip
        status: 'pending',
        passengerStatus: 'waiting', // Initial status: waiting to get in
        passengers: [
          {
            userId: data.userId,
            name: user.name,
            status: 'confirmed',
          },
        ],
        // Road-aware matching fields
        passengerPickupSegment,
        passengerDropSegment,
        matchingConfidence,
      });

      // Update offer
      const wasFirstBooking = offer.passengers.length === 0; // Check before adding passenger
      const allSeatsWillBeFilled = offer.availableSeats === 1; // Check before decrementing
      
      offer.availableSeats -= 1;
      offer.bookingRequests += 1;
      offer.passengers.push({
        userId: data.userId,
        name: user.name,
        status: 'confirmed',
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
      // For offline cash: booking is confirmed (payment collected at end)
      // For online payment: booking is pending until payment is verified
      const bookingStatus = data.paymentMethod === 'offline_cash' ? 'confirmed' : 'pending';
      const paymentStatus = 'pending'; // Payment status is always pending initially

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
   * Cancel booking
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

      // Update booking
      booking.status = 'cancelled';
      booking.cancellationReason = reason;
      booking.cancelledAt = new Date();
      booking.cancelledBy = 'user';
      await booking.save();

      // Update offer based on service type
      if (booking.serviceType === 'pooling' && booking.poolingOfferId) {
        const offer = await PoolingOffer.findOne({ offerId: booking.poolingOfferId });
        if (offer) {
          offer.availableSeats += 1;
          // Remove passenger
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

      logger.info(`Booking cancelled: ${bookingId}`);

      return booking.toJSON();
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
          const owner = await User.findOne({ userId: ownerId });
          if (!owner) {
            logger.error(`❌ Owner not found: ${ownerId} for booking ${bookingId}`);
          } else {
            const previousOutflow = owner.outflowAmount || 0;
            
            if (booking.paymentMethod === 'offline_cash') {
              // Offline cash: Owner collects totalAmount from renter
              // Owner owes platformFee to Yariyatra (added to outflow)
              const platformFeeOwed = booking.platformFee || 0;
              const newOutflowAmount = (owner.outflowAmount || 0) + platformFeeOwed;
              
              // Use updateOne to ensure the change is persisted
              const updateResult = await User.updateOne(
                { userId: ownerId },
                { $inc: { outflowAmount: platformFeeOwed } }
              );
              
              logger.info(`💰 Offline rental payment: Booking ${bookingId}`);
              logger.info(`   Owner: ${ownerId}`);
              logger.info(`   Platform fee: ₹${platformFeeOwed}`);
              logger.info(`   Outflow before: ₹${previousOutflow}`);
              logger.info(`   Outflow after: ₹${newOutflowAmount}`);
              logger.info(`   Owner keeps: ₹${ownerSettlementAmount} as earnings`);
              logger.info(`   Update result: matched=${updateResult.matchedCount}, modified=${updateResult.modifiedCount}`);
              
              // Set booking fields
              booking.settlementStatus = 'pending';
              booking.paymentStatus = 'paid'; // Mark as paid since owner collected cash
              
              // Verify the update worked
              const verifyOwner = await User.findOne({ userId: ownerId });
              logger.info(`✅ Verification: Owner ${ownerId} outflowAmount after update: ₹${verifyOwner?.outflowAmount || 0}`);
            } else {
              // Online payment: Process settlement balance (add to inflow)
              await this.processSettlementBalance(ownerId, ownerSettlementAmount);
              booking.settlementStatus = 'driver_requested'; // Use driver_requested for rental owners (same concept)
              booking.settlementRequestedAt = new Date();
              
              logger.info(`💰 Online rental payment: Added ₹${ownerSettlementAmount} to inflow for owner ${ownerId}`);
            }
          }
        }
      }
      
      await booking.save();

      logger.info(`Booking status updated: ${bookingId} - ${status} by ${userId}`);

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
    passengerCode: string
  ): Promise<any> {
    // Use the new verifyPassengerCodeAndComplete method
    return this.verifyPassengerCodeAndComplete(bookingId, driverId, passengerCode);
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
   * Mark passenger as "Got Out" and generate code (driver action)
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

      // Generate 4-digit code
      const passengerCode = this.generatePassengerCode();
      booking.passengerCode = passengerCode;
      booking.passengerStatus = 'got_out';
      booking.codeGeneratedAt = new Date();
      await booking.save();

      // Log code to console for easy testing
      console.log('\n🔐 ========================================');
      console.log(`🔐 PASSENGER CODE GENERATED`);
      console.log(`🔐 Booking ID: ${bookingId}`);
      console.log(`🔐 Passenger: ${booking.passengers?.[0]?.name || 'Unknown'}`);
      console.log(`🔐 CODE: ${passengerCode}`);
      console.log(`🔐 ========================================\n`);
      
      logger.info(`✅ Passenger marked as got out with code ${passengerCode}: booking ${bookingId}`);

      return {
        booking: booking.toJSON(),
        passengerCode,
        message: 'Passenger code generated. Please share with passenger.',
      };
    } catch (error) {
      logger.error('Error marking passenger got out:', error);
      throw error;
    }
  }

  /**
   * Verify passenger code and complete trip (driver action)
   */
  async verifyPassengerCodeAndComplete(
    bookingId: string,
    driverId: string,
    passengerCode: string
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
      console.log(`🔍 CODE VERIFICATION ATTEMPT`);
      console.log(`🔍 Booking ID: ${bookingId}`);
      console.log(`🔍 Passenger: ${booking.passengers?.[0]?.name || 'Unknown'}`);
      console.log(`🔍 Expected Code: ${booking.passengerCode}`);
      console.log(`🔍 Entered Code: ${passengerCode}`);
      
      // TESTING MODE: Accept any 4-digit code for testing
      const TESTING_MODE = true; // Set to false in production
      const isValidCode = TESTING_MODE 
        ? passengerCode.length === 4 && /^\d{4}$/.test(passengerCode)
        : booking.passengerCode === passengerCode;
      
      console.log(`🔍 Testing Mode: ${TESTING_MODE ? '✅ ENABLED (Any 4-digit code accepted)' : '❌ DISABLED'}`);
      console.log(`🔍 Match: ${isValidCode ? '✅ VALID' : '❌ INVALID'}`);
      console.log(`🔍 ========================================\n`);
      
      if (!isValidCode) {
        throw new ConflictError(TESTING_MODE 
          ? 'Invalid code format. Please enter a 4-digit number.'
          : 'Invalid passenger code');
      }

      // Check if passenger has got out
      if (booking.passengerStatus !== 'got_out') {
        throw new ConflictError('Passenger must be marked as "got out" first');
      }

      // Update booking status
      booking.status = 'completed';
      booking.tripCompletedAt = new Date();

      // Calculate settlement amount (amount - platform fee)
      const driverSettlementAmount = booking.amount; // Driver gets amount, platform fee stays with Yariyatra
      booking.driverSettlementAmount = driverSettlementAmount;

      // Handle settlement based on payment method
      const driver = await User.findOne({ userId: driverId });
      if (!driver) {
        throw new NotFoundError('Driver not found');
      }

      if (booking.paymentMethod === 'offline_cash') {
        // Offline payment: Driver only owes platform fee to Yariyatra
        // Driver collects totalAmount from passenger, but only platformFee goes to outflow
        // Driver keeps (totalAmount - platformFee) as their earnings
        const platformFeeOwed = booking.platformFee || 0;
        const previousOutflow = driver.outflowAmount || 0;
        const newOutflowAmount = previousOutflow + platformFeeOwed;
        
        // Use updateOne to ensure the change is persisted atomically
        const updateResult = await User.updateOne(
          { userId: driverId },
          { $inc: { outflowAmount: platformFeeOwed } }
        );
        
        booking.settlementStatus = 'pending'; // No settlement needed for offline
        
        logger.info(`💰 Offline payment: Booking ${bookingId}`);
        logger.info(`   Driver: ${driverId}`);
        logger.info(`   Platform fee: ₹${platformFeeOwed}`);
        logger.info(`   Outflow before: ₹${previousOutflow}`);
        logger.info(`   Outflow after: ₹${newOutflowAmount}`);
        logger.info(`   Driver keeps: ₹${booking.amount} as earnings`);
        logger.info(`   Update result: matched=${updateResult.matchedCount}, modified=${updateResult.modifiedCount}`);
        
        // Verify the update worked
        const verifyDriver = await User.findOne({ userId: driverId });
        logger.info(`✅ Verification: Driver ${driverId} outflowAmount after update: ₹${verifyDriver?.outflowAmount || 0}`);
      } else {
        // Online payment: Process settlement balance (subtract from outflow if exists, then add to inflow)
        await this.processSettlementBalance(driverId, driverSettlementAmount);
        booking.settlementStatus = 'driver_requested';
        booking.settlementRequestedAt = new Date();
        logger.info(`💰 Online payment: Processed settlement for driver ${driverId}`);
      }
      await booking.save();

      // Check if all bookings for this offer are completed, then mark offer as completed
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
        // Don't fail the booking completion if offer status update fails
      }

      logger.info(`✅ Trip completed with code verification: booking ${bookingId}`);

      return {
        booking: booking.toJSON(),
        settlementAmount: driverSettlementAmount,
        canWithdraw: booking.paymentMethod !== 'offline_cash',
        message: 'Trip completed successfully. Settlement processed.',
      };
    } catch (error) {
      logger.error('Error verifying passenger code:', error);
      throw error;
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
      const updatedBookings = [];
      for (const booking of bookingsToUpdate) {
        booking.status = 'in_progress';
        booking.tripStartedAt = now;
        await booking.save();
        updatedBookings.push(booking.toJSON());
      }
      
      // Also include already in_progress bookings in response
      const inProgressBookings = bookings.filter(b => b.status === 'in_progress');
      inProgressBookings.forEach(b => updatedBookings.push(b.toJSON()));

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
      const completedBookings = [];
      for (const booking of bookings) {
        booking.status = 'completed';
        booking.tripCompletedAt = new Date();
        
        // Calculate settlement
        const driverSettlementAmount = booking.amount;
        booking.driverSettlementAmount = driverSettlementAmount;
        
        // Handle settlement based on payment method
        const driver = await User.findOne({ userId: driverId });
        if (driver) {
          if (booking.paymentMethod === 'offline_cash') {
            const platformFeeOwed = booking.platformFee || 0;
            const previousOutflow = driver.outflowAmount || 0;
            const newOutflowAmount = previousOutflow + platformFeeOwed;
            
            // Use updateOne to ensure the change is persisted atomically
            const updateResult = await User.updateOne(
              { userId: driverId },
              { $inc: { outflowAmount: platformFeeOwed } }
            );
            
            booking.settlementStatus = 'pending';
            
            logger.info(`💰 Offline payment (endTrip): Booking ${booking.bookingId}`);
            logger.info(`   Driver: ${driverId}`);
            logger.info(`   Platform fee: ₹${platformFeeOwed}`);
            logger.info(`   Outflow before: ₹${previousOutflow}`);
            logger.info(`   Outflow after: ₹${newOutflowAmount}`);
            logger.info(`   Update result: matched=${updateResult.matchedCount}, modified=${updateResult.modifiedCount}`);
            
            // Verify the update worked
            const verifyDriver = await User.findOne({ userId: driverId });
            logger.info(`✅ Verification: Driver ${driverId} outflowAmount after update: ₹${verifyDriver?.outflowAmount || 0}`);
          } else {
            await this.processSettlementBalance(driverId, driverSettlementAmount);
            booking.settlementStatus = 'driver_requested';
            booking.settlementRequestedAt = new Date();
          }
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

      // Check if online payment (offline doesn't need withdrawal)
      if (booking.paymentMethod === 'offline_cash') {
        throw new ConflictError('Withdrawal not available for offline cash payments');
      }

      // Update settlement status
      booking.settlementStatus = 'driver_requested';
      booking.settlementRequestedAt = new Date();
      await booking.save();

      logger.info(`💰 Withdrawal requested for booking ${bookingId} by driver ${driverId}`);

      return {
        booking: booking.toJSON(),
        message: 'Withdrawal request submitted. Admin will process it.',
      };
    } catch (error) {
      logger.error('Error requesting withdrawal:', error);
      throw error;
    }
  }

  /**
   * Process settlement and update inflow/outflow (called when online payment is made after offline payment)
   */
  async processSettlementBalance(driverId: string, onlineAmount: number): Promise<void> {
    try {
      const driver = await User.findOne({ userId: driverId });
      if (!driver) {
        throw new NotFoundError('Driver not found');
      }

      // If driver has outflow, offset it first with online payment
      if (driver.outflowAmount > 0) {
        const originalOutflow = driver.outflowAmount;
        
        if (onlineAmount >= originalOutflow) {
          // Online amount fully covers outflow, clear outflow and add excess to inflow
          const excessAmount = onlineAmount - originalOutflow;
          driver.outflowAmount = 0;
          driver.inflowAmount = (driver.inflowAmount || 0) + excessAmount;
          logger.info(
            `💰 Outflow cleared (₹${originalOutflow}) and ₹${excessAmount} added to inflow for driver ${driverId}`
          );
        } else {
          // Online amount partially covers outflow, reduce outflow
          driver.outflowAmount = originalOutflow - onlineAmount;
          logger.info(
            `💰 Outflow reduced by ₹${onlineAmount} for driver ${driverId}. Remaining outflow: ₹${driver.outflowAmount}`
          );
        }
      } else {
        // No outflow, add to inflow
        driver.inflowAmount = (driver.inflowAmount || 0) + onlineAmount;
        logger.info(`💰 Added ₹${onlineAmount} to inflow for driver ${driverId}`);
      }

      await driver.save();
    } catch (error) {
      logger.error('Error processing settlement balance:', error);
      throw error;
    }
  }
}

export const bookingService = new BookingService();
export default bookingService;
