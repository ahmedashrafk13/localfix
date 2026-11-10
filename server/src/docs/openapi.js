// The complete OpenAPI 3.1 description of the LocalFix REST API.
// tests/openapi.test.js compares it with the real Express routers, so a route cannot be added,
// renamed or removed without this document changing too.
import fs from 'node:fs';
import path from 'node:path';
import { SERVER_ROOT } from '../config/env.js';
import * as base from './openapi.base.js';
import * as platform from './openapi.platform.js';

const pkg = JSON.parse(fs.readFileSync(path.join(SERVER_ROOT, 'package.json'), 'utf8'));
export const API_VERSION = pkg.version;

const description = `REST API of **LocalFix**, a local services marketplace where providers compete for a customer's repair job.

**Conventions**

- Base URL \`/api/v1\` (also served unversioned at \`/api\`). JSON in and out; uploads are \`multipart/form-data\` with the JSON fields in a \`data\` part.
- **Authentication:** \`POST /auth/login\` sets an httpOnly session cookie. API clients may instead send the same token as \`Authorization: Bearer <token>\`.
- **CSRF:** every state-changing request (POST, PATCH, PUT, DELETE) must carry an \`X-Requested-With\` header, or it is rejected with 403. "Try it out" on this page adds it for you.
- **Errors** always look like \`{ "error": { "message": "...", "fields": { "name": "..." } } }\`; \`fields\` is present for validation errors.
- **Pagination:** list endpoints take \`page\` and \`limit\` and return \`{ items, total, page, pages, limit }\`.
- **Rate limits:** 400 requests per minute per client overall, 40 per minute for writes, 20 per 15 minutes for sign-in endpoints. Limits are reported in \`RateLimit\` headers.
- **Tracing:** every response has an \`X-Request-Id\` header; quote it when reporting a problem.
- **Roles:** \`x-roles\` on an operation lists the account types allowed to call it.

**Real-time:** Socket.IO on the same origin pushes \`notification:new\`, \`message:new\`, \`message:removed\`, \`typing\`, \`conversation:read\`, \`offer:new\`, \`request:new\`, \`request:updated\` and \`account:updated\`.`;

export function buildOpenApi() {
  const paths = { ...base.paths };
  for (const [route, operations] of Object.entries(platform.paths)) paths[route] = { ...(paths[route] || {}), ...operations };
  paths['/health'] = { get: platform.healthOperation };

  return {
    openapi: '3.1.0',
    info: {
      title: 'LocalFix API',
      version: API_VERSION,
      description,
      contact: { name: 'LocalFix team (CS 313 Web Engineering)', email: 'support@localfix.test' },
      license: { name: 'ISC', identifier: 'ISC' },
    },
    servers: [{ url: '/api/v1', description: 'This server (versioned)' }, { url: '/api', description: 'This server (unversioned alias)' }],
    tags: [...base.tags, ...platform.tags.filter((t) => !base.tags.some((b) => b.name === t.name))],
    paths: Object.fromEntries(Object.entries(paths).sort(([a], [b]) => a.localeCompare(b))),
    components: {
      securitySchemes: {
        cookieAuth: { type: 'apiKey', in: 'cookie', name: 'lf_session', description: 'Session cookie set by POST /auth/login.' },
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', description: 'The session token, for clients that cannot use cookies.' },
      },
      schemas: { ...base.schemas, ...platform.schemas },
      responses: { ...base.responses, ...platform.responses },
    },
  };
}

let cached = null;
export function getOpenApi() {
  cached ||= buildOpenApi();
  return cached;
}
