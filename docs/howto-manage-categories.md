# How to Manage Categories

You'll add a custom expense category (with your own emoji icon) for a spend type the six built-ins don't cover, and remove one you no longer need.

---

## Prerequisites

- None — category management is global, not tied to a specific trip

---

## Built-in categories

Every install starts with six categories that can't be deleted or renamed from the UI:

| Icon | Name |
|------|------|
| 🍔 | Food & Dining |
| 🏨 | Stay & Hotel |
| ✈️ | Travel & Transport |
| 🎟️ | Activities & Sightseeing |
| 🛍️ | Shopping |
| 📦 | Misc & Others |

---

## Steps

### 1. Open Settings

Click the **⚙ Settings** tab. **Manage Categories** is the first card.

### 2. Pick an icon

Click the small icon field on the left of the "New category name" row. A dropdown of 18 common emoji appears — click one to select it. You can also type or paste any emoji directly into the field instead (the dropdown is a shortcut, not the only option).

### 3. Name it and save

Type a name in the **New category name** field and click **Add**. The category is immediately available in the expense form's Category dropdown and in the expense search filter.

---

## Deleting a custom category

Custom categories show a **Delete** button; built-in categories show a **Built-in** label instead and can't be removed. Click **Delete**, then confirm in the dialog that appears.

Existing expenses that used the deleted category are **not** reassigned — they keep the old category ID internally, but since it no longer resolves to a name/icon, they display with the fallback 🏷️ icon and "Other" as the category name everywhere (expense list, review modal, analytics).

---

## Verification

After adding a category, open **+ Add Expense** and confirm it appears in the Category dropdown with your chosen icon.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Icon field shows nothing after picking | The dropdown closes on selection — check the field itself, the icon is there |
| Can't delete a category | Built-in categories are protected; only categories you created can be deleted |
| Old expenses show 🏷️ / "Other" | Expected — their category was deleted. The expense record itself is unaffected |

---

## Related

- [How to Record an Expense](howto-record-expense.md) — choosing a category when adding an expense
- [Reference: Data Model](reference-data-model.md) — the `Category` type and `addCategory`/`deleteCategory` actions
