import { FastifyInstance } from 'fastify';
import { SocketStream } from '@fastify/websocket';
import { verifyToken } from '../../middleware/auth.middleware';
import { messageService } from '../../services/message.service';
import { conversationService } from '../../services/conversation.service';
import logger from '../../utils/logger';
import { JWTPayload } from '../../types';

interface ChatSocket extends SocketStream {
  userId?: string;
  conversationRooms?: Set<string>;
}

// Store active connections: userId -> Set of socket connections
const activeConnections = new Map<string, Set<ChatSocket>>();

// Store typing users: conversationId -> Set of userIds who are typing
const typingUsers = new Map<string, Set<string>>();

export async function chatWebSocket(fastify: FastifyInstance) {
  fastify.get('/ws/chat', { websocket: true }, (connection: ChatSocket) => {
    let userId: string | undefined;
    let userRooms = new Set<string>();

    connection.on('message', async (message: Buffer) => {
      try {
        const data = JSON.parse(message.toString());

        // Handle authentication
        if (data.type === 'auth') {
          try {
            const token = data.token;
            if (!token) {
              connection.socket.send(JSON.stringify({
                type: 'error',
                message: 'Token required',
              }));
              return;
            }

            // Verify token
            const decoded = await verifyToken(token) as JWTPayload;
            userId = decoded.userId;
            connection.userId = userId;
            connection.conversationRooms = userRooms;

            // Add to active connections
            if (!activeConnections.has(userId)) {
              activeConnections.set(userId, new Set());
            }
            activeConnections.get(userId)!.add(connection);

            // Join user-specific room
            userRooms.add(`user:${userId}`);

            connection.socket.send(JSON.stringify({
              type: 'auth:success',
              userId,
            }));

            logger.info(`✅ WebSocket authenticated: User ${userId}`);

            // Send user's active conversations
            const conversations = await conversationService.getUserConversations(userId, { isActive: true });
            connection.socket.send(JSON.stringify({
              type: 'conversations:list',
              data: conversations,
            }));
          } catch (error: any) {
            connection.socket.send(JSON.stringify({
              type: 'error',
              message: 'Authentication failed',
            }));
            logger.error('WebSocket auth error:', error);
          }
          return;
        }

        // All other events require authentication
        if (!userId) {
          connection.socket.send(JSON.stringify({
            type: 'error',
            message: 'Not authenticated',
          }));
          return;
        }

        // Handle join conversation
        if (data.type === 'join:conversation') {
          const { conversationId } = data;
          if (!conversationId) {
            connection.socket.send(JSON.stringify({
              type: 'error',
              message: 'conversationId required',
            }));
            return;
          }

          // Verify user is participant
          try {
            await conversationService.getConversationById(conversationId, userId);
            userRooms.add(`conversation:${conversationId}`);
            connection.socket.send(JSON.stringify({
              type: 'joined',
              conversationId,
            }));
            logger.info(`✅ User ${userId} joined conversation ${conversationId}`);
          } catch (error) {
            connection.socket.send(JSON.stringify({
              type: 'error',
              message: 'Not a participant in this conversation',
            }));
          }
          return;
        }

        // Handle leave conversation
        if (data.type === 'leave:conversation') {
          const { conversationId } = data;
          userRooms.delete(`conversation:${conversationId}`);
          connection.socket.send(JSON.stringify({
            type: 'left',
            conversationId,
          }));
          return;
        }

        // Handle typing indicator
        if (data.type === 'typing:start') {
          const { conversationId } = data;
          if (!typingUsers.has(conversationId)) {
            typingUsers.set(conversationId, new Set());
          }
          typingUsers.get(conversationId)!.add(userId);

          // Broadcast to other participants
          broadcastToConversation(conversationId, userId, {
            type: 'typing:start',
            conversationId,
            userId,
          });

          // Auto-stop typing after 3 seconds
          setTimeout(() => {
            if (userId && typingUsers.has(conversationId)) {
              typingUsers.get(conversationId)!.delete(userId);
              broadcastToConversation(conversationId, userId, {
                type: 'typing:stop',
                conversationId,
                userId,
              });
            }
          }, 3000);
          return;
        }

        // Handle typing stop
        if (data.type === 'typing:stop') {
          const { conversationId } = data;
          if (userId && typingUsers.has(conversationId)) {
            typingUsers.get(conversationId)!.delete(userId);
            broadcastToConversation(conversationId, userId, {
              type: 'typing:stop',
              conversationId,
              userId,
            });
          }
          return;
        }

        // Handle mark as delivered
        if (data.type === 'message:delivered') {
          const { messageId } = data;
          if (messageId) {
            await messageService.markAsDelivered(messageId, userId);
          }
          return;
        }

        // Handle mark as read
        if (data.type === 'message:read') {
          const { messageId, conversationId } = data;
          if (messageId) {
            await messageService.markAsRead(messageId, userId);
            
            // Update conversation unread count
            if (conversationId) {
              await conversationService.markAsRead(conversationId, userId);
            }

            // Broadcast read receipt
            broadcastToConversation(conversationId, userId, {
              type: 'message:read',
              messageId,
              userId,
              conversationId,
            });
          }
          return;
        }
      } catch (error: any) {
        logger.error('WebSocket message error:', error);
        connection.socket.send(JSON.stringify({
          type: 'error',
          message: error.message || 'Internal server error',
        }));
      }
    });

    connection.on('close', () => {
      if (userId) {
        // Remove from active connections
        const userConnections = activeConnections.get(userId);
        if (userConnections) {
          userConnections.delete(connection);
          if (userConnections.size === 0) {
            activeConnections.delete(userId);
          }
        }

        // Remove from typing users
        typingUsers.forEach((users, conversationId) => {
          if (users.has(userId!)) {
            users.delete(userId!);
            broadcastToConversation(conversationId, userId!, {
              type: 'typing:stop',
              conversationId,
              userId: userId!,
            });
          }
        });

        logger.info(`❌ WebSocket disconnected: User ${userId}`);
      }
    });

    connection.on('error', (error) => {
      logger.error('WebSocket error:', error);
    });
  });
}

/**
 * Broadcast message to all participants in a conversation (except sender)
 */
function broadcastToConversation(conversationId: string, senderId: string, message: any) {
  const room = `conversation:${conversationId}`;
  let sentCount = 0;

  activeConnections.forEach((connections, userId) => {
    if (userId === senderId) return; // Don't send to sender

    connections.forEach((connection) => {
      if (connection.conversationRooms?.has(room)) {
        try {
          connection.socket.send(JSON.stringify(message));
          sentCount++;
        } catch (error) {
          logger.error(`Error broadcasting to user ${userId}:`, error);
        }
      }
    });
  });

  return sentCount;
}

/**
 * Broadcast message to a specific user
 */
export function broadcastToUser(userId: string, message: any) {
  const connections = activeConnections.get(userId);
  if (!connections) return 0;

  let sentCount = 0;
  connections.forEach((connection) => {
    try {
      connection.socket.send(JSON.stringify(message));
      sentCount++;
    } catch (error) {
      logger.error(`Error broadcasting to user ${userId}:`, error);
    }
  });

  return sentCount;
}

/**
 * Broadcast new message to conversation participants
 */
export async function broadcastNewMessage(conversationId: string, message: any, senderId: string) {
  const broadcastMessage = {
    type: 'message:new',
    conversationId,
    message,
  };

  const sentCount = broadcastToConversation(conversationId, senderId, broadcastMessage);
  logger.info(`📤 Broadcasted message ${message.messageId} to ${sentCount} participants`);
  return sentCount;
}
