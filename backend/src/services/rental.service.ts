import RentalOffer from '../models/RentalOffer';
import User from '../models/User';
import Company from '../models/Company';
import Vehicle from '../models/Vehicle';
import { generateUserId } from '../utils/helpers';
import { NotFoundError, ConflictError } from '../utils/errors';
import logger from '../utils/logger';
import { calculateDistance, timeToMinutes, timeSlotsOverlap } from '../utils/helpers';
import { Location, OfferStatus } from '../types';

class RentalService {
  /**
   * Create rental offer
   */
  async createOffer(data: {
    ownerId: string;
    ownerType: 'individual' | 'company';
    vehicleId: string;
    location: Location;
    date: Date;
    availableFrom: string;
    availableUntil: string;
    pricePerHour: number;
    minimumHours: number;
    notes?: string;
  }): Promise<any> {
    try {
      // Get owner info
      logger.info(`🔍 Getting owner info: ownerType=${data.ownerType}, ownerId=${data.ownerId}`);
      let owner;
      if (data.ownerType === 'company') {
        // For company, ownerId is the companyId
        logger.info(`🏢 Looking up company with companyId: ${data.ownerId}`);
        owner = await Company.findOne({ companyId: data.ownerId });
        if (!owner) {
          logger.error(`❌ Company not found with companyId: ${data.ownerId}`);
          throw new NotFoundError('Company not found');
        }
        logger.info(`✅ Found company: ${owner.companyName}`);
      } else {
        // For individual, ownerId is the userId
        logger.info(`👤 Looking up user with userId: ${data.ownerId}`);
        owner = await User.findOne({ userId: data.ownerId });
        if (!owner) {
          logger.error(`❌ User not found with userId: ${data.ownerId}`);
          throw new NotFoundError('User not found');
        }
        logger.info(`✅ Found user: ${owner.name}`);
      }

      // Get vehicle info
      const vehicle = await Vehicle.findOne({ vehicleId: data.vehicleId });
      if (!vehicle) {
        throw new NotFoundError('Vehicle not found');
      }

      // Verify vehicle ownership
      logger.info(`🔍 Verifying vehicle ownership: ownerType=${data.ownerType}, ownerId=${data.ownerId}, vehicle.companyId=${vehicle.companyId}, vehicle.userId=${vehicle.userId}`);
      
      if (data.ownerType === 'company') {
        if (vehicle.companyId !== data.ownerId) {
          logger.error(`❌ Vehicle ownership mismatch: vehicle.companyId (${vehicle.companyId}) !== ownerId (${data.ownerId})`);
          throw new ConflictError('Vehicle does not belong to company');
        }
        logger.info(`✅ Vehicle ownership verified for company: ${data.ownerId}`);
      } else {
        if (vehicle.userId !== data.ownerId) {
          logger.error(`❌ Vehicle ownership mismatch: vehicle.userId (${vehicle.userId}) !== ownerId (${data.ownerId})`);
          throw new ConflictError('Vehicle does not belong to owner');
        }
        logger.info(`✅ Vehicle ownership verified for individual: ${data.ownerId}`);
      }

      // Generate offer ID
      const offerId = generateUserId('RO');

      // Get owner name and photo
      const ownerName = data.ownerType === 'company' ? (owner as any).companyName : (owner as any).name;
      const ownerPhoto = data.ownerType === 'company' ? undefined : (owner as any).profilePhoto;
      const rating = data.ownerType === 'company' ? (owner as any).averageRating : (owner as any).rating;
      const totalReviews = data.ownerType === 'company' ? 0 : (owner as any).totalReviews;

      // Create offer
      const offer = await RentalOffer.create({
        offerId,
        ownerId: data.ownerId,
        ownerName,
        ownerPhoto,
        ownerType: data.ownerType,
        rating: rating || 0,
        totalReviews: totalReviews || 0,
        vehicle: {
          type: vehicle.type,
          brand: vehicle.brand,
          year: vehicle.year,
          number: vehicle.number,
          seats: vehicle.seats,
          fuel: vehicle.fuelType,
          transmission: vehicle.transmission,
          photos: vehicle.photos ? Object.values(vehicle.photos).filter(Boolean) : [],
        },
        location: data.location,
        date: data.date,
        availableFrom: data.availableFrom,
        availableUntil: data.availableUntil,
        pricePerHour: data.pricePerHour,
        minimumHours: data.minimumHours,
        notes: data.notes,
        totalBookings: 0,
        completed: 0,
        cancelled: 0,
        revenue: 0,
        status: 'pending',
      });

      logger.info(`Rental offer created: ${offerId}`);

      return offer.toJSON();
    } catch (error) {
      logger.error('Error creating rental offer:', error);
      throw error;
    }
  }

  /**
   * Get user's rental offers
   */
  async getUserOffers(userId: string, ownerType: 'individual' | 'company'): Promise<any[]> {
    try {
      const offers = await RentalOffer.find({
        ownerId: userId,
        ownerType,
      })
        .sort({ createdAt: -1 })
        .limit(50);

      return offers.map((offer) => offer.toJSON());
    } catch (error) {
      logger.error('Error getting user offers:', error);
      throw error;
    }
  }

  /**
   * Get offer by ID
   */
  async getOfferById(offerId: string): Promise<any> {
    try {
      const offer = await RentalOffer.findOne({ offerId });
      if (!offer) {
        throw new NotFoundError('Offer not found');
      }

      return offer.toJSON();
    } catch (error) {
      logger.error('Error getting offer by ID:', error);
      throw error;
    }
  }

  /**
   * Search rental offers
   */
  async searchOffers(filters: {
    lat?: number;
    lng?: number;
    date?: Date;
    vehicleType?: 'car' | 'bike';
    minPrice?: number;
    maxPrice?: number;
    maxDistance?: number;
    page?: number;
    limit?: number;
  }): Promise<{ offers: any[]; total: number; page: number; limit: number }> {
    try {
      const page = filters.page || 1;
      const limit = filters.limit || 20;
      const skip = (page - 1) * limit;

      // Build query
      const query: any = {
        status: { $in: ['active', 'pending'] },
      };

      if (filters.date) {
        query.date = {
          $gte: new Date(filters.date.setHours(0, 0, 0, 0)),
          $lt: new Date(filters.date.setHours(23, 59, 59, 999)),
        };
      }

      if (filters.vehicleType) {
        query['vehicle.type'] = filters.vehicleType;
      }

      if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
        query.pricePerHour = {};
        if (filters.minPrice !== undefined) query.pricePerHour.$gte = filters.minPrice;
        if (filters.maxPrice !== undefined) query.pricePerHour.$lte = filters.maxPrice;
      }

      // Get all matching offers first
      let offers = await RentalOffer.find(query).sort({ createdAt: -1 });

      // Filter by location if provided
      if (filters.lat && filters.lng) {
        offers = offers.filter((offer) => {
          const distance = calculateDistance(
            filters.lat!,
            filters.lng!,
            offer.location.lat,
            offer.location.lng
          );

          const maxDist = filters.maxDistance || 10; // Default 10km
          return distance <= maxDist;
        });
      }

      // Apply pagination
      const total = offers.length;
      const paginatedOffers = offers.slice(skip, skip + limit);

      return {
        offers: paginatedOffers.map((offer) => offer.toJSON()),
        total,
        page,
        limit,
      };
    } catch (error) {
      logger.error('Error searching offers:', error);
      throw error;
    }
  }

  /**
   * Get nearby offers
   */
  async getNearbyOffers(lat: number, lng: number, radiusKm: number = 10): Promise<any[]> {
    try {
      const offers = await RentalOffer.find({
        status: { $in: ['active', 'pending'] },
      });

      // Filter by distance
      const nearbyOffers = offers
        .map((offer) => {
          const distance = calculateDistance(lat, lng, offer.location.lat, offer.location.lng);
          return {
            ...offer.toJSON(),
            distance: parseFloat(distance.toFixed(2)),
          };
        })
        .filter((offer: any) => offer.distance <= radiusKm)
        .sort((a: any, b: any) => a.distance - b.distance);

      return nearbyOffers;
    } catch (error) {
      logger.error('Error getting nearby offers:', error);
      throw error;
    }
  }

  /**
   * Update offer
   */
  async updateOffer(
    offerId: string,
    ownerId: string,
    data: {
      location?: Location;
      date?: Date;
      availableFrom?: string;
      availableUntil?: string;
      pricePerHour?: number;
      minimumHours?: number;
      notes?: string;
      status?: OfferStatus;
    }
  ): Promise<any> {
    try {
      const offer = await RentalOffer.findOne({ offerId });
      if (!offer) {
        throw new NotFoundError('Offer not found');
      }

      if (offer.ownerId !== ownerId) {
        throw new ConflictError('You do not have permission to update this offer');
      }

      // Update fields
      if (data.location !== undefined) offer.location = data.location;
      if (data.date !== undefined) offer.date = data.date;
      if (data.availableFrom !== undefined) offer.availableFrom = data.availableFrom;
      if (data.availableUntil !== undefined) offer.availableUntil = data.availableUntil;
      if (data.pricePerHour !== undefined) offer.pricePerHour = data.pricePerHour;
      if (data.minimumHours !== undefined) offer.minimumHours = data.minimumHours;
      if (data.notes !== undefined) offer.notes = data.notes;
      if (data.status !== undefined) offer.status = data.status;

      await offer.save();

      logger.info(`Rental offer updated: ${offerId}`);

      return offer.toJSON();
    } catch (error) {
      logger.error('Error updating offer:', error);
      throw error;
    }
  }

  /**
   * Cancel offer
   */
  async cancelOffer(offerId: string, ownerId: string): Promise<void> {
    try {
      const offer = await RentalOffer.findOne({ offerId });
      if (!offer) {
        throw new NotFoundError('Offer not found');
      }

      if (offer.ownerId !== ownerId) {
        throw new ConflictError('You do not have permission to cancel this offer');
      }

      offer.status = 'cancelled';
      await offer.save();

      logger.info(`Rental offer cancelled: ${offerId}`);
    } catch (error) {
      logger.error('Error cancelling offer:', error);
      throw error;
    }
  }

  /**
   * Check availability
   */
  async checkAvailability(offerId: string, date: Date, fromTime: string, toTime: string): Promise<boolean> {
    try {
      const offer = await RentalOffer.findOne({ offerId });
      if (!offer) {
        throw new NotFoundError('Offer not found');
      }

      // Check if offer is active
      if (offer.status !== 'active' && offer.status !== 'pending') {
        return false;
      }

      // Check if date matches
      const offerDate = new Date(offer.date);
      const requestDate = new Date(date);
      if (
        offerDate.getFullYear() !== requestDate.getFullYear() ||
        offerDate.getMonth() !== requestDate.getMonth() ||
        offerDate.getDate() !== requestDate.getDate()
      ) {
        return false;
      }

      // Check if time slots overlap
      // This is a simplified check - in production, you'd check against existing bookings
      const offerFrom = offer.availableFrom;
      const offerUntil = offer.availableUntil;

      // Simple time comparison (HH:mm format)
      return fromTime >= offerFrom && toTime <= offerUntil;
    } catch (error) {
      logger.error('Error checking availability:', error);
      return false;
    }
  }

  /**
   * Get company's rental offers
   */
  async getCompanyOffers(companyId: string, filters?: {
    status?: OfferStatus;
    date?: Date;
    page?: number;
    limit?: number;
  }): Promise<{ offers: any[]; total: number; page: number; limit: number }> {
    try {
      const page = filters?.page || 1;
      const limit = filters?.limit || 20;
      const skip = (page - 1) * limit;

      // First, get the company to find its userId
      const company = await Company.findOne({ companyId });
      if (!company) {
        throw new NotFoundError('Company not found');
      }

      const query: any = {
        ownerId: company.userId,
        ownerType: 'company',
      };

      if (filters?.status) {
        query.status = filters.status;
      }

      if (filters?.date) {
        query.date = {
          $gte: new Date(filters.date.setHours(0, 0, 0, 0)),
          $lt: new Date(filters.date.setHours(23, 59, 59, 999)),
        };
      }

      const total = await RentalOffer.countDocuments(query);
      const offers = await RentalOffer.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      return {
        offers: offers.map((offer) => offer.toJSON()),
        total,
        page,
        limit,
      };
    } catch (error) {
      logger.error('Error getting company offers:', error);
      throw error;
    }
  }

  /**
   * Get all bookings for a rental offer
   */
  async getOfferBookings(offerId: string, ownerId: string): Promise<any[]> {
    try {
      // Verify owner owns the offer
      const offer = await RentalOffer.findOne({ offerId });
      if (!offer) {
        throw new NotFoundError('Rental offer not found');
      }

      if (offer.ownerId !== ownerId) {
        throw new ConflictError('You do not have permission to access these bookings');
      }

      // Get all bookings for this offer
      const Booking = (await import('../models/Booking')).default;
      const bookings = await Booking.find({
        rentalOfferId: offerId,
        status: { $ne: 'cancelled' },
      })
        .sort({ createdAt: -1 })
        .lean();

      // Populate renter information
      const User = (await import('../models/User')).default;
      const bookingsWithRenter = await Promise.all(
        bookings.map(async (booking: any) => {
          if (booking.userId) {
            try {
              const user = await User.findOne({ userId: booking.userId })
                .select('userId name profilePhoto rating totalReviews')
                .lean();
              if (user) {
                booking.renter = {
                  userId: user.userId,
                  name: user.name,
                  photo: user.profilePhoto,
                  rating: user.rating,
                  totalReviews: user.totalReviews,
                };
              }
            } catch (error) {
              logger.warn(`Failed to fetch renter for booking ${booking.bookingId}:`, error);
            }
          }
          return booking;
        })
      );

      return bookingsWithRenter;
    } catch (error) {
      logger.error('Error getting offer bookings:', error);
      throw error;
    }
  }

  /**
   * Get available time slots for a rental offer
   */
  async getAvailableTimeSlots(offerId: string, date: Date): Promise<{
    availableSlots: Array<{ start: string; end: string; duration: number }>;
    bookedSlots: Array<{ start: string; end: string; renter: string; bookingId: string }>;
  }> {
    try {
      const offer = await RentalOffer.findOne({ offerId });
      if (!offer) {
        throw new NotFoundError('Offer not found');
      }

      // Get start and end of the day
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      // Get all bookings for this offer on the same date
      const Booking = (await import('../models/Booking')).default;
      
      // Find bookings without populate first
      const bookings = await Booking.find({
        rentalOfferId: offerId,
        date: {
          $gte: startOfDay,
          $lte: endOfDay,
        },
        status: { $ne: 'cancelled' },
        startTime: { $exists: true },
        endTime: { $exists: true },
      }).lean(); // Use lean() to get plain objects

      // Manually populate userId by querying User model with userId field (not _id)
      const User = (await import('../models/User')).default;
      const bookingsWithUser = await Promise.all(
        bookings.map(async (booking: any) => {
          // Query User by userId field (not _id) since User model uses custom userId string
          if (booking.userId) {
            try {
              const user = await User.findOne({ userId: booking.userId }).select('name').lean();
              if (user) {
                booking.userId = { name: user.name };
              } else {
                // If user not found, set to null or keep original userId
                booking.userId = null;
              }
            } catch (error) {
              // If query fails, just use the userId as is
              logger.warn(`Failed to fetch user for booking ${booking.bookingId}:`, error);
              booking.userId = null;
            }
          }
          return booking;
        })
      );

      // Get booked slots
      const bookedSlots = bookingsWithUser
        .filter((b: any) => b.status !== 'completed' && b.startTime && b.endTime)
        .map((b: any) => ({
          start: b.startTime!,
          end: b.endTime!,
          renter: (b.userId && typeof b.userId === 'object' && b.userId.name) 
            ? b.userId.name 
            : 'Unknown',
          bookingId: b.bookingId,
        }));

      // Calculate available slots
      const offerStartMinutes = timeToMinutes(offer.availableFrom);
      const offerEndMinutes = timeToMinutes(offer.availableUntil);
      let offerEndAdj = offerEndMinutes;
      if (offerEndMinutes < offerStartMinutes) {
        offerEndAdj = offerEndMinutes + 24 * 60; // Next day
      }

      // Generate time slots (hourly intervals)
      const availableSlots: Array<{ start: string; end: string; duration: number }> = [];
      const minDuration = offer.minimumHours || 1;

      // Helper to convert minutes back to HH:mm
      const minutesToTime = (minutes: number): string => {
        const hours = Math.floor(minutes / 60) % 24;
        const mins = minutes % 60;
        return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
      };

      // Check each possible start time (hourly intervals)
      for (let startMinutes = offerStartMinutes; startMinutes < offerEndAdj; startMinutes += 60) {
        // Try different durations starting from minimum
        for (let durationHours = minDuration; durationHours <= 24; durationHours++) {
          const endMinutes = startMinutes + durationHours * 60;
          
          if (endMinutes > offerEndAdj) break; // Exceeds offer window

          const startTime = minutesToTime(startMinutes);
          const endTime = minutesToTime(endMinutes % (24 * 60));

          // Check if this slot conflicts with any booking
          let hasConflict = false;
          for (const booked of bookedSlots) {
            if (timeSlotsOverlap(startTime, endTime, booked.start, booked.end)) {
              hasConflict = true;
              break;
            }
          }

          if (!hasConflict) {
            availableSlots.push({
              start: startTime,
              end: endTime,
              duration: durationHours,
            });
          }
        }
      }

      return {
        availableSlots: availableSlots.slice(0, 50), // Limit to 50 slots
        bookedSlots,
      };
    } catch (error) {
      logger.error('Error getting available time slots:', error);
      throw error;
    }
  }
}

export const rentalService = new RentalService();
export default rentalService;
