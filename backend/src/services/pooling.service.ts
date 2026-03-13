import PoolingOffer from '../models/PoolingOffer';
import Booking from '../models/Booking';
import User from '../models/User';
import Vehicle from '../models/Vehicle';
import { generateUserId } from '../utils/helpers';
import { NotFoundError, ConflictError, ValidationError } from '../utils/errors';
import logger from '../utils/logger';
import { calculateDistance } from '../utils/helpers';
import { Route, OfferStatus } from '../types';
import { getRoutePolyline, getRouteWithRoadSegments, getMinWaypointCount, validateWaypointOnRoute } from '../utils/maps';
import { isRouteOnPath, findNearestPolylineIndex } from '../utils/maps';
import { roadMatchingService } from './road-matching.service';

class PoolingService {
  private readonly TRIP_BUFFER_MINUTES = 10;

  private getVehicleAverageSpeedKmh(vehicleType?: string): number {
    const type = (vehicleType || '').toLowerCase();
    if (type === 'bike') return 40;
    if (type === 'scooty' || type === 'scooter') return 35;
    return 45; // car/default
  }

  private buildOfferStartAt(date: Date, timeLabel?: string): Date {
    const startAt = new Date(date);
    const parsedMinutes = this.parseTimeToMinutes(timeLabel || '');
    if (parsedMinutes !== null) {
      const hours = Math.floor(parsedMinutes / 60);
      const minutes = parsedMinutes % 60;
      startAt.setHours(hours, minutes, 0, 0);
    }
    return startAt;
  }

  private estimateOfferTravelDurationMinutes(route: Partial<Route> | undefined, vehicleType?: string): number {
    const explicitDuration = Number((route as any)?.duration);
    if (Number.isFinite(explicitDuration) && explicitDuration > 0) {
      return Math.max(5, Math.ceil(explicitDuration));
    }

    let routeKm = Number((route as any)?.distance);
    if (!Number.isFinite(routeKm) || routeKm <= 0) {
      const from = route?.from;
      const to = route?.to;
      if (from && to) {
        routeKm = calculateDistance(from.lat, from.lng, to.lat, to.lng);
      }
    }
    if (!Number.isFinite(routeKm) || routeKm <= 0) {
      routeKm = 5;
    }

    const speedKmh = this.getVehicleAverageSpeedKmh(vehicleType);
    return Math.max(10, Math.ceil((routeKm / speedKmh) * 60));
  }

  private getOfferTimeWindow(input: {
    date: Date;
    time?: string;
    route?: Partial<Route>;
    vehicleType?: string;
  }): { startAt: Date; endAt: Date; travelDurationMin: number; blockedDurationMin: number } {
    const startAt = this.buildOfferStartAt(input.date, input.time);
    const travelDurationMin = this.estimateOfferTravelDurationMinutes(input.route, input.vehicleType);
    const blockedDurationMin = travelDurationMin + this.TRIP_BUFFER_MINUTES;
    const endAt = new Date(startAt.getTime() + blockedDurationMin * 60 * 1000);
    return { startAt, endAt, travelDurationMin, blockedDurationMin };
  }

  private hasWindowOverlap(
    aStart: Date,
    aEnd: Date,
    bStart: Date,
    bEnd: Date
  ): boolean {
    return aStart.getTime() < bEnd.getTime() && bStart.getTime() < aEnd.getTime();
  }

  private formatDateTimeForMessage(d: Date): string {
    return d.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  }

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

      const maxAvailableSeats = Math.max(1, Number(vehicle.seats) || 1);
      if (data.availableSeats > maxAvailableSeats) {
        throw new ValidationError(
          `This vehicle supports only ${maxAvailableSeats} seat(s).`,
          [
            {
              field: 'availableSeats',
              message: `Choose up to ${maxAvailableSeats} seat(s) for the selected vehicle.`,
              code: 'AVAILABLE_SEATS_EXCEEDS_VEHICLE_CAPACITY',
            },
          ]
        );
      }

      // Generate offer ID
      const offerId = generateUserId('PO');

      // Prefer client-selected polyline from route alternatives.
      // Fallback to server-generated polyline for backward compatibility.
      const routeWithPolyline = { ...data.route };
      const selectedPolyline = (data.route.selectedPolyline || []).filter(
        (point) =>
          Number.isFinite(point?.lat) &&
          Number.isFinite(point?.lng) &&
          Number.isInteger(point?.index) &&
          point.index >= 0
      );

      if (selectedPolyline.length >= 2) {
        routeWithPolyline.polyline = selectedPolyline;
        logger.info(
          `Using client-selected polyline with ${selectedPolyline.length} points for offer ${offerId} (routeId=${data.route.selectedRouteId || 'unknown'})`
        );
      } else {
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
      }

      // selectedPolyline is only request-time input; persist normalized route.polyline.
      delete (routeWithPolyline as any).selectedPolyline;

      const blockingStatuses: OfferStatus[] = ['active', 'pending', 'in_progress', 'booked'];
      const newWindow = this.getOfferTimeWindow({
        date: data.date,
        time: data.time,
        route: routeWithPolyline,
        vehicleType: vehicle.type,
      });

      // Overlap validation: same driver cannot run two pooling trips at once
      // (even on different vehicles). Same vehicle also cannot overlap.
      const existingDriverOffers = await PoolingOffer.find({
        driverId: data.driverId,
        status: { $in: blockingStatuses },
      }).select('offerId date time route vehicle status');

      for (const existingOffer of existingDriverOffers) {
        const existingWindow = this.getOfferTimeWindow({
          date: existingOffer.date,
          time: existingOffer.time,
          route: existingOffer.route as Route,
          vehicleType: (existingOffer as any).vehicle?.type,
        });
        const overlaps = this.hasWindowOverlap(
          newWindow.startAt,
          newWindow.endAt,
          existingWindow.startAt,
          existingWindow.endAt
        );
        if (!overlaps) continue;

        const sameVehicle = (existingOffer as any).vehicle?.number === vehicle.number;
        if (sameVehicle) {
          throw new ConflictError(
            `Vehicle ${vehicle.number} is busy during ${this.formatDateTimeForMessage(existingWindow.startAt)} - ${this.formatDateTimeForMessage(existingWindow.endAt)} ` +
            `(offer ${existingOffer.offerId}). Choose a different time.`
          );
        }

        throw new ConflictError(
          `You already have an overlapping pooling trip (${existingOffer.offerId}) from ` +
          `${this.formatDateTimeForMessage(existingWindow.startAt)} to ${this.formatDateTimeForMessage(existingWindow.endAt)}. ` +
          `A driver cannot run multiple trips at the same time.`
        );
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
          const offerDateTime = this.buildOfferStartAt(data.date, data.time);

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

      // Enforce mandatory waypoint count and strict route validity.
      const routeDistKm = calculateDistance(
        data.route.from.lat,
        data.route.from.lng,
        data.route.to.lat,
        data.route.to.lng
      );
      const minRequired = getMinWaypointCount(routeDistKm);
      const providedWaypoints = [...(routeWithPolyline.waypoints || [])]
        .sort((a: any, b: any) => (a.order || 0) - (b.order || 0));

      if (providedWaypoints.length < minRequired) {
        throw new ValidationError(
          `For this ${Math.round(routeDistKm)} km route, at least ${minRequired} via point${minRequired > 1 ? 's' : ''} ${minRequired > 1 ? 'are' : 'is'} required.`,
          [
            {
              field: 'route.waypoints',
              message: `Minimum ${minRequired} via point${minRequired > 1 ? 's' : ''} required for this route.`,
              code: 'MIN_WAYPOINTS_REQUIRED',
            },
          ]
        );
      }

      // Validate waypoint ordering against existing route polyline.
      // Avoid expensive per-waypoint OSRM calls that can cause request timeouts.
      const basePolyline = routeWithPolyline.polyline || [];
      let prevNearestIndex = -1;
      for (let i = 0; i < providedWaypoints.length; i++) {
        const wp = providedWaypoints[i];
        const waypointCheck = validateWaypointOnRoute(wp.lat, wp.lng, basePolyline);

        if (!waypointCheck.valid) {
          throw new ValidationError(
            `Via point "${wp.address}" is invalid for this route.`,
            [
              {
                field: `route.waypoints[${i}]`,
                message: waypointCheck.reason || 'Waypoint is not on the selected route',
                code: 'WAYPOINT_NOT_ON_ROUTE',
              },
            ]
          );
        }

        // Waypoints must progress forward along route order.
        if (waypointCheck.nearestIndex < prevNearestIndex) {
          throw new ValidationError(
            `Via point "${wp.address}" is out of route order.`,
            [
              {
                field: `route.waypoints[${i}]`,
                message: 'Waypoints must follow route order from pickup to destination',
                code: 'WAYPOINT_ORDER_INVALID',
              },
            ]
          );
        }
        prevNearestIndex = waypointCheck.nearestIndex;
      }

      routeWithPolyline.waypoints = providedWaypoints.map((wp: any, idx: number) => ({
        ...wp,
        order: idx,
      }));

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
          model: vehicle.vehicleModel,
          number: vehicle.number,
          seats: vehicle.seats,
          fuelType: vehicle.fuelType,
          transmission: vehicle.transmission,
          year: vehicle.year,
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
    // Never override in_progress or completed — these are set by trip lifecycle
    if (offer.status === 'in_progress' || offer.status === 'completed') return;

    const hasPassengers = offer.passengers && offer.passengers.length > 0;
    const allSeatsFilled = offer.availableSeats === 0;

    if (offer.status === 'pending' && hasPassengers) {
      offer.status = 'active';
      await offer.save();
      logger.info(`Synced offer status: ${offer.offerId} -> active`);
    }

    if (offer.status === 'active' && allSeatsFilled) {
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
    vehicleType?: 'car' | 'bike' | 'scooty';
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

      // Coarse geo pre-filter: only load offers whose from/to/waypoints are within ~30km of the passenger's from or to
      if (filters.fromLat && filters.fromLng && filters.toLat && filters.toLng) {
        const GEO_PREFILTER_DEG = 0.27; // ~30km in degrees latitude
        const minLat = Math.min(filters.fromLat, filters.toLat) - GEO_PREFILTER_DEG;
        const maxLat = Math.max(filters.fromLat, filters.toLat) + GEO_PREFILTER_DEG;
        const minLng = Math.min(filters.fromLng, filters.toLng) - GEO_PREFILTER_DEG;
        const maxLng = Math.max(filters.fromLng, filters.toLng) + GEO_PREFILTER_DEG;

        query.$or = [
          { 'route.from.lat': { $gte: minLat, $lte: maxLat }, 'route.from.lng': { $gte: minLng, $lte: maxLng } },
          { 'route.to.lat': { $gte: minLat, $lte: maxLat }, 'route.to.lng': { $gte: minLng, $lte: maxLng } },
          { 'route.waypoints': { $elemMatch: { lat: { $gte: minLat, $lte: maxLat }, lng: { $gte: minLng, $lte: maxLng } } } },
        ];
        logger.info(`[SEARCH] Geo pre-filter: lat[${minLat.toFixed(2)},${maxLat.toFixed(2)}] lng[${minLng.toFixed(2)},${maxLng.toFixed(2)}]`);
      }

      logger.info(`[SEARCH] MongoDB query: ${JSON.stringify(query)}`);

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
      if (filters.fromLat && filters.fromLng && filters.toLat && filters.toLng) {
        const passengerFromLat = filters.fromLat;
        const passengerFromLng = filters.fromLng;
        const passengerToLat = filters.toLat;
        const passengerToLng = filters.toLng;

        logger.info(
          `🔍 Filtering ${offers.length} offers for passenger route: ` +
          `(${passengerFromLat},${passengerFromLng}) → (${passengerToLat},${passengerToLng})`
        );

        const offersWithMatch = await Promise.all(
          offers.map(async (offer) => {
            let matchingConfidence: number | undefined = undefined;

            // ── Universal direction check: reject pickup BEFORE source or drop AFTER destination ──
            const src = offer.route.from;
            const dest = offer.route.to;
            // Use first waypoint or destination as the "forward" reference
            const fwdRef = (offer.route.waypoints && offer.route.waypoints.length > 0)
              ? offer.route.waypoints.sort((a: any, b: any) => a.order - b.order)[0]
              : dest;
            // Forward vector from source
            const fwdLat = fwdRef.lat - src.lat;
            const fwdLng = fwdRef.lng - src.lng;
            // Vector from source to passenger pickup
            const pickupDotProduct = fwdLat * (passengerFromLat - src.lat) + fwdLng * (passengerFromLng - src.lng);

            if (pickupDotProduct < 0) {
              logger.info(
                `❌ DIRECTION REJECT: ${offer.offerId} — passenger pickup (${passengerFromLat.toFixed(4)}, ${passengerFromLng.toFixed(4)}) ` +
                `is BEHIND driver source (${src.lat.toFixed(4)}, ${src.lng.toFixed(4)}), dot=${pickupDotProduct.toFixed(4)}`
              );
              return { offer, match: false };
            }

            // Backward reference: last waypoint or source
            const bwdRef = (offer.route.waypoints && offer.route.waypoints.length > 0)
              ? offer.route.waypoints.sort((a: any, b: any) => b.order - a.order)[0]
              : src;
            // Arrival vector into destination
            const arrLat = dest.lat - bwdRef.lat;
            const arrLng = dest.lng - bwdRef.lng;
            // Overshoot vector from destination to passenger drop
            const dropDotProduct = arrLat * (passengerToLat - dest.lat) + arrLng * (passengerToLng - dest.lng);

            if (dropDotProduct > 0) {
              logger.info(
                `❌ DIRECTION REJECT: ${offer.offerId} — passenger drop (${passengerToLat.toFixed(4)}, ${passengerToLng.toFixed(4)}) ` +
                `is PAST driver destination (${dest.lat.toFixed(4)}, ${dest.lng.toFixed(4)}), dot=${dropDotProduct.toFixed(4)}`
              );
              return { offer, match: false };
            }

            const hasWaypoints = offer.route.waypoints && offer.route.waypoints.length > 0;

            // --- Strategy 1: Waypoint matching (BlaBlaCar-style, primary) ---
            if (hasWaypoints) {
              const wps = offer.route.waypoints!;
              const searchablePoints = [
                { lat: offer.route.from.lat, lng: offer.route.from.lng, order: -1, label: 'SOURCE' },
                ...wps.map((wp: any) => ({
                  lat: wp.lat, lng: wp.lng, order: wp.order,
                  label: wp.city || wp.address?.split(',')[0] || `WP${wp.order}`,
                })),
                { lat: offer.route.to.lat, lng: offer.route.to.lng, order: wps.length + 1, label: 'DEST' },
              ].sort((a: any, b: any) => a.order - b.order);

              const driverRouteDistKm = calculateDistance(
                offer.route.from.lat, offer.route.from.lng,
                offer.route.to.lat, offer.route.to.lng
              );

              // BlaBlaCar-style radius: city-level matching, generous for long routes
              let waypointRadius: number;
              if (driverRouteDistKm < 30) waypointRadius = 5;
              else if (driverRouteDistKm < 100) waypointRadius = 15;
              else if (driverRouteDistKm < 200) waypointRadius = 25;
              else if (driverRouteDistKm < 400) waypointRadius = 35;
              else waypointRadius = 45;

              let bestPickup = { dist: Infinity, order: -1, label: '', lat: 0, lng: 0 };
              let bestDrop = { dist: Infinity, order: -1, label: '', lat: 0, lng: 0 };

              for (const pt of searchablePoints) {
                const pickupDist = calculateDistance(passengerFromLat, passengerFromLng, pt.lat, pt.lng);
                if (pickupDist < bestPickup.dist) {
                  bestPickup = { dist: pickupDist, order: pt.order, label: (pt as any).label, lat: pt.lat, lng: pt.lng };
                }
                const dropDist = calculateDistance(passengerToLat, passengerToLng, pt.lat, pt.lng);
                if (dropDist < bestDrop.dist) {
                  bestDrop = { dist: dropDist, order: pt.order, label: (pt as any).label, lat: pt.lat, lng: pt.lng };
                }
              }

              logger.info(
                `[WAYPOINT-MATCH] ${offer.offerId}: route=${driverRouteDistKm.toFixed(0)}km, radius=${waypointRadius}km, ` +
                `points=[${searchablePoints.map((p: any) => p.label).join(' → ')}], ` +
                `bestPickup=${bestPickup.label}(${bestPickup.dist.toFixed(1)}km, order=${bestPickup.order}), ` +
                `bestDrop=${bestDrop.label}(${bestDrop.dist.toFixed(1)}km, order=${bestDrop.order})`
              );

              if (
                bestPickup.dist <= waypointRadius &&
                bestDrop.dist <= waypointRadius &&
                bestPickup.order < bestDrop.order
              ) {
                // Enforce near-line validation when polyline exists:
                // passenger endpoints must still lie close to selected route path.
                const hasValidPolyline = Array.isArray(offer.route.polyline) && offer.route.polyline.length > 1;
                if (hasValidPolyline) {
                  const polyline = offer.route.polyline || [];
                  const nearLine = isRouteOnPath(
                    passengerFromLat,
                    passengerFromLng,
                    passengerToLat,
                    passengerToLng,
                    polyline
                  );
                  if (!nearLine) {
                    logger.info(
                      `[WAYPOINT-MATCH] ${offer.offerId}: ❌ REJECTED after near-line check (waypoint match passed but not near selected route line)`
                    );
                    return { offer, match: false };
                  }

                  // Strict mode: endpoints must be near selected polyline and remain
                  // within the selected via-point segment window on the route.
                  const passengerPickupSnap = findNearestPolylineIndex(
                    passengerFromLat,
                    passengerFromLng,
                    polyline
                  );
                  const passengerDropSnap = findNearestPolylineIndex(
                    passengerToLat,
                    passengerToLng,
                    polyline
                  );
                  const pickupAnchorSnap = findNearestPolylineIndex(
                    bestPickup.lat,
                    bestPickup.lng,
                    polyline
                  );
                  const dropAnchorSnap = findNearestPolylineIndex(
                    bestDrop.lat,
                    bestDrop.lng,
                    polyline
                  );

                  const minAnchorIndex = Math.min(pickupAnchorSnap.index, dropAnchorSnap.index);
                  const maxAnchorIndex = Math.max(pickupAnchorSnap.index, dropAnchorSnap.index);
                  const indexSlack = Math.max(5, Math.floor(polyline.length * 0.015));
                  const strictNearKm =
                    driverRouteDistKm < 30 ? 1.2 :
                    driverRouteDistKm < 100 ? 2 :
                    driverRouteDistKm < 250 ? 3 : 4;

                  const pickupNear = passengerPickupSnap.distance <= strictNearKm;
                  const dropNear = passengerDropSnap.distance <= strictNearKm;
                  const pickupInWindow =
                    passengerPickupSnap.index >= (minAnchorIndex - indexSlack) &&
                    passengerPickupSnap.index <= (maxAnchorIndex + indexSlack);
                  const dropInWindow =
                    passengerDropSnap.index >= (minAnchorIndex - indexSlack) &&
                    passengerDropSnap.index <= (maxAnchorIndex + indexSlack);
                  const strictOrder = passengerPickupSnap.index < passengerDropSnap.index;

                  if (!pickupNear || !dropNear || !pickupInWindow || !dropInWindow || !strictOrder) {
                    const strictReasons: string[] = [];
                    if (!pickupNear) strictReasons.push(`pickup not near route (${passengerPickupSnap.distance.toFixed(2)}km > ${strictNearKm}km)`);
                    if (!dropNear) strictReasons.push(`drop not near route (${passengerDropSnap.distance.toFixed(2)}km > ${strictNearKm}km)`);
                    if (!pickupInWindow) strictReasons.push(`pickup outside segment window [${minAnchorIndex}-${maxAnchorIndex}]`);
                    if (!dropInWindow) strictReasons.push(`drop outside segment window [${minAnchorIndex}-${maxAnchorIndex}]`);
                    if (!strictOrder) strictReasons.push(`polyline order invalid (${passengerPickupSnap.index} >= ${passengerDropSnap.index})`);
                    logger.info(
                      `[WAYPOINT-MATCH][STRICT] ${offer.offerId}: ❌ REJECTED — ${strictReasons.join(', ')}`
                    );
                    return { offer, match: false };
                  }
                }

                matchingConfidence = 0.9;
                logger.info(
                  `✅ MATCH: ${offer.offerId} (waypoint match, pickup near ${bestPickup.label} ${bestPickup.dist.toFixed(1)}km, drop near ${bestDrop.label} ${bestDrop.dist.toFixed(1)}km)`
                );
                (offer as any).matchingConfidence = matchingConfidence;
                return { offer, match: true };
              } else {
                const reasons: string[] = [];
                if (bestPickup.dist > waypointRadius) reasons.push(`pickup too far: ${bestPickup.dist.toFixed(1)}km > ${waypointRadius}km`);
                if (bestDrop.dist > waypointRadius) reasons.push(`drop too far: ${bestDrop.dist.toFixed(1)}km > ${waypointRadius}km`);
                if (bestPickup.order >= bestDrop.order) reasons.push(`wrong order: pickup(${bestPickup.order}) >= drop(${bestDrop.order})`);
                logger.info(`[WAYPOINT-MATCH] ${offer.offerId}: ❌ FAILED — ${reasons.join(', ')}`);
              }

              // For offers with waypoints, skip road-aware entirely (BlaBlaCar doesn't use road names)
              // Fall through to polyline as final fallback
            }

            // --- Strategy 2: Road-aware matching (ONLY for offers WITHOUT waypoints) ---
            let roadAwareAccepted = false;
            if (!hasWaypoints && offer.route.roadSegments && offer.route.roadSegments.length > 0) {
              try {
                const roadMatch = await roadMatchingService.validateRoadAwareMatch(
                  offer.route.roadSegments,
                  passengerFromLat,
                  passengerFromLng,
                  passengerToLat,
                  passengerToLng,
                  false
                );

                matchingConfidence = roadMatch.confidence;

                if (roadMatch.confidence >= 0.6 && roadMatch.isValid) {
                  logger.info(
                    `✅ MATCH: ${offer.offerId} (road-aware, confidence=${roadMatch.confidence.toFixed(2)})`
                  );
                  (offer as any).matchingConfidence = matchingConfidence;
                  roadAwareAccepted = true;
                  return { offer, match: true };
                }
              } catch (error) {
                logger.warn(`Road-aware matching error for ${offer.offerId}, falling through to polyline`);
              }
            }

            // --- Strategy 3: Polyline fallback ---
            if (!roadAwareAccepted) {
              const polylineMatch = isRouteOnPath(
                passengerFromLat,
                passengerFromLng,
                passengerToLat,
                passengerToLng,
                offer.route.polyline || []
              );

              if (polylineMatch) {
                matchingConfidence = matchingConfidence ?? 0.5;
                logger.info(`✅ MATCH: ${offer.offerId} (polyline fallback)`);
                (offer as any).matchingConfidence = matchingConfidence;
                return { offer, match: true };
              }
            }

            logger.info(`❌ NO MATCH: ${offer.offerId} (all strategies failed)`);
            return { offer, match: false };
          })
        );

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
  async cancelOffer(offerId: string, driverId: string): Promise<{ deleted: boolean }> {
    try {
      const offer = await PoolingOffer.findOne({ offerId });
      if (!offer) {
        throw new NotFoundError('Offer not found');
      }

      if (offer.driverId !== driverId) {
        throw new ConflictError('You do not have permission to cancel this offer');
      }

      if (offer.status === 'in_progress') {
        throw new ConflictError('Cannot cancel an offer that is currently in progress');
      }

      // Check for active bookings
      const activeBookings = await Booking.countDocuments({
        poolingOfferId: offerId,
        status: { $in: ['pending', 'confirmed', 'in_progress'] },
      });

      if (activeBookings > 0) {
        throw new ConflictError(
          `Cannot delete this offer — ${activeBookings} passenger(s) have active bookings. Cancel their bookings first or complete the trip.`
        );
      }

      // No active bookings — safe to fully delete
      await PoolingOffer.deleteOne({ offerId });
      // Also clean up any old cancelled/completed bookings referencing this offer
      await Booking.updateMany(
        { poolingOfferId: offerId, status: { $in: ['cancelled', 'completed'] } },
        { $set: { status: 'cancelled' } }
      );

      logger.info(`Pooling offer deleted: ${offerId} (no active bookings)`);
      return { deleted: true };
    } catch (error) {
      logger.error('Error cancelling/deleting offer:', error);
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
  /**
   * Search for connected (multi-hop) rides when direct rides are unavailable.
   * Chains two pooling offers through a transfer point.
   */
  async searchConnectedOffers(filters: {
    fromLat: number;
    fromLng: number;
    toLat: number;
    toLng: number;
    date?: Date;
    time?: string;
    vehicleType?: 'car' | 'bike' | 'scooty';
    pinkOnly?: boolean;
  }): Promise<{
    direct: any[];
    connected: any[];
    totalDirect: number;
    totalConnected: number;
  }> {
    try {
      logger.info(`[CONNECTED-SEARCH] ========== searchConnectedOffers ==========`);
      logger.info(`[CONNECTED-SEARCH] from=(${filters.fromLat}, ${filters.fromLng}), to=(${filters.toLat}, ${filters.toLng})`);

      // 1. Run direct search first
      const directResult = await this.searchOffers({
        fromLat: filters.fromLat,
        fromLng: filters.fromLng,
        toLat: filters.toLat,
        toLng: filters.toLng,
        date: filters.date,
        time: filters.time,
        vehicleType: filters.vehicleType,
        pinkOnly: filters.pinkOnly,
        limit: 20,
      });

      // If plenty of direct results, skip connected search
      if (directResult.offers.length >= 3) {
        logger.info(`[CONNECTED-SEARCH] ${directResult.offers.length} direct offers found, skipping connected search`);
        return {
          direct: directResult.offers,
          connected: [],
          totalDirect: directResult.total,
          totalConnected: 0,
        };
      }

      // 2. Build date query for candidate offers
      const dateQuery: any = {};
      if (filters.date) {
        const dateVal = new Date(filters.date);
        if (!isNaN(dateVal.getTime())) {
          const dateStart = new Date(dateVal);
          dateStart.setUTCHours(0, 0, 0, 0);
          const dateEnd = new Date(dateVal);
          dateEnd.setUTCHours(23, 59, 59, 999);
          dateQuery.date = { $gte: dateStart, $lt: dateEnd };
        }
      } else {
        const now = new Date();
        now.setUTCHours(0, 0, 0, 0);
        dateQuery.date = { $gte: now };
      }

      const baseQuery: any = {
        status: { $in: ['active', 'pending'] },
        availableSeats: { $gt: 0 },
        ...dateQuery,
      };

      if (filters.vehicleType) {
        baseQuery['vehicle.type'] = filters.vehicleType.toLowerCase();
      }
      if (filters.pinkOnly) {
        baseQuery.isPinkPooling = true;
      }

      // #region agent log
      fetch('http://127.0.0.1:7775/ingest/9bdd2fd3-ac77-45be-b342-a40ab02f34f7',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'cb7cf5'},body:JSON.stringify({sessionId:'cb7cf5',location:'pooling.service.ts:connSearch-dateQuery',message:'Connected search date query + base query',data:{dateQuery,baseQuery,filtersDate:filters.date},timestamp:Date.now()})}).catch(()=>{});
      // #endregion

      // 3. Find ALL active offers for this date range
      const allOffers = await PoolingOffer.find(baseQuery).lean();
      logger.info(`[CONNECTED-SEARCH] Total active offers in date range: ${allOffers.length}`);

      if (allOffers.length < 2) {
        return {
          direct: directResult.offers,
          connected: [],
          totalDirect: directResult.total,
          totalConnected: 0,
        };
      }

      const ROUTE_PROXIMITY_KM = 5;
      const TRANSFER_RADIUS_KM = 10;

      // Compute accurate route distance from polyline when route.distance is missing
      const getAccurateRouteKm = (offer: any): number => {
        if (offer.route.distance && offer.route.distance > 0) return offer.route.distance;
        if (offer.route.polyline?.length > 1) {
          let totalKm = 0;
          const pts = offer.route.polyline;
          const step = Math.max(1, Math.floor(pts.length / 500));
          for (let i = step; i < pts.length; i += step) {
            totalKm += calculateDistance(pts[i - step].lat, pts[i - step].lng, pts[i].lat, pts[i].lng);
          }
          // Add last segment
          const last = pts[pts.length - 1];
          const prevIdx = Math.floor((pts.length - 1) / step) * step;
          if (prevIdx < pts.length - 1) {
            totalKm += calculateDistance(pts[prevIdx].lat, pts[prevIdx].lng, last.lat, last.lng);
          }
          return totalKm;
        }
        return calculateDistance(
          offer.route.from.lat, offer.route.from.lng,
          offer.route.to.lat, offer.route.to.lng
        ) * 1.3;
      };

      // Helper: find minimum distance from a point to any polyline point or route key points
      const minDistToRoutePolyline = (lat: number, lng: number, offer: any): number => {
        let minDist = Infinity;

        // Check from/to
        const dFrom = calculateDistance(lat, lng, offer.route.from.lat, offer.route.from.lng);
        if (dFrom < minDist) minDist = dFrom;
        const dTo = calculateDistance(lat, lng, offer.route.to.lat, offer.route.to.lng);
        if (dTo < minDist) minDist = dTo;

        // Check waypoints
        if (offer.route.waypoints?.length) {
          for (const wp of offer.route.waypoints) {
            const d = calculateDistance(lat, lng, wp.lat, wp.lng);
            if (d < minDist) minDist = d;
          }
        }

        // Check polyline (sample every 10th point for performance on long polylines)
        if (offer.route.polyline?.length) {
          const step = Math.max(1, Math.floor(offer.route.polyline.length / 200));
          for (let i = 0; i < offer.route.polyline.length; i += step) {
            const p = offer.route.polyline[i];
            const d = calculateDistance(lat, lng, p.lat, p.lng);
            if (d < minDist) minDist = d;
          }
          // Always check the last point
          const last = offer.route.polyline[offer.route.polyline.length - 1];
          const dLast = calculateDistance(lat, lng, last.lat, last.lng);
          if (dLast < minDist) minDist = dLast;
        }

        return minDist;
      };

      // Dynamic radius: for long routes use larger radius, min 10km, max 50km
      const getDynamicRadius = (offer: any): number => {
        const routeKm = getAccurateRouteKm(offer);
        const radius = Math.max(10, Math.min(50, routeKm * 0.2));
        return radius;
      };

      // #region agent log
      for (const o of allOffers) {
        const dFrom = minDistToRoutePolyline(filters.fromLat, filters.fromLng, o);
        const dynRadius = getDynamicRadius(o);
        logger.info(`[CONNECTED-SEARCH]   ${o.offerId}: ${o.route.from.city||o.route.from.address} → ${o.route.to.city||o.route.to.address}, accurateKm=${getAccurateRouteKm(o).toFixed(0)}, distFromPassengerFrom=${dFrom.toFixed(1)}km, dynRadius=${dynRadius.toFixed(1)}km`);
      }
      // #endregion

      // 4. Find Leg 1 candidates: passenger FROM is near the offer's route (polyline-based)
      const leg1Candidates = allOffers.filter((offer) => {
        const minDist = minDistToRoutePolyline(filters.fromLat, filters.fromLng, offer);
        const radius = getDynamicRadius(offer);
        return minDist <= radius;
      });

      logger.info(`[CONNECTED-SEARCH] Leg 1 candidates (polyline proximity): ${leg1Candidates.length}`);

      const connected: any[] = [];

      const AVG_SPEED_KMH = 65;

      for (const leg1 of leg1Candidates) {
        // Transfer point = Leg 1 DESTINATION (where the driver actually stops)
        const transferLat = leg1.route.to.lat;
        const transferLng = leg1.route.to.lng;

        // Skip if transfer point is already the passenger's final destination
        const transferToDestDist = calculateDistance(transferLat, transferLng, filters.toLat, filters.toLng);
        if (transferToDestDist < 10) {
          logger.info(`[CONNECTED-SEARCH] Skip Leg1=${leg1.offerId} (${leg1.route.from.city}→${leg1.route.to.city}): transfer=destination (${transferToDestDist.toFixed(1)}km)`);
          continue;
        }

        // Skip if leg1 is circular (source near destination)
        const leg1SrcToDestDist = calculateDistance(
          leg1.route.from.lat, leg1.route.from.lng, transferLat, transferLng
        );
        if (leg1SrcToDestDist < 5) continue;

        // 5. Find Leg 2: transfer point near Leg 2's route AND passenger destination near Leg 2's route
        const leg2Candidates = allOffers.filter((offer) => {
          if (offer.offerId === leg1.offerId) return false;

          const transferDist = minDistToRoutePolyline(transferLat, transferLng, offer);
          if (transferDist > TRANSFER_RADIUS_KM) return false;

          const dropDist = minDistToRoutePolyline(filters.toLat, filters.toLng, offer);
          const radius = getDynamicRadius(offer);
          return dropDist <= radius;
        });

        logger.info(`[CONNECTED-SEARCH] Leg1=${leg1.offerId} (${leg1.route.from.city}→${leg1.route.to.city}), transfer=${leg1.route.to.city||leg1.route.to.address}, Leg2 candidates: ${leg2Candidates.length}`);

        if (leg2Candidates.length === 0) continue;

        // 6. Time compatibility
        const leg1DepartMinutes = this.parseTimeToMinutes(leg1.time);
        if (leg1DepartMinutes === null) continue;

        const leg1RouteKm = getAccurateRouteKm(leg1);
        const leg1RouteDuration = Math.round((leg1RouteKm / AVG_SPEED_KMH) * 60);
        const leg1ArrivalMinutes = leg1DepartMinutes + leg1RouteDuration;

        // #region agent log
        logger.info(`[CONNECTED-SEARCH] Leg1 ${leg1.offerId}: routeKm=${leg1RouteKm.toFixed(0)}, duration=${leg1RouteDuration}min, depart=${leg1DepartMinutes}min, arrive=${leg1ArrivalMinutes}min at ${leg1.route.to.city}`);
        // #endregion

        for (const leg2 of leg2Candidates) {
          const leg2DepartMinutes = this.parseTimeToMinutes(leg2.time);
          if (leg2DepartMinutes === null) continue;

          const gapMinutes = leg2DepartMinutes - leg1ArrivalMinutes;

          // #region agent log
          logger.info(`[CONNECTED-SEARCH] Time: leg1 arrive=${leg1ArrivalMinutes}min at ${leg1.route.to.city}, leg2=${leg2.offerId} depart=${leg2DepartMinutes}min, gap=${gapMinutes}min`);
          // #endregion

          if (gapMinutes < -60 || gapMinutes > 300) continue;

          const leg2RouteKm = getAccurateRouteKm(leg2);
          const leg2RouteDuration = Math.round((leg2RouteKm / AVG_SPEED_KMH) * 60);
          const leg2ArrivalMinutes = leg2DepartMinutes + leg2RouteDuration;
          const totalDurationMinutes = leg2ArrivalMinutes - leg1DepartMinutes;

          const BASE_RATES: Record<string, number> = { car: 8, bike: 5, scooty: 4 };
          const PLATFORM_FEE_RATE = 0.10;
          const leg1VType = (leg1.vehicle?.type || 'car').toLowerCase();
          const leg2VType = (leg2.vehicle?.type || 'car').toLowerCase();
          const leg1Dist = calculateDistance(leg1.route.from.lat, leg1.route.from.lng, leg1.route.to.lat, leg1.route.to.lng);
          const leg2Dist = calculateDistance(leg2.route.from.lat, leg2.route.from.lng, leg2.route.to.lat, leg2.route.to.lng);
          const leg1Base = Math.round(leg1Dist * (BASE_RATES[leg1VType] || 5));
          const leg2Base = Math.round(leg2Dist * (BASE_RATES[leg2VType] || 5));
          const leg1Fee = Math.max(Math.round(leg1Base * PLATFORM_FEE_RATE), 5);
          const leg2Fee = Math.max(Math.round(leg2Base * PLATFORM_FEE_RATE), 5);
          const leg1Price = leg1Base + leg1Fee;
          const leg2Price = leg2Base + leg2Fee;
          const totalPrice = leg1Price + leg2Price;

          const formatTime = (mins: number): string => {
            const h = Math.floor(mins / 60) % 24;
            const m = mins % 60;
            const ampm = h >= 12 ? 'PM' : 'AM';
            const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
            return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
          };

          const formatDuration = (mins: number): string => {
            const h = Math.floor(mins / 60);
            const m = mins % 60;
            if (h === 0) return `${m} min`;
            if (m === 0) return `${h} hr`;
            return `${h} hr ${m} min`;
          };

          connected.push({
            type: 'connected',
            totalLegs: 2,
            totalPrice,
            totalDuration: formatDuration(totalDurationMinutes),
            totalDurationMinutes,
            transferPoint: {
              address: leg1.route.to.address || 'Transfer Point',
              lat: transferLat,
              lng: transferLng,
              city: leg1.route.to.city || '',
            },
            waitTime: formatDuration(Math.max(0, gapMinutes)),
            waitTimeMinutes: Math.max(0, gapMinutes),
            legs: [
              {
                legNumber: 1,
                offer: leg1,
                from: leg1.route.from,
                to: leg1.route.to,
                departureTime: leg1.time,
                arrivalTime: formatTime(leg1ArrivalMinutes),
                duration: formatDuration(leg1RouteDuration),
                durationMinutes: leg1RouteDuration,
                price: leg1Price,
              },
              {
                legNumber: 2,
                offer: leg2,
                from: leg2.route.from,
                to: leg2.route.to,
                departureTime: leg2.time,
                arrivalTime: formatTime(leg2ArrivalMinutes),
                duration: formatDuration(leg2RouteDuration),
                durationMinutes: leg2RouteDuration,
                price: leg2Price,
              },
            ],
          });
        }
      }

      connected.sort((a, b) => {
        if (a.totalDurationMinutes !== b.totalDurationMinutes) {
          return a.totalDurationMinutes - b.totalDurationMinutes;
        }
        return a.totalPrice - b.totalPrice;
      });

      const topConnected = connected.slice(0, 5);
      logger.info(`[CONNECTED-SEARCH] Found ${connected.length} connected rides, returning top ${topConnected.length}`);

      return {
        direct: directResult.offers,
        connected: topConnected,
        totalDirect: directResult.total,
        totalConnected: topConnected.length,
      };
    } catch (error) {
      logger.error('[CONNECTED-SEARCH] Error:', error);
      throw error;
    }
  }
}

export const poolingService = new PoolingService();
export default poolingService;
