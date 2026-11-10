import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { imageUpload, removeUpload, saveImage } from '../middleware/upload.js';
import { validate } from '../middleware/validate.js';
import {
  Conversation,
  Message,
  Notification,
  Offer,
  PushSubscription,
  Report,
  Review,
  ServiceRequest,
  User,
} from '../models/index.js';
import { refreshOfferStats } from '../services/marketplace.js';
import { notify } from '../services/notify.js';
import { disconnectUser } from '../socket/index.js';
import { badRequest } from '../utils/http.js';
import { selfUser } from '../utils/serialize.js';
import { clearSessionCookie } from '../utils/tokens.js';

const router = Router();
router.use(requireAuth);

const profileSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  phone: z.string().trim().regex(/^\+?[0-9\s-]{10,16}$/, 'Enter a valid phone number.').optional(),
  city: z.string().trim().min(2).max(60).optional(),
  area: z.string().trim().max(60).optional(),
});

router.patch('/me', validate(profileSchema), async (req, res) => {
  Object.assign(req.user, req.body);
  await req.user.save();
  res.json({ user: selfUser(req.user) });
});

router.post('/me/avatar', imageUpload.single('avatar'), async (req, res) => {
  if (!req.file) throw badRequest('Choose an image to upload.');
  const url = await saveImage(req.file, 'avatars', { maxWidth: 400, square: true });
  const previous = req.user.avatar;
  req.user.avatar = url;
  await req.user.save();
  await removeUpload(previous);
  res.json({ user: selfUser(req.user) });
});

/** Data export (privacy): everything we hold about the signed-in user, as JSON. */
router.get('/me/export', async (req, res) => {
  const id = req.user._id;
  const [requests, offers, reviewsWritten, reviewsReceived, conversations, notifications] = await Promise.all([
    ServiceRequest.find({ customer: id }).lean(),
    Offer.find({ provider: id }).lean(),
    Review.find({ customer: id }).lean(),
    Review.find({ provider: id }).lean(),
    Conversation.find({ $or: [{ customer: id }, { provider: id }] }).lean(),
    Notification.find({ user: id }).lean(),
  ]);
  const messages = await Message.find({ conversation: { $in: conversations.map((c) => c._id) }, sender: id }).lean();
  res.setHeader('Content-Disposition', `attachment; filename="localfix-data-${id}.json"`);
  res.json({
    exportedAt: new Date(),
    account: selfUser(req.user),
    requests,
    offers,
    reviewsWritten,
    reviewsReceived,
    conversations,
    messagesSent: messages,
    notifications,
  });
});

/**
 * Account deletion (privacy requirement). Open requests and pending offers are withdrawn, personal
 * files are removed, and the account document is deleted. Completed-job history and reviews stay so
 * other users' records remain accurate, but they now show "Deleted user".
 */
router.delete('/me', validate(z.object({ password: z.string().min(1, 'Enter your password to confirm.') })), async (req, res) => {
  const user = await User.findById(req.user._id).select('+passwordHash');
  if (user.role === 'admin') throw badRequest('Admin accounts cannot be deleted from the app.');
  if (!(await user.comparePassword(req.body.password))) throw badRequest('Incorrect password.', { password: 'Incorrect password.' });

  const id = user._id;

  // Customer side: cancel open/assigned requests and tell affected providers.
  const active = await ServiceRequest.find({ customer: id, status: { $in: ['open', 'assigned'] } });
  for (const r of active) {
    const offers = await Offer.find({ request: r._id, status: { $in: ['pending', 'accepted'] } }).select('provider');
    await Offer.updateMany({ request: r._id, status: 'pending' }, { $set: { status: 'rejected' } });
    r.status = 'cancelled';
    r.cancelledAt = new Date();
    r.cancelReason = 'Customer deleted their account';
    await r.save();
    await notify(offers.map((o) => o.provider), {
      type: 'request_cancelled',
      title: 'A request was cancelled',
      body: `"${r.title}" is no longer available.`,
      link: '/provider/offers',
    });
  }

  // Provider side: withdraw pending offers.
  const pending = await Offer.find({ provider: id, status: 'pending' }).select('request');
  await Offer.updateMany({ provider: id, status: 'pending' }, { $set: { status: 'withdrawn', withdrawnAt: new Date() } });
  for (const o of pending) await refreshOfferStats(o.request);

  // Personal files.
  await removeUpload(user.avatar);
  for (const g of user.provider?.gallery || []) await removeUpload(g.url);

  await Promise.all([Notification.deleteMany({ user: id }), PushSubscription.deleteMany({ user: id }), Report.deleteMany({ reporter: id, status: 'open' })]);
  await User.deleteOne({ _id: id });
  disconnectUser(id);
  clearSessionCookie(res);
  res.json({ ok: true });
});

export default router;
