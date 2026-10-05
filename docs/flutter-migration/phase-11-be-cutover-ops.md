# Phase 11 (BE): Cutover operations: legacy data, monitoring, rollback

**Track:** Backend / ops · **Size:** M · **Depends on:** Phases 3, 4 · **Parallel with:** 9, 10
**Read first:** [README.md](README.md), `contract/SYNC.md`, `contract/PUSH_SETUP.md`.

## Goal
Make the switch from the Capacitor apps to the Flutter app safe for **existing users and their data**, observable, and reversible, without touching the web app's users.

## Inputs
`src/utils/liveUpdate.ts`, `src/services/serviceWorker*.ts` (Capacitor/PWA update paths), `src/store/tripStore.ts` (queue flush entry points), `src/components/SettingsView.tsx` (backup export), `src/utils/backupValidation.ts`, `supabase/functions/*`, `BACKLOG.md`, `COMMERCIAL_ROADMAP.md`, migrations `0107`, `0108` (growth telemetry/ops), `codemagic.yaml`, `.github/workflows/build-*.yml`.

## Tasks

### 11.1 Legacy-data inventory → `contract/LEGACY_DATA.md`
What lives **only on the device** in the Capacitor WebView today and would be lost on switching to Flutter:
1. Unsynced `syncQueue` items (offline edits never flushed).
2. Guest/demo users' trips (local-only, no Supabase account?). Quantify from telemetry/`profiles` where possible.
3. Offline receipt/chat queues (`offlineReceiptStore`, `offlineChatStore`), pass attachments and the document vault (`passAttachmentStore`, `documentVaultStore`: **device-local encrypted data with no server copy?** confirm).
4. User prefs only in localStorage (theme, density, pins).
For each: recoverable server-side? recoverable by export? unrecoverable? Give counts/estimates and a recommended handling.

### 11.2 "Final Capacitor release" spec (web-code change; needs owner approval)
Write the spec (not the code) for one last Capacitor/web release, to be implemented under normal repo rules (flag-gated, test steps, version bump):
- On launch, **flush the sync queue** and show "all changes saved" or a clear warning with the pending count.
- A **migration banner** ("Trip Tracker has a new app") with store link, shown only when the Phase 3 config says so (reuse `app_config`), dismissible, plus an "Export my local data" button for guest/demo/vault data (reusing backup export; extend export to include vault metadata if feasible and safe).
- Optional: block *new* guest-only trip creation after the cutover date.

### 11.3 Import path contract for Flutter
Define the backup JSON → Flutter import behaviour (Phase 10 builds it): schema version handling, ID collisions (regenerate UUIDs; map references), what imports into Supabase (trips/members/expenses as a **new owned trip**) vs stays local, idempotency (importing twice must not duplicate: use a deterministic `import_batch_id` stored on the trip or an `imported_from` marker; add the column additively if required: coordinate migration numbers via `HANDOFF.md`).

### 11.4 Observability
- Dashboards/queries (SQL views or the existing `admin_*` RPCs `admin_retention_cohorts`, `admin_reliability_summary`, `get_notification_stats`) segmented by `client` (`capacitor|flutter|web`): DAU, crash-free sessions (from Phase 2 crash tool), sync failure rate, push delivery rate, auth failure rate, p95 API latency, outbox quarantine count (Flutter telemetry event added in Phase 10/5).
- Alert thresholds + owner/on-call note: e.g. sync failure rate > 2% over 1 h, push failure spikes, auth errors spike after release.
- Edge function logs retention and a runbook for `send-push` failures.

### 11.5 Staged rollout & rollback plan → `ROLLOUT.md`
- Release ladder: internal (TestFlight internal / Play internal) → closed beta (n users, include the owner's real trips) → 10% → 50% → 100% (Play staged rollout / App Store phased release).
- **Go/no-go checklist** per stage with metrics from 11.4.
- **Rollback:** what "rollback" means with store apps (halt rollout, publish previous Capacitor build is *not* possible post-replacement → hence keep Capacitor builds installable until the final stage; backend compatibility with both clients for **≥ 2 store release cycles**). Define the **contract-freeze window**: no destructive migration (drops, renames, RLS tightening) until the Capacitor sunset date (owner decision).
- Feature-flag kill switches for risky Flutter features: confirm each T2/T3 feature has a flag the server can flip.
- Data backup: verify PITR/daily backup on prod Supabase before the first beta; document restore drill.

### 11.6 Security & compliance review (backend side)
- RLS test suite (Phase 4) green on prod-parity staging; secret scan (`.env`, FCM service account only in function secrets).
- Rate limits/abuse: join-code brute force (`lookup_trip_by_join_code`), share-token enumeration, anonymous RPC cost: add or verify throttling (Supabase/edge rate limit or in-DB counters; additive).
- App Store data-privacy answers (backend view): what is collected, retention, deletion SLA (ties to `delete_own_account`) → input to Phase 12.
- Run `/cso`-style audit if the owner wants one (a security review of migrations + functions).

### 11.7 Cutover day runbook
Hour-by-hour checklist: freeze window, final migrations, secrets, config flips (`min_supported_version`, migration banner), comms (release notes, support macro), monitoring watch, rollback triggers.

## Deliverables
`contract/LEGACY_DATA.md`, spec for the final Capacitor release, import-path contract, dashboards/SQL, alert definitions, `ROLLOUT.md`, runbook, optional additive migrations, `HANDOFF.md` entry.

## Out of scope
Implementing the final Capacitor release or the Flutter import UI (specified here, built elsewhere), anything destructive.

## Exit criteria
- [ ] Every class of device-local data has a recovery story with an owner-approved decision.
- [ ] Dashboards live and segmentable by client; alert thresholds agreed.
- [ ] Rollback and contract-freeze window written down and acknowledged by the owner.
- [ ] Backup/restore drill performed (or explicitly scheduled with a date).
- [ ] Web CI + smoke green after any migration added here.
