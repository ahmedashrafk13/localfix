import { Router } from 'express';
import { z } from 'zod';
import { env } from '../config/env.js';
import { requireAuth } from '../middleware/auth.js';
import { authLimiter } from '../middleware/security.js';
import { validate } from '../middleware/validate.js';
import { Category } from '../models/Category.js';
import { User } from '../models/User.js';
import { notifyAdmins, track } from '../services/notify.js';
import { disconnectUser } from '../socket/index.js';
import { badRequest, conflict, forbidden, unauthorized } from '../utils/http.js';
import { resetEmail, sendMail, verificationEmail } from '../utils/mailer.js';
import { selfUser } from '../utils/serialize.js';
import { clearSessionCookie, createOneTimeToken, hashToken, setSessionCookie } from '../utils/tokens.js';

const router = Router();

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters.')
  .max(72, 'Password must be at most 72 characters.')
  .regex(/[A-Za-z]/, 'Password must contain a letter.')
  .regex(/\d/, 'Password must contain a number.');

const emailSchema = z.string().trim().toLowerCase().email('Enter a valid email address.').max(160);
const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[0-9\s-]{10,16}$/, 'Enter a valid phone number, e.g. 0300 1234567.');

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Enter your full name.').max(80),
  email: emailSchema,
  phone: phoneSchema,
  password: passwordSchema,
  role: z.enum(['customer', 'provider']),
  city: z.string().trim().min(2, 'Choose your city.').max(60),
  area: z.string().trim().max(60).optional().default(''),
  categories: z.array(z.string()).max(6).optional().default([]),
});

/**
 * Base URL for links in emails. Request headers are attacker-controlled, so they are never trusted blindly
 * (host header injection would let someone receive a victim's reset link):
 * - APP_URL when configured (recommended in production);
 * - in development, the browser's Origin only if it is a local address (Vite on 5173 or the API port);
 * - in production without APP_URL, the Host header, which the hosting proxy has already validated.
 */
function appUrl(req) {
  if (env.APP_URL_SET) return env.APP_URL;
  if (!env.isProd) {
    const origin = req.get('origin') || '';
    const local = [`http://localhost:5173`, `http://127.0.0.1:5173`, `http://localhost:${env.PORT}`, `http://127.0.0.1:${env.PORT}`];
    return local.includes(origin) ? origin : env.APP_URL;
  }
  return `${req.protocol}://${req.get('host')}`;
}

async function issueVerification(user, req) {
  const { raw, hash } = createOneTimeToken();
  user.emailVerifyTokenHash = hash;
  user.emailVerifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await user.save();
  const link = `${appUrl(req)}/verify-email?token=${raw}`;
  await sendMail(verificationEmail(user, link));
  return env.EXPOSE_DEV_LINKS ? link : undefined;
}

router.post('/register', authLimiter, validate(registerSchema), async (req, res) => {
  const data = req.body;
  if (await User.exists({ email: data.email })) throw conflict('An account with this email already exists. Try logging in instead.');

  const user = new User({
    name: data.name,
    email: data.email,
    phone: data.phone,
    role: data.role,
    city: data.city,
    area: data.area,
    emailVerified: !env.REQUIRE_EMAIL_VERIFICATION,
  });
  await user.setPassword(data.password);

  if (data.role === 'provider') {
    const validIds = data.categories.length
      ? (await Category.find({ _id: { $in: data.categories.filter((id) => /^[a-f\d]{24}$/i.test(id)) }, active: true }).select('_id')).map((c) => c._id)
      : [];
    user.provider = { categories: validIds, serviceAreas: data.area ? [data.area] : [] };
  }
  await user.save();

  const devLink = env.REQUIRE_EMAIL_VERIFICATION ? await issueVerification(user, req) : undefined;
  setSessionCookie(res, user);
  track('signup', { role: user.role });
  if (user.role === 'provider') {
    await notifyAdmins({ type: 'verification', title: 'New provider signed up', body: `${user.name} joined as a provider.`, link: '/admin/verifications' });
  }
  res.status(201).json({ user: selfUser(user), ...(devLink ? { devLink } : {}) });
});

const loginSchema = z.object({ email: emailSchema, password: z.string().min(1, 'Enter your password.').max(200) });

router.post('/login', authLimiter, validate(loginSchema), async (req, res) => {
  const user = await User.findOne({ email: req.body.email }).select('+passwordHash');
  // Same message for unknown email and wrong password, so accounts cannot be enumerated.
  if (!user || !(await user.comparePassword(req.body.password))) throw unauthorized('Incorrect email or password.');
  if (user.status === 'suspended') {
    throw forbidden(`This account is suspended${user.suspendedReason ? `: ${user.suspendedReason}` : '.'} Contact support if you think this is a mistake.`);
  }
  user.lastSeenAt = new Date();
  await user.save();
  setSessionCookie(res, user);
  res.json({ user: selfUser(user) });
});

router.post('/logout', (req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

router.get('/me', (req, res) => {
  res.json({ user: selfUser(req.user), config: { requireEmailVerification: env.REQUIRE_EMAIL_VERIFICATION } });
});

router.post('/verify-email', validate(z.object({ token: z.string().min(10).max(200) })), async (req, res) => {
  const user = await User.findOne({
    emailVerifyTokenHash: hashToken(req.body.token),
    emailVerifyExpires: { $gt: new Date() },
  });
  if (!user) throw badRequest('This verification link is invalid or has expired. Request a new one from your dashboard.');
  user.emailVerified = true;
  user.emailVerifyTokenHash = undefined;
  user.emailVerifyExpires = undefined;
  await user.save();
  res.json({ ok: true, user: selfUser(user) });
});

router.post('/resend-verification', authLimiter, requireAuth, async (req, res) => {
  if (req.user.emailVerified) return res.json({ ok: true, alreadyVerified: true });
  const devLink = await issueVerification(req.user, req);
  res.json({ ok: true, ...(devLink ? { devLink } : {}) });
});

router.post('/forgot-password', authLimiter, validate(z.object({ email: emailSchema })), async (req, res) => {
  const user = await User.findOne({ email: req.body.email, status: 'active' });
  let devLink;
  if (user) {
    const { raw, hash } = createOneTimeToken();
    user.passwordResetTokenHash = hash;
    user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();
    const link = `${appUrl(req)}/reset-password?token=${raw}`;
    await sendMail(resetEmail(user, link));
    if (env.EXPOSE_DEV_LINKS) devLink = link;
  }
  res.json({ ok: true, message: 'If an account exists for that email, a reset link is on its way.', ...(devLink ? { devLink } : {}) });
});

router.post(
  '/reset-password',
  authLimiter,
  validate(z.object({ token: z.string().min(10).max(200), password: passwordSchema })),
  async (req, res) => {
    const user = await User.findOne({
      passwordResetTokenHash: hashToken(req.body.token),
      passwordResetExpires: { $gt: new Date() },
    });
    if (!user) throw badRequest('This reset link is invalid or has expired. Please request a new one.');
    await user.setPassword(req.body.password);
    user.passwordResetTokenHash = undefined;
    user.passwordResetExpires = undefined;
    user.tokenVersion = (user.tokenVersion || 0) + 1; // signs out every other device
    user.emailVerified = true; // they proved access to the inbox
    await user.save();
    disconnectUser(user._id);
    if (user.status === 'active') setSessionCookie(res, user);
    res.json({ ok: true, user: user.status === 'active' ? selfUser(user) : null });
  }
);

router.patch(
  '/password',
  requireAuth,
  validate(z.object({ currentPassword: z.string().min(1).max(200), newPassword: passwordSchema })),
  async (req, res) => {
    const user = await User.findById(req.user._id).select('+passwordHash');
    if (!(await user.comparePassword(req.body.currentPassword))) throw badRequest('Your current password is incorrect.', { currentPassword: 'Incorrect password.' });
    await user.setPassword(req.body.newPassword);
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();
    disconnectUser(user._id);
    setSessionCookie(res, user);
    res.json({ ok: true });
  }
);

export default router;
