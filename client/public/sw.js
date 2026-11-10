/* LocalFix service worker: offline app shell, asset caching and Web Push.
 *
 * Caching strategy per kind of request:
 *   page navigations      network first, cached app shell when offline (the React router then renders)
 *   /assets/* (hashed)    cache first: a file name never changes content
 *   images and fonts      stale-while-revalidate
 *   GET /api/categories,  stale-while-revalidate, so the public pages still render offline
 *       /api/meta, /api/tips, /api/stats/public
 *   everything else       network only. Private API data is never cached, and writes are never replayed.
 */
const VERSION = 'v1';
const SHELL = `lf-shell-${VERSION}`;
const ASSETS = `lf-assets-${VERSION}`;
const MEDIA = `lf-media-${VERSION}`;
const DATA = `lf-data-${VERSION}`;
const KEEP = [SHELL, ASSETS, MEDIA, DATA];
const MEDIA_LIMIT = 120;

const PUBLIC_API = ['/api/categories', '/api/meta', '/api/tips', '/api/stats/public'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL)
      .then((cache) => cache.addAll(['/', '/favicon.svg', '/manifest.webmanifest']))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith('lf-') && !KEEP.includes(key)).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

async function trim(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  await Promise.all(keys.slice(0, Math.max(0, keys.length - max)).map((key) => cache.delete(key)));
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res.ok) cache.put(request, res.clone());
  return res;
}

async function staleWhileRevalidate(request, cacheName, event, limit) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  const refresh = fetch(request)
    .then((res) => {
      if (res.ok) {
        cache.put(request, res.clone());
        if (limit) trim(cacheName, limit);
      }
      return res;
    })
    .catch(() => null);
  if (hit) {
    event.waitUntil(refresh);
    return hit;
  }
  return (await refresh) || Response.error();
}

async function navigation(request) {
  const cache = await caches.open(SHELL);
  try {
    const res = await fetch(request);
    // Every route serves the same app shell, so the freshest copy is stored under "/".
    if (res.ok && (res.headers.get('content-type') || '').includes('text/html')) cache.put('/', res.clone());
    return res;
  } catch {
    const shell = await cache.match('/');
    if (shell) return shell;
    return new Response('<h1>LocalFix is offline</h1><p>Check your connection and try again.</p>', { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/socket.io/')) return;

  if (url.pathname.startsWith('/api/')) {
    // /api/docs is a normal page with its own assets; let the browser handle it.
    if (PUBLIC_API.includes(url.pathname)) event.respondWith(staleWhileRevalidate(request, DATA, event));
    return;
  }
  if (request.mode === 'navigate') {
    event.respondWith(navigation(request));
    return;
  }
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(cacheFirst(request, ASSETS));
    return;
  }
  if (request.destination === 'image' || request.destination === 'font' || url.pathname.startsWith('/uploads/')) {
    event.respondWith(staleWhileRevalidate(request, MEDIA, event, MEDIA_LIMIT));
  }
});

/* ---------- Web Push ---------- */

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'LocalFix', body: event.data ? event.data.text() : '' };
  }
  const title = data.title || 'LocalFix';
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-96.png',
      tag: data.tag || 'localfix',
      renotify: true,
      data: { link: data.link || '/notifications' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const link = new URL(event.notification.data?.link || '/', self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      // Reuse an open LocalFix tab if there is one, otherwise open a new window.
      const open = windows.find((w) => new URL(w.url).origin === self.location.origin);
      if (open) return open.focus().then((w) => (w && 'navigate' in w ? w.navigate(link) : null));
      return self.clients.openWindow(link);
    })
  );
});
