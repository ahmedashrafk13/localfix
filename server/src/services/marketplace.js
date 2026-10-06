import mongoose from 'mongoose';
import { Conversation } from '../models/Conversation.js';
import { Message } from '../models/Message.js';
import { Offer } from '../models/Offer.js';
import { Review } from '../models/Review.js';
import { ServiceRequest } from '../models/ServiceRequest.js';
import { User } from '../models/User.js';
import { emitToUser } from '../socket/index.js';
import { serializeMessage } from '../utils/serialize.js';

/** Keeps the denormalised offer counters on a request in sync with its live (pending/accepted) offers. */
export async function refreshOfferStats(requestId) {
  const [stats] = await Offer.aggregate([
    { $match: { request: new mongoose.Types.ObjectId(String(requestId)), status: { $in: ['pending', 'accepted'] } } },
    { $group: { _id: null, count: { $sum: 1 }, lowest: { $min: '$price' } } },
  ]);
  const first = await Offer.findOne({ request: requestId }).sort({ createdAt: 1 }).select('createdAt').lean();
  await ServiceRequest.updateOne(
    { _id: requestId },
    {
      $set: {
        offerCount: stats?.count || 0,
        ...(stats?.lowest !== undefined ? { lowestOffer: stats.lowest } : {}),
        ...(first ? { firstOfferAt: first.createdAt } : {}),
      },
      ...(stats ? {} : { $unset: { lowestOffer: 1 } }),
    }
  );
}

/** Recomputes a provider's average rating from visible reviews. */
export async function refreshProviderRating(providerId) {
  const [stats] = await Review.aggregate([
    { $match: { provider: new mongoose.Types.ObjectId(String(providerId)), hidden: false } },
    { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  await User.updateOne(
    { _id: providerId },
    { $set: { 'provider.ratingAvg': stats ? Math.round(stats.avg * 100) / 100 : 0, 'provider.ratingCount': stats?.count || 0 } }
  );
}

export async function refreshJobsCompleted(providerId) {
  const count = await ServiceRequest.countDocuments({ assignedProvider: providerId, status: 'completed' });
  await User.updateOne({ _id: providerId }, { $set: { 'provider.jobsCompleted': count } });
}

/**
 * Adds a message to a conversation, updates unread counters and pushes it to both participants.
 * kind "system" is used for automatic notes such as "Offer updated to Rs 4,500".
 */
export async function postMessage(conversation, { sender = null, text, kind = 'text' }) {
  const msg = await Message.create({ conversation: conversation._id, sender, text, kind });
  const senderIsCustomer = sender && conversation.customer.toString() === sender.toString();
  const senderIsProvider = sender && conversation.provider.toString() === sender.toString();
  const inc = {};
  if (!senderIsCustomer) inc.unreadCustomer = 1;
  if (!senderIsProvider) inc.unreadProvider = 1;
  const updated = await Conversation.findByIdAndUpdate(
    conversation._id,
    { $set: { lastMessage: { text: text.slice(0, 160), sender, at: msg.createdAt } }, $inc: inc },
    { new: true }
  ).lean();
  const payload = {
    message: serializeMessage(msg),
    conversation: {
      id: updated._id.toString(),
      lastMessage: { text: updated.lastMessage.text, sender: sender ? sender.toString() : null, at: updated.lastMessage.at },
      unreadCustomer: updated.unreadCustomer,
      unreadProvider: updated.unreadProvider,
    },
  };
  emitToUser(conversation.customer, 'message:new', payload);
  emitToUser(conversation.provider, 'message:new', payload);
  return { msg, conversation: updated };
}

/** Posts a system note into the conversation between a request's customer and a provider, if one exists. */
export async function systemNote(requestId, providerId, text) {
  const conv = await Conversation.findOne({ request: requestId, provider: providerId });
  if (conv) await postMessage(conv, { text, kind: 'system' });
}

export function formatPKR(amount) {
  return `Rs ${Math.round(amount).toLocaleString('en-PK')}`;
}

export function formatEta(mins) {
  if (mins < 60) return `${mins} min`;
  if (mins < 60 * 24) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m ? `${h} h ${m} min` : `${h} h`;
  }
  const d = Math.round(mins / (60 * 24));
  return `${d} day${d === 1 ? '' : 's'}`;
}
