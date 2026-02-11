import mongoose, { Schema, Document, Model } from 'mongoose';
import { generateUserId } from '../utils/helpers';

export interface IPromoSubmission extends Document {
  submissionId: string;
  userId: string;
  platform: 'instagram_story' | 'instagram_reel' | 'youtube_short';
  proofUrl: string;
  proofScreenshot?: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewNote?: string;
  coinsAwarded: number;
  createdAt: Date;
  reviewedAt?: Date;
  updatedAt: Date;
}

const promoSubmissionSchema = new Schema<IPromoSubmission>(
  {
    submissionId: {
      type: String,
      required: true,
      unique: true,
      default: () => generateUserId('PRM'),
    },
    userId: {
      type: String,
      required: true,
      ref: 'User',
    },
    platform: {
      type: String,
      enum: ['instagram_story', 'instagram_reel', 'youtube_short'],
      required: true,
    },
    proofUrl: {
      type: String,
      required: true,
    },
    proofScreenshot: {
      type: String,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    reviewedBy: {
      type: String,
    },
    reviewNote: {
      type: String,
      maxlength: 500,
    },
    coinsAwarded: {
      type: Number,
      default: 0,
    },
    reviewedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

promoSubmissionSchema.index({ userId: 1 });
promoSubmissionSchema.index({ status: 1 });
promoSubmissionSchema.index({ createdAt: -1 });

const PromoSubmission: Model<IPromoSubmission> = mongoose.model<IPromoSubmission>('PromoSubmission', promoSubmissionSchema);

export default PromoSubmission;
