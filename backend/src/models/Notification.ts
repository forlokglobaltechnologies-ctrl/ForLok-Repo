import mongoose, { Schema, Document, Model } from 'mongoose';
import { NotificationType } from '../types';

export interface INotification extends Document {
  notificationId: string;
  userId: string; // Reference to User
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>; // Additional data
  read: boolean;
  actionRequired: boolean;
  actionUrl?: string;
  createdAt: Date;
  readAt?: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    notificationId: {
      type: String,
      required: true,
      unique: true,
    },
    userId: {
      type: String,
      required: true,
      ref: 'User',
    },
    type: {
      type: String,
      enum: [
        'booking_request',
        'booking_confirmed',
        'booking_cancelled',
        'payment_required',
        'payment_received',
        'payment_completed',
        'rating_request',
        'document_verified',
        'document_rejected',
        'coin_earned',
        'coin_redeemed',
        'referral_reward',
        'milestone_achieved',
        'promo_approved',
        'promo_rejected',
        'sos_alert',
        'feedback_acknowledged',
        'feedback_resolved',
        'feedback_response',
        'feedback_archived',
      ],
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    data: {
      type: Schema.Types.Mixed,
    },
    read: {
      type: Boolean,
      default: false,
    },
    actionRequired: {
      type: Boolean,
      default: false,
    },
    actionUrl: {
      type: String,
    },
    readAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
notificationSchema.index({ notificationId: 1 }, { unique: true });
notificationSchema.index({ userId: 1, read: 1 });
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ type: 1 });
notificationSchema.index({ createdAt: -1 });

// TTL index - auto delete after 90 days
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 }); // 90 days

const Notification: Model<INotification> = mongoose.model<INotification>(
  'Notification',
  notificationSchema
);

export default Notification;
