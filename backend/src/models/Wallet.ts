import mongoose, { Schema, Document, Model } from 'mongoose';
import { generateUserId } from '../utils/helpers';

export interface IWalletTransaction {
  transactionId: string;
  type: 'credit' | 'debit';
  amount: number;
  reason: 'top_up' | 'ride_earning' | 'ride_payment' | 'cancellation_fee' | 'withdrawal' | 'refund' | 'promo' | 'cashback';
  description?: string;
  bookingId?: string;
  referenceId?: string;
  balanceAfter: number;
  createdAt: Date;
}

export interface IWallet extends Document {
  walletId: string;
  userId: string;
  balance: number; // Can be negative (from cancellation fees)
  currency: 'INR';
  isActive: boolean;
  transactions: IWalletTransaction[];
  totalCredits: number;
  totalDebits: number;
  createdAt: Date;
  updatedAt: Date;
}

const walletTransactionSchema = new Schema<IWalletTransaction>(
  {
    transactionId: {
      type: String,
      required: true,
      default: () => generateUserId('WTX'),
    },
    type: {
      type: String,
      enum: ['credit', 'debit'],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    reason: {
      type: String,
      enum: ['top_up', 'ride_earning', 'ride_payment', 'cancellation_fee', 'withdrawal', 'refund', 'promo', 'cashback'],
      required: true,
    },
    description: {
      type: String,
      maxlength: 500,
    },
    bookingId: {
      type: String,
      ref: 'Booking',
    },
    referenceId: {
      type: String,
    },
    balanceAfter: {
      type: Number,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const walletSchema = new Schema<IWallet>(
  {
    walletId: {
      type: String,
      required: true,
      unique: true,
      default: () => generateUserId('WAL'),
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
      // No min: 0 — balance CAN go negative (e.g., from cancellation fees)
    },
    currency: {
      type: String,
      default: 'INR',
      enum: ['INR'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    transactions: {
      type: [walletTransactionSchema],
      default: [],
    },
    totalCredits: {
      type: Number,
      default: 0,
    },
    totalDebits: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
walletSchema.index({ walletId: 1 }, { unique: true });
walletSchema.index({ userId: 1 }, { unique: true });
walletSchema.index({ 'transactions.createdAt': -1 });

// Method to check if user can book a ride (passenger needs >= ₹100)
walletSchema.methods.canBookRide = function (): boolean {
  return this.balance >= 100;
};

// Method to check if wallet has sufficient balance for a specific amount
walletSchema.methods.hasSufficientBalance = function (amount: number): boolean {
  return this.balance >= amount;
};

const Wallet: Model<IWallet> = mongoose.model<IWallet>('Wallet', walletSchema);

export default Wallet;
