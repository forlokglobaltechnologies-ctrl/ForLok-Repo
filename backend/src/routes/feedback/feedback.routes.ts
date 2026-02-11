import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { feedbackService } from '../../services/feedback.service';
import { authenticate } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validation.middleware';
import { z } from 'zod';
import { ApiResponse } from '../../types';

// Request schemas
const submitFeedbackSchema = z.object({
  type: z.enum(['issue', 'suggestion', 'complaint']),
  subject: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  priority: z.enum(['high', 'medium', 'low']).optional(),
});

export async function feedbackRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/feedback
   * Submit feedback (authenticated)
   */
  fastify.post(
    '/',
    {
      preHandler: [authenticate, validate(submitFeedbackSchema)],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).user.userId;
      const data = request.body as any;

      const feedback = await feedbackService.submitFeedback({
        userId,
        ...data,
      });

      const response: ApiResponse = {
        success: true,
        message: 'Feedback submitted successfully',
        data: feedback,
      };

      return reply.status(201).send(response);
    }
  );

  /**
   * GET /api/feedback/my-feedback
   * Get user feedback (authenticated)
   */
  fastify.get(
    '/my-feedback',
    {
      preHandler: [authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).user.userId;
      const query = request.query as {
        status?: string;
        type?: string;
        page?: string;
        limit?: string;
      };

      const filters: any = {};
      if (query.status) filters.status = query.status;
      if (query.type) filters.type = query.type;
      if (query.page) filters.page = parseInt(query.page);
      if (query.limit) filters.limit = parseInt(query.limit);

      const result = await feedbackService.getUserFeedback(userId, filters);

      const response: ApiResponse = {
        success: true,
        message: 'Feedback retrieved successfully',
        data: result,
      };

      return reply.status(200).send(response);
    }
  );

  /**
   * GET /api/feedback/:feedbackId
   * Get feedback details (authenticated)
   */
  fastify.get(
    '/:feedbackId',
    {
      preHandler: [authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).user.userId;
      const { feedbackId } = request.params as { feedbackId: string };

      const feedback = await feedbackService.getFeedbackById(feedbackId, userId);

      const response: ApiResponse = {
        success: true,
        message: 'Feedback retrieved successfully',
        data: feedback,
      };

      return reply.status(200).send(response);
    }
  );
}
