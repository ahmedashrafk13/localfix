import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { Notification } from '../models/index.js';
import { assertObjectId, pageResult, paginate } from '../utils/http.js';
import { serializeNotification } from '../utils/serialize.js';

const router = Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const pg = paginate(req.query, { defaultLimit: 20 });
  const filter = { user: req.user._id, ...(req.query.unread === 'true' ? { read: false } : {}) };
  const [docs, total, unreadCount] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip(pg.skip).limit(pg.limit).lean(),
    Notification.countDocuments(filter),
    Notification.countDocuments({ user: req.user._id, read: false }),
  ]);
  res.json({ ...pageResult(docs.map(serializeNotification), total, pg), unreadCount });
});

router.post('/read-all', async (req, res) => {
  await Notification.updateMany({ user: req.user._id, read: false }, { $set: { read: true } });
  res.json({ ok: true });
});

router.post('/:id/read', async (req, res) => {
  assertObjectId(req.params.id, 'Notification');
  await Notification.updateOne({ _id: req.params.id, user: req.user._id }, { $set: { read: true } });
  res.json({ ok: true });
});

export default router;
