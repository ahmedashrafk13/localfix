import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { env } from '../config/env.js';
import { validate } from '../middleware/validate.js';
import { Category } from '../models/index.js';
import { analyzeProblem } from '../services/assistant.js';
import { serializeCategory } from '../utils/serialize.js';

const router = Router();

// Each call may reach a paid AI API, so this is much tighter than the general API limit.
const assistantLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => env.isTest,
  message: { error: { message: 'You are using the assistant very quickly. Please wait a minute.' } },
});

const describeSchema = z.object({
  text: z.string().trim().min(10, 'Describe the problem in at least 10 characters.').max(1500, 'Keep the description under 1,500 characters.'),
});

/** Suggests a category, title, urgency and follow-up questions from a free-text problem description. */
router.post('/describe', assistantLimiter, validate(describeSchema), async (req, res) => {
  const categories = await Category.find({ active: true }).sort({ order: 1, name: 1 }).lean();
  const { categorySlug, source, ...suggestion } = await analyzeProblem(req.body.text, categories);
  const category = categories.find((c) => c.slug === categorySlug) || null;
  res.json({ suggestion: { ...suggestion, category: category ? serializeCategory(category) : null }, engine: source });
});

export default router;
