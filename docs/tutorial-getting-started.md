# Getting Started with Trip Tracker 2026

You'll build a fully-settled expense split for a weekend trip in under 5 minutes. By the end you'll have recorded expenses, seen who owes whom, and exported a spreadsheet.

---

## What you'll need

- Node.js 18 or later
- npm 9 or later
- A modern browser (Chrome, Safari, Firefox, Edge)

---

## Step 1: Install and launch

```bash
git clone https://github.com/mauryarahul007/trip_tracker_2026.git
cd trip_tracker_2026
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). You'll see the Trip Tracker home screen.

---

## Step 2: Create a trip

1. Click **+ New Trip** in the header.
2. Fill in:
   - **Trip name**: "Goa Weekend"
   - **Start date**: today
   - **End date**: two days from now
   - **Currency**: INR (or your currency)
3. Click **Create Trip**. The app switches into your new trip.

---

## Step 3: Add members

1. Click the **Members & Groups** tab.
2. Click **+ Add Member** and type "Rahul". Press Enter.
3. Repeat for "Priya" and "Amit".

You now have 3 members. The expense form uses this list for payer selection and split assignment.

---

## Step 4: Record your first expense

1. Click the **Expenses** tab.
2. Click **+ Add Expense**.
3. Fill in:
   - **Title**: "Hotel"
   - **Amount**: 6000
   - **Category**: Stay & Hotel
   - **Date**: today
   - **Paid By**: Rahul
   - **Split among**: check all three members
   - **Split mode**: Equal
4. Click **Add Expense**.

The expense appears in the list. Rahul paid ₹6000 and each person owes ₹2000.

---

## Step 5: Add a second expense with a custom split

1. Click **+ Add Expense** again.
2. Fill in:
   - **Title**: "Dinner"
   - **Amount**: 3000
   - **Paid By**: Priya
   - **Split mode**: Custom Weight
   - Rahul: 2, Priya: 1, Amit: 1
3. Click **Add Expense**.

Priya paid ₹3000. Rahul owes ₹1500, Priya owes ₹750, Amit owes ₹750 — but Priya also paid, so her net share is ₹750 (paid ₹3000, share ₹750 = gets back ₹2250).

---

## Step 6: Check balances and settle

Scroll down to **Balances & Settlements**. You'll see:

- **Rahul** — owes (paid Hotel share, owes more from Dinner weight)
- **Priya** — gets back (paid Dinner, lower weight)
- **Amit** — owes (equal share Hotel + Dinner)

The **Settlement Actions** panel shows the minimum transfers needed. If two people who owe each other are also in the same group, they won't see a transfer between them at all — the group is netted as one entity against everyone else. Each row has an amount field next to **Settle**: leave it blank to record the suggested amount, or type a different figure if the actual payment was more or less. Click **Settle**, confirm in the dialog that appears, and the row changes to **✓ Settled** — balances and the remaining suggested transfers recalculate immediately.

---

## Step 7: Export to Excel

1. Go to the **Settings** tab.
2. Click **📊 Export Excel CSV**.
3. Open the downloaded file in Excel or Google Sheets.

The spreadsheet has three sections: Expenses List, Net Balances, and Recommended Settlements.

---

## What you built

A fully-functional trip expense split with:
- 3 members, 2 expenses, 2 different split modes
- Automatic balance calculation
- Minimized settlement transfers
- An Excel-compatible export

**Next steps:**
- [How to record an expense with exact amounts](howto-record-expense.md)
- [How to create and edit member groups](howto-manage-groups.md)
- [Reference: Charts & Analytics](reference-analytics.md)
- [Reference: all data model fields](reference-data-model.md)
- [Explanation: why four split modes exist](explanation-split-modes.md)
