# Incident: Supabase / Database Unavailable

## Purpose
Recover when the app loads (static shell is fine) but Supabase-backed features fail: sign-in, trip sync, expense sync, receipt uploads, push notifications, join-by-code.

## Impact
Users can still use the app **offline** for data already synced to their device (IndexedDB via `localforage`, see `docs/reference-storage.md`/`src/services/storage.ts`) — new expenses/edits queue locally. But: sign-in, cross-device sync, new trip joins, receipt upload, and push notifications fail.

## Severity
P0 if Supabase project itself is down/unreachable; P1 if only a subset of RPCs/tables are failing (e.g. one migration broke one endpoint).

## Symptoms
- API calls to `https://<project-ref>.supabase.co` time out, or return 5xx / connection refused.
- `src/services/supabaseClient.ts`: if `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` are unset or placeholder values, `isMissingSupabaseEnv` is `true` and the client is a dummy pointed at `dummy-project.supabase.co` — this looks identical to a real outage from the UI's perspective but is actually a config/deploy problem, not a Supabase incident. Rule this out first (see Diagnosis).
- Auth (`useAuthStore`, `src/store/authStore.ts`) fails on Google OAuth or superadmin email/password sign-in.
- Statement-timeout errors surface as generic query failures (`ALTER ROLE authenticated SET statement_timeout = '5000ms'`, `anon` = `3000ms` — migration `0046_security_hardening_phase1.sql`): a query that's legitimately slow (not just Supabase being down) will also present as "the database seems unavailable."
- Push notifications silently fail (`src/services/pushApi.ts` treats push as best-effort and never blocks the caller) — this alone is not evidence of a full outage.

## Immediate Actions
1. Check the [Supabase status page](https://status.supabase.com) for the project's region.
2. Confirm the deployed build has real Supabase env values, not the placeholder/dummy fallback — see Diagnosis below. This rules out "we deployed with missing secrets" before assuming a Supabase-side outage.
3. Reassure/communicate: local data is safe (IndexedDB is unaffected by Supabase being down); only sync/auth/upload/push are impacted.

## Diagnosis
- **Rule out missing env vars first**: `deploy-ec2.yml` passes `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` from GitHub Actions secrets at build time (`.github/workflows/deploy-ec2.yml`); `deploy-pages.yml` does **not** pass them at all — NOT VERIFIED whether the Pages deployment target is expected to have working Supabase auth, or is treated as a static/demo-only build. If Pages is the affected target, this may be expected behavior rather than an incident.
- Open browser devtools → Network tab, reproduce a failing action (sign in, add expense while online), inspect the actual response from `*.supabase.co` — status code and body distinguish "Supabase is down" (connection error/5xx) from "a specific RPC/migration is broken" (4xx with a Postgres error message) from "rate-limited/locked" (join-code lockout messages from migration `0047`, worded `"Too many invalid join code attempts..."`).
- If only join/trip-lookup is failing with a lockout message, this is the join-code brute-force limiter working as designed (5 failed attempts / 15 min, migration `0047_security_hardening_phase2_join_limits.sql`) — not an outage. Direct the affected user to wait out the cooldown; do not attempt to clear `trip_join_attempts` manually without confirming this is a genuine false positive, since that table's permissions are intentionally revoked from client roles.

## Recovery
- If Supabase itself is down: no client-side fix exists — wait for Supabase to recover. The app remains usable offline for previously-synced data (`docs/explanation-offline-caching.md` — "no offline-first write conflicts... all writes go straight to IndexedDB").
- If a specific migration broke a query: identify the migration from `supabase/migrations/` (84 files as of this writing, most recent `0084_expense_extra_photos.sql`) most likely tied to the failing feature, and apply a forward-fixing migration rather than attempting to hand-edit schema — this repo's only documented migration-apply paths are `scripts/apply-migration.mjs` and `scripts/apply-security-migrations.mjs`, both of which require `SUPABASE_PROJECT_REF`/`SUPABASE_DB_PASSWORD` env vars and connect directly via `pg` to `db.<project-ref>.supabase.co`.
- If env vars are missing/wrong on a deployed build: fix the GitHub Actions secret and re-run the deploy workflow (see [Application Down](application-down.md) for the redeploy trigger).

## Validation
- Reproduce the original failing action (sign-in, add+sync an expense, join a trip) and confirm it now succeeds against the real Supabase project (not the dummy client).
- Confirm no new entries keep landing in the browser's local `syncQueue` (`src/store/tripStore.ts`) — a shrinking/empty backlog indicates sync has resumed.

## Rollback
No verified rollback mechanism found for a Supabase-side outage — this is a third-party dependency, not an app deployment. For a bad forward-fix migration, write and apply a corrective migration; this repo does not use down-migrations.

## Escalation
Escalate to Supabase support if the outage is confirmed on their status page and persists. Escalate to a human with `SUPABASE_DB_PASSWORD` access before running any `apply-migration.mjs`/`apply-security-migrations.mjs` command — these connect directly to production Postgres.

## Do Not
- Do not run `apply-migration.mjs`/`apply-security-migrations.mjs` against production without a human confirming the target migration and reviewing its SQL first — both scripts execute arbitrary SQL files directly against the production database with no dry-run.
- Do not attempt to bypass RLS or grant `anon`/`authenticated` broader permissions "to get things working again" — migrations `0046`–`0048` deliberately revoked mutating anon permissions and added statement timeouts as security hardening; reverting them reopens the anti-DDoS/tampering protections documented in `docs/reference-security-and-anti-bot-defense.md`.
- Do not manually clear or edit `trip_join_attempts` or other lockout state without confirming a genuine false positive.

## Root Cause Follow-Up
- If caused by a bad migration, add a regression check (existing test suite: `npm test` via Vitest, e.g. `src/services/tripApi.test.ts`) covering the broken path before merging the fix.
- If caused by missing secrets on a deploy target, confirm both `deploy-ec2.yml` and `deploy-pages.yml` have the env vars they're each expected to need — NOT VERIFIED what Pages is supposed to do without them.
