import mongoose from 'mongoose';

// Small key/value store for server-generated configuration (for example the Web Push key pair).
const settingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, maxlength: 80 },
    value: { type: mongoose.Schema.Types.Mixed, required: true },
  },
  { timestamps: true }
);

export const Setting = mongoose.model('Setting', settingSchema);
