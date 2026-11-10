import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import mongoose from 'mongoose';
import sharp from 'sharp';
import { env } from '../config/env.js';
import { findArea } from '../config/places.js';
import {
  AnalyticsEvent,
  Category,
  ContactMessage,
  Conversation,
  Message,
  Notification,
  Offer,
  PushSubscription,
  Report,
  Review,
  ServiceRequest,
  Tip,
  User,
} from '../models/index.js';
import { refreshJobsCompleted, refreshOfferStats, refreshProviderRating } from '../services/marketplace.js';
import { dayKey } from '../utils/http.js';
import {
  ADMIN,
  ADMIN_PASSWORD,
  CATEGORIES,
  CHAT_SCRIPTS,
  CONTACT_MESSAGES,
  CUSTOMERS,
  DEMO_PASSWORD,
  OFFER_NOTES,
  PROVIDERS,
  REQUEST_TEMPLATES,
  REVIEW_COMMENTS,
  SEARCH_QUERIES,
  TIPS,
} from './data.js';

// PushSubscription rows point at users, so they are wiped with them. Setting (the Web Push key pair) is kept.
const ALL_MODELS = [User, Category, ServiceRequest, Offer, Conversation, Message, Review, Notification, Report, Tip, ContactMessage, AnalyticsEvent, PushSubscription];

/* ---------- helpers ---------- */

function mulberry32(seed) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let rand = mulberry32(2026);
const between = (min, max) => min + rand() * (max - min);
const int = (min, max) => Math.floor(between(min, max + 1));
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const roundTo = (n, step) => Math.max(step, Math.round(n / step) * step);

const NOW = () => Date.now();
const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const at = (msAgo) => new Date(NOW() - msAgo);
const plus = (date, ms) => new Date(date.getTime() + ms);

function asset(rel) {
  return fs.existsSync(path.join(env.SEED_ASSETS, rel)) ? `/uploads/seed/${rel.replace(/\\/g, '/')}` : '';
}

/** Validates through Mongoose (defaults + schema rules) but keeps our own createdAt/updatedAt. */
function build(Model, data) {
  const doc = new Model(data);
  const err = doc.validateSync();
  if (err) throw err;
  const obj = doc.toObject({ depopulate: true, virtuals: false, versionKey: false });
  if (data.createdAt) obj.createdAt = data.createdAt;
  if (data.updatedAt || data.createdAt) obj.updatedAt = data.updatedAt || data.createdAt;
  return obj;
}

function pointNear(city, area, jitterKm = 0.8) {
  const a = findArea(city, area) || { lat: 33.6938, lng: 73.0652 };
  const d = jitterKm / 111;
  return [Math.round((a.lng + between(-d, d)) * 1e6) / 1e6, Math.round((a.lat + between(-d, d)) * 1e6) / 1e6];
}

const STREETS = ['Street 12', 'Street 7', 'Street 21', 'Street 3', 'Street 45', 'Street 18', 'Street 9', 'Street 30'];

function etaFor(urgency) {
  const ranges = { emergency: [30, 90], today: [60, 300], this_week: [1440, 4320], flexible: [1440, 7200] };
  const [lo, hi] = ranges[urgency] || ranges.today;
  return roundTo(between(lo, hi), urgency === 'emergency' || urgency === 'today' ? 15 : 60);
}

/**
 * Creates the clearly-labelled fake ID image for the pending provider. It lives in server/seed-private
 * (never served publicly) and is referenced as "seed:<file>" so it survives redeploys.
 */
async function makeSampleIdDocument() {
  const dir = env.SEED_PRIVATE;
  const file = 'sample-moin-akram.webp';
  if (fs.existsSync(path.join(dir, file))) return `seed:${file}`;
  await fsp.mkdir(dir, { recursive: true });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="860" height="540">
    <rect width="860" height="540" rx="28" fill="#e7efe9"/>
    <rect x="24" y="24" width="812" height="492" rx="20" fill="none" stroke="#2f6b4f" stroke-width="4"/>
    <text x="60" y="96" font-family="Arial" font-size="34" font-weight="700" fill="#1f3d2f">SAMPLE IDENTITY DOCUMENT</text>
    <text x="60" y="140" font-family="Arial" font-size="22" fill="#2f6b4f">Demo data only. Not a real ID card.</text>
    <rect x="60" y="180" width="200" height="250" rx="12" fill="#c9d8cf"/>
    <text x="300" y="220" font-family="Arial" font-size="24" fill="#1f3d2f">Name: Moin Akram</text>
    <text x="300" y="270" font-family="Arial" font-size="24" fill="#1f3d2f">Identity No: 00000-0000000-4821</text>
    <text x="300" y="320" font-family="Arial" font-size="24" fill="#1f3d2f">City: Rawalpindi</text>
    <text x="300" y="370" font-family="Arial" font-size="24" fill="#1f3d2f">Issued for: LocalFix demo</text>
  </svg>`;
  await sharp(Buffer.from(svg)).webp({ quality: 85 }).toFile(path.join(dir, file));
  return `seed:${file}`;
}

/* ---------- main ---------- */

export async function seedDatabase({ log = false } = {}) {
  const say = (...args) => log && console.log('[seed]', ...args);
  rand = mulberry32(2026);
  const started = Date.now();

  if (mongoose.connection.readyState !== 1) throw new Error('Connect to MongoDB before seeding.');
  for (const Model of ALL_MODELS) await Model.deleteMany({});
  await Promise.all(ALL_MODELS.map((m) => m.init()));
  if (!fs.existsSync(env.SEED_ASSETS)) say('seed-assets folder not found, sample data will have no photos');

  /* Categories */
  const catDocs = CATEGORIES.map((c, i) =>
    build(Category, { ...c, image: asset(`categories/${c.slug}.webp`), order: i, createdAt: at(400 * DAY) })
  );
  await Category.collection.insertMany(catDocs);
  const cat = Object.fromEntries(catDocs.map((c) => [c.slug, c]));
  say(`${catDocs.length} categories`);

  /* Users */
  const [demoHash, adminHash] = await Promise.all([User.hashPassword(DEMO_PASSWORD), User.hashPassword(ADMIN_PASSWORD)]);
  const users = {};
  const userDocs = [];

  const adminDoc = build(User, {
    ...ADMIN,
    role: 'admin',
    passwordHash: adminHash,
    avatar: asset('avatars/admin.webp'),
    emailVerified: true,
    createdAt: at(420 * DAY),
    lastSeenAt: at(10 * MIN),
  });
  users.admin = adminDoc;
  userDocs.push(adminDoc);

  for (const c of CUSTOMERS) {
    const doc = build(User, {
      name: c.name,
      email: c.email,
      phone: c.phone,
      role: 'customer',
      city: c.city,
      area: c.area,
      passwordHash: demoHash,
      avatar: c.noAvatar ? '' : asset(`avatars/${c.key}.webp`),
      emailVerified: true,
      createdAt: at(c.monthsAgo * 30 * DAY),
      lastSeenAt: at(int(5, 600) * MIN),
    });
    users[c.key] = doc;
    userDocs.push(doc);
  }

  const sampleDoc = await makeSampleIdDocument();
  for (const p of PROVIDERS) {
    const created = at(p.monthsAgo * 30 * DAY);
    const verification =
      p.status === 'verified'
        ? { status: 'verified', idLast4: String(int(1000, 9999)), submittedAt: plus(created, 2 * HOUR), reviewedAt: plus(created, 20 * HOUR), reviewedBy: adminDoc._id }
        : p.status === 'pending'
          ? { status: 'pending', idLast4: '4821', submittedAt: at(3 * HOUR), documentPath: sampleDoc }
          : { status: 'unverified' };
    const doc = build(User, {
      name: p.name,
      email: p.email,
      phone: p.phone,
      role: 'provider',
      city: p.city,
      area: p.area,
      location: { type: 'Point', coordinates: pointNear(p.city, p.area, 0.5) },
      passwordHash: demoHash,
      avatar: asset(`avatars/${p.key}.webp`),
      emailVerified: true,
      createdAt: created,
      lastSeenAt: at(int(2, 300) * MIN),
      provider: {
        headline: p.headline,
        bio: p.bio,
        categories: p.categories.map((s) => cat[s]._id),
        experienceYears: p.experienceYears,
        certifications: p.certifications,
        serviceAreas: p.serviceAreas,
        startingPrice: p.startingPrice ?? undefined,
        availability: { availableNow: p.key !== 'p06' && p.key !== 'p11', weekly: p.weekly },
        verification,
        gallery:
          p.status === 'verified'
            ? p.categories.slice(0, 2).flatMap((slug, i) =>
                [1, 2]
                  .map((n) => ({
                    url: asset(`gallery/${slug}-${n}.webp`),
                    caption: n === 1 ? `Recent ${CATEGORIES.find((c) => c.slug === slug).name.toLowerCase()} job` : 'Finished work',
                    kind: n === 1 && i === 0 ? 'before' : n === 2 && i === 0 ? 'after' : 'work',
                  }))
                  .filter((g) => g.url)
              )
            : [],
      },
    });
    users[p.key] = doc;
    userDocs.push(doc);
  }
  await User.collection.insertMany(userDocs);
  say(`${userDocs.length} users`);

  const providersFor = (slug) =>
    PROVIDERS.filter((p) => p.status === 'verified' && p.categories.includes(slug)).map((p) => p.key);

  /* Requests, offers, conversations, reviews */
  const requestDocs = [];
  const offerDocs = [];
  const convDocs = [];
  const messageDocs = [];
  const reviewDocs = [];
  const notificationDocs = [];
  const refs = {};

  const usage = {};
  function nextTemplate(slug, forced) {
    const list = REQUEST_TEMPLATES[slug];
    if (forced !== undefined) return list[forced];
    usage[slug] = (usage[slug] || 0) + 1;
    return list[(usage[slug] - 1) % list.length];
  }

  function addConversation(requestDoc, providerKey, script, startAt, { unreadFor = null, systemNotes = [] } = {}) {
    const customer = users[Object.keys(users).find((k) => users[k]._id.equals(requestDoc.customer))];
    const provider = users[providerKey];
    const convId = new mongoose.Types.ObjectId();
    const msgs = [];
    for (const note of systemNotes) msgs.push({ kind: 'system', sender: null, text: note.text, createdAt: note.at });
    let t = startAt;
    for (const [who, text] of CHAT_SCRIPTS[script]) {
      t = plus(t, int(2, 25) * MIN);
      msgs.push({ kind: 'text', sender: who === 'customer' ? customer._id : provider._id, text, createdAt: t });
    }
    msgs.sort((a, b) => a.createdAt - b.createdAt);
    const last = msgs[msgs.length - 1];
    // Everything after the reader's own last message is unread (system notes included, as in the live app).
    const readerId = unreadFor === 'customer' ? customer._id : unreadFor === 'provider' ? provider._id : null;
    let lastOwn = -1;
    if (readerId) msgs.forEach((m, i) => { if (m.sender && m.sender.equals(readerId)) lastOwn = i; });
    const unreadCount = readerId ? msgs.length - 1 - lastOwn : 0;
    const unreadCustomer = unreadFor === 'customer' ? unreadCount : 0;
    const unreadProvider = unreadFor === 'provider' ? unreadCount : 0;
    msgs.forEach((m, i) => {
      const unread = readerId && i > lastOwn;
      messageDocs.push(
        build(Message, {
          conversation: convId,
          sender: m.sender,
          kind: m.kind,
          text: m.text,
          readAt: unread || !m.sender ? undefined : plus(m.createdAt, 3 * MIN),
          createdAt: m.createdAt,
        })
      );
    });
    convDocs.push(
      build(Conversation, {
        _id: convId,
        request: requestDoc._id,
        customer: customer._id,
        provider: provider._id,
        lastMessage: { text: last.text.slice(0, 160), sender: last.sender || undefined, at: last.createdAt },
        unreadCustomer,
        unreadProvider,
        createdAt: msgs[0].createdAt,
        updatedAt: last.createdAt,
      })
    );
    return convId;
  }

  /**
   * Creates one request with its offers (and optionally the hire, completion and review).
   * spec: { ref, slug, tpl, customer, status, ageMs, urgency, offers: [providerKey], winner, marked, completedAfterMs, review, cancelReason, chat }
   */
  function addRequest(spec) {
    const customer = users[spec.customer];
    const [title, description, bMin, bMax] = spec.template || nextTemplate(spec.slug, spec.tpl);
    const createdAt = at(spec.ageMs);
    const urgency = spec.urgency || pick(['emergency', 'today', 'today', 'this_week', 'flexible']);
    const area = spec.area || customer.area;
    const city = spec.city || customer.city;
    const reqId = new mongoose.Types.ObjectId();
    const imgN = int(1, 3);
    const images = [asset(`requests/${spec.slug}-${imgN}.webp`), spec.twoImages ? asset(`requests/${spec.slug}-${(imgN % 3) + 1}.webp`) : '']
      .filter(Boolean);

    const providerKeys = spec.offers ?? [];
    const base = between(bMin, bMax);
    let firstOfferAt = null;
    let acceptedOfferId = null;
    let assignedAt = null;
    const offerTimes = {};
    providerKeys.forEach((pk, i) => {
      const offeredAt = plus(createdAt, (i === 0 ? int(4, 28) : int(20, 240)) * MIN);
      if (offeredAt.getTime() > NOW()) return;
      offerTimes[pk] = offeredAt;
      if (!firstOfferAt || offeredAt < firstOfferAt) firstOfferAt = offeredAt;
      let price = roundTo(base * between(0.82, 1.18), base > 20000 ? 1000 : 50);
      if (spec.prices?.[i]) price = spec.prices[i];
      const etaMinutes = spec.etas?.[i] || etaFor(urgency);
      let status = 'pending';
      if (spec.status !== 'open') status = pk === spec.winner ? 'accepted' : 'rejected';
      if (spec.withdrawn?.includes(pk)) status = 'withdrawn';
      const id = new mongoose.Types.ObjectId();
      const negotiated = spec.negotiated === pk;
      const history = negotiated
        ? [
            { price: roundTo(price * 1.12, 50), etaMinutes, at: offeredAt },
            { price, etaMinutes, at: plus(offeredAt, 150 * MIN) },
          ]
        : [{ price, etaMinutes, at: offeredAt }];
      if (status === 'accepted') {
        acceptedOfferId = id;
        assignedAt = spec.assignedAt ? at(spec.assignedAt) : plus(offeredAt, int(30, 180) * MIN);
      }
      offerDocs.push(
        build(Offer, {
          _id: id,
          request: reqId,
          provider: users[pk]._id,
          price,
          etaMinutes,
          details: pick(OFFER_NOTES[spec.slug]),
          warrantyDays: pick([0, 7, 15, 30, 30, 90]),
          includesMaterials: rand() > 0.6,
          status,
          history,
          acceptedAt: status === 'accepted' ? assignedAt : undefined,
          withdrawnAt: status === 'withdrawn' ? plus(offeredAt, 2 * HOUR) : undefined,
          createdAt: offeredAt,
          updatedAt: negotiated ? plus(offeredAt, 150 * MIN) : offeredAt,
        })
      );
    });

    const doc = {
      _id: reqId,
      customer: customer._id,
      category: cat[spec.slug]._id,
      title,
      description,
      images,
      location: {
        city,
        area,
        address: `House ${int(2, 480)}, ${pick(STREETS)}, ${area}, ${city}`,
        point: { type: 'Point', coordinates: pointNear(city, area) },
      },
      budget: spec.noBudget ? {} : { min: bMin, max: bMax },
      urgency,
      preferredDate: urgency === 'this_week' || urgency === 'flexible' ? plus(createdAt, int(2, 6) * DAY) : undefined,
      status: spec.status,
      views: int(3, 40),
      createdAt,
      updatedAt: createdAt,
      firstOfferAt: firstOfferAt || undefined,
    };

    if (acceptedOfferId) {
      doc.acceptedOffer = acceptedOfferId;
      doc.assignedProvider = users[spec.winner]._id;
      doc.assignedAt = assignedAt;
      doc.updatedAt = assignedAt;
    }
    if (spec.status === 'assigned' && spec.marked) {
      doc.providerMarkedDoneAt = at(spec.marked);
      doc.updatedAt = doc.providerMarkedDoneAt;
    }
    if (spec.status === 'completed') {
      doc.completedAt = spec.completedAgoMs ? at(spec.completedAgoMs) : plus(assignedAt, int(3, 30) * HOUR);
      if (doc.completedAt.getTime() > NOW()) doc.completedAt = at(10 * MIN);
      doc.providerMarkedDoneAt = plus(doc.completedAt, -int(20, 90) * MIN);
      doc.updatedAt = doc.completedAt;
      if (spec.review) {
        doc.reviewed = true;
        const rating = spec.review;
        const reviewAt = plus(doc.completedAt, int(1, 20) * HOUR);
        reviewDocs.push(
          build(Review, {
            request: reqId,
            provider: users[spec.winner]._id,
            customer: customer._id,
            rating,
            comment: spec.reviewText ?? pick(REVIEW_COMMENTS[rating]),
            reply: spec.reply ? { text: spec.reply, at: plus(reviewAt, 5 * HOUR) } : undefined,
            createdAt: reviewAt.getTime() > NOW() ? at(5 * MIN) : reviewAt,
          })
        );
      }
    }
    if (spec.status === 'cancelled') {
      doc.cancelledAt = plus(createdAt, int(2, 20) * HOUR);
      if (doc.cancelledAt.getTime() > NOW()) doc.cancelledAt = at(10 * MIN);
      doc.cancelReason = spec.cancelReason || 'No longer needed';
      doc.updatedAt = doc.cancelledAt;
    }
    if (spec.removed) {
      doc.removed = true;
      doc.removedReason = spec.removed;
    }

    requestDocs.push(build(ServiceRequest, doc));
    if (spec.ref) refs[spec.ref] = { doc, offerTimes };

    // Chats
    if (spec.chat) {
      for (const c of spec.chat) {
        const offeredAt = offerTimes[c.with] || plus(createdAt, 30 * MIN);
        const notes = [];
        if (c.script !== 'question' && offerTimes[c.with]) {
          const offer = offerDocs.find((o) => o.request.equals(reqId) && o.provider.equals(users[c.with]._id));
          notes.push({ at: offeredAt, text: `${users[c.with].name} sent an offer: Rs ${offer.history[0].price.toLocaleString('en-PK')}.` });
          if (offer.history.length > 1) {
            notes.push({ at: offer.history[1].at, text: `Offer updated: Rs ${offer.price.toLocaleString('en-PK')} (was Rs ${offer.history[0].price.toLocaleString('en-PK')}).` });
          }
        }
        if (c.with === spec.winner && assignedAt) notes.push({ at: assignedAt, text: `${customer.name} accepted this offer. The address and phone number are now shared.` });
        if (doc.providerMarkedDoneAt && c.with === spec.winner) {
          notes.push({ at: doc.providerMarkedDoneAt, text: `${users[c.with].name} marked the job as done. Please confirm completion.` });
        }
        const start = c.script === 'job' && assignedAt ? assignedAt : c.script === 'question' ? plus(createdAt, 6 * MIN) : offeredAt;
        const convId = addConversation(doc, c.with, c.script, start, { unreadFor: c.unreadFor || null, systemNotes: notes });
        if (spec.ref) refs[spec.ref][`conv_${c.with}`] = convId;
      }
    }
    return doc;
  }

  /* --- Hand-crafted demo scenarios --- */

  // Ayesha (customer demo): open request with 4 competing offers to compare and accept.
  addRequest({
    ref: 'ayeshaOpen',
    slug: 'plumbing',
    tpl: 0,
    customer: 'c01',
    status: 'open',
    urgency: 'today',
    ageMs: 5 * HOUR,
    offers: ['p01', 'p17', 'p18', 'p08'],
    prices: [1800, 1500, 2200, 1650],
    etas: [45, 90, 60, 150],
    negotiated: 'p01',
    twoImages: true,
    chat: [{ with: 'p01', script: 'negotiate', unreadFor: 'customer' }],
  });
  // Ayesha: job in progress, provider has marked it done, waiting for her confirmation.
  addRequest({
    ref: 'ayeshaAssigned',
    slug: 'electrical',
    tpl: 0,
    customer: 'c01',
    status: 'assigned',
    urgency: 'emergency',
    ageMs: 26 * HOUR,
    offers: ['p02', 'p17', 'p05'],
    winner: 'p02',
    assignedAt: 24 * HOUR,
    marked: 2 * HOUR,
    chat: [{ with: 'p02', script: 'job' }],
  });
  // Ayesha: completed job she has not reviewed yet.
  addRequest({ ref: 'ayeshaToReview', slug: 'ac-repair', tpl: 1, customer: 'c01', status: 'completed', ageMs: 7 * DAY, offers: ['p03', 'p09'], winner: 'p03', completedAgoMs: 6 * DAY, chat: [{ with: 'p03', script: 'job' }] });
  // Ayesha: older completed and reviewed job, plus a cancelled one.
  addRequest({ slug: 'home-cleaning', tpl: 0, customer: 'c01', status: 'completed', ageMs: 41 * DAY, offers: ['p15', 'p13'], winner: 'p15', review: 5, reviewText: 'The team was punctual and thorough. Our new house was spotless, even inside the kitchen cabinets.', reply: 'Thank you Ayesha! It was a pleasure working in your home.' });
  addRequest({ slug: 'carpentry', tpl: 2, customer: 'c01', status: 'cancelled', ageMs: 18 * DAY, offers: ['p06'], cancelReason: 'The shop sent their own team to assemble it.' });

  // Tariq (provider demo): an accepted job in progress he can mark as done.
  addRequest({
    ref: 'tariqJob',
    slug: 'plumbing',
    tpl: 3,
    customer: 'c02',
    status: 'assigned',
    urgency: 'today',
    ageMs: 6 * HOUR,
    offers: ['p01', 'p18'],
    winner: 'p01',
    assignedAt: 3 * HOUR,
    chat: [{ with: 'p01', script: 'job', unreadFor: 'provider' }],
  });
  // Open plumbing requests Tariq has not bid on yet.
  addRequest({ ref: 'nidaOpen', slug: 'plumbing', tpl: 1, customer: 'c07', status: 'open', urgency: 'today', ageMs: 40 * MIN, offers: [] });
  addRequest({
    ref: 'hiraDrain',
    slug: 'plumbing',
    tpl: 2,
    customer: 'c03',
    status: 'open',
    urgency: 'emergency',
    ageMs: 3 * HOUR,
    offers: ['p08'],
    chat: [{ with: 'p08', script: 'question' }],
  });
  // Tariq lost this one to another plumber.
  addRequest({ slug: 'plumbing', tpl: 2, customer: 'c05', status: 'assigned', ageMs: 2 * DAY, offers: ['p08', 'p01'], winner: 'p08', assignedAt: 40 * HOUR });

  // Spam request used for the moderation demo.
  addRequest({
    ref: 'spam',
    slug: 'home-cleaning',
    template: [
      'Earn Rs 5,000 daily from home, cleaners wanted',
      'Join our team and earn Rs 5,000 per day from home. No experience needed. Send Rs 1,500 registration fee on JazzCash and message us on WhatsApp to start today.',
      0,
      0,
    ],
    customer: 'c09',
    status: 'open',
    urgency: 'flexible',
    ageMs: 9 * HOUR,
    noBudget: true,
    offers: [],
  });

  /* --- Generated activity across all categories --- */
  const customerKeys = ['c01', 'c02', 'c03', 'c04', 'c05', 'c06', 'c07', 'c08'];
  const sampleProviders = (slug, n) => {
    const pool = [...providersFor(slug)];
    const out = [];
    while (pool.length && out.length < n) out.push(pool.splice(Math.floor(rand() * pool.length), 1)[0]);
    return out;
  };

  for (const slug of Object.keys(REQUEST_TEMPLATES)) {
    // Fresh open requests: these keep the "Browse requests" page busy.
    for (let i = 0; i < 2; i += 1) {
      const offers = sampleProviders(slug, int(i === 0 ? 1 : 0, 3));
      addRequest({ slug, customer: pick(customerKeys.slice(1)), status: 'open', ageMs: int(20, 60 * 46) * MIN, offers });
    }
    // Jobs in progress.
    const inProgress = sampleProviders(slug, int(1, 3));
    if (inProgress.length) {
      addRequest({ slug, customer: pick(customerKeys.slice(1)), status: 'assigned', ageMs: int(26, 96) * HOUR, offers: inProgress, winner: inProgress[0], chat: [{ with: inProgress[0], script: 'job' }] });
    }
  }

  // Completed history with reviews: every verified provider gets a track record.
  for (const p of PROVIDERS.filter((x) => x.status === 'verified')) {
    const jobs = int(2, 5);
    for (let j = 0; j < jobs; j += 1) {
      const slug = pick(p.categories);
      const rivals = sampleProviders(slug, 2).filter((k) => k !== p.key);
      const roll = rand();
      const rating = roll < 0.62 ? 5 : roll < 0.9 ? 4 : roll < 0.96 ? 3 : 2;
      addRequest({
        slug,
        customer: pick(customerKeys),
        status: 'completed',
        ageMs: int(9, 150) * DAY,
        offers: [p.key, ...rivals.slice(0, int(0, 2))],
        winner: p.key,
        review: rand() < 0.82 ? rating : null,
      });
    }
  }

  // A few cancellations.
  for (const slug of ['painting', 'car-mechanic', 'solar-ups']) {
    addRequest({ slug, customer: pick(customerKeys), status: 'cancelled', ageMs: int(5, 40) * DAY, offers: sampleProviders(slug, 1), cancelReason: pick(['Fixed it myself', 'Found someone through a neighbour', 'Postponed to next month']) });
  }

  // Report demo: a provider asking for an advance payment outside the platform.
  const hira = refs.hiraDrain;
  const hiraConv = convDocs.find((c) => c.request.equals(hira.doc._id) && c.provider.equals(users.p08._id));
  const fraudMsgAt = plus(hiraConv.lastMessage.at, 15 * MIN);
  const fraudMsg = build(Message, {
    conversation: hiraConv._id,
    sender: users.p08._id,
    text: 'Please send Rs 2,000 advance on JazzCash first, then I will come. Number is in my profile.',
    createdAt: fraudMsgAt,
    readAt: plus(fraudMsgAt, 5 * MIN),
  });
  messageDocs.push(fraudMsg);
  hiraConv.lastMessage = { text: fraudMsg.text.slice(0, 160), sender: users.p08._id, at: fraudMsgAt };
  hiraConv.updatedAt = fraudMsgAt;

  await ServiceRequest.collection.insertMany(requestDocs);
  await Offer.collection.insertMany(offerDocs);
  await Conversation.collection.insertMany(convDocs);
  await Message.collection.insertMany(messageDocs);
  if (reviewDocs.length) await Review.collection.insertMany(reviewDocs);
  say(`${requestDocs.length} requests, ${offerDocs.length} offers, ${convDocs.length} chats, ${messageDocs.length} messages, ${reviewDocs.length} reviews`);

  // Denormalised counters use the same code paths as the live app.
  for (const r of requestDocs) await refreshOfferStats(r._id);
  for (const p of PROVIDERS) {
    await refreshProviderRating(users[p.key]._id);
    await refreshJobsCompleted(users[p.key]._id);
  }

  /* Reports */
  const lowReview = reviewDocs.find((r) => r.rating <= 3);
  const reportDocs = [
    build(Report, {
      reporter: users.p13._id,
      targetType: 'request',
      targetId: refs.spam.doc._id,
      targetLabel: `Request: ${refs.spam.doc.title}`,
      reason: 'spam',
      details: 'This is not a cleaning job. It asks people to pay a registration fee.',
      createdAt: at(7 * HOUR),
    }),
    build(Report, {
      reporter: users.c03._id,
      targetType: 'message',
      targetId: fraudMsg._id,
      targetLabel: `Message: ${fraudMsg.text}`,
      reason: 'fraud',
      details: 'He is asking for money in advance outside LocalFix.',
      createdAt: plus(fraudMsgAt, 20 * MIN),
    }),
  ];
  if (lowReview) {
    reportDocs.push(
      build(Report, {
        reporter: lowReview.provider,
        targetType: 'review',
        targetId: lowReview._id,
        targetLabel: `Review (${lowReview.rating} stars): ${lowReview.comment.slice(0, 120)}`,
        reason: 'fake',
        details: 'I arrived on time for this job. I think this review is about someone else.',
        createdAt: at(26 * HOUR),
      })
    );
  }
  reportDocs.push(
    build(Report, {
      reporter: users.c04._id,
      targetType: 'user',
      targetId: users.p12._id,
      targetLabel: `Provider: ${users.p12.name}`,
      reason: 'no_show',
      details: 'Did not show up at the agreed time.',
      status: 'dismissed',
      resolutionNote: 'Provider showed a message from the customer rescheduling the visit. No rule broken.',
      handledBy: adminDoc._id,
      handledAt: at(9 * DAY),
      createdAt: at(10 * DAY),
    })
  );
  await Report.collection.insertMany(reportDocs);

  /* Tips */
  const tipDocs = TIPS.map((t) =>
    build(Tip, {
      title: t.title,
      slug: t.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
      excerpt: t.excerpt,
      body: t.body,
      cover: asset(`tips/${t.cover}.webp`),
      category: cat[t.category]._id,
      author: adminDoc._id,
      published: true,
      publishedAt: at(t.daysAgo * DAY),
      createdAt: at(t.daysAgo * DAY),
    })
  );
  await Tip.collection.insertMany(tipDocs);

  /* Support inbox */
  await ContactMessage.collection.insertMany(
    CONTACT_MESSAGES.map((m) =>
      build(ContactMessage, { name: m.name, email: m.email, topic: m.topic, message: m.message, status: m.closed ? 'closed' : 'open', createdAt: at(m.daysAgo * DAY) })
    )
  );

  /* Notifications */
  const n = (userKey, type, title, body, link, agoMs, read = true) =>
    notificationDocs.push(build(Notification, { user: users[userKey]._id, type, title, body, link, read, createdAt: at(agoMs) }));
  const ao = refs.ayeshaOpen.doc;
  const offerPrice = (reqDoc, pk) => offerDocs.find((o) => o.request.equals(reqDoc._id) && o.provider.equals(users[pk]._id)).price;
  n('c01', 'new_offer', `New offer: Rs ${offerPrice(ao, 'p08').toLocaleString('en-PK')}`, `${users.p08.name} sent an offer for "${ao.title}".`, `/requests/${ao._id}`, 90 * MIN, false);
  n('c01', 'offer_updated', `${users.p01.name} updated their offer`, `New offer for "${ao.title}": Rs ${offerPrice(ao, 'p01').toLocaleString('en-PK')}.`, `/requests/${ao._id}`, 2 * HOUR, false);
  n('c01', 'new_offer', `New offer: Rs ${offerPrice(ao, 'p18').toLocaleString('en-PK')}`, `${users.p18.name} sent an offer for "${ao.title}".`, `/requests/${ao._id}`, 3 * HOUR);
  n('c01', 'new_offer', `New offer: Rs ${offerPrice(ao, 'p17').toLocaleString('en-PK')}`, `${users.p17.name} sent an offer for "${ao.title}".`, `/requests/${ao._id}`, 4 * HOUR);
  n('c01', 'job_done', `${users.p02.name} marked the job as done`, `Please confirm "${refs.ayeshaAssigned.doc.title}" is complete so you can leave a review.`, `/requests/${refs.ayeshaAssigned.doc._id}`, 2 * HOUR, false);
  n('c01', 'review', 'How did it go?', `Rate your provider for "${refs.ayeshaToReview.doc.title}".`, `/requests/${refs.ayeshaToReview.doc._id}#review`, 6 * DAY);
  n('p01', 'new_request', 'New plumbing request in I-8', refs.nidaOpen.doc.title, `/requests/${refs.nidaOpen.doc._id}`, 38 * MIN, false);
  n('p01', 'message', `New message from ${users.c02.name}`, 'Coming down, thanks.', `/messages/${refs.tariqJob.conv_p01}`, 70 * MIN, false);
  n('p01', 'offer_accepted', 'You got the job!', `${users.c02.name} accepted your offer for "${refs.tariqJob.doc.title}". The exact address is now visible.`, `/requests/${refs.tariqJob.doc._id}`, 3 * HOUR);
  n('p01', 'new_request', 'New plumbing request in F-10', ao.title, `/requests/${ao._id}`, 5 * HOUR);
  n('p14', 'verification', 'Documents received', 'Our team usually reviews documents within one working day.', '/provider/profile#verification', 3 * HOUR, false);
  n('p16', 'system', 'Welcome to LocalFix', 'Complete your profile and upload your CNIC to get verified and start sending offers.', '/provider/profile#verification', 1 * DAY, false);
  n('admin', 'verification', 'Provider awaiting verification', `${users.p14.name} submitted ID documents.`, '/admin/verifications', 3 * HOUR, false);
  n('admin', 'report', 'New report submitted', `Request: ${refs.spam.doc.title}`, '/admin/reports', 7 * HOUR, false);
  n('admin', 'report', 'New report submitted', `Message: ${fraudMsg.text.slice(0, 100)}`, '/admin/reports', 2 * HOUR, false);
  n('admin', 'system', 'New support message', `${CONTACT_MESSAGES[0].name}: ${CONTACT_MESSAGES[0].message.slice(0, 100)}`, '/admin/inbox', 1 * DAY);
  for (const key of ['c02', 'c03', 'c04', 'c05', 'p02', 'p03', 'p05', 'p08']) {
    n(key, 'system', 'Welcome to LocalFix', 'Your account is ready. Explore the dashboard to get started.', '/dashboard', 30 * DAY);
  }
  await Notification.collection.insertMany(notificationDocs);

  /* Anonymous analytics for the admin charts (last 14 days) */
  const events = [];
  for (let d = 13; d >= 0; d -= 1) {
    const day = new Date(NOW() - d * DAY);
    const views = int(60, 140) + (13 - d) * 4;
    for (let i = 0; i < views; i += 1) {
      events.push({ type: 'page_view', path: pick(['/', '/requests', '/providers', '/post-request', '/tips', '/help']), query: '', role: pick(['guest', 'guest', 'customer', 'provider']), day: dayKey(day), createdAt: day });
    }
    for (let i = 0; i < int(4, 14); i += 1) {
      events.push({ type: 'search', path: '/requests', query: pick(SEARCH_QUERIES), role: pick(['guest', 'customer', 'provider']), day: dayKey(day), createdAt: day });
    }
  }
  await AnalyticsEvent.collection.insertMany(events);

  say(`done in ${((Date.now() - started) / 1000).toFixed(1)}s`);
  return {
    users: userDocs.length,
    requests: requestDocs.length,
    offers: offerDocs.length,
    reviews: reviewDocs.length,
  };
}
