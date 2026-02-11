import mongoose, { Schema, Document, Model } from 'mongoose';
import { generateUserId } from '../utils/helpers';

export interface IRefund extends Document {
  refundId: string;
  bookingId: string;
  paymentId?: string;
  userId: string; // User who was charged (canceller)
  driverId?: string; // Driver involved
  paymentType: 'cancellation'; // New: only cancellation records (no refunds since no upfront payment)
  originalAmount: number; // Original ride amount
  refundAmount: number; // Always 0 in new model (no upfront payment to refund)
  cancellationFee: number; // Fee deducted from wallet
  refundPercentage: number;
  driverCompensation: number;
  platformFee: number; // Cancellation fee goes to platform
  cancelledBy: 'user' | 'driver' | 'owner' | 'admin' | 'system';
  cancellationReason?: string;
  hoursBeforeTrip: number;
  refundMethod: 'wallet_debit' | 'none'; // Simplified: only wallet debit or none (1st cancel free)
  status: 'pending' | 'processing' | 'completed' | 'failed';
  processedAt?: Date;
  failureReason?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const refundSchema = new Schema<IRefund>(
  {
    refundId: {
      type: String,
      required: true,
      unique: true,
      default: () => generateUserId('RFD'),
    },
    bookingId: {
      type: String,
      required: true,
      ref: 'Booking',
    },
    paymentId: {
      type: String,
      ref: 'Payment',
    },
    userId: {
      type: String,
      required: true,
      ref: 'User',
    },
    driverId: {
      type: String,
      ref: 'User',
    },
    paymentType: {
      type: String,
      enum: ['cancellation'],
      default: 'cancellation',
    },
    originalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    refundAmount: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    cancellationFee: {
      type: Number,
      required: true,
      min: 0,
    },
    refundPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    driverCompensation: {
      type: Number,
      default: 0,
      min: 0,
    },
    platformFee: {
      type: Number,
      default: 0,
      min: 0,
    },
    cancelledBy: {
      type: String,
      enum: ['user', 'driver', 'owner', 'admin', 'system'],
      required: true,
    },
    cancellationReason: {
      type: String,
      maxlength: 500,
    },
    hoursBeforeTrip: {
      type: Number,
      required: true,
    },
    refundMethod: {
      type: String,
      enum: ['wallet_debit', 'none'],
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending',
    },
    processedAt: {
      type: Date,
    },
    failureReason: {
      type: String,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
refundSchema.index({ refundId: 1 }, { unique: true });
refundSchema.index({ bookingId: 1 });
refundSchema.index({ userId: 1, status: 1 });
refundSchema.index({ driverId: 1 });
refundSchema.index({ status: 1, createdAt: -1 });
refundSchema.index({ createdAt: -1 });

const Refund: Model<IRefund> = mongoose.model<IRefund>('Refund', refundSchema);

export default Refund;
