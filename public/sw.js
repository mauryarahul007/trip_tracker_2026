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
