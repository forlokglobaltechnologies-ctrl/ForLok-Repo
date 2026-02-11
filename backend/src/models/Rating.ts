import mongoose, { Schema, Document, Model } from 'mongoose';
import { ServiceType } from '../types';
import { generateUserId } from '../utils/helpers';

export interface IRating extends Document {
  ratingId: string;
  bookingId: string; // Reference to Booking
  userId: string; // User who gave the rating
  ratedUserId: string; // User/Driver/Owner who received the rating
  serviceType: ServiceType;
  ratingType: 'passenger_to_driver' | 'driver_to_passenger'; // Direction of rating
  overallRating: number; // 1-5
  punctuality?: number; // 1-5
  vehicleCondition?: number; // 1-5
  driving?: number; // 1-5
  behavior?: number; // 1-5 - for passenger behavior
  communication?: number; // 1-5
  service?: number; // 1-5
  comment?: string;
  tags?: string[]; // Quick tags like 'polite', 'on_time', 'clean_vehicle'
  isVisible: boolean; // Admin can hide inappropriate reviews
  createdAt: Date;
  updatedAt: Date;
}

const ratingSchema = new Schema<IRating>(
  {
    ratingId: {
      type: String,
      required: true,
      unique: true,
      default: () => generateUserId('RAT'),
    },
    bookingId: {
      type: String,
      required: true,
      ref: 'Booking',
    },
    userId: {
      type: String,
      required: true,
      ref: 'User',
    },
    ratedUserId: {
      type: String,
      required: true,
      ref: 'User',
    },
    serviceType: {
      type: String,
      enum: ['pooling', 'rental'],
      required: true,
    },
    ratingType: {
      type: String,
      enum: ['passenger_to_driver', 'driver_to_passenger'],
      required: true,
    },
    overallRating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    punctuality: {
      type: Number,
      min: 1,
      max: 5,
    },
    vehicleCondition: {
      type: Number,
      min: 1,
      max: 5,
    },
    driving: {
      type: Number,
      min: 1,
      max: 5,
    },
    behavior: {
      type: Number,
      min: 1,
      max: 5,
    },
    communication: {
      type: Number,
      min: 1,
      max: 5,
    },
    service: {
      type: Number,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      maxlength: 1000,
    },
    tags: {
      type: [String],
      default: [],
    },
    isVisible: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
ratingSchema.index({ ratingId: 1 }, { unique: true });
ratingSchema.index({ bookingId: 1, userId: 1 }, { unique: true }); // One rating per user per booking
ratingSchema.index({ userId: 1 });
ratingSchema.index({ ratedUserId: 1, serviceType: 1 });
ratingSchema.index({ ratedUserId: 1, ratingType: 1 });
ratingSchema.index({ createdAt: -1 });
ratingSchema.index({ isVisible: 1, ratedUserId: 1 });

const Rating: Model<IRating> = mongoose.model<IRating>('Rating', ratingSchema);

export default Rating;
