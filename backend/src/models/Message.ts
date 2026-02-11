import mongoose, { Schema, Document, Model } from 'mongoose';
import { generateUserId } from '../utils/helpers';

export interface IReadReceipt {
  userId: string;
  readAt: Date;
}

export interface IMessage extends Document {
  messageId: string;
  conversationId: string; // Reference to Conversation
  senderId: string; // Reference to User
  senderName: string;
  senderPhoto?: string;
  message: string;
  type: 'text' | 'location' | 'system' | 'image';
  location?: {
    lat: number;
    lng: number;
    address?: string;
  };
  imageUrl?: string;
  readBy: IReadReceipt[];
  deliveredTo: string[]; // Array of userIds who received the message
  sentAt: Date;
  editedAt?: Date;
  deletedAt?: Date;
}

const readReceiptSchema = new Schema<IReadReceipt>(
  {
    userId: {
      type: String,
      required: true,
      ref: 'User',
    },
    readAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const messageSchema = new Schema<IMessage>(
  {
    messageId: {
      type: String,
      required: true,
      unique: true,
      default: () => generateUserId('MSG'),
    },
    conversationId: {
      type: String,
      required: true,
      ref: 'Conversation',
      index: true,
    },
    senderId: {
      type: String,
      required: true,
      ref: 'User',
      index: true,
    },
    senderName: {
      type: String,
      required: true,
    },
    senderPhoto: {
      type: String,
    },
    message: {
      type: String,
      required: true,
      maxlength: 1000,
    },
    type: {
      type: String,
      enum: ['text', 'location', 'system', 'image'],
      default: 'text',
    },
    location: {
      lat: {
        type: Number,
      },
      lng: {
        type: Number,
      },
      address: {
        type: String,
      },
    },
    imageUrl: {
      type: String,
    },
    readBy: [readReceiptSchema],
    deliveredTo: {
      type: [String],
      default: [],
    },
    sentAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    editedAt: {
      type: Date,
    },
    deletedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
messageSchema.index({ messageId: 1 }, { unique: true });
messageSchema.index({ conversationId: 1, sentAt: -1 });
messageSchema.index({ senderId: 1 });
messageSchema.index({ sentAt: -1 });
messageSchema.index({ conversationId: 1, deletedAt: 1 });

// TTL index - auto delete soft-deleted messages after 90 days
messageSchema.index({ deletedAt: 1 }, { expireAfterSeconds: 7776000, partialFilterExpression: { deletedAt: { $exists: true } } });

const Message: Model<IMessage> = mongoose.model<IMessage>('Message', messageSchema);

export default Message;
