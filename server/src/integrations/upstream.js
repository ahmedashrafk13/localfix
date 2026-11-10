// Resilient client for third-party HTTP APIs (geocoding, routing, weather).
//
// Every outbound call goes through one of these, so each upstream gets the same protections:
//   - timeout        a slow upstream can never hang a LocalFix request
//   - retry          one retry with jittered backoff on network errors, timeouts and 5xx / 429
//   - circuit breaker after repeated failures the upstream is skipped for a cool-down period
//   - cache          TTL + LRU, with in-flight de-duplication and stale-if-error
//   - throttle       optional minimum gap between calls (Nominatim allows 1 request per second)
//   - metrics        calls, cache hits, failures and latency percentiles for the admin panel
//
// Callers always get either data or an UpstreamError, and decide on their own fallback.
import { env } from '../config/env.js';

export class UpstreamError extends Error {
  /** @param {'timeout'|'network'|'http'|'open'|'disabled'|'invalid'} code */
  constructor(upstream, code, message, status) {
    super(`[${upstream}] ${message}`);
    this.name = 'UpstreamError';
    this.upstream = upstream;
    this.code = code;
    this.status = status;
  }
}

const registry = new Map();
let fetchOverride = null;

/** Tests inject a fake fetch here. Passing null restores the default. */
export function setUpstreamFetch(fn) {
  fetchOverride = fn;
}

function defaultFetch() {
  if (fetchOverride) return fetchOverride;
  // The test suite must never depend on the public internet.
  if (!env.EXTERNAL_APIS) return null;
  return globalThis.fetch;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function percentile(sorted, p) {
  if (!sorted.length) return null;
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
}

export function createUpstream({
  name,
  label = name,
  baseUrl,
  docsUrl = '',
  purpose = '',
  headers = {},
  timeoutMs = 6000,
  retries = 1,
  minIntervalMs = 0,
  cacheTtlMs = 5 * 60_000,
  staleTtlMs = 24 * 60 * 60_000,
  maxEntries = 500,
  breakerThreshold = 5,
  breakerCooldownMs = 30_000,
  now = () => Date.now(),
}) {
  const cache = new Map(); // key -> { data, at, ttl }
  const inflight = new Map(); // key -> Promise
  const latencies = []; // last 100 successful call durations
  const stats = { calls: 0, cacheHits: 0, staleServed: 0, failures: 0, retries: 0, shortCircuited: 0, lastError: null, lastErrorAt: null, lastSuccessAt: null };
  let consecutiveFailures = 0;
  let openedAt = 0;
  let gate = Promise.resolve();
  let lastCallAt = 0;

  function breakerState() {
    if (!openedAt) return 'closed';
    return now() - openedAt >= breakerCooldownMs ? 'half-open' : 'open';
  }

  function remember(key, data, ttl) {
    cache.delete(key);
    cache.set(key, { data, at: now(), ttl });
    while (cache.size > maxEntries) cache.delete(cache.keys().next().value);
  }

  /** Spaces calls out so the upstream's published rate limit is respected. */
  function throttle() {
    if (!minIntervalMs || env.isTest) return Promise.resolve();
    gate = gate.then(async () => {
      const wait = lastCallAt + minIntervalMs - Date.now();
      if (wait > 0) await sleep(wait);
      lastCallAt = Date.now();
    });
    return gate;
  }

  async function attempt(url, doFetch) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await doFetch(url, { headers: { Accept: 'application/json', ...headers }, signal: controller.signal });
      if (!res.ok) throw new UpstreamError(name, 'http', `HTTP ${res.status}`, res.status);
      try {
        return await res.json();
      } catch {
        throw new UpstreamError(name, 'invalid', 'response was not valid JSON');
      }
    } catch (err) {
      if (err instanceof UpstreamError) throw err;
      if (err?.name === 'AbortError') throw new UpstreamError(name, 'timeout', `timed out after ${timeoutMs} ms`);
      throw new UpstreamError(name, 'network', err?.message || 'network error');
    } finally {
      clearTimeout(timer);
    }
  }

  const retryable = (err) => err.code === 'timeout' || err.code === 'network' || (err.code === 'http' && (err.status >= 500 || err.status === 429));

  async function call(url) {
    const doFetch = defaultFetch();
    if (!doFetch) throw new UpstreamError(name, 'disabled', 'external APIs are disabled');
    if (breakerState() === 'open') {
      stats.shortCircuited += 1;
      throw new UpstreamError(name, 'open', 'circuit breaker is open');
    }
    let lastErr;
    for (let i = 0; i <= retries; i += 1) {
      if (i > 0) {
        stats.retries += 1;
        await sleep(env.isTest ? 1 : 200 * 2 ** (i - 1) + Math.random() * 150);
      }
      await throttle();
      const started = now();
      stats.calls += 1;
      try {
        const data = await attempt(url, doFetch);
        latencies.push(now() - started);
        if (latencies.length > 100) latencies.shift();
        consecutiveFailures = 0;
        openedAt = 0;
        stats.lastSuccessAt = new Date();
        return data;
      } catch (err) {
        lastErr = err;
        if (!retryable(err)) break;
      }
    }
    stats.failures += 1;
    stats.lastError = lastErr.message;
    stats.lastErrorAt = new Date();
    consecutiveFailures += 1;
    // A failed probe in the half-open state re-opens the breaker immediately.
    if (consecutiveFailures >= breakerThreshold || openedAt) openedAt = now();
    throw lastErr;
  }

  /**
   * GET a JSON document. Returns { data, cached, stale }.
   * `ttlMs: 0` skips the cache for this call.
   */
  async function getJson(path, { params = {}, ttlMs = cacheTtlMs } = {}) {
    const url = new URL(path, baseUrl);
    for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
    const key = url.toString();

    const hit = cache.get(key);
    if (hit && ttlMs > 0 && now() - hit.at < hit.ttl) {
      stats.cacheHits += 1;
      return { data: hit.data, cached: true, stale: false };
    }
    if (inflight.has(key)) return inflight.get(key);

    const task = (async () => {
      try {
        const data = await call(key);
        if (ttlMs > 0) remember(key, data, ttlMs);
        return { data, cached: false, stale: false };
      } catch (err) {
        // Stale-if-error: an old answer beats no answer for maps and weather.
        if (hit && now() - hit.at < staleTtlMs) {
          stats.staleServed += 1;
          return { data: hit.data, cached: true, stale: true };
        }
        throw err;
      } finally {
        inflight.delete(key);
      }
    })();
    inflight.set(key, task);
    return task;
  }

  function snapshot() {
    const sorted = [...latencies].sort((a, b) => a - b);
    const lookups = stats.calls + stats.cacheHits;
    return {
      name,
      label,
      purpose,
      docsUrl,
      host: new URL(baseUrl).host,
      enabled: Boolean(defaultFetch()),
      breaker: breakerState(),
      ...stats,
      cacheEntries: cache.size,
      cacheHitRate: lookups ? Math.round((stats.cacheHits / lookups) * 100) : null,
      latencyMs: { p50: percentile(sorted, 50), p95: percentile(sorted, 95) },
    };
  }

  const upstream = { name, getJson, snapshot, clearCache: () => cache.clear() };
  registry.set(name, upstream);
  return upstream;
}

export function upstreamSnapshots() {
  return [...registry.values()].map((u) => u.snapshot());
}

export function clearUpstreamCaches() {
  for (const u of registry.values()) u.clearCache();
}
