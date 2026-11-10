// Weather forecast for a job location from Open-Meteo (free, no key, CC BY 4.0 data).
// LocalFix uses it to warn when rain, heat or wind is likely to delay weather-sensitive work
// such as exterior painting, rooftop solar or an AC outdoor unit.
import { env } from '../config/env.js';
import { createUpstream } from './upstream.js';

const openMeteo = createUpstream({
  name: 'open-meteo',
  label: 'Open-Meteo',
  purpose: 'Seven-day forecast and work-weather advice',
  docsUrl: 'https://open-meteo.com/en/docs',
  baseUrl: env.OPEN_METEO_URL,
  timeoutMs: 5000,
  cacheTtlMs: 30 * 60_000,
  staleTtlMs: 6 * 60 * 60_000,
});

// WMO weather interpretation codes (the code table in the Open-Meteo docs), grouped for display.
const WMO = [
  [[0], 'Clear sky', 'clear'],
  [[1, 2], 'Partly cloudy', 'partly-cloudy'],
  [[3], 'Overcast', 'cloudy'],
  [[45, 48], 'Fog', 'fog'],
  [[51, 53, 55, 56, 57], 'Drizzle', 'drizzle'],
  [[61, 63, 65, 66, 67, 80, 81, 82], 'Rain', 'rain'],
  [[71, 73, 75, 77, 85, 86], 'Snow', 'snow'],
  [[95, 96, 99], 'Thunderstorm', 'storm'],
];

export function describeWeatherCode(code) {
  const row = WMO.find(([codes]) => codes.includes(code));
  return row ? { label: row[1], icon: row[2] } : { label: 'Unknown', icon: 'cloudy' };
}

// Categories where the work (or part of it) happens outdoors, and why the weather matters.
const WEATHER_SENSITIVE = {
  painting: 'exterior paint and damp treatment need dry weather',
  'solar-ups': 'rooftop panel work is unsafe on a wet or windy roof',
  'ac-repair': 'the outdoor unit cannot be serviced safely in rain',
  'pest-control': 'outdoor spray is washed away by rain',
  'car-mechanic': 'doorstep car repair happens in the open',
};

export const RAIN_CHANCE_LIMIT = 60;
export const HEAT_LIMIT_C = 40;
export const WIND_LIMIT_KPH = 40;

/**
 * Plain-language advice for one forecast day.
 * level: "ok" (nothing to flag), "info" (bad weather, indoor job) or "caution" (may delay the job).
 */
export function workAdvisory(day, categorySlug) {
  if (!day) return null;
  const reason = WEATHER_SENSITIVE[categorySlug];
  const issues = [];
  if ((day.rainChance ?? 0) >= RAIN_CHANCE_LIMIT) issues.push(`rain is likely (${day.rainChance}% chance)`);
  if (day.icon === 'storm') issues.push('thunderstorms are forecast');
  if ((day.maxC ?? 0) >= HEAT_LIMIT_C) issues.push(`extreme heat is forecast (${Math.round(day.maxC)}°C)`);
  if ((day.windKph ?? 0) >= WIND_LIMIT_KPH) issues.push(`strong wind is forecast (${Math.round(day.windKph)} km/h)`);
  if (!issues.length) return { level: 'ok', message: reason ? 'The forecast looks fine for this job.' : 'No weather problems expected.' };
  const what = issues.join(' and ');
  const sentence = what.charAt(0).toUpperCase() + what.slice(1);
  if (reason) return { level: 'caution', message: `${sentence}, and ${reason}. Agree a backup day with your provider.` };
  return { level: 'info', message: `${sentence}. Indoor work is not affected, but travel may take longer.` };
}

const r2 = (n) => Math.round(n * 100) / 100;

/**
 * Forecast for a point. Coordinates are rounded to ~1 km: weather does not vary below that,
 * the cache is shared across a neighbourhood, and the exact address never leaves the server.
 */
export async function getForecast(lat, lng) {
  const { data, cached, stale } = await openMeteo.getJson('/v1/forecast', {
    params: {
      latitude: r2(lat),
      longitude: r2(lng),
      current: 'temperature_2m,weather_code,wind_speed_10m,precipitation',
      daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,wind_speed_10m_max',
      timezone: 'auto',
      forecast_days: 7,
    },
  });
  const d = data?.daily || {};
  const days = (d.time || []).map((date, i) => ({
    date,
    ...describeWeatherCode(d.weather_code?.[i]),
    maxC: d.temperature_2m_max?.[i] ?? null,
    minC: d.temperature_2m_min?.[i] ?? null,
    rainChance: d.precipitation_probability_max?.[i] ?? null,
    rainMm: d.precipitation_sum?.[i] ?? null,
    windKph: d.wind_speed_10m_max?.[i] ?? null,
  }));
  const c = data?.current;
  return {
    current: c
      ? { tempC: c.temperature_2m, ...describeWeatherCode(c.weather_code), windKph: c.wind_speed_10m, rainMm: c.precipitation, at: c.time }
      : null,
    days,
    timezone: data?.timezone || 'UTC',
    cached,
    stale,
    attribution: 'Weather data by Open-Meteo.com (CC BY 4.0)',
  };
}

/** Picks the forecast day for a calendar date (YYYY-MM-DD in the location's timezone), or today. */
export function pickDay(forecast, date) {
  if (!forecast?.days?.length) return null;
  if (date) {
    const key = typeof date === 'string' ? date.slice(0, 10) : new Date(date).toLocaleDateString('en-CA', { timeZone: forecast.timezone });
    // A date outside the 7-day window has no forecast yet.
    return forecast.days.find((d) => d.date === key) || null;
  }
  return forecast.days[0];
}
