import mongoose, { Schema, Document, Model } from 'mongoose';
import { Location } from '../types';

export interface IFood extends Document {
  foodId: string;
  vendorId: string; // Reference to User (vendor)
  vendorName: string;
  vendorPhoto?: string;
  name: string;
  category: 'tiffin' | 'lunch' | 'dinner' | 'breakfast' | 'snacks';
  description: string;
  price: number;
  image?: string;
  location: Location;
  availableFrom: string; // Time (HH:mm)
  availableUntil: string; // Time (HH:mm)
  isAvailable: boolean;
  rating: number;
  totalReviews: number;
  totalOrders: number;
  preparationTime: number; // in minutes
  cuisine?: string; // Indian, Chinese, etc.
  isVeg: boolean;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const foodSchema = new Schema<IFood>(
  {
    foodId: {
      type: String,
      required: true,
      unique: true,
    },
    vendorId: {
      type: String,
      required: true,
      ref: 'User',
    },
    vendorName: {
      type: String,
      required: true,
    },
    vendorPhoto: {
      type: String,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      enum: ['tiffin', 'lunch', 'dinner', 'breakfast', 'snacks'],
      required: true,
    },
    description: {
      type: String,
      required: true,
      maxlength: 500,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    image: {
      type: String,
    },
    location: {
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
    availableFrom: {
      type: String,
      required: true,
    },
    availableUntil: {
      type: String,
      required: true,
    },
    isAvailable: {
      type: Boolean,
      default: true,
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
    totalOrders: {
      type: Number,
      default: 0,
    },
    preparationTime: {
      type: Number,
      required: true,
      min: 5,
      default: 30, // minutes
    },
    cuisine: {
      type: String,
      trim: true,
    },
    isVeg: {
      type: Boolean,
      default: true,
    },
    tags: [String],
  },
  {
    timestamps: true,
  }
);

// Indexes
foodSchema.index({ foodId: 1 }, { unique: true });
foodSchema.index({ vendorId: 1, category: 1 });
foodSchema.index({ category: 1, isAvailable: 1 });
foodSchema.index({ 'location.lat': 1, 'location.lng': 1 }); // Geospatial index
foodSchema.index({ createdAt: -1 });
foodSchema.index({ rating: -1, totalReviews: -1 }); // For sorting by popularity

const Food: Model<IFood> = mongoose.model<IFood>('Food', foodSchema);

export default Food;
