import { Router } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { requireAuth, requireRole, requireVerifiedEmail, requireVerifiedProvider } from '../middleware/auth.js';
import { writeLimiter } from '../middleware/security.js';
import { imageUpload, saveImage } from '../middleware/upload.js';
import { parseMultipartJson, validate } from '../middleware/validate.js';
import { Category, Conversation, Offer, Review, ServiceRequest, User } from '../models/index.js';
import { URGENCIES } from '../models/ServiceRequest.js';
import {
  formatEta,
  formatPKR,
  refreshJobsCompleted,
  refreshOfferStats,
  refreshProviderRating,
  systemNote,
} from '../services/marketplace.js';
import { notify, track } from '../services/notify.js';
import { emitToUser, emitToUsers } from '../socket/index.js';
import { assertObjectId, badRequest, conflict, escapeRegex, forbidden, isObjectId, notFound, pageResult, paginate, sameId } from '../utils/http.js';
import { serializeOffer, serializeRequest, serializeReview } from '../utils/serialize.js';

const router = Router();

const CUSTOMER_FIELDS = 'name avatar role createdAt phone city';
const PROVIDER_FIELDS = 'name avatar role city area createdAt lastSeenAt phone provider';

const POSTED_WITHIN = { '24h': 1, '3d': 3, '7d': 7, '30d': 30 };

const listSchema = z.object({
  category: z.string().trim().max(400).optional(),
  city: z.string().trim().max(60).optional(),
  area: z.string().trim().max(60).optional(),
  q: z.string().trim().max(80).optional(),
  urgency: z.enum(URGENCIES).optional(),
  postedWithin: z.enum(['24h', '3d', '7d', '30d']).optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  radiusKm: z.coerce.number().min(1).max(100).optional(),
  sort: z.enum(['newest', 'oldest', 'budget', 'fewest_offers', 'nearest']).default('newest'),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

/** Accepts one category (slug or id) or several separated by commas. Returns a Mongo filter value. */
async function resolveCategoryId(value) {
  if (!value) return null;
  const parts = value.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean).slice(0, 10);
  const ids = parts.filter(isObjectId).map((id) => new mongoose.Types.ObjectId(id));
  const slugs = parts.filter((p) => !isObjectId(p));
  if (slugs.length) {
    const cats = await Category.find({ slug: { $in: slugs } }).select('_id').lean();
    ids.push(...cats.map((c) => c._id));
  }
  if (!ids.length) return new mongoose.Types.ObjectId(); // unknown slug: match nothing
  return ids.length === 1 ? ids[0] : { $in: ids };
}

/** Public listing of open requests (providers browse these to find work). */
router.get('/', validate(listSchema, 'query'), async (req, res) => {
  const q = req.q;
  const filter = { status: 'open', removed: false };
  const categoryId = await resolveCategoryId(q.category);
  if (categoryId) filter.category = categoryId;
  if (q.city) filter['location.city'] = q.city;
  if (q.area) filter['location.area'] = q.area;
  if (q.urgency) filter.urgency = q.urgency;
  if (q.postedWithin) filter.createdAt = { $gte: new Date(Date.now() - POSTED_WITHIN[q.postedWithin] * 86_400_000) };
  if (q.q) {
    const rx = new RegExp(escapeRegex(q.q), 'i');
    filter.$or = [{ title: rx }, { description: rx }, { 'location.area': rx }];
  }

  const hasPoint = q.lat !== undefined && q.lng !== undefined;
  const point = hasPoint ? [q.lng, q.lat] : null;
  if (hasPoint && q.radiusKm) {
    filter['location.point'] = { $geoWithin: { $centerSphere: [point, q.radiusKm / 6378.1] } };
  }

  const pg = paginate({ page: q.page, limit: q.limit }, { defaultLimit: 12 });
  let ids;
  let total;
  if (q.sort === 'nearest' && hasPoint) {
    const geoFilter = { ...filter };
    delete geoFilter['location.point'];
    const pipeline = [
      {
        $geoNear: {
          near: { type: 'Point', coordinates: point },
          distanceField: 'dist',
          key: 'location.point',
          spherical: true,
          query: geoFilter,
          ...(q.radiusKm ? { maxDistance: q.radiusKm * 1000 } : {}),
        },
      },
      { $skip: pg.skip },
      { $limit: pg.limit },
      { $project: { _id: 1 } },
    ];
    ids = (await ServiceRequest.aggregate(pipeline)).map((d) => d._id);
    total = await ServiceRequest.countDocuments(filter);
  } else {
    const sort = {
      newest: { createdAt: -1 },
      oldest: { createdAt: 1 },
      budget: { 'budget.max': -1, createdAt: -1 },
      fewest_offers: { offerCount: 1, createdAt: -1 },
      nearest: { createdAt: -1 },
    }[q.sort];
    [ids, total] = await Promise.all([
      ServiceRequest.find(filter).sort(sort).skip(pg.skip).limit(pg.limit).select('_id').lean().then((d) => d.map((x) => x._id)),
      ServiceRequest.countDocuments(filter),
    ]);
  }

  const docs = await ServiceRequest.find({ _id: { $in: ids } }).populate('category').populate('customer', CUSTOMER_FIELDS);
  const order = new Map(ids.map((id, i) => [id.toString(), i]));
  docs.sort((a, b) => order.get(a._id.toString()) - order.get(b._id.toString()));

  let myOffers = new Map();
  if (req.user?.role === 'provider' && docs.length) {
    const offers = await Offer.find({ provider: req.user._id, request: { $in: ids } }).select('request status price').lean();
    myOffers = new Map(offers.map((o) => [o.request.toString(), { id: o._id.toString(), status: o.status, price: o.price }]));
  }

  if (q.q) track('search', { path: '/requests', query: q.q, role: req.user?.role || 'guest' });

  res.json(
    pageResult(
      docs.map((d) =>
        serializeRequest(d, req.user, {
          viewerPoint: point,
          ...(req.user?.role === 'provider' ? { myOffer: myOffers.get(d._id.toString()) || null } : {}),
        })
      ),
      total,
      pg
    )
  );
});

/** The signed-in customer's own requests. */
router.get('/mine', requireRole('customer'), async (req, res) => {
  const status = ['open', 'assigned', 'completed', 'cancelled'].includes(req.query.status) ? req.query.status : null;
  const filter = { customer: req.user._id, ...(status ? { status } : {}) };
  const pg = paginate(req.query, { defaultLimit: 20 });
  const [docs, total] = await Promise.all([
    ServiceRequest.find(filter)
      .sort({ createdAt: -1 })
      .skip(pg.skip)
      .limit(pg.limit)
      .populate('category')
      .populate('customer', CUSTOMER_FIELDS)
      .populate('assignedProvider', PROVIDER_FIELDS),
    ServiceRequest.countDocuments(filter),
  ]);
  res.json(pageResult(docs.map((d) => serializeRequest(d, req.user)), total, pg));
});

export async function loadRequest(id, { lean = false } = {}) {
  assertObjectId(id, 'Request');
  const query = ServiceRequest.findById(id)
    .populate('category')
    .populate('customer', CUSTOMER_FIELDS)
    .populate('assignedProvider', PROVIDER_FIELDS);
  const doc = lean ? await query.lean() : await query;
  if (!doc) throw notFound('Request not found.');
  return doc;
}

export async function canView(r, user) {
  if (user?.role === 'admin') return true;
  if (user && sameId(r.customer, user._id)) return true;
  if (r.removed) return false;
  if (r.status === 'open') return true;
  if (!user) return false;
  if (r.assignedProvider && sameId(r.assignedProvider, user._id)) return true;
  if (user.role === 'provider') return Boolean(await Offer.exists({ request: r._id, provider: user._id }));
  return false;
}

router.get('/:id', async (req, res) => {
  const r = await loadRequest(req.params.id);
  if (!(await canView(r, req.user))) throw notFound('This request is no longer available.');

  const extra = {};
  if (req.user?.role === 'provider') {
    const mine = await Offer.findOne({ request: r._id, provider: req.user._id }).populate('provider', PROVIDER_FIELDS);
    extra.myOffer = mine ? serializeOffer(mine) : null;
    const conv = await Conversation.findOne({ request: r._id, provider: req.user._id }).select('_id').lean();
    extra.conversationId = conv?._id.toString() || null;
    if (!sameId(r.customer, req.user._id)) ServiceRequest.updateOne({ _id: r._id }, { $inc: { views: 1 } }).catch(() => {});
  }
  if (req.user && sameId(r.customer, req.user._id) && r.reviewed) {
    const review = await Review.findOne({ request: r._id }).populate('customer', 'name avatar city').populate('provider', 'name avatar role');
    if (review) extra.review = serializeReview(review);
  }
  res.json({ request: { ...serializeRequest(r, req.user), ...extra } });
});

const createSchema = z
  .object({
    categoryId: z.string().refine(isObjectId, 'Choose a service category.'),
    title: z.string().trim().min(5, 'Give your request a short title (at least 5 characters).').max(100),
    description: z.string().trim().min(20, 'Describe the problem in at least 20 characters.').max(2000),
    city: z.string().trim().min(2, 'Choose your city.').max(60),
    area: z.string().trim().min(2, 'Choose your area.').max(60),
    address: z.string().trim().max(200).optional().default(''),
    lat: z.coerce.number().min(-90).max(90),
    lng: z.coerce.number().min(-180).max(180),
    budgetMin: z.coerce.number().int().min(0).max(5_000_000).optional(),
    budgetMax: z.coerce.number().int().min(0).max(5_000_000).optional(),
    urgency: z.enum(URGENCIES).default('today'),
    preferredDate: z.coerce.date().optional(),
  })
  .refine((d) => d.budgetMin === undefined || d.budgetMax === undefined || d.budgetMin <= d.budgetMax, {
    message: 'Minimum budget cannot be higher than maximum budget.',
    path: ['budgetMax'],
  })
  .refine((d) => !d.preferredDate || d.preferredDate.getTime() > Date.now() - 86_400_000, {
    message: 'Preferred date cannot be in the past.',
    path: ['preferredDate'],
  });

router.post(
  '/',
  requireRole('customer'),
  requireVerifiedEmail,
  writeLimiter,
  imageUpload.array('images', 5),
  parseMultipartJson,
  validate(createSchema),
  async (req, res) => {
    const d = req.body;
    const category = await Category.findOne({ _id: d.categoryId, active: true });
    if (!category) throw badRequest('That category is not available.', { categoryId: 'Choose a service category.' });
    const openCount = await ServiceRequest.countDocuments({ customer: req.user._id, status: 'open' });
    if (openCount >= 10) throw conflict('You already have 10 open requests. Close or cancel one before posting another.');

    const images = [];
    for (const file of req.files || []) images.push(await saveImage(file, 'requests'));

    const request = await ServiceRequest.create({
      customer: req.user._id,
      category: category._id,
      title: d.title,
      description: d.description,
      images,
      location: { city: d.city, area: d.area, address: d.address, point: { type: 'Point', coordinates: [d.lng, d.lat] } },
      budget: { min: d.budgetMin, max: d.budgetMax },
      urgency: d.urgency,
      preferredDate: d.preferredDate,
    });

    track('request_posted', { role: 'customer' });

    // Matching (objective O2): alert verified providers in this category who serve this city or area.
    const providers = await User.find({
      role: 'provider',
      status: 'active',
      'provider.verification.status': 'verified',
      'provider.categories': category._id,
      $or: [{ city: d.city }, { 'provider.serviceAreas': d.area }],
    })
      .select('_id')
      .limit(300)
      .lean();
    const providerIds = providers.map((p) => p._id);
    await notify(providerIds, {
      type: 'new_request',
      title: `New ${category.name.toLowerCase()} request in ${d.area}`,
      body: d.title,
      link: `/requests/${request._id}`,
    });
    emitToUsers(providerIds, 'request:new', { id: request._id.toString(), title: d.title, category: category.slug, area: d.area });

    const full = await loadRequest(request._id);
    res.status(201).json({ request: serializeRequest(full, req.user) });
  }
);

const updateSchema = z
  .object({
    title: z.string().trim().min(5).max(100).optional(),
    description: z.string().trim().min(20).max(2000).optional(),
    address: z.string().trim().max(200).optional(),
    urgency: z.enum(URGENCIES).optional(),
    preferredDate: z.coerce.date().nullable().optional(),
    budgetMin: z.coerce.number().int().min(0).max(5_000_000).nullable().optional(),
    budgetMax: z.coerce.number().int().min(0).max(5_000_000).nullable().optional(),
  })
  .refine((d) => d.budgetMin == null || d.budgetMax == null || d.budgetMin <= d.budgetMax, {
    message: 'Minimum budget cannot be higher than maximum budget.',
    path: ['budgetMax'],
  });

router.patch('/:id', requireAuth, validate(updateSchema), async (req, res) => {
  assertObjectId(req.params.id, 'Request');
  const r = await ServiceRequest.findById(req.params.id);
  if (!r || r.removed) throw notFound('Request not found.');
  if (!sameId(r.customer, req.user._id)) throw forbidden();
  if (r.status !== 'open') throw conflict('Only open requests can be edited.');
  const d = req.body;
  for (const key of ['title', 'description', 'urgency']) if (d[key] !== undefined) r[key] = d[key];
  if (d.address !== undefined) r.location.address = d.address;
  if (d.preferredDate !== undefined) r.preferredDate = d.preferredDate || undefined;
  if (d.budgetMin !== undefined) r.budget.min = d.budgetMin ?? undefined;
  if (d.budgetMax !== undefined) r.budget.max = d.budgetMax ?? undefined;
  await r.save();
  const full = await loadRequest(r._id);
  res.json({ request: serializeRequest(full, req.user) });
});

router.post('/:id/cancel', requireAuth, validate(z.object({ reason: z.string().trim().max(300).optional().default('') })), async (req, res) => {
  assertObjectId(req.params.id, 'Request');
  const r = await ServiceRequest.findById(req.params.id);
  if (!r) throw notFound('Request not found.');
  if (!sameId(r.customer, req.user._id)) throw forbidden();
  if (!['open', 'assigned'].includes(r.status)) throw conflict('This request can no longer be cancelled.');

  const affected = await Offer.find({ request: r._id, status: { $in: ['pending', 'accepted'] } }).select('provider').lean();
  await Offer.updateMany({ request: r._id, status: 'pending' }, { $set: { status: 'rejected' } });
  r.status = 'cancelled';
  r.cancelledAt = new Date();
  r.cancelReason = req.body.reason;
  await r.save();

  const providerIds = affected.map((o) => o.provider);
  await notify(providerIds, {
    type: 'request_cancelled',
    title: 'Request cancelled by the customer',
    body: `"${r.title}" was cancelled${req.body.reason ? `: ${req.body.reason}` : '.'}`,
    link: `/requests/${r._id}`,
  });
  for (const pid of providerIds) await systemNote(r._id, pid, 'The customer cancelled this request.');
  emitToUsers(providerIds, 'request:updated', { id: r._id.toString(), status: r.status });
  const full = await loadRequest(r._id);
  res.json({ request: serializeRequest(full, req.user) });
});

/** Provider tells the customer the work is finished. The customer then confirms completion. */
router.post('/:id/mark-done', requireRole('provider'), async (req, res) => {
  assertObjectId(req.params.id, 'Request');
  const r = await ServiceRequest.findById(req.params.id);
  if (!r) throw notFound('Request not found.');
  if (!sameId(r.assignedProvider, req.user._id)) throw forbidden('Only the selected provider can do this.');
  if (r.status !== 'assigned') throw conflict('This job is not in progress.');
  r.providerMarkedDoneAt = new Date();
  await r.save();
  await notify(r.customer, {
    type: 'job_done',
    title: `${req.user.name} marked the job as done`,
    body: `Please confirm "${r.title}" is complete so you can leave a review.`,
    link: `/requests/${r._id}`,
  });
  await systemNote(r._id, req.user._id, `${req.user.name} marked the job as done. Please confirm completion.`);
  emitToUser(r.customer, 'request:updated', { id: r._id.toString(), status: r.status });
  const full = await loadRequest(r._id);
  res.json({ request: serializeRequest(full, req.user) });
});

router.post('/:id/complete', requireAuth, async (req, res) => {
  assertObjectId(req.params.id, 'Request');
  const r = await ServiceRequest.findById(req.params.id);
  if (!r) throw notFound('Request not found.');
  if (!sameId(r.customer, req.user._id)) throw forbidden();
  if (r.status !== 'assigned') throw conflict('Only a job in progress can be marked complete.');
  r.status = 'completed';
  r.completedAt = new Date();
  await r.save();
  await refreshJobsCompleted(r.assignedProvider);
  await notify(r.assignedProvider, {
    type: 'job_completed',
    title: 'Job completed',
    body: `${req.user.name} confirmed "${r.title}" is complete.`,
    link: `/requests/${r._id}`,
  });
  await notify(r.customer, {
    type: 'review',
    title: 'How did it go?',
    body: `Rate your provider for "${r.title}". Reviews help neighbours choose well.`,
    link: `/requests/${r._id}#review`,
  });
  await systemNote(r._id, r.assignedProvider, 'The customer confirmed the job is complete.');
  emitToUser(r.assignedProvider, 'request:updated', { id: r._id.toString(), status: r.status });
  const full = await loadRequest(r._id);
  res.json({ request: serializeRequest(full, req.user) });
});

const reviewSchema = z.object({
  rating: z.coerce.number().int().min(1, 'Choose a rating from 1 to 5 stars.').max(5),
  comment: z.string().trim().max(1000).optional().default(''),
});

router.post('/:id/review', requireAuth, writeLimiter, validate(reviewSchema), async (req, res) => {
  assertObjectId(req.params.id, 'Request');
  const r = await ServiceRequest.findById(req.params.id);
  if (!r) throw notFound('Request not found.');
  if (!sameId(r.customer, req.user._id)) throw forbidden('Only the customer who booked this job can review it.');
  if (r.status !== 'completed') throw conflict('You can review a provider once the job is completed.');
  if (r.reviewed || (await Review.exists({ request: r._id }))) throw conflict('You have already reviewed this job.');

  const review = await Review.create({
    request: r._id,
    provider: r.assignedProvider,
    customer: req.user._id,
    rating: req.body.rating,
    comment: req.body.comment,
  });
  r.reviewed = true;
  await r.save();
  await refreshProviderRating(r.assignedProvider);
  await notify(r.assignedProvider, {
    type: 'review',
    title: `New ${req.body.rating}-star review`,
    body: req.body.comment ? `"${req.body.comment.slice(0, 120)}"` : `For "${r.title}"`,
    link: `/providers/${r.assignedProvider}#reviews`,
  });
  const full = await Review.findById(review._id).populate('customer', 'name avatar city').populate('provider', 'name avatar role');
  res.status(201).json({ review: serializeReview(full) });
});

/* ---------- Offers on a request ---------- */

const offerSortSchema = z.object({
  sort: z.enum(['price', 'rating', 'experience', 'eta', 'newest']).default('price'),
  verifiedOnly: z.enum(['true', 'false']).optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
});

router.get('/:id/offers', requireAuth, validate(offerSortSchema, 'query'), async (req, res) => {
  assertObjectId(req.params.id, 'Request');
  const r = await ServiceRequest.findById(req.params.id).lean();
  if (!r) throw notFound('Request not found.');
  const isOwner = sameId(r.customer, req.user._id);
  const isAdmin = req.user.role === 'admin';

  if (!isOwner && !isAdmin) {
    if (req.user.role !== 'provider') throw forbidden();
    const mine = await Offer.find({ request: r._id, provider: req.user._id }).populate('provider', PROVIDER_FIELDS);
    return res.json({ items: mine.map((o) => serializeOffer(o)) });
  }

  const offers = await Offer.find({ request: r._id, status: { $ne: 'withdrawn' } }).populate({
    path: 'provider',
    select: PROVIDER_FIELDS,
    populate: { path: 'provider.categories', model: 'Category' },
  });
  let items = offers.map((o) => serializeOffer(o));
  if (req.q.verifiedOnly === 'true') items = items.filter((o) => o.provider.verified);
  if (req.q.minRating) items = items.filter((o) => o.provider.ratingAvg >= req.q.minRating);

  const rank = { accepted: 0, pending: 1, rejected: 2 };
  const sorters = {
    price: (a, b) => a.price - b.price,
    rating: (a, b) => b.provider.ratingAvg - a.provider.ratingAvg || b.provider.ratingCount - a.provider.ratingCount,
    experience: (a, b) => b.provider.experienceYears - a.provider.experienceYears,
    eta: (a, b) => a.etaMinutes - b.etaMinutes,
    newest: (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
  };
  items.sort((a, b) => rank[a.status] - rank[b.status] || sorters[req.q.sort](a, b));

  // Comparison highlights for the UI (objective O3).
  const live = items.filter((o) => o.status === 'pending');
  const highlights = {};
  if (live.length) {
    highlights.lowestPrice = live.reduce((m, o) => (o.price < m.price ? o : m)).id;
    highlights.fastest = live.reduce((m, o) => (o.etaMinutes < m.etaMinutes ? o : m)).id;
    const rated = live.filter((o) => o.provider.ratingCount > 0);
    if (rated.length) highlights.topRated = rated.reduce((m, o) => (o.provider.ratingAvg > m.provider.ratingAvg ? o : m)).id;
  }

  // Conversation ids so the customer can jump straight into chat with each bidder.
  const convs = await Conversation.find({ request: r._id }).select('provider unreadCustomer').lean();
  const convByProvider = new Map(convs.map((c) => [c.provider.toString(), { id: c._id.toString(), unread: c.unreadCustomer }]));
  items = items.map((o) => ({ ...o, conversation: convByProvider.get(o.provider.id) || null }));

  res.json({ items, highlights });
});

const offerSchema = z.object({
  price: z.coerce.number().int('Price must be a whole number.').min(100, 'The minimum offer is Rs 100.').max(5_000_000),
  etaMinutes: z.coerce.number().int().min(5, 'Arrival time must be at least 5 minutes.').max(10_080, 'Arrival time must be within 7 days.'),
  details: z.string().trim().min(10, 'Explain what your offer includes (at least 10 characters).').max(1000),
  warrantyDays: z.coerce.number().int().min(0).max(365).optional().default(0),
  includesMaterials: z.boolean().optional().default(false),
});

router.post('/:id/offers', requireVerifiedProvider, requireVerifiedEmail, writeLimiter, validate(offerSchema), async (req, res) => {
  assertObjectId(req.params.id, 'Request');
  const r = await ServiceRequest.findById(req.params.id);
  if (!r || r.removed) throw notFound('Request not found.');
  if (r.status !== 'open') throw conflict('This request is no longer accepting offers.');
  if (sameId(r.customer, req.user._id)) throw forbidden('You cannot bid on your own request.');

  const d = req.body;
  let offer = await Offer.findOne({ request: r._id, provider: req.user._id });
  if (offer && offer.status === 'pending') throw conflict('You already have an offer on this request. Edit it instead.');
  if (offer && offer.status !== 'withdrawn') throw conflict('You can no longer bid on this request.');

  if (offer) {
    Object.assign(offer, d, { status: 'pending', withdrawnAt: undefined });
    offer.history.push({ price: d.price, etaMinutes: d.etaMinutes });
    await offer.save();
  } else {
    offer = await Offer.create({ ...d, request: r._id, provider: req.user._id, history: [{ price: d.price, etaMinutes: d.etaMinutes }] });
  }
  await refreshOfferStats(r._id);
  track('offer_sent', { role: 'provider' });

  await notify(r.customer, {
    type: 'new_offer',
    title: `New offer: ${formatPKR(d.price)}`,
    body: `${req.user.name} can arrive in ${formatEta(d.etaMinutes)} for "${r.title}".`,
    link: `/requests/${r._id}`,
  });
  await systemNote(r._id, req.user._id, `${req.user.name} sent an offer: ${formatPKR(d.price)}, arrival in ${formatEta(d.etaMinutes)}.`);
  emitToUser(r.customer, 'offer:new', { requestId: r._id.toString() });

  await offer.populate('provider', PROVIDER_FIELDS);
  res.status(201).json({ offer: serializeOffer(offer) });
});

export default router;
