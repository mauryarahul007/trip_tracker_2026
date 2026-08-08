# How to Export Trip Data to Excel

You'll download a CSV file that opens cleanly in Excel or Google Sheets, with three structured sections: the expense list, member net balances, and the recommended settlement plan.

---

## Prerequisites

- A trip is active with at least one expense recorded

---

## Steps

### 1. Open Settings

Click the **⚙ Settings** tab in the bottom navigation bar.

### 2. Click Export Excel CSV

Under **Excel CSV Export**, click the **📊 Export Excel CSV** button. The browser downloads a file named:

```
trip-tracker-export-<Trip-Name-with-dashes>-<unix-timestamp-ms>.csv
```

### 3. Open in Excel or Google Sheets

**Excel:** double-click the file. If values appear in one column, use Data → Text to Columns → Delimited → Comma.

**Google Sheets:** File → Import → Upload → select the CSV → Separator type: Comma.

---

## What's in the file

The export contains three sections separated by blank rows:

**EXPENSES LIST**

| Date | Title | Category | Amount | Currency | Paid By | Split Mode | Split Members |
|------|-------|----------|--------|----------|---------|------------|---------------|
| 2026-08-01 | Hotel | cat-stay | 6000.00 | INR | Rahul | equal | Rahul; Priya; Amit |

**NET BALANCES**

| Member Name | Status | Net Balance |
|-------------|--------|-------------|
| Rahul | Owes | -1500.00 |
| Priya | Gets Back | 2250.00 |

**RECOMMENDED SETTLEMENTS (MINIMIZED)**

| Debtor (Who Pays) | Creditor (Who Gets Paid) | Amount |
|-------------------|--------------------------|--------|
| Rahul | Priya | 1500.00 |

---

## Security note

The exporter applies formula injection protection. Any cell value that starts with `=`, `+`, `-`, or `@` is prefixed with a single quote so Excel does not interpret it as a formula. This prevents CSV injection attacks if member names or expense titles contain those characters.

---

## Verification

Open the file and check:
- The total of the Net Balance column sums to approximately 0 (rounding may produce a ±₹0.01 difference)
- Settlement amounts match what you see in the app's Balances & Settlements panel

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| File opens with everything in one column | Use Data → Text to Columns → Comma delimiter |
| Name shows as blank | The member was deleted after the expense was recorded — the export uses "Deleted" as the label |
| Settlement rows are missing | No outstanding debts exist — all balances are within ₹0.01 of zero |
