// Driving distance and travel time between a provider and a job, from the public OSRM server
// (Open Source Routing Machine, OpenStreetMap road data).
// If OSRM is unreachable the caller still gets an answer: a straight-line estimate, clearly flagged.
import { env } from '../config/env.js';
import { haversineKm } from '../utils/serialize.js';
import { createUpstream } from './upstream.js';

const osrm = createUpstream({
  name: 'osrm',
  label: 'OSRM',
  purpose: 'Driving distance, travel time and the route line',
  docsUrl: 'https://project-osrm.org/docs/v5.24.0/api/',
  baseUrl: env.OSRM_URL,
  headers: { 'User-Agent': env.OUTBOUND_USER_AGENT },
  timeoutMs: 6000,
  cacheTtlMs: 60 * 60_000,
});

// City driving in Islamabad and Rawalpindi: roads are ~1.35x the straight line, at ~28 km/h door to door.
const DETOUR_FACTOR = 1.35;
const CITY_SPEED_KMH = 28;

const r4 = (n) => Math.round(n * 1e4) / 1e4;

export function estimateRoute(from, to) {
  const km = haversineKm([from.lng, from.lat], [to.lng, to.lat]) * DETOUR_FACTOR;
  return {
    distanceKm: Math.round(km * 10) / 10,
    durationMin: Math.max(1, Math.round((km / CITY_SPEED_KMH) * 60)),
    geometry: null,
    source: 'estimate',
  };
}

/**
 * @param {{lat:number,lng:number}} from
 * @param {{lat:number,lng:number}} to
 * @returns {Promise<{distanceKm:number,durationMin:number,geometry:[number,number][]|null,source:'osrm'|'estimate'}>}
 *   geometry is a list of [lat, lng] pairs ready for a Leaflet polyline.
 */
export async function getRoute(from, to) {
  const coords = `${r4(from.lng)},${r4(from.lat)};${r4(to.lng)},${r4(to.lat)}`;
  try {
    const { data } = await osrm.getJson(`/route/v1/driving/${coords}`, { params: { overview: 'simplified', geometries: 'geojson' } });
    const route = data?.code === 'Ok' ? data.routes?.[0] : null;
    if (!route) return estimateRoute(from, to);
    return {
      distanceKm: Math.round(route.distance / 100) / 10,
      durationMin: Math.max(1, Math.round(route.duration / 60)),
      geometry: (route.geometry?.coordinates || []).map(([lng, lat]) => [lat, lng]),
      source: 'osrm',
    };
  } catch {
    return estimateRoute(from, to);
  }
}
