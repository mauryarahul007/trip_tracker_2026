# How to Back Up and Restore Your Data

You'll export your entire local database (every trip, member, group, expense, and category) as a single JSON file, and restore it on the same device or a new one.

Trip Tracker stores everything in IndexedDB with no server and no account (see [Reference: Storage Layer](reference-storage.md)). That means **you are the backup system** — clearing browser data or uninstalling the PWA deletes your trips permanently unless you've exported first.

---

## Prerequisites

- None — this works even with zero trips (exports an empty-but-valid state)

---

## Exporting a backup

### 1. Open Settings

Click the **⚙ Settings** tab.

### 2. Click Export Backup JSON

Under **JSON Database Backups**, click **📥 Export Backup JSON**. The browser downloads a file named:

```
trip-tracker-backup-<unix-timestamp-ms>.json
```

Store this file somewhere durable — cloud drive, email to yourself, USB drive. It contains the full `TripState`: all trips, members, groups, expenses, and categories, pretty-printed.

---

## Restoring a backup

### 1. Open Settings → Import Backup JSON

Click **📤 Import Backup JSON**. A text area appears.

### 2. Paste the JSON

Open your backup `.json` file in a text editor, copy its full contents, and paste into the text area.

### 3. Click Restore State

Click **Restore State**. On success you'll see:

```
✔ Database restored successfully! Reloading...
```

On failure (malformed JSON, or missing required fields):

```
❌ Invalid database backup format. Please verify the string.
```

---

## What restoring actually does

**Restoring replaces your entire current database.** It is not a merge — every trip, member, group, expense, and category currently in the app is overwritten with the contents of the imported file. There is no undo once the import succeeds; if you want to keep your current data too, export a backup of it *first*, before importing something else.

The importer validates that the parsed JSON has all five required top-level keys before accepting it:

```typescript
Array.isArray(parsed.trips) &&
parsed.members &&
parsed.groups &&
Array.isArray(parsed.expenses) &&
Array.isArray(parsed.categories)
```

A file missing any of these keys — or that isn't valid JSON at all — is rejected and your existing data is left untouched.

---

## Verification

After a successful import, check the **Trips** home screen — your restored trips should all be listed with the correct member counts and date ranges.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| "Invalid database backup format" | Confirm you copied the *entire* file contents, including the outer `{` and `}` |
| Import silently does nothing | Check the browser console — a JSON parse failure is logged there even though the UI just shows the generic error message |
| I imported the wrong file and lost data | If you exported a backup before importing, re-import that backup. If not, the overwritten data cannot be recovered |
| Moving to a new phone/device | Export on the old device, transfer the `.json` file (email, cloud drive, cable), import on the new device |

---

## Diagnostics and Storage Estimate

The Settings page displays diagnostic utilities to monitor connectivity and local storage:
- **Connection Status:** Displays whether your device is currently **Online** or **Offline**.
- **Local Disk Usage:** Shows how many bytes/megabytes the app is currently storing in IndexedDB relative to your browser's estimated storage quota.

---

## Seeding Demo Data

If you want to test the app features without manually inputting expenses, you can load mock data:
1. Open **Settings**.
2. Under **Quick Seed Demo Data**, click **Load Demo Trip**.
3. This creates a pre-populated trip named *"Road Trip to Goa ☀️"* with 4 members, custom groups, and 6 diverse expense splits. You'll be automatically redirected to the trip dashboard to view simulated Balances, Settlements, and Charts.

---

## Factory Reset (Clear All Data)

To wipe all data from your device:
1. Open **Settings**.
2. Scroll to the bottom and click **Clear All Data** under **Factory Reset**.
3. Accept the double-confirmation prompt: *"This will permanently delete all trips, members, groups, and expenses. This action cannot be undone."*
4. All storage is cleared and the app is reset to its factory defaults.

---

## Related

- [Reference: Storage Layer](reference-storage.md) — where this data lives and how import/export map to `TripState`
- [Explanation: Offline Caching](explanation-offline-caching.md) — why the app needs a manual backup path instead of cloud sync

