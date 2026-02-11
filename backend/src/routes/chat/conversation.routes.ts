import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { conversationService } from '../../services/conversation.service';
import { authenticate } from '../../middleware/auth.middleware';
import { ApiResponse, ServiceType } from '../../types';

export async function conversationRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/chat/conversations
   * Get all conversations for authenticated user
   */
  fastify.get(
    '/',
    {
      preHandler: [authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).user.userId;
      const query = request.query as {
        type?: ServiceType;
        isActive?: string;
        page?: string;
        limit?: string;
      };

      const filters: any = {};
      if (query.type) filters.type = query.type;
      if (query.isActive !== undefined) filters.isActive = query.isActive === 'true';
      if (query.page) filters.page = parseInt(query.page);
      if (query.limit) filters.limit = parseInt(query.limit);

      const result = await conversationService.getUserConversations(userId, filters);

      const response: ApiResponse = {
        success: true,
        message: 'Conversations retrieved successfully',
        data: result,
      };

      return reply.status(200).send(response);
    }
  );

  /**
   * GET /api/chat/conversations/offer/:offerId/group
   * Get group conversation by pooling offer ID
   */
  fastify.get(
    '/offer/:offerId/group',
    {
      preHandler: [authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).user.userId;
      const { offerId } = request.params as { offerId: string };

      const conversation = await conversationService.getGroupConversationByOfferId(offerId, userId);

      const response: ApiResponse = {
        success: true,
        message: 'Group conversation retrieved successfully',
        data: conversation,
      };

      return reply.status(200).send(response);
    }
  );

  /**
   * GET /api/chat/conversations/:conversationId
   * Get conversation details
   */
  fastify.get(
    '/:conversationId',
    {
      preHandler: [authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).user.userId;
      const { conversationId } = request.params as { conversationId: string };

      const conversation = await conversationService.getConversationById(conversationId, userId);

      const response: ApiResponse = {
        success: true,
        message: 'Conversation retrieved successfully',
        data: conversation,
      };

      return reply.status(200).send(response);
    }
  );

  /**
   * GET /api/chat/conversations/booking/:bookingId
   * Get conversation by booking ID
   */
  fastify.get(
    '/booking/:bookingId',
    {
      preHandler: [authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { bookingId } = request.params as { bookingId: string };

      const conversation = await conversationService.getConversationByBookingId(bookingId);

      const response: ApiResponse = {
        success: true,
        message: 'Conversation retrieved successfully',
        data: conversation,
      };

      return reply.status(200).send(response);
    }
  );

  /**
   * PUT /api/chat/conversations/:conversationId/read
   * Mark conversation as read
   */
  fastify.put(
    '/:conversationId/read',
    {
      preHandler: [authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).user.userId;
      const { conversationId } = request.params as { conversationId: string };

      const conversation = await conversationService.markAsRead(conversationId, userId);

      const response: ApiResponse = {
        success: true,
        message: 'Conversation marked as read',
        data: conversation,
      };

      return reply.status(200).send(response);
    }
  );

  /**
   * POST /api/chat/conversations/:conversationId/participants
   * Add participant to conversation (for pooling when new passenger joins)
   */
  fastify.post(
    '/:conversationId/participants',
    {
      preHandler: [authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).user.userId;
      const { conversationId } = request.params as { conversationId: string };
      const body = request.body as { userId: string; role: 'passenger' | 'driver' | 'owner' | 'renter' };

      // Only allow adding participants if user is already in conversation
      await conversationService.getConversationById(conversationId, userId);
      
      const result = await conversationService.addParticipant(
        conversationId,
        body.userId,
        body.role
      );

      const response: ApiResponse = {
        success: true,
        message: 'Participant added successfully',
        data: result,
      };

      return reply.status(200).send(response);
    }
  );
}
