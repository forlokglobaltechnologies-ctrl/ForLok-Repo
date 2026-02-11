import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { analyticsService } from '../../services/analytics.service';
import { authenticate, requireAdmin } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validation.middleware';

// Schemas
const trendQuerySchema = z.object({
  querystring: z.object({
    period: z.enum(['week', 'month']).optional().default('week'),
  }),
});

const financialQuerySchema = z.object({
  querystring: z.object({
    period: z.enum(['week', 'month', 'year']).optional().default('month'),
  }),
});

const leaderboardQuerySchema = z.object({
  querystring: z.object({
    limit: z.string().optional().transform((v) => (v ? parseInt(v) : 10)),
  }),
});

export const analyticsRoutes: FastifyPluginAsync = async (app) => {
  /**
   * Get real-time statistics
   */
  app.get(
    '/realtime',
    {
      preHandler: [authenticate, requireAdmin],
    },
    async (_request, reply) => {
      try {
        const stats = await analyticsService.getRealTimeStats();

        return reply.send({
          success: true,
          data: stats,
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
   * Get today's statistics
   */
  app.get(
    '/today',
    {
      preHandler: [authenticate, requireAdmin],
    },
    async (_request, reply) => {
      try {
        const stats = await analyticsService.getTodayStats();

        return reply.send({
          success: true,
          data: stats,
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
   * Get trend data for charts
   */
  app.get(
    '/trends',
    {
      preHandler: [authenticate, requireAdmin, validate(trendQuerySchema)],
    },
    async (request, reply) => {
      try {
        const { period } = request.query as { period: 'week' | 'month' };
        const data = await analyticsService.getTrendData(period);

        return reply.send({
          success: true,
          data,
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
   * Get pooling statistics
   */
  app.get(
    '/pooling',
    {
      preHandler: [authenticate, requireAdmin],
    },
    async (_request, reply) => {
      try {
        const stats = await analyticsService.getPoolingStats();

        return reply.send({
          success: true,
          data: stats,
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
   * Get financial summary
   */
  app.get(
    '/financial',
    {
      preHandler: [authenticate, requireAdmin, validate(financialQuerySchema)],
    },
    async (request, reply) => {
      try {
        const { period } = request.query as { period: 'week' | 'month' | 'year' };
        const data = await analyticsService.getFinancialSummary(period);

        return reply.send({
          success: true,
          data,
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
   * Get user growth statistics
   */
  app.get(
    '/users',
    {
      preHandler: [authenticate, requireAdmin],
    },
    async (_request, reply) => {
      try {
        const stats = await analyticsService.getUserGrowthStats();

        return reply.send({
          success: true,
          data: stats,
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
   * Get leaderboards
   */
  app.get(
    '/leaderboards/earners',
    {
      preHandler: [authenticate, requireAdmin, validate(leaderboardQuerySchema)],
    },
    async (request, reply) => {
      try {
        const { limit } = request.query as { limit: number };
        const data = await analyticsService.getTopEarners(limit);

        return reply.send({
          success: true,
          data,
        });
      } catch (error: any) {
        return reply.status(error.statusCode || 500).send({
          success: false,
          error: error.message,
        });
      }
    }
  );

  app.get(
    '/leaderboards/active',
    {
      preHandler: [authenticate, requireAdmin, validate(leaderboardQuerySchema)],
    },
    async (request, reply) => {
      try {
        const { limit } = request.query as { limit: number };
        const data = await analyticsService.getMostActiveUsers(limit);

        return reply.send({
          success: true,
          data,
        });
      } catch (error: any) {
        return reply.status(error.statusCode || 500).send({
          success: false,
          error: error.message,
        });
      }
    }
  );

  app.get(
    '/leaderboards/rated',
    {
      preHandler: [authenticate, requireAdmin, validate(leaderboardQuerySchema)],
    },
    async (request, reply) => {
      try {
        const { limit } = request.query as { limit: number };
        const data = await analyticsService.getHighestRatedDrivers(limit);

        return reply.send({
          success: true,
          data,
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

export default analyticsRoutes;
