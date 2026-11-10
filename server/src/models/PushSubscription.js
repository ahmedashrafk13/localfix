import mongoose from 'mongoose';

const { Schema } = mongoose;

// One row per browser that a user allowed to receive Web Push notifications.
const pushSubscriptionSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    endpoint: { type: String, required: true, unique: true, maxlength: 1000 },
    keys: {
      p256dh: { type: String, required: true, maxlength: 200 },
      auth: { type: String, required: true, maxlength: 100 },
    },
    userAgent: { type: String, maxlength: 300, default: '' },
    lastSuccessAt: Date,
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const PushSubscription = mongoose.model('PushSubscription', pushSubscriptionSchema);
