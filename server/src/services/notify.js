import { AnalyticsEvent } from '../models/AnalyticsEvent.js';
import { Notification } from '../models/Notification.js';
import { User } from '../models/User.js';
import { emitToUser } from '../socket/index.js';
import { dayKey } from '../utils/http.js';
import { serializeNotification } from '../utils/serialize.js';

/**
 * Stores an in-app notification for each user and pushes it over the socket immediately.
 * Failures are logged, never thrown: a notification problem must not break the main action.
 */
export async function notify(userIds, { type = 'system', title, body = '', link = '' }) {
  const ids = [...new Set((Array.isArray(userIds) ? userIds : [userIds]).filter(Boolean).map(String))];
  if (!ids.length) return;
  try {
    const docs = await Notification.insertMany(ids.map((user) => ({ user, type, title, body: body.slice(0, 400), link })));
    for (const doc of docs) emitToUser(doc.user, 'notification:new', serializeNotification(doc));
  } catch (err) {
    console.error('[notify] failed:', err.message);
  }
}

export async function notifyAdmins(payload) {
  const admins = await User.find({ role: 'admin', status: 'active' }).select('_id').lean();
  await notify(admins.map((a) => a._id), payload);
}

export function track(type, { path = '', query = '', role = 'guest' } = {}) {
  AnalyticsEvent.create({ type, path: path.slice(0, 200), query: query.slice(0, 100), role, day: dayKey() }).catch(() => {});
}
