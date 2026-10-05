# Phase 1 (BE): Contract freeze, inventory, golden fixtures

**Track:** Backend / contracts · **Size:** M · **Depends on:** nothing · **Parallel with:** Phase 2
**Read first:** [README.md](README.md). **No schema changes in this phase.**

## Goal
Turn the implicit contract between the React client and Supabase into explicit, versioned documents and machine-readable fixtures, so every later phase (and every AI) builds against the same truth.

## Inputs to read (and nothing more)
- `supabase/migrations/*.sql` (all 110; skim for `create table`, `policy`, `function`, `storage.buckets`, `publication`)
- `src/types/database.ts` (DB row shapes), `src/types/index.ts` (app shapes), `src/types/admin.ts` (flags)
- `src/services/*.ts` (esp. `tripApi.ts`, `tripMessagesApi.ts`, `notificationsApi.ts`, `featureFlagApi.ts`, `pushApi.ts`, `locationShareApi.ts`, `chatReadCursorApi.ts`, `growthApi.ts`)
- `supabase/functions/*/index.ts`, `supabase/config.toml`
- `src/utils/featureFlags.ts`, `src/utils/flagPresets.ts`
- `docs/reference-data-model.md`, `docs/reference-data-integrity-acid.md`, `docs/explanation-offline-caching.md`

## Tasks

### 1.1 API contract: `contract/API_CONTRACT.md`
Per section, table form, with file/line pointers:
1. **Tables:** every table the client touches (start from the 19 in README §2, then follow FKs): columns, types, nullability, defaults, FKs, soft-delete columns, `updated_at` presence, and the **camelCase app field ↔ snake_case column** mapping (use `database.ts` + the row→app mappers in `tripApi.ts`).
2. **ID strategy:** are IDs client-generated? Are they UUIDs or `trip-{timestamp}` strings (the older data-model doc says the latter; `src/utils/uuid.ts` suggests UUIDs)? Record the truth per table: Phase 4/5 depend on it.
3. **RLS summary per table:** who can select/insert/update/delete (owner, member, linked user, anon via share/join). Plain English + policy name. Flag any `security definer` RPC that bypasses RLS and why.
4. **RPC catalogue:** every `.rpc(...)` the client uses (grep) plus any referenced in migrations: name, args (names/types), return shape, auth requirement (anon/authenticated/superadmin), error codes raised, idempotency (safe to replay? y/n).
5. **Realtime:** which tables are in the `supabase_realtime` publication, filter expressions each channel uses, presence/broadcast payload shapes (`usePeerPresence.ts`, `TripChatPanel.tsx`), required replica identity.
6. **Storage:** every bucket (incl. the one added in `0046`), public/private, size + mime limits, path conventions (`{tripId}/{expenseId}/…`), signed-URL TTL used by client, RLS on `storage.objects`.
7. **Edge functions:** request/response shape, auth (JWT vs service role), cron/trigger source, env vars needed. Include the **notification catalogue**: every `type` + `params` accepted by `send-push` `renderNotification`, and the FCM `data` payload keys the client uses to deep-link.
8. **Auth:** providers enabled, redirect URLs, custom-scheme URL used by native Google OAuth (`src/utils/nativeAuth.ts`, `authStore.ts`), email templates, whether Supabase-level captcha is on (`config.toml`), session handling, `profiles` auto-creation trigger, banned-user flow (`set_user_banned`, `signInsPaused`).
9. **Feature flags:** how `get_resolved_feature_flags`, `get_public_growth_flags`, `set_feature_flag_override`, `get_app_config`/`get_app_flag` fit together; response shape.

### 1.2 Parity matrix: `PARITY_MATRIX.md`
One row per user-visible screen/feature. Columns: `web source file(s)` · `feature flag key` · `pack` · `tier (T1–T4/out)` · `Flutter phase` · `status` · `test-steps anchor in FEATURE_TEST_STEPS.md`.
Seed from `src/components/*` (list in each FE phase file), `src/main.tsx` routes, `TripNavTab`, and the flag registry. **Every flag key appears at least once** (or is marked "no UI"). Mark Ops Deck rows `out`.

### 1.3 iOS defect list: `contract/IOS_DEFECTS.md`
Extract iOS/WebKit-specific bugs from `BUGS.md`, `bugs/bugs.json`, `docs/explanation-mobile-compositor-and-webkit-performance.md`, `docs/explanation-trip-stack-and-viewport-architecture.md`, `docs/explanation-navigation-and-offline-fixes.md`. Each becomes an acceptance check for Flutter ("keyboard never covers composer", "trip stack swipe is 60fps", …). Phase 12 re-verifies the list.

### 1.4 Golden fixtures: `fixtures/`
Create **one new isolated script** `scripts/export-golden-fixtures.mjs` (+ a vitest-compatible harness if needed) that runs the *existing TS pure functions* over curated + edge-case inputs and writes JSON `{ "input": …, "expected": … }` files. Do not modify the TS functions. Minimum coverage:

| Module (`src/utils/…`) | Must include cases for |
|---|---|
| `settlement.ts` | equal/custom-weights/exact/percent splits, multi-payer (`0104`), rounding remainders, simplify-debts on/off, settlements applied, archived members, zero/negative, 1-member trips |
| `defaultSplit.ts`, `memberRoles.ts` | exclusion defaults, role gating |
| `currency.ts`, `currencyConverter.ts`, `currencyFx.ts`, `countryCurrencyMap.ts` | zero-decimal currencies (JPY), rounding, FX config overrides |
| `expenseQuickParser.ts`, `mathExpression.ts` | amount/currency/date/payer parsing, `12*3+4`, invalid input |
| `tripCollabMerge.ts` | concurrent edits, tombstones, field-level merge |
| `duplicateExpenseDetector.ts`, `burnRate.ts`, `predictiveExpenses.ts` | thresholds |
| `categoryKeywords.ts`, `categoryHelper.ts` | keyword → category |
| `splitwiseImport.ts`, `backupValidation.ts`, `csvExport.ts`, `icsExport.ts` | real-shaped sample files in/out |
| `passParser.ts`, `passBackStub.ts`, `chatExpenseCards.ts`, `notificationGroups.ts`, `notificationText.ts` | each notification `type` from 1.1.7 |
| `tripSort.ts`, `tripSuggest.ts`, `tripDestination.ts`, `groupNaming.ts`, `dateRange.ts`, `relativeTime.ts`, `joinDeepLink.ts`, `upiLinks.ts`, `signupAttribution.ts`, `syncQueueLabel.ts`, `travelerPassport.ts`, `achievementBadges.ts`, `packingSuggestions.ts`, `shareText.ts` | representative + edge |

Also export **row ↔ app mapping fixtures**: for each table, a sample DB row (snake_case JSON as PostgREST returns it) and the expected app object, so Dart models can be tested against real shapes.
Add `fixtures/README.md`: how to regenerate, determinism rules (no `Date.now()`; inject clocks/timezones; fixed `TZ=UTC`).

### 1.5 Test-steps index
In `PARITY_MATRIX.md` add a column linking each feature to its heading in `docs/FEATURE_TEST_STEPS.md`. Features with no steps are listed under "needs acceptance criteria" for the owning FE phase to write (appended to `docs/FEATURE_TEST_STEPS.md`, per repo rule).

## Deliverables
`contract/API_CONTRACT.md`, `contract/IOS_DEFECTS.md`, `PARITY_MATRIX.md`, `fixtures/**`, `scripts/export-golden-fixtures.mjs`, `HANDOFF.md` entry.

## Out of scope
Any migration, RLS change, edge function change, Dart code.

## Exit criteria
- [ ] Every table/RPC/channel/bucket/function referenced by `src/` appears in the contract (verify with a grep checklist appended to the contract).
- [ ] Every flag in `featureFlags.ts` is in the matrix with a tier.
- [ ] Fixture script runs from a clean checkout (`node scripts/export-golden-fixtures.mjs`) and is deterministic (two runs → byte-identical output).
- [ ] `npm run lint && npm run build && npm test` unchanged/green.
- [ ] Open questions (ID strategy, bucket purposes, any undocumented RPC behaviour) listed in `HANDOFF.md`.
