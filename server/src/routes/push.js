import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { writeLimiter } from '../middleware/security.js';
import { validate } from '../middleware/validate.js';
import { PushSubscription } from '../models/index.js';
import { getVapidKeys, sendPush } from '../services/push.js';
import { conflict } from '../utils/http.js';

const router = Router();

const MAX_DEVICES = 10;

// The server later sends an HTTP request to the subscription endpoint, so an attacker-chosen URL
// would be a server-side request forgery vector. Only the real browser push services are accepted.
const PUSH_HOSTS = [
  /^fcm\.googleapis\.com$/, // Chrome, Edge, Opera, Samsung Internet
  /^updates\.push\.services\.mozilla\.com$/, // Firefox
  /^[a-z0-9-]+\.notify\.windows\.com$/, // Edge (legacy WNS)
  /^web\.push\.apple\.com$/, // Safari
];

export function isPushServiceUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.port && PUSH_HOSTS.some((rx) => rx.test(url.hostname));
  } catch {
    return false;
  }
}

/** The VAPID public key the browser needs to create a subscription. */
router.get('/public-key', async (req, res) => {
  const { publicKey } = await getVapidKeys();
  res.json({ publicKey });
});

const subscriptionSchema = z.object({
  endpoint: z.string().max(1000).refine(isPushServiceUrl, 'This is not a recognised browser push service.'),
  keys: z.object({ p256dh: z.string().min(20).max(200), auth: z.string().min(8).max(100) }),
});

router.get('/subscriptions', requireAuth, async (req, res) => {
  res.json({ devices: await PushSubscription.countDocuments({ user: req.user._id }) });
});

/** Registers this browser for push notifications. Idempotent per endpoint. */
router.post('/subscriptions', requireAuth, writeLimiter, validate(subscriptionSchema), async (req, res) => {
  // A browser has one endpoint. If another account subscribed on it earlier, it now belongs to this user.
  await PushSubscription.findOneAndUpdate(
    { endpoint: req.body.endpoint },
    { $set: { user: req.user._id, keys: req.body.keys, userAgent: (req.get('user-agent') || '').slice(0, 300) } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  const extra = await PushSubscription.find({ user: req.user._id }).sort({ createdAt: -1 }).skip(MAX_DEVICES).select('_id').lean();
  if (extra.length) await PushSubscription.deleteMany({ _id: { $in: extra.map((s) => s._id) } });
  res.status(201).json({ ok: true, devices: await PushSubscription.countDocuments({ user: req.user._id }) });
});

router.delete('/subscriptions', requireAuth, validate(z.object({ endpoint: z.string().max(1000) })), async (req, res) => {
  await PushSubscription.deleteOne({ user: req.user._id, endpoint: req.body.endpoint });
  res.json({ ok: true, devices: await PushSubscription.countDocuments({ user: req.user._id }) });
});

/** Sends a test notification to every browser the signed-in user has registered. */
router.post('/test', requireAuth, writeLimiter, async (req, res) => {
  if (!(await PushSubscription.exists({ user: req.user._id }))) throw conflict('Turn on push notifications on this device first.');
  const result = await sendPush(req.user._id, {
    title: 'LocalFix notifications are on',
    body: 'You will hear about new offers and messages here, even when LocalFix is closed.',
    link: '/notifications',
    tag: 'test',
  });
  res.json(result);
});

export default router;
