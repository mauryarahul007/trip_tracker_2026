# Trip Tracker 2026

A **mobile-first, offline-first PWA** for splitting trip expenses among friends and family. Add members, record expenses with flexible split modes, track who owes whom, and settle up — all without an internet connection or an account.

[![Live App](https://img.shields.io/badge/Live-trip--tracker-blue)](https://mauryarahul007.github.io/trip_tracker_2026/)
[![Tech](https://img.shields.io/badge/Stack-React%20%2B%20Zustand%20%2B%20Vite-blueviolet)](https://vitejs.dev/)

---

## What it does

- **Trip management** — create trips with a base currency, start/end dates, and members
- **Member & group management** — add members, create named groups (couples, kids, etc.) for quick split selection
- **Expense recording** — log expenses with 4 split modes: equal, custom weight, exact amount, or percentage, with live running-total feedback as you type
- **Receipt photos** — attach an optional photo to any expense; auto-compressed client-side before it's saved
- **Search & filter** — find expenses by title, category, member, or date range; tap any balance to jump straight to that member's expenses
- **Custom categories** — six built-ins plus your own, with a click-to-pick emoji icon
- **Undo-delete** — deleting an expense, trip, or group gives you a 5-second undo window before it's gone
- **Settlement engine** — greedy algorithm minimizes the number of transfers needed to settle all debts
- **Charts & analytics** — spending breakdown by category, per-member contribution overview
- **Export to Excel-compatible CSV** — expenses, net balances, and settlement plan in one file
- **Offline PWA** — installable on mobile, works without internet (service worker + IndexedDB)
- **Backup & restore** — full JSON export/import for data portability
- **Diagnostics & storage stats** — monitor connection status and check IndexedDB disk space usage in settings
- **Factory reset** — securely wipe all data (trips, expenses, settings) from your device's browser memory
- **Quick seed demo** — load a simulated Goa road trip with mock members, custom groups, and 6 diverse expense splits to instantly try analytics and settlements

---

## Quick start

```bash
# Install dependencies
npm install

# Start the dev server (opens at http://localhost:5173)
npm run dev

# Build for production
npm run build
```

### First use

1. Open the app and click **+ New Trip**
2. Add your trip name, dates, and currency (default: INR)
3. Switch to the **Members & Groups** tab and add all travelers
4. Go back to **Expenses** and tap **+ Add Expense**
5. When you're done, check **Balances & Settlements** to see who pays whom

---

## Project structure

```
src/
├── types/index.ts          # All TypeScript interfaces (Trip, Member, Expense, etc.)
├── store/tripStore.ts      # Zustand global state + all actions (add/update/delete)
├── services/storage.ts     # IndexedDB persistence via localforage
├── utils/settlement.ts     # Greedy settlement minimization algorithm
├── utils/csvExport.ts      # Excel-compatible CSV exporter
├── utils/image.ts          # Client-side receipt photo compression
├── utils/calendar.ts       # Monthly grid generation and date operations
├── utils/dateRange.ts      # Trip date-range formatter for app header
├── utils/initials.ts       # Name avatar initial generator
├── utils/demoSeed.ts       # Goa road trip mock data seeder
├── App.tsx                 # Owns state/handlers, wires tab components together
├── components/
│   ├── TripsListScreen.tsx     # Home screen: trip list + create/edit trip form
│   ├── ExpenseForm.tsx         # Add/edit expense drawer
│   ├── ExpenseList.tsx         # Search/filter bar + expense list
│   ├── BalancesSettlements.tsx # Balances panel + settlement actions
│   ├── MembersGroupsTab.tsx    # Members & Groups tab
│   ├── AnalyticsTab.tsx        # Charts & Analytics tab
│   ├── SettingsTab.tsx         # Categories, CSV export, JSON backup/restore
│   ├── ExpenseReviewModal.tsx  # Expense detail modal
│   ├── ConfirmDialog.tsx       # Reusable confirm modal (replaces window.confirm)
│   ├── UndoToasts.tsx          # Stacked 5s undo-delete toasts
│   ├── DateRangePicker.tsx     # Custom inline calendar popover picker
│   └── NavTabs.tsx             # Bottom tab bar
└── index.css                # Design system (CSS variables, component classes)

public/
├── manifest.json           # PWA manifest
└── sw.js                   # Service worker (stale-while-revalidate caching)
```

---

## Documentation

| Doc | What it covers |
|-----|----------------|
| [Getting Started Tutorial](docs/tutorial-getting-started.md) | From install to your first settled trip |
| [How to Record an Expense](docs/howto-record-expense.md) | Choosing the right split mode, editing, undo-delete |
| [How to Create and Edit Groups](docs/howto-manage-groups.md) | Named groups for one-click split selection |
| [How to Manage Categories](docs/howto-manage-categories.md) | Adding and deleting custom expense categories |
| [How to Back Up and Restore Data](docs/howto-backup-restore.md) | Full-database JSON export/import |
| [How to Export to Excel](docs/howto-export-csv.md) | Downloading the settlement spreadsheet |
| [Reference: Data Model](docs/reference-data-model.md) | All types, fields, and constraints |
| [Reference: Settlement Algorithm](docs/reference-settlement.md) | How the greedy minimizer works |
| [Reference: Charts & Analytics](docs/reference-analytics.md) | Formulas behind every stat card and chart |
| [Reference: Storage Layer](docs/reference-storage.md) | IndexedDB + service worker offline design |
| [Reference: Design System](docs/reference-design-system.md) | Palette, type, icons, and component patterns |
| [Explanation: Split Modes](docs/explanation-split-modes.md) | Why four split modes exist and when to use each |
| [Explanation: Settlement Design](docs/explanation-settlement-design.md) | Trade-offs in debt minimization |
| [Explanation: Offline Caching](docs/explanation-offline-caching.md) | Why stale-while-revalidate, and what it trades off |

---

## Tech stack

| Layer | Choice | Why |
|-------|--------|-----|
| UI framework | React 19 | Component model, hooks |
| State management | Zustand 5 | Minimal boilerplate, single store |
| Persistence | localforage (IndexedDB) | Larger quota than localStorage, async |
| Bundler | Vite 8 | Fast HMR, PWA-friendly |
| Language | TypeScript ~6 | Type-safe data model for money math |
| Linter | oxlint | Fast Rust-based linter |

---

## Development

```bash
npm run dev       # Dev server with HMR
npm run build     # TypeScript check + Vite production build
npm run lint      # oxlint
npm run preview   # Preview the production build locally
```

---

## Data model summary

All data lives in a single Zustand store, persisted to IndexedDB as one JSON blob under the key `trip_tracker_state`.

- **Trip** — top-level container. Has `memberIds[]` and `groupIds[]`.
- **Member** — name + optional `archived` flag (soft delete, preserved in old expenses).
- **Group** — named subset of members (e.g. "Rahul & Priya").
- **Expense** — amount, payer, split mode, and `resolvedShares` (pre-computed per-member amounts).
- **Category** — emoji + label. Six built-in, unlimited custom.

See [Reference: Data Model](docs/reference-data-model.md) for full field-level docs.

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
