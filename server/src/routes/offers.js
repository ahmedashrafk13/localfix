import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { writeLimiter } from '../middleware/security.js';
import { validate } from '../middleware/validate.js';
import { Offer, ServiceRequest } from '../models/index.js';
import { formatEta, formatPKR, refreshOfferStats, systemNote } from '../services/marketplace.js';
import { notify, track } from '../services/notify.js';
import { emitToUser, emitToUsers } from '../socket/index.js';
import { assertObjectId, conflict, forbidden, notFound, pageResult, paginate, sameId } from '../utils/http.js';
import { serializeOffer, serializeRequest } from '../utils/serialize.js';

const router = Router();
router.use(requireAuth);

const PROVIDER_FIELDS = 'name avatar role status city area createdAt lastSeenAt phone provider';

/** Provider's own offers ("My Offers" page), with the request they belong to. */
router.get('/mine', requireRole('provider'), async (req, res) => {
  const status = ['pending', 'accepted', 'rejected', 'withdrawn'].includes(req.query.status) ? req.query.status : null;
  const filter = { provider: req.user._id, ...(status ? { status } : {}) };
  const pg = paginate(req.query, { defaultLimit: 20 });
  const [offers, total, counts] = await Promise.all([
    Offer.find(filter)
      .sort({ updatedAt: -1 })
      .skip(pg.skip)
      .limit(pg.limit)
      .populate({ path: 'request', populate: [{ path: 'category' }, { path: 'customer', select: 'name avatar role createdAt phone city' }, { path: 'assignedProvider', select: PROVIDER_FIELDS }] }),
    Offer.countDocuments(filter),
    Offer.aggregate([{ $match: { provider: req.user._id } }, { $group: { _id: '$status', n: { $sum: 1 } } }]),
  ]);
  const items = offers
    .filter((o) => o.request)
    .map((o) => ({ ...serializeOffer(o, { withProvider: false }), request: serializeRequest(o.request, req.user) }));
  res.json({ ...pageResult(items, total, pg), counts: Object.fromEntries(counts.map((c) => [c._id, c.n])) });
});

async function loadOwnOffer(req) {
  assertObjectId(req.params.id, 'Offer');
  const offer = await Offer.findById(req.params.id);
  if (!offer) throw notFound('Offer not found.');
  if (!sameId(offer.provider, req.user._id)) throw forbidden();
  return offer;
}

const editSchema = z
  .object({
    price: z.coerce.number().int().min(100, 'The minimum offer is Rs 100.').max(5_000_000).optional(),
    etaMinutes: z.coerce.number().int().min(5).max(10_080).optional(),
    details: z.string().trim().min(10).max(1000).optional(),
    warrantyDays: z.coerce.number().int().min(0).max(365).optional(),
    includesMaterials: z.boolean().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, 'Nothing to update.');

/** Edit an offer, typically after negotiating in chat. Price/ETA changes are kept in the history. */
router.patch('/:id', requireRole('provider'), writeLimiter, validate(editSchema), async (req, res) => {
  const offer = await loadOwnOffer(req);
  if (offer.status !== 'pending') throw conflict('Only pending offers can be edited.');
  const r = await ServiceRequest.findById(offer.request);
  if (!r || r.status !== 'open') throw conflict('This request is no longer accepting changes.');

  const before = { price: offer.price, etaMinutes: offer.etaMinutes };
  Object.assign(offer, req.body);
  const changed = before.price !== offer.price || before.etaMinutes !== offer.etaMinutes;
  if (changed) offer.history.push({ price: offer.price, etaMinutes: offer.etaMinutes });
  await offer.save();
  await refreshOfferStats(r._id);

  if (changed) {
    const summary = `${formatPKR(offer.price)}, arrival in ${formatEta(offer.etaMinutes)}`;
    await notify(r.customer, {
      type: 'offer_updated',
      title: `${req.user.name} updated their offer`,
      body: `New offer for "${r.title}": ${summary}.`,
      link: `/requests/${r._id}`,
    });
    await systemNote(r._id, req.user._id, `Offer updated: ${summary} (was ${formatPKR(before.price)}).`);
  }
  emitToUser(r.customer, 'offer:new', { requestId: r._id.toString() });
  await offer.populate('provider', PROVIDER_FIELDS);
  res.json({ offer: serializeOffer(offer) });
});

router.post('/:id/withdraw', requireRole('provider'), async (req, res) => {
  const offer = await loadOwnOffer(req);
  if (offer.status !== 'pending') throw conflict('Only pending offers can be withdrawn.');
  offer.status = 'withdrawn';
  offer.withdrawnAt = new Date();
  await offer.save();
  await refreshOfferStats(offer.request);
  const r = await ServiceRequest.findById(offer.request).select('customer title');
  if (r) {
    await notify(r.customer, {
      type: 'offer_withdrawn',
      title: 'An offer was withdrawn',
      body: `${req.user.name} withdrew their offer on "${r.title}".`,
      link: `/requests/${r._id}`,
    });
    await systemNote(r._id, req.user._id, `${req.user.name} withdrew their offer.`);
    emitToUser(r.customer, 'offer:new', { requestId: r._id.toString() });
  }
  await offer.populate('provider', PROVIDER_FIELDS);
  res.json({ offer: serializeOffer(offer) });
});

/**
 * Customer accepts one offer (FR7). The request moves to "assigned", every other pending offer is
 * declined, and all bidders are notified. The status guard in the update makes this safe if two
 * accept clicks race: only the first one can move the request out of "open".
 */
router.post('/:id/accept', requireRole('customer'), async (req, res) => {
  assertObjectId(req.params.id, 'Offer');
  const offer = await Offer.findById(req.params.id).populate('provider', PROVIDER_FIELDS);
  if (!offer) throw notFound('Offer not found.');
  if (offer.status !== 'pending') throw conflict('This offer is no longer available.');
  if (!offer.provider || offer.provider.status !== 'active') throw conflict('This provider is not available any more.');

  const r = await ServiceRequest.findOneAndUpdate(
    { _id: offer.request, customer: req.user._id, status: 'open' },
    { $set: { status: 'assigned', acceptedOffer: offer._id, assignedProvider: offer.provider._id, assignedAt: new Date() } },
    { new: true }
  );
  if (!r) {
    const exists = await ServiceRequest.exists({ _id: offer.request, customer: req.user._id });
    throw exists ? conflict('You have already chosen a provider for this request.') : forbidden();
  }

  offer.status = 'accepted';
  offer.acceptedAt = new Date();
  await offer.save();

  const others = await Offer.find({ request: r._id, status: 'pending', _id: { $ne: offer._id } }).select('provider').lean();
  await Offer.updateMany({ request: r._id, status: 'pending', _id: { $ne: offer._id } }, { $set: { status: 'rejected' } });
  await refreshOfferStats(r._id);
  track('offer_accepted', { role: 'customer' });

  await notify(offer.provider._id, {
    type: 'offer_accepted',
    title: 'You got the job!',
    body: `${req.user.name} accepted your ${formatPKR(offer.price)} offer for "${r.title}". The exact address is now visible.`,
    link: `/requests/${r._id}`,
  });
  await systemNote(r._id, offer.provider._id, `${req.user.name} accepted this offer (${formatPKR(offer.price)}). The address and phone number are now shared.`);

  const otherIds = others.map((o) => o.provider);
  await notify(otherIds, {
    type: 'offer_rejected',
    title: 'The customer chose another provider',
    body: `"${r.title}" has been assigned. Keep an eye out for new requests.`,
    link: '/provider/requests',
  });
  for (const pid of otherIds) await systemNote(r._id, pid, 'The customer chose another provider for this request.');
  emitToUsers([offer.provider._id, ...otherIds], 'request:updated', { id: r._id.toString(), status: 'assigned' });

  res.json({ offer: serializeOffer(offer), requestId: r._id.toString() });
});

export default router;
