# ✨ Trip Tracker Feature Tracker

*Feature additions log -- parallel to BUGS.md, tracks requests and shipped work instead of defects.*
*Single Source of Truth: `features/features.json` (auto-synced).*

---

## 📊 Summary Metrics

| Metric | Count |
| :--- | :--- |
| **Total Tracked** | **28** |
| **💡 Requested** | **2** |
| **📋 Planned** | **0** |
| **🟡 In Progress** | **0** |
| **✅ Shipped** | **26** |
| **⚪ Won't Do** | **0** |

---

## 🚧 Active (Requested, Planned & In Progress)

| ID | Category | Title | Requested By | Status |
| :--- | :--- | :--- | :--- | :--- |
| **[FEAT-002](#feat-002)** | `ui-ux` | Test | `mauryarahul007@gmail.com` | 💡 Requested |
| **[FEAT-024](#feat-024)** | `admin` | CI pipeline for lint, build, and test on push/PR | `claude-cli` | 💡 Requested |

---

## 📖 Active Feature Details

### FEAT-002: Test

- **Category**: `ui-ux` | **Status**: `requested`
- **Requested By**: `mauryarahul007@gmail.com` on 21/8/2026 (web)
- **Route**: `#nav-3`

Test

---

### FEAT-024: CI pipeline for lint, build, and test on push/PR

- **Category**: `admin` | **Status**: `requested`
- **Requested By**: `claude-cli` on 1/9/2026 (web)

CI pipeline for lint, build, and test on push/PR

---

## ✅ Shipped History

| ID | Title | Category | Requested By | Shipped By | Note |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **FEAT-001** | Feature Additions Tracker | `admin` | `claude-cli` | `claude-cli` | Parallel system to the Bug Ledger. Migration 0063, featureApi.ts, feature.mjs CLI, FeatureRequestModal.tsx (Settings > Suggest a Feature), AdminFeaturesPage.tsx (Ops Deck Features tab) with flag-linking. Commit 1bf95d6. |
| **FEAT-003** | Refresh button on Features tab | `admin` | `claude-cli` | `claude-cli` | reloadFleetData now returns a Promise so the button can await + spinner instead of requiring a full page reload. Commit 228c582. |
| **FEAT-004** | Flight-themed 3D aerodynamic jetliner coachmark tooltip for expense logging | `ui-ux` | `antigravity` | `antigravity` | Shipped |
| **FEAT-005** | Numberless Spotify-Wrapped-Style Story Infographic Card | `ui-ux` | `antigravity` | `antigravity` | Shipped |
| **FEAT-006** | Lightweight UI/UX polish pass: view transitions, content-visibility, reduced-motion, skeleton loader | `performance` | `claude-cli` | `claude-cli` | Commit pending push. Files: src/App.tsx, src/index.css, src/components/RequireAuth.tsx, src/components/ExpenseList.tsx. |
| **FEAT-007** | Pending invite badge on Members tab | `ui-ux` | `claude-cli` | `claude-cli` | Commit pending push. File: src/components/MembersGroupsTab.tsx, src/index.css (.member-badge-pending). |
| **FEAT-008** | Swipe-to-edit/delete on Members tab + tap-to-refresh on trip dashboard | `ui-ux` | `claude-cli` | `claude-cli` | Commit pending push. Files: src/components/MembersGroupsTab.tsx, src/App.tsx, src/index.css (.icon-spin). |
| **FEAT-009** | Per-tab code splitting for Superadmin Ops Deck | `performance` | `claude-cli` | `claude-cli` | Commit pending push. File: src/components/admin/AdminPortalLayout.tsx. |
| **FEAT-010** | Async image decoding across all avatars/receipts + accessibility label audit | `performance` | `claude-cli` | `claude-cli` | Commit pending push. Files: src/components/ExpenseForm.tsx, ExpenseReviewModal.tsx, ExpenseList.tsx, MembersGroupsTab.tsx, TripsListScreen.tsx, TripStack.tsx, UpiPaymentModal.tsx. |
| **FEAT-011** | Close/Reopen Trip lock | `ui-ux` | `claude-cli` | `claude-cli` | Migration 0069 applied to remote. Files: supabase/migrations/0069_add_trip_closed.sql, src/store/tripStore.ts, src/services/tripApi.ts, src/types/index.ts, src/types/database.ts, src/components/SettingsView.tsx. |
| **FEAT-012** | Remind All settlement nudge | `ui-ux` | `claude-cli` | `claude-cli` | File: src/components/BalancesSettlements.tsx. |
| **FEAT-013** | Per-trip push notification mute | `ui-ux` | `claude-cli` | `claude-cli` | Migration 0070 applied to remote, send-push Edge Function redeployed. Files: supabase/migrations/0070_add_trip_mutes.sql, supabase/functions/send-push/index.ts, src/store/tripStore.ts, src/services/tripApi.ts, src/types/database.ts, src/components/SettingsView.tsx. |
| **FEAT-014** | Expenses restructured into Trip Summary + Itinerary Ledger with advanced filters and cross-linking | `ui-ux` | `claude-cli` | `claude-cli` | Shipped |
| **FEAT-015** | Right-edge swipe navigation between tabs | `ui-ux` | `claude-cli` | `claude-cli` | Shipped |
| **FEAT-016** | Settlement section simplified: plain-language sentences + at-a-glance balance chips | `ui-ux` | `claude-cli` | `claude-cli` | Shipped |
| **FEAT-017** | Uber-style full-screen bottom sheet with auto-hiding header | `ui-ux` | `claude-cli` | `claude-cli` | Shipped |
| **FEAT-018** | Drag-tracked tab-swipe navigation | `ui-ux` | `claude-cli` | `claude-cli` | src/utils/useTabSwipe.ts rewritten to expose activePaneStyle/previewTab/previewPaneStyle driven by live drag position instead of a binary swipe-then-snap. |
| **FEAT-019** | Uber-style bottom sheet motion polish | `ui-ux` | `claude-cli` | `claude-cli` | src/components/TripContentSheet.tsx (velocity fling, scrim, corner-radius, haptics), src/utils/nativeShell.ts + src/App.tsx (status-bar tone sync). Added @capacitor/haptics + @capacitor/status-bar, npx cap sync run for Android/iOS. |
| **FEAT-020** | Simplified who-owes-who summary card | `ui-ux` | `claude-cli` | `claude-cli` | src/components/BoardingPassHeroCard.tsx, src/components/BalancesSettlements.tsx. |
| **FEAT-021** | Analytics moved to Summary; geo map split into its own Settings section | `analytics` | `claude-cli` | `claude-cli` | src/App.tsx, src/components/AnalyticsTab.tsx, src/components/SettingsTab.tsx, src/components/SettingsView.tsx. |
| **FEAT-022** | 10 UI/UX enhancements: skeleton loaders, pull-to-refresh, edit-undo, settlement confetti + progress, duplicate expense, split preview, empty-state CTAs, category icons, command-palette hint | `ui-ux` | `claude-cli` | `claude-cli` | Shipped in commit 237b25a |
| **FEAT-023** | Passport trip card stamp-press entrance + tap feedback | `ui-ux` | `claude-cli` | `claude-cli` | Shipped in commit d4633e2 |
| **FEAT-025** | Trip stack: gesture feedback and depth polish | `ui-ux` | `claude-cli` | `claude-cli` | Shipped in commits (this session): directional commit-preview badge, rubber-band drag resistance, prefers-reduced-motion support, staggered quick-actions entrance, long-press progress ring, depth-2 blur cue, idle sway on peek cards, and derived exit-timing constants. See TripStack.tsx + index.css. |
| **FEAT-026** | Prefetch lazy-loaded modal chunks on hover/press intent | `performance` | `claude` | `claude` | Implemented in NavTabs.tsx (prefetchExpenseForm / prefetchSettingsTab on onMouseEnter/onPointerDown). |
| **FEAT-027** | Merge trip-card countdown badge into the destination/weather pill | `ui-ux` | `mauryarahul007@gmail.com` | `claude` | Implemented in TripStack.tsx (CardContent header) commit f1f2345. |
| **FEAT-028** | Apple-style Version/Build split -- stop auto-bumping marketing version on every commit | `admin` | `mauryarahul007@gmail.com` | `claude-cli` | Removed .githooks/post-commit auto-bump entirely (it also did a git commit --amend on every commit). scripts/bump-version.mjs is now a manual major/minor/patch CLI. vite.config.ts injects __BUILD_NUMBER__ (git rev-list --count HEAD) replacing __BUILD_SHA__. appVersion.ts and SettingsView.tsx display Version (Build). sync-native-version.mjs local fallback also uses commit count. Reset package.json version to 2.0.0 to mark the cutover. Commit 1241bc3. |

---

## 🛠️ CLI Reference

```bash
# Log a new feature (request or already-shipped work)
npm run feature:add -- --title "Ops Deck mobile responsiveness" --category admin --by claude-cli --status shipped

# List active (requested/planned/in-progress) features
npm run feature:list

# View details for a feature
npm run feature -- show FEAT-001

# Mark a feature shipped
npm run feature:ship -- FEAT-001 --by claude-cli --note "Shipped in commit abc1234"

# Synchronize FEATURES.md
npm run feature:sync
```
