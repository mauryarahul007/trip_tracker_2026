# How to Manage Checklists and Trip Notes

This guide walks you through organizing your packing lists, essential travel documents, medical gear, and critical trip notes (such as Wi-Fi passwords and hotel addresses) in Trip Tracker 2026.

---

## Prerequisites

- An active trip created or selected in Trip Tracker.
- Trip members added (if assigning checklist items to specific travelers).

---

## Steps

### 1. Navigating to the Checklist & Notes Tab
1. Open your trip from the home screen.
2. In the floating navigation bar at the bottom, tap **"Checklist & Notes"** (or use the toggle switcher inside the more options menu).
3. Tap the sub-tab switcher at the top to toggle between **"Checklist"** and **"Trip Notes"**.

---

### 2. Managing Packing & Preparation Checklists

#### Adding a Checklist Item
1. In the **Quick Add** box at the top of the checklist:
   - Type your item (e.g. *"Passport & Visa"*, *"Power Bank"*, *"Sunscreen"*).
   - Tap the category icon to assign it: **Packing** (🎒), **Documents** (📄), **Medical** (💊), or **General** (⚡).
   - *(Optional)* Tap the member pill to assign the item to a specific traveler.
2. Press **Enter** or tap the **"+"** button to add the item.

#### Ticking Off Items
- Tap the circular checkbox next to any item to mark it complete.
- Notice the tactile haptic tick and watch the **Packing Progress Bar** advance.
- When all items reach 100% completion, an interactive **Confetti Celebration** triggers automatically.

#### Filtering and Organizing
- Tap category chips (**Packing**, **Documents**, **Medical**) to focus on specific gear.
- Toggle the **"Hide Completed"** checkbox to clear finished items from your view.
- Swipe left on any item to **Edit** its assignee or **Delete** it.

---

### 3. Managing Travel Notes (Wi-Fi, PNRs & Stays)

#### Creating a New Note
1. Switch to the **"Trip Notes"** sub-tab.
2. Tap the **"+ New Note"** button.
3. Fill in:
   - **Title:** e.g. *"Villa Wi-Fi Password"*, *"Flight PNR: 6E-204"*, *"Hotel Address"*.
   - **Category:** Choose **Wi-Fi & Codes** (📶), **Hotel & Stay** (🏨), **Tickets & PNR** (✈️), or **Contacts** (📞).
   - **Content:** The actual credentials, booking codes, or addresses.
   - **Pin to Top:** Check this box to anchor critical info at the very top of the list.
4. Tap **Save Note**.

#### 1-Tap Copying Credentials
- Every note features a quick **Copy** button (📋).
- Tap the copy button to immediately copy the note content to your clipboard (useful when copying Wi-Fi passwords or taxi addresses). A green checkmark confirms the copy.

#### Searching Notes
- Type any keyword into the top search bar.
- The list filters instantly. Tap the **"✕"** icon on the right side of the search bar to clear the query.

---

## Verification

To confirm your notes and checklists are working:
1. Add an item, tick the checkbox, and refresh the browser or close the PWA. Reopen the app—the item should remain checked, verified by local IndexedDB persistence.
2. Tap the Copy button on a note; paste into any text field to confirm the content was copied accurately.

---

## Troubleshooting

| Problem | Cause | Fix |
|---------|-------|-----|
| Items don't sync to other travelers | Device is currently offline | Checklists and notes queue locally when offline and sync automatically as soon as internet connection is restored. |
| Cannot see completed items | "Hide Completed" filter is enabled | Tap the filter chip or toggle to unhide completed checklist items. |

---

## Related Documentation

- [Reference: Data Model](reference-data-model.md)
- [How to Record an Expense](howto-record-expense.md)
- [Reference: Storage Layer](reference-storage.md)
