import mongoose, { Schema, Document, Model } from 'mongoose';
import { generateUserId } from '../utils/helpers';

export interface IBlock extends Document {
  blockId: string;
  blockerId: string; // User who blocked
  blockedId: string; // User who got blocked
  reason?: string;
  reasonCategory?: 'inappropriate_behavior' | 'safety_concern' | 'uncomfortable_experience' | 'spam' | 'other';
  bookingId?: string; // If blocked after a specific trip
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const blockSchema = new Schema<IBlock>(
  {
    blockId: {
      type: String,
      required: true,
      unique: true,
      default: () => generateUserId('BLK'),
    },
    blockerId: {
      type: String,
      required: true,
      ref: 'User',
    },
    blockedId: {
      type: String,
      required: true,
      ref: 'User',
    },
    reason: {
      type: String,
      maxlength: 500,
    },
    reasonCategory: {
      type: String,
      enum: ['inappropriate_behavior', 'safety_concern', 'uncomfortable_experience', 'spam', 'other'],
    },
    bookingId: {
      type: String,
      ref: 'Booking',
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
blockSchema.index({ blockId: 1 }, { unique: true });
blockSchema.index({ blockerId: 1, blockedId: 1 }, { unique: true }); // Prevent duplicate blocks
blockSchema.index({ blockerId: 1, isActive: 1 });
blockSchema.index({ blockedId: 1, isActive: 1 });
blockSchema.index({ createdAt: -1 });

const Block: Model<IBlock> = mongoose.model<IBlock>('Block', blockSchema);

export default Block;
