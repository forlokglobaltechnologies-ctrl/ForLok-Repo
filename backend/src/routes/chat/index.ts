import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { conversationRoutes } from './conversation.routes';
import { messageRoutes } from './message.routes';
import { messageService } from '../../services/message.service';
import { authenticate } from '../../middleware/auth.middleware';
import { ApiResponse } from '../../types';

export async function chatRoutes(fastify: FastifyInstance) {
  // Register conversation routes
  await fastify.register(conversationRoutes, { prefix: '/conversations' });
  
  // Register message routes under /conversations prefix
  await fastify.register(messageRoutes, { prefix: '/conversations' });
  
  // Register message-specific routes under /messages prefix
  // PUT /api/chat/messages/:messageId/read
  fastify.put(
    '/messages/:messageId/read',
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).user.userId;
      const { messageId } = request.params as { messageId: string };
      const message = await messageService.markAsRead(messageId, userId);
      const response: ApiResponse = {
        success: true,
        message: 'Message marked as read',
        data: message,
      };
      return reply.status(200).send(response);
    }
  );
  
  // DELETE /api/chat/messages/:messageId
  fastify.delete(
    '/messages/:messageId',
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).user.userId;
      const { messageId } = request.params as { messageId: string };
      const message = await messageService.deleteMessage(messageId, userId);
      const response: ApiResponse = {
        success: true,
        message: 'Message deleted successfully',
        data: message,
      };
      return reply.status(200).send(response);
    }
  );
}
