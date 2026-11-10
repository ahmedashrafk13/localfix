import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const here = path.dirname(fileURLToPath(import.meta.url));
export const SERVER_ROOT = path.resolve(here, '..', '..');
export const PROJECT_ROOT = path.resolve(SERVER_ROOT, '..');

dotenv.config({ path: path.join(SERVER_ROOT, '.env'), quiet: true });

const NODE_ENV = process.env.NODE_ENV || 'development';
const isProd = NODE_ENV === 'production';
const isTest = NODE_ENV === 'test';

const DEV_JWT_SECRET = 'localfix-dev-secret-change-me-in-production';
const JWT_SECRET = process.env.JWT_SECRET || DEV_JWT_SECRET;
if (isProd && JWT_SECRET === DEV_JWT_SECRET) {
  throw new Error('JWT_SECRET must be set to a long random value in production.');
}

const hasSmtp = Boolean(process.env.SMTP_HOST);

function flag(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  return raw === 'true' || raw === '1';
}

const PORT = Number(process.env.PORT) || 5000;

export const env = {
  NODE_ENV,
  isProd,
  isTest,
  PORT,
  MONGO_URI: process.env.MONGO_URI || '',
  DB_NAME: process.env.DB_NAME || 'localfix',
  LOCAL_DB_PORT: Number(process.env.LOCAL_DB_PORT) || 27031,
  LOCAL_DB_PATH: path.resolve(SERVER_ROOT, process.env.LOCAL_DB_PATH || '.data/db'),
  JWT_SECRET,
  SESSION_HOURS: Number(process.env.SESSION_HOURS) || 12,
  APP_URL_SET: Boolean(process.env.APP_URL),
  APP_URL: (process.env.APP_URL || (isProd ? `http://localhost:${PORT}` : 'http://localhost:5173')).replace(/\/$/, ''),
  UPLOAD_DIR: path.resolve(SERVER_ROOT, process.env.UPLOAD_DIR || 'uploads'),
  PRIVATE_UPLOAD_DIR: path.resolve(SERVER_ROOT, process.env.PRIVATE_UPLOAD_DIR || 'uploads-private'),
  CLIENT_DIST: path.resolve(PROJECT_ROOT, 'client', 'dist'),
  SEED_ASSETS: path.resolve(SERVER_ROOT, 'seed-assets'),
  SEED_PRIVATE: path.resolve(SERVER_ROOT, 'seed-private'),
  AUTO_SEED: flag('AUTO_SEED', true),
  hasSmtp,
  SMTP_HOST: process.env.SMTP_HOST || '',
  SMTP_PORT: Number(process.env.SMTP_PORT) || 587,
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
  MAIL_FROM: process.env.MAIL_FROM || 'LocalFix <no-reply@localfix.test>',
  // Email verification is enforced when mail can actually be delivered, or always in development
  // (where the verification link is shown on screen instead of emailed).
  REQUIRE_EMAIL_VERIFICATION: flag('REQUIRE_EMAIL_VERIFICATION', hasSmtp || !isProd),
  // Dev-only convenience: return verification/reset links in API responses. Never enabled in production.
  EXPOSE_DEV_LINKS: !isProd,

  // --- Third-party APIs (all keyless and optional; see src/integrations) ---
  // Master switch for outbound calls. Off in tests so the suite never depends on the internet.
  EXTERNAL_APIS: flag('EXTERNAL_APIS', !isTest),
  PHOTON_URL: process.env.PHOTON_URL || 'https://photon.komoot.io',
  NOMINATIM_URL: process.env.NOMINATIM_URL || 'https://nominatim.openstreetmap.org',
  OSRM_URL: process.env.OSRM_URL || 'https://router.project-osrm.org',
  OPEN_METEO_URL: process.env.OPEN_METEO_URL || 'https://api.open-meteo.com',
  // Identifies this app to OpenStreetMap services, as their usage policy requires.
  OUTBOUND_USER_AGENT: process.env.OUTBOUND_USER_AGENT || 'LocalFix/2.0 (CS 313 Web Engineering student project)',

  // --- AI request assistant (optional). Without a key the built-in rule engine answers instead. ---
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || '',
  AI_MODEL: process.env.AI_MODEL || 'claude-opus-5-5',

  // --- Web Push (optional). Without keys a VAPID key pair is generated once and stored in the database. ---
  VAPID_PUBLIC_KEY: process.env.VAPID_PUBLIC_KEY || '',
  VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY || '',
  VAPID_SUBJECT: process.env.VAPID_SUBJECT || 'mailto:support@localfix.test',
};
