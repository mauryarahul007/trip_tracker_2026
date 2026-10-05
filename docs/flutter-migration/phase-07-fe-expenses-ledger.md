# Phase 7 (FE): Expenses, ledger, settlements

**Track:** Flutter UI · **Size:** XL · **Depends on:** Phases 5, 6 · **Parallel with:** 8
**Read first:** [README.md](README.md), `PARITY_MATRIX.md` (this phase's rows).

## Goal
The money core: record, edit, split, review and settle expenses with the exact numbers the web produces. This is the product's reason to exist: correctness beats polish.

## Web sources to port
`ExpenseForm` (~860+ lines), `ExpenseList`, `ExpenseFilterDrawer`, `ExpenseReviewModal`, `ExpenseSplitExplainSheet`, `SwipeableRow`, `CategoryIcon`, `BalancesSettlements`, `SettlementSummaryRow`, `SettlementHistorySection`, `SettlementDateNoteFields`, `StickyBalanceBar`, `SummaryAttentionStrip`, `FxRatesModal`, `UpiPaymentModal`, `TripCloseoutModal`, `ConflictResolverModal`, `SplitwiseImportModal`, `AnalyticsTab`, `SmartExpenseQuickAddModal` (quick/voice add: voice part in Phase 9), `FlightAddExpenseTooltip`, recycle bin (`settings/SettingsRecycleBinScreen`), category management, CSV export, `hooks/useCrossTripBalances`, `useCompactLedgerView`, `useTableDensity`.
Read: `docs/howto-record-expense.md`, `docs/explanation-split-modes.md`, `docs/explanation-settlement-design.md`, `docs/balances-settlements-collapsible.md`, `docs/expenses-tab-redesign.md`, `docs/howto-manage-categories.md`, `docs/howto-export-csv.md`, `docs/reference-analytics.md`.

## Tasks

### 7.1 Expenses tab
List grouped by day, sticky summary (`SummaryAttentionStrip`), filter drawer (payer, category, date, text, amount), search across trips (`fetchAllExpensesForTrips` parity), swipe actions (edit/delete with 5 s undo), pending-sync badge per row (outbox state), dispute/approval badges, compact vs comfortable density, empty states, pagination/virtualisation for 500+ rows (`ListView.builder`/slivers), pull to refresh.

### 7.2 Expense form (largest, most intricate)
- Fields: title, amount (**math expression input** via the Phase 5 port: `12*3+4`), currency + FX (`FxRatesModal`, per-trip config), date/time, category (quick chips + keyword suggestion), notes, photos/receipts (camera/gallery now; OCR in Phase 9; uploads via outbox), location tag (if flag), recurring/duplicate warning (`duplicateExpenseDetector`).
- **Payers:** single and multi-payer (`0104`), validation that payer amounts sum to total.
- **Splits:** equal / custom weights / exact amounts / percentages, groups as shortcuts, default exclusions (`defaultSplit`), live "who owes what" preview using the *ported* resolver; every validation message from web.
- `ExpenseSplitExplainSheet` (explain a share), edit mode, draft autosave (`expenseDraft`), last-expense shortcuts (`lastExpense`), "Add expense from flight/pass" tooltip hook.
- Approval threshold flow (`approve_expense`, role gating via `memberRoles`) and dispute flow (`flag_expense_dispute`, `resolve_expense_dispute`), including the chat event cards they emit (`chatExpenseCards` data only; chat UI in Phase 8).
- Keyboard: numeric keypad + decimal handling per locale; the form must never be covered by the keyboard on iOS (IOS_DEFECTS).

### 7.3 Ledger tab (balances & settlements)
Per-member balances, "who pays whom" (simplify-debts on/off, `updateTripSimplifyDebts`), cross-trip balances, settle-up flow (record settlement, date + note), settlement history, **confirm settlement** by receiver (`confirm_settlement`), UPI deep link / payment sheet (`upiLinks`, `UpiPaymentModal`, `url_launcher` with `canLaunchUrl` queries declared on Android/iOS `LSApplicationQueriesSchemes`), shareable settlement card (render widget → PNG via `RepaintBoundary` → `share_plus`; parity with `settlementShareCard`), collapsible sections, sticky balance bar.
- Trip close-out (`TripCloseoutModal`, freeze/close semantics, `recordTripCloseoutPulse`).
- Conflict resolver UI wired to Phase 5's conflict stream.

### 7.4 Categories, recycle bin, import/export
Categories CRUD + order (`0105`), icons; recycle bin with restore/permanent delete/purge (retention per `purge_recycle_bin_older_than`); CSV export (`csvExport` port → file → share sheet); Splitwise import (file picker, `splitwiseImport` port, preview + confirm); backup export/import JSON (`backupValidation`).

### 7.5 Analytics (T3, behind its flag)
`AnalyticsTab` charts (burn rate, category share, per-member): use `fl_chart`; parity of numbers via fixtures; respect `analytics` flags. May be deferred to after first release if the matrix says T3.

### 7.6 Quick add (T2/T3 per flag)
Text quick-add parser UI (`expenseQuickParser` port), trip picker (`pickTripForQuickAdd`), confirm sheet (`TripbotConfirmSheet` shared with chat in Phase 8), voice entry hook (implemented Phase 9).

### 7.7 Tests & verification
- **Numbers:** a screen-level test that renders balances for the golden settlement fixtures and asserts displayed strings (currency formatting included) equal fixture expectations.
- Widget tests for every split mode's validation matrix; golden images for expense row, form, ledger card.
- Integration (staging): add expenses of every split mode offline → reconnect → web client (or SQL) shows identical balances; edit/delete/restore; dispute→resolve; confirm settlement from a second account.
- Manual: `FEATURE_TEST_STEPS.md` expense/settlement/ledger sections + added Flutter keyboard/swipe steps; update parity matrix.

## Deliverables
Expenses + Ledger + related sheets/screens, tests, updated docs/matrix, ADRs (list virtualisation, chart lib, share-card rendering), `HANDOFF.md` entry.

## Out of scope
OCR scanner, voice recognition internals, maps (Phase 9); chat UI (Phase 8).

## Exit criteria
- [ ] Every split mode × payer mode reproduces web numbers on all golden fixtures at the UI level.
- [ ] A 500-expense trip scrolls ≥ 55 fps and the ledger renders < 300 ms after data load (profile build, mid-range Android).
- [ ] Offline add/edit/delete + reconnect leaves **identical** server rows to the web client's for the same actions (documented diff = none).
- [ ] All T1 expense/ledger parity rows `done`/`skipped+reason`; T3 rows explicitly deferred or done.
- [ ] No overflow/clipping at 200% text scale on form + ledger; VoiceOver/TalkBack can complete "add expense" and "settle up".
