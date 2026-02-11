import mongoose, { Schema, Document, Model } from 'mongoose';
import { OfferStatus, Route } from '../types';

export interface IPoolingOffer extends Document {
  offerId: string;
  driverId: string; // Reference to User
  driverName: string;
  driverPhoto?: string;
  driverGender?: 'Male' | 'Female' | 'Other'; // Driver's gender for Pink Pooling filtering
  rating: number;
  totalReviews: number;
  route: Route;
  date: Date;
  time: string;
  vehicle: {
    type: 'car' | 'bike';
    brand: string;
    number: string;
    photos: string[];
  };
  availableSeats: number;
  totalSeats: number;
  price?: number; // Optional: Legacy price field (not used for dynamic pricing)
  notes?: string;
  isPinkPooling?: boolean; // Flag for Pink Pooling offers
  passengers: Array<{
    userId: string;
    name: string;
    status: 'pending' | 'confirmed' | 'cancelled';
  }>;
  status: OfferStatus;
  views: number;
  bookingRequests: number;
  createdAt: Date;
  updatedAt: Date;
}

const poolingOfferSchema = new Schema<IPoolingOffer>(
  {
    offerId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    driverId: {
      type: String,
      required: true,
      ref: 'User',
      index: true,
    },
    driverName: {
      type: String,
      required: true,
    },
    driverPhoto: {
      type: String,
    },
    driverGender: {
      type: String,
      enum: ['Male', 'Female', 'Other'],
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    totalReviews: {
      type: Number,
      default: 0,
    },
    route: {
      from: {
        address: { type: String, required: true },
        lat: { type: Number, required: true },
        lng: { type: Number, required: true },
        city: String,
        state: String,
      },
      to: {
        address: { type: String, required: true },
        lat: { type: Number, required: true },
        lng: { type: Number, required: true },
        city: String,
        state: String,
      },
      distance: Number, // in km
      duration: Number, // in minutes
      polyline: [{
        lat: Number,
        lng: Number,
        index: Number, // Sequential index in the polyline
      }], // Polyline coordinates for route matching
      roadSegments: [{
        roadId: String,
        roadName: String,
        roadRef: String,
        direction: { type: String, enum: ['forward', 'backward', 'bidirectional'] },
        estimatedTime: Date,
        lat: Number,
        lng: Number,
        segmentIndex: Number,
        distance: Number,
      }], // Road segments for road-aware matching
    },
    date: {
      type: Date,
      required: true,
    },
    time: {
      type: String,
      required: true,
    },
    vehicle: {
      type: {
        type: String,
        enum: ['car', 'bike'],
        required: true,
      },
      brand: {
        type: String,
        required: true,
      },
      number: {
        type: String,
        required: true,
      },
      photos: [String],
    },
    availableSeats: {
      type: Number,
      required: true,
      min: 0,
    },
    totalSeats: {
      type: Number,
      required: true,
      min: 1,
    },
    price: {
      type: Number,
      required: false,
      min: 0,
    },
    notes: {
      type: String,
      maxlength: 500,
    },
    isPinkPooling: {
      type: Boolean,
      default: false,
    },
    passengers: [
      {
        userId: {
          type: String,
          ref: 'User',
        },
        name: String,
        status: {
          type: String,
          enum: ['pending', 'confirmed', 'cancelled'],
          default: 'pending',
        },
      },
    ],
    status: {
      type: String,
      enum: ['active', 'pending', 'expired', 'completed', 'cancelled', 'suspended', 'booked'],
      default: 'pending',
    },
    views: {
      type: Number,
      default: 0,
    },
    bookingRequests: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
poolingOfferSchema.index({ driverId: 1, status: 1 });
poolingOfferSchema.index({ date: 1, status: 1 });
poolingOfferSchema.index({ 'route.from.lat': 1, 'route.from.lng': 1 });
poolingOfferSchema.index({ 'route.to.lat': 1, 'route.to.lng': 1 });
poolingOfferSchema.index({ offerId: 1 }, { unique: true });
poolingOfferSchema.index({ createdAt: -1 });
poolingOfferSchema.index({ status: 1, date: 1 });
poolingOfferSchema.index({ driverGender: 1 });

const PoolingOffer: Model<IPoolingOffer> = mongoose.model<IPoolingOffer>(
  'PoolingOffer',
  poolingOfferSchema
);

export default PoolingOffer;
