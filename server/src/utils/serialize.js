import { env } from '../config/env.js';
import { sameId } from './http.js';

const DELETED = { id: null, name: 'Deleted user', avatar: '', role: 'deleted' };

export function shortName(name = '') {
  const parts = String(name).trim().split(/\s+/);
  if (parts.length < 2) return parts[0] || '';
  return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
}

export function haversineKm([lng1, lat1], [lng2, lat2]) {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function serializeCategory(c) {
  if (!c || !c._id) return c ? { id: c.toString() } : null;
  return {
    id: c._id.toString(),
    name: c.name,
    slug: c.slug,
    icon: c.icon,
    description: c.description,
    image: c.image,
    ...(c.active !== undefined ? { active: c.active } : {}),
    ...(c.order !== undefined ? { order: c.order } : {}),
  };
}

export function userSummary(u, { fullName = true } = {}) {
  if (!u || !u._id) return DELETED;
  return {
    id: u._id.toString(),
    name: fullName ? u.name : shortName(u.name),
    avatar: u.avatar || '',
    role: u.role,
  };
}

export function providerCard(u) {
  if (!u || !u._id) return { ...DELETED, verified: false };
  const p = u.provider || {};
  return {
    id: u._id.toString(),
    name: u.name,
    avatar: u.avatar || '',
    city: u.city,
    area: u.area,
    headline: p.headline || '',
    categories: (p.categories || []).map(serializeCategory).filter(Boolean),
    experienceYears: p.experienceYears || 0,
    ratingAvg: Math.round((p.ratingAvg || 0) * 10) / 10,
    ratingCount: p.ratingCount || 0,
    jobsCompleted: p.jobsCompleted || 0,
    verified: p.verification?.status === 'verified',
    availableNow: Boolean(p.availability?.availableNow),
    startingPrice: p.startingPrice ?? null,
    serviceAreas: p.serviceAreas || [],
    memberSince: u.createdAt,
    lastSeenAt: u.lastSeenAt || null,
  };
}

export function providerProfile(u, { includePrivate = false } = {}) {
  const p = u.provider || {};
  return {
    ...providerCard(u),
    bio: p.bio || '',
    certifications: (p.certifications || []).map((c) => ({ id: c._id?.toString(), title: c.title, issuer: c.issuer, year: c.year })),
    gallery: (p.gallery || []).map((g) => ({ id: g._id?.toString(), url: g.url, caption: g.caption, kind: g.kind, createdAt: g.createdAt })),
    availability: {
      availableNow: Boolean(p.availability?.availableNow),
      weekly: (p.availability?.weekly || []).map((d) => ({ day: d.day, enabled: d.enabled, from: d.from, to: d.to })),
    },
    location: u.location?.coordinates?.length === 2 ? { lng: u.location.coordinates[0], lat: u.location.coordinates[1] } : null,
    ...(includePrivate
      ? {
          verification: {
            status: p.verification?.status || 'unverified',
            idLast4: p.verification?.idLast4 || '',
            submittedAt: p.verification?.submittedAt || null,
            reviewedAt: p.verification?.reviewedAt || null,
            note: p.verification?.note || '',
          },
        }
      : {}),
  };
}

/** The signed-in user's own account view. */
export function selfUser(u) {
  if (!u) return null;
  return {
    id: u._id.toString(),
    name: u.name,
    email: u.email,
    phone: u.phone,
    role: u.role,
    avatar: u.avatar || '',
    city: u.city,
    area: u.area,
    emailVerified: Boolean(u.emailVerified),
    mustVerifyEmail: env.REQUIRE_EMAIL_VERIFICATION && !u.emailVerified && u.role !== 'admin',
    status: u.status,
    createdAt: u.createdAt,
    ...(u.role === 'provider' ? { provider: providerProfile(u, { includePrivate: true }) } : {}),
  };
}

/**
 * Request view. Exact address, exact map pin and the customer's full name and phone are only
 * visible to the customer, the selected provider and admins (privacy requirement in the SRS).
 * Everyone else sees the area and a pin rounded to roughly 1 km.
 */
export function serializeRequest(r, viewer, { viewerPoint, myOffer } = {}) {
  const isOwner = viewer && sameId(r.customer, viewer._id);
  const isAssigned = viewer && r.assignedProvider && sameId(r.assignedProvider, viewer._id);
  const isAdmin = viewer?.role === 'admin';
  const privileged = Boolean(isOwner || isAssigned || isAdmin);
  const [lng, lat] = r.location?.point?.coordinates || [0, 0];
  const round = (n) => Math.round(n * 100) / 100;

  const customer = r.customer && r.customer._id
    ? {
        ...userSummary(r.customer, { fullName: privileged }),
        memberSince: r.customer.createdAt,
        ...(isAssigned || isAdmin ? { phone: r.customer.phone || '' } : {}),
      }
    : r.customer
      ? { id: r.customer.toString() }
      : DELETED;

  let assignedProvider = null;
  if (r.assignedProvider) {
    assignedProvider = r.assignedProvider._id
      ? { ...providerCard(r.assignedProvider), ...(privileged ? { phone: r.assignedProvider.phone || '' } : {}) }
      : { id: r.assignedProvider.toString() };
  }

  return {
    id: r._id.toString(),
    title: r.title,
    description: r.description,
    images: r.images || [],
    category: serializeCategory(r.category),
    location: {
      city: r.location?.city,
      area: r.location?.area,
      address: privileged ? r.location?.address || '' : null,
      lat: privileged ? lat : round(lat),
      lng: privileged ? lng : round(lng),
      approximate: !privileged,
    },
    budget: r.budget?.min || r.budget?.max ? { min: r.budget.min ?? null, max: r.budget.max ?? null } : null,
    urgency: r.urgency,
    preferredDate: r.preferredDate || null,
    status: r.status,
    offerCount: r.offerCount || 0,
    lowestOffer: r.lowestOffer ?? null,
    customer,
    assignedProvider,
    acceptedOffer: r.acceptedOffer ? r.acceptedOffer.toString() : null,
    assignedAt: r.assignedAt || null,
    providerMarkedDoneAt: r.providerMarkedDoneAt || null,
    completedAt: r.completedAt || null,
    cancelledAt: r.cancelledAt || null,
    cancelReason: privileged ? r.cancelReason || '' : '',
    reviewed: Boolean(r.reviewed),
    removed: Boolean(r.removed),
    views: r.views || 0,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    viewer: { isOwner: Boolean(isOwner), isAssigned: Boolean(isAssigned), isAdmin: Boolean(isAdmin) },
    ...(viewerPoint ? { distanceKm: Math.round(haversineKm(viewerPoint, [lng, lat]) * 10) / 10 } : {}),
    ...(myOffer !== undefined ? { myOffer } : {}),
  };
}

export function serializeOffer(o, { withProvider = true } = {}) {
  return {
    id: o._id.toString(),
    request: o.request?._id ? o.request._id.toString() : o.request?.toString(),
    price: o.price,
    etaMinutes: o.etaMinutes,
    details: o.details,
    warrantyDays: o.warrantyDays || 0,
    includesMaterials: Boolean(o.includesMaterials),
    status: o.status,
    history: (o.history || []).map((h) => ({ price: h.price, etaMinutes: h.etaMinutes, at: h.at })),
    acceptedAt: o.acceptedAt || null,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
    ...(withProvider ? { provider: providerCard(o.provider) } : {}),
  };
}

export function serializeReview(rv, { showHidden = false } = {}) {
  return {
    id: rv._id.toString(),
    rating: rv.rating,
    comment: rv.hidden && !showHidden ? '' : rv.comment,
    reply: rv.reply?.text ? { text: rv.reply.text, at: rv.reply.at } : null,
    hidden: Boolean(rv.hidden),
    customer: rv.customer?._id ? { ...userSummary(rv.customer, { fullName: false }), city: rv.customer.city } : DELETED,
    provider: rv.provider?._id ? userSummary(rv.provider) : rv.provider ? { id: rv.provider.toString() } : DELETED,
    request: rv.request?._id
      ? { id: rv.request._id.toString(), title: rv.request.title, category: serializeCategory(rv.request.category) }
      : rv.request
        ? { id: rv.request.toString() }
        : null,
    createdAt: rv.createdAt,
  };
}

export function serializeNotification(n) {
  return {
    id: n._id.toString(),
    type: n.type,
    title: n.title,
    body: n.body,
    link: n.link,
    read: n.read,
    createdAt: n.createdAt,
  };
}

export function serializeMessage(m) {
  return {
    id: m._id.toString(),
    conversation: m.conversation.toString(),
    sender: m.sender ? m.sender.toString() : null,
    kind: m.kind,
    text: m.removed ? 'This message was removed by a moderator.' : m.text,
    removed: Boolean(m.removed),
    readAt: m.readAt || null,
    createdAt: m.createdAt,
  };
}
