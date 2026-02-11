import mongoose, { Schema, Document, Model } from 'mongoose';
import { OfferStatus, Location } from '../types';

export interface IRentalOffer extends Document {
  offerId: string;
  ownerId: string; // Reference to User or Company
  ownerName: string;
  ownerPhoto?: string;
  ownerType: 'individual' | 'company';
  rating: number;
  totalReviews: number;
  vehicle: {
    type: 'car' | 'bike';
    brand: string;
    year?: number;
    number: string;
    seats: number;
    fuel: 'Petrol' | 'Diesel' | 'Electric' | 'CNG';
    transmission: 'Manual' | 'Automatic';
    photos: string[];
  };
  location: Location;
  date: Date;
  availableFrom: string; // Time
  availableUntil: string; // Time
  pricePerHour: number;
  minimumHours: number;
  notes?: string;
  totalBookings: number;
  completed: number;
  cancelled: number;
  revenue: number;
  status: OfferStatus;
  createdAt: Date;
  updatedAt: Date;
}

const rentalOfferSchema = new Schema<IRentalOffer>(
  {
    offerId: {
      type: String,
      required: true,
      unique: true,
    },
    ownerId: {
      type: String,
      required: true,
    },
    ownerName: {
      type: String,
      required: true,
    },
    ownerPhoto: {
      type: String,
    },
    ownerType: {
      type: String,
      enum: ['individual', 'company'],
      required: true,
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
      year: Number,
      number: {
        type: String,
        required: true,
      },
      seats: {
        type: Number,
        required: true,
        min: 1,
      },
      fuel: {
        type: String,
        enum: ['Petrol', 'Diesel', 'Electric', 'CNG'],
        required: true,
      },
      transmission: {
        type: String,
        enum: ['Manual', 'Automatic'],
        required: true,
      },
      photos: [String],
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
    date: {
      type: Date,
      required: true,
      index: true,
    },
    availableFrom: {
      type: String,
      required: true,
    },
    availableUntil: {
      type: String,
      required: true,
    },
    pricePerHour: {
      type: Number,
      required: true,
      min: 0,
    },
    minimumHours: {
      type: Number,
      required: true,
      min: 1,
      default: 2,
    },
    notes: {
      type: String,
      maxlength: 500,
    },
    totalBookings: {
      type: Number,
      default: 0,
    },
    completed: {
      type: Number,
      default: 0,
    },
    cancelled: {
      type: Number,
      default: 0,
    },
    revenue: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['active', 'pending', 'expired', 'completed', 'cancelled', 'suspended', 'booked'],
      default: 'pending',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
rentalOfferSchema.index({ ownerId: 1, status: 1 });
rentalOfferSchema.index({ date: 1, status: 1 });
rentalOfferSchema.index({ 'location.lat': 1, 'location.lng': 1 });
rentalOfferSchema.index({ offerId: 1 }, { unique: true });
rentalOfferSchema.index({ createdAt: -1 });
rentalOfferSchema.index({ status: 1, date: 1 });
rentalOfferSchema.index({ ownerType: 1, status: 1 });

const RentalOffer: Model<IRentalOffer> = mongoose.model<IRentalOffer>(
  'RentalOffer',
  rentalOfferSchema
);

export default RentalOffer;
