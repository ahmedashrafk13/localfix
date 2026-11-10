import { Router } from 'express';
import { requireRole } from '../middleware/auth.js';
import admin from './admin.js';
import assistant from './assistant.js';
import auth from './auth.js';
import categories from './categories.js';
import conversations from './conversations.js';
import dashboard from './dashboard.js';
import docs from './docs.js';
import geo from './geo.js';
import insights from './insights.js';
import integrations from './integrations.js';
import notifications from './notifications.js';
import offers from './offers.js';
import providers, { reviewReplyRouter } from './providers.js';
import publicRoutes from './public.js';
import push from './push.js';
import reports from './reports.js';
import requestExtras from './requestExtras.js';
import requests from './requests.js';
import users from './users.js';

/**
 * Every router and where it is mounted. Kept as data so tests/openapi.test.js can walk the real
 * routes and prove the OpenAPI document describes exactly this API.
 * Order matters: the first router that handles a request wins.
 */
export const MOUNTS = [
  { path: '/auth', router: auth },
  { path: '/users', router: users },
  { path: '/categories', router: categories },
  { path: '/requests', router: requests },
  { path: '/requests', router: requestExtras },
  { path: '/offers', router: offers },
  { path: '/providers', router: providers },
  { path: '/reviews', router: reviewReplyRouter },
  { path: '/conversations', router: conversations },
  { path: '/notifications', router: notifications },
  { path: '/reports', router: reports },
  { path: '/dashboard', router: dashboard },
  { path: '/admin/integrations', router: integrations, guards: [requireRole('admin')] },
  { path: '/admin', router: admin },
  { path: '/geo', router: geo },
  { path: '/assistant', router: assistant },
  { path: '/insights', router: insights },
  { path: '/push', router: push },
  { path: '/', router: docs },
  { path: '/', router: publicRoutes },
];

const api = Router();
for (const { path, router, guards = [] } of MOUNTS) api.use(path, ...guards, router);

export default api;
