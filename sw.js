// Caches the app so it opens offline after the first visit.
// Online: loads the newest version. Offline or slow connection: opens instantly from the saved copy.
const CACHE = 'pnl-calendar-v3';
const FILES = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(e.request, { ignoreSearch: true });
    const network = fetch(e.request).then(res => {
      if (res && res.ok) cache.put(e.request, res.clone());
      return res;
    });
    if (!cached) return network;
    // Wait up to 2.5s for the network, then fall back to the saved copy.
    return Promise.race([
      network.catch(() => cached),
      new Promise(resolve => setTimeout(() => resolve(cached), 2500))
    ]);
  })());
});
