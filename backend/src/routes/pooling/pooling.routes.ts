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
    distance: z.number().optional(),
    duration: z.number().optional(),
  }),
  date: z.string().datetime(),
  time: z.string(),
  vehicleId: z.string(),
  availableSeats: z.number().min(1),
  price: z.number().min(0).optional(), // Optional: Legacy field, not used for dynamic pricing
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

export async function poolingRoutes(fastify: FastifyInstance) {
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

      await poolingService.cancelOffer(offerId, driverId);

      const response: ApiResponse = {
        success: true,
        message: 'Offer cancelled successfully',
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
}
