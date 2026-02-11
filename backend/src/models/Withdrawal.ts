import mongoose, { Schema, Document, Model } from 'mongoose';
import { generateUserId } from '../utils/helpers';

export interface IWithdrawal extends Document {
  withdrawalId: string;
  userId: string; // Reference to User
  amount: number;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  paymentMethod: 'bank' | 'upi';
  bankAccount?: {
    accountNumber: string;
    ifscCode: string;
    accountHolderName: string;
    bankName: string;
  };
  upiId?: string;
  requestedAt: Date;
  approvedAt?: Date;
  completedAt?: Date;
  rejectedAt?: Date;
  rejectionReason?: string;
  adminId?: string; // Reference to Admin
  transactionId?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const withdrawalSchema = new Schema<IWithdrawal>(
  {
    withdrawalId: {
      type: String,
      required: true,
      unique: true,
      default: () => generateUserId('WD'),
    },
    userId: {
      type: String,
      required: true,
      ref: 'User',
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'completed'],
      default: 'pending',
      index: true,
    },
    paymentMethod: {
      type: String,
      enum: ['bank', 'upi'],
      required: true,
    },
    bankAccount: {
      accountNumber: {
        type: String,
      },
      ifscCode: {
        type: String,
      },
      accountHolderName: {
        type: String,
      },
      bankName: {
        type: String,
      },
    },
    upiId: {
      type: String,
    },
    requestedAt: {
      type: Date,
      default: Date.now,
    },
    approvedAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
    rejectedAt: {
      type: Date,
    },
    rejectionReason: {
      type: String,
    },
    adminId: {
      type: String,
      ref: 'Admin',
    },
    transactionId: {
      type: String,
    },
    notes: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
withdrawalSchema.index({ userId: 1, status: 1 });
withdrawalSchema.index({ status: 1, requestedAt: -1 });
withdrawalSchema.index({ withdrawalId: 1 }, { unique: true });
withdrawalSchema.index({ createdAt: -1 });

const Withdrawal: Model<IWithdrawal> = mongoose.model<IWithdrawal>('Withdrawal', withdrawalSchema);

export default Withdrawal;
