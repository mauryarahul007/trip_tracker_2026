// The service worker (public/sw.js) runs in a separate execution context
// with no access to the Zustand store, so the 'enableOfflineMapTiles' flag
// can't be read there directly. Cache Storage is shared between the page and
// the SW on the same origin, so it doubles as the flag transport here --
// same primitive the SW already uses for everything else, no postMessage
// plumbing or new API surface needed.
const CONFIG_CACHE_NAME = 'trip-tracker-sw-config';
const FLAG_KEY = 'flag:enableOfflineMapTiles';

export async function syncOfflineMapTilesFlag(enabled: boolean): Promise<void> {
  if (typeof caches === 'undefined') return;
  try {
    const cache = await caches.open(CONFIG_CACHE_NAME);
    await cache.put(FLAG_KEY, new Response(JSON.stringify(enabled)));
  } catch {
    // Cache Storage unavailable (e.g. private browsing) -- the SW's own
    // read falls back to disabled, so this is safe to ignore.
  }
}
