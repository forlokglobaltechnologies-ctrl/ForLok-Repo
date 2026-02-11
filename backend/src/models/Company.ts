import mongoose, { Schema, Document, Model } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface ICompany extends Document {
  companyId: string;
  userId: string; // Reference to User model
  companyName: string;
  registrationNumber: string;
  businessType: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  contactNumber: string;
  email: string;
  username: string;
  password: string;
  gstNumber?: string;
  documents: {
    registrationCertificate?: string;
    gstCertificate?: string;
    businessLicense?: string;
  };
  vehicles: mongoose.Types.ObjectId[]; // References to Vehicle model
  totalVehicles: number;
  totalBookings: number;
  totalEarnings: number;
  averageRating: number;
  isVerified: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const companySchema = new Schema<ICompany>(
  {
    companyId: {
      type: String,
      required: true,
      unique: true,
      // Will be set manually during registration to use LKC format
    },
    userId: {
      type: String,
      required: true,
      ref: 'User',
    },
    companyName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    registrationNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    businessType: {
      type: String,
      required: true,
      trim: true,
    },
    address: {
      type: String,
      required: true,
      trim: true,
    },
    city: {
      type: String,
      required: true,
      trim: true,
    },
    state: {
      type: String,
      required: true,
      trim: true,
    },
    pincode: {
      type: String,
      required: true,
      trim: true,
      match: [/^\d{6}$/, 'Invalid pincode - must be exactly 6 digits'],
    },
    contactNumber: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
      select: false,
    },
    gstNumber: {
      type: String,
      trim: true,
      uppercase: true,
    },
    documents: {
      registrationCertificate: String,
      gstCertificate: String,
      businessLicense: String,
    },
    vehicles: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Vehicle',
      },
    ],
    totalVehicles: {
      type: Number,
      default: 0,
    },
    totalBookings: {
      type: Number,
      default: 0,
    },
    totalEarnings: {
      type: Number,
      default: 0,
    },
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    isVerified: {
      type: Boolean,
      default: false,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (_doc, ret) {
        delete (ret as any).password;
        delete (ret as any).__v;
        return ret;
      },
    },
  }
);

// Hash password before saving
companySchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

// Compare password method
companySchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  if (!this.password) {
    return false;
  }
  return bcrypt.compare(candidatePassword, this.password);
};

// Indexes
companySchema.index({ registrationNumber: 1 }, { unique: true });
companySchema.index({ email: 1 }, { unique: true });
companySchema.index({ username: 1 }, { unique: true });
companySchema.index({ userId: 1 });
companySchema.index({ companyId: 1 }, { unique: true });
companySchema.index({ createdAt: -1 });
companySchema.index({ isVerified: 1, isActive: 1 });

const Company: Model<ICompany> = mongoose.model<ICompany>('Company', companySchema);

export default Company;
