// Price guidance computed from LocalFix's own marketplace data: what providers actually quoted,
// and what customers actually accepted, for jobs in a category. Shown to customers when they set a
// budget and to providers when they price an offer.
import mongoose from 'mongoose';
import { ServiceRequest } from '../models/ServiceRequest.js';

const CACHE_MS = 10 * 60_000;
const MIN_SAMPLE = 5;
const cache = new Map(); // categoryId -> { at, value }

/** Linear-interpolated percentile of an ascending array. */
export function quantile(sorted, q) {
  if (!sorted.length) return null;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

/** Rounds to a "price-like" number: nearest 50 below Rs 2,000, nearest 100 above. */
export function roundPrice(n) {
  if (n === null) return null;
  const step = n < 2000 ? 50 : 100;
  return Math.round(n / step) * step;
}

export function clearInsightsCache() {
  cache.clear();
}

/**
 * @returns {Promise<null | {basis:'accepted'|'quoted', sample:number, low:number, median:number, high:number,
 *   typicalEtaMinutes:number|null, avgOffersPerRequest:number|null}>} null when there is too little data.
 */
export async function priceInsight(categoryId) {
  const key = String(categoryId);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.value;

  const rows = await ServiceRequest.aggregate([
    { $match: { category: new mongoose.Types.ObjectId(key), removed: false } },
    { $lookup: { from: 'offers', localField: '_id', foreignField: 'request', as: 'offer' } },
    { $unwind: '$offer' },
    { $match: { 'offer.status': { $ne: 'withdrawn' } } },
    { $project: { _id: 0, request: '$_id', price: '$offer.price', eta: '$offer.etaMinutes', status: '$offer.status' } },
  ]);

  const accepted = rows.filter((r) => r.status === 'accepted');
  const basis = accepted.length >= MIN_SAMPLE ? 'accepted' : 'quoted';
  const pool = basis === 'accepted' ? accepted : rows;
  let value = null;
  if (pool.length >= MIN_SAMPLE) {
    const prices = pool.map((r) => r.price).sort((a, b) => a - b);
    const etas = rows.map((r) => r.eta).sort((a, b) => a - b);
    const requests = new Set(rows.map((r) => r.request.toString())).size;
    value = {
      basis,
      sample: pool.length,
      low: roundPrice(quantile(prices, 0.25)),
      median: roundPrice(quantile(prices, 0.5)),
      high: roundPrice(quantile(prices, 0.75)),
      typicalEtaMinutes: etas.length ? Math.round(quantile(etas, 0.5)) : null,
      avgOffersPerRequest: requests ? Math.round((rows.length / requests) * 10) / 10 : null,
    };
  }
  cache.set(key, { at: Date.now(), value });
  return value;
}
