import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IMasterDataItem extends Document {
  type: string;
  key: string;
  label: string;
  value?: string;
  metadata?: Record<string, any>;
  sortOrder: number;
  isActive: boolean;
  createdBy?: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const masterDataItemSchema = new Schema<IMasterDataItem>(
  {
    type: { type: String, required: true, trim: true, lowercase: true, index: true },
    key: { type: String, required: true, trim: true, lowercase: true },
    label: { type: String, required: true, trim: true },
    value: { type: String, trim: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true, index: true },
    createdBy: { type: String, ref: 'Admin' },
    updatedBy: { type: String, ref: 'Admin' },
  },
  { timestamps: true }
);

masterDataItemSchema.index({ type: 1, key: 1 }, { unique: true });
masterDataItemSchema.index({ type: 1, isActive: 1, sortOrder: 1 });

const MasterDataItem: Model<IMasterDataItem> = mongoose.model<IMasterDataItem>(
  'MasterDataItem',
  masterDataItemSchema
);

export default MasterDataItem;

