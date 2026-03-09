import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAdminSetting extends Document {
  key: string;
  value: Record<string, any>;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const adminSettingSchema = new Schema<IAdminSetting>(
  {
    key: { type: String, required: true, unique: true, trim: true, lowercase: true },
    value: { type: Schema.Types.Mixed, default: {} },
    updatedBy: { type: String, ref: 'Admin' },
  },
  { timestamps: true }
);

adminSettingSchema.index({ key: 1 }, { unique: true });

const AdminSetting: Model<IAdminSetting> = mongoose.model<IAdminSetting>('AdminSetting', adminSettingSchema);
export default AdminSetting;

