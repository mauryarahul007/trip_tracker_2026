# Reference: Storage Layer

Trip Tracker 2026 stores all data locally on the device. There is no server, no account, and no cloud sync. This page documents how persistence and offline support work.

---

## Storage backend: IndexedDB via localforage

**File:** `src/services/storage.ts`

The app uses [localforage](https://localforage.github.io/localForage/) to write to IndexedDB under:

```
Database name: TripTracker2026
Store name:    trip_tracker_store
Key:           trip_tracker_state
Value:         full TripState JSON object
```

localforage is preferred over `localStorage` because:
- IndexedDB quota is 10–50% of disk space (vs. ~5MB for localStorage)
- Async API — saves don't block the main thread
- Automatic fallback to WebSQL/localStorage on older browsers

---

## storage API

```typescript
export const storage = {
  saveState(state: TripState): Promise<void>;
  loadState(): Promise<TripState | null>;
  clearAll(): Promise<void>;
}

export class StorageError extends Error {
  code: 'QUOTA_EXCEEDED' | 'BLOCKED' | 'UNKNOWN';
}
```

### saveState

Calls `localforage.setItem(key, state)`. On failure, maps the IndexedDB exception to a typed `StorageError`:

| Exception | StorageError code | User-facing message |
|-----------|-------------------|---------------------|
| `QuotaExceededError` | `QUOTA_EXCEEDED` | "Device storage is full. Please clear space to save trip changes." |
| `SecurityError` | `BLOCKED` | "Storage is blocked by browser private mode. Allow storage access." |
| Any other | `UNKNOWN` | The original error message |

The Zustand store catches `StorageError` and sets `storageError` in state, which renders a visible error banner in the UI.

### loadState

Calls `localforage.getItem(key)`. Returns `null` on any failure (safe — the app treats null as empty state and initializes with defaults).

### clearAll

Calls `localforage.clear()`. Used for wiping all IndexedDB data for the app during a Factory Reset. It is wired to the "Clear All Data" button in the Settings tab, prompting the user with a double-confirmation modal first.


---

## How the Zustand store uses storage

`src/store/tripStore.ts` contains a private `persist()` helper:

```typescript
const persist = async (updatedState: Partial<TripState>) => {
  const stateToSave: TripState = { /* merge updatedState over current state, field by field */ };
  set({ ...stateToSave, storageError: null }); // update in-memory state immediately
  try {
    await storage.saveState(stateToSave);      // then write to disk
  } catch (error) {
    // maps StorageError to state.storageError, or a generic fallback message
  }
}
```

State is updated optimistically in memory before the async disk write completes. This keeps the UI responsive. If the disk write fails, `storageError` is set and the user sees an error.

---

## Offline support: PWA service worker

**File:** `public/sw.js`

The service worker uses a **stale-while-revalidate** strategy:

```
Request arrives:
  1. Respond immediately from cache (if available) → no network wait
  2. Simultaneously fetch from network in background
  3. Update cache with new response
  4. If no cache entry: fetch from network, cache the response
```

**Cache name:** `trip-tracker-cache-v1`

**Cached resources (on install):**
```
/
/index.html
/favicon.svg
/manifest.json
```

The built JS/CSS bundle (Vite's hashed `assets/index-*.js`/`.css`) is **not** precached at install — it's picked up lazily by the same stale-while-revalidate handler on first fetch. See [Explanation: Offline Caching Design](explanation-offline-caching.md) for why.

The service worker is registered in `index.html`:

```html
<script>
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js');
    });
  }
</script>
```

---

## PWA manifest

**File:** `public/manifest.json`

```json
{
  "name": "Trip Tracker 2026",
  "short_name": "TripTracker",
  "description": "Offline-first cost splitting, member grouping, and expense settlements dashboard.",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#4f46e5",
  "orientation": "portrait-primary",
  "icons": [
    { "src": "/favicon.svg", "sizes": "any", "type": "image/svg+xml", "purpose": "any maskable" }
  ]
}
```

`"display": "standalone"` makes the app launch without browser chrome when installed via "Add to Home Screen".

---

## Backup and restore

The Settings tab exposes two actions:

**Export (Backup):** calls `store.exportDatabase()`, which returns the full `TripState` as a formatted JSON string and triggers a browser download.

**Import (Restore):** reads a JSON file, calls `store.importDatabase(jsonString)`. The importer validates the schema:

```typescript
// Must have all five top-level keys
Array.isArray(parsed.trips) &&
parsed.members &&
parsed.groups &&
Array.isArray(parsed.expenses) &&
Array.isArray(parsed.categories)
```

A valid import replaces all current state. An invalid file is rejected without overwriting data.

---

## Data lifetime

| Scenario | Effect on data |
|----------|----------------|
| Close the browser tab | Data persists (IndexedDB) |
| Clear browser history | May clear IndexedDB — use Export Backup first |
| Private/Incognito mode | IndexedDB writes are blocked in some browsers — app shows a BLOCKED error |
| Uninstall PWA | IndexedDB data is deleted |
| Transfer to new device | Use Export Backup → copy the JSON → Import on new device |

---

## Related

- [Reference: Data Model](reference-data-model.md) — TripState structure that is persisted
- [How to Export to Excel](howto-export-csv.md) — data export for spreadsheets
