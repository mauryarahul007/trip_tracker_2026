# Spec: final Capacitor / web release (do not build until the owner approves)

Phase 11.2. A specification only. The code change is made in the **web app** under the normal repo rules: every customer-facing change behind a Superadmin flag in a consumer pack, labels and descriptions in Superadmin language, flag-count test bumped, manual steps added to `docs/FEATURE_TEST_STEPS.md`, version bump, bug/feature logging before any push.

## Delivery: over the air, no store review
The Capacitor app updates itself from the self-hosted Capgo manifest (`src/utils/liveUpdate.ts`, `https://trip-tracker.blackmaroon.in/updates/latest.json`, published by `scripts/package-update.mjs` and `deploy-ec2.yml`). So this release reaches **every existing Capacitor install that opens the app**, without Apple or Google review. That is what makes a pre-cutover migration notice possible. It cannot reach users who never open the app again.

## Flags (proposed; names to confirm)
| Flag | Pack | Default | Meaning |
|------|------|---------|---------|
| `enableMigrationNotice` | Core | **OFF** until the owner flips it | Shows the "new app" banner and the export button |
| `enableLaunchQueueFlush` | Core | ON | Flush the sync queue at launch and report the result |
| `enableBlockGuestTripCreate` | Core | OFF | After the cutover date, no new guest-only trips (optional) |

Core defaults ON for the flush because it only makes data safer. The banner stays OFF: the owner chooses the moment from the Ops Deck. The Flutter app does not read these flags (Capacitor-only).

## Behaviours

### R1. Flush at launch
- On start (signed-in, online): run the existing queue flush, then show a quiet status: **"All changes saved"**, or **"N changes could not be saved yet"** with Retry and the reason. Count = `syncQueue` items + offline receipts + offline chat outbox.
- Offline: say so, and that nothing is lost.
- Never blocks the UI; never discards an item.

### R2. Migration notice
- Source of truth: `app_config` (reuse the Phase 3 table). New keys, additive: `migration_notice_enabled` (bool), `migration_store_url_ios`, `migration_store_url_android`, `migration_notice_text`. Read through the existing public config path; no new RPC if `get_app_flag` can serve it, else extend `get_app_version_gate` additively (do not change its current output).
- Banner: "Trip Tracker has a new app" + **Get the new app** (store link) + dismiss (remembered per install). Shown only when the flag is on **and** `migration_notice_enabled` is true.
- Wording must say what carries over (signed-in trips) and what does not (guest trips, vault, attachments) unless exported.

### R3. Export my local data
- Button in the notice and in Settings. Produces:
  1. **Backup JSON** of all trips on the device (reuse the existing backup export; format `full_backup` so `BackupService.restore` reads it; see `BACKUP_IMPORT.md`).
  2. **Documents export** for the vault and pass attachments: share-sheet files (original type), never uploaded. Extend only if it can be done without sending the data anywhere.
- Shown first for guest users, because only they have trips with no server copy.
- Include a short "how to restore" line: install the new app, sign in, Settings, Restore backup.

### R4. Block new guest trips (optional)
After `migration_cutover_date` (in `app_config`), "Continue as guest" creates no new trips and shows the store link instead. Existing guest trips stay editable until the sunset date.

### R5. Telemetry (content-free)
`guest_trips_present` and `vault_docs_present` as count **buckets** (0, 1-2, 3-9, 10+), once per day, through the growth telemetry path. Needs the CHECK change in `ops/ALERTS.md` section 5. Gated by `enableGrowthTelemetry`.

## Acceptance
1. Flag off: no UI change anywhere; flush behaviour only if its flag is on.
2. Unsynced edit made offline, app reopened online: it is saved, status says "All changes saved".
3. Export from a guest account, restore in Flutter: trips, people and expenses match.
4. Banner dismissal persists; turning the config off hides it on next launch.
5. No vault or attachment data leaves the device.

## Out of scope
Any change to the Flutter app, any destructive migration, reading another app's storage.
