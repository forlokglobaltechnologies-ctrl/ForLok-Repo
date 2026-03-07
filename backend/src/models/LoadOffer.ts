import mongoose, { Schema, Document, Model } from 'mongoose';
import { LoadOfferStatus, LoadOfferType, ParcelCategory } from '../types';
import { generateUserId } from '../utils/helpers';

export interface ILoadOffer extends Document {
  loadOfferId: string;
  offerType: LoadOfferType;
  status: LoadOfferStatus;
  senderId: string;
  senderName: string;
  senderPhone: string;
  assignedDriverId?: string;
  assignedDriverName?: string;
  assignedDriverPhone?: string;
  pickup: {
    address: string;
    lat: number;
    lng: number;
    city?: string;
    state?: string;
  };
  drop: {
    address: string;
    lat: number;
    lng: number;
    city?: string;
    state?: string;
  };
  parcel: {
    category: ParcelCategory;
    description?: string;
    weightKg: number;
    fragile: boolean;
    dimensionsCm?: {
      length: number;
      width: number;
      height: number;
    };
    declaredValue?: number;
  };
  receiver: {
    name: string;
    phone: string;
    alternatePhone?: string;
  };
  fareEstimate: {
    amount: number;
    platformFee: number;
    totalAmount: number;
  };
  pickupOtp?: string;
  dropOtp?: string;
  pickupOtpVerifiedAt?: Date;
  dropOtpVerifiedAt?: Date;
  pickupReachedAt?: Date;
  pickedUpAt?: Date;
  dropReachedAt?: Date;
  deliveredAt?: Date;
  scheduleAt?: Date;
  expiresAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const loadOfferSchema = new Schema<ILoadOffer>(
  {
    loadOfferId: {
      type: String,
      required: true,
      unique: true,
      default: () => generateUserId('LO'),
      index: true,
    },
    offerType: {
      type: String,
      enum: ['instant', 'offer'],
      required: true,
      default: 'instant',
      index: true,
    },
    status: {
      type: String,
      enum: ['open', 'accepted', 'cancelled', 'completed', 'expired'],
      required: true,
      default: 'open',
      index: true,
    },
    senderId: {
      type: String,
      required: true,
      index: true,
    },
    senderName: {
      type: String,
      required: true,
    },
    senderPhone: {
      type: String,
      required: true,
    },
    assignedDriverId: {
      type: String,
      index: true,
    },
    assignedDriverName: String,
    assignedDriverPhone: String,
    pickup: {
      address: { type: String, required: true },
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
      city: String,
      state: String,
    },
    drop: {
      address: { type: String, required: true },
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
      city: String,
      state: String,
    },
    parcel: {
      category: {
        type: String,
        enum: ['documents', 'food', 'fragile', 'electronics', 'other'],
        required: true,
      },
      description: String,
      weightKg: {
        type: Number,
        required: true,
        min: 0.1,
      },
      fragile: {
        type: Boolean,
        default: false,
      },
      dimensionsCm: {
        length: Number,
        width: Number,
        height: Number,
      },
      declaredValue: {
        type: Number,
        min: 0,
      },
    },
    receiver: {
      name: { type: String, required: true },
      phone: { type: String, required: true },
      alternatePhone: String,
    },
    fareEstimate: {
      amount: { type: Number, required: true, min: 0 },
      platformFee: { type: Number, required: true, min: 0 },
      totalAmount: { type: Number, required: true, min: 0 },
    },
    pickupOtp: String,
    dropOtp: String,
    pickupOtpVerifiedAt: Date,
    dropOtpVerifiedAt: Date,
    pickupReachedAt: Date,
    pickedUpAt: Date,
    dropReachedAt: Date,
    deliveredAt: Date,
    scheduleAt: Date,
    expiresAt: Date,
    notes: {
      type: String,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
  }
);

loadOfferSchema.index({ senderId: 1, createdAt: -1 });
loadOfferSchema.index({ assignedDriverId: 1, createdAt: -1 });
loadOfferSchema.index({ status: 1, createdAt: -1 });
loadOfferSchema.index({ 'pickup.lat': 1, 'pickup.lng': 1 });
loadOfferSchema.index({ 'drop.lat': 1, 'drop.lng': 1 });

const LoadOffer: Model<ILoadOffer> = mongoose.model<ILoadOffer>('LoadOffer', loadOfferSchema);

export default LoadOffer;
