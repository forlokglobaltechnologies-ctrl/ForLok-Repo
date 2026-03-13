import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IPricingVehicleMileage extends Document {
  vehicleCategory: string;
  brand: string;
  vehicleModel: string;
  fuelType: string;
  transmission: string;
  launchYear?: number;
  vehicleAgeBucket?: string;
  realWorldMileageAvg?: number;
  mileageUnit?: string;
  estimatedCostPerKmInr?: number;
  cityTier?: string;
  trafficProfile?: string;
  confidenceScore?: number;
  pricingEligible?: string;
  fallbackLevel?: string;
  recordStatus?: string;
  source: 'manual' | 'migration';
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const pricingVehicleMileageSchema = new Schema<IPricingVehicleMileage>(
  {
    vehicleCategory: { type: String, required: true, trim: true },
    brand: { type: String, required: true, trim: true },
    vehicleModel: { type: String, required: true, trim: true },
    fuelType: { type: String, required: true, trim: true },
    transmission: { type: String, required: true, trim: true, default: 'Manual' },
    launchYear: { type: Number, min: 1900, max: 2100 },
    vehicleAgeBucket: { type: String, trim: true },
    realWorldMileageAvg: { type: Number, min: 0 },
    mileageUnit: { type: String, trim: true },
    estimatedCostPerKmInr: { type: Number, min: 0 },
    cityTier: { type: String, trim: true },
    trafficProfile: { type: String, trim: true },
    confidenceScore: { type: Number, min: 0, max: 100 },
    pricingEligible: { type: String, trim: true, default: 'Y' },
    fallbackLevel: { type: String, trim: true, default: 'model_exact' },
    recordStatus: { type: String, trim: true, default: 'active' },
    source: { type: String, enum: ['manual', 'migration'], default: 'manual' },
    updatedBy: { type: String, trim: true },
  },
  { timestamps: true }
);

pricingVehicleMileageSchema.index({
  vehicleCategory: 1,
  brand: 1,
    vehicleModel: 1,
  fuelType: 1,
  transmission: 1,
  vehicleAgeBucket: 1,
});

const PricingVehicleMileage: Model<IPricingVehicleMileage> = mongoose.model<IPricingVehicleMileage>(
  'PricingVehicleMileage',
  pricingVehicleMileageSchema
);

export default PricingVehicleMileage;
