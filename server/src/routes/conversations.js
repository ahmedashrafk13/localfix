import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { env } from '../config/env.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { Conversation, Message, Offer, ServiceRequest, User } from '../models/index.js';
import { postMessage } from '../services/marketplace.js';
import { notify } from '../services/notify.js';
import { emitToUser, isOnline } from '../socket/index.js';
import { assertObjectId, badRequest, forbidden, isObjectId, notFound, sameId } from '../utils/http.js';
import { providerCard, serializeCategory, serializeMessage, serializeOffer, userSummary } from '../utils/serialize.js';

const router = Router();
router.use(requireAuth);

const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  skip: () => env.isTest,
  message: { error: { message: 'You are sending messages too quickly. Please wait a moment.' } },
});

const PROVIDER_FIELDS = 'name avatar role city area createdAt lastSeenAt phone provider';

function role(conv, user) {
  if (sameId(conv.customer, user._id)) return 'customer';
  if (sameId(conv.provider, user._id)) return 'provider';
  return null;
}

function serializeConversation(c, user) {
  const me = role(c, user);
  const other = me === 'customer' ? c.provider : c.customer;
  const r = c.request;
  return {
    id: c._id.toString(),
    myRole: me,
    other: other?._id
      ? {
          ...(me === 'customer' ? providerCard(other) : userSummary(other, { fullName: r?.assignedProvider && sameId(r.assignedProvider, user._id) })),
          online: isOnline(other._id),
          lastSeenAt: other.lastSeenAt || null,
        }
      : { id: null, name: 'Deleted user', avatar: '', role: 'deleted', online: false },
    request: r?._id
      ? { id: r._id.toString(), title: r.title, status: r.status, category: serializeCategory(r.category), area: r.location?.area }
      : null,
    lastMessage: c.lastMessage?.at ? { text: c.lastMessage.text, sender: c.lastMessage.sender?.toString() || null, at: c.lastMessage.at } : null,
    unread: me === 'customer' ? c.unreadCustomer : c.unreadProvider,
    updatedAt: c.updatedAt,
  };
}

const populateConv = [
  { path: 'customer', select: 'name avatar role lastSeenAt createdAt' },
  { path: 'provider', select: PROVIDER_FIELDS },
  { path: 'request', select: 'title status category location.area assignedProvider customer', populate: { path: 'category' } },
];

router.get('/', async (req, res) => {
  const convs = await Conversation.find({ $or: [{ customer: req.user._id }, { provider: req.user._id }] })
    .sort({ updatedAt: -1 })
    .limit(100)
    .populate(populateConv);
  const items = convs.map((c) => serializeConversation(c, req.user));
  res.json({ items, unreadTotal: items.reduce((n, c) => n + (c.unread || 0), 0) });
});

const startSchema = z.object({
  requestId: z.string().refine(isObjectId, 'Invalid request.'),
  providerId: z.string().refine(isObjectId, 'Invalid provider.').optional(),
});

/**
 * Opens (or returns the existing) chat for a request.
 * - Customer: must pass providerId of someone who has made an offer on their request.
 * - Provider: chats with the customer of an open request (to ask questions before bidding),
 *   or of a request they were assigned to.
 */
router.post('/', validate(startSchema), async (req, res) => {
  const r = await ServiceRequest.findById(req.body.requestId).select('customer status assignedProvider removed title');
  if (!r || r.removed) throw notFound('Request not found.');

  let customerId;
  let providerId;
  if (req.user.role === 'customer') {
    if (!sameId(r.customer, req.user._id)) throw forbidden();
    if (!req.body.providerId) throw badRequest('Choose a provider to message.');
    const hasOffer = await Offer.exists({ request: r._id, provider: req.body.providerId });
    if (!hasOffer) throw forbidden('You can message providers who have sent an offer on this request.');
    customerId = req.user._id;
    providerId = req.body.providerId;
  } else if (req.user.role === 'provider') {
    if (req.user.provider?.verification?.status !== 'verified') throw forbidden('Your account must be verified before you can message customers.');
    const assignedToMe = r.assignedProvider && sameId(r.assignedProvider, req.user._id);
    const hasOffer = await Offer.exists({ request: r._id, provider: req.user._id });
    if (r.status !== 'open' && !assignedToMe && !hasOffer) throw forbidden('This request is no longer open.');
    customerId = r.customer;
    providerId = req.user._id;
  } else {
    throw forbidden();
  }

  const other = await User.findById(req.user.role === 'customer' ? providerId : customerId).select('status');
  if (!other || other.status !== 'active') throw badRequest('This user is not available.');

  const conv = await Conversation.findOneAndUpdate(
    { request: r._id, provider: providerId },
    { $setOnInsert: { request: r._id, provider: providerId, customer: customerId } },
    { upsert: true, new: true }
  ).populate(populateConv);
  res.status(201).json({ conversation: serializeConversation(conv, req.user) });
});

async function loadConversation(req) {
  assertObjectId(req.params.id, 'Conversation');
  const conv = await Conversation.findById(req.params.id).populate(populateConv);
  if (!conv || !role(conv, req.user)) throw notFound('Conversation not found.');
  return conv;
}

router.get('/:id', async (req, res) => {
  const conv = await loadConversation(req);
  const offer = await Offer.findOne({ request: conv.request?._id, provider: conv.provider?._id }).populate('provider', PROVIDER_FIELDS);
  res.json({ conversation: serializeConversation(conv, req.user), offer: offer ? serializeOffer(offer) : null });
});

router.get('/:id/messages', async (req, res) => {
  const conv = await loadConversation(req);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 30));
  const filter = { conversation: conv._id };
  const before = req.query.before ? new Date(String(req.query.before)) : null;
  if (before && !Number.isNaN(before.getTime())) filter.createdAt = { $lt: before };
  const docs = await Message.find(filter).sort({ createdAt: -1 }).limit(limit + 1).lean();
  const hasMore = docs.length > limit;
  res.json({ items: docs.slice(0, limit).reverse().map(serializeMessage), hasMore });
});

router.post('/:id/messages', chatLimiter, validate(z.object({ text: z.string().trim().min(1, 'Type a message.').max(2000) })), async (req, res) => {
  const conv = await loadConversation(req);
  const me = role(conv, req.user);
  const otherId = me === 'customer' ? conv.provider?._id : conv.customer?._id;
  if (!otherId) throw badRequest('The other person has left LocalFix.');
  const wasUnread = me === 'customer' ? conv.unreadProvider : conv.unreadCustomer;

  const { msg } = await postMessage({ _id: conv._id, customer: conv.customer._id, provider: conv.provider._id }, { sender: req.user._id, text: req.body.text });

  // One notification per burst of unread messages, not one per message.
  if (!wasUnread) {
    await notify(otherId, {
      type: 'message',
      title: `New message from ${req.user.name}`,
      body: req.body.text.slice(0, 140),
      link: `/messages/${conv._id}`,
    });
  }
  res.status(201).json({ message: serializeMessage(msg) });
});

router.post('/:id/read', async (req, res) => {
  const conv = await loadConversation(req);
  const me = role(conv, req.user);
  const now = new Date();
  await Promise.all([
    Conversation.updateOne({ _id: conv._id }, { $set: me === 'customer' ? { unreadCustomer: 0 } : { unreadProvider: 0 } }),
    Message.updateMany({ conversation: conv._id, sender: { $ne: req.user._id }, readAt: null }, { $set: { readAt: now } }),
  ]);
  const otherId = me === 'customer' ? conv.provider?._id : conv.customer?._id;
  emitToUser(otherId, 'conversation:read', { conversationId: conv._id.toString(), readAt: now, by: req.user._id.toString() });
  res.json({ ok: true });
});

export default router;
