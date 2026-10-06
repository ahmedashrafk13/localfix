import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { writeLimiter } from '../middleware/security.js';
import { validate } from '../middleware/validate.js';
import { Conversation, Message, Report, Review, ServiceRequest, User } from '../models/index.js';
import { REPORT_REASONS, REPORT_TARGETS } from '../models/Report.js';
import { notifyAdmins } from '../services/notify.js';
import { conflict, forbidden, isObjectId, notFound, sameId } from '../utils/http.js';

const router = Router();

const schema = z.object({
  targetType: z.enum(REPORT_TARGETS),
  targetId: z.string().refine(isObjectId, 'Invalid target.'),
  reason: z.enum(REPORT_REASONS, { errorMap: () => ({ message: 'Choose a reason.' }) }),
  details: z.string().trim().max(1000).optional().default(''),
});

/** Builds a short human-readable label for the admin queue, and checks the reporter could see the target. */
async function describeTarget(type, id, user) {
  if (type === 'user') {
    const u = await User.findById(id).select('name role');
    if (!u) return null;
    if (sameId(u._id, user._id)) throw forbidden('You cannot report yourself.');
    return `${u.role === 'provider' ? 'Provider' : 'User'}: ${u.name}`;
  }
  if (type === 'request') {
    const r = await ServiceRequest.findById(id).select('title customer');
    return r ? `Request: ${r.title}` : null;
  }
  if (type === 'review') {
    const rv = await Review.findById(id).select('rating comment');
    return rv ? `Review (${rv.rating} stars): ${rv.comment.slice(0, 120)}` : null;
  }
  if (type === 'message') {
    const m = await Message.findById(id).select('text conversation sender');
    if (!m) return null;
    const conv = await Conversation.findById(m.conversation).select('customer provider');
    const member = conv && (sameId(conv.customer, user._id) || sameId(conv.provider, user._id));
    if (!member) return null;
    return `Message: ${m.text.slice(0, 140)}`;
  }
  return null;
}

router.post('/', requireAuth, writeLimiter, validate(schema), async (req, res) => {
  const { targetType, targetId, reason, details } = req.body;
  const label = await describeTarget(targetType, targetId, req.user);
  if (!label) throw notFound('The item you are reporting could not be found.');
  const duplicate = await Report.exists({ reporter: req.user._id, targetType, targetId, status: 'open' });
  if (duplicate) throw conflict('You have already reported this. Our team is reviewing it.');
  await Report.create({ reporter: req.user._id, targetType, targetId, targetLabel: label.slice(0, 200), reason, details });
  await notifyAdmins({ type: 'report', title: 'New report submitted', body: label.slice(0, 140), link: '/admin/reports' });
  res.status(201).json({ ok: true, message: 'Thanks. Our moderation team will review this within 24 hours.' });
});

export default router;
