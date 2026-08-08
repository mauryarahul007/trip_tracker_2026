# Changelog

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

### Descoped
- **Vestigial per-expense currency field** — originally flagged as a possible cleanup (the field exists but is always forced to the trip's base currency; no real multi-currency conversion is implemented). User confirmed this is not needed — left as-is.
- **Split `App.tsx` into components** — proposed as a pure-refactor cleanup (the file is ~1900 lines, single-file UI) to be done last so it wouldn't conflict with the feature work above. Not started; still open if wanted later.

### Files touched
- `src/App.tsx`, `src/index.css`, `src/store/tripStore.ts`, `src/types/index.ts`
- New: `src/components/ConfirmDialog.tsx`, `src/utils/image.ts`
