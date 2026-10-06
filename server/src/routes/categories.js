import { Router } from 'express';
import { Category, ServiceRequest, User } from '../models/index.js';
import { serializeCategory } from '../utils/serialize.js';

const router = Router();

router.get('/', async (req, res) => {
  const categories = await Category.find({ active: true }).sort({ order: 1, name: 1 }).lean();
  const [openCounts, providerCounts] = await Promise.all([
    ServiceRequest.aggregate([{ $match: { status: 'open', removed: false } }, { $group: { _id: '$category', n: { $sum: 1 } } }]),
    User.aggregate([
      { $match: { role: 'provider', status: 'active', 'provider.verification.status': 'verified' } },
      { $unwind: '$provider.categories' },
      { $group: { _id: '$provider.categories', n: { $sum: 1 } } },
    ]),
  ]);
  const open = new Map(openCounts.map((c) => [c._id.toString(), c.n]));
  const providers = new Map(providerCounts.map((c) => [c._id.toString(), c.n]));
  res.json({
    items: categories.map((c) => ({
      ...serializeCategory(c),
      openRequests: open.get(c._id.toString()) || 0,
      providers: providers.get(c._id.toString()) || 0,
    })),
  });
});

export default router;
