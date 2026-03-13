import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { analyticsService } from '../../services/analytics.service';
import { authenticate, requireAdminPermission } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validation.middleware';
import { ADMIN_PERMISSIONS } from '../../constants/admin-permissions';

// Schemas
const trendQuerySchema = z.object({
  period: z.enum(['week', 'month']).optional(),
});

const financialQuerySchema = z.object({
  period: z.enum(['week', 'month', 'year']).optional(),
});

const leaderboardQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const analyticsRoutes: FastifyPluginAsync = async (app) => {
  /**
   * Get real-time statistics
   */
  app.get(
    '/realtime',
    {
      preHandler: [authenticate, requireAdminPermission(ADMIN_PERMISSIONS.ANALYTICS_VIEW)],
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
      preHandler: [authenticate, requireAdminPermission(ADMIN_PERMISSIONS.ANALYTICS_VIEW)],
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
      preHandler: [
        authenticate,
        requireAdminPermission(ADMIN_PERMISSIONS.ANALYTICS_VIEW),
        validate(trendQuerySchema),
      ],
    },
    async (request, reply) => {
      try {
        const { period = 'week' } = request.query as { period?: 'week' | 'month' };
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
      preHandler: [authenticate, requireAdminPermission(ADMIN_PERMISSIONS.ANALYTICS_VIEW)],
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
      preHandler: [
        authenticate,
        requireAdminPermission(ADMIN_PERMISSIONS.ANALYTICS_VIEW),
        validate(financialQuerySchema),
      ],
    },
    async (request, reply) => {
      try {
        const { period = 'month' } = request.query as { period?: 'week' | 'month' | 'year' };
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
      preHandler: [authenticate, requireAdminPermission(ADMIN_PERMISSIONS.ANALYTICS_VIEW)],
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
      preHandler: [
        authenticate,
        requireAdminPermission(ADMIN_PERMISSIONS.ANALYTICS_VIEW),
        validate(leaderboardQuerySchema),
      ],
    },
    async (request, reply) => {
      try {
        const { limit = 10 } = request.query as { limit?: number };
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
      preHandler: [
        authenticate,
        requireAdminPermission(ADMIN_PERMISSIONS.ANALYTICS_VIEW),
        validate(leaderboardQuerySchema),
      ],
    },
    async (request, reply) => {
      try {
        const { limit = 10 } = request.query as { limit?: number };
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
      preHandler: [
        authenticate,
        requireAdminPermission(ADMIN_PERMISSIONS.ANALYTICS_VIEW),
        validate(leaderboardQuerySchema),
      ],
    },
    async (request, reply) => {
      try {
        const { limit = 10 } = request.query as { limit?: number };
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
