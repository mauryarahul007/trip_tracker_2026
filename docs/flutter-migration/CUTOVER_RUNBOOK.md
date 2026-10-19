# Cutover day runbook (Phase 11.7)

Use for **each stage** that changes what users receive (beta open, 10%, 100%) and for the sunset. Times are relative to **T0 = the moment the store release or config flip goes live**. Fill the blanks on the day.

## T-7 days
- [ ] Final Capacitor release approved and live (spec: `contract/FINAL_CAPACITOR_RELEASE.md`), flush-on-launch on; banner still **off**
- [ ] `enableGrowthTelemetry` **on**, baseline of the Capacitor numbers recorded (`ops/observability.sql` 1-3, 5, 6)
- [ ] Backup state confirmed and restore drill done (`ROLLOUT.md` section 5)
- [ ] Contract-freeze window announced to yourself: no destructive migrations from now
- [ ] Web CI, Flutter CI, and the RLS suite green on the exact commit being released
- [ ] Release notes and support reply written (below)

## T-1 day
- [ ] Secrets present: `FCM_SERVICE_ACCOUNT_JSON`, cron secrets (`lifecycle_nudge_cron_secret` etc.), Turnstile keys; none in the repo
- [ ] Firebase files and Gradle plugin in the release build; iOS Push capability on; APNs key in Firebase (B-136, B-137)
- [ ] `app_config`: `min_supported_version_*` still at the **old** value; `recommended_version_*` set to the new build; store URLs correct; `maintenance_mode` false
- [ ] Google and Apple sign-in client IDs set and verified on a device (B-009, B-010)
- [ ] Universal links hosted (`apple-app-site-association`, `assetlinks.json`) or custom scheme accepted for the stage (B-014)
- [ ] On-call: phone charged, store console and Supabase dashboard logged in

## T0
- [ ] Start the release (staged rollout percentage, or beta invite)
- [ ] Flip `migration_notice_enabled` in `app_config` and the `enableMigrationNotice` flag **only from stage 2 on** (not for beta)
- [ ] Post the release notes

## T+1 h
- [ ] Run the dashboard queries; compare with baseline; fill the go/no-go table
- [ ] Sign in with Google, Apple and email on a clean device from the store build
- [ ] Create a trip, add an expense offline, reconnect: it syncs once (no duplicate)
- [ ] Receive a push from a second account; sign out; confirm no further pushes

## T+4 h and next morning
- [ ] Repeat the queries; check the bug ledger (auto-crash cases), Edge function logs, Auth logs
- [ ] Reply to every support message; look for the words "lost", "missing", "duplicate", "sign in"

## Rollback triggers (any one)
Data-loss report confirmed; sync failure above the halt threshold; crash cases above the halt threshold; sign-in failing for a provider; push errors above 20%.
**Action:** halt the store rollout; if data is at risk flip `maintenance_mode` or the feature flag; follow `ROLLOUT.md` section 7. Write what happened in the decision log.

## Comms (fill in)
- **Release note:** "Trip Tracker has a new app. Your signed-in trips and expenses come with you. If you used Guest mode, export your data from the old app first (Settings, Export my local data) and restore it in the new one (Settings, Restore backup)."
- **Support macro:** "Open the old app once while online so your latest changes are saved, then install the update. Guest trips: export first (steps above). Documents in the vault do not carry over; export them before updating."
- **Where users ask:** ______

## After 100% and the soak
- [ ] Decide the sunset date; stop publishing Capacitor OTA updates after it
- [ ] Only then: destructive cleanup migrations, each with rollback SQL, each re-checked against the web CI
