import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { blockService } from '../../services/block.service';
import { authenticate } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validation.middleware';

// Schemas
const blockUserSchema = z.object({
  body: z.object({
    blockedId: z.string().min(1),
    reason: z.string().max(500).optional(),
    reasonCategory: z.enum([
      'inappropriate_behavior',
      'safety_concern',
      'uncomfortable_experience',
      'spam',
      'other',
    ]).optional(),
    bookingId: z.string().optional(),
  }),
});

const unblockUserSchema = z.object({
  params: z.object({
    userId: z.string().min(1),
  }),
});

const checkBlockSchema = z.object({
  params: z.object({
    userId: z.string().min(1),
  }),
});

export const blockRoutes: FastifyPluginAsync = async (app) => {
  /**
   * Block a user
   */
  app.post(
    '/',
    {
      preHandler: [authenticate, validate(blockUserSchema)],
    },
    async (request, reply) => {
      try {
        const blockerId = (request as any).user.userId;
        const { blockedId, reason, reasonCategory, bookingId } = request.body as {
          blockedId: string;
          reason?: string;
          reasonCategory?: string;
          bookingId?: string;
        };

        const block = await blockService.blockUser(blockerId, blockedId, {
          reason,
          reasonCategory: reasonCategory as any,
          bookingId,
        });

        return reply.send({
          success: true,
          message: 'User blocked successfully',
          data: block,
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
   * Unblock a user
   */
  app.delete(
    '/:userId',
    {
      preHandler: [authenticate, validate(unblockUserSchema)],
    },
    async (request, reply) => {
      try {
        const blockerId = (request as any).user.userId;
        const { userId: blockedId } = request.params as { userId: string };

        await blockService.unblockUser(blockerId, blockedId);

        return reply.send({
          success: true,
          message: 'User unblocked successfully',
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
   * Get blocked users list
   */
  app.get(
    '/',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const userId = (request as any).user.userId;
        const blockedUsers = await blockService.getBlockedUsers(userId);

        return reply.send({
          success: true,
          data: blockedUsers,
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
   * Check if a user is blocked (either direction)
   */
  app.get(
    '/check/:userId',
    {
      preHandler: [authenticate, validate(checkBlockSchema)],
    },
    async (request, reply) => {
      try {
        const currentUserId = (request as any).user.userId;
        const { userId: otherUserId } = request.params as { userId: string };

        const isBlocked = await blockService.isBlocked(currentUserId, otherUserId);
        const hasBlocked = await blockService.hasBlocked(currentUserId, otherUserId);

        return reply.send({
          success: true,
          data: {
            isBlocked, // Either direction
            hasBlocked, // Current user blocked the other
          },
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

export default blockRoutes;
