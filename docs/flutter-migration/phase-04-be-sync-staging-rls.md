# Phase 4 (BE): Sync/idempotency contract, staging environment, RLS & realtime tests

**Track:** Backend · **Size:** L · **Depends on:** Phase 1 · **Parallel with:** 2, 3
**Read first:** [README.md](README.md), `contract/API_CONTRACT.md`. **Additive only (D11).**

## Goal
Make offline-first sync **safe for a second client implementation**: idempotent writes, a reliable "what changed since" read path, deterministic conflict rules, plus a staging project and automated RLS/realtime tests so the Flutter sync engine (Phase 5) can be proven correct.

## Inputs
`src/store/tripStore.ts` (esp. `syncQueue`, `collectDirtyExpenseIds`, the hydrate/merge code ~lines 470–900 and 1200–1400, `subscribeTripCollab` ~3675), `src/utils/tripCollabMerge.ts` (+ test), `src/utils/syncQueueLabel.ts`, `src/services/tripApi.ts`, `docs/explanation-offline-caching.md`, `docs/reference-data-integrity-acid.md`, migrations `0104`, `0109`, `0110`, and the soft-delete/recycle-bin migrations (find with grep `deleted_at`).

## Tasks

### 4.1 Reverse-engineer the current sync semantics → `contract/SYNC.md`
Document precisely, with code pointers:
- Every `SyncQueueItem` `type` and its payload; replay order, retry/backoff, failure handling, dedupe/collapse rules, what "dirty" means for protecting local edits during refresh.
- How server state is merged over local state (per entity), including `fetchMyTripGraph` shape and when full vs partial fetches occur.
- Conflict policy per entity (last-write-wins? field-level via `tripCollabMerge` / `set_trip_collab_field`?), including who wins for concurrent expense edits, member renames, checklist toggles.
- Tombstones: soft delete columns, recycle-bin retention (`purge_recycle_bin_older_than`), restore semantics.
This is the **specification Phase 5 implements**. Where behaviour is accidental, mark it `ACCIDENTAL: keep|fix` with a recommendation.

### 4.2 Idempotent writes
For each queued mutation type, ensure a **replay-safe** server path:
- Client-generated primary keys accepted on insert (confirm column types; if some are `text` timestamps like `trip-1722…`, define the Flutter ID format: UUIDv4 strings are the recommendation; ensure the DB accepts both).
- `insert … on conflict (id) do nothing/update` semantics via RPC or PostgREST `Prefer: resolution=merge-duplicates` where safe; otherwise add thin idempotent RPCs (e.g. `upsert_expense_v1`) **without removing existing paths**.
- Non-idempotent RPCs (`confirm_settlement`, `approve_expense`, dispute flows, `claim_trip_member`) get documented replay behaviour; add guards/`already_done` returns where replay would error or double-apply. Record each in the contract.
- Optional `client_mutation_id uuid` accepted by mutating RPCs + a small `processed_mutations(user_id, id, created_at)` table (TTL purge) if the above is insufficient. Only add if Task 4.1 shows a real double-apply hazard.

### 4.3 Incremental read path
Phase 5 needs cheap resync after offline periods:
- Ensure every synced table has `updated_at` maintained by trigger (add `moddatetime`-style trigger where missing) and an index on `(trip_id, updated_at)`.
- Soft-deleted rows must remain queryable as **tombstones** (`deleted_at`) for at least the sync window; document the window.
- Provide `select … where updated_at > :cursor` guidance, or an RPC `get_trip_changes(trip_id, since timestamptz)` returning rows + tombstones for trip, members, groups, categories, expenses (single round trip, RLS respected). Prefer the RPC if PostgREST pagination ordering makes cursoring unreliable; justify in the contract.
- Define cursor semantics (server `now()` high-water mark, overlap window to avoid clock skew).

### 4.4 Realtime guarantees
- Confirm publication membership and `replica identity` for tables the client subscribes to (`0110_trip_row_realtime.sql` covers trips). Add missing tables additively.
- Document which events the client may rely on vs must re-fetch after (e.g. missed events while backgrounded). Define the **"resubscribe → delta sync"** rule Flutter will follow after any reconnect.
- Verify RLS filters apply to realtime for members vs non-members (a leaked-event test is part of 4.6).

### 4.5 Staging environment
- Create (owner provisions; you script) a **staging Supabase project** that mirrors prod schema via `supabase db push` of all migrations; seed script `supabase/seed/staging_seed.sql` (or TS script) with: 3 users (owner, member, outsider), trips covering every split mode, multi-payer expense, settlements, disputes, soft-deleted rows, chat messages (all kinds), passes, notifications.
- Document the env matrix (dev=local `supabase start`, staging, prod) and the rule **"no automated test ever points at prod"**.
- Test-user provisioning: confirmed-email accounts + a documented way to mint JWTs for CI (service-role only in CI secrets, never in the app).

### 4.6 Automated tests (backend)
- **RLS test suite** (pgTAP or SQL + `set local role authenticated; set local request.jwt.claims …`): for every table in the contract, matrix of owner/member/outsider/anon × select/insert/update/delete with expected allow/deny. Include RPC `security definer` abuse cases (calling with another user's ids).
- **Realtime test** (small Node script with `@supabase/supabase-js` as two users): member receives events, outsider does not; reconnect + delta fetch returns missed rows.
- **Idempotency test:** replay every mutation type twice → single effect.
- Wire into `.github/workflows/backend-tests.yml` (runs on `supabase/**` changes; local Supabase via CLI in CI).
- Existing web tests must still pass.

### 4.7 Performance & limits
Check indexes for the hot queries from `fetchMyTripGraph`/`fetchExpensesForTrip`/chat pagination; add missing ones. Record row-count assumptions and payload size for a large trip (e.g. 500 expenses, 20 members) and any pagination the Flutter client must implement.

## Deliverables
`contract/SYNC.md`, migrations (`0111+`; coordinate numbering with Phase 3, check the highest existing number first and **claim numbers in `HANDOFF.md`**), staging seed/scripts, RLS/realtime/idempotency test suites + CI workflow, contract updates, `HANDOFF.md` entry.

## Out of scope
Flutter code; changing existing RLS semantics (only *add* tests and, if a hole is found, fix it with a documented additive/tightening migration **approved by the owner** because tightening can break the web app).

## Exit criteria
- [ ] `contract/SYNC.md` reviewed: every queue type has a documented replay-safe server path.
- [ ] RLS matrix tests green on local and staging; any discovered hole documented with severity (and not silently fixed).
- [ ] Double-replay test passes for all mutation types.
- [ ] `get_trip_changes` (or documented alternative) returns correct rows + tombstones for a seeded trip with edits, deletes and restores.
- [ ] Staging project seeded; Phase 5 agent can run against it with documented env vars only.
- [ ] Web CI + web smoke against staging pass.
