import PoolingOffer from '../models/PoolingOffer';
import User from '../models/User';
import Vehicle from '../models/Vehicle';
import { generateUserId } from '../utils/helpers';
import { NotFoundError, ConflictError } from '../utils/errors';
import logger from '../utils/logger';
import { calculateDistance } from '../utils/helpers';
import { Route, OfferStatus } from '../types';
import { getRoutePolyline, getRouteWithRoadSegments } from '../utils/maps';
import { isRouteOnPath } from '../utils/maps';
import { roadMatchingService } from './road-matching.service';

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

      // Generate road segments for road-aware matching (NEW - additive layer)
      try {
        // Validate coordinates before attempting to generate segments
        if (
          !Number.isFinite(data.route.from.lat) || !Number.isFinite(data.route.from.lng) ||
          !Number.isFinite(data.route.to.lat) || !Number.isFinite(data.route.to.lng)
        ) {
          logger.warn(
            `Invalid coordinates for offer ${offerId}, skipping road segment generation: ` +
            `from(${data.route.from.lat}, ${data.route.from.lng}), to(${data.route.to.lat}, ${data.route.to.lng})`
          );
        } else {
          // Calculate start time from offer date and time
          const offerDateTime = new Date(data.date);
          const timeMatch = data.time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
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

          logger.error(`[DEBUG] Calling getRouteWithRoadSegments for offer ${offerId}`);
          const roadSegments = await getRouteWithRoadSegments(
            data.route.from.lat,
            data.route.from.lng,
            data.route.to.lat,
            data.route.to.lng,
            offerDateTime
          );
          
          logger.error(`[DEBUG] getRouteWithRoadSegments returned ${roadSegments?.length || 0} segments for offer ${offerId}`);
          
          if (roadSegments && roadSegments.length > 0) {
            logger.error(`[DEBUG] Assigning ${roadSegments.length} roadSegments to offer ${offerId}`);
            routeWithPolyline.roadSegments = roadSegments;
            logger.info(`Generated ${roadSegments.length} road segments for offer ${offerId}`);
            
            const namedSegments = roadSegments.filter(seg => seg.roadName && seg.roadName.length > 0);
            const roadNames = [...new Set(roadSegments.map(seg => seg.roadName || 'UNNAMED').filter(n => n !== 'UNNAMED'))];
            logger.info(`[ROAD-SAVE-1] ========== SAVING ROAD SEGMENTS ==========`);
            logger.info(`[ROAD-SAVE-2] Offer: ${offerId}, Total segments: ${roadSegments.length}, Named: ${namedSegments.length}, Unnamed: ${roadSegments.length - namedSegments.length}`);
            logger.info(`[ROAD-SAVE-3] Road names to save: [${roadNames.join(' | ')}]`);
            
            // Validate segments have required fields
            const validSegments = roadSegments.filter(seg => 
              seg.roadId && 
              seg.direction && 
              Number.isFinite(seg.lat) && 
              Number.isFinite(seg.lng) &&
              seg.estimatedTime &&
              typeof seg.segmentIndex === 'number'
            );
            
            if (validSegments.length !== roadSegments.length) {
              logger.warn(
                `Offer ${offerId}: ${roadSegments.length - validSegments.length} segments filtered out due to missing fields`
              );
              routeWithPolyline.roadSegments = validSegments;
            }
          } else {
            logger.warn(`No road segments generated for offer ${offerId}, will use polyline fallback`);
          }
        }
      } catch (error) {
        logger.error(`[DEBUG] ERROR in segment generation for offer ${offerId}:`, error);
        logger.warn(`Failed to generate road segments for offer ${offerId}, using polyline fallback:`, error);
        // Continue without road segments - will use polyline matching
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
    time?: string; // e.g. "9:00 AM"
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

      // === DETAILED LOGGING ===
      logger.info(`[SEARCH] ========== searchOffers called ==========`);
      logger.info(`[SEARCH] Raw filters: date=${filters.date?.toISOString() ?? 'ANY'}, time=${filters.time ?? 'ANY'}, vehicleType=${filters.vehicleType ?? 'ALL'}, pinkOnly=${filters.pinkOnly ?? false}`);
      logger.info(`[SEARCH] Coordinates: from=(${filters.fromLat}, ${filters.fromLng}), to=(${filters.toLat}, ${filters.toLng})`);

      // Build query
      const query: any = {
        status: { $in: ['active', 'pending'] },
        availableSeats: { $gt: 0 },
      };

      // --- DATE FILTER (timezone-safe using UTC) ---
      if (filters.date) {
        const dateVal = new Date(filters.date);
        if (isNaN(dateVal.getTime())) {
          logger.warn(`[SEARCH] Invalid Date received: ${filters.date}. Skipping date filter.`);
        } else {
          const dateStart = new Date(dateVal);
          dateStart.setUTCHours(0, 0, 0, 0);
          const dateEnd = new Date(dateVal);
          dateEnd.setUTCHours(23, 59, 59, 999);
          query.date = { $gte: dateStart, $lt: dateEnd };
          logger.info(`[SEARCH] Date filter: $gte=${dateStart.toISOString()}, $lt=${dateEnd.toISOString()}`);
        }
      } else {
        // No date filter — show all future offers (today onwards)
        const now = new Date();
        now.setUTCHours(0, 0, 0, 0);
        query.date = { $gte: now };
        logger.info(`[SEARCH] No date supplied — showing all offers from today onwards ($gte=${now.toISOString()})`);
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

      logger.info(`[SEARCH] MongoDB query: ${JSON.stringify(query)}`);

      // Get all matching offers first
      let offers = await PoolingOffer.find(query).sort({ createdAt: -1 });
      
      logger.info(`[SEARCH] Found ${offers.length} offers matching date/status/vehicle filters`);

      // --- TIME FILTER (±1 hour window, midnight-safe) ---
      if (filters.time && offers.length > 0) {
        const parsedMinutes = this.parseTimeToMinutes(filters.time);
        if (parsedMinutes !== null) {
          const TIME_WINDOW_MINUTES = 60; // ±1 hour (industry standard for carpooling)
          const MINUTES_IN_DAY = 1440; // 24 * 60

          logger.info(`[SEARCH] Time filter: passenger="${filters.time}" (${parsedMinutes}min), window=±${TIME_WINDOW_MINUTES}min`);

          const beforeCount = offers.length;
          offers = offers.filter((offer) => {
            const offerMinutes = this.parseTimeToMinutes(offer.time);
            if (offerMinutes === null) {
              logger.warn(`[SEARCH] Time filter: offer ${offer.offerId} has unparseable time="${offer.time}" — EXCLUDED`);
              return false; // Exclude offers with unparseable time
            }

            // Calculate circular distance (handles midnight wraparound)
            // e.g. 11:30 PM (1410) vs 12:30 AM (30) → distance = 60, not 1380
            const diff = Math.abs(offerMinutes - parsedMinutes);
            const circularDiff = Math.min(diff, MINUTES_IN_DAY - diff);
            const passes = circularDiff < TIME_WINDOW_MINUTES; // Exclusive bound (< not <=)

            logger.info(`[SEARCH] Time filter: offer ${offer.offerId} time="${offer.time}" (${offerMinutes}min), diff=${circularDiff}min, ${passes ? 'PASS' : 'FAIL'}`);
            return passes;
          });

          logger.info(`[SEARCH] Time filter result: ${beforeCount} → ${offers.length} offers after ±${TIME_WINDOW_MINUTES}min window`);

          // Sort remaining offers by time proximity (closest departure first)
          if (offers.length > 1) {
            offers.sort((a, b) => {
              const aMin = this.parseTimeToMinutes(a.time) ?? 0;
              const bMin = this.parseTimeToMinutes(b.time) ?? 0;
              const aDiff = Math.abs(aMin - parsedMinutes);
              const aCirc = Math.min(aDiff, MINUTES_IN_DAY - aDiff);
              const bDiff = Math.abs(bMin - parsedMinutes);
              const bCirc = Math.min(bDiff, MINUTES_IN_DAY - bDiff);
              return aCirc - bCirc;
            });
            logger.info(`[SEARCH] Offers sorted by time proximity to ${filters.time}`);
          }
        } else {
          logger.warn(`[SEARCH] Could not parse passenger time string: "${filters.time}". Skipping time filter.`);
        }
      } else if (!filters.time) {
        logger.info(`[SEARCH] No time filter — showing all times`);
      }

      // --- ZERO-RESULT DIAGNOSTIC ---
      if (offers.length === 0) {
        const totalInDb = await PoolingOffer.countDocuments({ status: { $in: ['active', 'pending'] } });
        logger.warn(`[SEARCH] 0 offers matched. Total active/pending offers in DB: ${totalInDb}`);
        if (totalInDb > 0) {
          const sampleOffers = await PoolingOffer.find({ status: { $in: ['active', 'pending'] } })
            .select('date time route.from.address route.to.address')
            .limit(5)
            .lean();
          sampleOffers.forEach((s: any, i: number) => {
            logger.warn(`[SEARCH] Sample offer[${i}]: date=${s.date}, time=${s.time}, from=${s.route?.from?.address}, to=${s.route?.to?.address}`);
          });
        }
      }

      // Filter by location if provided
      // Uses road-aware matching with polyline fallback
      if (filters.fromLat && filters.fromLng && filters.toLat && filters.toLng) {
        const passengerFromLat = filters.fromLat;
        const passengerFromLng = filters.fromLng;
        const passengerToLat = filters.toLat;
        const passengerToLng = filters.toLng;

        logger.info(
          `🔍 Filtering offers for passenger route: ` +
          `(${passengerFromLat},${passengerFromLng}) → (${passengerToLat},${passengerToLng})`
        );

        // Filter offers using road-aware matching with polyline fallback
        const offersWithMatch = await Promise.all(
          offers.map(async (offer) => {
            logger.error(`[DEBUG] Evaluating offer ${offer.offerId}`);
            
            const driverFromLat = offer.route.from.lat;
            const driverFromLng = offer.route.from.lng;
            const driverToLat = offer.route.to.lat;
            const driverToLng = offer.route.to.lng;

            logger.info(
              `🔍 Checking offer: Driver ${offer.route.from.address} (${driverFromLat},${driverFromLng}) → ` +
              `${offer.route.to.address} (${driverToLat},${driverToLng})`
            );

            let matchingConfidence: number | undefined = undefined;

            // Try road-aware matching first if road segments are available
            if (offer.route.roadSegments && offer.route.roadSegments.length > 0) {
              const segments = offer.route.roadSegments;
              logger.error(`[DEBUG] Offer ${offer.offerId} has ${segments.length} road segments - using road-aware matching`);
              
              try {
                const roadMatch = await roadMatchingService.validateRoadAwareMatch(
                  offer.route.roadSegments,
                  passengerFromLat,
                  passengerFromLng,
                  passengerToLat,
                  passengerToLng,
                  false // hasRecentDeviation
                );

                matchingConfidence = roadMatch.confidence;
                logger.error(`[DEBUG] Calculated confidence score = ${matchingConfidence.toFixed(2)} for offer ${offer.offerId}`);

                // High confidence: Accept match immediately
                if (roadMatch.confidence >= 0.8 && roadMatch.isValid) {
                  logger.info(
                    `✅ MATCH: Driver ${offer.route.from.address} → ${offer.route.to.address} (road-aware match, confidence=${roadMatch.confidence.toFixed(2)})`
                  );
                  (offer as any).matchingConfidence = matchingConfidence;
                  return { offer, match: true };
                }

                // Medium confidence: Still accept
                if (roadMatch.confidence >= 0.6 && roadMatch.isValid) {
                  logger.info(
                    `   Medium confidence (${roadMatch.confidence.toFixed(2)}), but road-aware match is valid - accepting`
                  );
                  (offer as any).matchingConfidence = matchingConfidence;
                  return { offer, match: true };
                } else {
                  // Low confidence: Reject
                  logger.error(`[DEBUG] Offer ${offer.offerId} rejected due to confidence < 0.6 (confidence=${roadMatch.confidence.toFixed(2)})`);
                  return { offer, match: false };
                }
              } catch (error) {
                logger.warn(
                  `Road-aware matching failed for offer ${offer.offerId}, using polyline fallback:`,
                  error
                );
                // Continue to polyline fallback only if road-aware matching throws error
              }
            } else {
              logger.error(`[DEBUG] Offer ${offer.offerId} has NO road segments - will use polyline fallback`);
            }

            // Fallback to polyline matching - ONLY if no road segments exist
            if (!offer.route.roadSegments || offer.route.roadSegments.length === 0) {
              const polylineMatch = isRouteOnPath(
                passengerFromLat,
                passengerFromLng,
                passengerToLat,
                passengerToLng,
                offer.route.polyline || []
              );

              if (polylineMatch) {
                matchingConfidence = 0.5; // Default confidence for polyline-only matches
                logger.info(
                  `✅ MATCH: Driver ${offer.route.from.address} → ${offer.route.to.address} (polyline fallback match)`
                );
                (offer as any).matchingConfidence = matchingConfidence;
                return { offer, match: true };
              } else {
                logger.info(
                  `❌ NO MATCH: Driver ${offer.route.from.address} → ${offer.route.to.address} (polyline validation failed)`
                );
                return { offer, match: false };
              }
            } else {
              // Road segments exist but matching failed - don't fall back to polyline
              return { offer, match: false };
            }
          })
        );

        // Filter to only matched offers
        offers = offersWithMatch.filter((item) => item.match).map((item) => item.offer);
        
        logger.error(`[DEBUG] Final offers returned by search = ${offers.length}`);
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
        // Get confidence BEFORE calling toJSON() since it's a dynamic property
        const confidence = (offer as any).matchingConfidence;
        const offerObj: any = offer.toJSON ? offer.toJSON() : offer;
        const driverUser = driverMap.get(offer.driverId);
        offerObj.driver = {
          userId: offer.driverId,
          name: driverUser?.name || offer.driverName,
          photo: driverUser?.profilePhoto || offer.driverPhoto,
          rating: driverUser?.rating ?? offer.rating ?? 0,
          totalReviews: driverUser?.totalReviews ?? offer.totalReviews ?? 0,
        };
        // Preserve matchingConfidence if it was added during matching
        if (confidence !== undefined) {
          offerObj.matchingConfidence = confidence;
        }
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

  /**
   * Parse a time string like "9:00 AM", "14:30", "2:30 PM" into minutes since midnight.
   * Handles: "9:00 AM", "9:00 am", "09:00 AM", "14:30", "2:30 PM", "12:00 AM" (midnight), "12:00 PM" (noon).
   * Returns null if parsing fails.
   */
  private parseTimeToMinutes(timeStr: string): number | null {
    if (!timeStr || typeof timeStr !== 'string') return null;
    const cleaned = timeStr.trim();
    if (!cleaned) return null;

    // Try 12-hour format: "9:00 AM", "12:30 PM"
    const match12 = cleaned.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (match12) {
      let hour = parseInt(match12[1], 10);
      const minute = parseInt(match12[2], 10);
      const ampm = match12[3].toUpperCase();

      // Validate hour range for 12h format (1-12)
      if (hour < 1 || hour > 12 || minute < 0 || minute > 59) return null;

      // Convert to 24h
      if (ampm === 'AM') {
        hour = hour === 12 ? 0 : hour; // 12 AM = 0, 1-11 AM stays
      } else {
        hour = hour === 12 ? 12 : hour + 12; // 12 PM = 12, 1-11 PM → 13-23
      }
      return hour * 60 + minute;
    }

    // Try 24-hour format: "14:30", "09:00"
    const match24 = cleaned.match(/^(\d{1,2}):(\d{2})$/);
    if (match24) {
      const hour = parseInt(match24[1], 10);
      const minute = parseInt(match24[2], 10);
      if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
      return hour * 60 + minute;
    }

    return null;
  }
}

export const poolingService = new PoolingService();
export default poolingService;
