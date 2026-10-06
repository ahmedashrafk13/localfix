import mongoose from 'mongoose';

const { Schema } = mongoose;

export const OFFER_STATUSES = ['pending', 'accepted', 'rejected', 'withdrawn'];

const historySchema = new Schema(
  {
    price: Number,
    etaMinutes: Number,
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const offerSchema = new Schema(
  {
    request: { type: Schema.Types.ObjectId, ref: 'ServiceRequest', required: true, index: true },
    provider: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    price: { type: Number, required: true, min: 100, max: 5_000_000 },
    etaMinutes: { type: Number, required: true, min: 5, max: 10_080 },
    details: { type: String, required: true, trim: true, minlength: 10, maxlength: 1000 },
    warrantyDays: { type: Number, min: 0, max: 365, default: 0 },
    includesMaterials: { type: Boolean, default: false },
    status: { type: String, enum: OFFER_STATUSES, default: 'pending', index: true },
    history: { type: [historySchema], default: [] },
    acceptedAt: Date,
    withdrawnAt: Date,
  },
  { timestamps: true }
);

// One offer document per provider per request. Withdrawing and re-submitting reuses it.
offerSchema.index({ request: 1, provider: 1 }, { unique: true });

export const Offer = mongoose.model('Offer', offerSchema);
