// Web Push (RFC 8030 + VAPID, RFC 8292): notifications that reach a user's device even when
// LocalFix is not open in any tab. The browser's push service (FCM, Mozilla autopush, APNs)
// delivers them to the service worker in client/public/sw.js.
//
// No account or third-party key is needed: the VAPID key pair identifies this server. It comes from
// the environment, or is generated once and stored in the database so it survives restarts.
import * as webpush from 'web-push';
import { env } from '../config/env.js';
import { PushSubscription } from '../models/PushSubscription.js';
import { Setting } from '../models/Setting.js';
import { isOnline } from '../socket/index.js';

const VAPID_KEY = 'webpush.vapid';
let vapid = null;
let senderOverride = null;

/** Tests replace the network sender with a recorder: (subscription, payload) => Promise. */
export function setPushSender(fn) {
  senderOverride = fn;
}

export async function getVapidKeys() {
  if (vapid) return vapid;
  if (env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY) {
    vapid = { publicKey: env.VAPID_PUBLIC_KEY, privateKey: env.VAPID_PRIVATE_KEY };
    return vapid;
  }
  const generated = webpush.generateVAPIDKeys();
  // $setOnInsert makes this safe when two server instances start at the same moment: one pair wins.
  const doc = await Setting.findOneAndUpdate({ key: VAPID_KEY }, { $setOnInsert: { value: generated } }, { upsert: true, new: true }).lean();
  vapid = { publicKey: doc.value.publicKey, privateKey: doc.value.privateKey };
  return vapid;
}

async function deliver(sub, payload) {
  if (senderOverride) return senderOverride(sub, payload);
  if (env.isTest) return undefined; // never contact a push service from the test suite
  const keys = await getVapidKeys();
  return webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, JSON.stringify(payload), {
    vapidDetails: { subject: env.VAPID_SUBJECT, ...keys },
    TTL: 60 * 60 * 12, // a notification older than 12 hours is no longer useful
    urgency: 'normal',
  });
}

/**
 * Sends a push notification to every registered browser of the given users.
 * Subscriptions the push service reports as gone (404/410) are deleted.
 * Never throws: push is best-effort and must not break the action that triggered it.
 * @returns {Promise<{sent:number, removed:number, failed:number}>}
 */
export async function sendPush(userIds, { title, body = '', link = '/', tag = 'localfix' }, { skipOnline = false } = {}) {
  const result = { sent: 0, removed: 0, failed: 0 };
  try {
    let ids = [...new Set([].concat(userIds).filter(Boolean).map(String))];
    // Someone with LocalFix open already gets the live toast over the socket.
    if (skipOnline) ids = ids.filter((id) => !isOnline(id));
    if (!ids.length) return result;
    const subs = await PushSubscription.find({ user: { $in: ids } }).lean();
    const payload = { title: String(title).slice(0, 120), body: String(body).slice(0, 240), link: link || '/', tag };
    await Promise.all(
      subs.map(async (sub) => {
        try {
          await deliver(sub, payload);
          result.sent += 1;
          PushSubscription.updateOne({ _id: sub._id }, { $set: { lastSuccessAt: new Date() } }).catch(() => {});
        } catch (err) {
          if (err?.statusCode === 404 || err?.statusCode === 410) {
            await PushSubscription.deleteOne({ _id: sub._id }).catch(() => {});
            result.removed += 1;
          } else {
            result.failed += 1;
            if (!env.isTest) console.error('[push] delivery failed:', err?.statusCode || '', err?.message);
          }
        }
      })
    );
  } catch (err) {
    if (!env.isTest) console.error('[push] failed:', err.message);
  }
  return result;
}
