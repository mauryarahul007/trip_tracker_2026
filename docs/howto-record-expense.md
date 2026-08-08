# How to Record an Expense

You'll add an expense with the right split mode for your situation — equal, weighted, exact amounts, or percentage — and verify the resolved shares are correct.

---

## Prerequisites

- A trip is created and active (you see the trip name in the header)
- At least one member has been added under **Members & Groups**

---

## Choosing your split mode

| Mode | Use when | Example |
|------|----------|---------|
| **Equal** | Everyone shares the same amount | Hotel split 3 ways: ₹2000 each |
| **Custom Weight** | People share proportionally (couples, families) | Couple gets weight 2, solo gets weight 1 |
| **Exact Amount** | You know each person's exact share upfront | Itemized bill |
| **Percentage** | Split by agreed percentages | 60% / 40% between two people |

---

## Steps

### 1. Open the expense form

Click **+ Add Expense** on the Expenses tab. If you have no members yet, the app redirects you to add members first.

### 2. Fill in the basics

- **Expense Title** — short description, e.g. "Cab to airport"
- **Amount** — the total bill in the trip's base currency (e.g. ₹850)
- **Category** — pick from the dropdown (Food & Dining, Stay & Hotel, Travel & Transport, etc.)
- **Date** — the date the expense happened
- **Paid By** — the member who physically paid the bill

### 3. Select who splits the expense

Under **Split Among Members**, check each person who participated. Use the **group shortcuts** to check everyone in a named group in one click.

### 4. Choose the split mode

Select one of the four modes:

**Equal** — no extra input needed. The amount is divided by the number of checked members. Rounding remainders go to the payer.

**Custom Weight** — a number field appears next to each checked member. Enter relative weights (e.g. 2, 1, 1). Shares are proportional: weight ÷ total weight × amount. A running "Total weight" readout updates as you type (informational only — no target to hit).

**Exact Amount** — enter each person's exact share. The sum must equal the total amount (within ₹0.02 tolerance for rounding). A running total (e.g. "₹640.00 / ₹850.00") appears below the checklist, in red until it matches and green with a ✓ once it does — you don't have to submit to find out it's wrong.

**Percentage** — enter each person's percentage. The sum must equal 100% (within 0.05% tolerance). Same live running total, e.g. "82.0 / 100%" turning green at 100%.

### 5. Attach a receipt (optional)

Click the **Receipt** file picker and choose a photo. It's compressed client-side before saving, then shown as a small thumbnail with a **Remove** button if you want to swap it out. The full photo is viewable later from the expense's review modal (click any expense in the list), with a click-to-open-full-size link.

### 6. Save the expense

Click **Add Expense**. The expense appears in the list immediately, sorted by date (most recent first).

---

## Editing an expense

Click **Edit** on any expense card to reopen the form pre-filled with the original values. Change any field and click **Update Expense**. The settlement engine recalculates from the new resolved shares immediately.

> Settlement expenses (rows starting with "Settlement:") cannot be edited — they are accounting records. Delete and re-settle if needed.

---

## Undoing a deletion

If you click **Delete** by mistake, a toast appears at the bottom of the screen for 5 seconds:

```
🗑️ 'Cab to airport' deleted   [Undo]
```

Click **Undo** within 5 seconds to restore the expense. After 5 seconds it is permanently removed.

---

## Finding an expense

Once a trip has expenses, a search bar and filter row appear above the expense list:

- **Search** — matches expense titles as you type
- **Category** / **Member** dropdowns — narrow to one category or one member (payer or split participant)
- **From / To date** — restrict to a date range

Filters combine (all conditions must match). A **Clear** button appears once any filter is active. You can also jump straight to a member's expenses by clicking their row in **Balances & Settlements** — it switches to the Expenses tab with that member's filter already applied.

---

## Verification

After saving, scroll down to **Balances & Settlements**. The member who paid should show a positive balance ("gets back ₹X"), and participants should show reduced or negative balances ("owes ₹Y").

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| "Please select at least one member" | Check at least one member in the split panel |
| "Sum of amounts must equal total" | In Exact mode, make sure individual amounts add up to the total |
| "Sum of percentages must equal 100%" | In Percentage mode, ensure percentages add up to 100 |
| A member doesn't appear in the split list | They may be archived — check Members & Groups tab |
| "Could not process that image" | The receipt photo failed to load/decode — try a different file |
