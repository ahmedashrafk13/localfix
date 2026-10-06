// End-to-end API tests: a throwaway in-memory MongoDB, the real seed data and the real Express app.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';

process.env.NODE_ENV = 'test';
process.env.UPLOAD_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'localfix-uploads-'));
process.env.PRIVATE_UPLOAD_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'localfix-private-'));
process.env.REQUIRE_EMAIL_VERIFICATION = 'true';
process.env.MONGOMS_DOWNLOAD_DIR ||= path.resolve(import.meta.dirname, '..', 'node_modules', '.cache', 'mongodb-memory-server');

const { MongoMemoryServer } = await import('mongodb-memory-server');
const { default: request } = await import('supertest');
const { connectDB, disconnectDB } = await import('../src/config/db.js');
const { createApp } = await import('../src/app.js');
const { seedDatabase } = await import('../src/seed/seed.js');
const { ServiceRequest, Offer, User } = await import('../src/models/index.js');

let mongo;
let app;

const H = { 'X-Requested-With': 'LocalFix' };

async function login(email, password = 'Demo@1234') {
  const agent = request.agent(app);
  const res = await agent.post('/api/auth/login').set(H).send({ email, password });
  assert.equal(res.status, 200, `login failed for ${email}: ${JSON.stringify(res.body)}`);
  return agent;
}

before(async () => {
  mongo = await MongoMemoryServer.create();
  await connectDB(mongo.getUri());
  await seedDatabase();
  app = createApp();
});

after(async () => {
  await disconnectDB();
  await mongo.stop();
  fs.rmSync(process.env.UPLOAD_DIR, { recursive: true, force: true });
  fs.rmSync(process.env.PRIVATE_UPLOAD_DIR, { recursive: true, force: true });
});

describe('public endpoints', () => {
  test('health and meta', async () => {
    const health = await request(app).get('/api/health');
    assert.equal(health.status, 200);
    const meta = await request(app).get('/api/meta');
    assert.equal(meta.status, 200);
    assert.ok(meta.body.cities.some((c) => c.name === 'Islamabad'));
  });

  test('categories include live counts', async () => {
    const res = await request(app).get('/api/categories');
    assert.equal(res.status, 200);
    assert.equal(res.body.items.length, 10);
    assert.ok(res.body.items.every((c) => typeof c.openRequests === 'number' && typeof c.providers === 'number'));
  });

  test('public stats are computed from data', async () => {
    const res = await request(app).get('/api/stats/public');
    assert.equal(res.status, 200);
    assert.ok(res.body.verifiedProviders >= 10);
    assert.ok(res.body.avgRating >= 1 && res.body.avgRating <= 5);
  });

  test('browsing requests hides exact address and full name', async () => {
    const res = await request(app).get('/api/requests?category=plumbing');
    assert.equal(res.status, 200);
    assert.ok(res.body.items.length > 0);
    for (const r of res.body.items) {
      assert.equal(r.status, 'open');
      assert.equal(r.location.address, null);
      assert.equal(r.location.approximate, true);
      assert.match(r.customer.name, /^\S+( \S\.)?$/);
    }
  });

  test('search, sort by distance and radius filters work', async () => {
    const res = await request(app).get('/api/requests?lat=33.6955&lng=73.013&radiusKm=10&sort=nearest');
    assert.equal(res.status, 200);
    const d = res.body.items.map((r) => r.distanceKm);
    assert.deepEqual(d, [...d].sort((a, b) => a - b));
    assert.ok(d.every((x) => x <= 10.5));
    const q = await request(app).get('/api/requests?q=leak');
    assert.equal(q.status, 200);
  });

  test('provider directory lists verified providers only', async () => {
    const res = await request(app).get('/api/providers?limit=48');
    assert.equal(res.status, 200);
    assert.ok(res.body.items.every((p) => p.verified));
    assert.ok(!res.body.items.some((p) => p.name === 'Moin Akram'));
  });

  test('unknown API route returns JSON 404', async () => {
    const res = await request(app).get('/api/nope');
    assert.equal(res.status, 404);
    assert.ok(res.body.error.message);
  });
});

describe('security', () => {
  test('state-changing requests need the X-Requested-With header (CSRF)', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'ayesha@localfix.test', password: 'Demo@1234' });
    assert.equal(res.status, 403);
  });

  test('wrong password is rejected with a generic message', async () => {
    const res = await request(app).post('/api/auth/login').set(H).send({ email: 'ayesha@localfix.test', password: 'nope' });
    assert.equal(res.status, 401);
    assert.equal(res.body.error.message, 'Incorrect email or password.');
  });

  test('NoSQL operator injection in login is neutralised', async () => {
    const res = await request(app).post('/api/auth/login').set(H).send({ email: { $ne: null }, password: { $ne: null } });
    assert.equal(res.status, 400);
  });

  test('session cookie is httpOnly and password hash is never returned', async () => {
    const res = await request(app).post('/api/auth/login').set(H).send({ email: 'ayesha@localfix.test', password: 'Demo@1234' });
    assert.match(res.headers['set-cookie'][0], /HttpOnly/i);
    assert.equal(JSON.stringify(res.body).includes('passwordHash'), false);
  });

  test('role-based access control', async () => {
    const customer = await login('ayesha@localfix.test');
    assert.equal((await customer.get('/api/admin/stats')).status, 403);
    assert.equal((await customer.get('/api/offers/mine')).status, 403);
    assert.equal((await request(app).get('/api/notifications')).status, 401);
  });

  test('security headers are set', async () => {
    const res = await request(app).get('/api/health');
    assert.ok(res.headers['content-security-policy']);
    assert.equal(res.headers['x-content-type-options'], 'nosniff');
    assert.equal(res.headers['x-powered-by'], undefined);
  });
});

describe('customer and provider flow', () => {
  test('registration requires a strong password and creates an unverified account', async () => {
    const weak = await request(app).post('/api/auth/register').set(H).send({ name: 'Test User', email: 'weak@localfix.test', phone: '0300 1112223', password: 'short', role: 'customer', city: 'Islamabad' });
    assert.equal(weak.status, 400);

    const agent = request.agent(app);
    const res = await agent.post('/api/auth/register').set(H).send({ name: 'Zara Malik', email: 'zara@localfix.test', phone: '0300 1112223', password: 'Secure123', role: 'customer', city: 'Islamabad', area: 'F-7' });
    assert.equal(res.status, 201);
    assert.equal(res.body.user.emailVerified, false);
    assert.ok(res.body.devLink);

    // Unverified customers cannot post yet.
    const blocked = await agent.post('/api/requests').set(H).field('data', JSON.stringify({}));
    assert.equal(blocked.status, 403);

    const token = new URL(res.body.devLink).searchParams.get('token');
    const verified = await agent.post('/api/auth/verify-email').set(H).send({ token });
    assert.equal(verified.status, 200);
    assert.equal(verified.body.user.emailVerified, true);
  });

  test('post request, bid, chat, negotiate, accept, complete and review', async () => {
    const customer = await login('faisal@localfix.test');
    const categories = (await request(app).get('/api/categories')).body.items;
    const plumbing = categories.find((c) => c.slug === 'plumbing');

    const created = await customer
      .post('/api/requests')
      .set(H)
      .field(
        'data',
        JSON.stringify({ categoryId: plumbing.id, title: 'Toilet flush keeps running', description: 'The toilet cistern keeps refilling every few minutes and wastes water.', city: 'Islamabad', area: 'E-11', address: 'House 9, Street 4, E-11/2', lat: 33.699, lng: 72.974, urgency: 'today', budgetMin: 800, budgetMax: 2000 })
      );
    assert.equal(created.status, 201, JSON.stringify(created.body));
    const reqId = created.body.request.id;
    assert.equal(created.body.request.location.address, 'House 9, Street 4, E-11/2');

    // Unverified provider cannot bid.
    const unverified = await login('samina@localfix.test');
    assert.equal((await unverified.post(`/api/requests/${reqId}/offers`).set(H).send({ price: 1000, etaMinutes: 60, details: 'I can fix this quickly today.' })).status, 403);

    // Two verified plumbers bid.
    const tariq = await login('tariq@localfix.test');
    const mohsin = await login('mohsin@localfix.test');
    const o1 = await tariq.post(`/api/requests/${reqId}/offers`).set(H).send({ price: 1500, etaMinutes: 45, details: 'New flush valve and float, includes labour.' });
    assert.equal(o1.status, 201, JSON.stringify(o1.body));
    const o2 = await mohsin.post(`/api/requests/${reqId}/offers`).set(H).send({ price: 1200, etaMinutes: 120, details: 'Will repair the existing fill valve.' });
    assert.equal(o2.status, 201);
    assert.equal((await tariq.post(`/api/requests/${reqId}/offers`).set(H).send({ price: 1400, etaMinutes: 45, details: 'Duplicate offer attempt.' })).status, 409);

    // Provider sees the request, but not the exact address before being hired.
    const asProvider = await tariq.get(`/api/requests/${reqId}`);
    assert.equal(asProvider.body.request.location.address, null);
    assert.equal(asProvider.body.request.myOffer.price, 1500);

    // Customer compares offers.
    const offers = await customer.get(`/api/requests/${reqId}/offers?sort=price`);
    assert.equal(offers.status, 200);
    assert.deepEqual(offers.body.items.map((o) => o.price), [1200, 1500]);
    assert.equal(offers.body.highlights.lowestPrice, o2.body.offer.id);
    assert.equal(offers.body.highlights.fastest, o1.body.offer.id);

    // Chat and negotiation.
    const tariqUser = await User.findOne({ email: 'tariq@localfix.test' });
    const conv = await customer.post('/api/conversations').set(H).send({ requestId: reqId, providerId: tariqUser._id.toString() });
    assert.equal(conv.status, 201);
    const convId = conv.body.conversation.id;
    assert.equal((await customer.post(`/api/conversations/${convId}/messages`).set(H).send({ text: 'Can you do 1,300?' })).status, 201);
    const tariqInbox = await tariq.get('/api/conversations');
    assert.ok(tariqInbox.body.items.find((c) => c.id === convId).unread >= 1);
    const edited = await tariq.patch(`/api/offers/${o1.body.offer.id}`).set(H).send({ price: 1300 });
    assert.equal(edited.status, 200);
    assert.equal(edited.body.offer.history.length, 2);
    const msgs = await tariq.get(`/api/conversations/${convId}/messages`);
    assert.ok(msgs.body.items.some((m) => m.kind === 'system' && m.text.includes('Offer updated')));

    // Outsiders cannot read the conversation.
    const stranger = await login('hira@localfix.test');
    assert.equal((await stranger.get(`/api/conversations/${convId}/messages`)).status, 404);

    // Accept, the other offer is declined, and the hired provider now sees the address.
    const accepted = await customer.post(`/api/offers/${o1.body.offer.id}/accept`).set(H);
    assert.equal(accepted.status, 200);
    assert.equal((await Offer.findById(o2.body.offer.id)).status, 'rejected');
    assert.equal((await customer.post(`/api/offers/${o2.body.offer.id}/accept`).set(H)).status, 409);
    const hired = await tariq.get(`/api/requests/${reqId}`);
    assert.equal(hired.body.request.location.address, 'House 9, Street 4, E-11/2');
    assert.ok(hired.body.request.customer.phone);

    // Reviews are only allowed after completion.
    assert.equal((await customer.post(`/api/requests/${reqId}/review`).set(H).send({ rating: 5 })).status, 409);
    assert.equal((await tariq.post(`/api/requests/${reqId}/mark-done`).set(H)).status, 200);
    assert.equal((await customer.post(`/api/requests/${reqId}/complete`).set(H)).status, 200);

    const before = (await User.findById(tariqUser._id)).provider.ratingCount;
    const review = await customer.post(`/api/requests/${reqId}/review`).set(H).send({ rating: 5, comment: 'Fixed in 30 minutes, very tidy.' });
    assert.equal(review.status, 201);
    assert.equal((await customer.post(`/api/requests/${reqId}/review`).set(H).send({ rating: 4 })).status, 409);
    const afterUser = await User.findById(tariqUser._id);
    assert.equal(afterUser.provider.ratingCount, before + 1);

    // Notifications were created along the way.
    const notes = await tariq.get('/api/notifications');
    assert.ok(notes.body.items.some((n) => n.type === 'offer_accepted'));
  });

  test('provider can withdraw and re-submit an offer', async () => {
    const r = await ServiceRequest.findOne({ status: 'open', offerCount: 0, removed: false }).populate('category');
    const providers = await User.find({ role: 'provider', 'provider.verification.status': 'verified', 'provider.categories': r.category._id });
    const agent = await login(providers[0].email);
    const o = await agent.post(`/api/requests/${r._id}/offers`).set(H).send({ price: 2000, etaMinutes: 90, details: 'Full inspection and repair.' });
    assert.equal(o.status, 201, JSON.stringify(o.body));
    assert.equal((await ServiceRequest.findById(r._id)).offerCount, 1);
    assert.equal((await agent.post(`/api/offers/${o.body.offer.id}/withdraw`).set(H)).status, 200);
    assert.equal((await ServiceRequest.findById(r._id)).offerCount, 0);
    const again = await agent.post(`/api/requests/${r._id}/offers`).set(H).send({ price: 1800, etaMinutes: 60, details: 'Revised after checking photos.' });
    assert.equal(again.status, 201);
  });

  test('report and admin moderation', async () => {
    const reporter = await login('bilal@localfix.test');
    const spam = await ServiceRequest.findOne({ title: /Earn Rs 5,000/ });
    const rep = await reporter.post('/api/reports').set(H).send({ targetType: 'request', targetId: spam._id.toString(), reason: 'spam' });
    assert.equal(rep.status, 201);
    assert.equal((await reporter.post('/api/reports').set(H).send({ targetType: 'request', targetId: spam._id.toString(), reason: 'spam' })).status, 409);

    const admin = await login('admin@localfix.test', 'Admin@1234');
    const stats = await admin.get('/api/admin/stats');
    assert.equal(stats.status, 200);
    assert.equal(stats.body.successCriteria.length, 7);
    const reports = await admin.get('/api/admin/reports');
    assert.ok(reports.body.items.length >= 2);

    const removed = await admin.delete(`/api/admin/requests/${spam._id}`).set(H).send({ reason: 'Scam: asks for a registration fee.' });
    assert.equal(removed.status, 200);
    assert.equal((await request(app).get(`/api/requests/${spam._id}`)).status, 404);

    // Verify the pending provider; they can then bid.
    const pending = await admin.get('/api/admin/verifications');
    const moin = pending.body.items.find((p) => p.name === 'Moin Akram');
    assert.ok(moin.hasDocument);
    assert.equal((await admin.get(`/api/admin/verifications/${moin.id}/document`)).status, 200);
    assert.equal((await admin.post(`/api/admin/verifications/${moin.id}`).set(H).send({ decision: 'verified' })).status, 200);

    // Suspend a user: their session stops working immediately.
    const victim = await login('kamran@localfix.test');
    const kamran = await User.findOne({ email: 'kamran@localfix.test' });
    assert.equal((await admin.patch(`/api/admin/users/${kamran._id}/status`).set(H).send({ status: 'suspended', reason: 'Testing suspension' })).status, 200);
    const me = await victim.get('/api/auth/me');
    assert.equal(me.body.user, null);
    const relogin = await request(app).post('/api/auth/login').set(H).send({ email: 'kamran@localfix.test', password: 'Demo@1234' });
    assert.equal(relogin.status, 403);
  });

  test('password reset flow', async () => {
    const res = await request(app).post('/api/auth/forgot-password').set(H).send({ email: 'usman@localfix.test' });
    assert.equal(res.status, 200);
    const token = new URL(res.body.devLink).searchParams.get('token');
    assert.equal((await request(app).post('/api/auth/reset-password').set(H).send({ token, password: 'NewPass123' })).status, 200);
    await login('usman@localfix.test', 'NewPass123');
    assert.equal((await request(app).post('/api/auth/reset-password').set(H).send({ token, password: 'Another123' })).status, 400);
  });

  test('account deletion removes the user and anonymises history', async () => {
    const agent = await login('mehwish@localfix.test');
    assert.equal((await agent.delete('/api/users/me').set(H).send({ password: 'wrong' })).status, 400);
    assert.equal((await agent.delete('/api/users/me').set(H).send({ password: 'Demo@1234' })).status, 200);
    assert.equal(await User.exists({ email: 'mehwish@localfix.test' }), null);
    const stats = await request(app).get('/api/stats/public');
    assert.equal(stats.status, 200);
  });
});
