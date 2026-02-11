import Message from '../models/Message';
import Conversation from '../models/Conversation';
import User from '../models/User';
import { NotFoundError, ConflictError } from '../utils/errors';
import logger from '../utils/logger';

class MessageService {
  /**
   * Send a message
   */
  async sendMessage(data: {
    conversationId: string;
    senderId: string;
    message: string;
    type?: 'text' | 'location' | 'system' | 'image';
    location?: { lat: number; lng: number; address?: string };
    imageUrl?: string;
  }): Promise<any> {
    try {
      // Get conversation
      const conversation = await Conversation.findOne({ conversationId: data.conversationId });
      if (!conversation) {
        throw new NotFoundError('Conversation not found');
      }

      // Check if sender is a participant
      const sender = conversation.participants.find(
        (p) => p.userId === data.senderId && !p.leftAt
      );
      if (!sender) {
        throw new ConflictError('You are not a participant in this conversation');
      }

      // Check if conversation is active
      if (!conversation.isActive) {
        throw new ConflictError('Conversation is archived. Cannot send messages.');
      }

      // Get sender details
      const senderUser = await User.findOne({ userId: data.senderId });
      if (!senderUser) {
        throw new NotFoundError('Sender not found');
      }

      // Validate message length
      if (data.message.length > 1000) {
        throw new ConflictError('Message too long. Maximum 1000 characters allowed.');
      }

      // Create message
      const message = await Message.create({
        conversationId: data.conversationId,
        senderId: data.senderId,
        senderName: senderUser.name,
        senderPhoto: senderUser.profilePhoto,
        message: data.message,
        type: data.type || 'text',
        location: data.location,
        imageUrl: data.imageUrl,
        deliveredTo: [data.senderId], // Sender has delivered to themselves
        sentAt: new Date(),
      });

      // Update conversation last message
      conversation.lastMessage = {
        messageId: message.messageId,
        text: data.message,
        senderId: data.senderId,
        senderName: senderUser.name,
        sentAt: message.sentAt,
        type: data.type || 'text',
      };

      // Increment unread count for all participants except sender
      conversation.participants.forEach((participant) => {
        if (participant.userId !== data.senderId && !participant.leftAt) {
          const currentCount = conversation.unreadCount.get(participant.userId) || 0;
          conversation.unreadCount.set(participant.userId, currentCount + 1);
        }
      });

      await conversation.save();

      logger.info(`✅ Message sent: ${message.messageId} in conversation ${data.conversationId}`);

      // Broadcast to WebSocket clients (if WebSocket is available)
      try {
        const { broadcastNewMessage } = await import('../routes/websocket/chat.websocket');
        await broadcastNewMessage(data.conversationId, message.toJSON(), data.senderId);
      } catch (error) {
        // WebSocket might not be initialized, ignore
        logger.debug('WebSocket broadcast skipped:', error);
      }

      return message.toJSON();
    } catch (error) {
      logger.error('Error sending message:', error);
      throw error;
    }
  }

  /**
   * Get messages for a conversation
   */
  async getMessages(
    conversationId: string,
    userId: string,
    filters?: {
      page?: number;
      limit?: number;
      before?: string; // messageId to get messages before this
    }
  ): Promise<{ messages: any[]; total: number; page: number; limit: number; hasMore: boolean }> {
    try {
      // Verify user is participant
      const conversation = await Conversation.findOne({ conversationId });
      if (!conversation) {
        throw new NotFoundError('Conversation not found');
      }

      const isParticipant = conversation.participants.some(
        (p) => p.userId === userId && !p.leftAt
      );
      if (!isParticipant) {
        throw new ConflictError('You are not a participant in this conversation');
      }

      const page = filters?.page || 1;
      const limit = filters?.limit || 50;
      const skip = (page - 1) * limit;

      let query: any = {
        conversationId,
        deletedAt: { $exists: false }, // Only non-deleted messages
      };

      // If before messageId is provided, get messages before that message
      if (filters?.before) {
        const beforeMessage = await Message.findOne({ messageId: filters.before });
        if (beforeMessage) {
          query.sentAt = { $lt: beforeMessage.sentAt };
        }
      }

      const messages = await Message.find(query)
        .sort({ sentAt: -1 }) // Most recent first
        .skip(skip)
        .limit(limit)
        .lean();

      const total = await Message.countDocuments({
        conversationId,
        deletedAt: { $exists: false },
      });

      // Reverse to show oldest first (for UI)
      const reversedMessages = messages.reverse();

      return {
        messages: reversedMessages,
        total,
        page,
        limit,
        hasMore: skip + limit < total,
      };
    } catch (error) {
      logger.error('Error getting messages:', error);
      throw error;
    }
  }

  /**
   * Mark message as read
   */
  async markAsRead(messageId: string, userId: string): Promise<any> {
    try {
      const message = await Message.findOne({ messageId });
      if (!message) {
        throw new NotFoundError('Message not found');
      }

      // Check if already read
      const alreadyRead = message.readBy.some((r) => r.userId === userId);
      if (alreadyRead) {
        return message.toJSON();
      }

      // Add read receipt
      message.readBy.push({
        userId,
        readAt: new Date(),
      });

      await message.save();

      logger.info(`✅ Message ${messageId} marked as read by ${userId}`);

      return message.toJSON();
    } catch (error) {
      logger.error('Error marking message as read:', error);
      throw error;
    }
  }

  /**
   * Mark multiple messages as read
   */
  async markMultipleAsRead(conversationId: string, userId: string, messageIds: string[]): Promise<void> {
    try {
      await Message.updateMany(
        {
          conversationId,
          messageId: { $in: messageIds },
          'readBy.userId': { $ne: userId }, // Not already read by this user
        },
        {
          $push: {
            readBy: {
              userId,
              readAt: new Date(),
            },
          },
        }
      );

      logger.info(`✅ Marked ${messageIds.length} messages as read in conversation ${conversationId}`);
    } catch (error) {
      logger.error('Error marking multiple messages as read:', error);
      throw error;
    }
  }

  /**
   * Mark message as delivered
   */
  async markAsDelivered(messageId: string, userId: string): Promise<void> {
    try {
      await Message.updateOne(
        { messageId, deliveredTo: { $ne: userId } },
        { $push: { deliveredTo: userId } }
      );
    } catch (error) {
      logger.error('Error marking message as delivered:', error);
      // Don't throw, as this is not critical
    }
  }

  /**
   * Delete message (soft delete)
   */
  async deleteMessage(messageId: string, userId: string): Promise<any> {
    try {
      const message = await Message.findOne({ messageId });
      if (!message) {
        throw new NotFoundError('Message not found');
      }

      // Only sender can delete their own message
      if (message.senderId !== userId) {
        throw new ConflictError('You can only delete your own messages');
      }

      // Soft delete
      message.deletedAt = new Date();
      await message.save();

      logger.info(`✅ Message ${messageId} deleted by ${userId}`);

      return message.toJSON();
    } catch (error) {
      logger.error('Error deleting message:', error);
      throw error;
    }
  }

  /**
   * Send system message (auto-generated)
   */
  async sendSystemMessage(
    conversationId: string,
    message: string
  ): Promise<any> {
    try {
      const conversation = await Conversation.findOne({ conversationId });
      if (!conversation) {
        throw new NotFoundError('Conversation not found');
      }

      // Create system message
      const systemMessage = await Message.create({
        conversationId,
        senderId: 'SYSTEM',
        senderName: 'System',
        message,
        type: 'system',
        deliveredTo: conversation.participants.map((p) => p.userId),
        sentAt: new Date(),
      });

      // Update conversation last message
      conversation.lastMessage = {
        messageId: systemMessage.messageId,
        text: message,
        senderId: 'SYSTEM',
        senderName: 'System',
        sentAt: systemMessage.sentAt,
        type: 'system',
      };

      await conversation.save();

      return systemMessage.toJSON();
    } catch (error) {
      logger.error('Error sending system message:', error);
      throw error;
    }
  }
}

export const messageService = new MessageService();
