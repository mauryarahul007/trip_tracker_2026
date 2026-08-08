# Trip Tracker — Comprehensive Build Plan

## Confirmed Requirements

- Web app **and** mobile app.
- Single currency now. Multi-currency added later.
- Expense entry asks **date** and **category**.
- Data stored locally. Cloud sync later.
- Members can be **single** or **couple**.
- Split logic must respect couple vs single.
- Expense chart, Excel export, analytics page.

### Locked Decisions

- **PWA first.** One codebase, web and mobile. Native later if needed.
- **Categories user-editable.** Presets plus custom.
- **No receipt photos.** Skipped by design.
- **Auto Group Name Logic.** Group names are automatically formatted based on selected members (e.g. `A & B`, `A, B & C`) with support for custom names.
- **Default Expense Date.** Today's local system date is selected by default when adding a new expense.

---

## 1. Architecture Strategy

**PWA first. Confirmed.** One codebase, web and mobile.

- Installable web app. Add to home screen.
- Opens fullscreen. Works offline.
- Ship instantly. Update instantly.
- No app store needed at start.
- Go native later only if required.

Shared logic layer:
- Data models identical across platforms.
- Split engine is pure functions. Reusable everywhere.
- Storage adapter abstracts local vs cloud.
- Clean path to native later. Nothing thrown away.

---

## 2. Tech Stack

- **UI:** React + Vite. PWA config (service worker, manifest).
- **State:** Zustand or Redux Toolkit.
- **Storage now:** IndexedDB via localForage.
- **Storage adapter:** single interface, swappable backend.
- **Charts:** Recharts.
- **Excel export:** SheetJS (xlsx).
- **Currency later:** exchange rate API + rate cache.
- **Cloud later:** Firebase or Supabase.

---

## 3. Data Model

### Trip
- id, name, startDate, endDate.
- baseCurrency (single for now).
- memberIds.
- createdAt, updatedAt.

### Member
- id, name.
- type: `single` or `couple`.
- headCount: 1 or 2.
- partnerName (couples only).
- defaultWeight (editable).

### Expense
- id, tripId, title.
- amount, currency.
- category (required).
- date (required, asked at entry).
- paidBy (memberId or multiple).
- splitMode, splitConfig.
- resolvedShares (locked at save time).
- createdAt, updatedAt.

### Settlement
- id, tripId.
- fromMember, toMember, amount.
- settled: true/false.
- settledAt.

### Category (user-editable)
- Presets seeded: Food, Stay, Travel, Activities, Shopping, Misc.
- User can add, rename, delete, reorder.
- id, name, icon (optional), isCustom.

---

## 4. Division Logic (Core)

Couples are the key variable. Five split modes.

1. **Equal by head** — couple counts as 2. Default.
2. **Equal by unit** — couple counts as 1.
3. **Custom shares** — weight per member.
4. **Exact amounts** — fixed money each.
5. **Percentage** — percent each.

### Rules
- Every member has a share weight.
- Single default weight = 1.
- Couple default weight = 2. Toggle to 1.
- Members can be excluded per expense.
- Payer treated as one unit, even if couple.
- Store **resolvedShares**, not just the mode.
- Editing members later won't corrupt old expenses.

### Settlement Engine
- Compute net balance per member.
- Minimize number of transactions.
- Output clear "who pays whom" list.
- Round smartly. Leftover paise to payer.
- Totals must always match exactly.

---

## 5. Pages / Screens

1. **Trips list** — create, open, delete, restore.
2. **Trip detail** — members, expenses, balances.
3. **Manage members** — add single or couple.
4. **Add expense** — title, amount, **date**, **category**, payer, split picker.
5. **Charts** — spend by category, member, over time.
6. **Analytics** — top categories, biggest spender, per-head cost.
7. **Settlements** — who owes whom, mark settled.
8. **Export** — Excel of expenses and settlements.
9. **Categories** — add, rename, delete, reorder.
10. **Settings** — backup, restore, currency (later).

---

## 6. Expense Entry Flow

On add expense, always ask:
- Title.
- Amount.
- **Date** (defaults to today, editable).
- **Category** (mandatory pick).
- Paid by (member).
- Split mode + config.

Validate before save. Lock resolved shares.

---

## 7. Analytics Page

- Total trip spend.
- Spend by category (bar or pie).
- Spend by member.
- Per-head cost (couples split fairly).
- Biggest single expense.
- Top spend category highlighted.
- Daily spend trend line.

---

## 8. Excel Export

Sheets included:
- **Expenses** — all fields, one row each.
- **By member** — totals paid and owed.
- **By category** — category totals.
- **Settlements** — who pays whom.
- **Summary** — trip totals, per-head cost.

One file. One tap. Download to device.

---

## 9. Build Phases

- **Phase 1** — Trips, members, expenses. Local storage.
- **Phase 2** — Split logic + settlement engine.
- **Phase 3** — Charts + analytics.
- **Phase 4** — Excel export.
- **Phase 5** — PWA packaging (manifest, service worker, installable).
- **Phase 6** — Backup, restore, polish, edge cases.
- **Phase 7** — Multi-currency support.
- **Phase 8** — Cloud sync + multi-device.

---

## 10. Multi-Currency (Later Phase)

- Each expense keeps its own currency.
- Store exchange rate at entry time.
- Convert to trip base currency for totals.
- Cache rates. Allow manual override.
- Analytics always show base currency.

---

## 11. Cloud Sync (Later Phase)

- Storage adapter already abstracts this.
- Add auth (email or Google).
- Sync trips across devices.
- Conflict resolution: last write wins first.
- Offline-first. Sync on reconnect.

---

## Top 10 Recommendations

1. **Store split as resolved shares.** Editing members later won't break old expenses.
2. **Add settled flag per settlement.** Track who already paid back.
3. **Support multi-payer expenses.** Two people cover one bill.
4. **Keep an audit log.** Timestamp every edit. Trust matters with money.
5. **Round smartly.** Leftover paise to payer. Totals must match.
6. **Backup and restore (JSON).** Local storage clears easily. Protect data.
7. **Per-head analytics.** Couples want per-person view, not per-unit.
8. **Category mandatory.** Powers all analytics. Force it at entry.
9. **Undo delete.** Give a safety net for accidental taps.
10. **Mobile-first layout.** People add expenses on the trip, on phones.

---

## Resolved Decisions

- PWA first. Native later if needed.
- Categories user-editable. Presets seeded.
- No receipt photos.

Plan approved. Build not started yet.
Next step: Phase 1 on your go.

---

## Architecture, Gaps & Security Audit

### 1. Diagrams

#### System Architecture
```
  [Mobile / Web UI (PWA)]
         │
         ▼
  [Zustand State Store] ◀──▶ [Split Engine (Pure Utility)]
         │
         ▼
  [Storage Adapter (localForage)]
         │
         ▼
  [IndexedDB Database (Offline Browser Storage)]
```

#### Data Flow & Shadow Paths (Add Expense)
```
  INPUT (Title, Amount, Date, Category, Payer, SplitMode)
    │
    ▼
  [VALIDATION] ────▶ [Empty/Nil Title?] ──▶ Fallback to "Untitled Expense"
    │          ────▶ [Amount <= 0?]     ──▶ Block (Toast Warning)
    │          ────▶ [Date Invalid?]    ──▶ Fallback to Current Date
    │          ────▶ [Category Empty?]  ──▶ Block (Toast Warning)
    ▼
  [TRANSFORM] ──▶ Calculate shares based on SplitMode & Weights
    │
    ▼
  [PERSIST] ────▶ Write to IndexedDB ──▶ [QuotaExceeded / SecurityError?]
    │                                             │
    │                                             ▼
    │                                     [RESCUE] ──▶ Warning Toast & Keep Form Open
    ▼
  [OUTPUT] ─────▶ UI updates charts, tables, and balances
```

#### State Machine (Trip States)
```
  [ Greenfield ] ──▶ [ ACTIVE ] ──▶ [ ARCHIVED ]
                        │
                        ├─▶ Add Member
                        ├─▶ Add/Edit Expense ──▶ Recalculate Balances
                        └─▶ Settle Expense
```

#### Error Flow (Storage Write Failure)
```
  [ Operation: Write to DB ]
              │
              ├──▶ Success ──▶ [ Done ]
              │
              └──▶ QuotaExceededError / SecurityError
                            │
                            ▼
                    [ Log warning ]
                            │
                            ▼
                  [ Show Warning Toast ]
                            │
                            ▼
               [ Keep Edit Form Active ]
```

### 2. NOT in Scope
- **Receipt Photo OCR**: Explicitly skipped to focus on fast manual offline entries.
- **Automatic Cloud Sync**: Deferred to later phases to keep phase 1 lightweight and local-only.

### 3. What Already Exists
- Greenfield project. No existing code, but standard PWA templates and styling conventions from our global skills will be reused.

### 4. Dream State Delta
- **Current**: No code or files.
- **This Plan**: Local-only functional PWA with Category Charts, Excel Export, and Couples Split logic.
- **12-Month Ideal**: Multi-currency offline PWA synced to a cloud database (Supabase/Firebase) with real-time push updates.

### 5. Error & Rescue Registry
| METHOD/CODEPATH | WHAT CAN GO WRONG | EXCEPTION CLASS | RESCUED? | RESCUE ACTION | USER SEES |
|---|---|---|---|---|---|
| `StorageAdapter#save` | Storage full | `QuotaExceededError` | Y | Toast warning, keep form open | "Storage full. Clean up device space." |
| `StorageAdapter#save` | Private mode blocking | `SecurityError` | Y | Toast warning, request storage access | "Storage blocked by browser private mode." |
| `SheetJS#export` | Large dataset OOM | `OutOfMemoryError` | Y | Catch and show alert | "Export failed due to size limit." |
| `SheetJS#export` | Write blocked | `WritePermissionError` | Y | Alert with instructions | "Browser blocked spreadsheet download." |
| `Chart#render` | Invalid data | `TypeError` | Y (Error Boundary) | Render fallback component | "Chart failed to load." |

### 6. Failure Modes Registry
| CODEPATH | FAILURE MODE | RESCUED? | TEST? | USER SEES? | LOGGED? |
|---|---|---|---|---|---|
| Service Worker | Aggressive caching blocks update | Y | Y | "New version available. Reload." | Y |
| Member Deletion | Deleting payer in existing expense | Y | Y | Hidden from new forms, kept in math | Y |
| Excel Export | Formula injection in title | Y | Y | Clean text values (prefix with `'`) | Y |

### 7. Scope Expansion Decisions
- **Mode selected**: SELECTIVE_EXPANSION
- **Accepted**: None (User skipped cherry-picks; proceeding with standard plan baseline).
- **Deferred to `TODOS.md`**: Dynamic UPI QR codes, Shareable PDF summaries, Split presets, Offline write queue.

### 8. Implementation Tasks
- [ ] **T1 (P1, human: ~1h / CC: ~10min)** — PWA Lifecycle — Implement service worker update listener with refresh toast UI.
  - Surfaced by: Section 1 (Architecture Review)
  - Files: `src/main.tsx`, `vite.config.ts`
  - Verify: Run build, trigger manual SW update in devtools.
- [ ] **T2 (P1, human: ~1h / CC: ~10min)** — Storage Layer — Wrap localForage calls in try-catch and display write-error notifications.
  - Surfaced by: Section 1 (Architecture Review)
  - Files: `src/services/storage.ts`
  - Verify: Simulate full storage write failure in devtools.
- [ ] **T3 (P2, human: ~0.5h / CC: ~5min)** — UI Stability — Build React Error Boundary component and wrap Recharts chart views.
  - Surfaced by: Section 2 (Error & Rescue Map)
  - Files: `src/components/ErrorBoundary.tsx`, `src/pages/Analytics.tsx`
  - Verify: Render chart with invalid data.
- [ ] **T4 (P2, human: ~0.5h / CC: ~5min)** — Security — Sanitize string cells in Excel export starting with `=`, `+`, `-`, `@`.
  - Surfaced by: Section 3 (Security Review)
  - Files: `src/utils/export.ts`
  - Verify: Export expense titled `=SUM(1,2)` and verify it imports as plain text `'=SUM(1,2)`.
- [ ] **T5 (P1, human: ~1.5h / CC: ~15min)** — Data Integrity — Add `archived` state to Member model and hide archived members from new inputs.
  - Surfaced by: Section 4 (Data Edge Cases)
  - Files: `src/types/index.ts`, `src/store/tripStore.ts`
  - Verify: Delete a member with expenses, verify they remain in totals but are absent in new payer lists.
- [ ] **T6 (P2, human: ~1h / CC: ~10min)** — Debuggability — Add JSON database Export/Import buttons in Settings screen.
  - Surfaced by: Section 8 (Observability)
  - Files: `src/pages/Settings.tsx`, `src/utils/backup.ts`
  - Verify: Export backup, clear IndexedDB, import backup, verify complete data restore.

---

## GSTACK REVIEW REPORT

| Metric | Value |
|---|---|
| Review | plan-ceo-review |
| Runs | 1 |
| Last Run | 2026-08-08 13:25 |
| Mode | SELECTIVE_EXPANSION |
| Gaps Found | 6 |
| Critical Gaps | 0 |
| Status | clean |

**VERDICT: APPROVED WITH CONCERNS**

The Trip Tracker plan is strong and well-targeted as a PWA-first local expense splitting application. The architecture is sound. However, we have identified 6 architectural and security gaps (aggressive service worker cache lock, storage quota limits, missing chart error boundaries, Excel injection, member deletion, and lack of offline backups) that must be addressed during Phase 1. Six tasks have been added to the build plan to resolve these concerns.

NO UNRESOLVED DECISIONS
