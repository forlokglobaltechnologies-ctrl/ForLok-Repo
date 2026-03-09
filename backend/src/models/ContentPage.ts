import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IContentPage extends Document {
  key: string;
  title: string;
  description?: string;
  payload: Record<string, any>;
  isPublished: boolean;
  version: number;
  createdBy?: string;
  updatedBy?: string;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const contentPageSchema = new Schema<IContentPage>(
  {
    key: { type: String, required: true, unique: true, trim: true, lowercase: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    payload: { type: Schema.Types.Mixed, default: {} },
    isPublished: { type: Boolean, default: true, index: true },
    version: { type: Number, default: 1 },
    createdBy: { type: String, ref: 'Admin' },
    updatedBy: { type: String, ref: 'Admin' },
    publishedAt: { type: Date },
  },
  { timestamps: true }
);

contentPageSchema.index({ key: 1 }, { unique: true });
contentPageSchema.index({ isPublished: 1 });

const ContentPage: Model<IContentPage> = mongoose.model<IContentPage>('ContentPage', contentPageSchema);
export default ContentPage;

