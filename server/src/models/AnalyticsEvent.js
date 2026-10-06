import mongoose from 'mongoose';

const { Schema } = mongoose;

export const ANALYTICS_TYPES = ['page_view', 'search', 'signup', 'request_posted', 'offer_sent', 'offer_accepted'];

// Anonymous usage analytics: no IP address or user id is stored, only the role of the visitor.
const analyticsEventSchema = new Schema(
  {
    type: { type: String, enum: ANALYTICS_TYPES, required: true },
    path: { type: String, maxlength: 200, default: '' },
    query: { type: String, maxlength: 100, default: '' },
    role: { type: String, enum: ['guest', 'customer', 'provider', 'admin'], default: 'guest' },
    day: { type: String, required: true }, // YYYY-MM-DD, for cheap daily grouping
    createdAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

analyticsEventSchema.index({ type: 1, day: 1 });
analyticsEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 180 });

export const AnalyticsEvent = mongoose.model('AnalyticsEvent', analyticsEventSchema);
