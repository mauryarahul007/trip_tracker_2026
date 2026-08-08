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
