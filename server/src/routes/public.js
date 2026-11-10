import { Router } from 'express';
import mongoose from 'mongoose';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { env } from '../config/env.js';
import { API_VERSION } from '../docs/openapi.js';
import { upstreamSnapshots } from '../integrations/upstream.js';
import { CITIES } from '../config/places.js';
import { validate } from '../middleware/validate.js';
import { ContactMessage, Review, ServiceRequest, Tip, User } from '../models/index.js';
import { URGENCIES } from '../models/ServiceRequest.js';
import { notifyAdmins, track } from '../services/notify.js';
import { notFound } from '../utils/http.js';
import { providerCard, serializeCategory, serializeReview } from '../utils/serialize.js';

const router = Router();

router.get('/meta', (req, res) => {
  res.json({ cities: CITIES, urgencies: URGENCIES, requireEmailVerification: env.REQUIRE_EMAIL_VERIFICATION });
});

/** Live platform numbers shown on the home page. Every figure is computed from the database. */
router.get('/stats/public', async (req, res) => {
  const [verifiedProviders, jobsCompleted, ratingAgg, offersAgg, firstOfferAgg, featured, testimonials, totalRequests] = await Promise.all([
    User.countDocuments({ role: 'provider', status: 'active', 'provider.verification.status': 'verified' }),
    ServiceRequest.countDocuments({ status: 'completed' }),
    Review.aggregate([{ $match: { hidden: false } }, { $group: { _id: null, avg: { $avg: '$rating' }, n: { $sum: 1 } } }]),
    ServiceRequest.aggregate([
      { $match: { removed: false, status: { $ne: 'cancelled' } } },
      { $lookup: { from: 'offers', localField: '_id', foreignField: 'request', as: 'o' } },
      { $group: { _id: null, avg: { $avg: { $size: '$o' } } } },
    ]),
    ServiceRequest.aggregate([
      { $match: { firstOfferAt: { $exists: true } } },
      { $project: { mins: { $divide: [{ $subtract: ['$firstOfferAt', '$createdAt'] }, 60000] } } },
      { $sort: { mins: 1 } },
      { $group: { _id: null, all: { $push: '$mins' } } },
    ]),
    User.find({ role: 'provider', status: 'active', 'provider.verification.status': 'verified', 'provider.ratingCount': { $gte: 2 } })
      .sort({ 'provider.ratingAvg': -1, 'provider.ratingCount': -1 })
      .limit(8)
      .populate('provider.categories'),
    Review.find({ hidden: false, rating: { $gte: 4 }, comment: { $ne: '' } })
      .sort({ createdAt: -1 })
      .limit(6)
      .populate('customer', 'name avatar city')
      .populate('provider', 'name avatar role')
      .populate({ path: 'request', select: 'title category', populate: { path: 'category' } }),
    ServiceRequest.countDocuments({ removed: false }),
  ]);
  const mins = [...(firstOfferAgg[0]?.all || [])].sort((a, b) => a - b);
  const medianFirstOfferMins = mins.length ? Math.round(mins[Math.floor(mins.length / 2)]) : null;
  res.json({
    verifiedProviders,
    jobsCompleted,
    totalRequests,
    avgRating: ratingAgg[0] ? Math.round(ratingAgg[0].avg * 10) / 10 : null,
    reviewCount: ratingAgg[0]?.n || 0,
    avgOffersPerRequest: offersAgg[0] ? Math.round(offersAgg[0].avg * 10) / 10 : null,
    medianFirstOfferMins,
    featuredProviders: featured.map(providerCard),
    testimonials: testimonials.map((r) => serializeReview(r)),
    updatedAt: new Date(),
  });
});

router.get('/tips', async (req, res) => {
  const tips = await Tip.find({ published: true }).sort({ publishedAt: -1 }).limit(50).populate('category').populate('author', 'name avatar').lean();
  res.json({
    items: tips.map((t) => ({
      id: t._id.toString(),
      title: t.title,
      slug: t.slug,
      excerpt: t.excerpt,
      cover: t.cover,
      category: serializeCategory(t.category),
      author: t.author ? { name: t.author.name, avatar: t.author.avatar } : null,
      publishedAt: t.publishedAt,
      readMins: Math.max(1, Math.round(t.body.split(/\s+/).length / 200)),
    })),
  });
});

router.get('/tips/:slug', async (req, res) => {
  const t = await Tip.findOne({ slug: String(req.params.slug).toLowerCase(), published: true }).populate('category').populate('author', 'name avatar').lean();
  if (!t) throw notFound('Article not found.');
  res.json({
    tip: {
      id: t._id.toString(),
      title: t.title,
      slug: t.slug,
      excerpt: t.excerpt,
      body: t.body,
      cover: t.cover,
      category: serializeCategory(t.category),
      author: t.author ? { name: t.author.name, avatar: t.author.avatar } : null,
      publishedAt: t.publishedAt,
      updatedAt: t.updatedAt,
      readMins: Math.max(1, Math.round(t.body.split(/\s+/).length / 200)),
    },
  });
});

const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  skip: () => env.isTest,
  message: { error: { message: 'You have sent several messages already. Please wait a while before sending another.' } },
});

const contactSchema = z.object({
  name: z.string().trim().min(2, 'Enter your name.').max(80),
  email: z.string().trim().toLowerCase().email('Enter a valid email address.').max(160),
  topic: z.enum(['general', 'account', 'provider', 'safety', 'billing', 'other']).default('general'),
  message: z.string().trim().min(10, 'Write at least 10 characters.').max(2000),
});

router.post('/contact', contactLimiter, validate(contactSchema), async (req, res) => {
  await ContactMessage.create({ ...req.body, user: req.user?._id });
  await notifyAdmins({ type: 'system', title: 'New support message', body: `${req.body.name}: ${req.body.message.slice(0, 120)}`, link: '/admin/inbox' });
  res.status(201).json({ ok: true, message: 'Thanks for reaching out. We reply within one working day.' });
});

const analyticsLimiter = rateLimit({ windowMs: 60 * 1000, limit: 60, skip: () => env.isTest, message: { error: { message: 'Slow down.' } } });

router.post(
  '/analytics/events',
  analyticsLimiter,
  validate(z.object({ type: z.enum(['page_view', 'search']), path: z.string().max(200).default(''), query: z.string().max(100).optional().default('') })),
  (req, res) => {
    track(req.body.type, { path: req.body.path, query: req.body.query, role: req.user?.role || 'guest' });
    res.status(202).json({ ok: true });
  }
);

const DB_STATES = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnected' };

/** Liveness and readiness in one: 503 when the database is not connected, so a load balancer stops routing here. */
router.get('/health', (req, res) => {
  const database = DB_STATES[mongoose.connection.readyState] || 'disconnected';
  const ok = database === 'connected';
  res.set('Cache-Control', 'no-store');
  res.status(ok ? 200 : 503).json({
    ok,
    version: API_VERSION,
    uptime: Math.round(process.uptime()),
    time: new Date(),
    database,
    integrations: Object.fromEntries(upstreamSnapshots().map((u) => [u.name, u.enabled ? u.breaker : 'disabled'])),
  });
});

export default router;
