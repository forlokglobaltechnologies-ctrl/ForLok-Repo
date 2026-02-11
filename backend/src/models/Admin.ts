import mongoose, { Schema, Document, Model } from 'mongoose';
import bcrypt from 'bcryptjs';
import { generateUserId } from '../utils/helpers';

export interface IAdmin extends Document {
  adminId: string;
  username: string;
  email: string;
  password: string;
  name: string;
  role: 'super_admin' | 'admin' | 'moderator';
  permissions: string[];
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const adminSchema = new Schema<IAdmin>(
  {
    adminId: {
      type: String,
      required: true,
      unique: true,
      default: () => generateUserId('ADM'),
    },
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
      select: false,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ['super_admin', 'admin', 'moderator'],
      default: 'admin',
      index: true,
    },
    permissions: [
      {
        type: String,
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    lastLogin: {
      type: Date,
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
adminSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
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
adminSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// Indexes
adminSchema.index({ adminId: 1 }, { unique: true });
adminSchema.index({ username: 1 }, { unique: true });
adminSchema.index({ email: 1 }, { unique: true });
adminSchema.index({ role: 1, isActive: 1 });
adminSchema.index({ createdAt: -1 });

const Admin: Model<IAdmin> = mongoose.model<IAdmin>('Admin', adminSchema);

export default Admin;
