import fs from 'node:fs';
import path from 'node:path';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';
import { loadUser } from './middleware/auth.js';
import { apiNotFound, errorHandler } from './middleware/error.js';
import { apiLimiter, requireAjaxHeader, sanitizeInput } from './middleware/security.js';
import api from './routes/index.js';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1); // correct client IPs and secure cookies behind Render/Railway/Nginx

  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          // Leaflet and Motion set inline style attributes.
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'blob:', 'https://tile.openstreetmap.org', 'https://*.tile.openstreetmap.org'],
          fontSrc: ["'self'", 'data:'],
          connectSrc: ["'self'", 'ws:', 'wss:'],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
          upgradeInsecureRequests: env.isProd ? [] : null,
        },
      },
      crossOriginEmbedderPolicy: false,
      strictTransportSecurity: env.isProd,
    })
  );
  app.use(compression());
  if (!env.isProd && !env.isTest) app.use(morgan('dev'));

  app.use(express.json({ limit: '200kb' }));
  app.use(express.urlencoded({ extended: false, limit: '200kb' }));
  app.use(cookieParser());
  app.use(sanitizeInput);

  // Public uploads (re-encoded WebP images). Verification documents live elsewhere and are never served here.
  fs.mkdirSync(env.UPLOAD_DIR, { recursive: true });
  // Sample-data photos ship with the repository, so they survive redeploys on hosts with ephemeral disks.
  app.use('/uploads/seed', express.static(env.SEED_ASSETS, { maxAge: '30d', fallthrough: false }));
  app.use(
    '/uploads',
    express.static(env.UPLOAD_DIR, {
      maxAge: '30d',
      immutable: true,
      fallthrough: false,
      setHeaders: (res) => res.setHeader('X-Content-Type-Options', 'nosniff'),
    })
  );

  app.use('/api', apiLimiter, requireAjaxHeader, loadUser, api);
  app.use('/api', apiNotFound);

  // Production: serve the built React app and let the client-side router handle deep links.
  if (fs.existsSync(path.join(env.CLIENT_DIST, 'index.html'))) {
    app.use(
      express.static(env.CLIENT_DIST, {
        index: false,
        setHeaders: (res, filePath) => {
          if (filePath.includes(`${path.sep}assets${path.sep}`)) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        },
      })
    );
    app.get(/^\/(?!api\/|uploads\/|socket\.io\/).*/, (req, res) => {
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(path.join(env.CLIENT_DIST, 'index.html'));
    });
  } else {
    app.get('/', (req, res) => {
      res.type('text').send('LocalFix API is running. Start the React client with "npm run dev" from the project root, or build it with "npm run build".');
    });
  }

  app.use(errorHandler);
  return app;
}
