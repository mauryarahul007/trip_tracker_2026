# Backup import contract (web/Capacitor JSON into Flutter)

Phase 11.3. Defines how a backup file becomes data in the Flutter app. The Flutter side is **built** (Phase 10: `flutter_app/lib/data/backup/backup_service.dart`, Settings, Restore backup). This document is the contract it follows and the gaps it leaves.

## Why two shapes
The first Phase 10 restore only understood the Flutter shape; reading `src/utils/backupValidation.ts` and `exportDatabase` in Phase 11 showed the web export differs, so a real Capacitor backup would have restored with no people and wrong payers. Fixed in `BackupService`; pinned by a test.

## Accepted input
JSON, at most 10 MB, root object with:
- `trips`: array, **1 to 50** entries, each with at least `id` and `name`.
- `members`, in **either** shape:
  - **Web/Capacitor export** (`exportDatabase`, `TripState`): an **object** `memberId -> member` with **no `tripId`**; each trip lists its people in `memberIds` (the first is the creator). This is the legacy format and the main migration input.
  - **Flutter export**: an array of members, each with `tripId`.
- `expenses`: array (each has `tripId`, `paidBy`, split fields, `resolvedShares`, ...); at most 1000 per trip. Items with `deletedAt` set (recycle bin) are **not** restored.
- Optional `manifest` (`type`: `full_backup` or `single_trip_snapshot`, `exportedAt`). **No manifest is required**: the web app's existing backup export has none, and must keep working.
Anything else is ignored. `__proto__`, `constructor`, `prototype` keys are dropped. Validation is `summarizeBackup`, which mirrors the web `backupValidation.ts`.

## Schema versions
There is no schema version field today. Rule: unknown keys are ignored, missing optional keys take defaults, a row that cannot be parsed is **skipped** (counted, never aborts the restore). If a breaking change is ever needed, add `manifest.schemaVersion` and refuse files from a newer major version with a clear message.

## What is created
For each trip: a **new trip owned by the signed-in user** (new id, name, dates, base currency, destination), then members, then expenses, all through the normal repositories, so everything **queues for sync** like any offline-created data.

| Item | Rule |
|------|------|
| Trip id | Regenerated (repositories own id creation) |
| Members | New ids; the old owner's member maps onto the new owner member (matched by `linkedUserId == trip.ownerId`, else same name, else the first of `memberIds`); archived stays archived |
| Expenses | New ids; `paidBy`, `paidByShares`, `splitMemberIds`, `splitConfig`, `resolvedShares` re-keyed through the member map; `createdByUserId` = importer; **itemized config dropped** (it references old member ids; `resolvedShares` still carries the result) |
| Settlements | Imported as ordinary expenses with `isSettlement` kept |
| Receipt images, chat, notes, checklist, passes, categories, groups, flags, share links | **Not imported** today |
| Sessions, tokens, push registrations | Never in a backup |

## Idempotency (open)
Importing the **same file twice creates duplicates**. The restore dialog says so. A proper fix needs a stable marker:

- **Proposed:** `trips.import_batch_id text` (nullable) = hash of `(original trip id, exportedAt)`, written on the new trip; restore skips a trip whose marker already exists for this user. Additive migration, draft in `ops/ALERTS.md` section 5. Until it ships, B-146 stands.
- Cheaper interim: record imported `(original id, exportedAt)` pairs in local preferences. Survives only on one device; does not cover reinstall.

## Failure behaviour
Invalid file: message, nothing created. Partial failure inside a trip: remaining rows are skipped, counts are reported ("Restored 1 trip(s) and 41 expense(s)"). No partial trip is rolled back (a trip with fewer expenses is better than none; the owner can re-import after fixing).

## Guest and demo data
A guest's backup is the same format. Restoring it into a **real account** is the intended recovery path for guest trips (see `LEGACY_DATA.md`, option A). Demo data is not worth importing.

## Tests that pin this contract
`flutter_app/test/data/phase10_data_test.dart` (Flutter export round trip, **web-shaped export with members as a map**, recycle-bin skip, member and payer mapping, archived people, invalid files) and `flutter_app/test/features/settings/phase10_ui_test.dart` (UI validation and confirmation).
