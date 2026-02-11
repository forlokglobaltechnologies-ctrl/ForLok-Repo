import mongoose, { Schema, Document, Model } from 'mongoose';
import { generateUserId } from '../utils/helpers';

export interface IReferralCode extends Document {
  referralId: string;
  userId: string;
  code: string;
  usedBy: Array<{
    userId: string;
    registeredAt: Date;
  }>;
  totalReferrals: number;
  totalCoinsEarned: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const referralCodeSchema = new Schema<IReferralCode>(
  {
    referralId: {
      type: String,
      required: true,
      unique: true,
      default: () => generateUserId('REF'),
    },
    userId: {
      type: String,
      required: true,
      unique: true,
      ref: 'User',
    },
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
    },
    usedBy: [
      {
        userId: { type: String, required: true },
        registeredAt: { type: Date, default: Date.now },
      },
    ],
    totalReferrals: {
      type: Number,
      default: 0,
    },
    totalCoinsEarned: {
      type: Number,
      default: 0,
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

referralCodeSchema.index({ code: 1 }, { unique: true });
referralCodeSchema.index({ userId: 1 }, { unique: true });

const ReferralCode: Model<IReferralCode> = mongoose.model<IReferralCode>('ReferralCode', referralCodeSchema);

export default ReferralCode;
