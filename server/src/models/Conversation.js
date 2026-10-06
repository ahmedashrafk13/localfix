import mongoose from 'mongoose';

const { Schema } = mongoose;

const conversationSchema = new Schema(
  {
    request: { type: Schema.Types.ObjectId, ref: 'ServiceRequest', required: true },
    customer: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    provider: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    lastMessage: {
      text: { type: String, default: '' },
      sender: { type: Schema.Types.ObjectId, ref: 'User' },
      at: Date,
    },
    unreadCustomer: { type: Number, default: 0 },
    unreadProvider: { type: Number, default: 0 },
  },
  { timestamps: true }
);

conversationSchema.index({ request: 1, provider: 1 }, { unique: true });

export const Conversation = mongoose.model('Conversation', conversationSchema);
