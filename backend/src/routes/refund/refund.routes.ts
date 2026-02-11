import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { refundService } from '../../services/refund.service';
import { authenticate } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validation.middleware';

// Schemas
const calculateRefundSchema = z.object({
  params: z.object({
    bookingId: z.string().min(1),
  }),
});

const refundHistorySchema = z.object({
  querystring: z.object({
    page: z.string().optional().transform((v) => (v ? parseInt(v) : 1)),
    limit: z.string().optional().transform((v) => (v ? parseInt(v) : 20)),
  }),
});

export const refundRoutes: FastifyPluginAsync = async (app) => {
  /**
   * GET /api/refunds/policy
   * Get cancellation policy
   */
  app.get('/policy', async (_request, reply) => {
    const policy = refundService.getCancellationPolicy();
    return reply.send({
      success: true,
      data: policy,
    });
  });

  /**
   * GET /api/refunds/calculate/:bookingId
   * Calculate cancellation fee for a booking (preview before cancellation)
   */
  app.get(
    '/calculate/:bookingId',
    {
      preHandler: [authenticate, validate(calculateRefundSchema)],
    },
    async (request, reply) => {
      try {
        const userId = (request as any).user.userId;
        const { bookingId } = request.params as { bookingId: string };

        // Calculate cancellation fee assuming user is cancelling
        const calculation = await refundService.calculateCancellation(bookingId, 'user', userId);

        return reply.send({
          success: true,
          data: calculation,
        });
      } catch (error: any) {
        return reply.status(error.statusCode || 500).send({
          success: false,
          error: error.message,
        });
      }
    }
  );

  /**
   * GET /api/refunds/booking/:bookingId
   * Get refund/cancellation details for a booking
   */
  app.get(
    '/booking/:bookingId',
    {
      preHandler: [authenticate, validate(calculateRefundSchema)],
    },
    async (request, reply) => {
      try {
        const { bookingId } = request.params as { bookingId: string };
        const refund = await refundService.getRefundByBookingId(bookingId);

        if (!refund) {
          return reply.status(404).send({
            success: false,
            error: 'No cancellation record found for this booking',
          });
        }

        return reply.send({
          success: true,
          data: refund,
        });
      } catch (error: any) {
        return reply.status(error.statusCode || 500).send({
          success: false,
          error: error.message,
        });
      }
    }
  );

  /**
   * GET /api/refunds/history
   * Get user's cancellation/refund history
   */
  app.get(
    '/history',
    {
      preHandler: [authenticate, validate(refundHistorySchema)],
    },
    async (request, reply) => {
      try {
        const userId = (request as any).user.userId;
        const { page, limit } = request.query as { page: number; limit: number };

        const result = await refundService.getUserRefunds(userId, { page, limit });

        return reply.send({
          success: true,
          data: result,
        });
      } catch (error: any) {
        return reply.status(error.statusCode || 500).send({
          success: false,
          error: error.message,
        });
      }
    }
  );
};

export default refundRoutes;
