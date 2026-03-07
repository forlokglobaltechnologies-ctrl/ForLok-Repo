import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { poolingService } from '../../services/pooling.service';
import { priceCalculationService } from '../../services/price-calculation.service';
import { authenticate } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validation.middleware';
import { z } from 'zod';
import { ApiResponse } from '../../types';

// Request schemasF
const createOfferSchema = z.object({
  route: z.object({
    from: z.object({
      address: z.string(),
      lat: z.number(),
      lng: z.number(),
      city: z.string().optional(),
      state: z.string().optional(),
    }),
    to: z.object({
      address: z.string(),
      lat: z.number(),
      lng: z.number(),
      city: z.string().optional(),
      state: z.string().optional(),
    }),
    waypoints: z.array(z.object({
      address: z.string(),
      lat: z.number(),
      lng: z.number(),
      city: z.string().optional(),
      order: z.number().int().min(0),
    })).max(120).optional(),
    selectedRouteId: z.string().optional(),
    selectedPolyline: z.array(
      z.object({
        lat: z.number(),
        lng: z.number(),
        index: z.number().int().min(0),
      })
    ).optional(),
    distance: z.number().optional(),
    duration: z.number().optional(),
  }),
  date: z.string().datetime(),
  time: z.string(),
  vehicleId: z.string(),
  availableSeats: z.number().min(1),
  price: z.number().min(0).optional(),
  notes: z.string().optional(),
});

const updateOfferSchema = z.object({
  route: z.object({
    from: z.object({
      address: z.string(),
      lat: z.number(),
      lng: z.number(),
      city: z.string().optional(),
      state: z.string().optional(),
    }),
    to: z.object({
      address: z.string(),
      lat: z.number(),
      lng: z.number(),
      city: z.string().optional(),
      state: z.string().optional(),
    }),
    waypoints: z.array(z.object({
      address: z.string(),
      lat: z.number(),
      lng: z.number(),
      city: z.string().optional(),
      order: z.number().int().min(0),
    })).max(120).optional(),
    selectedRouteId: z.string().optional(),
    selectedPolyline: z.array(
      z.object({
        lat: z.number(),
        lng: z.number(),
        index: z.number().int().min(0),
      })
    ).optional(),
    distance: z.number().optional(),
    duration: z.number().optional(),
  }).optional(),
  date: z.string().datetime().optional(),
  time: z.string().optional(),
  availableSeats: z.number().min(0).optional(),
  price: z.number().min(0).optional(),
  notes: z.string().optional(),
  status: z.enum(['active', 'pending', 'expired', 'completed', 'cancelled', 'suspended']).optional(),
});

const validateWaypointSchema = z.object({
  fromLat: z.number(),
  fromLng: z.number(),
  toLat: z.number(),
  toLng: z.number(),
  waypointLat: z.number(),
  waypointLng: z.number(),
  existingWaypoints: z.array(z.object({
    lat: z.number(),
    lng: z.number(),
  })).optional().default([]),
});

const suggestWaypointsFromPolylineSchema = z.object({
  selectedPolyline: z.array(
    z.object({
      lat: z.number(),
      lng: z.number(),
      index: z.number().int().min(0),
    })
  ).min(2),
  intervalKm: z.number().min(2).max(30).optional(),
  maxPoints: z.number().int().min(3).max(120).optional(),
});

export async function poolingRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/pooling/routes/alternatives
   * Get alternative routes for from/to coordinates
   */
  fastify.get(
    '/routes/alternatives',
    {
      preHandler: [authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { fromLat, fromLng, toLat, toLng, maxAlternatives } = request.query as {
        fromLat: string;
        fromLng: string;
        toLat: string;
        toLng: string;
        maxAlternatives?: string;
      };

      const fLat = parseFloat(fromLat);
      const fLng = parseFloat(fromLng);
      const tLat = parseFloat(toLat);
      const tLng = parseFloat(toLng);
      const requestedAlternatives = Number.isFinite(Number(maxAlternatives))
        ? Math.max(2, Math.min(parseInt(maxAlternatives as string, 10), 8))
        : 5;

      if ([fLat, fLng, tLat, tLng].some((v) => !Number.isFinite(v))) {
        return reply.status(400).send({
          success: false,
          message: 'Invalid coordinates. Provide fromLat, fromLng, toLat, toLng as numbers.',
        });
      }

      const { getRouteAlternatives } = await import('../../utils/maps');
      const routes = await getRouteAlternatives(fLat, fLng, tLat, tLng, requestedAlternatives);

      const resp: ApiResponse = {
        success: true,
        message: 'Route alternatives generated',
        data: { routes },
      };

      return reply.status(200).send(resp);
    }
  );

  /**
   * POST /api/pooling/offers
   * Create pooling offer (authenticated)
   */
  fastify.post(
    '/offers',
    {
      preHandler: [authenticate, validate(createOfferSchema)],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const driverId = (request as any).user.userId;
      const data = request.body as any;

      // Verify gender if creating Pink Pooling offer
      if (data.isPinkPooling === true) {
        const User = (await import('../../models/User')).default;
        const driver = await User.findOne({ userId: driverId });
        if (!driver || driver.gender !== 'Female') {
          const response: ApiResponse = {
            success: false,
            message: 'Pink Pooling is only available for women and girls',
            error: 'GENDER_RESTRICTION',
          };
          return reply.status(403).send(response);
        }
      }

      // Convert date string to Date
      if (data.date) {
        data.date = new Date(data.date);
      }

      const offer = await poolingService.createOffer({
        driverId,
        ...data,
      });

      const response: ApiResponse = {
        success: true,
        message: 'Pooling offer created successfully',
        data: offer,
      };

      return reply.status(201).send(response);
    }
  );

  /**
   * GET /api/pooling/offers
   * Get user's pooling offers (authenticated)
   */
  fastify.get(
    '/offers',
    {
      preHandler: [authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).user.userId;

      const offers = await poolingService.getUserOffers(userId);

      const response: ApiResponse = {
        success: true,
        message: 'Offers retrieved successfully',
        data: offers,
      };

      return reply.status(200).send(response);
    }
  );

  /**
   * GET /api/pooling/offers/:offerId
   * Get offer details
   */
  fastify.get(
    '/offers/:offerId',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { offerId } = request.params as { offerId: string };

      const offer = await poolingService.getOfferById(offerId);

      const response: ApiResponse = {
        success: true,
        message: 'Offer retrieved successfully',
        data: offer,
      };

      return reply.status(200).send(response);
    }
  );

  /**
   * GET /api/pooling/offers/search
   * Search pooling offers
   */
  fastify.get(
    '/offers/search',
    {
      preHandler: [validate(z.object({}))],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const query = request.query as any;

      const filters: any = {};
      if (query.fromLat) filters.fromLat = parseFloat(query.fromLat);
      if (query.fromLng) filters.fromLng = parseFloat(query.fromLng);
      if (query.toLat) filters.toLat = parseFloat(query.toLat);
      if (query.toLng) filters.toLng = parseFloat(query.toLng);
      if (query.date) filters.date = new Date(query.date);
      if (query.time) filters.time = query.time as string; // e.g. "9:00 AM"
      if (query.vehicleType) filters.vehicleType = query.vehicleType;
      if (query.minPrice) filters.minPrice = parseFloat(query.minPrice);
      if (query.maxPrice) filters.maxPrice = parseFloat(query.maxPrice);
      if (query.maxDistance) filters.maxDistance = parseFloat(query.maxDistance);
      if (query.page) filters.page = parseInt(query.page);
      if (query.limit) filters.limit = parseInt(query.limit);
      if (query.pinkOnly === 'true' || query.pinkOnly === true) {
        filters.pinkOnly = true;
      }

      const result = await poolingService.searchOffers(filters);

      const response: ApiResponse = {
        success: true,
        message: 'Offers retrieved successfully',
        data: result,
      };

      return reply.status(200).send(response);
    }
  );

  /**
   * GET /api/pooling/offers/connected-search
   * Search for direct + connected (multi-hop) pooling offers
   */
  fastify.get(
    '/offers/connected-search',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const query = request.query as any;

      const fromLat = parseFloat(query.fromLat);
      const fromLng = parseFloat(query.fromLng);
      const toLat = parseFloat(query.toLat);
      const toLng = parseFloat(query.toLng);

      if (isNaN(fromLat) || isNaN(fromLng) || isNaN(toLat) || isNaN(toLng)) {
        return reply.status(400).send({
          success: false,
          message: 'fromLat, fromLng, toLat, toLng are required',
        });
      }

      const filters: any = { fromLat, fromLng, toLat, toLng };
      if (query.date) filters.date = new Date(query.date);
      if (query.time) filters.time = query.time as string;
      if (query.vehicleType) filters.vehicleType = query.vehicleType;
      if (query.pinkOnly === 'true' || query.pinkOnly === true) {
        filters.pinkOnly = true;
      }

      const result = await poolingService.searchConnectedOffers(filters);

      const response: ApiResponse = {
        success: true,
        message: 'Connected search completed',
        data: result,
      };

      return reply.status(200).send(response);
    }
  );

  /**
   * GET /api/pooling/offers/nearby
   * Get nearby pooling offers
   */
  fastify.get(
    '/offers/nearby',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { lat, lng, radius } = request.query as {
        lat: string;
        lng: string;
        radius?: string;
      };

      if (!lat || !lng) {
        return reply.status(400).send({
          success: false,
          message: 'Latitude and longitude are required',
          error: 'MISSING_COORDINATES',
        });
      }

      const offers = await poolingService.getNearbyOffers(
        parseFloat(lat),
        parseFloat(lng),
        radius ? parseFloat(radius) : 10
      );

      const response: ApiResponse = {
        success: true,
        message: 'Nearby offers retrieved successfully',
        data: offers,
      };

      return reply.status(200).send(response);
    }
  );

  /**
   * PUT /api/pooling/offers/:offerId
   * Update pooling offer (authenticated)
   */
  fastify.put(
    '/offers/:offerId',
    {
      preHandler: [authenticate, validate(updateOfferSchema)],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const driverId = (request as any).user.userId;
      const { offerId } = request.params as { offerId: string };
      const data = request.body as any;

      // Convert date string to Date if provided
      if (data.date) {
        data.date = new Date(data.date);
      }

      const offer = await poolingService.updateOffer(offerId, driverId, data);

      const response: ApiResponse = {
        success: true,
        message: 'Offer updated successfully',
        data: offer,
      };

      return reply.status(200).send(response);
    }
  );

  /**
   * DELETE /api/pooling/offers/:offerId
   * Cancel pooling offer (authenticated)
   */
  fastify.delete(
    '/offers/:offerId',
    {
      preHandler: [authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const driverId = (request as any).user.userId;
      const { offerId } = request.params as { offerId: string };

      const result = await poolingService.cancelOffer(offerId, driverId);

      const response: ApiResponse = {
        success: true,
        message: result.deleted ? 'Offer deleted successfully' : 'Offer cancelled successfully',
        data: result,
      };

      return reply.status(200).send(response);
    }
  );

  /**
   * POST /api/pooling/migrate-polylines
   * Generate polylines for existing offers that don't have one (migration endpoint)
   */
  fastify.post(
    '/migrate-polylines',
    {
      preHandler: [authenticate], // TODO: Add admin check middleware
    },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const result = await poolingService.migratePolylinesForExistingOffers();

      const response: ApiResponse = {
        success: true,
        message: `Polyline migration completed: ${result.updated} updated, ${result.failed} failed`,
        data: result,
      };

      return reply.status(200).send(response);
    }
  );

  /**
   * POST /api/pooling/calculate-price
   * Calculate dynamic price for passenger route (authenticated)
   */
  fastify.post(
    '/calculate-price',
    {
      preHandler: [
        authenticate,
        validate(
          z.object({
            offerId: z.string(),
            passengerRoute: z.object({
              from: z.object({
                address: z.string(),
                lat: z.number(),
                lng: z.number(),
                city: z.string().optional(),
                state: z.string().optional(),
              }),
              to: z.object({
                address: z.string(),
                lat: z.number(),
                lng: z.number(),
                city: z.string().optional(),
                state: z.string().optional(),
              }),
            }),
          })
        ),
      ],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { offerId, passengerRoute } = request.body as {
        offerId: string;
        passengerRoute: any;
      };

      // Get offer to get vehicle type
      const offer = await poolingService.getOfferById(offerId);
      if (!offer) {
        return reply.status(404).send({
          success: false,
          message: 'Offer not found',
          error: 'OFFER_NOT_FOUND',
        });
      }

      const priceBreakdown = await priceCalculationService.calculatePrice({
        passengerRoute,
        offerId,
        vehicleType: offer.vehicle.type,
        offerDate: offer.date,
        offerTime: offer.time,
      });

      const response: ApiResponse = {
        success: true,
        message: 'Price calculated successfully',
        data: priceBreakdown,
      };

      return reply.status(200).send(response);
    }
  );

  /**
   * GET /api/pooling/suggest-waypoints
   * Returns suggested intermediate waypoints for a from/to pair
   */
  fastify.get(
    '/suggest-waypoints',
    {
      preHandler: [authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { fromLat, fromLng, toLat, toLng } = request.query as {
        fromLat: string;
        fromLng: string;
        toLat: string;
        toLng: string;
      };

      const fLat = parseFloat(fromLat);
      const fLng = parseFloat(fromLng);
      const tLat = parseFloat(toLat);
      const tLng = parseFloat(toLng);

      if ([fLat, fLng, tLat, tLng].some((v) => !Number.isFinite(v))) {
        return reply.status(400).send({
          success: false,
          message: 'Invalid coordinates. Provide fromLat, fromLng, toLat, toLng as numbers.',
        });
      }

      const { getRoutePolyline, generateAutoWaypoints, getMinWaypointCount } = await import('../../utils/maps');
      const { calculateDistance } = await import('../../utils/helpers');

      const polyline = await getRoutePolyline(fLat, fLng, tLat, tLng);
      const routeDistKm = calculateDistance(fLat, fLng, tLat, tLng);
      const minRequired = getMinWaypointCount(routeDistKm);
      const waypoints = await generateAutoWaypoints(polyline, routeDistKm);

      const resp: ApiResponse = {
        success: true,
        message: 'Suggested waypoints generated',
        data: {
          waypoints,
          routeDistanceKm: Math.round(routeDistKm),
          minRequired,
        },
      };

      return reply.status(200).send(resp);
    }
  );

  /**
   * POST /api/pooling/suggest-waypoints-from-polyline
   * Returns suggested intermediate waypoints for a selected route polyline
   */
  fastify.post(
    '/suggest-waypoints-from-polyline',
    {
      preHandler: [authenticate, validate(suggestWaypointsFromPolylineSchema)],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { selectedPolyline, intervalKm, maxPoints } = request.body as {
        selectedPolyline: Array<{ lat: number; lng: number; index: number }>;
        intervalKm?: number;
        maxPoints?: number;
      };

      const { calculatePolylineDistanceKm, generateRoutePlaceSuggestions, getMinWaypointCount } = await import('../../utils/maps');
      const routeDistKm = calculatePolylineDistanceKm(selectedPolyline);
      const minRequired = getMinWaypointCount(routeDistKm);
      const waypoints = await generateRoutePlaceSuggestions(
        selectedPolyline,
        intervalKm ?? 8,
        maxPoints ?? 80
      );

      const resp: ApiResponse = {
        success: true,
        message: 'Suggested waypoints generated from selected route',
        data: {
          waypoints,
          routeDistanceKm: Math.round(routeDistKm),
          minRequired,
        },
      };

      return reply.status(200).send(resp);
    }
  );

  /**
   * POST /api/pooling/validate-waypoint
   * Chained validation:
   * - waypoint1 validated on source -> destination leg
   * - waypoint2 validated on waypoint1 -> destination leg
   * - ...
   */
  fastify.post(
    '/validate-waypoint',
    {
      preHandler: [authenticate, validate(validateWaypointSchema)],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { fromLat, fromLng, toLat, toLng, waypointLat, waypointLng, existingWaypoints = [] } = request.body as {
        fromLat: number;
        fromLng: number;
        toLat: number;
        toLng: number;
        waypointLat: number;
        waypointLng: number;
        existingWaypoints?: Array<{ lat: number; lng: number }>;
      };

      const { getRoutePolyline, validateWaypointOnRoute, getMinWaypointCount } = await import('../../utils/maps');
      const { calculateDistance } = await import('../../utils/helpers');

      const routeDistKm = calculateDistance(fromLat, fromLng, toLat, toLng);
      const minRequired = getMinWaypointCount(routeDistKm);
      const legStart = existingWaypoints.length > 0
        ? existingWaypoints[existingWaypoints.length - 1]
        : { lat: fromLat, lng: fromLng };

      const legPolyline = await getRoutePolyline(legStart.lat, legStart.lng, toLat, toLng);
      const validation = validateWaypointOnRoute(waypointLat, waypointLng, legPolyline);

      const resp: ApiResponse = {
        success: true,
        message: validation.valid ? 'Waypoint is valid on current leg' : 'Waypoint is invalid for current leg',
        data: {
          isValid: validation.valid,
          reason: validation.reason || null,
          nearestDistanceKm: Number.isFinite(validation.distanceKm) ? Number(validation.distanceKm.toFixed(2)) : null,
          routeDistanceKm: Math.round(routeDistKm),
          legFrom: { lat: legStart.lat, lng: legStart.lng },
          minRequired,
        },
      };

      return reply.status(200).send(resp);
    }
  );
}
