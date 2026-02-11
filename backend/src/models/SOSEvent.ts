import mongoose, { Schema, Document, Model } from 'mongoose';
import { generateUserId } from '../utils/helpers';

export interface ISOSEvent extends Document {
  sosId: string;
  userId: string;
  bookingId?: string;
  passengerLocation: {
    lat: number;
    lng: number;
    address?: string;
  };
  driverLocation?: {
    lat: number;
    lng: number;
  };
  status: 'triggered' | 'resolved' | 'false_alarm';
  notifiedEmails: string[];
  resolvedAt?: Date;
  resolvedBy?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const sosEventSchema = new Schema<ISOSEvent>(
  {
    sosId: {
      type: String,
      required: true,
      unique: true,
      default: () => generateUserId('SOS'),
    },
    userId: {
      type: String,
      required: true,
      ref: 'User',
    },
    bookingId: {
      type: String,
      ref: 'Booking',
    },
    passengerLocation: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
      address: { type: String },
    },
    driverLocation: {
      lat: { type: Number },
      lng: { type: Number },
    },
    status: {
      type: String,
      enum: ['triggered', 'resolved', 'false_alarm'],
      default: 'triggered',
    },
    notifiedEmails: [{ type: String }],
    resolvedAt: { type: Date },
    resolvedBy: { type: String },
    notes: { type: String },
  },
  {
    timestamps: true,
  }
);

// Indexes
sosEventSchema.index({ userId: 1, createdAt: -1 });
sosEventSchema.index({ sosId: 1 }, { unique: true });
sosEventSchema.index({ bookingId: 1 });
sosEventSchema.index({ status: 1 });

const SOSEvent: Model<ISOSEvent> = mongoose.model<ISOSEvent>('SOSEvent', sosEventSchema);

export default SOSEvent;
