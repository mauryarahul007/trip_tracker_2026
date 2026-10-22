# ✨ Trip Tracker Feature Tracker

*Feature additions log -- parallel to BUGS.md, tracks requests and shipped work instead of defects.*
*Single Source of Truth: `features/features.json` (auto-synced).*

---

## 📊 Summary Metrics

| Metric | Count |
| :--- | :--- |
| **Total Tracked** | **172** |
| **💡 Requested** | **3** |
| **📋 Planned** | **0** |
| **🟡 In Progress** | **0** |
| **✅ Shipped** | **169** |
| **⚪ Won't Do** | **0** |

---

## 🚧 Active (Requested, Planned & In Progress)

| ID | Category | Title | Requested By | Status |
| :--- | :--- | :--- | :--- | :--- |
| **[FEAT-002](#feat-002)** | `ui-ux` | Test | `mauryarahul007@gmail.com` | 💡 Requested |
| **[FEAT-024](#feat-024)** | `admin` | CI pipeline for lint, build, and test on push/PR | `claude-cli` | 💡 Requested |
| **[FEAT-167](#feat-167)** | `ui-ux` | Automatic Android APK build from main (Flutter merged into main) | `claude-cli` | 💡 Requested |

---

## 📖 Active Feature Details

### FEAT-002: Test

- **Category**: `ui-ux` | **Status**: `requested`
- **Requested By**: `mauryarahul007@gmail.com` on 8/21/2026 (web)
- **Route**: `#nav-3`

Test

---

### FEAT-024: CI pipeline for lint, build, and test on push/PR

- **Category**: `admin` | **Status**: `requested`
- **Requested By**: `claude-cli` on 9/1/2026 (web)

CI pipeline for lint, build, and test on push/PR

---

### FEAT-167: Automatic Android APK build from main (Flutter merged into main)

- **Category**: `ui-ux` | **Status**: `requested`
- **Requested By**: `claude-cli` on 10/19/2026 (web)

Automatic Android APK build from main (Flutter merged into main)

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
| **FEAT-029** | Privacy Policy, Terms of Service, and self-service account deletion | `admin` | `mauryarahul007@gmail.com` | `claude-cli` | src/components/PrivacyPolicyPage.tsx, TermsOfServicePage.tsx, LegalPageLayout.tsx, DeleteAccountPage.tsx. supabase/migrations/0075_delete_own_account.sql applied to remote. authStore.deleteOwnAccount(), Settings > Legal + Delete Account rows threaded through SettingsView/SettingsTab/GlobalSettingsModal/App.tsx. Routes /privacy, /terms, /delete-account (public, outside RequireAuth). Commit 901cd1a. |
| **FEAT-030** | WhatsApp-style Settings menu -- collapse main list into tappable subpages | `ui-ux` | `mauryarahul007@gmail.com` | `claude-cli` | src/components/SettingsView.tsx: 5 inline group cards collapsed into summary rows, content moved to new subscreens (trip-settings, preferences, data-menu, help-account, about). Build, typecheck, and full test suite (148 tests) all green. Commit 90eecfb. |
| **FEAT-031** | Lazy-load CommandPalette (Ctrl+K) to cut initial bundle | `ui-ux` | `agent` | `agent` | Code-split CommandPalette import in App.tsx via lazy()+Suspense, matching pattern used for other secondary modals. Chunk now loads only on first Ctrl+K open instead of app startup. |
| **FEAT-032** | Lazy-load Members and Notes tabs to cut initial bundle | `ui-ux` | `agent` | `agent` | Code-split MembersGroupsTab and ChecklistNotesTab in App.tsx via lazy()+Suspense, gated on hasVisitedMembers/hasVisitedNotes flags -- same pattern already used for SettingsTab/hasVisitedSettings. ~2,300 combined lines no longer ship until the user taps those tabs. Left AnalyticsTab eager since it shares the default landing tab with Balances. |
| **FEAT-033** | Ops Deck Fleet Vitals retheme: kanban drag-and-drop, mint sidebar shell, calendar widget | `ui-ux` | `claude-cli` | `claude-cli` | Shipped |
| **FEAT-034** | Expense conflict clarity for offline multi-edit | `sync` | `cursor-agent` | `cursor-agent` | Shipped in v3.5.0 (d9c1e28) |
| **FEAT-035** | Native HTTPS join deep links (App Links / Universal Links) | `native` | `cursor-agent` | `cursor-agent` | Shipped in v3.5.0 (d9c1e28) |
| **FEAT-036** | Local pass reminders (T-24h and T-3h) | `notifications` | `cursor-agent` | `cursor-agent` | Shipped in v3.5.0 (d9c1e28) |
| **FEAT-037** | Settings IA cleanup: dedupe Gallery/Snapshot and bury Pro Tips | `ui-ux` | `cursor-agent` | `cursor-agent` | Shipped in v3.5.0 (d9c1e28) |
| **FEAT-038** | Recycle Bin enabled by default for travelers | `ui-ux` | `cursor-agent` | `cursor-agent` | Shipped in v3.5.0 (d9c1e28) |
| **FEAT-039** | Quota-safe receipt storage (no base64 in localStorage) | `performance` | `cursor-agent` | `cursor-agent` | Shipped in v3.5.0 (d9c1e28) |
| **FEAT-040** | WhatsApp-style Settings home (flat titled groups) | `ui-ux` | `cursor-agent` | `cursor-agent` | Shipped in v3.6.0 (df2815e). Reverses FEAT-030 portal-folder IA into WhatsApp-style flat groups. |
| **FEAT-041** | Settings screen visual redesign: trip status hero + elevated grouped cards | `ui-ux` | `claude-cli` | `claude-cli` | Shipped |
| **FEAT-042** | Settings menu IA compaction — Trip Tools & Backups/Media submenus | `ui-ux` | `claude-cli` | `claude-cli` | Shipped |
| **FEAT-043** | OLED Night Flight Pure Black Theme with 4-way appearance selector | `ui-ux` | `agent` | `agent` | Shipped |
| **FEAT-044** | Live In-Form FX Currency Ticker with Rolling Number Odometer animation | `ui-ux` | `agent` | `agent` | Shipped |
| **FEAT-045** | Perforated Receipt Tear-Off Settlement Celebration with Web Audio sound synthesis | `ui-ux` | `agent` | `agent` | Shipped |
| **FEAT-046** | Dynamic Vector Passport Ink Stamps on Trip Covers with high-contrast dynamic ink colors | `ui-ux` | `agent` | `agent` | Shipped |
| **FEAT-047** | In-Flight Remote Offline State Banner and pending mutation queue drawer | `ui-ux` | `agent` | `agent` | Shipped |
| **FEAT-048** | Luggage-Tag Skeleton Loaders with ticket cutout and barcode shimmer | `ui-ux` | `agent` | `agent` | Shipped |
| **FEAT-049** | Boarding Pass Flip Flight and Itinerary Status Indicator with live glowing dot | `ui-ux` | `agent` | `agent` | Shipped |
| **FEAT-050** | Ops Deck v2 violet visual system | `admin` | `cursor-grok` | `cursor-grok` | Shipped in v3.9.0. Also closed live ledger BUG-145, BUG-147, BUG-176–178, BUG-191 as already-fixed or HMR/stale-chunk. |
| **FEAT-051** | Cross-trip expense search + global owe/owed balance dashboard | `ui-ux` | `claude-cli` | `claude-cli` | CommandPalette now searches expenses across every trip the user belongs to (fetchAllExpensesForTrips titleQuery filter, tripApi.ts), each result tagged with its trip name + own currency. TripsListScreen header shows a per-currency net balance chip row (You owe/You're owed) computed via calculateSettlements across all trips. Files: src/services/tripApi.ts, src/components/CommandPalette.tsx, src/components/TripsListScreen.tsx, src/index.css. |
| **FEAT-052** | Public join-code preview before Google sign-in | `ui-ux` | `cursor-grok` | `cursor-grok` | Shipped in v3.12.0. Migration 0081 applied to remote (preview_trip_by_join_code). Files: src/components/JoinTripScreen.tsx, src/utils/joinPreview.ts, src/utils/joinPreview.test.ts, src/services/tripApi.ts, src/types/database.ts, src/main.tsx, supabase/migrations/0081_join_code_public_preview.sql. |
| **FEAT-053** | On-device receipt OCR via Tesseract | `ui-ux` | `cursor-grok` | `cursor-grok` | Shipped in v3.12.0. Files: src/utils/receiptOcr.ts, src/utils/receiptOcr.test.ts, src/components/ReceiptScannerModal.tsx, vite.config.ts (optimizeDeps exclude tesseract.js), package.json (tesseract.js). |
| **FEAT-054** | Bulk select-all for Checklist & Notes | `ui-ux` | `claude-cli` | `claude-cli` | Shipped in v3.15.4: batch delete/complete via Select mode, backed by batchDeleteChecklistItems/batchCompleteChecklistItems/batchDeleteTripNotes in tripStore.ts |
| **FEAT-055** | Trip Group Chat with realtime sync and push notifications | `ui-ux` | `claude-cli` | `claude-cli` | WhatsApp-style chat per trip: trip_messages table (migration 0082, RLS + realtime publication), tripMessagesApi.ts, TripChatPanel.tsx as 3rd sub-tab in ChecklistNotesTab. New message triggers send-push Edge Function (chat_message type, redeployed) respecting per-trip mute. Gated behind enableTripChat flag, default OFF (Ops Deck Flags page to arm). |
| **FEAT-056** | ICS Calendar Export for travel passes | `ui-ux` | `claude-cli` | `claude-cli` | Export flight/train/hotel passes as an RFC 5545 .ics file, importable into Google/Apple/Outlook/Samsung Calendar. Pure client-side (src/utils/icsExport.ts) from existing trip.passes data, download button in TravelPassWalletView.tsx. Gated behind enableIcsExport flag, default OFF. |
| **FEAT-057** | Notification tap routes to relevant tab (expenses, members, chat, settlements) | `ui-ux` | `claude-cli` | `claude-cli` | handleOpenNotification in NotificationsPanel.tsx now calls onNavigate(n) after switching trip (if cross-trip), always closing the panel. App.tsx's handleNotificationNavigate maps notification.data.type to a Tab: expense_* -> ledger, member_* -> members, settlement_* -> expenses (Summary), chat_message -> notes tab + auto-opens its Chat sub-view via a new initialViewMode prop on ChecklistNotesTab, consumed once so it does not fight a later manual switch. |
| **FEAT-058** | Phase 5 flag-gated conversion: Splitwise import, WhatsApp settle card, clone-last, remember split, settlement date/note | `ui-ux` | `cursor-agent` | `cursor-agent` | Shipped |
| **FEAT-059** | Settlements section on Expenses page | `ui-ux` | `Rahul` | `Rahul` | Shipped in ExpenseList.tsx: settlements split out of the day-grouped expense list into their own collapsible history section |
| **FEAT-060** | WhatsApp-style edit/delete for trip chat messages | `ui-ux` | `Rahul` | `Rahul` | Shipped: TripChatPanel.tsx long-press action sheet, edit_trip_message RPC (migration 0083), realtime UPDATE handling |
| **FEAT-061** | Extra expense photos (multi-photo attach) | `ui-ux` | `claude-cli` | `claude-cli` | Shipped |
| **FEAT-062** | Document / ID Vault (local-only, biometric-gated) | `ui-ux` | `claude-cli` | `claude-cli` | Shipped |
| **FEAT-063** | Offline map tile caching for trip journey map | `performance` | `claude-cli` | `claude-cli` | Shipped |
| **FEAT-064** | Calendar sync via native Share sheet (upgrades ICS export) | `ui-ux` | `claude-cli` | `claude-cli` | Shipped |
| **FEAT-065** | Payment history / installment tracker on settlements | `ui-ux` | `claude-cli` | `claude-cli` | Shipped |
| **FEAT-066** | Dispute flag on expenses | `ui-ux` | `claude-cli` | `claude-cli` | Shipped |
| **FEAT-067** | Live location share (public link, 12h window) | `ui-ux` | `claude-cli` | `claude-cli` | Shipped |
| **FEAT-068** | Digest-mode push notifications (daily summary) | `performance` | `claude-cli` | `claude-cli` | Shipped |
| **FEAT-069** | Live location visible in-app via Chat banner (no link needed for trip members) | `ui-ux` | `claude-cli` | `claude-cli` | Shipped |
| **FEAT-070** | Trip closeout, last-seen, collapsed map, cross-trip search, and settlement audit | `ui-ux` | `claude-cli` | `claude-cli` | Shipped in commit 4537c8d (v3.22.0). Five Superadmin flags default OFF. |
| **FEAT-071** | Spend Burn-Rate Forecast | `analytics` | `claude-cli` | `claude-cli` | src/utils/burnRate.ts + AnalyticsTab.tsx card, flag-gated Phase 4, off by default. |
| **FEAT-072** | Date-Range Member Participation | `ui-ux` | `claude-cli` | `claude-cli` | Member.joinDate/leaveDate (migration 0090), edit-only UI in MembersGroupsTab, default-split filter in ExpenseForm via memberDateRange.ts. |
| **FEAT-073** | Auto Currency Detection | `ui-ux` | `claude-cli` | `claude-cli` | countryCurrencyMap.ts + geolocation.ts detectCurrencyFromLocation(), dismissible chip in ExpenseForm. |
| **FEAT-074** | Per-Category Split Exclusion Defaults | `ui-ux` | `claude-cli` | `claude-cli` | Trip.splitExclusionDefaults (migration 0091), per-category chips in SettingsCategoriesScreen, applied in ExpenseForm default split. |
| **FEAT-075** | Quiet Hours | `notifications` | `claude-cli` | `claude-cli` | quiet_hours_prefs table (migration 0092), timezone-aware overnight-safe check in send-push edge function, toggle+time pickers in SettingsView. |
| **FEAT-076** | In-chat expense event cards, live-location session heartbeat, Summary polish | `ui-ux` | `claude-cli` | `claude-cli` | Shipped in commit b4eb125 (v3.26.0). Migration 0094 applied remotely. Flag enableInChatEventCards Phase 6 default OFF. Includes live-location session heartbeat + Summary attention strip / pin carousel. |
| **FEAT-077** | Chat depth: media, voice, typing, read receipts, more event cards, @tripbot | `ui-ux` | `claude-cli` | `claude-cli` | Shipped in commit fbe5c7a (v3.27.0). Migrations 0095-0097 applied remotely. ADR #189. |
| **FEAT-078** | Two-sided settlement confirmation (enableSettlementConfirmation) | `sync` | `agent` | `agent` | Shipped flag-gated (default OFF), see docs/FEATURE_TEST_STEPS.md and decisions.md #193 |
| **FEAT-079** | Read-only trip share link (enableTripShareLink) | `sync` | `agent` | `agent` | Shipped flag-gated (default OFF), see docs/FEATURE_TEST_STEPS.md and decisions.md #193 |
| **FEAT-080** | Invite from phone contacts (enableContactInvite) | `native` | `agent` | `agent` | Shipped flag-gated (default OFF), see docs/FEATURE_TEST_STEPS.md and decisions.md #193 |
| **FEAT-081** | Weather-triggered itinerary nudges (enableWeatherItineraryNudges) | `notifications` | `agent` | `agent` | Shipped flag-gated (default OFF), see docs/FEATURE_TEST_STEPS.md and decisions.md #193 |
| **FEAT-082** | Big-expense mutual approval threshold (enableExpenseApprovalThreshold) | `security` | `agent` | `agent` | Shipped flag-gated (default OFF), see docs/FEATURE_TEST_STEPS.md and decisions.md #193 |
| **FEAT-083** | Tab Back History: back gesture walks the tabs you visited (enableTabBackHistory) | `ui-ux` | `claude-cli` | `claude-cli` | Shipped in v3.31.0 behind default-OFF flag. Commit 19d96be. |
| **FEAT-084** | Deep-Linked Tabs: ?trip=&tab= restores the open screen on refresh or shared link (enableDeepLinkedTabs) | `ui-ux` | `claude-cli` | `claude-cli` | Shipped in v3.31.0 behind default-OFF flag. Commit 19d96be. |
| **FEAT-085** | Persistent Expense Draft: 24h draft survives app close, covers payers/currency/location/receipt (enablePersistentExpenseDraft) | `ui-ux` | `claude-cli` | `claude-cli` | Shipped in v3.31.0 behind default-OFF flag. Commit 19d96be. |
| **FEAT-086** | Sync Queue Inspector: readable offline queue with errors, Retry and Discard (enableSyncQueueInspector) | `sync` | `claude-cli` | `claude-cli` | Shipped in v3.31.0 behind default-OFF flag. Commit 19d96be. |
| **FEAT-087** | Extended Undo: undo for member delete/archive and recorded settlements (enableExtendedUndo) | `ui-ux` | `claude-cli` | `claude-cli` | Shipped in v3.31.0 behind default-OFF flag. Commit 19d96be. |
| **FEAT-088** | Quiet trip chat: overlay delete/settle, stack bills, unread on Notes | `ui-ux` | `rahul` | `rahul` | Shipped in v3.33.0; migration 0106 applied to remote. |
| **FEAT-089** | Light money loop: home IOU, squad clone, Notes Talk/Pack/Pass, closeout recap (Superadmin-gated) | `ui-ux` | `rahul` | `rahul` | Shipped in v3.34.0 behind Superadmin Ops Deck flags (default OFF). ADR 214. FEAT-LIGHTLOOP / FEAT-LIGHTLOOP2. |
| **FEAT-090** | Consumer packs in Ops Deck (Core/Trip/Travel/Pro/Labs/Ops replace phases) | `admin` | `rahul` | `rahul` | Shipped in commit dca5349 (v3.35.0). ADR 215. FEAT-PACKS. |
| **FEAT-091** | Superadmin loop health and growth (funnel, ghosts, attribution, landing copy) | `admin` | `rahul` | `rahul` | Shipped in commit dca5349 (v3.35.0). ADR 216. FEAT-GROWTH. Migration 0107. |
| **FEAT-092** | Restore recommended app confirm on Flags (Core+Trip, not all flags) | `admin` | `rahul` | `rahul` | Shipped in commit aee182f (v3.35.1). |
| **FEAT-093** | Flag recipes and saved mixes on Ops Deck Flags | `admin` | `rahul` | `rahul` | Shipped in commit 2a704e0 (v3.36.0). ADR 217. |
| **FEAT-094** | Growth: invite conversion, telemetry, traveler passport, lifecycle nudges | `analytics` | `rahul` | `rahul` | Shipped in commit 09e8785 (v3.37.0). ADR 218. Migration 0108 applied to the live project on 2026-09-22 (after the code push). Edge function send-lifecycle-nudge not yet deployed. |
| **FEAT-095** | Shorter Settings list | `ui-ux` | `rahul` | `rahul` | Shipped in commit 6c802ed (v3.40.1). ADR 232. Root groups are profile, this trip, notifications, appearance, data, help, and account. No new flag. |
| **FEAT-096** | App-wide UI/UX revamp and motion polish (v3.41.0) | `ui-ux` | `rahul` | `claude-cli` | Shipped in commit 94071b0 (v3.41.0). ADRs 235-239. Flags (default ON): enableMotionPolish, enableCompactSummary, enableCompactExpenseForm, enableQuickTripCreate, enableDestinationAutocomplete, enableCalmHaptics (Core); enableMemberMoneyRow, enableNotificationGrouping (Trip). QA steps in FEATURE_TEST_STEPS.md: UX-MOTION, UX-POLISH2, UX-POLISH3, DEST-SUGGEST, QA-0927. |
| **FEAT-097** | Pass back seat-and-gate balances | `ui-ux` | `rahul` | `rahul` | Shipped in dc59c9d (v3.42.1). |
| **FEAT-098** | Cycling destination photos on the home stack and list | `ui-ux` | `rahul` | `rahul` | Shipped in v3.43.1. ADR 246. Flag cycleDestinationCovers (Core, default ON). |
| **FEAT-099** | Simplified pass back: one balance hero | `ui-ux` | `rahul` | `claude-cli` | Shipped in commit 1cf0b67 (v3.43.3). decisions.md #248. QA steps in FEATURE_TEST_STEPS.md: PASS-STUB-SIMPLIFY. |
| **FEAT-100** | Flutter app: notifications, settings, push, feedback, version gate, accessibility and release hardening (Phases 10-12) | `native` | `claude-cli` | `claude-cli` | Shipped in commit 42ef52a (v3.46.0). Headless-verified only; device, Firebase and store checks open (see docs/flutter-migration/BACKLOG.md). |
| **FEAT-101** | Flutter app: Horizon redesign, Web platform Wasm SQLite, and Google + Superadmin auth gate | `native` | `rahul` | `rahul` | Shipped |
| **FEAT-102** | Flutter app: instant trips after sign-in, destination autocomplete, Horizon nav and Spend Insights on by default | `native` | `claude-cli` | `claude-cli` | Shipped in commit 09966ab (v3.48.2): first-sync fix, destination autocomplete, Horizon flags default ON (Core pack) |
| **FEAT-103** | Pass list sorting by time, flight leg, or traveler name (Flutter Notes tab) | `ui-ux` | `claude-cli` | `claude-cli` | Shipped in commit 7bfeccb (v3.49.0) behind enablePassSorting (Travel pack, default ON). Headless-verified only; device check pending. |
| **FEAT-104** | Flutter web-app palette, pass cards and Superadmin screen | `ui-ux` | `claude-cli` | `claude-cli` | Shipped in commit 19cb764 (v3.50.0). Headless-verified only; device check pending. |
| **FEAT-105** | Flutter Superadmin screen with single sign-on hand-off to the web Ops Deck | `admin` | `claude-cli` | `claude-cli` | Shipped in commit 1d71018 (v3.50.1). Verified on a Motorola Edge 70 Fusion; the refresh token is shared with the web app, so the Flutter session may need a new sign-in later (decision 282). |
| **FEAT-106** | Flutter Bento redesign: pastel tiles, new fonts and floating pill navigation | `ui-ux` | `claude-cli` | `claude-cli` | Shipped in commit ec6e203 (v3.51.0). Verified on a Motorola Edge 70 Fusion; side-by-side comparison with the design board still pending. |
| **FEAT-107** | Flutter: Summary tab redesign and Add expense on Summary | `ui-ux` | `claude-cli` | `claude-cli` | Shipped in commit 75d35f8 (v3.52.0): boarding-pass Summary hero, progress card, donut spend report, Add expense on Summary. Verified in tests; on-device look pending user review. |
| **FEAT-108** | Flutter: boarding-pass UI for Summary, Expenses and Passes | `ui-ux` | `claude-cli` | `claude-cli` | Shipped in commit 20249e8 (v3.54.0): boarding-pass Summary, receipt-card Expenses with category runway, boarding-pass Passes with QR stub, App settings entry inside a trip. Verified in tests and on a Motorola Edge 70 Fusion. |
| **FEAT-109** | Flutter: native Superadmin portal (overview, bug ledger, users, trips, flags, features, audit, controls, tools) | `admin` | `claude-cli` | `claude-cli` | Shipped in commit 510f2a4 (v3.55.0): the Superadmin login lands in the app; same Supabase tables and RPCs as the web Ops Deck. Installed on a Motorola Edge 70 Fusion; on-device walkthrough pending user review. |
| **FEAT-110** | Flutter: growth panels and spend analytics ported from the Ops Deck | `analytics` | `claude-cli` | `claude-cli` | Shipped in commit 510f2a4 (v3.55.0): Growth, Overview, Financial, Engagement and Health tabs; ports opsGrowthMetrics.ts and the AdminAnalyticsPage spend panels. Unit-tested on a fixed fleet. |
| **FEAT-111** | Flutter: Trips home card-stack view with destination photos and blurred backdrop | `ui-ux` | `claude-cli` | `claude-cli` | Shipped in commit 510f2a4 (v3.55.0): list / cards switch behind enableTripCardStack (Trip pack, default ON); swipe right to open, left to skip, long-press menu; photo from cover or destination. |
| **FEAT-112** | Flutter: boarding-gate login screen | `ui-ux` | `claude-cli` | `claude-cli` | Shipped in commit adb88c7 (v3.56.0): boardingPassLogin flag in prod, always on dev/staging. |
| **FEAT-113** | Flutter: Departures card stack with runway slider and destination-first Create Trip | `ui-ux` | `claude-cli` | `claude-cli` | Shipped in commit adb88c7 (v3.56.0): behind enableTripCardStack; swipes flip the deck, tap opens, runway slider for New Trip / Join. |
| **FEAT-114** | Flutter: WhatsApp-style Settings list with search | `ui-ux` | `claude-cli` | `claude-cli` | Shipped in commit e58c883 (v3.57.0): flat list, one page per category; search behind enableSettingsSearch (Trip pack, default ON). Replaces the old page outright. |
| **FEAT-115** | Flutter: Summary and Settlement Pass polish | `ui-ux` | `claude-cli` | `claude-cli` | Shipped in commit e58c883 (v3.57.0): simpler tile, You pay / Pays you chips, own payments first, animated sections and hero amount. Replaces the old layout outright. |
| **FEAT-116** | Flutter: group-wise spend (paid and share) | `analytics` | `claude-cli` | `claude-cli` | Shipped in commit e58c883 (v3.57.0): Members / Groups switch on Who paid, behind enableGroupSpend (Trip pack, default ON). |
| **FEAT-117** | Flutter: Settle all I owe and share summary picture | `ui-ux` | `claude-cli` | `claude-cli` | Shipped in commit e58c883 (v3.57.0): behind enableSettleAll and enableShareSummaryImage (Trip pack, default ON). |
| **FEAT-118** | Flutter: day-by-day spend and device-only trip budget | `analytics` | `claude-cli` | `claude-cli` | Shipped in commit e58c883 (v3.57.0): behind enableDailyTimeline and enableTripBudget (Trip pack, default ON); the budget is not synced. |
| **FEAT-119** | Flutter: checklist category progress bars | `ui-ux` | `claude-cli` | `claude-cli` | Shipped in commit e58c883 (v3.57.0): behind enableChecklistCategoryProgress (Trip pack, default ON). |
| **FEAT-120** | Flutter: trip cards show members and your money, trips grouped by phase | `ui-ux` | `claude-cli` | `claude-cli` | Shipped in commit 87189ac (v3.58.0): behind enableTripListMoney and enableTripListSections (Trip pack, default ON). |
| **FEAT-121** | Flutter: trip header strip and Add expense speed dial | `ui-ux` | `claude-cli` | `claude-cli` | Shipped in commit 87189ac (v3.58.0): behind enableTripHeaderStrip and enableQuickAddSpeedDial (Trip pack, default ON). |
| **FEAT-122** | Flutter: Summary next action and Notes quick capture | `ui-ux` | `claude-cli` | `claude-cli` | Shipped in commit 87189ac (v3.58.0): behind enableSummaryNextAction and enableNotesQuickCapture (Trip pack, default ON). |
| **FEAT-123** | Flutter: one-time coach hints | `ui-ux` | `claude-cli` | `claude-cli` | Shipped in commit 87189ac (v3.58.0): behind enableCoachHints (Trip pack, default ON); dismissed tips are remembered on the device. |
| **FEAT-124** | Flutter: settlement Group view / Person view for every member | `ui-ux` | `claude-cli` | `claude-cli` | Shipped in commit 87189ac (v3.58.0): behind enableSettlementViewSwitch (Trip pack, default ON); per-viewer view state, balances unchanged. |
| **FEAT-125** | Flutter: compact Trips list with hero card, pinned sections and overview line | `ui-ux` | `claude-cli` | `claude-cli` | Shipped in commit 561a2c1 (v3.59.0): compact rows with thumbnails, status and money; photo hero for the trip happening now; pinned Happening now / Upcoming / Past headers; overview line behind enableTripsOverview (Trip pack, default ON). |
| **FEAT-126** | Flutter: Plan and suggestions card and redesigned Trip numbers | `analytics` | `claude-cli` | `claude-cli` | Shipped in commit 561a2c1 (v3.59.0): budget pace, daily allowance and up to three tips behind enableTripSuggestions (Trip pack, default ON); analytics reordered. |
| **FEAT-127** | Flutter: one Groups / People switch for the Summary | `ui-ux` | `claude-cli` | `claude-cli` | Shipped in commit 561a2c1 (v3.59.0): a single switch drives Who pays whom and Who paid; the duplicate switch in Who paid is removed. |
| **FEAT-128** | Flutter: Trips as destination-photo tiles with a Grid / List switch, pins and search inside trips | `ui-ux` | `claude-cli` | `claude-cli` | Shipped in commit e14a650 (v3.60.0): behind enableTripGridTiles, enableTripPins, enableGlobalSearch (Trip pack, default ON). |
| **FEAT-129** | Flutter: first-run tour, sample trip and Updated caption with pull to refresh | `ui-ux` | `claude-cli` | `claude-cli` | Shipped in commit e14a650 (v3.60.0): behind enableFirstRunTour and enableLastSyncedCaption (Trip pack, default ON). |
| **FEAT-130** | Flutter: cover photo band, saved/syncing line, trip switcher and accent colour inside a trip | `ui-ux` | `claude-cli` | `claude-cli` | Shipped in commit e14a650 (v3.60.0): behind enableTripCoverHeader, enableSyncLine, enableTripSwitcher, enableTripAccent (Trip pack, default ON). |
| **FEAT-131** | Flutter: Today card, wrap-up prompt, spend ring, receipt gallery and Collapse Trip numbers | `analytics` | `claude-cli` | `claude-cli` | Shipped in commit e14a650 (v3.60.0): behind enableTodayCard, enableCloseoutPrompt, enableSpendRing, enableReceiptGallery, enableSummaryCollapse (Trip pack, default ON). |
| **FEAT-132** | Flutter: amount keypad, smart expense defaults and Confirm on notifications | `ui-ux` | `claude-cli` | `claude-cli` | Shipped in commit e14a650 (v3.60.0): behind enableAmountKeypad, enableSmartExpenseDefaults, enableNotificationActions (Trip pack, default ON). |
| **FEAT-133** | Flutter: sound feedback, Reduce motion, notification day groups and rolling hero numbers | `ui-ux` | `claude-cli` | `claude-cli` | Shipped in commit e14a650 (v3.60.0): behind enableFeedbackPack, enableReduceMotion, enableNotificationDayGroups (Trip pack, default ON); photos are now kept on the device. |
| **FEAT-134** | Flutter: Trip numbers tabs and a single Groups/Members switch | `ui-ux` | `claude-cli` | `claude-cli` | Shipped in commit b903b73 (v3.61.0): headline strip plus Categories/People/Days/Details tabs; top switch removed. |
| **FEAT-135** | Flutter: settled celebration and round-amount settling | `ui-ux` | `claude-cli` | `claude-cli` | Shipped in commit b903b73 (v3.61.0): behind enableSettledCelebration, enableSettleRounding (Trip pack, default ON). |
| **FEAT-136** | Flutter: app icon shortcuts, expense history and pending-sync dots | `ui-ux` | `claude-cli` | `claude-cli` | Shipped in commit b903b73 (v3.61.0): behind enableAppShortcuts, enableExpenseHistory, enablePendingDots (Trip pack, default ON). |
| **FEAT-137** | Flutter: trip templates, two-pane Summary, invite picture and quick-filter chips | `ui-ux` | `claude-cli` | `claude-cli` | Shipped in commit b903b73 (v3.61.0): behind enableTripTemplates, enableSummaryTwoPane, enableInviteCard, enableExpenseQuickFilterChips (Trip pack, default ON). |
| **FEAT-138** | Flutter: bug reports and suggestions work offline | `ui-ux` | `claude-cli` | `claude-cli` | Shipped in commit b903b73 (v3.61.0): behind enableOfflineFeedback (Trip pack, default ON); queued on the device and sent on reconnect. |
| **FEAT-139** | Flutter: personal expenses left out of trip totals and settlement | `ui-ux` | `claude-cli` | `claude-cli` | Shipped in commit 7dc8912 (v3.62.0): behind enableExpenseExclusion (Trip pack, default ON). |
| **FEAT-140** | Flutter: switch trips from the top-bar trip name | `ui-ux` | `claude-cli` | `claude-cli` | Shipped in commit 7dc8912 (v3.62.0): behind enableTripSwitcher (reworded); arrows and strip swipe removed. |
| **FEAT-141** | Flutter: undo for recorded payments and Settle all | `ui-ux` | `claude-cli` | `claude-cli` | Shipped in commit 7dc8912 (v3.62.0): behind enableUndoSettlement (Trip pack, default ON). |
| **FEAT-142** | Flutter: saved expense filters as one-tap chips | `ui-ux` | `claude-cli` | `claude-cli` | Shipped in commit 7dc8912 (v3.62.0): behind enableSavedFilters (Trip pack, default ON); swipe right toggles Personal. |
| **FEAT-143** | Flutter: clean trip top bar, no banner or status row | `ui-ux` | `claude-cli` | `claude-cli` | Shipped in commit b25ff7b (v3.63.0): behind enableCleanTopBar (Trip pack); enableTripCoverHeader and enableTripHeaderStrip moved to Labs OFF; sync icon only when needed. |
| **FEAT-144** | Flutter: quick action buttons, Summary focus and jump to today | `ui-ux` | `claude-cli` | `claude-cli` | Shipped in commit b25ff7b (v3.63.0): behind enableContextFab, enableSummaryFocus, enableJumpToToday (Trip pack, default ON). |
| **FEAT-145** | Flutter: quick amount chips, friendly empty states and skeleton loaders | `ui-ux` | `claude-cli` | `claude-cli` | Shipped in commit b25ff7b (v3.63.0): behind enableQuickAmounts, enableCoachEmptyStates, enableSkeletonLoaders (Trip pack, default ON). |
| **FEAT-146** | Flutter: high contrast, haptics setting, consistent sheets and Who paid labels | `ui-ux` | `claude-cli` | `claude-cli` | Shipped in commit b25ff7b (v3.63.0): behind enableHighContrast, enableHapticsSetting (Trip pack, default ON); Their part wording replaces Share. |
| **FEAT-147** | Flutter: You paid vs your share strip on Balances | `ui-ux` | `claude-cli` | `claude-cli` | Shipped in commit 0e14556 (v3.65.0): behind enableYouPaidVsShare (Trip pack, default ON); replaces the To receive / To pay tiles. |
| **FEAT-148** | Flutter: balance explainer sheet | `ui-ux` | `claude-cli` | `claude-cli` | Shipped in commit 0e14556 (v3.65.0): behind enableBalanceExplainer (Trip pack, default ON); tap the strip to list expenses where paid differs from share. |
| **FEAT-149** | Flutter: saved-offline message on expense save | `ui-ux` | `claude-cli` | `claude-cli` | Shipped in commit 0e14556 (v3.65.0): behind enableSavedOfflineToast (Trip pack, default ON). |
| **FEAT-150** | Flutter: tidy Expenses tab rows and day headers | `ui-ux` | `claude-cli` | `claude-cli` | Shipped in commit 4ea2901 (v3.66.0): behind enableTidyExpenses (Trip pack, default ON). |
| **FEAT-151** | Flutter: Notes cards with pin, delete and Undo | `ui-ux` | `claude-cli` | `claude-cli` | Shipped in commit 4ea2901 (v3.66.0): behind enableTidyNotes (Trip pack, default ON). |
| **FEAT-152** | Flutter: tidy Members tiles with role and balance chips and search | `ui-ux` | `claude-cli` | `claude-cli` | Shipped in commit 4ea2901 (v3.66.0): behind enableTidyMembers (Trip pack, default ON). |
| **FEAT-153** | Flutter: edit and delete travel passes | `ui-ux` | `claude-cli` | `claude-cli` | Shipped in commit 4ea2901 (v3.66.0): behind enablePassEditDelete (Trip pack, default ON). |
| **FEAT-154** | Flutter: one-page Settings with Haptics levels, Storage and Data, Archived Trips | `ui-ux` | `claude-cli` | `claude-cli` | Shipped in commit c2a39dd (v3.67.0): behind enableSettingsDataHub (Trip pack, default ON); reuses enableGeotagging, enableDataSaverMode, enableDemoSeeding, enableHapticsSetting. |
| **FEAT-155** | Flutter: trip header actions sheet, Edit Trip popup, members and expenses chip, stops picker | `ui-ux` | `claude-cli` | `claude-cli` | Shipped in commit c2a39dd (v3.67.0): behind enableTripHeaderActions (Trip pack, default ON). |
| **FEAT-156** | Flutter: Summary chips, close-out banner, Custom amount, Remind, How it works, At a Glance | `ui-ux` | `claude-cli` | `claude-cli` | Shipped in commit c2a39dd (v3.67.0): behind enableSummaryUpgrades (Trip pack, default ON). |
| **FEAT-157** | Flutter: clean trip header and Edit Trip in the menu | `ui-ux` | `claude-cli` | `claude-cli` | Shipped in commit cfd2363 (v3.68.0): behind enableTripHeaderActions. |
| **FEAT-158** | Flutter: select and delete several passes | `ui-ux` | `claude-cli` | `claude-cli` | Shipped in commit cfd2363 (v3.68.0): behind enablePassEditDelete. |
| **FEAT-159** | Flutter: web-style Expenses filters page | `ui-ux` | `claude-cli` | `claude-cli` | Shipped in commit cfd2363 (v3.68.0): behind no flag, restyle. |
| **FEAT-160** | Flutter: Summary mini pass pinned on scroll | `ui-ux` | `claude-cli` | `claude-cli` | Shipped in commit cfd2363 (v3.68.0): behind enableSummaryUpgrades. |
| **FEAT-161** | Flutter: settlement pass flips to show You paid and Your share | `ui-ux` | `claude-cli` | `claude-cli` | Shipped in commit cfd2363 (v3.68.0): behind enableYouPaidVsShare. |
| **FEAT-162** | Flutter: Voice add expense with real speech recognition | `ui-ux` | `claude-cli` | `claude-cli` | Shipped in commit cfd2363 (v3.68.0): behind enableVoiceInput. |
| **FEAT-163** | Flutter: Edit Trip takes one destination box per place | `ui-ux` | `claude-cli` | `claude-cli` | Shipped in commit 036887f (v3.68.2): behind enableTripHeaderActions. |
| **FEAT-164** | Flutter: clearer trip header line | `ui-ux` | `claude-cli` | `claude-cli` | Shipped in commit b18b0eb (v3.68.3): behind enableTripHeaderActions. |
| **FEAT-165** | Flutter: close-out card hidden once the trip is settled | `ui-ux` | `claude-cli` | `claude-cli` | Shipped in commit b18b0eb (v3.68.3): behind enableCloseoutPrompt. |
| **FEAT-166** | Flutter: Confirm received button on settlement history rows | `ui-ux` | `claude-cli` | `claude-cli` | Shipped in commit b18b0eb (v3.68.3): behind enableSettlementConfirmation. |
| **FEAT-168** | Compass trip bar, Trip hub and blank-trip start card (v3.72.0) | `ui-ux` | `claude-cli` | `claude-cli` | Shipped in commit e7373a7 (v3.72.0), all six flags default ON |
| **FEAT-169** | Compass Activity tab with filters, Trip-tab menu (v3.73.0) | `ui-ux` | `claude-cli` | `claude-cli` | Shipped in commit ac91dcb (v3.73.0) |
| **FEAT-170** | Compass follow-ups: Balances settle bar, Spend chips, Activity actions (v3.74.0) | `ui-ux` | `claude-cli` | `claude-cli` | Shipped in commit 4953f9b (v3.74.0), reuses Compass flags default ON |
| **FEAT-171** | Compass chat, notes, checklist, settle sheet, calm Balances (v3.75.0) | `ui-ux` | `claude-cli` | `claude-cli` | Shipped in commit a9da495 (v3.75.0), flag enableCompassTripPages default ON |
| **FEAT-172** | Receipt scan, chat reactions, trip polls, guest join (v3.76.0) | `ui-ux` | `claude-cli` | `claude-cli` | Shipped in commit f3df4c0 (v3.76.0); polls and guest flags default ON, reactions flag unchanged (OFF) |

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
