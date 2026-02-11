import mongoose, { Schema, Document, Model } from 'mongoose';
import { PaymentStatus, PaymentMethod } from '../types';

export interface IPayment extends Document {
  paymentId: string;
  bookingId: string; // Reference to Booking
  userId: string; // Reference to User (passenger who pays)
  driverId?: string; // Reference to User (driver who earns)
  amount: number; // Ride amount (driver's share)
  platformFee: number; // Platform fee (10%)
  totalAmount: number; // Total amount passenger pays (amount + platformFee)
  paymentMethod: PaymentMethod; // How passenger paid at trip end
  paymentType: 'ride_payment' | 'wallet_top_up'; // Type of payment
  status: PaymentStatus;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  transactionId?: string;
  failureReason?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new Schema<IPayment>(
  {
    paymentId: {
      type: String,
      required: true,
      unique: true,
    },
    bookingId: {
      type: String,
      ref: 'Booking',
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
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    platformFee: {
      type: Number,
      required: true,
      min: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentMethod: {
      type: String,
      enum: ['upi', 'card', 'wallet', 'net_banking', 'offline_cash'],
      required: true,
      index: true,
    },
    paymentType: {
      type: String,
      enum: ['ride_payment', 'wallet_top_up'],
      default: 'ride_payment',
    },
    status: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending',
    },
    razorpayOrderId: {
      type: String,
    },
    razorpayPaymentId: {
      type: String,
    },
    razorpaySignature: {
      type: String,
    },
    transactionId: {
      type: String,
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
paymentSchema.index({ paymentId: 1 }, { unique: true });
paymentSchema.index({ bookingId: 1 });
paymentSchema.index({ userId: 1, status: 1 });
paymentSchema.index({ driverId: 1 });
paymentSchema.index({ status: 1, createdAt: -1 });
paymentSchema.index({ razorpayOrderId: 1 });
paymentSchema.index({ razorpayPaymentId: 1 });
paymentSchema.index({ paymentType: 1 });
paymentSchema.index({ createdAt: -1 });

const Payment: Model<IPayment> = mongoose.model<IPayment>('Payment', paymentSchema);

export default Payment;
