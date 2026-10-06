import { Router } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { writeLimiter } from '../middleware/security.js';
import { imageUpload, removeUpload, saveImage } from '../middleware/upload.js';
import { parseMultipartJson, validate } from '../middleware/validate.js';
import { Category, Review, User } from '../models/index.js';
import { notifyAdmins } from '../services/notify.js';
import { isOnline } from '../socket/index.js';
import { assertObjectId, badRequest, conflict, escapeRegex, isObjectId, notFound, pageResult, paginate, sameId } from '../utils/http.js';
import { providerCard, providerProfile, selfUser, serializeReview } from '../utils/serialize.js';

const router = Router();

const directorySchema = z.object({
  category: z.string().trim().max(60).optional(),
  city: z.string().trim().max(60).optional(),
  q: z.string().trim().max(80).optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  availableNow: z.enum(['true', 'false']).optional(),
  sort: z.enum(['rating', 'jobs', 'experience', 'newest']).default('rating'),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(48).optional(),
});

/** Provider directory: verified, active providers only. */
router.get('/', validate(directorySchema, 'query'), async (req, res) => {
  const q = req.q;
  const filter = { role: 'provider', status: 'active', 'provider.verification.status': 'verified' };
  if (q.category) {
    const cat = isObjectId(q.category) ? { _id: q.category } : await Category.findOne({ slug: q.category.toLowerCase() }).select('_id').lean();
    filter['provider.categories'] = cat ? cat._id : new mongoose.Types.ObjectId();
  }
  if (q.city) filter.city = q.city;
  if (q.minRating) filter['provider.ratingAvg'] = { $gte: q.minRating };
  if (q.availableNow === 'true') filter['provider.availability.availableNow'] = true;
  if (q.q) {
    const rx = new RegExp(escapeRegex(q.q), 'i');
    filter.$or = [{ name: rx }, { 'provider.headline': rx }, { 'provider.bio': rx }, { area: rx }, { 'provider.serviceAreas': rx }];
  }
  const sort = {
    rating: { 'provider.ratingAvg': -1, 'provider.ratingCount': -1 },
    jobs: { 'provider.jobsCompleted': -1 },
    experience: { 'provider.experienceYears': -1 },
    newest: { createdAt: -1 },
  }[q.sort];
  const pg = paginate({ page: q.page, limit: q.limit }, { defaultLimit: 12, maxLimit: 48 });
  const [docs, total] = await Promise.all([
    User.find(filter).sort(sort).skip(pg.skip).limit(pg.limit).populate('provider.categories'),
    User.countDocuments(filter),
  ]);
  res.json(pageResult(docs.map((d) => ({ ...providerCard(d), online: isOnline(d._id) })), total, pg));
});

/* ---------- The signed-in provider's own profile ---------- */

router.get('/me/profile', requireRole('provider'), async (req, res) => {
  await req.user.populate('provider.categories');
  res.json({ user: selfUser(req.user) });
});

const certSchema = z.object({
  title: z.string().trim().min(2).max(120),
  issuer: z.string().trim().max(120).optional().default(''),
  year: z.coerce.number().int().min(1970).max(2100).optional(),
});

const profileSchema = z.object({
  headline: z.string().trim().max(100).optional(),
  bio: z.string().trim().max(1500).optional(),
  categories: z.array(z.string().refine(isObjectId, 'Invalid category.')).min(1, 'Choose at least one service.').max(6).optional(),
  experienceYears: z.coerce.number().int().min(0).max(60).optional(),
  serviceAreas: z.array(z.string().trim().min(2).max(60)).max(15).optional(),
  certifications: z.array(certSchema).max(10).optional(),
  startingPrice: z.coerce.number().int().min(0).max(1_000_000).nullable().optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
});

router.patch('/me', requireRole('provider'), validate(profileSchema), async (req, res) => {
  const d = req.body;
  if (!req.user.provider) req.user.provider = {};
  const p = req.user.provider;
  if (d.categories) {
    const valid = await Category.find({ _id: { $in: d.categories }, active: true }).select('_id');
    if (!valid.length) throw badRequest('Choose at least one active service.', { categories: 'Choose at least one service.' });
    p.categories = valid.map((c) => c._id);
  }
  for (const key of ['headline', 'bio', 'experienceYears', 'serviceAreas', 'certifications']) if (d[key] !== undefined) p[key] = d[key];
  if (d.startingPrice !== undefined) p.startingPrice = d.startingPrice ?? undefined;
  if (d.lat !== undefined && d.lng !== undefined) req.user.location = { type: 'Point', coordinates: [d.lng, d.lat] };
  await req.user.save();
  await req.user.populate('provider.categories');
  res.json({ user: selfUser(req.user) });
});

const weekSchema = z.object({
  availableNow: z.boolean(),
  weekly: z
    .array(
      z
        .object({
          day: z.number().int().min(0).max(6),
          enabled: z.boolean(),
          from: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:MM time.'),
          to: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:MM time.'),
        })
        .refine((d) => !d.enabled || d.from < d.to, { message: 'Closing time must be after opening time.', path: ['to'] })
    )
    .length(7, 'Provide all 7 days.'),
});

router.put('/me/availability', requireRole('provider'), validate(weekSchema), async (req, res) => {
  const days = new Set(req.body.weekly.map((d) => d.day));
  if (days.size !== 7) throw badRequest('Each day of the week must appear once.');
  req.user.provider.availability = { availableNow: req.body.availableNow, weekly: [...req.body.weekly].sort((a, b) => a.day - b.day) };
  await req.user.save();
  await req.user.populate('provider.categories');
  res.json({ user: selfUser(req.user) });
});

const gallerySchema = z.object({
  caption: z.string().trim().max(140).optional().default(''),
  kind: z.enum(['before', 'after', 'work']).optional().default('work'),
});

router.post('/me/gallery', requireRole('provider'), writeLimiter, imageUpload.array('images', 6), parseMultipartJson, validate(gallerySchema), async (req, res) => {
  if (!req.files?.length) throw badRequest('Choose at least one photo.');
  const gallery = req.user.provider.gallery || [];
  if (gallery.length + req.files.length > 24) throw conflict('Your gallery can hold up to 24 photos. Remove some first.');
  for (const file of req.files) {
    const url = await saveImage(file, 'gallery');
    gallery.push({ url, caption: req.body.caption, kind: req.body.kind });
  }
  req.user.provider.gallery = gallery;
  await req.user.save();
  await req.user.populate('provider.categories');
  res.status(201).json({ user: selfUser(req.user) });
});

router.delete('/me/gallery/:itemId', requireRole('provider'), async (req, res) => {
  const item = req.user.provider.gallery.id(req.params.itemId);
  if (!item) throw notFound('Photo not found.');
  const url = item.url;
  item.deleteOne();
  await req.user.save();
  await removeUpload(url);
  await req.user.populate('provider.categories');
  res.json({ user: selfUser(req.user) });
});

/** Identity verification: provider uploads an ID document image (kept outside the public folder). */
router.post(
  '/me/verification',
  requireRole('provider'),
  writeLimiter,
  imageUpload.single('document'),
  parseMultipartJson,
  validate(z.object({ idNumber: z.string().trim().regex(/^\d{5}-?\d{7}-?\d$/, 'Enter your 13-digit CNIC number, e.g. 61101-1234567-1.') })),
  async (req, res) => {
    const status = req.user.provider.verification?.status;
    if (status === 'verified') throw conflict('Your account is already verified.');
    if (!req.file) throw badRequest('Upload a clear photo of your CNIC.', { document: 'Upload a photo of your CNIC.' });
    const docPath = await saveImage(req.file, 'verification', { privateDir: true, maxWidth: 1800, maxHeight: 1800 });
    const digits = req.body.idNumber.replace(/\D/g, '');
    req.user.provider.verification = {
      status: 'pending',
      documentPath: docPath,
      idLast4: digits.slice(-4),
      submittedAt: new Date(),
      note: '',
    };
    await req.user.save();
    await notifyAdmins({
      type: 'verification',
      title: 'Provider awaiting verification',
      body: `${req.user.name} submitted ID documents.`,
      link: '/admin/verifications',
    });
    await req.user.populate('provider.categories');
    res.json({ user: selfUser(req.user) });
  }
);

/* ---------- Public profile ---------- */

router.get('/:id', async (req, res) => {
  assertObjectId(req.params.id, 'Provider');
  const u = await User.findOne({ _id: req.params.id, role: 'provider' }).populate('provider.categories');
  const isSelf = req.user && sameId(req.user._id, req.params.id);
  const isAdmin = req.user?.role === 'admin';
  if (!u || (!isSelf && !isAdmin && (u.status !== 'active' || u.provider?.verification?.status !== 'verified'))) {
    throw notFound('Provider not found.');
  }
  const [reviews, breakdown] = await Promise.all([
    Review.find({ provider: u._id, hidden: false })
      .sort({ createdAt: -1 })
      .limit(6)
      .populate('customer', 'name avatar city')
      .populate({ path: 'request', select: 'title category', populate: { path: 'category' } }),
    Review.aggregate([{ $match: { provider: u._id, hidden: false } }, { $group: { _id: '$rating', n: { $sum: 1 } } }]),
  ]);
  const ratingBreakdown = Object.fromEntries([1, 2, 3, 4, 5].map((n) => [n, breakdown.find((b) => b._id === n)?.n || 0]));
  res.json({
    provider: { ...providerProfile(u, { includePrivate: isSelf || isAdmin }), online: isOnline(u._id), status: u.status },
    reviews: reviews.map((r) => serializeReview(r)),
    ratingBreakdown,
  });
});

router.get('/:id/reviews', async (req, res) => {
  assertObjectId(req.params.id, 'Provider');
  const pg = paginate(req.query, { defaultLimit: 10 });
  const filter = { provider: req.params.id, hidden: false };
  const rating = Number(req.query.rating);
  if (rating >= 1 && rating <= 5) filter.rating = rating;
  const [docs, total] = await Promise.all([
    Review.find(filter)
      .sort({ createdAt: -1 })
      .skip(pg.skip)
      .limit(pg.limit)
      .populate('customer', 'name avatar city')
      .populate({ path: 'request', select: 'title category', populate: { path: 'category' } }),
    Review.countDocuments(filter),
  ]);
  res.json(pageResult(docs.map((r) => serializeReview(r)), total, pg));
});

export default router;

export const reviewReplyRouter = Router();

reviewReplyRouter.post(
  '/:id/reply',
  requireAuth,
  requireRole('provider'),
  validate(z.object({ text: z.string().trim().min(2, 'Write a short reply.').max(600) })),
  async (req, res) => {
    assertObjectId(req.params.id, 'Review');
    const review = await Review.findById(req.params.id);
    if (!review || review.hidden) throw notFound('Review not found.');
    if (!sameId(review.provider, req.user._id)) throw notFound('Review not found.');
    if (review.reply?.text) throw conflict('You have already replied to this review.');
    review.reply = { text: req.body.text, at: new Date() };
    await review.save();
    await review.populate('customer', 'name avatar city');
    await review.populate({ path: 'request', select: 'title category', populate: { path: 'category' } });
    res.json({ review: serializeReview(review) });
  }
);
