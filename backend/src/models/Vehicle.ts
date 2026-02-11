import mongoose, { Schema, Document, Model } from 'mongoose';
import { VehicleType } from '../types';

export interface IVehicle extends Document {
  vehicleId: string;
  userId?: string; // For individual users
  companyId?: string; // For company users
  type: VehicleType;
  brand: string;
  vehicleModel?: string;
  year?: number;
  color?: string;
  number: string; // Vehicle registration number
  plateType?: 'white' | 'yellow' | 'green';
  seats: number;
  fuelType: 'Petrol' | 'Diesel' | 'Electric' | 'CNG';
  transmission: 'Manual' | 'Automatic';
  photos: {
    front?: string;
    back?: string;
    side?: string;
    interior?: string;
  };
  documents: {
    registrationCertificate?: string;
    insurance?: string;
    pollutionCertificate?: string;
    taxiServicePapers?: string;
  };
  insuranceExpiry?: Date;
  status: 'active' | 'inactive' | 'under_maintenance';
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const vehicleSchema = new Schema<IVehicle>(
  {
    vehicleId: {
      type: String,
      required: true,
      unique: true,
    },
    userId: {
      type: String,
      ref: 'User',
    },
    companyId: {
      type: String,
      ref: 'Company',
    },
    type: {
      type: String,
      enum: ['car', 'bike'],
      required: true,
      index: true,
    },
    brand: {
      type: String,
      required: true,
      trim: true,
    },
    vehicleModel: {
      type: String,
      trim: true,
    },
    year: {
      type: Number,
      min: 1900,
      max: new Date().getFullYear() + 1,
    },
    color: {
      type: String,
      trim: true,
    },
    number: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    plateType: {
      type: String,
      enum: ['white', 'yellow', 'green'],
    },
    seats: {
      type: Number,
      required: true,
      min: 1,
      max: 50,
    },
    fuelType: {
      type: String,
      enum: ['Petrol', 'Diesel', 'Electric', 'CNG'],
      required: true,
    },
    transmission: {
      type: String,
      enum: ['Manual', 'Automatic'],
      required: true,
    },
    photos: {
      front: String,
      back: String,
      side: String,
      interior: String,
    },
    documents: {
      registrationCertificate: String,
      insurance: String,
      pollutionCertificate: String,
      taxiServicePapers: String,
    },
    insuranceExpiry: {
      type: Date,
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'under_maintenance'],
      default: 'active',
      index: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
vehicleSchema.index({ number: 1 }, { unique: true });
vehicleSchema.index({ userId: 1 });
vehicleSchema.index({ companyId: 1 });
vehicleSchema.index({ type: 1, status: 1 });
vehicleSchema.index({ vehicleId: 1 }, { unique: true });
vehicleSchema.index({ createdAt: -1 });

// Ensure either userId or companyId is present
vehicleSchema.pre('validate', function (next) {
  if (!this.userId && !this.companyId) {
    next(new Error('Either userId or companyId must be provided'));
  } else {
    next();
  }
});

const Vehicle: Model<IVehicle> = mongoose.model<IVehicle>('Vehicle', vehicleSchema);

export default Vehicle;
