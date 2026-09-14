const CACHE_NAME = 'trip-tracker-cache-v1';
// Relative to this script's own location (self.location), so precaching works
// whether the app is served from / (local dev) or a subpath (GitHub Pages).
const PRECACHE_URLS = [
  './',
  './index.html',
  './favicon.svg',
  './manifest.json'
];

// Separate cache bucket for map tiles/style/sprite/glyphs (TripJourneyMap,
// TripMapHero, TripRouteModal all load from this one host) so a trip's map
// keeps rendering offline once it's been viewed once. Kept apart from
// CACHE_NAME so it isn't wiped by the app-shell cache-name bump on deploy,
// and evicted on its own age-based limit instead of growing forever.
const TILE_CACHE_NAME = 'trip-tracker-tiles-v1';
const TILE_CACHE_HOST = 'tiles.openfreemap.org';
const TILE_CACHE_MAX_ENTRIES = 2000;

// Superadmin-gated: 'enableOfflineMapTiles' lives in the Zustand store,
// which this SW can't reach directly, so the page writes the flag into
// Cache Storage (see src/utils/mapTileCacheFlag.ts) and this reads it back.
// Defaults to OFF (plain network passthrough, no interception at all) when
// the flag has never been synced -- e.g. the very first load, or the flag
// off in the Ops Deck.
const CONFIG_CACHE_NAME = 'trip-tracker-sw-config';
const TILE_FLAG_KEY = 'flag:enableOfflineMapTiles';

async function isOfflineMapTilesEnabled() {
  try {
    const cache = await caches.open(CONFIG_CACHE_NAME);
    const res = await cache.match(TILE_FLAG_KEY);
    if (!res) return false;
    return (await res.json()) === true;
  } catch {
    return false;
  }
}

// Perform install and cache shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// Perform activation and delete old cache assets
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== TILE_CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Evicts oldest entries once the tile cache passes TILE_CACHE_MAX_ENTRIES --
// Cache Storage has no built-in quota/eviction policy of its own, and tiles
// are small but numerous (every pan/zoom is more requests), so an unbounded
// cache would otherwise grow forever.
async function trimTileCache(cache) {
  const keys = await cache.keys();
  if (keys.length <= TILE_CACHE_MAX_ENTRIES) return;
  const toDelete = keys.slice(0, keys.length - TILE_CACHE_MAX_ENTRIES);
  await Promise.all(toDelete.map((key) => cache.delete(key)));
}

// Stale-While-Revalidate fetch handler
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const requestUrl = new URL(event.request.url);

  // Map tiles/style/sprite/glyphs: cross-origin, cached separately so the
  // last-viewed trip map still renders with no signal.
  if (requestUrl.hostname === TILE_CACHE_HOST) {
    event.respondWith(
      isOfflineMapTilesEnabled().then((enabled) => {
        if (!enabled) return fetch(event.request);
        return caches.open(TILE_CACHE_NAME).then((cache) =>
          cache.match(event.request).then((cachedResponse) => {
            const fetchPromise = fetch(event.request)
              .then((networkResponse) => {
                if (networkResponse.status === 200) {
                  cache.put(event.request, networkResponse.clone());
                  void trimTileCache(cache);
                }
                return networkResponse;
              })
              .catch(() => cachedResponse);
            return cachedResponse || fetchPromise;
          })
        );
      })
    );
    return;
  }

  // Ignore other cross-origin requests (analytics, Supabase, etc.)
  if (!event.request.url.startsWith(self.location.origin)) {
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
