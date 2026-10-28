# Add dedicated Settlements section to the Expenses (ledger) page

## Context

Superadmin flag `enableSettlementDateNote` lets users capture a date + note when settling a debt (`SettlementDateNoteFields.tsx` → `App.tsx` `handleSettle`). Once settled, the record is persisted as a normal `expenses` row with `isSettlement`/title `"Settlement: {from} ➔ {to}"` (+  `— {note}` if provided). There is no separate settlements table — it's the same `Expense` shape.

Today these settlement rows are buried: they show up mixed inside the day-grouped list on the Expenses tab (`ExpenseList.tsx`, UI-labeled "Expenses", `Tab` value `'ledger'`), styled identically to a real expense (category icon, category-color border) with no distinct "this was a settlement" treatment. The user has to know to look for the odd "Settlement:" title inside a day's expense group. There's no place to review settlement history at a glance — hence the request: give settlements their own section on this page, the same way expenses already have one.

`BalancesSettlements.tsx` (Summary tab) only shows *pending/suggested* transfers computed live from balances — not history of *completed* settlements — so it's not a duplicate of what's being added here.

## Approach

Frontend-only change, single file: `src/components/ExpenseList.tsx`. No new DB columns/migrations, no new feature flag (this section should always be visible when settlement history exists, independent of `enableSettlementDateNote` — that flag only controls whether date/note are captured at settle-time).

1. **Split actual expenses from settlements before grouping.**
   Add `groupByDay(list: Expense[])` (extract the existing day-bucket `reduce` at line ~241 into a small local function). Compute:
  - `actualDisplayed = displayedExpenses.filter(isActualExpense)`
  - `settlementsDisplayed = displayedExpenses.filter((e) => !isActualExpense(e))`
  - `dayGroups = groupByDay(actualDisplayed)`
  - `settlementGroups = groupByDay(settlementsDisplayed)`

   `isActualExpense` already exists (line 251) — reused as-is.

2. **Simplify the day-group header** now that `dayGroups` only ever contains real expenses: drop the now-dead `settlements`/`settlementsTotal` branch in the header amount pill (lines ~779–781, 842–855) since every group's total is a real-expense total.

3. **Extract the per-row JSX into a local render function** `renderExpenseRow(exp, idx, siblingCount)` (currently the inline `group.expenses.map((exp, idx) => {...~180 lines...})` body, lines 878–1062) so it can be reused for both real-expense day-groups and the new settlement day-groups without duplicating the swipe/avatar/currency-toggle/needs-review markup. Behavior unchanged — same `ConditionalSwipe`, same "no edit, only delete" rule for settlement rows (`exp.title.startsWith('Settlement:')`).

4. **Render a new "Settlements" section** after the existing day-groups block (before the "Load More" button), only when `settlementGroups.length > 0`:
  - A header row matching the existing "N days · Avg X/day" style: `"Settlements · {count}"` plus a total-settled amount pill.
  - `settlementGroups.map(...)` rendered with the same collapsible day-card pattern as the expense list, reusing `renderExpenseRow` for the rows inside.
  - Give settlement day-cards their own collapse-state key (e.g. prefix `settlement:${date}`) passed through `isDayCollapsed`/`toggleDay` so expanding a settlement day doesn't also expand/collapse an expense day that happens to share the same date.
  - Default collapsed, consistent with the existing per-day default-collapsed behavior.

5. No changes to `tripStore.ts`, `tripApi.ts`, `BalancesSettlements.tsx`, or the DB schema — this is purely a display split of data that's already fetched into `filteredExpenses`/`activeTripExpenses`.

## Files touched

- `src/components/ExpenseList.tsx` (only file changed)

## Verification

- `npm run build` / `tsc --noEmit` for type correctness.
- Manually in the running app: open a trip with both real expenses and at least one completed settlement (with `enableSettlementDateNote` on and off, to confirm note-in-title still renders either way) on the Expenses (ledger) tab:
  - Real expenses still show correctly in their existing day groups (no settlement rows mixed in anymore).
  - New "Settlements" section appears below with correct count/total, expands/collapses independently per day, rows show the same payer→payee avatars and amount as before.
  - Search/filter/date-range controls still filter both sections consistently (they operate on `filteredExpenses`, which both sections derive from).
  - Swipe-to-delete still works on a settlement row for a user with permission; edit remains disabled for settlement rows.
  - Trip with zero settlements: section doesn't render at all (no empty placeholder needed).
