// Location services backed by third-party APIs (see src/integrations). The browser never calls those
// APIs directly: this server proxies them, so it can cache answers, respect each provider's rate
// limit, keep the Content-Security-Policy closed and degrade gracefully when a provider is down.
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { env } from '../config/env.js';
import { reverseGeocode, searchPlaces } from '../integrations/geocoding.js';
import { getForecast, pickDay, workAdvisory } from '../integrations/weather.js';
import { validate } from '../middleware/validate.js';
import { serviceUnavailable } from '../utils/http.js';

const router = Router();

export const externalLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => env.isTest,
  message: { error: { message: 'Too many lookups. Please wait a moment.' } },
});
router.use(externalLimiter);

const point = { lat: z.coerce.number().min(-90).max(90), lng: z.coerce.number().min(-180).max(180) };

router.get('/search', validate(z.object({ q: z.string().trim().min(3, 'Type at least 3 characters.').max(80) }), 'query'), async (req, res) => {
  let result;
  try {
    result = await searchPlaces(req.q.q);
  } catch {
    throw serviceUnavailable('Address search is unavailable right now. You can still choose your area and drag the pin.');
  }
  res.set('Cache-Control', 'private, max-age=300');
  res.json(result);
});

router.get('/reverse', validate(z.object(point), 'query'), async (req, res) => {
  let result;
  try {
    result = await reverseGeocode(req.q.lat, req.q.lng);
  } catch {
    throw serviceUnavailable('Could not look up that address right now.');
  }
  res.set('Cache-Control', 'private, max-age=300');
  res.json(result);
});

const weatherSchema = z.object({
  ...point,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the format YYYY-MM-DD.').optional(),
  category: z.string().trim().max(60).optional(),
});

router.get('/weather', validate(weatherSchema, 'query'), async (req, res) => {
  let forecast;
  try {
    forecast = await getForecast(req.q.lat, req.q.lng);
  } catch {
    throw serviceUnavailable('The weather forecast is unavailable right now.');
  }
  const day = pickDay(forecast, req.q.date);
  res.set('Cache-Control', 'private, max-age=600');
  res.json({ ...forecast, focus: day, advisory: workAdvisory(day, req.q.category) });
});

export default router;
