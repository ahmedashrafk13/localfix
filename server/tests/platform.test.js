// Tests for the platform features: third-party integrations (with a fake network), the request
// assistant, price insights, Web Push, calendar export, the versioned API and the OpenAPI contract.
import assert from 'node:assert/strict';
import { after, afterEach, before, describe, test } from 'node:test';
import { H, app, fakeFetch, login, request, startApp, stopApp, waitFor } from './helpers.js';

const { setUpstreamFetch, clearUpstreamCaches } = await import('../src/integrations/upstream.js');
const { workAdvisory } = await import('../src/integrations/weather.js');
const { nearestArea } = await import('../src/integrations/geocoding.js');
const { analyzeWithRules, setAssistantClient } = await import('../src/services/assistant.js');
const { quantile, roundPrice, clearInsightsCache } = await import('../src/services/insights.js');
const { setPushSender } = await import('../src/services/push.js');
const { isPushServiceUrl } = await import('../src/routes/push.js');
const { visitStart } = await import('../src/routes/requestExtras.js');
const { buildEvent, escapeText, foldLine } = await import('../src/utils/ics.js');
const { getOpenApi } = await import('../src/docs/openapi.js');
const { MOUNTS } = await import('../src/routes/index.js');
const { Category, Offer, PushSubscription, ServiceRequest, User } = await import('../src/models/index.js');

before(startApp);
after(stopApp);
afterEach(() => {
  setUpstreamFetch(null);
  setAssistantClient(null);
  setPushSender(null);
  clearUpstreamCaches();
});

const OPEN_METEO = {
  timezone: 'Asia/Karachi',
  current: { time: '2030-06-01T10:00', temperature_2m: 31.5, weather_code: 0, wind_speed_10m: 8, precipitation: 0 },
  daily: {
    time: ['2030-06-01', '2030-06-02'],
    weather_code: [0, 81],
    temperature_2m_max: [36, 29],
    temperature_2m_min: [22, 20],
    precipitation_probability_max: [5, 90],
    precipitation_sum: [0, 14],
    wind_speed_10m_max: [10, 18],
  },
};

describe('API platform basics', () => {
  test('health reports the database, version and integration state', async () => {
    const res = await request(app).get('/api/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.database, 'connected');
    assert.match(res.body.version, /^\d+\.\d+\.\d+$/);
    assert.equal(res.body.integrations['open-meteo'], 'disabled'); // no outbound calls in tests
  });

  test('the API is also served under /api/v1', async () => {
    const [v1, alias] = await Promise.all([request(app).get('/api/v1/categories'), request(app).get('/api/categories')]);
    assert.equal(v1.status, 200);
    assert.deepEqual(v1.body.items.map((c) => c.slug), alias.body.items.map((c) => c.slug));
    const missing = await request(app).get('/api/v1/nope');
    assert.equal(missing.status, 404);
    assert.ok(missing.body.error.message);
  });

  test('every response carries a request id, and a sane caller id is echoed', async () => {
    const res = await request(app).get('/api/health');
    assert.match(res.headers['x-request-id'], /^[\w-]{8,64}$/);
    const echoed = await request(app).get('/api/health').set('X-Request-Id', 'trace-12345678');
    assert.equal(echoed.headers['x-request-id'], 'trace-12345678');
    const rejected = await request(app).get('/api/health').set('X-Request-Id', '<script>');
    assert.notEqual(rejected.headers['x-request-id'], '<script>');
  });
});

describe('OpenAPI contract', () => {
  const toOpenApiPath = (mount, routePath) => `${mount === '/' ? '' : mount}${routePath === '/' ? '' : routePath}`.replace(/:(\w+)/g, '{$1}') || '/';

  test('the document describes exactly the routes the server has', () => {
    const real = new Set();
    for (const { path, router } of MOUNTS) {
      for (const layer of router.stack) {
        if (!layer.route) continue;
        for (const method of Object.keys(layer.route.methods)) real.add(`${method.toUpperCase()} ${toOpenApiPath(path, layer.route.path)}`);
      }
    }
    const documented = new Set(Object.entries(getOpenApi().paths).flatMap(([p, ops]) => Object.keys(ops).map((m) => `${m.toUpperCase()} ${p}`)));
    assert.ok(real.size > 90, `expected the route walk to find the whole API, found ${real.size}`);
    assert.deepEqual([...real].filter((r) => !documented.has(r)).sort(), [], 'routes missing from the OpenAPI document');
    assert.deepEqual([...documented].filter((r) => !real.has(r)).sort(), [], 'documented routes that do not exist');
  });

  test('the document is internally consistent', () => {
    const doc = getOpenApi();
    assert.equal(doc.openapi, '3.1.0');
    const ids = [];
    for (const [path, ops] of Object.entries(doc.paths)) {
      for (const [method, op] of Object.entries(ops)) {
        const where = `${method.toUpperCase()} ${path}`;
        assert.ok(op.operationId && op.summary && op.tags?.length === 1, `${where} needs operationId, summary and one tag`);
        assert.ok(doc.tags.some((t) => t.name === op.tags[0]), `${where} uses an undeclared tag`);
        assert.ok(Array.isArray(op.security), `${where} must state its security`);
        assert.ok(Object.keys(op.responses).some((code) => code.startsWith('2')), `${where} needs a success response`);
        for (const name of path.match(/\{(\w+)\}/g) || []) {
          assert.ok(op.parameters?.some((p) => p.in === 'path' && `{${p.name}}` === name), `${where} must declare path parameter ${name}`);
        }
        ids.push(op.operationId);
      }
    }
    assert.equal(new Set(ids).size, ids.length, 'operationIds must be unique');
    for (const [, kind, name] of JSON.stringify(doc).matchAll(/#\/components\/(schemas|responses)\/(\w+)/g)) {
      assert.ok(doc.components[kind][name], `dangling $ref to ${kind}/${name}`);
    }
  });

  test('the document and the Swagger UI are served without breaking the CSP', async () => {
    const spec = await request(app).get('/api/openapi.json');
    assert.equal(spec.status, 200);
    assert.equal(spec.body.info.title, 'LocalFix API');
    const page = await request(app).get('/api/docs');
    assert.equal(page.status, 200);
    assert.match(page.text, /swagger-ui/);
    assert.doesNotMatch(page.text, /<script>|https?:\/\/(cdn|unpkg)/, 'no inline scripts and no CDN');
    for (const asset of ['/api/docs/static/init.js', '/api/docs/assets/swagger-ui-bundle.js', '/api/docs/assets/swagger-ui.css']) {
      assert.equal((await request(app).get(asset)).status, 200, asset);
    }
  });
});

describe('location services (fake network)', () => {
  test('address search maps Photon results onto LocalFix areas', async () => {
    const fetch = fakeFetch((url) => {
      assert.equal(url.hostname, 'photon.komoot.io');
      assert.ok(url.searchParams.get('bbox'), 'search is limited to the service region');
      return {
        features: [
          { geometry: { coordinates: [73.0124, 33.6958] }, properties: { osm_type: 'W', osm_id: 1, name: 'F-10 Markaz', district: 'F-10', city: 'Islamabad' } },
          { geometry: { coordinates: [74.35, 31.52] }, properties: { osm_type: 'N', osm_id: 2, name: 'Liberty Market', city: 'Lahore' } },
          { geometry: {}, properties: { name: 'Broken feature' } },
        ],
      };
    });
    setUpstreamFetch(fetch);
    const res = await request(app).get('/api/geo/search?q=F-10%20Markaz');
    assert.equal(res.status, 200);
    assert.equal(res.body.items.length, 2);
    assert.deepEqual(res.body.items[0].match && { city: res.body.items[0].match.city, area: res.body.items[0].match.area }, { city: 'Islamabad', area: 'F-10' });
    assert.equal(res.body.items[1].match, null, 'a place outside the region has no area match');
    assert.match(res.body.attribution, /OpenStreetMap/);

    await request(app).get('/api/geo/search?q=F-10%20Markaz');
    assert.equal(fetch.calls.length, 1, 'the second identical search is served from the cache');
    assert.equal((await request(app).get('/api/geo/search?q=ab')).status, 400);
  });

  test('reverse geocoding returns a short address and the matching area', async () => {
    setUpstreamFetch(
      fakeFetch((url) => {
        assert.equal(url.hostname, 'nominatim.openstreetmap.org');
        return { display_name: 'Bank, 10th Avenue, F-10, Islamabad, Pakistan', address: { road: '10th Avenue', suburb: 'F-10', city: 'Islamabad' } };
      })
    );
    const res = await request(app).get('/api/geo/reverse?lat=33.6955&lng=73.013');
    assert.equal(res.status, 200);
    assert.equal(res.body.address, '10th Avenue, F-10');
    assert.equal(res.body.match.area, 'F-10');
  });

  test('a failing upstream becomes a clean 503, not a crash', async () => {
    setUpstreamFetch(fakeFetch(() => ({ status: 500, body: {} })));
    const res = await request(app).get('/api/geo/reverse?lat=33.1&lng=73.1');
    assert.equal(res.status, 503);
    assert.match(res.body.error.message, /address/i);
    assert.ok(res.body.error.requestId);
  });

  test('nearestArea rejects points far from the service region', () => {
    assert.equal(nearestArea(33.7294, 73.0758).area, 'F-6');
    assert.equal(nearestArea(24.86, 67.0), null); // Karachi
  });

  test('weather advice depends on the forecast and on the kind of work', async () => {
    setUpstreamFetch(fakeFetch(() => OPEN_METEO));
    const dry = await request(app).get('/api/geo/weather?lat=33.69&lng=73.01&date=2030-06-01&category=painting');
    assert.equal(dry.status, 200);
    assert.equal(dry.body.days.length, 2);
    assert.equal(dry.body.advisory.level, 'ok');
    const wet = await request(app).get('/api/geo/weather?lat=33.69&lng=73.01&date=2030-06-02&category=painting');
    assert.equal(wet.body.focus.icon, 'rain');
    assert.equal(wet.body.advisory.level, 'caution');
    const indoor = await request(app).get('/api/geo/weather?lat=33.69&lng=73.01&date=2030-06-02&category=plumbing');
    assert.equal(indoor.body.advisory.level, 'info');
    const far = await request(app).get('/api/geo/weather?lat=33.69&lng=73.01&date=2031-01-01&category=painting');
    assert.equal(far.body.focus, null, 'no forecast beyond the 7-day window');
    assert.equal(far.body.advisory, null);

    assert.equal(workAdvisory({ maxC: 44, rainChance: 0, windKph: 5 }, 'solar-ups').level, 'caution');
    assert.equal(workAdvisory(null, 'painting'), null);
  });

  test('request weather only sends coordinates rounded to about 1 km', async () => {
    const r = await ServiceRequest.findOne({ status: 'open', removed: false });
    const fetch = fakeFetch(() => OPEN_METEO);
    setUpstreamFetch(fetch);
    const res = await request(app).get(`/api/requests/${r._id}/weather`);
    assert.equal(res.status, 200);
    const sent = new URL(fetch.calls[0]);
    assert.match(sent.searchParams.get('latitude'), /^\d+(\.\d{1,2})?$/);
    assert.match(sent.searchParams.get('longitude'), /^\d+(\.\d{1,2})?$/);
  });

  test('route: outsiders are routed to the rounded point, the hired provider to the exact pin', async () => {
    const fetch = fakeFetch((url) => {
      const [, to] = url.pathname.split('/driving/')[1].split(';');
      const [lng, lat] = to.split(',').map(Number);
      return { code: 'Ok', routes: [{ distance: 8933, duration: 661, geometry: { coordinates: [[73.0, 33.7], [lng, lat]] } }] };
    });
    setUpstreamFetch(fetch);

    const job = await ServiceRequest.findOne({ status: 'assigned' });
    const [lng, lat] = job.location.point.coordinates;
    const hired = await User.findById(job.assignedProvider);
    const hiredAgent = await login(hired.email);
    const exact = await hiredAgent.get(`/api/requests/${job._id}/route?fromLat=33.7&fromLng=73.0`);
    assert.equal(exact.status, 200);
    assert.equal(exact.body.approximate, false);
    assert.deepEqual(exact.body.to, { lat, lng });
    assert.equal(exact.body.route.distanceKm, 8.9);
    assert.equal(exact.body.route.durationMin, 11);
    assert.equal(exact.body.route.source, 'osrm');

    const open = await ServiceRequest.findOne({ status: 'open', removed: false });
    const [oLng, oLat] = open.location.point.coordinates;
    const other = await User.findOne({ role: 'provider', 'provider.verification.status': 'verified', _id: { $ne: open.customer } });
    const otherAgent = await login(other.email);
    const rough = await otherAgent.get(`/api/requests/${open._id}/route?fromLat=33.7&fromLng=73.0`);
    assert.equal(rough.body.approximate, true);
    assert.deepEqual(rough.body.to, { lat: Math.round(oLat * 100) / 100, lng: Math.round(oLng * 100) / 100 });
    const last = rough.body.route.geometry.at(-1);
    assert.deepEqual(last, [rough.body.to.lat, rough.body.to.lng], 'the route line must not reveal the exact pin');

    assert.equal((await request(app).get(`/api/requests/${open._id}/route?fromLat=33.7&fromLng=73.0`)).status, 401);
  });

  test('route falls back to a flagged estimate when OSRM is down', async () => {
    setUpstreamFetch(fakeFetch(() => ({ status: 503, body: {} })));
    const open = await ServiceRequest.findOne({ status: 'open', removed: false });
    const agent = await login('tariq@localfix.test');
    const res = await agent.get(`/api/requests/${open._id}/route?fromLat=33.70&fromLng=73.00`);
    assert.equal(res.status, 200);
    assert.equal(res.body.route.source, 'estimate');
    assert.equal(res.body.route.geometry, null);
    assert.ok(res.body.route.distanceKm > 0 && res.body.route.durationMin > 0);
  });
});

describe('request assistant', () => {
  const cats = async () => Category.find({ active: true }).lean();

  test('the rule engine classifies, sets urgency and adds safety advice', async () => {
    const list = await cats();
    const leak = analyzeWithRules('Hi, water is leaking from the pipe under my kitchen sink since this morning', list);
    assert.equal(leak.categorySlug, 'plumbing');
    assert.equal(leak.urgency, 'today');
    assert.match(leak.title, /^Water is leaking/);
    assert.equal(leak.questions.length, 4);

    const sparks = analyzeWithRules('There are sparks from the socket in my bedroom and a burning smell', list);
    assert.equal(sparks.categorySlug, 'electrical');
    assert.equal(sparks.urgency, 'emergency');
    assert.match(sparks.safetyNote, /main breaker/);

    const vague = analyzeWithRules('Something is wrong at my house, please help me soon', list);
    assert.equal(vague.categorySlug, null);
    assert.equal(vague.confidence, 'low');
  });

  test('without an API key the endpoint answers from the rule engine', async () => {
    const res = await request(app).post('/api/assistant/describe').set(H).send({ text: 'My Gree inverter AC is not cooling and the outdoor unit is noisy' });
    assert.equal(res.status, 200);
    assert.equal(res.body.engine, 'rules');
    assert.equal(res.body.suggestion.category.slug, 'ac-repair');
    assert.equal((await request(app).post('/api/assistant/describe').set(H).send({ text: 'short' })).status, 400);
    assert.equal((await request(app).post('/api/assistant/describe').send({ text: 'My AC is not cooling at all' })).status, 403, 'CSRF header required');
  });

  test('with a Claude client the structured answer is used, and the prompt keeps user text as data', async () => {
    let seen;
    setAssistantClient({
      beta: {
        messages: {
          create: async (params) => {
            seen = params;
            return {
              stop_reason: 'end_turn',
              content: [
                { type: 'thinking', thinking: '' },
                { type: 'text', text: JSON.stringify({ categorySlug: 'carpentry', title: 'Bedroom door lock jammed', urgency: 'today', questions: ['Is the key stuck?', 'What brand is the lock?', 'Is the door wood?'], safetyNote: '', confidence: 'high' }) },
              ],
            };
          },
        },
      },
    });
    const res = await request(app).post('/api/assistant/describe').set(H).send({ text: 'darwaza ka lock kharab hai, khul nahi raha' });
    assert.equal(res.body.engine, 'claude');
    assert.equal(res.body.suggestion.category.slug, 'carpentry');
    assert.equal(res.body.suggestion.title, 'Bedroom door lock jammed');
    assert.equal(seen.output_config.format.type, 'json_schema');
    assert.ok(seen.output_config.format.schema.properties.categorySlug.anyOf[0].enum.includes('carpentry'));
    assert.match(seen.messages[0].content, /<problem>\ndarwaza ka lock/);
    assert.equal(seen.thinking, undefined);
  });

  test('a refusal, an API error or an invalid answer falls back to the rule engine', async () => {
    const text = 'The kitchen tap is leaking and the drain is blocked';
    const answers = [
      async () => ({ stop_reason: 'refusal', content: [] }),
      async () => { throw new Error('boom'); },
      async () => ({ stop_reason: 'end_turn', content: [{ type: 'text', text: '{"categorySlug":"plumbing"}' }] }),
    ];
    for (const create of answers) {
      setAssistantClient({ beta: { messages: { create } } });
      const res = await request(app).post('/api/assistant/describe').set(H).send({ text });
      assert.equal(res.status, 200);
      assert.equal(res.body.engine, 'rules');
      assert.equal(res.body.suggestion.category.slug, 'plumbing');
    }
  });
});

describe('price insights', () => {
  test('quantiles and price rounding', () => {
    assert.equal(quantile([1, 2, 3, 4, 5], 0.5), 3);
    assert.equal(quantile([1000, 2000], 0.25), 1250);
    assert.equal(quantile([], 0.5), null);
    assert.equal(roundPrice(1234), 1250);
    assert.equal(roundPrice(4567), 4600);
  });

  test('the range is computed from real offers in the category', async () => {
    clearInsightsCache();
    const res = await request(app).get('/api/insights/price?category=plumbing');
    assert.equal(res.status, 200);
    const { insight } = res.body;
    assert.ok(insight.sample >= 5);
    assert.ok(insight.low <= insight.median && insight.median <= insight.high);

    const cat = await Category.findOne({ slug: 'plumbing' });
    const ids = await ServiceRequest.find({ category: cat._id, removed: false }).distinct('_id');
    const prices = (await Offer.find({ request: { $in: ids }, status: insight.basis === 'accepted' ? 'accepted' : { $ne: 'withdrawn' } }).select('price').lean()).map((o) => o.price);
    assert.equal(insight.sample, prices.length);
    assert.ok(insight.low >= Math.min(...prices) - 100 && insight.high <= Math.max(...prices) + 100);

    assert.equal((await request(app).get('/api/insights/price?category=nope')).status, 404);
    assert.equal((await request(app).get('/api/insights/price')).status, 400);
  });
});

describe('web push', () => {
  const sub = (n) => ({ endpoint: `https://fcm.googleapis.com/fcm/send/device-${n}`, keys: { p256dh: 'p'.repeat(87), auth: 'a'.repeat(22) } });

  test('only real browser push services are accepted (SSRF guard)', () => {
    assert.ok(isPushServiceUrl('https://fcm.googleapis.com/fcm/send/abc'));
    assert.ok(isPushServiceUrl('https://updates.push.services.mozilla.com/wpush/v2/abc'));
    assert.ok(isPushServiceUrl('https://web.push.apple.com/abc'));
    for (const bad of ['http://fcm.googleapis.com/x', 'https://169.254.169.254/latest/meta-data', 'https://localhost:5000/x', 'https://fcm.googleapis.com.evil.test/x', 'https://user@fcm.googleapis.com/x', 'https://fcm.googleapis.com:8443/x', 'not a url']) {
      assert.equal(isPushServiceUrl(bad), false, bad);
    }
  });

  test('public key is stable; subscribing needs a session and is idempotent', async () => {
    const a = await request(app).get('/api/push/public-key');
    const b = await request(app).get('/api/push/public-key');
    assert.equal(a.status, 200);
    assert.ok(a.body.publicKey.length > 80);
    assert.equal(a.body.publicKey, b.body.publicKey);

    assert.equal((await request(app).post('/api/push/subscriptions').set(H).send(sub(1))).status, 401);
    const agent = await login('ayesha@localfix.test');
    assert.equal((await agent.post('/api/push/test').set(H)).status, 409, 'no device yet');
    assert.equal((await agent.post('/api/push/subscriptions').set(H).send({ ...sub(1), endpoint: 'https://evil.test/hook' })).status, 400);
    assert.equal((await agent.post('/api/push/subscriptions').set(H).send(sub(1))).status, 201);
    const again = await agent.post('/api/push/subscriptions').set(H).send(sub(1));
    assert.equal(again.body.devices, 1);

    // The same browser, now used by another account: the subscription moves, it is not duplicated.
    const other = await login('bilal@localfix.test');
    await other.post('/api/push/subscriptions').set(H).send(sub(1));
    assert.equal((await agent.get('/api/push/subscriptions')).body.devices, 0);
    await other.delete('/api/push/subscriptions').set(H).send({ endpoint: sub(1).endpoint });
    assert.equal(await PushSubscription.countDocuments({}), 0);
  });

  test('a notification reaches offline users as a push, and dead subscriptions are pruned', async () => {
    const sent = [];
    setPushSender(async (subscription, payload) => {
      if (subscription.endpoint.endsWith('device-gone')) throw Object.assign(new Error('Gone'), { statusCode: 410 });
      sent.push({ endpoint: subscription.endpoint, payload });
    });
    const customer = await login('ayesha@localfix.test');
    await customer.post('/api/push/subscriptions').set(H).send(sub('live'));
    await customer.post('/api/push/subscriptions').set(H).send(sub('gone'));

    const test = await customer.post('/api/push/test').set(H);
    assert.deepEqual(test.body, { sent: 1, removed: 1, failed: 0 });
    assert.equal((await customer.get('/api/push/subscriptions')).body.devices, 1);

    // A provider edits their offer on one of the customer's requests: the customer is not connected by socket, so she gets a push.
    sent.length = 0;
    const me = await User.findOne({ email: 'ayesha@localfix.test' });
    const open = await ServiceRequest.findOne({ customer: me._id, status: 'open', offerCount: { $gt: 0 } });
    const offer = await Offer.findOne({ request: open._id, status: 'pending' }).populate('provider', 'email');
    const provider = await login(offer.provider.email);
    const edit = await provider.patch(`/api/offers/${offer._id}`).set(H).send({ price: offer.price - 100 });
    assert.equal(edit.status, 200, JSON.stringify(edit.body));
    const push = await waitFor(() => sent.find((s) => s.payload.link === `/requests/${open._id}`));
    assert.ok(push.payload.title);
    assert.equal(push.endpoint, sub('live').endpoint);
  });
});

describe('calendar export', () => {
  test('iCalendar text is escaped and folded per RFC 5545', () => {
    assert.equal(escapeText('a,b;c\\d\ne'), 'a\\,b\\;c\\\\d\\ne');
    const folded = foldLine(`SUMMARY:${'x'.repeat(200)}`);
    assert.ok(folded.split('\r\n').every((line) => Buffer.byteLength(line) <= 75));
    assert.ok(folded.split('\r\n').slice(1).every((line) => line.startsWith(' ')));
    const ics = buildEvent({ uid: 'u@localfix', start: new Date('2030-01-02T05:00:00Z'), end: new Date('2030-01-02T07:00:00Z'), summary: 'Fix, sink' });
    assert.match(ics, /DTSTART:20300102T050000Z\r\n/);
    assert.match(ics, /SUMMARY:Fix\\, sink\r\n/);
    assert.ok(ics.endsWith('END:VCALENDAR\r\n'));
  });

  test('visit time: a future preferred date at 10:00 PKT, otherwise hire time plus the promised arrival', () => {
    const assignedAt = new Date('2030-03-01T08:00:00Z');
    assert.equal(visitStart({ assignedAt, preferredDate: new Date('2030-03-05T00:00:00Z') }, { etaMinutes: 90 }).toISOString(), '2030-03-05T05:00:00.000Z');
    assert.equal(visitStart({ assignedAt, preferredDate: new Date('2030-02-20T00:00:00Z') }, { etaMinutes: 90 }).toISOString(), '2030-03-01T09:30:00.000Z');
    assert.equal(visitStart({ assignedAt }, null).toISOString(), '2030-03-01T09:00:00.000Z');
  });

  test('only the two parties of a job in progress can download it', async () => {
    const job = await ServiceRequest.findOne({ status: 'assigned' }).populate('customer', 'email').populate('assignedProvider', 'email name');
    const customer = await login(job.customer.email);
    const res = await customer.get(`/api/requests/${job._id}/calendar.ics`);
    assert.equal(res.status, 200);
    assert.match(res.headers['content-type'], /text\/calendar/);
    assert.match(res.headers['content-disposition'], /attachment; filename="localfix-job-/);
    assert.match(res.text, /BEGIN:VEVENT/);
    assert.ok(res.text.replace(/\r\n /g, '').includes(job.assignedProvider.name), 'the customer sees who is coming');

    const provider = await login(job.assignedProvider.email);
    assert.equal((await provider.get(`/api/requests/${job._id}/calendar.ics`)).status, 200);

    const stranger = await login('samina@localfix.test');
    assert.equal((await stranger.get(`/api/requests/${job._id}/calendar.ics`)).status, 403);
    assert.equal((await request(app).get(`/api/requests/${job._id}/calendar.ics`)).status, 401);

    const open = await ServiceRequest.findOne({ status: 'open', customer: job.customer._id });
    if (open) assert.equal((await customer.get(`/api/requests/${open._id}/calendar.ics`)).status, 409);
  });
});

describe('integration status', () => {
  test('admins see every upstream; others are refused', async () => {
    const admin = await login('admin@localfix.test', 'Admin@1234');
    const res = await admin.get('/api/admin/integrations');
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.upstreams.map((u) => u.name).sort(), ['nominatim', 'open-meteo', 'osrm', 'photon']);
    assert.equal(res.body.assistant.engine, 'rules');
    const customer = await login('ayesha@localfix.test');
    assert.equal((await customer.get('/api/admin/integrations')).status, 403);
    assert.equal((await request(app).get('/api/admin/integrations')).status, 401);
  });
});
