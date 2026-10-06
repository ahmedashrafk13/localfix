import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export const SESSION_COOKIE = 'lf_session';

export function signSession(user) {
  return jwt.sign({ sub: user._id.toString(), role: user.role, tv: user.tokenVersion || 0 }, env.JWT_SECRET, {
    expiresIn: `${env.SESSION_HOURS}h`,
  });
}

export function verifySession(token) {
  return jwt.verify(token, env.JWT_SECRET);
}

export function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.isProd,
    maxAge: env.SESSION_HOURS * 60 * 60 * 1000,
    path: '/',
  };
}

export function setSessionCookie(res, user) {
  res.cookie(SESSION_COOKIE, signSession(user), cookieOptions());
}

export function clearSessionCookie(res) {
  const { maxAge, ...rest } = cookieOptions();
  res.clearCookie(SESSION_COOKIE, rest);
}

/** Random single-use token: the raw value goes to the user, only the SHA-256 hash is stored. */
export function createOneTimeToken() {
  const raw = crypto.randomBytes(32).toString('hex');
  return { raw, hash: hashToken(raw) };
}

export function hashToken(raw) {
  return crypto.createHash('sha256').update(String(raw)).digest('hex');
}

export function parseCookieHeader(header = '') {
  const out = {};
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx < 0) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (key) {
      try {
        out[key] = decodeURIComponent(value);
      } catch {
        out[key] = value;
      }
    }
  }
  return out;
}
