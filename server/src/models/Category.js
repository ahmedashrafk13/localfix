import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60, unique: true },
    slug: { type: String, required: true, trim: true, lowercase: true, maxlength: 60, unique: true },
    icon: { type: String, trim: true, maxlength: 40, default: 'Wrench' },
    description: { type: String, trim: true, maxlength: 300, default: '' },
    image: { type: String, default: '' },
    active: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const Category = mongoose.model('Category', categorySchema);
