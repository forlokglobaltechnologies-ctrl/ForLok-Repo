import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth.middleware';
import { sosService } from '../../services/sos.service';

const triggerSOSSchema = z.object({
  location: z.object({
    lat: z.number(),
    lng: z.number(),
    address: z.string().optional(),
  }),
  bookingId: z.string().optional(),
});

export async function sosRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/sos/trigger
   * Trigger an SOS emergency alert
   */
  fastify.post(
    '/trigger',
    {
      preHandler: [authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = (request as any).user.userId;
        const body = triggerSOSSchema.parse(request.body);

        const result = await sosService.triggerSOS({
          userId,
          location: body.location,
          bookingId: body.bookingId,
        });

        return reply.status(200).send({
          success: true,
          message: result.message,
          data: {
            sosId: result.sosId,
            emailSent: result.emailSent,
          },
        });
      } catch (error: any) {
        return reply.status(500).send({
          success: false,
          message: error.message || 'Failed to trigger SOS alert',
        });
      }
    }
  );

  /**
   * GET /api/sos/history
   * Get user's SOS history
   */
  fastify.get(
    '/history',
    {
      preHandler: [authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = (request as any).user.userId;
        const query = request.query as { page?: string; limit?: string };
        const page = parseInt(query.page || '1', 10);
        const limit = parseInt(query.limit || '20', 10);

        const result = await sosService.getHistory(userId, page, limit);

        return reply.status(200).send({
          success: true,
          message: 'SOS history fetched',
          data: result,
        });
      } catch (error: any) {
        return reply.status(500).send({
          success: false,
          message: error.message || 'Failed to fetch SOS history',
        });
      }
    }
  );
}
