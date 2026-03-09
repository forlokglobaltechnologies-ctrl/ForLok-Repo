import mongoose, { Schema, Document, Model } from 'mongoose';
import { FeedbackType, FeedbackStatus, FeedbackPriority } from '../types';

export interface IFeedback extends Document {
  feedbackId: string;
  userId: string; // Reference to User
  type: FeedbackType;
  subject: string;
  description: string;
  priority: FeedbackPriority;
  status: FeedbackStatus;
  adminResponse?: string;
  respondedBy?: string; // Admin userId
  respondedAt?: Date;
  assignedTo?: string;
  timeline: Array<{
    action: string;
    fromStatus?: FeedbackStatus;
    toStatus?: FeedbackStatus;
    message?: string;
    actorId?: string;
    createdAt: Date;
  }>;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const feedbackSchema = new Schema<IFeedback>(
  {
    feedbackId: {
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
      enum: ['issue', 'suggestion', 'complaint'],
      required: true,
    },
    subject: {
      type: String,
      required: true,
      maxlength: 200,
    },
    description: {
      type: String,
      required: true,
      maxlength: 2000,
    },
    priority: {
      type: String,
      enum: ['high', 'medium', 'low'],
      default: 'medium',
    },
    status: {
      type: String,
      enum: ['pending', 'acknowledged', 'resolved', 'archived'],
      default: 'pending',
    },
    adminResponse: {
      type: String,
      maxlength: 1000,
    },
    respondedBy: {
      type: String,
      ref: 'Admin',
    },
    respondedAt: {
      type: Date,
    },
    assignedTo: {
      type: String,
      ref: 'Admin',
    },
    timeline: {
      type: [
        {
          action: { type: String, required: true },
          fromStatus: {
            type: String,
            enum: ['pending', 'acknowledged', 'resolved', 'archived'],
          },
          toStatus: {
            type: String,
            enum: ['pending', 'acknowledged', 'resolved', 'archived'],
          },
          message: { type: String },
          actorId: { type: String },
          createdAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
feedbackSchema.index({ feedbackId: 1 }, { unique: true });
feedbackSchema.index({ userId: 1, status: 1 });
feedbackSchema.index({ status: 1, priority: 1 });
feedbackSchema.index({ type: 1, status: 1 });
feedbackSchema.index({ createdAt: -1 });

const Feedback: Model<IFeedback> = mongoose.model<IFeedback>('Feedback', feedbackSchema);

export default Feedback;
