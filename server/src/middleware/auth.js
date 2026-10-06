import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { forbidden, unauthorized } from '../utils/http.js';
import { SESSION_COOKIE, clearSessionCookie, setSessionCookie, verifySession } from '../utils/tokens.js';

const REFRESH_AFTER_MS = 60 * 60 * 1000;

function readToken(req) {
  const header = req.get('authorization');
  if (header?.startsWith('Bearer ')) return { token: header.slice(7), fromCookie: false };
  const cookie = req.cookies?.[SESSION_COOKIE];
  return cookie ? { token: cookie, fromCookie: true } : { token: null, fromCookie: false };
}

/** Resolves the session (cookie or bearer token) into req.user. Never fails the request by itself. */
export async function loadUser(req, res, next) {
  const { token, fromCookie } = readToken(req);
  if (!token) return next();
  try {
    const payload = verifySession(token);
    const user = await User.findById(payload.sub);
    const valid = user && user.status === 'active' && (user.tokenVersion || 0) === (payload.tv || 0);
    if (!valid) {
      if (fromCookie) clearSessionCookie(res);
      return next();
    }
    if (user.role === 'provider' && !user.provider) user.provider = {};
    req.user = user;
    // Sliding session: an active user keeps getting a fresh cookie, an idle one times out.
    if (fromCookie && Date.now() - payload.iat * 1000 > REFRESH_AFTER_MS) setSessionCookie(res, user);
    if (!user.lastSeenAt || Date.now() - user.lastSeenAt.getTime() > 5 * 60 * 1000) {
      User.updateOne({ _id: user._id }, { $set: { lastSeenAt: new Date() } }).catch(() => {});
    }
  } catch {
    if (fromCookie) clearSessionCookie(res);
  }
  next();
}

export function requireAuth(req, res, next) {
  if (!req.user) return next(unauthorized());
  next();
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(unauthorized());
    if (!roles.includes(req.user.role)) return next(forbidden('This area is not available for your account type.'));
    next();
  };
}

export function requireVerifiedEmail(req, res, next) {
  if (!req.user) return next(unauthorized());
  if (env.REQUIRE_EMAIL_VERIFICATION && !req.user.emailVerified && req.user.role !== 'admin') {
    return next(forbidden('Please verify your email address first. Check your inbox or resend the link from your dashboard.'));
  }
  next();
}

export function requireVerifiedProvider(req, res, next) {
  if (!req.user) return next(unauthorized());
  if (req.user.role !== 'provider') return next(forbidden('Only service providers can do this.'));
  if (req.user.provider?.verification?.status !== 'verified') {
    return next(forbidden('Your provider account must be verified by our team before you can send offers.'));
  }
  next();
}
