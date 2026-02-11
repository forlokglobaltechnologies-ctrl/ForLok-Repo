import Conversation from '../models/Conversation';
import Booking from '../models/Booking';
import User from '../models/User';
import PoolingOffer from '../models/PoolingOffer';
import RentalOffer from '../models/RentalOffer';
import { NotFoundError, ConflictError } from '../utils/errors';
import logger from '../utils/logger';
import { ServiceType } from '../types';

class ConversationService {
  /**
   * Create or get group conversation for a pooling offer
   * One group chat per offer, includes driver and all passengers
   */
  async createOrGetGroupConversation(poolingOfferId: string): Promise<any> {
    try {
      // Check if group conversation already exists for this offer
      let conversation = await Conversation.findOne({
        offerId: poolingOfferId,
        isGroup: true,
        type: 'pooling',
        isActive: true,
      });

      if (conversation) {
        return conversation.toJSON();
      }

      // Get pooling offer details
      const poolingOffer = await PoolingOffer.findOne({ offerId: poolingOfferId });
      if (!poolingOffer) {
        throw new NotFoundError('Pooling offer not found');
      }

      // Get all bookings for this offer to get all passengers
      const Booking = (await import('../models/Booking')).default;
      const bookings = await Booking.find({
        poolingOfferId,
        status: { $nin: ['cancelled'] },
      }).lean();

      // Build participants list
      const participants: any[] = [];

      // Add driver
      const driver = await User.findOne({ userId: poolingOffer.driverId });
      if (driver) {
        participants.push({
          userId: driver.userId,
          name: driver.name,
          photo: driver.profilePhoto,
          role: 'driver',
          joinedAt: new Date(),
        });
      }

      // Add all passengers from bookings
      const passengerUserIds = new Set<string>();
      for (const booking of bookings) {
        if (booking.userId && !passengerUserIds.has(booking.userId)) {
          passengerUserIds.add(booking.userId);
          const passenger = await User.findOne({ userId: booking.userId });
          if (passenger) {
            participants.push({
              userId: passenger.userId,
              name: passenger.name,
              photo: passenger.profilePhoto,
              role: 'passenger',
              joinedAt: new Date(),
            });
          }
        }
      }

      if (participants.length === 0) {
        throw new Error('No participants found for group conversation');
      }

      // Generate group name: "From-To : Date"
      const fromCity = poolingOffer.route?.from?.city || poolingOffer.route?.from?.address?.split(',')[0] || 'Origin';
      const toCity = poolingOffer.route?.to?.city || poolingOffer.route?.to?.address?.split(',')[0] || 'Destination';
      const dateStr = poolingOffer.date ? new Date(poolingOffer.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '';
      const groupName = `${fromCity}-${toCity} : ${dateStr}`;

      // Create group conversation
      conversation = await Conversation.create({
        type: 'pooling',
        offerId: poolingOfferId,
        isGroup: true,
        groupName,
        participants,
        isActive: poolingOffer.status !== 'completed',
        unreadCount: new Map(),
      });

      // Initialize unread count for all participants
      participants.forEach((p) => {
        conversation.unreadCount.set(p.userId, 0);
      });
      await conversation.save();

      logger.info(`✅ Group conversation created: ${conversation.conversationId} for offer ${poolingOfferId}`);

      return conversation.toJSON();
    } catch (error) {
      logger.error('Error creating group conversation:', error);
      throw error;
    }
  }

  /**
   * Add passenger to group conversation when they book
   */
  async addPassengerToGroupConversation(poolingOfferId: string, passengerUserId: string): Promise<any> {
    try {
      const conversation = await Conversation.findOne({
        offerId: poolingOfferId,
        isGroup: true,
        type: 'pooling',
        isActive: true,
      });

      if (!conversation) {
        // Create group conversation if it doesn't exist
        return await this.createOrGetGroupConversation(poolingOfferId);
      }

      // Check if passenger already exists
      const existingParticipant = conversation.participants.find((p) => p.userId === passengerUserId);
      if (existingParticipant) {
        if (existingParticipant.leftAt) {
          // Rejoin if they left before
          existingParticipant.leftAt = undefined;
          await conversation.save();
          logger.info(`✅ Passenger ${passengerUserId} rejoined group conversation`);
        }
        return conversation.toJSON();
      }

      // Add new passenger
      const passenger = await User.findOne({ userId: passengerUserId });
      if (!passenger) {
        throw new NotFoundError('Passenger user not found');
      }

      conversation.participants.push({
        userId: passenger.userId,
        name: passenger.name,
        photo: passenger.profilePhoto,
        role: 'passenger',
        joinedAt: new Date(),
      });

      conversation.unreadCount.set(passengerUserId, 0);
      await conversation.save();

      logger.info(`✅ Passenger ${passengerUserId} added to group conversation ${conversation.conversationId}`);

      return conversation.toJSON();
    } catch (error) {
      logger.error('Error adding passenger to group conversation:', error);
      throw error;
    }
  }

  /**
   * Create or get conversation for a booking
   * For pooling: Creates/gets group conversation
   * For rental: Creates individual conversation
   */
  async createOrGetConversation(
    bookingId: string,
    serviceType: ServiceType
  ): Promise<any> {
    try {
      // Check if conversation already exists
      let conversation = await Conversation.findOne({ bookingId, isActive: true });
      
      if (conversation) {
        return conversation.toJSON();
      }

      // Get booking details
      const booking = await Booking.findOne({ bookingId });
      if (!booking) {
        throw new NotFoundError('Booking not found');
      }

      // Get participants based on service type
      const participants: any[] = [];

      if (serviceType === 'pooling') {
        // For pooling, use group conversation (one per offer)
        if (!booking.poolingOfferId) {
          throw new NotFoundError('Pooling offer ID not found in booking');
        }

        const poolingOffer = await PoolingOffer.findOne({ offerId: booking.poolingOfferId });
        if (!poolingOffer) {
          throw new NotFoundError('Pooling offer not found');
        }

        // Create or get group conversation and add passenger
        return await this.addPassengerToGroupConversation(booking.poolingOfferId, booking.userId);
      } else if (serviceType === 'rental') {
        // Get owner from rental offer
        const rentalOffer = await RentalOffer.findOne({ offerId: booking.rentalOfferId });
        if (!rentalOffer) {
          throw new NotFoundError('Rental offer not found');
        }

        // Get owner details
        const owner = await User.findOne({ userId: rentalOffer.ownerId });
        if (owner) {
          participants.push({
            userId: owner.userId,
            name: owner.name,
            photo: owner.profilePhoto,
            role: 'owner',
            joinedAt: new Date(),
          });
        }

        // Get renter details
        const renter = await User.findOne({ userId: booking.userId });
        if (renter) {
          participants.push({
            userId: renter.userId,
            name: renter.name,
            photo: renter.profilePhoto,
            role: 'renter',
            joinedAt: new Date(),
          });
        }
      }

      if (participants.length === 0) {
        throw new Error('No participants found for conversation');
      }

      // Create conversation
      conversation = await Conversation.create({
        type: serviceType,
        bookingId,
        participants,
        isActive: booking.status !== 'completed' && booking.status !== 'cancelled',
        unreadCount: new Map(),
      });

      // Initialize unread count for all participants
      participants.forEach((p) => {
        conversation.unreadCount.set(p.userId, 0);
      });
      await conversation.save();

      logger.info(`✅ Conversation created: ${conversation.conversationId} for booking ${bookingId}`);

      return conversation.toJSON();
    } catch (error) {
      logger.error('Error creating conversation:', error);
      throw error;
    }
  }

  /**
   * Add participant to existing conversation (for pooling when new passenger joins)
   */
  async addParticipant(conversationId: string, userId: string, role: 'passenger' | 'driver' | 'owner' | 'renter'): Promise<any> {
    try {
      const conversation = await Conversation.findOne({ conversationId });
      if (!conversation) {
        throw new NotFoundError('Conversation not found');
      }

      // Check if participant already exists
      const existingParticipant = conversation.participants.find((p) => p.userId === userId);
      if (existingParticipant) {
        // If participant left before, rejoin them
        if (existingParticipant.leftAt) {
          existingParticipant.leftAt = undefined;
          await conversation.save();
          logger.info(`✅ Participant ${userId} rejoined conversation ${conversationId}`);
          return conversation.toJSON();
        }
        return conversation.toJSON();
      }

      // Get user details
      const user = await User.findOne({ userId });
      if (!user) {
        throw new NotFoundError('User not found');
      }

      // Add participant
      conversation.participants.push({
        userId: user.userId,
        name: user.name,
        photo: user.profilePhoto,
        role,
        joinedAt: new Date(),
      });

      // Initialize unread count
      conversation.unreadCount.set(userId, 0);
      await conversation.save();

      logger.info(`✅ Participant ${userId} added to conversation ${conversationId}`);

      return conversation.toJSON();
    } catch (error) {
      logger.error('Error adding participant:', error);
      throw error;
    }
  }

  /**
   * Remove participant from conversation (when passenger leaves)
   */
  async removeParticipant(conversationId: string, userId: string): Promise<any> {
    try {
      const conversation = await Conversation.findOne({ conversationId });
      if (!conversation) {
        throw new NotFoundError('Conversation not found');
      }

      const participant = conversation.participants.find((p) => p.userId === userId);
      if (!participant) {
        throw new NotFoundError('Participant not found in conversation');
      }

      // Mark as left
      participant.leftAt = new Date();
      await conversation.save();

      logger.info(`✅ Participant ${userId} left conversation ${conversationId}`);

      return conversation.toJSON();
    } catch (error) {
      logger.error('Error removing participant:', error);
      throw error;
    }
  }

  /**
   * Get all conversations for a user
   */
  async getUserConversations(
    userId: string,
    filters?: {
      type?: ServiceType;
      isActive?: boolean;
      page?: number;
      limit?: number;
    }
  ): Promise<{ conversations: any[]; total: number; page: number; limit: number }> {
    try {
      const page = filters?.page || 1;
      const limit = filters?.limit || 20;
      const skip = (page - 1) * limit;

      const query: any = {
        'participants.userId': userId,
      };

      if (filters?.type) {
        query.type = filters.type;
      }

      if (filters?.isActive !== undefined) {
        query.isActive = filters.isActive;
      }

      const conversations = await Conversation.find(query)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      const total = await Conversation.countDocuments(query);

      // Populate participant details and calculate unread count for this user
      const enrichedConversations = await Promise.all(
        conversations.map(async (conv: any) => {
          const unreadCount = conv.unreadCount?.get?.(userId) || 0;
          
          // Get other participants (exclude current user)
          const otherParticipants = conv.participants.filter(
            (p: any) => p.userId !== userId && !p.leftAt
          );

          return {
            ...conv,
            unreadCount,
            otherParticipants,
            participantCount: conv.participants.filter((p: any) => !p.leftAt).length,
          };
        })
      );

      return {
        conversations: enrichedConversations,
        total,
        page,
        limit,
      };
    } catch (error) {
      logger.error('Error getting user conversations:', error);
      throw error;
    }
  }

  /**
   * Get conversation by ID
   */
  async getConversationById(conversationId: string, userId: string): Promise<any> {
    try {
      const conversation = await Conversation.findOne({ conversationId });
      if (!conversation) {
        throw new NotFoundError('Conversation not found');
      }

      // Check if user is a participant
      const isParticipant = conversation.participants.some(
        (p) => p.userId === userId && !p.leftAt
      );

      if (!isParticipant) {
        throw new ConflictError('You are not a participant in this conversation');
      }

      const unreadCount = conversation.unreadCount.get(userId) || 0;

      return {
        ...conversation.toJSON(),
        unreadCount,
      };
    } catch (error) {
      logger.error('Error getting conversation:', error);
      throw error;
    }
  }

  /**
   * Get conversation by booking ID
   */
  async getConversationByBookingId(bookingId: string): Promise<any> {
    try {
      const conversation = await Conversation.findOne({ bookingId, isActive: true });
      if (!conversation) {
        return null;
      }

      return conversation.toJSON();
    } catch (error) {
      logger.error('Error getting conversation by booking ID:', error);
      throw error;
    }
  }

  /**
   * Mark conversation as read
   */
  async markAsRead(conversationId: string, userId: string): Promise<any> {
    try {
      const conversation = await Conversation.findOne({ conversationId });
      if (!conversation) {
        throw new NotFoundError('Conversation not found');
      }

      // Reset unread count for this user
      conversation.unreadCount.set(userId, 0);
      await conversation.save();

      return conversation.toJSON();
    } catch (error) {
      logger.error('Error marking conversation as read:', error);
      throw error;
    }
  }

  /**
   * Archive conversation (when booking completes or cancels)
   */
  async archiveConversation(bookingId: string): Promise<void> {
    try {
      const conversation = await Conversation.findOne({ bookingId });
      if (conversation) {
        conversation.isActive = false;
        await conversation.save();
        logger.info(`✅ Conversation archived for booking ${bookingId}`);
      }
    } catch (error) {
      logger.error('Error archiving conversation:', error);
      // Don't throw error, as this is called from booking completion
    }
  }

  /**
   * Archive group conversation when trip ends
   */
  async archiveGroupConversation(poolingOfferId: string): Promise<void> {
    try {
      const conversation = await Conversation.findOne({
        offerId: poolingOfferId,
        isGroup: true,
        type: 'pooling',
        isActive: true,
      });
      if (conversation) {
        conversation.isActive = false;
        await conversation.save();
        logger.info(`✅ Group conversation archived for offer ${poolingOfferId}`);
      }
    } catch (error) {
      logger.error('Error archiving group conversation:', error);
      // Don't throw error, as this is called from trip completion
    }
  }

  /**
   * Get group conversation by offer ID
   */
  async getGroupConversationByOfferId(poolingOfferId: string, userId: string): Promise<any> {
    try {
      const conversation = await Conversation.findOne({
        offerId: poolingOfferId,
        isGroup: true,
        type: 'pooling',
        isActive: true,
        'participants.userId': userId,
      });

      if (!conversation) {
        throw new NotFoundError('Group conversation not found');
      }

      const unreadCount = conversation.unreadCount.get(userId) || 0;

      return {
        ...conversation.toJSON(),
        unreadCount,
      };
    } catch (error) {
      logger.error('Error getting group conversation:', error);
      throw error;
    }
  }
}

export const conversationService = new ConversationService();
