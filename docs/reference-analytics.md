# Reference: Charts & Analytics

The **Analytics** tab (`src/components/AnalyticsTab.tsx`) renders four stats and three charts from props computed in `App.tsx` (`categoryData`, `memberSpentList`, `dailySpendData`, etc.) — there is no separate analytics module, the numbers are derived inline during render from `expenses`, `members`, and `categories`.

All analytics figures exclude settlement transfers: any expense whose `title` starts with `"Settlement:"` is filtered out before any calculation runs (`nonSettlementExpenses`). This keeps "money you actually spent" separate from "money you moved to settle up."

---

## Key statistics cards

| Stat | Formula | Notes |
|------|---------|-------|
| **Total Spent** | `sum(nonSettlementExpenses.amount)` | All non-settlement expenses for the active trip |
| **Per-Head Cost** | `totalSpent / visibleMembers.length` | Divides total spend evenly across all *non-archived* trip members — not the same as any individual's `resolvedShares` total |
| **Top Category** | Category with the highest summed `amount`, formatted `"{icon} {name}"` | `"N/A"` if no non-settlement expenses exist |
| **Biggest Spender** | Member with the highest summed *paid* amount (`exp.paidBy`) | `"N/A"` if the top amount is 0 — this ranks who *paid* the most, not who *owes* the most |

`visibleMembers` excludes archived members. An archived member's past expenses still count in totals, but the member is excluded from the Per-Head Cost divisor and from the "Spend by Member" chart.

---

## Chart 1: Spend by Category (SVG donut)

Built from `categoryData`: for each category, `{ amount, percentage }` where `percentage = (amount / totalSpent) * 100`. Categories with `amount === 0` are filtered out; the rest are sorted descending by amount.

Rendered as a single `<svg>` with one `<circle>` per category, each using `stroke-dasharray`/`stroke-dashoffset` to draw an arc proportional to its percentage, chained around the circle (`accumPercent` tracks the running offset). The circle is rotated `-90deg` so the first arc starts at 12 o'clock.

**Color assignment** (`getCatColor`):
```typescript
const CATEGORY_COLORS: Record<string, string> = {
  'cat-food': '#6366f1',      // Indigo
  'cat-stay': '#3b82f6',      // Blue
  'cat-travel': '#06b6d4',    // Cyan
  'cat-activities': '#10b981', // Emerald
  'cat-shopping': '#f59e0b',  // Amber
  'cat-misc': '#8b5cf6',      // Violet
};
// Custom categories fall back to, cycling by index:
const fallbacks = ['#ec4899', '#f43f5e', '#84cc16', '#a855f7', '#64748b'];
```

The center label shows the total, abbreviated to `"{n}k"` once it exceeds 1000 (e.g. `₹12.4k`).

---

## Chart 2: Spend by Member (CSS bar chart)

Built from `memberSpentList`: for each visible member, `{ amount, percentage }` based on how much they **paid** (`exp.paidBy`), sorted descending. Each row is a flex label plus a `<div>` whose `width` is set to `${percentage}%` with a gradient background (`--primary-accent` → `--secondary-accent`) and a `width` CSS transition.

This chart answers "who fronted the most cash," not "who owes the most" — pair it with the Balances panel on the Expenses tab for the latter.

---

## Chart 3: Daily Spending Trend (SVG line chart)

Built from `dailySpendData`: expenses grouped by `exp.date` into `dailyTotals`, sorted chronologically, each point labeled with a short date (`Aug 1`, via `toLocaleDateString` in UTC to avoid timezone-shifted date labels).

Points are laid out on a fixed `400×200` viewBox:
```
x = 40 + idx * (330 / (totalPoints - 1))   // evenly spaced, or 200 if only one point
y = 160 - (amount / maxAmount) * 110       // maxAmount = max(all amounts, 100)
```
`maxAmount` has a floor of 100 so a trip with tiny expenses doesn't produce an exaggerated spike. The chart only renders if there is at least one day with spend (`dailySpendData.length > 0`); it's absent entirely on a trip with zero non-settlement expenses.

---

## What's NOT covered here

- Multi-currency conversion — all amounts are summed as raw numbers in `trip.baseCurrency`; there is no FX conversion if `expense.currency` ever differs from the trip's base currency
- Historical trend across trips — analytics are always scoped to the single active trip
- Export of chart data — only the CSV exporter (`howto-export-csv.md`) provides a downloadable data view, and it does not include the daily timeline

---

## Related

- [Reference: Data Model](reference-data-model.md) — `Expense` fields these calculations read
- [Reference: Settlement Algorithm](reference-settlement.md) — the balance math analytics deliberately does *not* duplicate
- [How to Export to Excel](howto-export-csv.md) — CSV export covers balances/settlements, not charts
