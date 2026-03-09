import mongoose, { Document, Model, Schema } from 'mongoose';
import { generateUserId } from '../utils/helpers';

export interface IAdminAuditLog extends Document {
  auditLogId: string;
  actorAdminId: string;
  action: string;
  entityType: 'role' | 'admin_user';
  entityId: string;
  entityLabel?: string;
  changes?: Record<string, any>;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const adminAuditLogSchema = new Schema<IAdminAuditLog>(
  {
    auditLogId: {
      type: String,
      required: true,
      unique: true,
      default: () => generateUserId('AUL'),
    },
    actorAdminId: {
      type: String,
      required: true,
      index: true,
    },
    action: {
      type: String,
      required: true,
      index: true,
    },
    entityType: {
      type: String,
      enum: ['role', 'admin_user'],
      required: true,
      index: true,
    },
    entityId: {
      type: String,
      required: true,
      index: true,
    },
    entityLabel: {
      type: String,
      trim: true,
    },
    changes: {
      type: Schema.Types.Mixed,
      default: undefined,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: undefined,
    },
  },
  {
    timestamps: true,
  }
);

adminAuditLogSchema.index({ createdAt: -1 });
adminAuditLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });

const AdminAuditLog: Model<IAdminAuditLog> = mongoose.model<IAdminAuditLog>(
  'AdminAuditLog',
  adminAuditLogSchema
);

export default AdminAuditLog;
