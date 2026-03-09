import mongoose, { Document, Model, Schema } from 'mongoose';
import { generateUserId } from '../utils/helpers';

export interface IAdminRole extends Document {
  roleId: string;
  roleKey: string;
  name: string;
  description?: string;
  permissions: string[];
  isSystem: boolean;
  isActive: boolean;
  createdBy?: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const adminRoleSchema = new Schema<IAdminRole>(
  {
    roleId: {
      type: String,
      required: true,
      unique: true,
      default: () => generateUserId('ROL'),
    },
    roleKey: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 300,
    },
    permissions: {
      type: [String],
      default: [],
    },
    isSystem: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    createdBy: {
      type: String,
    },
    updatedBy: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

adminRoleSchema.index({ roleKey: 1 }, { unique: true });
adminRoleSchema.index({ isActive: 1, name: 1 });

const AdminRole: Model<IAdminRole> = mongoose.model<IAdminRole>('AdminRole', adminRoleSchema);

export default AdminRole;
