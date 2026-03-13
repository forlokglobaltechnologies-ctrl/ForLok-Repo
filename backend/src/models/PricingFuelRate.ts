import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IPricingFuelRate extends Document {
  cityKey: string;
  city: string;
  state?: string;
  cityTier?: string;
  petrol?: number;
  diesel?: number;
  cng?: number;
  electricity?: number;
  trafficProfile?: string;
  source: 'manual' | 'scrape_mypetrolprice' | 'migration';
  effectiveDate: string;
  isActive: boolean;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const pricingFuelRateSchema = new Schema<IPricingFuelRate>(
  {
    cityKey: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, trim: true },
    cityTier: { type: String, trim: true, default: 'mixed' },
    petrol: { type: Number, min: 0 },
    diesel: { type: Number, min: 0 },
    cng: { type: Number, min: 0 },
    electricity: { type: Number, min: 0 },
    trafficProfile: { type: String, trim: true, default: 'medium' },
    source: {
      type: String,
      enum: ['manual', 'scrape_mypetrolprice', 'migration'],
      default: 'manual',
      index: true,
    },
    effectiveDate: { type: String, default: () => new Date().toISOString().slice(0, 10) },
    isActive: { type: Boolean, default: true, index: true },
    updatedBy: { type: String, trim: true },
  },
  { timestamps: true }
);

pricingFuelRateSchema.index({ city: 1 });

const PricingFuelRate: Model<IPricingFuelRate> = mongoose.model<IPricingFuelRate>(
  'PricingFuelRate',
  pricingFuelRateSchema
);

export default PricingFuelRate;
