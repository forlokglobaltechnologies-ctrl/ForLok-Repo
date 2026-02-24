import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISavedPlace extends Document {
  userId: string;
  label: 'home' | 'work' | 'custom';
  customLabel?: string;
  address: string;
  lat: number;
  lng: number;
  city?: string;
  state?: string;
  usageCount: number;
  lastUsedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const savedPlaceSchema = new Schema<ISavedPlace>(
  {
    userId: { type: String, required: true, index: true },
    label: { type: String, enum: ['home', 'work', 'custom'], required: true },
    customLabel: { type: String, maxlength: 50 },
    address: { type: String, required: true },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    city: { type: String },
    state: { type: String },
    usageCount: { type: Number, default: 0 },
    lastUsedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

savedPlaceSchema.index({ userId: 1, label: 1 });
savedPlaceSchema.index({ userId: 1, usageCount: -1 });

savedPlaceSchema.set('toJSON', {
  transform: (_doc: any, ret: any) => {
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

const SavedPlace: Model<ISavedPlace> = mongoose.model<ISavedPlace>('SavedPlace', savedPlaceSchema);
export default SavedPlace;
