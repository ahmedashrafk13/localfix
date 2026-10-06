import mongoose from 'mongoose';

const { Schema } = mongoose;

const tipSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 140 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 160 },
    excerpt: { type: String, trim: true, maxlength: 300, default: '' },
    // Plain text. Blank lines separate paragraphs, lines starting with "## " are subheadings,
    // lines starting with "- " are list items.
    body: { type: String, required: true, maxlength: 20_000 },
    cover: { type: String, default: '' },
    category: { type: Schema.Types.ObjectId, ref: 'Category' },
    author: { type: Schema.Types.ObjectId, ref: 'User' },
    published: { type: Boolean, default: true },
    publishedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

tipSchema.index({ published: 1, publishedAt: -1 });

export const Tip = mongoose.model('Tip', tipSchema);
