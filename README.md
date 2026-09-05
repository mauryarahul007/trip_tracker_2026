# Trip Tracker 2026

A **mobile-first, offline-capable, multi-user** trip-expense splitter. Create a trip, invite friends with a join code, log expenses with flexible split modes, and see who owes whom in real time — synced across every device via Supabase, with a native Android/iOS app and an installable web PWA sharing the same codebase.

[![Live App](https://img.shields.io/badge/Live-trip--tracker-blue)](https://mauryarahul007.github.io/trip_tracker_2026/)
[![Tech](https://img.shields.io/badge/Stack-React%2019%20%2B%20Supabase%20%2B%20Vite-blueviolet)](https://vitejs.dev/)

---

## What it does

### Trips & expenses
- **Cloud-synced trips** — Supabase Postgres backend with Row Level Security; every member sees live updates on every device
- **Join by code** — share a 6-character code (or a link) to bring someone into a trip, no account required to view
- **Member & group management** — add members, create named groups (couples, kids, etc.) for one-tap split selection
- **Expense recording** — 4 split modes: equal, weighted, exact amount, or percentage, with live running-total feedback as you type
- **Receipt photos** — attach a photo to any expense, compressed client-side, with offline-safe local caching until it syncs
- **Trip Journey Map** — MapLibre-powered map plotting geotagged expenses along the trip route
- **Search & filter** — find expenses by title, category, member, or date range
- **Custom categories** — built-ins plus your own, with a click-to-pick emoji icon
- **Soft-delete recycle bin** — deleted expenses are recoverable, not gone
- **Settlement engine** — greedy algorithm minimizes the number of transfers needed to settle all debts
- **Charts & analytics** — spending breakdown by category, per-member contribution overview
- **Export to Excel-compatible CSV** — expenses, net balances, and settlement plan in one file
- **Backup & restore** — full JSON export/import for data portability

### Account & privacy
- **Email/password auth** with password reset, backed by Supabase Auth
- **Privacy Blind Mode** — one tap blurs every amount on screen (balances, expenses, analytics) for shoulder-surf-proof viewing
- **Trip freeze** — lock a settled trip against further edits

### Real-time & offline
- **Push + in-app notifications** — expense added/edited, member joined, trip deleted, settlement reminders, delivered via native push (iOS/Android) and an in-app foreground banner, with a WhatsApp-style notification center
- **Offline-first PWA** — installable, works without a connection (service worker with stale-while-revalidate caching + local receipt queue), auto-syncs on reconnect
- **Live web updates** — the deployed web app self-updates in the background with an update-available banner, no app-store round trip

### Native apps
- **Capacitor-based Android & iOS builds** sharing 100% of the web codebase — native camera, geolocation, push notifications, and haptics
- Built via Codemagic (manually triggered — see [Native app builds](#native-app-builds-codemagic) below)

### Trust & safety
- **Report a Problem** — any user can file a bug report (with an auto-captured diagnostic snapshot: device info, sync queue state, recent console activity) straight from Settings
- **Suggest a Feature** — a lighter-weight companion to Report a Problem, flag-gated (off by default, superadmin turns it on globally, per-trip, or for one person)
- **Superadmin Ops Deck** — a code-split, mobile-friendly admin portal (see [`superadmin.md`](superadmin.md)) with 7 sections: Flags, fleet Analytics, Trips directory, Users (suspend/broadcast), a security Audit log, the Feature request tracker, and system Tools — all Supabase-backed and synced across every device, with CLIs (`npm run bug`, `npm run feature`) for filing/resolving from the terminal
- **Security hardening** — RLS on every table, join-code rate limiting, Cloudflare Turnstile + honeypot anti-bot defenses, DB-level constraints, audit logging, and a locked-down CSP (see [Security reference](docs/reference-security-and-anti-bot-defense.md))

---

## Quick start

```bash
# Install dependencies
npm install

# Start the dev server (opens at http://localhost:5173)
npm run dev

# Build for production
npm run build

# Run tests
npm test
```

A `.env` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` is required for cloud sync, auth, and notifications. Without it, the app falls back to local-only demo mode (no login, localStorage-backed) for offline development.

### First use

1. Open the app, sign up or log in
2. Click **+ New Trip**, add a name, dates, and currency (default: INR)
3. Share the trip's join code (or link) so others can join
4. Switch to the **Members & Groups** tab and add all travelers
5. Go back to **Expenses** and tap **+ Add Expense**
6. Check **Balances & Settlements** to see who pays whom

---

## Project structure

```
src/
├── types/                    # TypeScript interfaces (Trip, Member, Expense, Bug, etc.) + database.ts (Supabase schema mirror)
├── store/
│   ├── tripStore.ts           # Zustand global trip/expense state + actions
│   ├── authStore.ts           # Session, login/signup/reset, superadmin identity
│   ├── notificationsStore.ts  # Notification center state
│   └── privacyStore.ts        # Blind Mode toggle
├── services/
│   ├── supabaseClient.ts      # Supabase client + isMissingSupabaseEnv fallback flag
│   ├── tripApi.ts             # Trip/expense/member CRUD + fleet-wide admin fetches
│   ├── bugApi.ts / featureApi.ts   # Bug Ledger / Feature Tracker CRUD (RPC-based for RLS-safe user submissions)
│   ├── featureFlagApi.ts      # Cross-device feature flag get/set (migration 0064)
│   ├── notificationsApi.ts    # Notification fetch/mark-read
│   ├── pushApi.ts / pushRegistration.ts  # Native push token registration
│   ├── offlineReceiptStore.ts # IndexedDB queue for receipts captured offline
│   └── serviceWorker*.ts      # SW registration + update detection
├── utils/                    # settlement algorithm, CSV export, image compression, haptics,
│                              # diagnostic snapshotting, geolocation, currency, feature flags…
├── components/
│   ├── TripsListScreen.tsx        # Home: trip list + create/edit trip form
│   ├── LoginScreen / ResetPasswordScreen / JoinTripScreen / RequireAuth
│   ├── ExpenseForm / ExpenseList / ExpenseReviewModal
│   ├── BalancesSettlements.tsx     # Balances panel + settlement actions
│   ├── MembersGroupsTab.tsx
│   ├── AnalyticsTab.tsx / TripJourneyMap.tsx
│   ├── SettingsView.tsx / SettingsTab.tsx / GlobalSettingsModal.tsx   # WhatsApp-style subscreen nav
│   ├── BugReportModal.tsx / FeatureRequestModal.tsx   # Report a Problem / Suggest a Feature
│   ├── SuperAdminBugTracker.tsx / SuperadminAuthModal.tsx
│   ├── admin/                      # Code-split superadmin Ops Deck — see superadmin.md
│   │   ├── AdminPortalLayout.tsx   # Shell, section nav, mobile header switcher
│   │   └── AdminFlagsPage / AdminAnalyticsPage / AdminTripsPage / AdminUsersPage /
│   │       AdminAuditPage / AdminFeaturesPage / AdminToolsPage
│   ├── NotificationsPanel.tsx / NotificationsBellButton.tsx / InAppNotificationBanner.tsx
│   ├── ShareTripModal.tsx / TurnstileWidget.tsx
│   ├── ConfirmDialog.tsx           # Reusable confirm modal (2- or 3-way choice)
│   ├── UndoToasts.tsx / UpdateBanner.tsx / SwipeableRow.tsx / ErrorBoundary.tsx
│   └── NavTabs.tsx                 # Floating frosted-glass pill tab bar
└── index.css                 # Design system (CSS variables, component classes)

android/ ios/                 # Capacitor native shells
supabase/migrations/          # Ordered SQL migrations (schema, RLS, RPCs)
scripts/bug.mjs / feature.mjs # CLIs: add/list/resolve-or-ship, synced to Supabase + BUGS.md/FEATURES.md
public/
├── manifest.json              # PWA manifest
└── sw.js                      # Service worker (stale-while-revalidate)
```

---

## Documentation

| Doc | What it covers |
|-----|----------------|
| [Superadmin Architecture](superadmin.md) | Ops Deck sections, real auth flow, file map |
| [Getting Started Tutorial](docs/tutorial-getting-started.md) | From install to your first settled trip |
| [How to Record an Expense](docs/howto-record-expense.md) | Choosing the right split mode, editing, undo-delete |
| [How to Create and Edit Groups](docs/howto-manage-groups.md) | Named groups for one-click split selection |
| [How to Manage Categories](docs/howto-manage-categories.md) | Adding and deleting custom expense categories |
| [How to Back Up and Restore Data](docs/howto-backup-restore.md) | Full-database JSON export/import |
| [How to Export to Excel](docs/howto-export-csv.md) | Downloading the settlement spreadsheet |
| [How to Track Bugs](docs/howto-bug-tracking.md) | Filing/resolving bugs via the CLI and the Bug Ledger |
| [How Offline Peer Sync Works](docs/howto-offline-peer-sync.md) | What syncs, what queues, and when |
| [How to Set Up Codemagic](docs/howto-codemagic-setup.md) | Native Android/iOS build pipeline setup |
| [How to Navigate and Manage Trip Stacks](docs/howto-navigate-and-manage-trip-stacks.md) | Passport card gestures, keyboard navigation, and slide launcher |
| [How to Generate and Share Trip Wrapped](docs/howto-generate-and-share-trip-wrapped.md) | Launching the story recap, custom awards, and canvas card export |
| [How to Manage Checklists and Notes](docs/howto-manage-checklists-and-notes.md) | Packing lists, travel medical gear, and 1-tap credential copying |
| [Reference: Data Model](docs/reference-data-model.md) | All types, fields, and constraints |
| [Reference: Settlement Algorithm](docs/reference-settlement.md) | How the greedy minimizer works |
| [Reference: Charts & Analytics](docs/reference-analytics.md) | Formulas behind every stat card and chart |
| [Reference: Trip Wrapped Engine](docs/reference-trip-wrapped-engine.md) | Archetype heuristics, superlatives, and canvas pipeline |
| [Reference: Command Palette](docs/reference-command-palette.md) | Cmd+K triggers, fuzzy indexing, and keyboard focus traps |
| [Reference: Gesture & Sheet System](docs/reference-gesture-and-sheet-system.md) | Snap physics, velocity thresholds, and compositor decoupling |
| [Reference: Native Shell & Haptics](docs/reference-native-shell-and-haptics.md) | Safe-area probes, visualViewport sizing, and vibration patterns |
| [Reference: Storage Layer](docs/reference-storage.md) | IndexedDB + service worker offline design |
| [Reference: Design System](docs/reference-design-system.md) | Palette, type, icons, and component patterns |
| [Reference: Data Integrity (ACID)](docs/reference-data-integrity-acid.md) | Consistency guarantees across sync/offline |
| [Reference: Security & Anti-Bot Defense](docs/reference-security-and-anti-bot-defense.md) | RLS, rate limiting, Turnstile, audit logging, CSP |
| [Explanation: Split Modes](docs/explanation-split-modes.md) | Why four split modes exist and when to use each |
| [Explanation: Settlement Design](docs/explanation-settlement-design.md) | Trade-offs in debt minimization |
| [Explanation: Mobile Compositor & WebKit Performance](docs/explanation-mobile-compositor-and-webkit-performance.md) | Metal vs Skia pipelines, WebGL stalls, and GPU translate3d |
| [Explanation: Trip Stack & Viewport Architecture](docs/explanation-trip-stack-and-viewport-architecture.md) | 3:4 card aspect ratio formula, bottom pinning, and LIFO back stack |
| [Explanation: Offline Caching](docs/explanation-offline-caching.md) | Why stale-while-revalidate, and what it trades off |
| [Explanation: Offline Peer Sync](docs/explanation-offline-peer-sync.md) | Sync model across devices/members |
| [Explanation: Navigation & Offline Fixes](docs/explanation-navigation-and-offline-fixes.md) | Hierarchical back-navigation design |
| [Explanation: Bug Tracking Architecture](docs/explanation-bug-tracking-architecture.md) | How reports flow from device to superadmin dashboard |

---

## Tech stack

| Layer | Choice | Why |
|-------|--------|-----|
| UI framework | React 19 | Component model, hooks |
| State management | Zustand 5 | Minimal boilerplate, multiple focused stores |
| Backend | Supabase (Postgres + Auth + Realtime + RLS) | Multi-user cloud sync without hand-rolled infra |
| Local persistence | IndexedDB (localforage-style) + service worker | Offline queueing, receipt caching, PWA installability |
| Native shell | Capacitor 8 | One codebase → Android + iOS, native camera/geolocation/push |
| Maps | MapLibre GL | Trip Journey Map, no vendor lock-in |
| Bot defense | Cloudflare Turnstile | Join-code and report-abuse protection |
| Bundler | Vite 8 | Fast HMR, PWA-friendly |
| Language | TypeScript ~6 | Type-safe data model for money math |
| Testing | Vitest | Unit tests across stores, utils, and services |
| Linter | oxlint | Fast Rust-based linter |

---

## Development

```bash
npm run dev       # Dev server with HMR
npm run build     # TypeScript check + Vite production build
npm run lint      # oxlint
npm test          # Vitest unit tests
npm run preview   # Preview the production build locally

npm run bug:add       # File a bug from the CLI (syncs to Supabase + BUGS.md)
npm run bug:list      # List tracked bugs
npm run bug:resolve   # Resolve a bug by ID
npm run bug:sync      # Reconcile local ledger with Supabase

npm run feature:add   # Log a feature request/shipped item (syncs to Supabase + FEATURES.md)
npm run feature:list  # List tracked features
npm run feature:ship  # Mark a feature shipped by ID
npm run feature:sync  # Reconcile local ledger with Supabase
```

---

## Data model summary

Trip/expense data is scoped per-trip in Supabase Postgres, protected by Row Level Security so a user only ever sees trips they're a member of. A local IndexedDB cache backs offline reads/writes and reconciles on reconnect.

- **Trip** — top-level container: base currency, dates, join code, `archived`/`frozen` flags
- **Member** — name + optional `archived` flag (soft delete, preserved in old expenses) and an optional `linked_user_id` once claimed by an authenticated user
- **Group** — named subset of members (e.g. "Rahul & Priya")
- **Expense** — amount, payer, split mode, `resolved_shares` (pre-computed per-member amounts), optional receipt + geotag, soft-deletable
- **Category** — emoji + label; six built-in, unlimited custom
- **Notification** — typed + parameterized (not pre-built sentences), rendered per-viewer
- **Bug** — severity/category/status, environment snapshot, repro steps, resolution notes
- **Feature** — category/status (requested → planned → in_progress → shipped/won't-do), optional link to a runtime `FeatureFlagKey`
- **Feature flag override** — global/trip/user-scoped booleans (superadmin-set, cross-device, resolved client-side by priority: user > trip > global > default)

See [Reference: Data Model](docs/reference-data-model.md) for full field-level docs.

---

## CI/CD

- **`deploy-pages.yml`** — builds and deploys the web PWA to GitHub Pages on every push to `main`
- **`deploy-ec2.yml`** — deploys to the EC2-hosted environment on every push to `main`
- **`build-android.yml`** / **`build-ios.yml`** — native builds, triggered manually or by tag only (never on a plain push to `main`)

---

## Native app builds (Codemagic)

`codemagic.yaml` defines two manually-triggered workflows: `android-release` and `ios-release`.
Before running either for the first time, in the Codemagic dashboard:

1. Create an environment variable group named `trip_tracker_secrets` containing
   `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (same values as the GitHub Actions
   `deploy-ec2` workflow secrets).
2. For Android: create an environment variable group named `android_signing` and configure
   an Android code signing identity in Codemagic's UI — this auto-populates the
   `CM_KEYSTORE_*` variables `android/app/build.gradle`'s signing config reads.
3. For iOS: add an App Store Connect API key integration named `codemagic_asc_api_key`
   (Codemagic dashboard -> Teams -> Integrations -> App Store Connect), using the Apple
   Developer account's API key.

See [How to Set Up Codemagic](docs/howto-codemagic-setup.md) for the full walkthrough.
