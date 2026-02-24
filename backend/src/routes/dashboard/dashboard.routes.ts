import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { dashboardService } from '../../services/dashboard.service';
import { authenticate } from '../../middleware/auth.middleware';
import { ApiResponse } from '../../types';

export async function dashboardRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/dashboard/stats
   * Get dashboard statistics (authenticated)
   */
  fastify.get(
    '/stats',
    {
      preHandler: [authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).user.userId;

      const stats = await dashboardService.getDashboardStats(userId);

      const response: ApiResponse = {
        success: true,
        message: 'Dashboard stats retrieved successfully',
        data: stats,
      };

      return reply.status(200).send(response);
    }
  );

  /**
   * GET /api/dashboard/financial
   * Get financial summary (authenticated)
   */
  fastify.get(
    '/financial',
    {
      preHandler: [authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).user.userId;

      const financial = await dashboardService.getFinancialSummary(userId);

      const response: ApiResponse = {
        success: true,
        message: 'Financial summary retrieved successfully',
        data: financial,
      };

      return reply.status(200).send(response);
    }
  );

  /**
   * GET /api/dashboard/home
   * Single endpoint for the home screen — returns everything in one call
   */
  fastify.get(
    '/home',
    {
      preHandler: [authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).user.userId;
      const { lat, lng } = request.query as { lat?: string; lng?: string };

      const data = await dashboardService.getHomeScreenData(
        userId,
        lat ? parseFloat(lat) : undefined,
        lng ? parseFloat(lng) : undefined
      );

      const response: ApiResponse = {
        success: true,
        message: 'Home screen data retrieved',
        data,
      };

      return reply.status(200).send(response);
    }
  );
}
