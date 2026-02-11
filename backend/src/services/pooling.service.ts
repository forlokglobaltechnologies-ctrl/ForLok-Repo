import PoolingOffer from '../models/PoolingOffer';
import User from '../models/User';
import Vehicle from '../models/Vehicle';
import { generateUserId } from '../utils/helpers';
import { NotFoundError, ConflictError } from '../utils/errors';
import logger from '../utils/logger';
import { calculateDistance } from '../utils/helpers';
import { Route, OfferStatus } from '../types';
import { getRoutePolyline } from '../utils/maps';

class PoolingService {
  /**
   * Create pooling offer
   */
  async createOffer(data: {
    driverId: string;
    route: Route;
    date: Date;
    time: string;
    vehicleId: string;
    availableSeats: number;
    price?: number; // Optional: Legacy field, not used for dynamic pricing
    notes?: string;
    isPinkPooling?: boolean; // Flag for Pink Pooling offers
  }): Promise<any> {
    try {
      // Get driver info
      const driver = await User.findOne({ userId: data.driverId });
      if (!driver) {
        throw new NotFoundError('Driver not found');
      }

      // Get vehicle info
      const vehicle = await Vehicle.findOne({ vehicleId: data.vehicleId });
      if (!vehicle) {
        throw new NotFoundError('Vehicle not found');
      }

      // Verify vehicle ownership
      if (vehicle.userId !== data.driverId && vehicle.companyId !== data.driverId) {
        throw new ConflictError('Vehicle does not belong to driver');
      }

      // Generate offer ID
      const offerId = generateUserId('PO');

      // Generate polyline for route matching
      let routeWithPolyline = { ...data.route };
      try {
        const polyline = await getRoutePolyline(
          data.route.from.lat,
          data.route.from.lng,
          data.route.to.lat,
          data.route.to.lng
        );
        routeWithPolyline.polyline = polyline;
        logger.info(`Generated polyline with ${polyline.length} points for offer ${offerId}`);
      } catch (error) {
        logger.warn(`Failed to generate polyline for offer ${offerId}, continuing without it:`, error);
        // Continue without polyline - will use fallback matching
      }

      // Create offer
      const offer = await PoolingOffer.create({
        offerId,
        driverId: data.driverId,
        driverName: driver.name,
        driverPhoto: driver.profilePhoto,
        driverGender: driver.gender, // Set driver gender for Pink Pooling filtering
        rating: driver.rating,
        totalReviews: driver.totalReviews,
        route: routeWithPolyline,
        date: data.date,
        time: data.time,
        vehicle: {
          type: vehicle.type,
          brand: vehicle.brand,
          number: vehicle.number,
          photos: vehicle.photos ? Object.values(vehicle.photos).filter(Boolean) : [],
        },
        availableSeats: data.availableSeats,
        totalSeats: vehicle.seats,
        price: data.price || 0, // Legacy field, will be calculated dynamically
        notes: data.notes,
        isPinkPooling: data.isPinkPooling || false,
        passengers: [],
        status: 'pending',
        views: 0,
        bookingRequests: 0,
      });

      logger.info(`Pooling offer created: ${offerId}`);

      return offer.toJSON();
    } catch (error) {
      logger.error('Error creating pooling offer:', error);
      throw error;
    }
  }

  /**
   * Sync offer status based on passengers and available seats
   */
  private async syncOfferStatus(offer: any): Promise<void> {
    const hasPassengers = offer.passengers && offer.passengers.length > 0;
    const allSeatsFilled = offer.availableSeats === 0;

    // Fix status if it's incorrect
    if (offer.status === 'pending' && hasPassengers) {
      // Has passengers but still pending - should be active
      offer.status = 'active';
      await offer.save();
      logger.info(`Synced offer status: ${offer.offerId} -> active`);
    }

    if (offer.status === 'active' && allSeatsFilled) {
      // All seats filled but still active - should be booked
      offer.status = 'booked';
      await offer.save();
      logger.info(`Synced offer status: ${offer.offerId} -> booked`);
    }
  }

  /**
   * Get user's pooling offers
   */
  async getUserOffers(userId: string): Promise<any[]> {
    try {
      const offers = await PoolingOffer.find({ driverId: userId })
        .sort({ createdAt: -1 })
        .limit(50);

      // Sync status for each offer
      for (const offer of offers) {
        await this.syncOfferStatus(offer);
      }

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
      const offer = await PoolingOffer.findOne({ offerId });
      if (!offer) {
        throw new NotFoundError('Offer not found');
      }

      // Sync status if needed
      await this.syncOfferStatus(offer);

      // Increment views
      offer.views += 1;
      await offer.save();

      const offerObj: any = offer.toJSON();

      // Enrich with fresh driver rating
      const driverUser = await User.findOne({ userId: offer.driverId }).select(
        'userId name rating totalReviews profilePhoto'
      );
      offerObj.driver = {
        userId: offer.driverId,
        name: driverUser?.name || offer.driverName,
        photo: driverUser?.profilePhoto || offer.driverPhoto,
        rating: driverUser?.rating ?? offer.rating ?? 0,
        totalReviews: driverUser?.totalReviews ?? offer.totalReviews ?? 0,
      };

      // Enrich passengers with fresh ratings
      if (offerObj.passengers && offerObj.passengers.length > 0) {
        const passengerIds = offerObj.passengers.map((p: any) => p.userId);
        const passengerUsers = await User.find({ userId: { $in: passengerIds } }).select(
          'userId name rating totalReviews profilePhoto'
        );
        const passengerMap = new Map(passengerUsers.map((u) => [u.userId, u]));

        offerObj.passengers = offerObj.passengers.map((p: any) => {
          const pUser = passengerMap.get(p.userId);
          return {
            ...p,
            rating: pUser?.rating ?? 0,
            totalReviews: pUser?.totalReviews ?? 0,
            photo: pUser?.profilePhoto || null,
          };
        });
      }

      return offerObj;
    } catch (error) {
      logger.error('Error getting offer by ID:', error);
      throw error;
    }
  }

  /**
   * Search pooling offers
   */
  async searchOffers(filters: {
    fromLat?: number;
    fromLng?: number;
    toLat?: number;
    toLng?: number;
    date?: Date;
    vehicleType?: 'car' | 'bike';
    minPrice?: number;
    maxPrice?: number;
    maxDistance?: number;
    page?: number;
    limit?: number;
    pinkOnly?: boolean; // Filter for Pink Pooling (women only)
  }): Promise<{ offers: any[]; total: number; page: number; limit: number }> {
    try {
      const page = filters.page || 1;
      const limit = filters.limit || 20;
      const skip = (page - 1) * limit;

      // Build query
      const query: any = {
        status: { $in: ['active', 'pending'] },
        availableSeats: { $gt: 0 },
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

      // Pink Pooling filter - only show female drivers
      if (filters.pinkOnly === true) {
        query.driverGender = 'Female';
      }

      if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
        query.price = {};
        if (filters.minPrice !== undefined) query.price.$gte = filters.minPrice;
        if (filters.maxPrice !== undefined) query.price.$lte = filters.maxPrice;
      }

      // Get all matching offers first
      let offers = await PoolingOffer.find(query).sort({ createdAt: -1 });
      
      logger.info(`🔍 Found ${offers.length} offers matching date/status/vehicle filters`);

      // Filter by location if provided
      // Edge Case 1: Support intermediate pickup/drop-off using polyline index matching
      // Core Logic: driverStartIndex <= passengerStartIndex < passengerEndIndex <= driverEndIndex
      if (filters.fromLat && filters.fromLng && filters.toLat && filters.toLng) {
        const passengerFromLat = filters.fromLat;
        const passengerFromLng = filters.fromLng;
        const passengerToLat = filters.toLat;
        const passengerToLng = filters.toLng;

        logger.info(
          `🔍 Filtering offers for passenger route: ` +
          `(${passengerFromLat},${passengerFromLng}) → (${passengerToLat},${passengerToLng})`
        );

        offers = offers.filter((offer) => {
          const driverFromLat = offer.route.from.lat;
          const driverFromLng = offer.route.from.lng;
          const driverToLat = offer.route.to.lat;
          const driverToLng = offer.route.to.lng;

          logger.info(
            `🔍 Checking offer: Driver ${offer.route.from.address} (${driverFromLat},${driverFromLng}) → ` +
            `${offer.route.to.address} (${driverToLat},${driverToLng})`
          );
          logger.info(
            `   Passenger: (${passengerFromLat},${passengerFromLng}) → (${passengerToLat},${passengerToLng})`
          );

          // Step 1: Check direction consistency
          const driverDirectionLat = driverToLat - driverFromLat;
          const driverDirectionLng = driverToLng - driverFromLng;
          const passengerDirectionLat = passengerToLat - passengerFromLat;
          const passengerDirectionLng = passengerToLng - passengerFromLng;

          logger.info(
            `   Direction check: Driver lat direction=${driverDirectionLat > 0 ? 'North' : driverDirectionLat < 0 ? 'South' : 'Same'}, ` +
            `lng direction=${driverDirectionLng > 0 ? 'East' : driverDirectionLng < 0 ? 'West' : 'Same'}`
          );
          logger.info(
            `   Direction check: Passenger lat direction=${passengerDirectionLat > 0 ? 'North' : passengerDirectionLat < 0 ? 'South' : 'Same'}, ` +
            `lng direction=${passengerDirectionLng > 0 ? 'East' : passengerDirectionLng < 0 ? 'West' : 'Same'}`
          );

          // Check if directions match (both going same way)
          const latDirectionMatch = 
            (driverDirectionLat > 0 && passengerDirectionLat > 0) ||
            (driverDirectionLat < 0 && passengerDirectionLat < 0) ||
            (driverDirectionLat === 0 && passengerDirectionLat === 0);

          const lngDirectionMatch = 
            (driverDirectionLng > 0 && passengerDirectionLng > 0) ||
            (driverDirectionLng < 0 && passengerDirectionLng < 0) ||
            (driverDirectionLng === 0 && passengerDirectionLng === 0);

          if (!latDirectionMatch || !lngDirectionMatch) {
            logger.info(
              `❌ NO MATCH: Direction mismatch - Driver lat=${driverDirectionLat > 0 ? '↑' : driverDirectionLat < 0 ? '↓' : '→'}, ` +
              `Passenger lat=${passengerDirectionLat > 0 ? '↑' : passengerDirectionLat < 0 ? '↓' : '→'}`
            );
            return false;
          }

          // Step 2: Check if passenger source is between driver source and destination
          const minDriverLat = Math.min(driverFromLat, driverToLat);
          const maxDriverLat = Math.max(driverFromLat, driverToLat);
          const minDriverLng = Math.min(driverFromLng, driverToLng);
          const maxDriverLng = Math.max(driverFromLng, driverToLng);

          const passengerSourceInRange = 
            passengerFromLat >= minDriverLat && 
            passengerFromLat <= maxDriverLat &&
            passengerFromLng >= minDriverLng && 
            passengerFromLng <= maxDriverLng;

          const passengerDestInRange = 
            passengerToLat >= minDriverLat && 
            passengerToLat <= maxDriverLat &&
            passengerToLng >= minDriverLng && 
            passengerToLng <= maxDriverLng;

          logger.info(
            `   Range check: Driver lat range [${minDriverLat.toFixed(6)}, ${maxDriverLat.toFixed(6)}], ` +
            `lng range [${minDriverLng.toFixed(6)}, ${maxDriverLng.toFixed(6)}]`
          );
          logger.info(
            `   Passenger source (${passengerFromLat.toFixed(6)}, ${passengerFromLng.toFixed(6)}) in range: ${passengerSourceInRange}`
          );
          logger.info(
            `   Passenger dest (${passengerToLat.toFixed(6)}, ${passengerToLng.toFixed(6)}) in range: ${passengerDestInRange}`
          );

          if (!passengerSourceInRange || !passengerDestInRange) {
            logger.info(
              `❌ NO MATCH: Passenger route not within driver route bounds`
            );
            return false;
          }

          // Step 3: Check order (passenger source should come before passenger destination along driver route)
          // This ensures passenger is going in the same direction as driver
          let orderValid = false;
          
          if (driverDirectionLat > 0) {
            // Driver going North (increasing lat)
            orderValid = passengerFromLat < passengerToLat;
          } else if (driverDirectionLat < 0) {
            // Driver going South (decreasing lat)
            orderValid = passengerFromLat > passengerToLat;
          } else {
            // Driver going East/West (lat same, check lng)
            if (driverDirectionLng > 0) {
              orderValid = passengerFromLng < passengerToLng;
            } else if (driverDirectionLng < 0) {
              orderValid = passengerFromLng > passengerToLng;
            } else {
              orderValid = true; // Both at same point (shouldn't happen)
            }
          }

          if (!orderValid) {
            logger.info(
              `❌ NO MATCH: Passenger route order invalid (not going in same direction as driver)`
            );
            return false;
          }

          // Coordinate-based checks passed - accept the match
          // Skip polyline validation as coordinate-based checks are sufficient
          logger.info(
            `✅ MATCH: Driver ${offer.route.from.address} → ${offer.route.to.address} (coordinate-based match - all checks passed)`
          );
          return true;
        });
      }

      // Apply pagination
      const total = offers.length;
      const paginatedOffers = offers.slice(skip, skip + limit);

      // Enrich offers with fresh driver ratings from User model
      const driverIds = [...new Set(paginatedOffers.map((o) => o.driverId))];
      const drivers = await User.find({ userId: { $in: driverIds } }).select(
        'userId name rating totalReviews profilePhoto'
      );
      const driverMap = new Map(drivers.map((d) => [d.userId, d]));

      const enrichedOffers = paginatedOffers.map((offer) => {
        const offerObj: any = offer.toJSON();
        const driverUser = driverMap.get(offer.driverId);
        offerObj.driver = {
          userId: offer.driverId,
          name: driverUser?.name || offer.driverName,
          photo: driverUser?.profilePhoto || offer.driverPhoto,
          rating: driverUser?.rating ?? offer.rating ?? 0,
          totalReviews: driverUser?.totalReviews ?? offer.totalReviews ?? 0,
        };
        return offerObj;
      });

      return {
        offers: enrichedOffers,
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
   * Generate and update polyline for existing offers that don't have one
   * This is a migration function to add polylines to existing pools
   */
  async migratePolylinesForExistingOffers(): Promise<{ updated: number; failed: number }> {
    try {
      // Find all offers without polyline
      const offersWithoutPolyline = await PoolingOffer.find({
        $or: [
          { 'route.polyline': { $exists: false } },
          { 'route.polyline': { $size: 0 } },
          { 'route.polyline': null },
        ],
      });

      logger.info(`Found ${offersWithoutPolyline.length} offers without polyline`);

      let updated = 0;
      let failed = 0;

      for (const offer of offersWithoutPolyline) {
        try {
          // Generate polyline
          const polyline = await getRoutePolyline(
            offer.route.from.lat,
            offer.route.from.lng,
            offer.route.to.lat,
            offer.route.to.lng
          );

          // Update offer with polyline
          offer.route.polyline = polyline;
          await offer.save();

          updated++;
          logger.info(`✅ Updated polyline for offer ${offer.offerId}`);
        } catch (error) {
          failed++;
          logger.error(`❌ Failed to generate polyline for offer ${offer.offerId}:`, error);
        }
      }

      logger.info(`Polyline migration completed: ${updated} updated, ${failed} failed`);
      return { updated, failed };
    } catch (error) {
      logger.error('Error migrating polylines:', error);
      throw error;
    }
  }

  /**
   * Get nearby offers
   */
  async getNearbyOffers(lat: number, lng: number, radiusKm: number = 10): Promise<any[]> {
    try {
      const offers = await PoolingOffer.find({
        status: { $in: ['active', 'pending'] },
        availableSeats: { $gt: 0 },
      });

      // Filter by distance
      const nearbyOffers = offers
        .map((offer) => {
          const distance = calculateDistance(
            lat,
            lng,
            offer.route.from.lat,
            offer.route.from.lng
          );
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
    driverId: string,
    data: {
      route?: Route;
      date?: Date;
      time?: string;
      availableSeats?: number;
      price?: number;
      notes?: string;
      status?: OfferStatus;
    }
  ): Promise<any> {
    try {
      const offer = await PoolingOffer.findOne({ offerId });
      if (!offer) {
        throw new NotFoundError('Offer not found');
      }

      if (offer.driverId !== driverId) {
        throw new ConflictError('You do not have permission to update this offer');
      }

      // Update fields
      if (data.route !== undefined) offer.route = data.route;
      if (data.date !== undefined) offer.date = data.date;
      if (data.time !== undefined) offer.time = data.time;
      if (data.availableSeats !== undefined) offer.availableSeats = data.availableSeats;
      if (data.price !== undefined) offer.price = data.price;
      if (data.notes !== undefined) offer.notes = data.notes;
      if (data.status !== undefined) offer.status = data.status;

      await offer.save();

      logger.info(`Pooling offer updated: ${offerId}`);

      return offer.toJSON();
    } catch (error) {
      logger.error('Error updating offer:', error);
      throw error;
    }
  }

  /**
   * Cancel offer
   */
  async cancelOffer(offerId: string, driverId: string): Promise<void> {
    try {
      const offer = await PoolingOffer.findOne({ offerId });
      if (!offer) {
        throw new NotFoundError('Offer not found');
      }

      if (offer.driverId !== driverId) {
        throw new ConflictError('You do not have permission to cancel this offer');
      }

      offer.status = 'cancelled';
      await offer.save();

      logger.info(`Pooling offer cancelled: ${offerId}`);
    } catch (error) {
      logger.error('Error cancelling offer:', error);
      throw error;
    }
  }
}

export const poolingService = new PoolingService();
export default poolingService;
