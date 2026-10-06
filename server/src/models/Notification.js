import mongoose from 'mongoose';

const { Schema } = mongoose;

export const NOTIFICATION_TYPES = [
  'new_request',
  'new_offer',
  'offer_updated',
  'offer_withdrawn',
  'offer_accepted',
  'offer_rejected',
  'message',
  'request_cancelled',
  'job_done',
  'job_completed',
  'review',
  'verification',
  'account',
  'report',
  'system',
];

const notificationSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: NOTIFICATION_TYPES, default: 'system' },
    title: { type: String, required: true, maxlength: 140 },
    body: { type: String, maxlength: 400, default: '' },
    link: { type: String, maxlength: 200, default: '' },
    read: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ user: 1, read: 1 });

export const Notification = mongoose.model('Notification', notificationSchema);
