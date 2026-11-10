// Web Push in the browser: Service Worker API + Push API + Notifications API.
// The subscription created here is stored by the server, which can then reach this device
// even when no LocalFix tab is open.
import { api } from './api.js';

export function pushSupported() {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

/** VAPID keys travel as URL-safe base64; PushManager wants the raw bytes. */
export function urlBase64ToUint8Array(value) {
  const padded = (value + '='.repeat((4 - (value.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(padded);
  return Uint8Array.from(raw, (ch) => ch.charCodeAt(0));
}

/** Registers the service worker (offline shell + push). Safe to call more than once. */
export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return Promise.resolve(null);
  return navigator.serviceWorker.register('/sw.js').catch(() => null);
}

async function registration() {
  const existing = await navigator.serviceWorker.getRegistration();
  if (existing) return navigator.serviceWorker.ready;
  // In development the worker is not registered at start-up; do it on demand.
  await registerServiceWorker();
  return navigator.serviceWorker.ready;
}

/** 'unsupported' | 'denied' | 'on' | 'off' */
export async function pushState() {
  if (!pushSupported()) return 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = reg ? await reg.pushManager.getSubscription() : null;
  return sub && Notification.permission === 'granted' ? 'on' : 'off';
}

export async function enablePush() {
  if (!pushSupported()) throw new Error('This browser does not support push notifications.');
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Notifications are blocked. Allow them for this site in your browser settings.');
  const reg = await registration();
  const { publicKey } = await api.get('/push/public-key');
  let sub = await reg.pushManager.getSubscription();
  // A subscription made with an older server key cannot be used any more: replace it.
  const current = sub?.options?.applicationServerKey ? btoa(String.fromCharCode(...new Uint8Array(sub.options.applicationServerKey))) : null;
  const wanted = btoa(String.fromCharCode(...urlBase64ToUint8Array(publicKey)));
  if (sub && current && current !== wanted) {
    await sub.unsubscribe();
    sub = null;
  }
  sub ||= await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) });
  await api.post('/push/subscriptions', sub.toJSON());
  return sub;
}

/** Turns push off on this device. Called from Settings and before logging out. Never throws. */
export async function disablePush() {
  try {
    if (!pushSupported()) return;
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = reg ? await reg.pushManager.getSubscription() : null;
    if (!sub) return;
    await api.del('/push/subscriptions', { endpoint: sub.endpoint }).catch(() => {});
    await sub.unsubscribe();
  } catch {
    /* best effort */
  }
}
