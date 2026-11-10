// Per-request features built on third-party data: the weather at the job, the drive to it, and a
// calendar file for the booking. Mounted next to routes/requests.js under /requests.
import { Router } from 'express';
import { z } from 'zod';
import { env } from '../config/env.js';
import { getRoute } from '../integrations/routing.js';
import { getForecast, pickDay, workAdvisory } from '../integrations/weather.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { Offer } from '../models/index.js';
import { formatPKR } from '../services/marketplace.js';
import { badRequest, conflict, forbidden, notFound, sameId, serviceUnavailable } from '../utils/http.js';
import { buildEvent } from '../utils/ics.js';
import { externalLimiter } from './geo.js';
import { canView, loadRequest } from './requests.js';

const router = Router();

const r2 = (n) => Math.round(n * 100) / 100;

function isPrivileged(r, user) {
  return Boolean(user && (user.role === 'admin' || sameId(r.customer, user._id) || (r.assignedProvider && sameId(r.assignedProvider, user._id))));
}

/** Forecast for the job's neighbourhood, with advice for the preferred date and the kind of work. */
router.get('/:id/weather', externalLimiter, async (req, res) => {
  const r = await loadRequest(req.params.id, { lean: true });
  if (!(await canView(r, req.user))) throw notFound('This request is no longer available.');
  const [lng, lat] = r.location.point.coordinates;
  let forecast;
  try {
    forecast = await getForecast(lat, lng); // rounded to ~1 km inside, so the exact pin is never sent out
  } catch {
    throw serviceUnavailable('The weather forecast is unavailable right now.');
  }
  const day = pickDay(forecast, r.preferredDate);
  res.set('Cache-Control', 'private, max-age=600');
  res.json({ ...forecast, focus: day, focusIsPreferredDate: Boolean(r.preferredDate && day), advisory: workAdvisory(day, r.category?.slug) });
});

const routeSchema = z.object({
  fromLat: z.coerce.number().min(-90).max(90).optional(),
  fromLng: z.coerce.number().min(-180).max(180).optional(),
});

/**
 * Driving distance and time from the viewer to the job.
 * Privacy: only the customer, the hired provider and admins are routed to the exact pin. Everyone
 * else is routed to the same ~1 km rounded point the public map shows, so the route line cannot be
 * used to find the house.
 */
router.get('/:id/route', requireAuth, externalLimiter, validate(routeSchema, 'query'), async (req, res) => {
  const r = await loadRequest(req.params.id, { lean: true });
  if (!(await canView(r, req.user))) throw notFound('This request is no longer available.');

  let from = null;
  if (req.q.fromLat !== undefined && req.q.fromLng !== undefined) from = { lat: req.q.fromLat, lng: req.q.fromLng };
  else if (req.user.location?.coordinates?.length === 2) from = { lat: req.user.location.coordinates[1], lng: req.user.location.coordinates[0] };
  if (!from) throw badRequest('Share your location to see the travel time.', { fromLat: 'A starting point is required.' });

  const [lng, lat] = r.location.point.coordinates;
  const exact = isPrivileged(r, req.user);
  const to = exact ? { lat, lng } : { lat: r2(lat), lng: r2(lng) };
  const route = await getRoute(from, to); // falls back to a straight-line estimate, never throws
  res.set('Cache-Control', 'private, max-age=300');
  res.json({ route, from, to, approximate: !exact, attribution: route.source === 'osrm' ? 'Route by OSRM. Data © OpenStreetMap contributors' : '' });
});

// Pakistan Standard Time is UTC+5 all year (no daylight saving), which covers the whole launch region.
const PKT_OFFSET_MS = 5 * 60 * 60_000;
const VISIT_HOURS = 2;

/** When the visit is expected: the preferred date at 10:00 local time, otherwise hire time + promised arrival. */
export function visitStart(r, offer) {
  const assignedAt = r.assignedAt ? new Date(r.assignedAt) : new Date();
  if (r.preferredDate) {
    const day = new Date(r.preferredDate);
    const start = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), 10) - PKT_OFFSET_MS);
    if (start.getTime() > assignedAt.getTime()) return start;
  }
  return new Date(assignedAt.getTime() + (offer?.etaMinutes || 60) * 60_000);
}

/** The booked job as an iCalendar file. Only the customer and the hired provider can download it. */
router.get('/:id/calendar.ics', requireAuth, async (req, res) => {
  const r = await loadRequest(req.params.id, { lean: true });
  const isOwner = sameId(r.customer, req.user._id);
  const isAssigned = r.assignedProvider && sameId(r.assignedProvider, req.user._id);
  if (!isOwner && !isAssigned) throw forbidden('Only the customer and the hired provider can add this job to a calendar.');
  if (r.status !== 'assigned') throw conflict('Only a job in progress can be added to a calendar.');

  const offer = r.acceptedOffer ? await Offer.findById(r.acceptedOffer).select('price etaMinutes').lean() : null;
  const start = visitStart(r, offer);
  const other = isOwner ? r.assignedProvider : r.customer;
  const [lng, lat] = r.location.point.coordinates;
  const lines = [
    `${isOwner ? 'Provider' : 'Customer'}: ${other?.name || 'LocalFix user'}${other?.phone ? ` (${other.phone})` : ''}`,
    offer ? `Agreed price: ${formatPKR(offer.price)}` : null,
    `Service: ${r.category?.name || 'Repair'}`,
    '',
    r.description,
    '',
    `Details and chat: ${env.APP_URL}/requests/${r._id}`,
  ];
  const ics = buildEvent({
    uid: `request-${r._id}@localfix`,
    start,
    end: new Date(start.getTime() + VISIT_HOURS * 60 * 60_000),
    summary: `LocalFix: ${r.title}`,
    description: lines.filter((l) => l !== null).join('\n'),
    location: [r.location.address, r.location.area, r.location.city].filter(Boolean).join(', '),
    geo: { lat, lng },
    url: `${env.APP_URL}/requests/${r._id}`,
  });
  res.set({
    'Content-Type': 'text/calendar; charset=utf-8',
    'Content-Disposition': `attachment; filename="localfix-job-${r._id}.ics"`,
    'Cache-Control': 'private, no-store',
  });
  res.send(ics);
});

export default router;
