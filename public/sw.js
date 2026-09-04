const CACHE_NAME = 'trip-tracker-cache-v1';
// Relative to this script's own location (self.location), so precaching works
// whether the app is served from / (local dev) or a subpath (GitHub Pages).
const PRECACHE_URLS = [
  './',
  './index.html',
  './favicon.svg',
  './manifest.json'
];

// Perform install and cache shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(self.skipWaiting())
  );
});

// Perform activation and delete old cache assets
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Stale-While-Revalidate fetch handler
self.addEventListener('fetch', (event) => {
  // Ignore non-GET requests (e.g. POST, PUT, DELETE) and browser extensions
  if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // The app shell (index.html) carries the CSP header and references the
  // current content-hashed JS/CSS bundle -- SWR's "serve cached instantly,
  // revalidate in background" means a stale shell can stick around
  // indefinitely with no visible prompt to reload (CACHE_NAME doesn't
  // change per deploy, so there's nothing to trigger the update-available
  // banner). Navigation requests go network-first instead; hashed static
  // assets stay on the fast SWR path below since a stale one can't be
  // referenced by a fresh shell anyway.
  const isNavigation = event.request.mode === 'navigate' ||
    (event.request.headers.get('accept') || '').includes('text/html');

  if (isNavigation) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse.clone()));
          }
          return networkResponse;
        })
        .catch(() => caches.open(CACHE_NAME).then((cache) => cache.match(event.request)))
    );
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          // If valid response, clone it and put in cache
          if (networkResponse.status === 200) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        }).catch((err) => {
          // Fallback if network fails and cache is empty
          console.log('Fetch failed, returning cached response if any', err);
        });

        // Return cached response instantly if present, otherwise wait for network
        return cachedResponse || fetchPromise;
      });
    })
  );
});
