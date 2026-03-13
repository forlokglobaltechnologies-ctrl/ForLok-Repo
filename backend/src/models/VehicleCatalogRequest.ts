import mongoose, { Document, Model, Schema } from 'mongoose';

export type VehicleCatalogRequestStatus = 'pending' | 'approved' | 'rejected';

export interface IVehicleCatalogRequest extends Document {
  requestId: string;
  userId: string;
  vehicleType: 'car' | 'bike' | 'scooty';
  brand: string;
  vehicleModel: string;
  fuelType: string;
  transmission?: string;
  launchYear?: number;
  realWorldMileageAvg?: number;
  mileageUnit?: string;
  estimatedCostPerKmInr?: number;
  cityTier?: string;
  notes?: string;
  status: VehicleCatalogRequestStatus;
  adminReviewNote?: string;
  reviewedBy?: string;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const vehicleCatalogRequestSchema = new Schema<IVehicleCatalogRequest>(
  {
    requestId: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    vehicleType: { type: String, enum: ['car', 'bike', 'scooty'], required: true, index: true },
    brand: { type: String, required: true, trim: true },
    vehicleModel: { type: String, required: true, trim: true },
    fuelType: { type: String, required: true, trim: true },
    transmission: { type: String, trim: true },
    launchYear: { type: Number, min: 1900, max: 2100 },
    realWorldMileageAvg: { type: Number, min: 0 },
    mileageUnit: { type: String, trim: true },
    estimatedCostPerKmInr: { type: Number, min: 0 },
    cityTier: { type: String, trim: true },
    notes: { type: String, trim: true },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    adminReviewNote: { type: String, trim: true },
    reviewedBy: { type: String, trim: true, index: true },
    reviewedAt: { type: Date },
  },
  { timestamps: true }
);

vehicleCatalogRequestSchema.index({ status: 1, createdAt: -1 });

const VehicleCatalogRequest: Model<IVehicleCatalogRequest> = mongoose.model<IVehicleCatalogRequest>(
  'VehicleCatalogRequest',
  vehicleCatalogRequestSchema
);

export default VehicleCatalogRequest;
