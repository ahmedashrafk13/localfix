import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

export function stripDangerousKeys(value, depth = 0) {
  if (depth > 10 || value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((v) => stripDangerousKeys(v, depth + 1));
  for (const key of Object.keys(value)) {
    if (key.startsWith('$') || key.includes('.') || key === '__proto__' || key === 'constructor' || key === 'prototype') {
      delete value[key];
    } else {
      value[key] = stripDangerousKeys(value[key], depth + 1);
    }
  }
  return value;
}

/** Removes MongoDB operator keys ($gt, $where, dotted paths) from bodies to block NoSQL injection. */
export function sanitizeInput(req, res, next) {
  if (req.body && typeof req.body === 'object') stripDangerousKeys(req.body);
  next();
}

/**
 * CSRF defence for cookie-authenticated requests: state-changing API calls must carry the
 * X-Requested-With header. Browsers do not allow a cross-site form or image to set custom headers,
 * and cross-origin fetch with custom headers needs a CORS preflight that this server never approves.
 */
export function requireAjaxHeader(req, res, next) {
  const safe = req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS';
  if (safe || req.get('x-requested-with') || req.get('authorization')) return next();
  res.status(403).json({ error: { message: 'Missing X-Requested-With header.' } });
}

const skip = () => env.isTest;

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip,
  message: { error: { message: 'Too many attempts. Please wait 15 minutes and try again.' } },
});

export const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 40,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip,
  message: { error: { message: 'You are doing that too often. Please slow down.' } },
});

export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 400,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip,
  message: { error: { message: 'Too many requests. Please try again in a minute.' } },
});
