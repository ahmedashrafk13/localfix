import mongoose from 'mongoose';

const { Schema } = mongoose;

export const REQUEST_STATUSES = ['open', 'assigned', 'completed', 'cancelled'];
export const URGENCIES = ['emergency', 'today', 'this_week', 'flexible'];

const serviceRequestSchema = new Schema(
  {
    customer: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    category: { type: Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
    title: { type: String, required: true, trim: true, minlength: 5, maxlength: 100 },
    description: { type: String, required: true, trim: true, minlength: 20, maxlength: 2000 },
    images: { type: [String], default: [] },
    location: {
      city: { type: String, required: true, trim: true, maxlength: 60 },
      area: { type: String, required: true, trim: true, maxlength: 60 },
      // Exact address: only shown to the owner, the selected provider and admins.
      address: { type: String, trim: true, maxlength: 200, default: '' },
      point: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number], required: true },
      },
    },
    budget: {
      min: { type: Number, min: 0 },
      max: { type: Number, min: 0 },
    },
    urgency: { type: String, enum: URGENCIES, default: 'today' },
    preferredDate: Date,
    status: { type: String, enum: REQUEST_STATUSES, default: 'open', index: true },
    acceptedOffer: { type: Schema.Types.ObjectId, ref: 'Offer' },
    assignedProvider: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    offerCount: { type: Number, default: 0 },
    lowestOffer: { type: Number },
    firstOfferAt: Date,
    assignedAt: Date,
    providerMarkedDoneAt: Date,
    completedAt: Date,
    cancelledAt: Date,
    cancelReason: { type: String, maxlength: 300, default: '' },
    reviewed: { type: Boolean, default: false },
    views: { type: Number, default: 0 },
    removed: { type: Boolean, default: false, index: true },
    removedReason: { type: String, maxlength: 300, default: '' },
  },
  { timestamps: true }
);

serviceRequestSchema.index({ 'location.point': '2dsphere' });
serviceRequestSchema.index({ status: 1, category: 1, createdAt: -1 });
serviceRequestSchema.index({ 'location.city': 1, status: 1 });

export const ServiceRequest = mongoose.model('ServiceRequest', serviceRequestSchema);
