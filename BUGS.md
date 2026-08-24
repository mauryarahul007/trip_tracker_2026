# 🐞 Trip Tracker Bug Tracker

*Unified multi-agent bug ledger for Antigravity, Claude CLI, and human testers.*
*Single Source of Truth: `bugs/bugs.json` (auto-synced).*

---

## 📊 Summary Metrics

| Metric | Count | Status Notes |
| :--- | :--- | :--- |
| **Total Tracked** | **32** | All recorded bugs across sessions |
| **🟢 Open** | **4** | 🚨 **3 CRITICAL**, 0 High |
| **🟡 In Progress** | **0** | Active investigation or fix |
| **✅ Resolved** | **28** | Verified & closed |
| **⚪ Won't Fix** | **0** | Expected behavior / deferred |

---

## 🚨 Active Bugs (Open & In Progress)

| ID | Severity | Category | Title | Found By | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **[BUG-017](#bug-017)** | 🔴 **CRITICAL** | `general` | Uncaught TypeError: Cannot read properties of null (reading 'useCallback') | `auto-crash-handler` | 🟢 Open |
| **[BUG-018](#bug-018)** | ⚪ Low | `splits-math` | test bug | `superadmin` | 🟢 Open |
| **[BUG-019](#bug-019)** | 🔴 **CRITICAL** | `general` | Uncaught TypeError: Cannot read properties of null (reading 'useCallback') | `auto-crash-handler` | 🟢 Open |
| **[BUG-024](#bug-024)** | 🔴 **CRITICAL** | `general` | Failed to update a ServiceWorker for scope ('https://trip-tracker.blackmaroon.in/') with script ('Unknown'): The object is in an invalid sta | `auto-crash-handler` | 🟢 Open |

---

## 📖 Detailed Active Bug Specs

### BUG-017: Uncaught TypeError: Cannot read properties of null (reading 'useCallback')

- **Severity**: `CRITICAL` | **Category**: `general` | **Status**: `open`
- **Found By**: `auto-crash-handler` on 21/8/2026 (web)
- **Route**: `#/` (Online: `true`)

**Description**:
Automatically captured window error.

TypeError: Cannot read properties of null (reading 'useCallback')
    at exports.useCallback (http://localhost:5174/node_modules/.vite/deps/react.js?v=45185605:701:30)
    at useStore (http://localhost:5174/node_modules/.vite/deps/zustand.js?v=d2bfbf05:36:78)
    at useBoundStore (http://localhost:5174/node_modules/.vite/deps/zustand.js?v=d2bfbf05:42:38)
    at UpdateBanner (http://localhost:5174/src/components/UpdateBanner.tsx:8:26)
    at Object.react_stack_bottom_frame (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=e164e122:12864:12)
    at renderWithHooks (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=e164e122:4211:19)
    at updateFunctionComponent (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=e164e122:5567:16)
    at beginWork (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=e164e122:6138:20)
    at runWithFiberInDEV (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=e164e122:850:66)
    at performUnitOfWork (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=e164e122:8427:92)

**Expected**: App runs without throwing.

**Actual**: Uncaught TypeError: Cannot read properties of null (reading 'useCallback')

**Diagnostic Trace / Stack**:
```text
TypeError: Cannot read properties of null (reading 'useCallback')
    at exports.useCallback (http://localhost:5174/node_modules/.vite/deps/react.js?v=45185605:701:30)
    at useStore (http://localhost:5174/node_modules/.vite/deps/zustand.js?v=d2bfbf05:36:78)
    at useBoundStore (http://localhost:5174/node_modules/.vite/deps/zustand.js?v=d2bfbf05:42:38)
    at UpdateBanner (http://localhost:5174/src/components/UpdateBanner.tsx:8:26)
    at Object.react_stack_bottom_frame (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=e164e122:12864:12)
    at renderWithHooks (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=e164e122:4211:19)
    at updateFunctionComponent (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=e164e122:5567:16)
    at beginWork (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=e164e122:6138:20)
    at runWithFiberInDEV (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=e164e122:850:66)
    at performUnitOfWork (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=e164e122:8427:92)
```

---

### BUG-018: test bug

- **Severity**: `LOW` | **Category**: `splits-math` | **Status**: `open`
- **Found By**: `superadmin` on 21/8/2026 (web)

**Description**:
test bug

---

### BUG-019: Uncaught TypeError: Cannot read properties of null (reading 'useCallback')

- **Severity**: `CRITICAL` | **Category**: `general` | **Status**: `open`
- **Found By**: `auto-crash-handler` on 21/8/2026 (web)
- **Route**: `#/` (Online: `true`)

**Description**:
Automatically captured window error.

TypeError: Cannot read properties of null (reading 'useCallback')
    at exports.useCallback (http://localhost:5174/node_modules/.vite/deps/react.js?v=43430a51:701:30)
    at useStore (http://localhost:5174/node_modules/.vite/deps/zustand.js?v=915eb48f:36:78)
    at useBoundStore (http://localhost:5174/node_modules/.vite/deps/zustand.js?v=915eb48f:42:38)
    at UpdateBanner (http://localhost:5174/src/components/UpdateBanner.tsx:8:26)
    at Object.react_stack_bottom_frame (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=c35173d6:12864:12)
    at renderWithHooks (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=c35173d6:4211:19)
    at updateFunctionComponent (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=c35173d6:5567:16)
    at beginWork (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=c35173d6:6138:20)
    at runWithFiberInDEV (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=c35173d6:850:66)
    at performUnitOfWork (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=c35173d6:8427:92)

**Expected**: App runs without throwing.

**Actual**: Uncaught TypeError: Cannot read properties of null (reading 'useCallback')

**Diagnostic Trace / Stack**:
```text
TypeError: Cannot read properties of null (reading 'useCallback')
    at exports.useCallback (http://localhost:5174/node_modules/.vite/deps/react.js?v=43430a51:701:30)
    at useStore (http://localhost:5174/node_modules/.vite/deps/zustand.js?v=915eb48f:36:78)
    at useBoundStore (http://localhost:5174/node_modules/.vite/deps/zustand.js?v=915eb48f:42:38)
    at UpdateBanner (http://localhost:5174/src/components/UpdateBanner.tsx:8:26)
    at Object.react_stack_bottom_frame (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=c35173d6:12864:12)
    at renderWithHooks (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=c35173d6:4211:19)
    at updateFunctionComponent (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=c35173d6:5567:16)
    at beginWork (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=c35173d6:6138:20)
    at runWithFiberInDEV (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=c35173d6:850:66)
    at performUnitOfWork (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=c35173d6:8427:92)
```

---

### BUG-024: Failed to update a ServiceWorker for scope ('https://trip-tracker.blackmaroon.in/') with script ('Unknown'): The object is in an invalid sta

- **Severity**: `CRITICAL` | **Category**: `general` | **Status**: `open`
- **Found By**: `auto-crash-handler` on 21/8/2026 (web)
- **Route**: `#/` (Online: `true`)

**Description**:
Automatically captured unhandled rejection.

No stack trace available.

**Expected**: App runs without throwing.

**Actual**: Failed to update a ServiceWorker for scope ('https://trip-tracker.blackmaroon.in/') with script ('Unknown'): The object is in an invalid state.

---

## ✅ Resolved Bugs History

| ID | Title | Category | Severity | Found By | Resolved By | Fix Note |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **BUG-012** | Member deletion left orphaned split IDs corrupting settlement balance math | `splits-math` | `high` | `human` | `antigravity` | Added automated exclusion of deleted members in App.tsx and settlement engine, redistributing equal shares automatically. |
| **BUG-009** | iOS build failure due to Capacitor SPM Swift API mismatch on Xcode 16 | `general` | `critical` | `antigravity` | `antigravity` | Pinned capacitor-swift-pm to 8.2.0, committed Package.resolved, and created scripts/align-spm-versions.mjs. |
| **BUG-008** | Android crash on startup due to uninitialized FirebaseApp in FCM plugin | `general` | `critical` | `claude-cli` | `claude-cli` | Added google-services.json template and Gradle google-services plugin configuration. |
| **BUG-013** | Sole Admin account deletion caused orphaned trips with no administrative control | `general` | `high` | `human` | `antigravity` | Implemented sole-admin deletion protection requiring at least one other Google-linked Admin before removing an admin account. |
| **BUG-010** | Native Google OAuth deep link failed on Android auth code exchange | `auth` | `high` | `claude-cli` | `claude-cli` | Broadened AndroidManifest.xml intent filter and updated parseNativeAuthCallback to support both code and token URL formats. |
| **BUG-011** | Mobile Safari 100vh caused bottom navigation and toasts to be obscured | `ui-ux` | `medium` | `antigravity` | `antigravity` | Applied CSS 100dvh units with -webkit-fill-available fallbacks and env(safe-area-inset-bottom) padding. |
| **BUG-001** | Hardware swipe-back gesture blocked by scroll-lock touch-action | `navigation` | `medium` | `claude-cli` | `claude-cli` | Fixed in commit by scoping touch-action to individual swipeable rows instead of whole viewport. |
| **BUG-014** | Expense geotagging wrote place names to database violating coordinates-only rule | `performance` | `medium` | `human` | `claude-cli` | Added coordsOnly() sanitizer in tripApi.ts and ran DB migration 0043 to scrub historical placeName strings. |
| **BUG-006** | Back navigation used same-URL pushState causing history loops | `navigation` | `medium` | `claude-cli` | `claude-cli` | Converted useHistoryBack to push unique hash fragment URLs, creating unambiguous stack entries. |
| **BUG-007** | Multiple modal sheets closed together on a single back press | `navigation` | `medium` | `antigravity` | `antigravity` | Ordered useHistoryBack invocations to enforce LIFO stack popping. |
| **BUG-015** | Browser reload while offline wiped visible trip and expense data | `offline-sync` | `critical` | `human` | `antigravity` | Wrapped useTripStore with zustand persist middleware backed by localStorage with mergeServerExpenses dirty-state reconciliation. |
| **BUG-002** | Offline-captured receipt photos caused localStorage QuotaExceededError | `receipts-camera` | `high` | `antigravity` | `antigravity` | Created dedicated IndexedDB store (offlineReceiptStore.ts) to hold offline photos separately from localStorage state. |
| **BUG-003** | Offline/online toggle briefly signed the user out, flashing login screen | `auth` | `high` | `antigravity` | `antigravity` | Updated authStore.ts onAuthStateChange to ignore transient null sessions unless event is explicitly SIGNED_OUT. |
| **BUG-004** | Member deletion, update, and archiving lacked offline queue support | `offline-sync` | `high` | `claude-cli` | `claude-cli` | Implemented full offline-first mutation handlers in tripStore.ts with queueSync actions (deleteMember, updateMember, toggleArchiveMember). |
| **BUG-005** | Creating a new trip while offline silently failed without offline path | `offline-sync` | `high` | `antigravity` | `antigravity` | Added offline createTrip branch in tripStore.ts generating temp trip IDs and queuing createTrip mutations. |
| **BUG-016** | Superadmin Bug Tracker falsely blocked access when opened from home screen | `ui-ux` | `medium` | `human` | `antigravity` | Removed artificial trip-scoped lock in SuperAdminBugTracker.tsx and App.tsx, opening direct access to developers. |
| **BUG-020** | Report a Problem submit fails for normal users (RLS blocked) | `general` | `high` | `rahul` | `rahul` | Fixed via report_bug() SECURITY DEFINER RPC (migration 0059): id computation and insert now run server-side, bypassing RLS, so normal users no longer need SELECT on bugs. bugApi.ts createBug() now calls supabase.rpc('report_bug', ...). Commit 496306b. |
| **BUG-021** | Report a Problem popup traps scroll, cannot scroll back up to close | `ui-ux` | `medium` | `rahul` | `rahul` | BugReportModal converted from a modal-overlay popup to a full-screen SettingsView subscreen (settings-subscreen-enter layout), same pattern as other Settings subscreens -- no more trapped scroll. Commit 496306b. |
| **BUG-022** | Report a Problem back navigation discards unsent draft without confirmation | `ui-ux` | `medium` | `rahul` | `rahul` | Added a back-guard (onRegisterBackGuard) wired through both the on-screen back link and SettingsView's useHistoryBack hardware/browser-back handling. When there's unsent text, a 3-way ConfirmDialog (new tertiaryLabel/onTertiary support) offers Submit & Go Back, Discard & Go Back, or Keep Editing. Commit 496306b. |
| **BUG-023** | Test from app | `navigation` | `critical` | `mauryarahul007@gmail.com` | `superadmin` | Test |
| **BUG-025** | Enable Live Alerts banner shown on native platforms and never works | `ui-ux` | `medium` | `mauryarahul007@gmail.com` | `claude-cli` | Gated the banner on isWebNotificationSupported() in NotificationsPanel.tsx so it only renders in an actual browser tab. Commit 4433bc1. |
| **BUG-026** | 'Out of sync (0)' status permanently shown on every trip | `offline-sync` | `high` | `mauryarahul007@gmail.com` | `claude-cli` | Dropped the broken lastModifiedAt/lastBackendSyncedAt comparison from syncStatus in App.tsx -- syncQueue.length is the correct, live signal and was already there. Commit f950404. |
| **BUG-027** | Superadmin Ops Deck section tabs unusable on mobile | `ui-ux` | `medium` | `mauryarahul007@gmail.com` | `claude-cli` | Replaced with a header status-line trigger that opens a full-screen section switcher on tap, reusing the existing dot+code+label rail styling. Also fixed a CSS source-order bug where the desktop rail's unconditional display:flex was overriding its own mobile display:none. Commits 55ab403, 178a638. |
| **BUG-028** | Ops Deck header rendered under the Android status bar | `ui-ux` | `medium` | `mauryarahul007@gmail.com` | `claude-cli` | Added the app-wide calc(Npx + var(--safe-top, 0px)) safe-area padding convention to .ops-shell and .ops-panel in ops-deck.css. Commit e433fa8. |
| **BUG-029** | Feature flags (Flags tab) never reached other devices | `general` | `high` | `mauryarahul007@gmail.com` | `claude-cli` | Migration 0064: feature_flag_overrides table (scope: global/trip/user) + get_resolved_feature_flags/get_all_feature_flag_overrides/set_feature_flag_override RPCs. tripStore.ts now persists and loads flags from Supabase instead of local-only zustand persist state. Commit 6fb9e57. |
| **BUG-030** | Superadmin/demo account shows duplicate categories in Tools tab and expense auto-tagging | `general` | `high` | `claude-cli` | `claude-cli` | tripStore.ts loadDemoTrip offline-fallback: result.categories now returns [] (matching insertTripGraph's success-path shape of custom-only categories) instead of DEFAULT_CATEGORIES, so the caller's [...DEFAULT_CATEGORIES, ...result.categories] no longer doubles every default category. Added regression test in tripStore.test.ts (loadDemoTrip suite) that mocks insertTripGraph to reject and asserts categories has no duplicate ids -- fails without the fix (12 ids instead of 6), passes with it. |
| **BUG-067** | Mobile canvas solid cyan block fill and text overflow in Trip Wrapped | `ui-ux` | `medium` | `user` | `antigravity` | Replaced native roundRect with drawSafeRoundedRect with explicit beginPath/closePath, added drawSafeWrappedText for multi-line bound protection, and added Night/Light theme switcher. |
| **BUG-068** | Home screen card-style deck vertical scroll outside viewport on mobile | `ui-ux` | `medium` | `user` | `antigravity` | Added .stack-viewport-lock with 100dvh lock and flexbox column auto-scaling in index.css (ADR 50). |

---

## 🛠️ CLI Reference for AI Agents & Developers

```bash
# Add a new bug
npm run bug:add -- --title "Expense split discrepancy on offline reconnect" --severity high --category offline-sync --by claude-cli

# List open bugs
npm run bug:list

# View details for a bug
npm run bug -- show BUG-001

# Mark bug resolved
npm run bug:resolve -- BUG-001 --by antigravity --fix "Fixed in commit abc1234"

# Synchronize BUGS.md
npm run bug:sync
```
