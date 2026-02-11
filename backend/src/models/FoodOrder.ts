import mongoose, { Schema, Document, Model } from 'mongoose';
import { Location, PaymentMethod } from '../types';
import { generateBookingId } from '../utils/helpers';

export interface IFoodOrder extends Document {
  orderId: string;
  orderNumber: string;
  userId: string; // Reference to User
  foodId: string; // Reference to Food
  vendorId: string; // Reference to User (vendor)
  quantity: number;
  price: number;
  totalAmount: number;
  deliveryFee: number;
  platformFee: number;
  finalAmount: number;
  deliveryLocation: Location;
  paymentMethod: PaymentMethod;
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  paymentId?: string; // Reference to Payment
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'out_for_delivery' | 'delivered' | 'cancelled';
  estimatedDeliveryTime?: Date;
  deliveredAt?: Date;
  cancellationReason?: string;
  cancelledBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const foodOrderSchema = new Schema<IFoodOrder>(
  {
    orderId: {
      type: String,
      required: true,
      unique: true,
      default: () => generateBookingId(),
    },
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      default: () => generateBookingId(),
    },
    userId: {
      type: String,
      required: true,
      ref: 'User',
    },
    foodId: {
      type: String,
      required: true,
      ref: 'Food',
    },
    vendorId: {
      type: String,
      required: true,
      ref: 'User',
      index: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    deliveryFee: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    platformFee: {
      type: Number,
      required: true,
      min: 0,
    },
    finalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    deliveryLocation: {
      address: {
        type: String,
        required: true,
      },
      lat: {
        type: Number,
        required: true,
      },
      lng: {
        type: Number,
        required: true,
      },
      city: String,
      state: String,
      pincode: String,
    },
    paymentMethod: {
      type: String,
      enum: ['upi', 'card', 'wallet', 'net_banking', 'cash'],
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending',
    },
    paymentId: {
      type: String,
      ref: 'Payment',
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled'],
      default: 'pending',
    },
    estimatedDeliveryTime: {
      type: Date,
    },
    deliveredAt: {
      type: Date,
    },
    cancellationReason: {
      type: String,
    },
    cancelledBy: {
      type: String,
      enum: ['user', 'vendor', 'admin'],
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
foodOrderSchema.index({ orderId: 1 }, { unique: true });
foodOrderSchema.index({ orderNumber: 1 }, { unique: true });
foodOrderSchema.index({ userId: 1, status: 1 });
foodOrderSchema.index({ vendorId: 1, status: 1 });
foodOrderSchema.index({ foodId: 1 });
foodOrderSchema.index({ status: 1, createdAt: -1 });
foodOrderSchema.index({ paymentStatus: 1 });
foodOrderSchema.index({ createdAt: -1 });

const FoodOrder: Model<IFoodOrder> = mongoose.model<IFoodOrder>('FoodOrder', foodOrderSchema);

export default FoodOrder;
