# Explanation: Offline Caching Design

Trip Tracker is built for the moment it's actually needed most: mid-trip, on spotty hotel wifi or with roaming data off, trying to log who paid for dinner. This page explains why the app is cached the way it is, and what that trades off.

---

## The problem

A trip expense app that requires a live network connection fails exactly when it matters. Two failure modes to avoid:

1. **Cold load failure** — opening the app with zero connectivity shows a blank error page instead of the app shell, because the browser can't fetch `index.html`.
2. **Stale-forever failure** — an aggressive cache-first strategy could serve a broken build forever if a bad deploy gets cached and never revalidates.

Trip Tracker's data layer (IndexedDB, see [Reference: Storage Layer](reference-storage.md)) already solves storage — expenses are written locally and never require network. The remaining gap is: how does the *app itself* (HTML/JS/CSS) load with no network?

---

## The approach: stale-while-revalidate

`public/sw.js` registers a service worker with one fetch strategy for every same-origin GET request:

```
Request arrives:
  1. Check cache — if present, return it IMMEDIATELY (no network wait)
  2. In parallel, fetch from network
  3. If the network response is 200 OK, overwrite the cache entry with it
  4. If there's no cache entry yet, the response only resolves once the network fetch completes
```

This means:
- **First-ever load** needs network (nothing cached yet)
- **Every load after that** is instant — served from cache before the network round-trip even starts
- **The next app update is silently prefetched** in the background of the *current* session, so the *next* reload picks up new code

Only four URLs are precached eagerly at install time (`PRECACHE_URLS` in `public/sw.js`): `/`, `/index.html`, `/favicon.svg`, `/manifest.json`. Everything else — the built JS/CSS bundle, in particular — is cached lazily on first fetch via the same stale-while-revalidate handler, not precached. Vite's hashed build filenames (`index-<hash>.js`) change on every build, so precaching them by name would require rewriting the service worker on every deploy; letting them populate the cache on first visit avoids that coupling entirely.

Non-GET requests (POST/PUT/DELETE) and cross-origin requests are explicitly ignored (`if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) return;`) — the service worker never intercepts them, and they always hit the network directly.

---

## Trade-offs

**What you gain:** every repeat visit is instant regardless of connectivity, and the app degrades gracefully offline instead of failing.

**What you give up:**
- **You can see a stale UI for one load.** If a deploy ships a bug fix, a user who already has the app cached sees the *old* version on their next open (served from cache), with the *new* version only fetched in the background for the load after that. There's no forced-refresh mechanism.
- **Cache versioning is coarse.** The single `CACHE_NAME` constant (`trip-tracker-cache-v1`) is the only invalidation lever — bumping it on `activate` deletes every old cache and starts fresh. There's no per-file cache-busting; a bad cached response for one file can't be individually evicted without bumping the whole cache generation.
- **No offline-first write conflicts to worry about** — because all writes go straight to IndexedDB (not through the service worker), there's no sync queue, no "pending upload" state, and no merge-conflict UI to build. This is a deliberate simplification: the app has no server, so there is nothing to reconcile with.

## Alternatives considered

**Cache-first** (never touch network if cached) would make offline loads marginally more reliable but risks the app never picking up new deploys until the user manually clears the cache. Rejected for a solo/small-group tool where "quietly running an old version forever" is a worse failure mode than "one stale load after a deploy."

**Network-first** (always try network, fall back to cache on failure) directly defeats the goal — the whole point is that offline loads feel instant, not that they wait for a network timeout first.

---

## Related

- [Reference: Storage Layer](reference-storage.md) — the IndexedDB persistence layer, and the PWA manifest/service-worker file references
- [How to Back Up and Restore Your Data](howto-backup-restore.md) — the manual backup path this design implies, since there's no cloud sync
