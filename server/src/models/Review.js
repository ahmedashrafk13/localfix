import mongoose from 'mongoose';

const { Schema } = mongoose;

const reviewSchema = new Schema(
  {
    request: { type: Schema.Types.ObjectId, ref: 'ServiceRequest', required: true, unique: true },
    provider: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    customer: { type: Schema.Types.ObjectId, ref: 'User' },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true, maxlength: 1000, default: '' },
    reply: {
      text: { type: String, trim: true, maxlength: 600 },
      at: Date,
    },
    hidden: { type: Boolean, default: false },
  },
  { timestamps: true }
);

reviewSchema.index({ provider: 1, createdAt: -1 });

export const Review = mongoose.model('Review', reviewSchema);
