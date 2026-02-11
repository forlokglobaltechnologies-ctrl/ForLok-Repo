import mongoose, { Schema, Document, Model } from 'mongoose';
import { generateUserId } from '../utils/helpers';

export interface IParticipant {
  userId: string;
  name: string;
  photo?: string;
  role: 'driver' | 'owner' | 'passenger' | 'renter';
  joinedAt: Date;
  leftAt?: Date;
}

export interface ILastMessage {
  messageId: string;
  text: string;
  senderId: string;
  senderName: string;
  sentAt: Date;
  type: 'text' | 'location' | 'system' | 'image';
}

export interface IConversation extends Document {
  conversationId: string;
  type: 'pooling' | 'rental';
  bookingId?: string; // Reference to Booking (optional for group chats)
  offerId?: string; // Reference to PoolingOffer (for group chats)
  isGroup: boolean; // true for group chats, false for individual chats
  groupName?: string; // Display name for group chats (e.g., "Vijayawada-Gudur : 2026-01-20")
  participants: IParticipant[];
  lastMessage?: ILastMessage;
  unreadCount: Map<string, number>; // userId -> count
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const participantSchema = new Schema<IParticipant>(
  {
    userId: {
      type: String,
      required: true,
      ref: 'User',
    },
    name: {
      type: String,
      required: true,
    },
    photo: {
      type: String,
    },
    role: {
      type: String,
      enum: ['driver', 'owner', 'passenger', 'renter'],
      required: true,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
    leftAt: {
      type: Date,
    },
  },
  { _id: false }
);

const lastMessageSchema = new Schema<ILastMessage>(
  {
    messageId: {
      type: String,
      required: true,
    },
    text: {
      type: String,
      required: true,
    },
    senderId: {
      type: String,
      required: true,
    },
    senderName: {
      type: String,
      required: true,
    },
    sentAt: {
      type: Date,
      required: true,
    },
    type: {
      type: String,
      enum: ['text', 'location', 'system', 'image'],
      default: 'text',
    },
  },
  { _id: false }
);

const conversationSchema = new Schema<IConversation>(
  {
    conversationId: {
      type: String,
      required: true,
      unique: true,
      default: () => generateUserId('CONV'),
    },
    type: {
      type: String,
      enum: ['pooling', 'rental'],
      required: true,
    },
    bookingId: {
      type: String,
      required: function(this: IConversation) {
        return !this.isGroup; // Required only for non-group chats
      },
      ref: 'Booking',
      index: true,
    },
    offerId: {
      type: String,
      required: function(this: IConversation) {
        return this.isGroup && this.type === 'pooling'; // Required for pooling group chats
      },
      ref: 'PoolingOffer',
      index: true,
    },
    isGroup: {
      type: Boolean,
      default: false,
      index: true,
    },
    groupName: {
      type: String,
    },
    participants: [participantSchema],
    lastMessage: lastMessageSchema,
    unreadCount: {
      type: Map,
      of: Number,
      default: new Map(),
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
conversationSchema.index({ conversationId: 1 }, { unique: true });
conversationSchema.index({ bookingId: 1 });
conversationSchema.index({ offerId: 1, isGroup: 1 }); // For finding group conversations by offer
conversationSchema.index({ 'participants.userId': 1 });
conversationSchema.index({ type: 1, isActive: 1 });
conversationSchema.index({ updatedAt: -1 });
conversationSchema.index({ createdAt: -1 });

// Compound index for finding user conversations
conversationSchema.index({ 'participants.userId': 1, isActive: 1, updatedAt: -1 });

const Conversation: Model<IConversation> = mongoose.model<IConversation>(
  'Conversation',
  conversationSchema
);

export default Conversation;
