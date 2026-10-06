import { Router } from 'express';
import admin from './admin.js';
import auth from './auth.js';
import categories from './categories.js';
import conversations from './conversations.js';
import dashboard from './dashboard.js';
import notifications from './notifications.js';
import offers from './offers.js';
import providers, { reviewReplyRouter } from './providers.js';
import publicRoutes from './public.js';
import reports from './reports.js';
import requests from './requests.js';
import users from './users.js';

const api = Router();

api.use('/auth', auth);
api.use('/users', users);
api.use('/categories', categories);
api.use('/requests', requests);
api.use('/offers', offers);
api.use('/providers', providers);
api.use('/reviews', reviewReplyRouter);
api.use('/conversations', conversations);
api.use('/notifications', notifications);
api.use('/reports', reports);
api.use('/dashboard', dashboard);
api.use('/admin', admin);
api.use('/', publicRoutes);

export default api;
