// Unit tests for the resilient third-party HTTP client. No database and no network.
import assert from 'node:assert/strict';
import { afterEach, describe, test } from 'node:test';

process.env.NODE_ENV = 'test';

const { createUpstream, setUpstreamFetch, UpstreamError } = await import('../src/integrations/upstream.js');
const { fakeFetch } = await import('./helpers.js');

let n = 0;
const make = (opts = {}) => createUpstream({ name: `test-${(n += 1)}`, baseUrl: 'https://example.test', ...opts });

afterEach(() => setUpstreamFetch(null));

describe('upstream client', () => {
  test('is disabled in tests unless a fetch is injected', async () => {
    await assert.rejects(make().getJson('/x'), (err) => err instanceof UpstreamError && err.code === 'disabled');
  });

  test('caches by URL and de-duplicates concurrent identical calls', async () => {
    const fetch = fakeFetch(() => ({ hello: 'world' }));
    setUpstreamFetch(fetch);
    const up = make();
    const [a, b] = await Promise.all([up.getJson('/x', { params: { q: 1 } }), up.getJson('/x', { params: { q: 1 } })]);
    assert.deepEqual(a.data, { hello: 'world' });
    assert.equal(b.data, a.data);
    assert.equal(fetch.calls.length, 1, 'concurrent calls share one request');
    const c = await up.getJson('/x', { params: { q: 1 } });
    assert.equal(c.cached, true);
    await up.getJson('/x', { params: { q: 2 } });
    assert.equal(fetch.calls.length, 2, 'a different query is a different cache entry');
    assert.equal(up.snapshot().cacheHits, 1);
  });

  test('retries a 5xx once, but never a 4xx', async () => {
    let attempts = 0;
    setUpstreamFetch(fakeFetch(() => ((attempts += 1) === 1 ? { status: 502, body: {} } : { ok: 1 })));
    const up = make();
    assert.deepEqual((await up.getJson('/flaky')).data, { ok: 1 });
    assert.equal(attempts, 2);
    assert.equal(up.snapshot().retries, 1);

    const notFound = fakeFetch(() => ({ status: 404, body: {} }));
    setUpstreamFetch(notFound);
    await assert.rejects(up.getJson('/missing'), (err) => err.code === 'http' && err.status === 404);
    assert.equal(notFound.calls.length, 1);
  });

  test('times out a hanging upstream', async () => {
    setUpstreamFetch((url, { signal }) => new Promise((resolve, reject) => signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })))));
    const up = make({ timeoutMs: 20, retries: 0 });
    await assert.rejects(up.getJson('/slow'), (err) => err.code === 'timeout');
  });

  test('serves a stale cached answer when the upstream fails', async () => {
    let clock = 1_000_000;
    let down = false;
    setUpstreamFetch(fakeFetch(() => (down ? { status: 500, body: {} } : { v: 1 })));
    const up = make({ cacheTtlMs: 1000, retries: 0, now: () => clock });
    await up.getJson('/w');
    clock += 5000; // the entry is now expired
    down = true;
    const res = await up.getJson('/w');
    assert.deepEqual(res.data, { v: 1 });
    assert.equal(res.stale, true);
    assert.equal(up.snapshot().staleServed, 1);
  });

  test('circuit breaker opens after repeated failures and recovers after the cool-down', async () => {
    let clock = 1_000_000;
    let down = true;
    const fetch = fakeFetch(() => (down ? { status: 500, body: {} } : { ok: true }));
    setUpstreamFetch(fetch);
    const up = make({ retries: 0, breakerThreshold: 3, breakerCooldownMs: 10_000, now: () => clock });

    for (let i = 0; i < 3; i += 1) await assert.rejects(up.getJson(`/f${i}`));
    assert.equal(up.snapshot().breaker, 'open');
    await assert.rejects(up.getJson('/blocked'), (err) => err.code === 'open');
    assert.equal(fetch.calls.length, 3, 'an open breaker makes no network call');

    clock += 10_001;
    assert.equal(up.snapshot().breaker, 'half-open');
    await assert.rejects(up.getJson('/probe-fails'));
    assert.equal(up.snapshot().breaker, 'open', 'a failed probe re-opens the breaker');

    clock += 10_001;
    down = false;
    assert.deepEqual((await up.getJson('/probe-ok')).data, { ok: true });
    assert.equal(up.snapshot().breaker, 'closed');
  });

  test('evicts the oldest entries beyond maxEntries', async () => {
    setUpstreamFetch(fakeFetch((url) => ({ path: url.pathname })));
    const up = make({ maxEntries: 2 });
    await up.getJson('/a');
    await up.getJson('/b');
    await up.getJson('/c');
    assert.equal(up.snapshot().cacheEntries, 2);
    assert.equal((await up.getJson('/a')).cached, false, '/a was evicted');
  });
});
