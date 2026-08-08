# How to Create and Edit Member Groups

You'll set up a named group (e.g. "The Kids" or "Sharma Family") so you can add all its members to an expense split with one click instead of checking boxes individually every time.

---

## Prerequisites

- A trip is active
- At least one non-archived member exists on the trip

---

## Steps

### 1. Open Members & Groups

Click the **👥 Members & Groups** tab. Groups live in the **Member Groups** section below the members list.

### 2. Create a group

Click **+ Create Group** (hidden if the trip has no active members yet).

- **Group Name** — e.g. "Rahul & Priya"
- **Group Members** — check every member who belongs to this group

Click **Save Group**. If you try to save with zero members checked, an inline error appears under the form and it stays open.

### 3. Use the group in an expense

Open **+ Add Expense**. In the **Division of Expense** section, if the trip has any groups, a row of quick-select buttons appears above the member checklist:

```
Groups: ＋ Rahul & Priya   ＋ Kids
```

Clicking a group button checks every (non-archived) member in that group for the split. It's **additive only** — it does not uncheck anyone, and it does not toggle off if you click it twice. Deselect individual members manually if the group doesn't exactly match who's splitting this expense.

---

## Editing a group

Click **Edit** on any group card. The form reopens pre-filled with the group's current name and member selection, and the submit button changes to **Update Group**. Change the name and/or checked members, then click **Update Group**.

Editing a group only changes the group's name/membership going forward — it does **not** retroactively change `resolvedShares` on expenses that already used this group's quick-select button. Those expenses stored their own `splitMemberIds` at save time.

---

## Deleting a group

Click **Delete** on a group card, then confirm in the dialog that appears. The group disappears immediately, but you have **5 seconds to undo** — a toast appears at the bottom of the screen with an **Undo** button. After 5 seconds (or if you don't click Undo) the group is permanently removed — **member records are not affected**, and any expenses that previously used the group's quick-select stay exactly as they were (the group's member list was copied into the expense at save time, not referenced live).

---

## Verification

After creating or editing a group, open **+ Add Expense** and confirm the group's quick-select button appears (or its member list changed) in the Division of Expense section.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| "Please select at least one member to add to the group" | Check at least one member's checkbox before saving |
| **+ Create Group** button is missing | The trip has zero non-archived members — add a member first |
| Group quick-select doesn't include a member I expect | Archived members are silently skipped by group quick-select, even if they were in the group when it was created |
| I deleted a group by mistake | Click **Undo** on the toast within 5 seconds. After that, groups aren't versioned — recreate it with **+ Create Group**; no data is lost on existing expenses |

---

## Related

- [How to Record an Expense](howto-record-expense.md) — using groups during split selection
- [Reference: Data Model](reference-data-model.md) — the `Group` type and `updateGroup`/`deleteGroup` actions
