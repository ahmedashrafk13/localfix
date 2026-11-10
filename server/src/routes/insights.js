import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { Category } from '../models/index.js';
import { priceInsight } from '../services/insights.js';
import { isObjectId, notFound } from '../utils/http.js';
import { serializeCategory } from '../utils/serialize.js';

const router = Router();

/** Typical prices for a category, computed from real offers on LocalFix. */
router.get('/price', validate(z.object({ category: z.string().trim().min(1, 'Choose a category.').max(60) }), 'query'), async (req, res) => {
  const value = req.q.category.toLowerCase();
  const category = await Category.findOne(isObjectId(value) ? { _id: value } : { slug: value }).lean();
  if (!category) throw notFound('Category not found.');
  const insight = await priceInsight(category._id);
  res.set('Cache-Control', 'public, max-age=300');
  res.json({ category: serializeCategory(category), insight, currency: 'PKR' });
});

export default router;
