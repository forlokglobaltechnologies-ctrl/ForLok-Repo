import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { messageService } from '../../services/message.service';
import { authenticate } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validation.middleware';
import { z } from 'zod';
import { ApiResponse } from '../../types';

// Request schemas
const sendMessageSchema = z.object({
  message: z.string().min(1).max(1000),
  type: z.enum(['text', 'location', 'system', 'image']).optional(),
  location: z.object({
    lat: z.number(),
    lng: z.number(),
    address: z.string().optional(),
  }).optional(),
  imageUrl: z.string().url().optional(),
}).refine(
  (data) => {
    if (data.type === 'location' && !data.location) {
      return false;
    }
    if (data.type === 'image' && !data.imageUrl) {
      return false;
    }
    return true;
  },
  {
    message: 'Location or imageUrl required for location/image message types',
  }
);

const markAsReadSchema = z.object({
  messageIds: z.array(z.string()).optional(), // For bulk mark as read
});

export async function messageRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/chat/conversations/:conversationId/messages
   * Get messages for a conversation
   */
  fastify.get(
    '/:conversationId/messages',
    {
      preHandler: [authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).user.userId;
      const { conversationId } = request.params as { conversationId: string };
      const query = request.query as {
        page?: string;
        limit?: string;
        before?: string;
      };

      const filters: any = {};
      if (query.page) filters.page = parseInt(query.page);
      if (query.limit) filters.limit = parseInt(query.limit);
      if (query.before) filters.before = query.before;

      const result = await messageService.getMessages(conversationId, userId, filters);

      const response: ApiResponse = {
        success: true,
        message: 'Messages retrieved successfully',
        data: result,
      };

      return reply.status(200).send(response);
    }
  );

  /**
   * POST /api/chat/conversations/:conversationId/messages
   * Send a message
   */
  fastify.post(
    '/:conversationId/messages',
    {
      preHandler: [authenticate, validate(sendMessageSchema)],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).user.userId;
      const { conversationId } = request.params as { conversationId: string };
      const body = request.body as {
        message: string;
        type?: 'text' | 'location' | 'system' | 'image';
        location?: { lat: number; lng: number; address?: string };
        imageUrl?: string;
      };

      const message = await messageService.sendMessage({
        conversationId,
        senderId: userId,
        message: body.message,
        type: body.type || 'text',
        location: body.location,
        imageUrl: body.imageUrl,
      });

      const response: ApiResponse = {
        success: true,
        message: 'Message sent successfully',
        data: message,
      };

      return reply.status(201).send(response);
    }
  );


  /**
   * PUT /api/chat/conversations/:conversationId/messages/read
   * Mark multiple messages as read
   */
  fastify.put(
    '/:conversationId/messages/read',
    {
      preHandler: [authenticate, validate(markAsReadSchema)],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).user.userId;
      const { conversationId } = request.params as { conversationId: string };
      const body = request.body as { messageIds?: string[] };

      if (body.messageIds && body.messageIds.length > 0) {
        await messageService.markMultipleAsRead(conversationId, userId, body.messageIds);
      }

      const response: ApiResponse = {
        success: true,
        message: 'Messages marked as read',
      };

      return reply.status(200).send(response);
    }
  );

  /**
   * POST /api/chat/conversations/:conversationId/share-location
   * Share current location
   */
  fastify.post(
    '/:conversationId/share-location',
    {
      preHandler: [authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).user.userId;
      const { conversationId } = request.params as { conversationId: string };
      const body = request.body as {
        lat: number;
        lng: number;
        address?: string;
      };

      const message = await messageService.sendMessage({
        conversationId,
        senderId: userId,
        message: '📍 Shared location',
        type: 'location',
        location: {
          lat: body.lat,
          lng: body.lng,
          address: body.address,
        },
      });

      const response: ApiResponse = {
        success: true,
        message: 'Location shared successfully',
        data: message,
      };

      return reply.status(201).send(response);
    }
  );

}
