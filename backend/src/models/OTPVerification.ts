import mongoose, { Schema, Document, Model } from 'mongoose';
import { OTPType } from '../types';

export interface IOTPVerification extends Document {
  phone?: string;
  email?: string;
  otp: string;
  type: OTPType;
  expiresAt: Date;
  attempts: number;
  verified: boolean;
  verifiedAt?: Date;
  createdAt: Date;
}

const otpVerificationSchema = new Schema<IOTPVerification>(
  {
    phone: {
      type: String,
      required: false,
    },
    email: {
      type: String,
      required: false,
      lowercase: true,
    },
    otp: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['signup', 'login', 'reset_password', 'verify_phone', 'verify_email'],
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      expires: 0, // TTL index - auto delete after expiresAt
    },
    attempts: {
      type: Number,
      default: 0,
      max: 5,
    },
    verified: {
      type: Boolean,
      default: false,
      index: true,
    },
    verifiedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
otpVerificationSchema.index({ phone: 1, type: 1, verified: 1 });
otpVerificationSchema.index({ email: 1, type: 1, verified: 1 });
otpVerificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index
otpVerificationSchema.index({ createdAt: -1 });

// Validation: either phone or email must be provided
otpVerificationSchema.pre('validate', function (next) {
  if (!this.phone && !this.email) {
    return next(new Error('Either phone or email must be provided'));
  }
  next();
});

const OTPVerification: Model<IOTPVerification> = mongoose.model<IOTPVerification>(
  'OTPVerification',
  otpVerificationSchema
);

export default OTPVerification;
