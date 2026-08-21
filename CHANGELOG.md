# Changelog

## 2026-08-21 — Superadmin Ops Deck: fleet analytics, mobile support, and a Feature Tracker

### Ops Deck grew from 4 sections to 7
- **Analytics** gained growth trend, day-of-week activity heatmap, settlement health, split-mode/feature adoption rates, bug-report origin, notification delivery stats (aggregate only, no message content exposed), recycle-bin snapshot count, and platform split.
- **Users** (new) — full account directory with suspend/restore, enforced via `is_banned()` wired into `is_trip_participant()`/`is_trip_admin()` so it blocks a user everywhere in one gate, mid-session; plus fleet/per-trip broadcast notifications.
- **Audit** (new) — reads `security_audit_logs` (existed since migration 0048, but nothing ever wrote to it until now — `log_security_event()` is called from every sensitive superadmin RPC).
- **Features** (new) — see below.
- **Flags** gained Fleet Controls: maintenance mode (+ scheduled window), paused sign-ins, join-code rate limits, recycle-bin retention hours, expense amount ceiling — all `app_config`-backed instead of hardcoded.
- **Trips** gained an "Inspect" button (opens a trip in the traveler UI using the superadmin's own already-elevated access — not per-user impersonation, which would need the `service_role` key in the browser).

### The Flags grid was never actually cross-device
- `featureFlags`/`tripFlagOverrides`/`userFlagOverrides` (the original global-toggle + per-trip + per-member override panel) turned out to be local `zustand persist` state only — a superadmin toggling a flag on one device never reached any other device, ever. It looked correct because the admin's own toggle always reflected back to them.
- Fixed with a real backend: `feature_flag_overrides` table (scope: global/trip/user) + `get_resolved_feature_flags`/`get_all_feature_flag_overrides`/`set_feature_flag_override` RPCs (migration 0064). Every client now resolves its own flags on load and on trip switch; the Ops Deck loads every trip's/user's overrides for the panel views.

### Feature Additions Tracker
- A parallel system to the Bug Ledger, same architecture: `public.features` table + `submit_feature_request()` RPC (migration 0063), `scripts/feature.mjs` CLI mirroring `bug.mjs`, `FeatureRequestModal.tsx` ("Suggest a Feature" in Settings, gated behind a new `enableFeatureSuggestions` flag — off by default, enable per-person or globally), and the Ops Deck's Features tab for triage (Requested → Planned → In Progress → Shipped/Won't Do). A request can link to an *existing* flag for a one-click toggle right on its row — it can't retroactively create working on/off control for something nothing in the app checks yet.

### Mobile responsiveness — three attempts, one that worked
- First pass reflowed the desktop sidebar into a horizontal-scroll pill row: rejected, tabs got cut off with no indication more existed.
- Second pass reflowed it into a wrapping 3-column grid: also rejected — still felt bolted onto a desktop pattern.
- Landed on a header-switcher pattern instead (via a `frontend-design` skill review): the current section becomes a tappable status-line, tapping it opens a full-screen list of all sections. A CSS source-order bug (`.ops-rail`'s unconditional `display: flex` overriding its own mobile `display: none`, since it came later in the file) briefly showed both the old rail and the new switcher at once — fixed with the `!important` the original horizontal-scroll version had used for the same reason.
- Also fixed: the Ops Deck header rendering flush against the Android status bar (never adopted the app-wide `env(safe-area-inset-*)` convention every other screen uses), and scroll position not resetting to top when switching sections.
- The whole Ops Deck + Bug Ledger were code-split out of the main JS bundle (`React.lazy` + `Suspense`) — travelers who never open either now download neither.

### Two more real bugs, found via user reports
- The web-only "Enable Live Alerts" notification banner showed (and silently failed to work) on native Android/iOS, because `Notification.requestPermission()` is a no-op there by design (native has its own FCM path) — the banner's render condition didn't account for that.
- The sync-status pill showed "Out of sync (0)" permanently, on every trip, on web and native — a second, broken staleness check (`lastModifiedAt` vs a `lastBackendSyncedAt` that's only ever refreshed by the offline-queue-drain path, which normal online writes never touch) was fighting the correct one (`syncQueue.length > 0`).

### Files touched
- `src/components/admin/*` (all 7 pages + `ops-deck.css`), `src/App.tsx`, `src/components/SettingsView.tsx`, `src/components/FeatureRequestModal.tsx`, `src/components/NotificationsPanel.tsx`, `src/store/tripStore.ts`, `src/services/{featureApi,featureFlagApi,tripApi}.ts`, `src/types/{admin,database}.ts`, `scripts/feature.mjs`, `supabase/migrations/0060-0064`, `superadmin.md`, `README.md`

---

## 2026-08-08 (latest) — Group balances: collapsible entry + real internal settlement

### Member Balances now shows one row per group, not per member
- Previously every group member was listed individually, so a group whose combined balance was zero showed misleading "gets back X" / "owes X" rows for its own members even though nothing needed to happen with the outside world.
- Groups now render as a single collapsible `👥 Group Name` row; click to expand and see individual members underneath.

### Fixed: group falsely labeled "settled" while members still owed each other
- A group's combined balance netting to zero only means the group has nothing outstanding with people *outside* the group — it says nothing about whether the group's own members have reconciled with each other.
- The group row now only says **settled** (green) once its net external balance is zero **and** every member inside it individually has zero balance too. If net-zero externally but members still owe each other, it shows **internal settlement pending** (amber) instead.
- Expanding a group in that state shows a new "Internal settlement needed" section — a real Settle action (with the same custom-amount input as the main panel) to record who pays whom inside the group. The group flips to settled once that's recorded.
- Added `calculateGroupInternalTransfers()` to `settlement.ts`, refactored the shared greedy-matching loop out of `calculateSettlements()` so both paths use identical logic. Extended the self-check script with a scenario matching the reported bug (two group members with equal-and-opposite balances) plus the fix verification.

### Files touched
- `src/utils/settlement.ts`, `src/components/BalancesSettlements.tsx`, `src/App.tsx`

---

## 2026-08-08 (latest) — Settlement engine: transitive, group, and custom settlements

### Transitive settlement (already present, verified)
- The settlement algorithm nets each member's balance across *all* expenses before matching debtors to creditors, so a member whose debts and credits cancel out (e.g. B owes A but is also owed the same amount by C) simply never appears — A is matched directly to C. Confirmed with a self-check script; no code change needed.

### Group settlement
- Trip groups are now merged into a single settlement node before the greedy match runs — members of the same group never see a suggested transfer between each other, and the group's combined balance settles against everyone else as one entity.
- The actual ledger entry still needs two real members: the group's most-negative-balance member is picked as the default payer, most-positive as the default recipient (shown in the confirm dialog, e.g. "Roomies pays Amit ₹500 (paid by Priya)").
- `calculateSettlements()` and `exportTripToCSV()` both take an optional `groups` parameter now; `Transfer` gained `fromLabel`/`toLabel` (display name — member or group) and `fromMemberId`/`toMemberId` (real member ids for the ledger).

### Custom settlement amount
- Each settlement row now has a free amount input next to **Settle** — leave blank to use the suggested amount, or type any other figure (partial payment, overpayment, rounding). Balances and the remaining suggested transfers recalculate on the next render, same as any other recorded expense.

### Files touched
- `src/utils/settlement.ts`, `src/utils/csvExport.ts`, `src/components/BalancesSettlements.tsx`, `src/App.tsx`, `docs/reference-settlement.md`, `docs/explanation-settlement-design.md`, `docs/tutorial-getting-started.md`

---

## 2026-08-08 (later still) — Expense form fixes — ✅ signed off

### Category dropdown overflowing its container
- `.form-group`/`.input-field` grid cells had no `min-width: 0`, so CSS Grid's default `min-width: auto` kept the column from shrinking below the `<select>`'s content width — a long category name pushed the box outside the card.
- Added `min-width: 0` to `.form-group` and `.input-field`, `width: 100%` to `.input-field`, and ellipsis truncation to `.select-field` so it always stays inside its column.

### Comma-formatted amount input
- The Amount field now displays thousands separators as you type (`10000` → `10,000`) via a display-only formatter in `ExpenseForm.tsx`; the underlying raw value used for calculations is unchanged.

### Files touched
- `src/index.css`, `src/components/ExpenseForm.tsx`

---

## 2026-08-08 — UX & functionality improvement pass

Eight targeted improvements, implemented and user-validated one at a time (each run locally, checked, and signed off before starting the next).

### 1. Custom confirm modal + inline validation errors — ✅ signed off
- Added `src/components/ConfirmDialog.tsx`, a reusable confirm modal matching the app's existing glass-card style.
- Replaced all `window.confirm()` calls (trip delete, group delete, settle transfer) with it.
- Replaced all `window.alert()` validation calls (expense form, group form, "add members first" gate) with inline error text / dismissible banners.

### 2. Undo-delete for trips and groups — ✅ signed off
- Extended the existing 5-second undo-toast pattern (previously expense-only) to trip deletion and group deletion.
- Deletes are staged locally and hidden from the UI immediately; the actual store delete fires after the timer unless the user hits Undo.
- Toasts now stack in a single container so multiple pending deletes don't overlap.

### 3. Live split validation feedback — ✅ signed off
- Exact/percentage/custom split inputs on the expense form now show a running total ("₹X / ₹Y" or "N / 100%") that updates as the user types, colored red until it matches and green with a ✓ once it does.
- Replaces the old behavior of only finding out the split was wrong after hitting submit.

### 4. Expense list sorted by date — ✅ signed off
- Expenses now render newest-date-first instead of insertion order.

### 5. Expense search & filters — ✅ signed off
- Added a search box (title match) plus category, member, and date-range filters above the expense list on the Expenses tab.
- Filters combine (AND); a Clear button appears once any filter is active; empty state distinguishes "no expenses" from "no matches."

### 6. Tap a balance to filter expenses — ✅ signed off
- Clicking a member's row in Balances & Settlements jumps to the Expenses tab pre-filtered to that member's expenses (as payer or split participant), using the filters from #5.

### 7. Custom category management — ✅ signed off
- Wired up the previously-dead `addCategory`/`deleteCategory` store actions to a new "Manage Categories" section in Settings.
- Add a custom category with a name and an icon; icon picker is a dropdown opened by clicking the icon field (18 preset emoji, or type/paste your own).
- Built-in categories are protected (no delete option); custom ones can be deleted with the standard confirm modal.

### 8. Optional receipt/photo attachment — ✅ signed off
- Expense form gets an optional image upload; photos are downscaled and re-encoded client-side (`src/utils/image.ts`, max 1000px, JPEG q0.7) before being stored as a base64 data URL on the expense record (`Expense.receiptImage`).
- Thumbnail + Remove button while editing; full image shown (click to open full-size) in the expense review modal.

### 9. Split `App.tsx` into components — ✅ signed off
- Pure refactor, no behavior change: `App.tsx` (2072 lines, single-file UI) broken into `TripsListScreen`, `ExpenseForm`, `ExpenseList`, `BalancesSettlements`, `MembersGroupsTab`, `AnalyticsTab`, `SettingsTab`, `ExpenseReviewModal`, `UndoToasts`, `NavTabs` under `src/components/`.
- `App.tsx` now owns only state/handlers and wires the components together (911 lines).
- Verified with `tsc -b`, `oxlint`, a full `vite build`, and a manual click-through of every flow.

### Descoped
- **Vestigial per-expense currency field** — originally flagged as a possible cleanup (the field exists but is always forced to the trip's base currency; no real multi-currency conversion is implemented). User confirmed this is not needed — left as-is.

### Files touched
- `src/App.tsx`, `src/index.css`, `src/store/tripStore.ts`, `src/types/index.ts`
- New: `src/components/ConfirmDialog.tsx`, `src/components/TripsListScreen.tsx`, `src/components/ExpenseForm.tsx`, `src/components/ExpenseList.tsx`, `src/components/BalancesSettlements.tsx`, `src/components/MembersGroupsTab.tsx`, `src/components/AnalyticsTab.tsx`, `src/components/SettingsTab.tsx`, `src/components/ExpenseReviewModal.tsx`, `src/components/UndoToasts.tsx`, `src/components/NavTabs.tsx`, `src/utils/image.ts`

---

## 2026-08-08 (later) — Expense card polish

Follow-up fixes to the expense list card, found after using the app post-ship.

### Layout overflow with large amounts — ✅ signed off
- The card was a single-row flex with no wrap; a wide amount (e.g. large 6+ digit values) had nowhere to go but push Edit/Delete outside the container — flex items don't shrink below their content width by default.
- Card now wraps to two rows when needed, the title truncates with ellipsis instead of stretching, and Edit/Delete stack vertically as a compact unit next to the amount instead of side-by-side, so far less horizontal room is needed before anything has to wrap at all.

### Typography cleanup — ✅ signed off
- The card crammed 5 competing font sizes (11/12/13/15/16px) into three tight lines, plus an underline on the title that read like a stray hyperlink.
- Title: dropped the accent color + underline, now plain bold text.
- Payer/date line: collapsed "Paid by: **Rahul** • Aug 8" into "Rahul · Aug 8" — the label was redundant next to the icon and layout.
- Split line: "Split with: A, B, C" → "with A, B, C".
- Amount: bumped to 17px and set in the display font (`--font-family-title`) for a distinct stat-like look instead of competing with body text.
- Edit/Delete buttons: 11px → 12px for legibility and a slightly larger tap target.

### Files touched
- `src/components/ExpenseList.tsx`

---

## 2026-08-08 (later still) — GitHub Pages deployment — ✅ signed off
- Live app now published at https://mauryarahul007.github.io/trip_tracker_2026/, deployed automatically on every push to `main` via GitHub Actions.
- `vite.config.ts`: build-only `base: '/trip_tracker_2026/'` so asset URLs resolve under the project-site subpath (dev server still serves from `/`).
- `index.html`: favicon/manifest links and the service-worker registration now use `%BASE_URL%` / `import.meta.env.BASE_URL` instead of hardcoded absolute paths.
- `public/manifest.json`, `public/sw.js`: switched to relative paths (`.`, `./sw.js`, etc.) since Vite doesn't rewrite static `public/` files — these now work under both `/` and `/trip_tracker_2026/`.
- Added `.github/workflows/deploy-pages.yml` (checkout → npm ci → build → upload-pages-artifact → deploy-pages).
- Enabled GitHub Pages (Actions build type) on the repo.
- README's live-app badge now points at the real deployed URL.

### Files touched
- `vite.config.ts`, `index.html`, `public/manifest.json`, `public/sw.js`, `.github/workflows/deploy-pages.yml`, `README.md`, `package-lock.json`
