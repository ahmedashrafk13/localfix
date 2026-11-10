// Interactive API reference: the OpenAPI document plus a self-hosted Swagger UI.
// Everything is served from this origin (no CDN), so the strict Content-Security-Policy stays intact.
import { createRequire } from 'node:module';
import path from 'node:path';
import express, { Router } from 'express';
import { SERVER_ROOT } from '../config/env.js';
import { getOpenApi } from '../docs/openapi.js';

const require = createRequire(import.meta.url);
const swaggerDir = require('swagger-ui-dist').getAbsoluteFSPath();
const staticDir = path.join(SERVER_ROOT, 'src', 'docs', 'static');

const router = Router();

router.get('/openapi.json', (req, res) => {
  res.set('Cache-Control', 'public, max-age=300');
  res.json(getOpenApi());
});

const PAGE = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>LocalFix API reference</title>
    <meta name="description" content="Interactive reference for the LocalFix REST API (OpenAPI 3.1)." />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="stylesheet" href="/api/docs/assets/swagger-ui.css" />
    <link rel="stylesheet" href="/api/docs/static/docs.css" />
  </head>
  <body>
    <header class="lf-bar">
      <a href="/" class="lf-home">LocalFix</a>
      <span>API reference</span>
      <a href="/api/openapi.json" class="lf-spec">openapi.json</a>
    </header>
    <main id="swagger-ui"><noscript>The interactive reference needs JavaScript. The raw document is at /api/openapi.json.</noscript></main>
    <script src="/api/docs/assets/swagger-ui-bundle.js"></script>
    <script src="/api/docs/static/init.js"></script>
  </body>
</html>`;

router.get('/docs', (req, res) => {
  res.set('Cache-Control', 'no-cache');
  res.type('html').send(PAGE);
});
router.use('/docs/static', express.static(staticDir, { index: false, maxAge: '1h' }));
router.use('/docs/assets', express.static(swaggerDir, { index: false, maxAge: '7d' }));

export default router;
