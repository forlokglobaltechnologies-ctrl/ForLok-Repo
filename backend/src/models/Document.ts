import mongoose, { Schema, Document as MongooseDocument, Model } from 'mongoose';
import { DocumentType, DocumentStatus } from '../types';

export interface IDocument extends MongooseDocument {
  documentId: string;
  userId: string; // Reference to User
  companyId?: string; // Reference to Company (for company documents)
  type: DocumentType;
  status: DocumentStatus;
  url?: string; // Cloudinary URL (optional - not needed for number-only verification)
  publicId?: string; // Cloudinary public ID (optional)
  documentNumber?: string; // Document number (Aadhaar/PAN/DL) for number-only verification
  verificationData?: {
    verified: boolean;
    verifiedAt?: Date;
    verifiedBy?: string;
    rejectionReason?: string;
    idfyTaskId?: string;
  };
  metadata?: {
    originalName?: string;
    mimeType?: string;
    size?: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const documentSchema = new Schema<IDocument>(
  {
    documentId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: String,
      required: true,
      ref: 'User',
      index: true,
    },
    companyId: {
      type: String,
      ref: 'Company',
      index: true,
    },
    type: {
      type: String,
      enum: [
        'aadhar_front',
        'aadhar_back',
        'driving_license_front',
        'driving_license_back',
        'vehicle_front',
        'vehicle_back',
        'vehicle_side',
        'vehicle_interior',
        'vehicle_insurance',
        'vehicle_registration',
        'vehicle_pollution',
        'taxi_service_papers',
        'user_photo',
        'company_registration',
        'gst_certificate',
        'business_license',
      ],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'verified', 'rejected', 'under_review'],
      default: 'pending',
      index: true,
    },
    url: {
      type: String,
      // Optional - only required for documents that need image storage
    },
    publicId: {
      type: String,
      // Optional - only required for documents that need image storage
    },
    documentNumber: {
      type: String,
      // For number-only verification (Aadhaar, PAN, DL)
    },
    verificationData: {
      verified: {
        type: Boolean,
        default: false,
      },
      verifiedAt: Date,
      verifiedBy: String,
      rejectionReason: String,
      idfyTaskId: String,
    },
    metadata: {
      originalName: String,
      mimeType: String,
      size: Number,
      dob: String, // For Driving License
      state: String, // For Driving License
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
documentSchema.index({ documentId: 1 }, { unique: true });
documentSchema.index({ userId: 1, type: 1 });
documentSchema.index({ companyId: 1, type: 1 });
documentSchema.index({ status: 1, type: 1 });
documentSchema.index({ createdAt: -1 });

const Document: Model<IDocument> = mongoose.model<IDocument>('Document', documentSchema);

export default Document;
