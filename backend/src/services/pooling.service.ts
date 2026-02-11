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

      // Generate polyline for route matching (existing fallback logic)
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
            // [DEBUG] Assigning roadSegments to offer
            logger.error(`[DEBUG] Assigning ${roadSegments.length} roadSegments to offer ${offerId}`);
            routeWithPolyline.roadSegments = roadSegments;
            logger.info(`Generated ${roadSegments.length} road segments for offer ${offerId}`);
            
            // [ROAD-SAVE-1] Log road names being saved to database
            const namedSegments = roadSegments.filter(seg => seg.roadName && seg.roadName.length > 0);
            const roadNames = [...new Set(roadSegments.map(seg => seg.roadName || 'UNNAMED').filter(n => n !== 'UNNAMED'))];
            logger.info(`[ROAD-SAVE-1] ========== SAVING ROAD SEGMENTS ==========`);
            logger.info(`[ROAD-SAVE-2] Offer: ${offerId}, Total segments: ${roadSegments.length}, Named: ${namedSegments.length}, Unnamed: ${roadSegments.length - namedSegments.length}`);
            logger.info(`[ROAD-SAVE-3] Road names to save: [${roadNames.join(' | ')}]`);
            
            // Log first 5 segments with details
            roadSegments.slice(0, 5).forEach((seg, i) => {
              logger.info(`[ROAD-SAVE-4] Segment[${i}]: roadName="${seg.roadName || 'UNNAMED'}", roadRef="${seg.roadRef || 'none'}", roadId="${seg.roadId}", coords=(${seg.lat?.toFixed(6)}, ${seg.lng?.toFixed(6)})`);
            });
            if (roadSegments.length > 5) {
              logger.info(`[ROAD-SAVE-4] ... and ${roadSegments.length - 5} more segments`);
            }
            
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
              logger.error(`[DEBUG] After filtering, ${validSegments.length} valid segments assigned to offer ${offerId}`);
            } else {
              logger.error(`[DEBUG] All ${roadSegments.length} segments are valid for offer ${offerId}`);
            }
          } else {
            logger.error(`[DEBUG] No road segments generated for offer ${offerId}, will use polyline fallback`);
            logger.warn(`No road segments generated for offer ${offerId}, will use polyline fallback`);
          }
        }
      } catch (error) {
        logger.error(`[DEBUG] ERROR in segment generation for offer ${offerId}:`, error);
        logger.warn(`Failed to generate road segments for offer ${offerId}, using polyline fallback:`, error);
        // Continue without road segments - will use polyline matching
      }

      // Create offer
      // [DEBUG] Saving offer with X roadSegments
      logger.error(`[DEBUG] Saving offer ${offerId} with ${routeWithPolyline.roadSegments?.length || 0} roadSegments`);
      const offer = await PoolingOffer.create({
        offerId,
        driverId: data.driverId,
        driverName: driver.name,
        driverPhoto: driver.profilePhoto,
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
        passengers: [],
        status: 'pending',
        views: 0,
        bookingRequests: 0,
      });

      logger.error(`[DEBUG] Offer ${offerId} saved. roadSegments in saved offer: ${offer.route?.roadSegments?.length || 0}`);
      
      // [ROAD-VERIFY-1] Verify road names were actually saved to database
      const savedSegments = offer.route?.roadSegments || [];
      const savedNamedSegments = savedSegments.filter((seg: any) => seg.roadName && seg.roadName.length > 0);
      const savedRoadNames = [...new Set(savedSegments.map((seg: any) => seg.roadName || 'UNNAMED').filter((n: string) => n !== 'UNNAMED'))];
      
      logger.info(`[ROAD-VERIFY-1] ========== VERIFICATION AFTER SAVE ==========`);
      logger.info(`[ROAD-VERIFY-2] Offer: ${offerId}, Saved segments: ${savedSegments.length}, Named: ${savedNamedSegments.length}`);
      logger.info(`[ROAD-VERIFY-3] Road names SAVED: [${savedRoadNames.length > 0 ? savedRoadNames.join(' | ') : 'NONE - POSSIBLE SCHEMA ISSUE!'}]`);
      
      // Log sample of saved segments
      savedSegments.slice(0, 3).forEach((seg: any, i: number) => {
        logger.info(`[ROAD-VERIFY-4] SavedSeg[${i}]: roadName="${seg.roadName || 'MISSING'}", roadRef="${seg.roadRef || 'none'}"`);
      });
      
      if (savedNamedSegments.length === 0 && savedSegments.length > 0) {
        logger.error(`[ROAD-VERIFY-ERROR] ⚠️ CRITICAL: Road names were NOT saved! Check MongoDB schema for roadName field.`);
      } else if (savedNamedSegments.length > 0) {
        logger.info(`[ROAD-VERIFY-SUCCESS] ✅ Road names successfully persisted: ${savedNamedSegments.length}/${savedSegments.length} segments have names`);
      }
      
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

      return offer.toJSON();
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
  }): Promise<{ offers: any[]; total: number; page: number; limit: number }> {
    try {
      logger.error('[DEBUG] ENTERED offers search controller');
      
      const page = filters.page || 1;
      const limit = filters.limit || 20;
      const skip = (page - 1) * limit;

      // Build query
      const query: any = {
        status: { $in: ['active', 'pending'] },
        availableSeats: { $gt: 0 },
      };

      if (filters.date) {
        // Create copies to avoid mutating the original date object
        const startDate = new Date(filters.date);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(filters.date);
        endDate.setHours(23, 59, 59, 999);
        query.date = {
          $gte: startDate,
          $lt: endDate,
        };
      }

      if (filters.vehicleType) {
        query['vehicle.type'] = filters.vehicleType;
      }

      if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
        query.price = {};
        if (filters.minPrice !== undefined) query.price.$gte = filters.minPrice;
        if (filters.maxPrice !== undefined) query.price.$lte = filters.maxPrice;
      }

      // Get all matching offers first
      let offers = await PoolingOffer.find(query).sort({ createdAt: -1 });
      
      logger.error(`[DEBUG] Offers fetched from DB: ${offers.length}`);
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
            logger.info(
              `   Passenger: (${passengerFromLat},${passengerFromLng}) → (${passengerToLat},${passengerToLng})`
            );

            let matchingConfidence: number | undefined = undefined;

            // Try road-aware matching first if road segments are available
            // CRITICAL: Road-aware matching is production-level and MUST be used when segments exist
            if (offer.route.roadSegments && offer.route.roadSegments.length > 0) {
              const segments = offer.route.roadSegments;
              logger.error(`[DEBUG] Offer ${offer.offerId} has ${segments.length} road segments - using road-aware matching`);
              
              // [ROAD-RETRIEVE-1] Log road names retrieved from database
              const namedSegs = segments.filter((seg: any) => seg.roadName && seg.roadName.length > 0);
              const roadNamesFromDB = [...new Set(segments.map((seg: any) => seg.roadName || 'UNNAMED').filter((n: string) => n !== 'UNNAMED'))];
              logger.info(`[ROAD-RETRIEVE-1] ========== RETRIEVED ROAD SEGMENTS ==========`);
              logger.info(`[ROAD-RETRIEVE-2] Offer: ${offer.offerId}, Total: ${segments.length}, Named: ${namedSegs.length}, Unnamed: ${segments.length - namedSegs.length}`);
              logger.info(`[ROAD-RETRIEVE-3] Road names from DB: [${roadNamesFromDB.length > 0 ? roadNamesFromDB.join(' | ') : 'NONE - ALL UNNAMED!'}]`);
              
              // Log first 3 segments
              segments.slice(0, 3).forEach((seg: any, i: number) => {
                logger.info(`[ROAD-RETRIEVE-4] Seg[${i}]: roadName="${seg.roadName || 'UNNAMED'}", roadRef="${seg.roadRef || 'none'}", coords=(${seg.lat?.toFixed(6)}, ${seg.lng?.toFixed(6)})`);
              });
              
              // Alert if no road names (indicates persistence issue)
              if (namedSegs.length === 0) {
                logger.error(`[ROAD-RETRIEVE-ERROR] ⚠️ CRITICAL: No road names in DB for offer ${offer.offerId}! Schema may be missing roadName field or offer was created with old code.`);
              }
              
              try {
                const roadMatch = await roadMatchingService.validateRoadAwareMatch(
                  offer.route.roadSegments,
                  passengerFromLat,
                  passengerFromLng,
                  passengerToLat,
                  passengerToLng,
                  false // hasRecentDeviation - will be enhanced in Phase 8
                );

                matchingConfidence = roadMatch.confidence;
                logger.error(`[DEBUG] Calculated confidence score = ${matchingConfidence.toFixed(2)} for offer ${offer.offerId}`);
                logger.error(`[DEBUG] Road match details: isValid=${roadMatch.isValid}, confidence=${roadMatch.confidence.toFixed(2)}, reason=${roadMatch.reason || 'none'}`);

                logger.info(
                  `   Road-aware match: isValid=${roadMatch.isValid}, confidence=${roadMatch.confidence.toFixed(2)}`
                );

                // High confidence: Accept match immediately (NO polyline fallback for perfect matches)
                if (roadMatch.confidence >= 0.8 && roadMatch.isValid) {
                  logger.error(`[DEBUG] Offer ${offer.offerId} accepted due to confidence >= 0.8 (PERFECT MATCH)`);
                  logger.info(
                    `✅ MATCH: Driver ${offer.route.from.address} → ${offer.route.to.address} (road-aware match, confidence=${roadMatch.confidence.toFixed(2)})`
                  );
                  // Attach confidence to offer (as a property that will be preserved)
                  (offer as any).matchingConfidence = matchingConfidence;
                  return { offer, match: true };
                }

                // Medium confidence: Still accept but log that it's medium confidence
                // NOTE: For production, we keep road-aware confidence even if medium
                if (roadMatch.confidence >= 0.6 && roadMatch.isValid) {
                  logger.info(
                    `   Medium confidence (${roadMatch.confidence.toFixed(2)}), but road-aware match is valid - accepting with road-aware confidence`
                  );
                  // Accept with road-aware confidence (don't fall back to polyline)
                  (offer as any).matchingConfidence = matchingConfidence;
                  return { offer, match: true };
                } else {
                  // Low confidence: Reject (road-aware matching failed)
                  logger.error(`[DEBUG] Offer ${offer.offerId} rejected due to confidence < 0.6 (confidence=${roadMatch.confidence.toFixed(2)}, isValid=${roadMatch.isValid})`);
                  logger.info(
                    `❌ NO MATCH: Road-aware confidence too low (${roadMatch.confidence.toFixed(2)})`
                  );
                  if (roadMatch.reason) {
                    logger.error(`[DEBUG] Rejection reason: ${roadMatch.reason}`);
                  }
                  return { offer, match: false };
                }
              } catch (error) {
                logger.error(
                  `[DEBUG] Road-aware matching ERROR for offer ${offer.offerId}:`,
                  error
                );
                logger.warn(
                  `Road-aware matching failed for offer ${offer.offerId}, using polyline fallback:`,
                  error
                );
                // Continue to polyline fallback only if road-aware matching throws error
              }
            } else {
              logger.error(`[DEBUG] Offer ${offer.offerId} has NO road segments - will use polyline fallback`);
            }

            // Fallback to polyline matching (existing logic) - ONLY if no road segments exist
            // If road segments exist but matching failed, don't use polyline fallback
            if (!offer.route.roadSegments || offer.route.roadSegments.length === 0) {
              logger.error(`[DEBUG] No road segments for offer ${offer.offerId}, using polyline fallback`);
              const polylineMatch = isRouteOnPath(
                passengerFromLat,
                passengerFromLng,
                passengerToLat,
                passengerToLng,
                offer.route.polyline || []
              );

              // For polyline fallback, use default confidence
              if (polylineMatch) {
                matchingConfidence = 0.5; // Default confidence for polyline-only matches
                logger.error(`[DEBUG] Using default polyline confidence 0.5 for offer ${offer.offerId}`);
                
                logger.info(
                  `✅ MATCH: Driver ${offer.route.from.address} → ${offer.route.to.address} (polyline fallback match)`
                );
                logger.error(`[DEBUG] Polyline match succeeded, confidence=${matchingConfidence.toFixed(2)} for offer ${offer.offerId}`);
                
                // Attach confidence to offer
                (offer as any).matchingConfidence = matchingConfidence;
                logger.error(`[DEBUG] Attached matchingConfidence=${matchingConfidence.toFixed(2)} to offer ${offer.offerId}`);
                return { offer, match: true };
              } else {
                logger.info(
                  `❌ NO MATCH: Driver ${offer.route.from.address} → ${offer.route.to.address} (polyline validation failed)`
                );
                logger.error(`[DEBUG] Polyline match failed for offer ${offer.offerId}`);
                return { offer, match: false };
              }
            } else {
              // Road segments exist but matching failed - don't fall back to polyline
              logger.error(`[DEBUG] Road segments exist but matching failed for offer ${offer.offerId} - NOT using polyline fallback`);
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

      // Ensure matchingConfidence is preserved in final response
      const finalOffers = paginatedOffers.map((offer) => {
        // Get confidence BEFORE calling toJSON() since it's a dynamic property
        const confidence = (offer as any).matchingConfidence;
        const offerJson = (offer.toJSON ? offer.toJSON() : offer) as Record<string, any>;
        // Preserve matchingConfidence if it was added during matching
        if (confidence !== undefined) {
          offerJson.matchingConfidence = confidence;
          logger.error(`[DEBUG] Preserving matchingConfidence=${confidence.toFixed(2)} for offer ${(offer as any).offerId}`);
        } else {
          logger.error(`[DEBUG] No matchingConfidence found for offer ${(offer as any).offerId}`);
        }
        return offerJson;
      });

      return {
        offers: finalOffers,
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
