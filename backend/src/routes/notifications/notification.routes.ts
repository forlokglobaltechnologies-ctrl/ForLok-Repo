import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { notificationService } from '../../services/notification.service';
import { authenticate } from '../../middleware/auth.middleware';
import { ApiResponse } from '../../types';

export async function notificationRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/notifications
   * Get user notifications (authenticated)
   */
  fastify.get(
    '/',
    {
      preHandler: [authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).user.userId;
      const query = request.query as {
        read?: string;
        type?: string;
        page?: string;
        limit?: string;
      };

      const filters: any = {};
      if (query.read !== undefined) filters.read = query.read === 'true';
      if (query.type) filters.type = query.type;
      if (query.page) filters.page = parseInt(query.page);
      if (query.limit) filters.limit = parseInt(query.limit);

      const result = await notificationService.getUserNotifications(userId, filters);

      const response: ApiResponse = {
        success: true,
        message: 'Notifications retrieved successfully',
        data: result,
      };

      return reply.status(200).send(response);
    }
  );

  /**
   * PUT /api/notifications/:notificationId/read
   * Mark notification as read (authenticated)
   */
  fastify.put(
    '/:notificationId/read',
    {
      preHandler: [authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).user.userId;
      const { notificationId } = request.params as { notificationId: string };

      const notification = await notificationService.markAsRead(notificationId, userId);

      const response: ApiResponse = {
        success: true,
        message: 'Notification marked as read',
        data: notification,
      };

      return reply.status(200).send(response);
    }
  );

  /**
   * PUT /api/notifications/read-all
   * Mark all notifications as read (authenticated)
   */
  fastify.put(
    '/read-all',
    {
      preHandler: [authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).user.userId;

      await notificationService.markAllAsRead(userId);

      const response: ApiResponse = {
        success: true,
        message: 'All notifications marked as read',
      };

      return reply.status(200).send(response);
    }
  );

  /**
   * DELETE /api/notifications/:notificationId
   * Delete notification (authenticated)
   */
  fastify.delete(
    '/:notificationId',
    {
      preHandler: [authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).user.userId;
      const { notificationId } = request.params as { notificationId: string };

      await notificationService.deleteNotification(notificationId, userId);

      const response: ApiResponse = {
        success: true,
        message: 'Notification deleted successfully',
      };

      return reply.status(200).send(response);
    }
  );

  /**
   * GET /api/notifications/unread-count
   * Get unread notification count (authenticated)
   */
  fastify.get(
    '/unread-count',
    {
      preHandler: [authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).user.userId;

      const count = await notificationService.getUnreadCount(userId);

      const response: ApiResponse = {
        success: true,
        message: 'Unread count retrieved successfully',
        data: { count },
      };

      return reply.status(200).send(response);
    }
  );
}
