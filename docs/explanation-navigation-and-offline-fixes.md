# Explanation: Navigation, Offline-First, and App Version (2026-08-17 session)

This documents everything shipped in one working session: browser/native
back-navigation fixes, the offline-first push (WhatsApp-style — full app
usable with zero connectivity), and an app-version display in Settings.
Written as a reference for anyone (human or AI) picking this codebase back
up later — what broke, why, what changed, and how to verify it still works.

**Doc-debt flag:** `docs/reference-storage.md` and
`docs/explanation-offline-caching.md` describe an earlier architecture
(localforage/IndexedDB, "no server, no cloud sync") that no longer matches
this codebase. The actual data layer is zustand's `persist` middleware over
`localStorage` (see below), backed by Supabase (accounts, sync, multi-device
trip sharing). Those two docs need a rewrite or archival — out of scope for
this session, flagging so it doesn't get missed.

---

## Part 1 — Navigation: back gesture / hardware back / browser Back

### Symptom

Swipe-back gesture, Android hardware/gesture back button, and the browser
Back button did nothing — screens and modals (trip dashboard, Add Expense,
Share, Settings, etc.) could only be closed via their own close/Cancel
button, never via a genuine "go back" action.

### Root cause

The whole app's screen/modal navigation (trip list ↔ dashboard, forms,
modals) is plain React `useState`, not URL routes — only `/login`,
`/join/:code`, and `/*` are real `react-router` routes. No screen or modal
ever pushed a `window.history` entry, so there was nothing for a back
action to pop.

### The fix — `src/utils/useHistoryBack.ts`

A hook that pushes one history entry per open screen/modal and closes
whichever one is topmost on a back action:

- **Shared stack, single `popstate` listener.** Early version attached one
  listener per hook instance; a single back event fired *every* open
  instance at once (closed a modal AND the trip screen together). Fixed by
  routing all instances through one module-level stack — `popstate` pops
  exactly the deepest entry.
- **Real hash-fragment URLs, not same-URL `pushState`.** Mobile Chrome's
  anti-hijacking heuristics can collapse/skip a run of identical-URL
  `pushState` calls on a back gesture. Each entry now gets a real URL
  (`#nav-1`, `#nav-2`, …), and the `popstate` handler compares the landed
  depth against the stack so it self-corrects even if a gesture skips more
  than one entry.
- **`useScrollLock` (`src/utils/useScrollLock.ts`) was blocking the
  gesture entirely.** It set `touch-action: none` on `document.body` while
  a modal was open, which also suppresses the OS/browser edge-swipe-back
  gesture — the gesture never reached `popstate` at all with a modal open.
  `overflow: hidden` (already present) fully covers the "stop background
  scroll" job; `touch-action: none` was redundant and actively harmful.

### Native (Capacitor) side

`android/app/src/main/AndroidManifest.xml` needed
`android:enableOnBackInvokedCallback="true"` for Android's predictive-back
gesture to have anything to dispatch to (SDK 36 target requires explicit
opt-in). `src/main.tsx` registers a `CapacitorApp.addListener('backButton', …)`
handler: pops history if possible, else exits the app at the root screen.

### How to test

1. Open a trip → Add Expense → swipe back (or press hardware/nav-bar back).
   Should land back on the expense list, same as tapping Cancel/X.
2. Nest it: trip dashboard → open a modal (Share/Settings) → back once
   should close just the modal, not exit to the Trips list.
3. Try it from every modal: Add Expense, Add Trip form, Share, Global
   Settings, Expense review, the delete/settle confirm dialog.

---

## Part 2 — Offline-first (WhatsApp-style)

### Goal

Full app usability with zero connectivity: all trips, expenses, members,
groups, categories, and settings load and stay editable offline. Internet
is only needed to sync changes to Supabase in the background.

### What already existed (before this session)

`src/store/tripStore.ts` already had real infrastructure: zustand `persist`
(localStorage, key `trip-tracker-store-v1`) rehydrating synchronously
before `initialize()` runs; a `syncQueue` + `processQueue()` for
add/update/delete/restore expense actions; an `online` event listener that
auto-flushes the queue; instant trip-switching from cache. This was **not**
a greenfield build — it was closing real gaps in a working system.

### Gaps found and closed, in order

| # | Gap | Symptom | Fix |
|---|-----|---------|-----|
| 1 | `addMember` hard-blocked offline | User-facing error, no queue | Optimistic write + `syncQueue`, same pattern as expenses |
| 2 | `createGroup`/`addCategory` had no offline check at all | Silent no-op — network call rejected, error swallowed since offline, nothing saved, nothing shown | Same optimistic + queue pattern |
| 3 | `createTrip` had no offline check | Same silent no-op, confirmed via failed `trips?select=*` network requests in DevTools | Generates tempIds for both the trip and its creator member, applies locally, queues a single `createTrip` item replaying both inserts |
| 4 | `deleteMember`/`updateMember`/`toggleArchiveMember` had no offline check | Same silent no-op | Same pattern; `deleteMember`'s group-dissolve/rename cascade now applies optimistically with a revert snapshot |
| 5 | Offline-queued receipt photos traveled as base64 inside the persisted `syncQueue` | Risk of blowing localStorage's ~5-10MB quota with a couple of queued photos | New `src/services/offlineReceiptStore.ts` (IndexedDB) stages them instead; falls back to inline if staging itself fails; `processQueue` only deletes the staged photo after the *whole* queued item succeeds (a later failure in the same replay doesn't lose the photo) |
| 6 | A `localStorage` write failure (quota exceeded) failed silently | User believes an offline edit saved; it's gone on reload | Wrapped the `persist` storage layer (`quotaSafeStorage` in `tripStore.ts`) so a `QuotaExceededError` surfaces as a visible `storageError` instead of vanishing |
| 7 | No schema-migration path | Future persisted-shape changes had nowhere to land | Added a `migrate()` stub to the `persist` config |

**Client-supplied ids:** `insertMember`/`insertGroup`/`insertCategory`/
`insertTrip` (in `src/services/tripApi.ts`) all gained an optional `id`
parameter, mirroring the pattern `insertExpense` already used. An
offline-generated `tempId` becomes the real DB row id on sync, so nothing
downstream that already references that id (a trip's `memberIds`, a
group's `memberIds`, etc.) ever needs reconciling after the fact.

### The auth-flicker bug (found during offline retest, not obviously related)

**Symptom:** toggling offline/online (no reload, no console error) made
members, groups, *and* expenses all vanish together, then reappear on
going back online.

**Root cause:** not data loss, and not specific to any of those entities.
Supabase's `GoTrueClient` re-checks/refreshes the session around network
and tab-visibility changes internally, and can fire `onAuthStateChange`
with a `null` session for a purely transient reason (a background
token-refresh attempt failing while briefly offline) — not an actual
sign-out. `src/components/RequireAuth.tsx` redirects to `/login` the
instant `session` is falsy, with zero grace period. `authStore.ts`'s
handler accepted every session value from every event unconditionally
(the event type was even named `_event` to mark it deliberately unused),
so a transient null unmounted the *entire* authenticated app.

**Fix:** only clear an existing session on an explicit `SIGNED_OUT` event
(`src/store/authStore.ts`). `signOut()` already clears the session
directly itself, independent of this listener, so real sign-out is
unaffected. Regression tests added in `authStore.test.ts`.

### Deliberately deferred (see `BACKLOG.md`)

- **Full store migration off localStorage onto IndexedDB** (true
  SQLite-equivalent architecture). Only worth it if trip/expense data
  volume itself approaches the quota — no evidence of that yet, and Phase
  3 above already moved the one real risk (receipt photos) out.
- **Conflict resolution for the same expense edited on two offline
  devices.** Current behavior: local dirty edit always wins over server.
  A reasonable default for this domain (unlike chat, expenses are edited
  by one person at a time in practice) — not a bug, just not full
  WhatsApp parity.

### How to test

1. DevTools → Network → Offline (or airplane mode).
2. On an *existing* trip: add a member, create a group, rename it, delete
   it, add a category, delete it, delete the member you added — all
   should apply instantly, no errors.
3. Go to Trips list, create a *new* trip while still offline — should
   appear instantly and open into it.
4. Add an expense with a receipt photo while offline.
5. Toggle back online, wait for the sync pill to read "Synced," reload —
   everything from steps 2-4 should be there unchanged, including the
   receipt photo (confirms it round-tripped through the new staging path).
6. Separately: toggle offline/online a few times while just *looking* at
   a trip (no edits) — the member/group/expense lists should stay put,
   no flash to a login screen.

---

## Part 3 — App version in Settings

### What shipped

Settings → About now shows `Trip Tracker 2026` with a version string,
matching the WhatsApp-style expectation of "the version updates with every
release, nobody has to remember to bump it by hand."

- **Native (Android/iOS):** reads the real installed version + build
  number via `@capacitor/app`'s `App.getInfo()` — the same values
  `scripts/sync-native-version.mjs` already keeps in sync with
  `package.json` and the CI build number during native builds.
- **Web:** `vite.config.ts` injects `__APP_VERSION__` (from
  `package.json`) and `__BUILD_SHA__` (the git short commit SHA at build
  time) as compile-time constants. The SHA is what actually makes this
  "auto-update with every change" — it's different on every real deploy
  with zero manual versioning discipline required.
- Resolution logic lives in `src/utils/appVersion.ts`
  (`getAppVersion()`), rendered from `src/components/SettingsView.tsx`
  (the shared implementation behind both the Settings tab and the global
  settings modal — editing it here covers both surfaces).

### How to test

Open Settings (or the global settings modal) → scroll to **About** →
should show `Version 0.0.0 (<7-char-sha>)` on web, or the real native
version/build number on an installed Android/iOS build. The SHA should
match the latest deployed commit — after any future push, redeploy, and
recheck: it should change.
