import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ITripLocation extends Document {
  bookingId: string;
  driverId: string;
  location: {
    lat: number;
    lng: number;
    address?: string;
    city?: string;
    state?: string;
  };
  heading?: number;
  speed?: number;
  accuracy?: number;
  timestamp: Date;
  createdAt: Date;
  updatedAt: Date;
}

const tripLocationSchema = new Schema<ITripLocation>(
  {
    bookingId: {
      type: String,
      required: true,
      ref: 'Booking',
      index: true,
    },
    driverId: {
      type: String,
      required: true,
      ref: 'User',
      index: true,
    },
    location: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
      address: { type: String },
      city: { type: String },
      state: { type: String },
    },
    heading: { type: Number, min: 0, max: 360 },
    speed: { type: Number, min: 0 },
    accuracy: { type: Number, min: 0 },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

tripLocationSchema.index({ bookingId: 1, timestamp: -1 });
tripLocationSchema.index({ driverId: 1, timestamp: -1 });
tripLocationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 * 7 });

const TripLocation: Model<ITripLocation> = mongoose.model<ITripLocation>('TripLocation', tripLocationSchema);

export default TripLocation;
