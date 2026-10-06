import { Router } from 'express';
import { requireRole } from '../middleware/auth.js';
import { Conversation, Offer, Review, ServiceRequest } from '../models/index.js';
import { serializeRequest, serializeReview } from '../utils/serialize.js';

const router = Router();

const PROVIDER_FIELDS = 'name avatar role city area createdAt lastSeenAt phone provider';

router.get('/customer', requireRole('customer'), async (req, res) => {
  const id = req.user._id;
  const [byStatus, active, awaitingReview, unread] = await Promise.all([
    ServiceRequest.aggregate([{ $match: { customer: id } }, { $group: { _id: '$status', n: { $sum: 1 } } }]),
    ServiceRequest.find({ customer: id, status: { $in: ['open', 'assigned'] } })
      .sort({ updatedAt: -1 })
      .limit(8)
      .populate('category')
      .populate('customer', 'name avatar role createdAt phone')
      .populate('assignedProvider', PROVIDER_FIELDS),
    ServiceRequest.find({ customer: id, status: 'completed', reviewed: false })
      .sort({ completedAt: -1 })
      .limit(5)
      .populate('category')
      .populate('customer', 'name avatar role createdAt phone')
      .populate('assignedProvider', PROVIDER_FIELDS),
    Conversation.aggregate([{ $match: { customer: id } }, { $group: { _id: null, n: { $sum: '$unreadCustomer' } } }]),
  ]);
  const counts = Object.fromEntries(byStatus.map((s) => [s._id, s.n]));
  const pendingOffers = await Offer.countDocuments({
    request: { $in: active.filter((r) => r.status === 'open').map((r) => r._id) },
    status: 'pending',
  });
  res.json({
    counts: { open: counts.open || 0, assigned: counts.assigned || 0, completed: counts.completed || 0, cancelled: counts.cancelled || 0 },
    pendingOffers,
    unreadMessages: unread[0]?.n || 0,
    active: active.map((r) => serializeRequest(r, req.user)),
    awaitingReview: awaitingReview.map((r) => serializeRequest(r, req.user)),
  });
});

router.get('/provider', requireRole('provider'), async (req, res) => {
  const id = req.user._id;
  const p = req.user.provider || {};
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [offerCounts, activeJobs, earnings, recentReviews, unread, matching] = await Promise.all([
    Offer.aggregate([{ $match: { provider: id } }, { $group: { _id: '$status', n: { $sum: 1 } } }]),
    ServiceRequest.find({ assignedProvider: id, status: 'assigned' })
      .sort({ assignedAt: -1 })
      .populate('category')
      .populate('customer', 'name avatar role createdAt phone')
      .populate('assignedProvider', PROVIDER_FIELDS),
    Offer.aggregate([
      { $match: { provider: id, status: 'accepted' } },
      { $lookup: { from: 'servicerequests', localField: 'request', foreignField: '_id', as: 'r' } },
      { $unwind: '$r' },
      { $match: { 'r.status': 'completed' } },
      {
        $group: {
          _id: null,
          total: { $sum: '$price' },
          thisMonth: { $sum: { $cond: [{ $gte: ['$r.completedAt', monthStart] }, '$price', 0] } },
        },
      },
    ]),
    Review.find({ provider: id, hidden: false })
      .sort({ createdAt: -1 })
      .limit(3)
      .populate('customer', 'name avatar city')
      .populate({ path: 'request', select: 'title category', populate: { path: 'category' } }),
    Conversation.aggregate([{ $match: { provider: id } }, { $group: { _id: null, n: { $sum: '$unreadProvider' } } }]),
    ServiceRequest.find({
      status: 'open',
      removed: false,
      category: { $in: p.categories || [] },
      customer: { $ne: id },
    })
      .sort({ createdAt: -1 })
      .limit(6)
      .populate('category')
      .populate('customer', 'name avatar role createdAt'),
  ]);

  const counts = Object.fromEntries(offerCounts.map((s) => [s._id, s.n]));
  const decided = (counts.accepted || 0) + (counts.rejected || 0);
  const myOffers = await Offer.find({ provider: id, request: { $in: matching.map((m) => m._id) } }).select('request status price').lean();
  const mine = new Map(myOffers.map((o) => [o.request.toString(), { id: o._id.toString(), status: o.status, price: o.price }]));

  res.json({
    verification: p.verification?.status || 'unverified',
    counts: {
      pending: counts.pending || 0,
      accepted: counts.accepted || 0,
      rejected: counts.rejected || 0,
      withdrawn: counts.withdrawn || 0,
    },
    winRate: decided ? Math.round(((counts.accepted || 0) / decided) * 100) : null,
    rating: { avg: Math.round((p.ratingAvg || 0) * 10) / 10, count: p.ratingCount || 0 },
    jobsCompleted: p.jobsCompleted || 0,
    earnings: { total: earnings[0]?.total || 0, thisMonth: earnings[0]?.thisMonth || 0 },
    unreadMessages: unread[0]?.n || 0,
    availableNow: Boolean(p.availability?.availableNow),
    activeJobs: activeJobs.map((r) => serializeRequest(r, req.user)),
    matching: matching.map((r) => serializeRequest(r, req.user, { myOffer: mine.get(r._id.toString()) || null })),
    recentReviews: recentReviews.map((r) => serializeReview(r)),
  });
});

export default router;
