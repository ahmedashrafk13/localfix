import fs from 'node:fs';
import path from 'node:path';
import { Router } from 'express';
import { z } from 'zod';
import { env } from '../config/env.js';
import { requireRole } from '../middleware/auth.js';
import { imageUpload, saveImage } from '../middleware/upload.js';
import { parseMultipartJson, validate } from '../middleware/validate.js';
import {
  AnalyticsEvent,
  Category,
  ContactMessage,
  Conversation,
  Message,
  Offer,
  Report,
  Review,
  ServiceRequest,
  Tip,
  User,
} from '../models/index.js';
import { refreshOfferStats, refreshProviderRating } from '../services/marketplace.js';
import { notify } from '../services/notify.js';
import { disconnectUser, emitToUser } from '../socket/index.js';
import {
  assertObjectId,
  badRequest,
  conflict,
  dayKey,
  escapeRegex,
  isObjectId,
  notFound,
  pageResult,
  paginate,
  slugify,
} from '../utils/http.js';
import { providerProfile, serializeCategory, serializeRequest, serializeReview, userSummary } from '../utils/serialize.js';

const router = Router();
router.use(requireRole('admin'));

const PROVIDER_FIELDS = 'name avatar role city area createdAt lastSeenAt phone provider';

/* ---------- Overview & success criteria ---------- */

function lastDays(n) {
  const days = [];
  for (let i = n - 1; i >= 0; i -= 1) days.push(dayKey(new Date(Date.now() - i * 86_400_000)));
  return days;
}

router.get('/stats', async (req, res) => {
  const days = lastDays(14);
  const since = new Date(`${days[0]}T00:00:00.000Z`);
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const prevMonthStart = new Date(monthStart);
  prevMonthStart.setUTCMonth(prevMonthStart.getUTCMonth() - 1);

  const [
    usersByRole,
    pendingVerifications,
    requestsByStatus,
    offersTotal,
    offersPerRequest,
    firstOffer,
    ratingAgg,
    openReports,
    openInbox,
    requestsDaily,
    offersDaily,
    signupsDaily,
    viewsDaily,
    topCategories,
    topSearches,
    signupsThisMonth,
    signupsPrevMonth,
    repeat,
  ] = await Promise.all([
    User.aggregate([{ $group: { _id: { role: '$role', status: '$status' }, n: { $sum: 1 } } }]),
    User.countDocuments({ role: 'provider', 'provider.verification.status': 'pending' }),
    ServiceRequest.aggregate([{ $match: { removed: false } }, { $group: { _id: '$status', n: { $sum: 1 } } }]),
    Offer.countDocuments(),
    ServiceRequest.aggregate([
      { $match: { removed: false, status: { $ne: 'cancelled' } } },
      { $lookup: { from: 'offers', localField: '_id', foreignField: 'request', as: 'o' } },
      { $group: { _id: null, avg: { $avg: { $size: '$o' } }, n: { $sum: 1 } } },
    ]),
    ServiceRequest.aggregate([
      { $match: { firstOfferAt: { $exists: true } } },
      { $project: { mins: { $divide: [{ $subtract: ['$firstOfferAt', '$createdAt'] }, 60000] } } },
      { $group: { _id: null, all: { $push: '$mins' }, within30: { $sum: { $cond: [{ $lte: ['$mins', 30] }, 1, 0] } }, n: { $sum: 1 } } },
    ]),
    Review.aggregate([{ $match: { hidden: false } }, { $group: { _id: null, avg: { $avg: '$rating' }, n: { $sum: 1 } } }]),
    Report.countDocuments({ status: 'open' }),
    ContactMessage.countDocuments({ status: 'open' }),
    ServiceRequest.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, n: { $sum: 1 } } },
    ]),
    Offer.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, n: { $sum: 1 } } },
    ]),
    User.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, n: { $sum: 1 } } },
    ]),
    AnalyticsEvent.aggregate([{ $match: { type: 'page_view', day: { $gte: days[0] } } }, { $group: { _id: '$day', n: { $sum: 1 } } }]),
    ServiceRequest.aggregate([
      { $match: { removed: false } },
      { $group: { _id: '$category', n: { $sum: 1 } } },
      { $sort: { n: -1 } },
      { $limit: 6 },
      { $lookup: { from: 'categories', localField: '_id', foreignField: '_id', as: 'c' } },
      { $unwind: '$c' },
    ]),
    AnalyticsEvent.aggregate([
      { $match: { type: 'search', query: { $ne: '' }, day: { $gte: days[0] } } },
      { $group: { _id: { $toLower: '$query' }, n: { $sum: 1 } } },
      { $sort: { n: -1 } },
      { $limit: 8 },
    ]),
    User.countDocuments({ createdAt: { $gte: monthStart } }),
    User.countDocuments({ createdAt: { $gte: prevMonthStart, $lt: monthStart } }),
    ServiceRequest.aggregate([
      { $group: { _id: '$customer', n: { $sum: 1 } } },
      { $group: { _id: null, customers: { $sum: 1 }, repeat: { $sum: { $cond: [{ $gte: ['$n', 2] }, 1, 0] } } } },
    ]),
  ]);

  const roleCount = (role, status) => usersByRole.filter((u) => u._id.role === role && (!status || u._id.status === status)).reduce((n, u) => n + u.n, 0);
  const reqCount = Object.fromEntries(requestsByStatus.map((r) => [r._id, r.n]));
  const totalReq = Object.values(reqCount).reduce((a, b) => a + b, 0);
  const decidedBase = totalReq - (reqCount.cancelled || 0);
  const converted = (reqCount.assigned || 0) + (reqCount.completed || 0);
  const completed = reqCount.completed || 0;
  const reviewedCount = await ServiceRequest.countDocuments({ status: 'completed', reviewed: true });
  const fo = firstOffer[0];
  const sortedMins = [...(fo?.all || [])].sort((a, b) => a - b);
  const median = sortedMins.length ? Math.round(sortedMins[Math.floor(sortedMins.length / 2)]) : null;

  const series = (rows) => {
    const m = new Map(rows.map((r) => [r._id, r.n]));
    return days.map((d) => ({ day: d, n: m.get(d) || 0 }));
  };

  const avgOffers = offersPerRequest[0] ? Math.round(offersPerRequest[0].avg * 10) / 10 : 0;
  const avgRating = ratingAgg[0] ? Math.round(ratingAgg[0].avg * 100) / 100 : 0;
  const conversionPct = decidedBase ? Math.round((converted / decidedBase) * 100) : 0;
  const reviewPct = completed ? Math.round((reviewedCount / completed) * 100) : 0;
  const within30Pct = fo?.n ? Math.round((fo.within30 / fo.n) * 100) : 0;

  res.json({
    totals: {
      customers: roleCount('customer'),
      providers: roleCount('provider'),
      verifiedProviders: await User.countDocuments({ role: 'provider', 'provider.verification.status': 'verified' }),
      suspended: usersByRole.filter((u) => u._id.status === 'suspended').reduce((n, u) => n + u.n, 0),
      requests: totalReq,
      offers: offersTotal,
      reviews: ratingAgg[0]?.n || 0,
      pendingVerifications,
      openReports,
      openInbox,
    },
    requestsByStatus: { open: reqCount.open || 0, assigned: reqCount.assigned || 0, completed, cancelled: reqCount.cancelled || 0 },
    // Proposal section 7: success criteria, each with its target.
    successCriteria: [
      { key: 'offers', label: 'Average offers per request', value: avgOffers, display: `${avgOffers}`, target: '3 or more', met: avgOffers >= 3 },
      {
        key: 'firstOffer',
        label: 'Median time to first offer',
        value: median,
        display: median === null ? 'No data' : `${median} min (${within30Pct}% within 30 min)`,
        target: '30 min or less',
        met: median !== null && median <= 30,
      },
      { key: 'conversion', label: 'Requests converted to a hire', value: conversionPct, display: `${conversionPct}%`, target: '50% or more', met: conversionPct >= 50 },
      { key: 'rating', label: 'Average provider rating', value: avgRating, display: avgRating ? `${avgRating.toFixed(2)} / 5` : 'No data', target: '4.0 or higher', met: avgRating >= 4 },
      { key: 'reviews', label: 'Completed jobs reviewed', value: reviewPct, display: `${reviewPct}%`, target: '40% or more', met: reviewPct >= 40 },
      {
        key: 'growth',
        label: 'New sign-ups this month',
        value: signupsThisMonth,
        display: `${signupsThisMonth} (last month ${signupsPrevMonth})`,
        target: 'Month-on-month growth',
        met: signupsThisMonth >= signupsPrevMonth,
      },
      {
        key: 'repeat',
        label: 'Repeat customers',
        value: repeat[0]?.customers ? Math.round((repeat[0].repeat / repeat[0].customers) * 100) : 0,
        display: repeat[0]?.customers ? `${Math.round((repeat[0].repeat / repeat[0].customers) * 100)}% of customers` : 'No data',
        target: 'Growing',
        met: (repeat[0]?.repeat || 0) > 0,
      },
    ],
    daily: {
      days,
      requests: series(requestsDaily),
      offers: series(offersDaily),
      signups: series(signupsDaily),
      pageViews: series(viewsDaily),
    },
    topCategories: topCategories.map((t) => ({ name: t.c.name, slug: t.c.slug, n: t.n })),
    topSearches: topSearches.map((s) => ({ query: s._id, n: s.n })),
    server: { uptimeSeconds: Math.round(process.uptime()), node: process.version },
  });
});

/* ---------- Users ---------- */

router.get('/users', async (req, res) => {
  const pg = paginate(req.query, { defaultLimit: 20 });
  const filter = {};
  if (['customer', 'provider', 'admin'].includes(req.query.role)) filter.role = req.query.role;
  if (['active', 'suspended'].includes(req.query.status)) filter.status = req.query.status;
  if (req.query.q) {
    const rx = new RegExp(escapeRegex(String(req.query.q).slice(0, 80)), 'i');
    filter.$or = [{ name: rx }, { email: rx }, { phone: rx }];
  }
  const [docs, total] = await Promise.all([User.find(filter).sort({ createdAt: -1 }).skip(pg.skip).limit(pg.limit).lean(), User.countDocuments(filter)]);
  res.json(
    pageResult(
      docs.map((u) => ({
        id: u._id.toString(),
        name: u.name,
        email: u.email,
        phone: u.phone,
        role: u.role,
        avatar: u.avatar,
        city: u.city,
        area: u.area,
        status: u.status,
        suspendedReason: u.suspendedReason,
        emailVerified: u.emailVerified,
        verification: u.provider?.verification?.status || null,
        rating: u.provider ? { avg: u.provider.ratingAvg, count: u.provider.ratingCount } : null,
        createdAt: u.createdAt,
        lastSeenAt: u.lastSeenAt,
      })),
      total,
      pg
    )
  );
});

router.patch(
  '/users/:id/status',
  validate(z.object({ status: z.enum(['active', 'suspended']), reason: z.string().trim().max(300).optional().default('') })),
  async (req, res) => {
    assertObjectId(req.params.id, 'User');
    const user = await User.findById(req.params.id);
    if (!user) throw notFound('User not found.');
    if (user.role === 'admin') throw badRequest('Admin accounts cannot be suspended here.');
    if (req.body.status === 'suspended' && !req.body.reason) throw badRequest('Give a reason for the suspension.', { reason: 'Required.' });
    user.status = req.body.status;
    user.suspendedReason = req.body.status === 'suspended' ? req.body.reason : '';
    if (req.body.status === 'suspended') {
      user.tokenVersion = (user.tokenVersion || 0) + 1; // ends all sessions
      // Withdraw live offers so customers are not waiting on a suspended provider.
      const pending = await Offer.find({ provider: user._id, status: 'pending' }).select('request');
      await Offer.updateMany({ provider: user._id, status: 'pending' }, { $set: { status: 'withdrawn', withdrawnAt: new Date() } });
      for (const o of pending) await refreshOfferStats(o.request);
    }
    await user.save();
    if (req.body.status === 'suspended') disconnectUser(user._id);
    else await notify(user._id, { type: 'account', title: 'Your account is active again', body: 'Welcome back to LocalFix.', link: '/dashboard' });
    res.json({ ok: true, status: user.status });
  }
);

/* ---------- Provider verification ---------- */

router.get('/verifications', async (req, res) => {
  const status = ['pending', 'verified', 'rejected', 'unverified'].includes(req.query.status) ? req.query.status : 'pending';
  const docs = await User.find({ role: 'provider', 'provider.verification.status': status })
    .sort({ 'provider.verification.submittedAt': -1, createdAt: -1 })
    .limit(100)
    .select('+provider.verification.documentPath')
    .populate('provider.categories');
  res.json({
    items: docs.map((u) => ({
      ...providerProfile(u, { includePrivate: true }),
      email: u.email,
      phone: u.phone,
      hasDocument: Boolean(u.provider?.verification?.documentPath),
      createdAt: u.createdAt,
    })),
  });
});

router.get('/verifications/:id/document', async (req, res) => {
  assertObjectId(req.params.id, 'Provider');
  const u = await User.findById(req.params.id).select('+provider.verification.documentPath');
  const rel = u?.provider?.verification?.documentPath;
  if (!rel) throw notFound('No document uploaded.');
  const base = rel.startsWith('seed:') ? env.SEED_PRIVATE : env.PRIVATE_UPLOAD_DIR;
  const file = path.resolve(base, rel.replace(/^seed:/, ''));
  if (!file.startsWith(base) || !fs.existsSync(file)) throw notFound('Document file is missing.');
  res.setHeader('Cache-Control', 'private, no-store');
  res.sendFile(file);
});

router.post(
  '/verifications/:id',
  validate(z.object({ decision: z.enum(['verified', 'rejected']), note: z.string().trim().max(500).optional().default('') })),
  async (req, res) => {
    assertObjectId(req.params.id, 'Provider');
    const u = await User.findOne({ _id: req.params.id, role: 'provider' });
    if (!u) throw notFound('Provider not found.');
    if (req.body.decision === 'rejected' && !req.body.note) throw badRequest('Tell the provider why, so they can fix it.', { note: 'Required.' });
    u.provider.verification.status = req.body.decision;
    u.provider.verification.reviewedAt = new Date();
    u.provider.verification.reviewedBy = req.user._id;
    u.provider.verification.note = req.body.note;
    await u.save();
    await notify(u._id, {
      type: 'verification',
      title: req.body.decision === 'verified' ? 'You are verified!' : 'Verification needs attention',
      body:
        req.body.decision === 'verified'
          ? 'Your profile now shows the Verified badge and you can send offers.'
          : `We could not verify your documents: ${req.body.note}`,
      link: req.body.decision === 'verified' ? '/provider/requests' : '/provider/profile#verification',
    });
    emitToUser(u._id, 'account:updated', {});
    res.json({ ok: true });
  }
);

/* ---------- Content moderation ---------- */

router.get('/requests', async (req, res) => {
  const pg = paginate(req.query, { defaultLimit: 20 });
  const filter = {};
  if (['open', 'assigned', 'completed', 'cancelled'].includes(req.query.status)) filter.status = req.query.status;
  if (req.query.removed === 'true') filter.removed = true;
  if (req.query.q) {
    const rx = new RegExp(escapeRegex(String(req.query.q).slice(0, 80)), 'i');
    filter.$or = [{ title: rx }, { description: rx }];
  }
  const [docs, total] = await Promise.all([
    ServiceRequest.find(filter)
      .sort({ createdAt: -1 })
      .skip(pg.skip)
      .limit(pg.limit)
      .populate('category')
      .populate('customer', 'name avatar role createdAt phone city')
      .populate('assignedProvider', PROVIDER_FIELDS),
    ServiceRequest.countDocuments(filter),
  ]);
  res.json(pageResult(docs.map((d) => serializeRequest(d, req.user)), total, pg));
});

router.delete('/requests/:id', validate(z.object({ reason: z.string().trim().min(3, 'Give a reason.').max(300) })), async (req, res) => {
  assertObjectId(req.params.id, 'Request');
  const r = await ServiceRequest.findById(req.params.id);
  if (!r) throw notFound('Request not found.');
  const bidders = await Offer.find({ request: r._id, status: { $in: ['pending', 'accepted'] } }).select('provider').lean();
  await Offer.updateMany({ request: r._id, status: 'pending' }, { $set: { status: 'rejected' } });
  r.removed = true;
  r.removedReason = req.body.reason;
  if (['open', 'assigned'].includes(r.status)) {
    r.status = 'cancelled';
    r.cancelledAt = new Date();
    r.cancelReason = 'Removed by moderator';
  }
  await r.save();
  await refreshOfferStats(r._id);
  await notify(r.customer, {
    type: 'account',
    title: 'Your request was removed',
    body: `"${r.title}" was removed by our moderators: ${req.body.reason}`,
    link: '/terms',
  });
  await notify(bidders.map((b) => b.provider), { type: 'request_cancelled', title: 'A request was removed', body: `"${r.title}" is no longer available.`, link: '/provider/offers' });
  res.json({ ok: true });
});

router.post('/requests/:id/restore', async (req, res) => {
  assertObjectId(req.params.id, 'Request');
  const r = await ServiceRequest.findById(req.params.id);
  if (!r) throw notFound('Request not found.');
  r.removed = false;
  r.removedReason = '';
  await r.save();
  res.json({ ok: true });
});

router.get('/reviews', async (req, res) => {
  const pg = paginate(req.query, { defaultLimit: 20 });
  const filter = {};
  if (req.query.hidden === 'true') filter.hidden = true;
  const rating = Number(req.query.rating);
  if (rating >= 1 && rating <= 5) filter.rating = rating;
  const [docs, total] = await Promise.all([
    Review.find(filter)
      .sort({ createdAt: -1 })
      .skip(pg.skip)
      .limit(pg.limit)
      .populate('customer', 'name avatar city')
      .populate('provider', 'name avatar role')
      .populate({ path: 'request', select: 'title category', populate: { path: 'category' } }),
    Review.countDocuments(filter),
  ]);
  res.json(pageResult(docs.map((r) => serializeReview(r, { showHidden: true })), total, pg));
});

router.patch('/reviews/:id', validate(z.object({ hidden: z.boolean() })), async (req, res) => {
  assertObjectId(req.params.id, 'Review');
  const rv = await Review.findByIdAndUpdate(req.params.id, { $set: { hidden: req.body.hidden } }, { new: true });
  if (!rv) throw notFound('Review not found.');
  await refreshProviderRating(rv.provider);
  res.json({ ok: true });
});

router.delete('/messages/:id', async (req, res) => {
  assertObjectId(req.params.id, 'Message');
  const m = await Message.findByIdAndUpdate(req.params.id, { $set: { removed: true } }, { new: true });
  if (!m) throw notFound('Message not found.');
  const conv = await Conversation.findById(m.conversation).select('customer provider');
  if (conv) {
    for (const uid of [conv.customer, conv.provider]) emitToUser(uid, 'message:removed', { id: m._id.toString(), conversationId: conv._id.toString() });
  }
  res.json({ ok: true });
});

/* ---------- Reports ---------- */

async function reportTarget(rep) {
  if (rep.targetType === 'user') {
    const u = await User.findById(rep.targetId).select('name role avatar status email');
    return u ? { ...userSummary(u), status: u.status, email: u.email, link: u.role === 'provider' ? `/providers/${u._id}` : null } : null;
  }
  if (rep.targetType === 'request') {
    const r = await ServiceRequest.findById(rep.targetId).select('title status removed customer');
    return r ? { id: r._id.toString(), title: r.title, status: r.status, removed: r.removed, ownerId: r.customer?.toString(), link: `/requests/${r._id}` } : null;
  }
  if (rep.targetType === 'review') {
    const rv = await Review.findById(rep.targetId).select('rating comment hidden provider customer');
    return rv ? { id: rv._id.toString(), rating: rv.rating, comment: rv.comment, hidden: rv.hidden, link: `/providers/${rv.provider}` } : null;
  }
  if (rep.targetType === 'message') {
    const m = await Message.findById(rep.targetId).select('text removed sender');
    return m ? { id: m._id.toString(), text: m.text, removed: m.removed, senderId: m.sender?.toString() } : null;
  }
  return null;
}

router.get('/reports', async (req, res) => {
  const status = ['open', 'resolved', 'dismissed'].includes(req.query.status) ? req.query.status : 'open';
  const docs = await Report.find({ status }).sort({ createdAt: -1 }).limit(100).populate('reporter', 'name avatar role').populate('handledBy', 'name');
  const items = [];
  for (const rep of docs) {
    items.push({
      id: rep._id.toString(),
      targetType: rep.targetType,
      targetId: rep.targetId.toString(),
      targetLabel: rep.targetLabel,
      target: await reportTarget(rep),
      reason: rep.reason,
      details: rep.details,
      status: rep.status,
      resolutionNote: rep.resolutionNote,
      reporter: rep.reporter ? userSummary(rep.reporter) : { name: 'Deleted user' },
      handledBy: rep.handledBy?.name || null,
      handledAt: rep.handledAt || null,
      createdAt: rep.createdAt,
    });
  }
  res.json({ items });
});

router.patch(
  '/reports/:id',
  validate(z.object({ status: z.enum(['resolved', 'dismissed', 'open']), resolutionNote: z.string().trim().max(500).optional().default('') })),
  async (req, res) => {
    assertObjectId(req.params.id, 'Report');
    const rep = await Report.findById(req.params.id);
    if (!rep) throw notFound('Report not found.');
    rep.status = req.body.status;
    rep.resolutionNote = req.body.resolutionNote;
    rep.handledBy = req.user._id;
    rep.handledAt = new Date();
    await rep.save();
    if (rep.reporter && req.body.status !== 'open') {
      await notify(rep.reporter, {
        type: 'report',
        title: 'Update on your report',
        body: req.body.status === 'resolved' ? 'Thanks. We reviewed your report and took action.' : 'We reviewed your report and found no rule was broken.',
        link: '',
      });
    }
    res.json({ ok: true });
  }
);

/* ---------- Categories ---------- */

const categorySchema = z.object({
  name: z.string().trim().min(2).max(60),
  icon: z.string().trim().regex(/^[A-Za-z]+$/, 'Icon must be a Phosphor icon name, e.g. Wrench.').max(40).optional().default('Wrench'),
  description: z.string().trim().max(300).optional().default(''),
  active: z.boolean().optional().default(true),
  order: z.coerce.number().int().min(0).max(999).optional().default(0),
});

router.get('/categories', async (req, res) => {
  const [cats, counts] = await Promise.all([
    Category.find().sort({ order: 1, name: 1 }).lean(),
    ServiceRequest.aggregate([{ $group: { _id: '$category', n: { $sum: 1 } } }]),
  ]);
  const m = new Map(counts.map((c) => [c._id.toString(), c.n]));
  res.json({ items: cats.map((c) => ({ ...serializeCategory(c), requests: m.get(c._id.toString()) || 0 })) });
});

router.post('/categories', imageUpload.single('image'), parseMultipartJson, validate(categorySchema), async (req, res) => {
  const slug = slugify(req.body.name);
  if (await Category.exists({ $or: [{ slug }, { name: req.body.name }] })) throw conflict('A category with this name already exists.');
  const image = req.file ? await saveImage(req.file, 'categories', { maxWidth: 1200, maxHeight: 800 }) : '';
  const cat = await Category.create({ ...req.body, slug, image });
  res.status(201).json({ category: serializeCategory(cat) });
});

router.patch('/categories/:id', imageUpload.single('image'), parseMultipartJson, validate(categorySchema.partial()), async (req, res) => {
  assertObjectId(req.params.id, 'Category');
  const cat = await Category.findById(req.params.id);
  if (!cat) throw notFound('Category not found.');
  if (req.body.name && req.body.name !== cat.name) {
    const slug = slugify(req.body.name);
    if (await Category.exists({ _id: { $ne: cat._id }, $or: [{ slug }, { name: req.body.name }] })) throw conflict('A category with this name already exists.');
    cat.slug = slug;
  }
  Object.assign(cat, req.body);
  if (req.file) cat.image = await saveImage(req.file, 'categories', { maxWidth: 1200, maxHeight: 800 });
  await cat.save();
  res.json({ category: serializeCategory(cat) });
});

router.delete('/categories/:id', async (req, res) => {
  assertObjectId(req.params.id, 'Category');
  const used = await ServiceRequest.exists({ category: req.params.id });
  if (used) throw conflict('This category has requests. Deactivate it instead of deleting it.');
  await Category.deleteOne({ _id: req.params.id });
  await User.updateMany({ 'provider.categories': req.params.id }, { $pull: { 'provider.categories': req.params.id } });
  res.json({ ok: true });
});

/* ---------- Maintenance tips (content) ---------- */

const tipSchema = z.object({
  title: z.string().trim().min(5).max(140),
  excerpt: z.string().trim().max(300).optional().default(''),
  body: z.string().trim().min(50, 'Write at least 50 characters.').max(20_000),
  categoryId: z.string().refine(isObjectId).nullable().optional(),
  published: z.boolean().optional().default(true),
});

function serializeTipAdmin(t) {
  return {
    id: t._id.toString(),
    title: t.title,
    slug: t.slug,
    excerpt: t.excerpt,
    body: t.body,
    cover: t.cover,
    category: t.category ? serializeCategory(t.category) : null,
    published: t.published,
    publishedAt: t.publishedAt,
    updatedAt: t.updatedAt,
  };
}

router.get('/tips', async (req, res) => {
  const tips = await Tip.find().sort({ publishedAt: -1 }).populate('category');
  res.json({ items: tips.map(serializeTipAdmin) });
});

router.post('/tips', imageUpload.single('cover'), parseMultipartJson, validate(tipSchema), async (req, res) => {
  let slug = slugify(req.body.title);
  if (await Tip.exists({ slug })) slug = `${slug}-${Date.now().toString(36)}`;
  const cover = req.file ? await saveImage(req.file, 'tips', { maxWidth: 1400, maxHeight: 900 }) : '';
  const tip = await Tip.create({
    title: req.body.title,
    excerpt: req.body.excerpt,
    body: req.body.body,
    category: req.body.categoryId || undefined,
    published: req.body.published,
    publishedAt: new Date(),
    author: req.user._id,
    slug,
    cover,
  });
  await tip.populate('category');
  res.status(201).json({ tip: serializeTipAdmin(tip) });
});

router.patch('/tips/:id', imageUpload.single('cover'), parseMultipartJson, validate(tipSchema.partial()), async (req, res) => {
  assertObjectId(req.params.id, 'Article');
  const tip = await Tip.findById(req.params.id);
  if (!tip) throw notFound('Article not found.');
  const { categoryId, ...rest } = req.body;
  Object.assign(tip, rest);
  if (categoryId !== undefined) tip.category = categoryId || undefined;
  if (req.file) tip.cover = await saveImage(req.file, 'tips', { maxWidth: 1400, maxHeight: 900 });
  await tip.save();
  await tip.populate('category');
  res.json({ tip: serializeTipAdmin(tip) });
});

router.delete('/tips/:id', async (req, res) => {
  assertObjectId(req.params.id, 'Article');
  await Tip.deleteOne({ _id: req.params.id });
  res.json({ ok: true });
});

/* ---------- Support inbox ---------- */

router.get('/inbox', async (req, res) => {
  const status = ['open', 'closed'].includes(req.query.status) ? req.query.status : 'open';
  const items = await ContactMessage.find({ status }).sort({ createdAt: -1 }).limit(100).lean();
  res.json({
    items: items.map((m) => ({
      id: m._id.toString(),
      name: m.name,
      email: m.email,
      topic: m.topic,
      message: m.message,
      status: m.status,
      createdAt: m.createdAt,
    })),
  });
});

router.patch('/inbox/:id', validate(z.object({ status: z.enum(['open', 'closed']) })), async (req, res) => {
  assertObjectId(req.params.id, 'Message');
  const m = await ContactMessage.findByIdAndUpdate(req.params.id, { $set: { status: req.body.status } }, { new: true });
  if (!m) throw notFound('Message not found.');
  res.json({ ok: true });
});

export default router;
