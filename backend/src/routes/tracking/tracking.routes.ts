import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { trackingService } from '../../services/tracking.service';
import { authenticate } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validation.middleware';
import { z } from 'zod';
import { ApiResponse } from '../../types';

// Request schemas
const updateLocationSchema = z.object({
  bookingId: z.string(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  heading: z.number().min(0).max(360).optional(),
  speed: z.number().min(0).optional(),
  accuracy: z.number().min(0).optional(),
});

export async function trackingRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/tracking/update-location
   * Update driver location (authenticated - driver only)
   */
  fastify.post(
    '/update-location',
    {
      preHandler: [authenticate, validate(updateLocationSchema)],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const driverId = (request as any).user.userId;
      const data = request.body as {
        bookingId: string;
        lat: number;
        lng: number;
        heading?: number;
        speed?: number;
        accuracy?: number;
      };

      const location = await trackingService.updateDriverLocation({
        driverId,
        ...data,
      });

      const response: ApiResponse = {
        success: true,
        message: 'Location updated successfully',
        data: location,
      };

      return reply.status(200).send(response);
    }
  );

  /**
   * GET /api/tracking/driver-location/:bookingId
   * Get latest driver location (authenticated)
   */
  fastify.get(
    '/driver-location/:bookingId',
    {
      preHandler: [authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).user.userId;
      const { bookingId } = request.params as { bookingId: string };

      const location = await trackingService.getDriverLocation(bookingId, userId);

      if (!location) {
        const response: ApiResponse = {
          success: false,
          message: 'No location data available',
          data: null,
        };
        return reply.status(404).send(response);
      }

      const response: ApiResponse = {
        success: true,
        message: 'Location retrieved successfully',
        data: location,
      };

      return reply.status(200).send(response);
    }
  );

  /**
   * GET /api/tracking/location-history/:bookingId
   * Get location history for a booking (authenticated)
   */
  fastify.get(
    '/location-history/:bookingId',
    {
      preHandler: [authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).user.userId;
      const { bookingId } = request.params as { bookingId: string };
      const query = request.query as { limit?: string };

      const limit = query.limit ? parseInt(query.limit) : 50;

      const locations = await trackingService.getLocationHistory(bookingId, userId, limit);

      const response: ApiResponse = {
        success: true,
        message: 'Location history retrieved successfully',
        data: locations,
      };

      return reply.status(200).send(response);
    }
  );

  /**
   * GET /api/tracking/trip-metrics/:bookingId
   * Get trip metrics (ETA, distance) (authenticated)
   */
  fastify.get(
    '/trip-metrics/:bookingId',
    {
      preHandler: [authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { bookingId } = request.params as { bookingId: string };

      const metrics = await trackingService.calculateTripMetrics(bookingId);

      const response: ApiResponse = {
        success: true,
        message: 'Trip metrics retrieved successfully',
        data: metrics,
      };

      return reply.status(200).send(response);
    }
  );
}
