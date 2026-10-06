import mongoose from 'mongoose';

const { Schema } = mongoose;

export const REPORT_TARGETS = ['user', 'request', 'message', 'review'];
export const REPORT_REASONS = ['spam', 'fraud', 'abusive', 'inappropriate', 'fake', 'no_show', 'other'];

const reportSchema = new Schema(
  {
    reporter: { type: Schema.Types.ObjectId, ref: 'User' },
    targetType: { type: String, enum: REPORT_TARGETS, required: true },
    targetId: { type: Schema.Types.ObjectId, required: true },
    targetLabel: { type: String, maxlength: 200, default: '' },
    reason: { type: String, enum: REPORT_REASONS, required: true },
    details: { type: String, trim: true, maxlength: 1000, default: '' },
    status: { type: String, enum: ['open', 'resolved', 'dismissed'], default: 'open', index: true },
    resolutionNote: { type: String, maxlength: 500, default: '' },
    handledBy: { type: Schema.Types.ObjectId, ref: 'User' },
    handledAt: Date,
  },
  { timestamps: true }
);

reportSchema.index({ targetType: 1, targetId: 1 });

export const Report = mongoose.model('Report', reportSchema);
