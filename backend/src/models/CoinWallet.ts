import mongoose, { Schema, Document, Model } from 'mongoose';
import { generateUserId } from '../utils/helpers';

export interface ICoinTransaction {
  transactionId: string;
  type: 'earn' | 'redeem';
  amount: number;
  reason:
    | 'signup_bonus'
    | 'referral'
    | 'ride_completion'
    | 'promo_reward'
    | 'milestone'
    | 'ride_discount'
    | 'expired';
  description?: string;
  referenceId?: string;
  expiresAt?: Date;
  createdAt: Date;
}

export interface ICoinWallet extends Document {
  coinWalletId: string;
  userId: string;
  balance: number;
  totalEarned: number;
  totalRedeemed: number;
  transactions: ICoinTransaction[];
  createdAt: Date;
  updatedAt: Date;
}

const coinTransactionSchema = new Schema<ICoinTransaction>(
  {
    transactionId: {
      type: String,
      required: true,
      default: () => generateUserId('CTX'),
    },
    type: {
      type: String,
      enum: ['earn', 'redeem'],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    reason: {
      type: String,
      enum: [
        'signup_bonus',
        'referral',
        'ride_completion',
        'promo_reward',
        'milestone',
        'ride_discount',
        'expired',
      ],
      required: true,
    },
    description: {
      type: String,
      maxlength: 500,
    },
    referenceId: {
      type: String,
    },
    expiresAt: {
      type: Date,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const coinWalletSchema = new Schema<ICoinWallet>(
  {
    coinWalletId: {
      type: String,
      required: true,
      unique: true,
      default: () => generateUserId('CWL'),
    },
    userId: {
      type: String,
      required: true,
      unique: true,
      ref: 'User',
    },
    balance: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalEarned: {
      type: Number,
      default: 0,
    },
    totalRedeemed: {
      type: Number,
      default: 0,
    },
    transactions: {
      type: [coinTransactionSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

coinWalletSchema.index({ coinWalletId: 1 }, { unique: true });
coinWalletSchema.index({ userId: 1 }, { unique: true });
coinWalletSchema.index({ 'transactions.createdAt': -1 });

const CoinWallet: Model<ICoinWallet> = mongoose.model<ICoinWallet>('CoinWallet', coinWalletSchema);

export default CoinWallet;
