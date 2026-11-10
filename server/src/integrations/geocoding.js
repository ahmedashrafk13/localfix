// Geocoding through OpenStreetMap data.
//   - Address search (type-ahead): Photon by Komoot, which is built for autocomplete.
//   - Reverse geocoding (coordinates -> address): Nominatim. Its usage policy forbids autocomplete,
//     allows 1 request per second and requires an identifying User-Agent; the upstream client enforces both.
// Results are mapped onto LocalFix's own launch areas so a found place can fill the City and Area fields.
import { env } from '../config/env.js';
import { CITIES } from '../config/places.js';
import { haversineKm } from '../utils/serialize.js';
import { createUpstream } from './upstream.js';

const photon = createUpstream({
  name: 'photon',
  label: 'Photon (Komoot)',
  purpose: 'Address search as you type',
  docsUrl: 'https://photon.komoot.io',
  baseUrl: env.PHOTON_URL,
  headers: { 'User-Agent': env.OUTBOUND_USER_AGENT },
  timeoutMs: 5000,
  cacheTtlMs: 24 * 60 * 60_000,
});

const nominatim = createUpstream({
  name: 'nominatim',
  label: 'Nominatim (OpenStreetMap)',
  purpose: 'Turning a map pin into an address',
  docsUrl: 'https://nominatim.org/release-docs/latest/api/Reverse/',
  baseUrl: env.NOMINATIM_URL,
  headers: { 'User-Agent': env.OUTBOUND_USER_AGENT },
  timeoutMs: 6000,
  minIntervalMs: 1100,
  cacheTtlMs: 7 * 24 * 60 * 60_000,
});

// Bounding box around the launch region (Islamabad and Rawalpindi): west, south, east, north.
const all = CITIES.flatMap((c) => c.areas);
const PAD = 0.12;
export const SERVICE_BBOX = [
  Math.min(...all.map((a) => a.lng)) - PAD,
  Math.min(...all.map((a) => a.lat)) - PAD,
  Math.max(...all.map((a) => a.lng)) + PAD,
  Math.max(...all.map((a) => a.lat)) + PAD,
].map((n) => Math.round(n * 1000) / 1000);

const REGION_CENTER = { lat: (SERVICE_BBOX[1] + SERVICE_BBOX[3]) / 2, lng: (SERVICE_BBOX[0] + SERVICE_BBOX[2]) / 2 };
const MAX_AREA_DISTANCE_KM = 6;

/** The LocalFix area closest to a point, or null when the point is outside the service region. */
export function nearestArea(lat, lng) {
  let best = null;
  for (const city of CITIES) {
    for (const area of city.areas) {
      const km = haversineKm([lng, lat], [area.lng, area.lat]);
      if (!best || km < best.distanceKm) best = { city: city.name, area: area.name, distanceKm: km };
    }
  }
  if (!best || best.distanceKm > MAX_AREA_DISTANCE_KM) return null;
  return { ...best, distanceKm: Math.round(best.distanceKm * 10) / 10 };
}

const uniq = (parts) => [...new Set(parts.map((p) => (p || '').trim()).filter(Boolean))];

/** Type-ahead address search, limited to the service region. */
export async function searchPlaces(query) {
  const { data, stale } = await photon.getJson('/api/', {
    params: { q: query, limit: 6, lang: 'en', lat: REGION_CENTER.lat, lon: REGION_CENTER.lng, bbox: SERVICE_BBOX.join(',') },
  });
  const seen = new Set();
  const items = [];
  for (const f of data?.features || []) {
    const [lng, lat] = f.geometry?.coordinates || [];
    if (typeof lat !== 'number' || typeof lng !== 'number') continue;
    const p = f.properties || {};
    const line1 = uniq([p.name, [p.housenumber, p.street].filter(Boolean).join(' ')]).join(', ');
    const line2 = uniq([p.district || p.locality, p.city || p.county]).join(', ');
    const label = line1 || line2;
    if (!label || seen.has(`${label}|${line2}`)) continue;
    seen.add(`${label}|${line2}`);
    items.push({
      id: `${p.osm_type || 'N'}${p.osm_id || items.length}`,
      label,
      detail: line1 ? line2 : '',
      address: uniq([line1, line2]).join(', ').slice(0, 200),
      lat: Math.round(lat * 1e6) / 1e6,
      lng: Math.round(lng * 1e6) / 1e6,
      match: nearestArea(lat, lng),
    });
  }
  return { items, stale, attribution: 'Search by Photon. Data © OpenStreetMap contributors' };
}

/** Coordinates -> a short street address plus the matching LocalFix city and area. */
export async function reverseGeocode(lat, lng) {
  // ~11 m precision is plenty for an address and makes nearby lookups share a cache entry.
  const rLat = Math.round(lat * 1e4) / 1e4;
  const rLng = Math.round(lng * 1e4) / 1e4;
  const { data, stale } = await nominatim.getJson('/reverse', {
    params: { lat: rLat, lon: rLng, format: 'jsonv2', zoom: 18, addressdetails: 1, 'accept-language': 'en' },
  });
  const a = data?.address || {};
  const street = uniq([[a.house_number, a.road].filter(Boolean).join(' '), a.neighbourhood]).join(', ');
  const suburb = a.suburb || a.city_district || a.quarter || '';
  const city = a.city || a.town || a.village || a.county || '';
  return {
    address: uniq([street, suburb]).join(', ').slice(0, 200),
    street,
    suburb,
    city,
    displayName: data?.display_name || '',
    match: nearestArea(lat, lng),
    stale,
    attribution: 'Data © OpenStreetMap contributors',
  };
}
