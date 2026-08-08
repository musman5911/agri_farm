const CACHE_NAME = 'agrifarm-v3';
const ASSETS = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/icons.svg',
  '/logo.png',
  '/manifest.webmanifest'
];

self.addEventListener('activate', (e) => { e.waitUntil(clients.claim()); });

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || e.request.url.includes('/api/') || e.request.url.includes('/health') || e.request.url.includes('/check-setup')) return;

  // Navigation requests must prefer the network so an old PWA shell cannot
  // resurrect a previous UI/header after an application update.
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(e.request, copy));
        return response;
      }).catch(() => caches.match(e.request).then((cached) => cached || caches.match('/')))
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      return cachedResponse || fetch(e.request).catch(() => caches.match('/'));
    })
  );
});
