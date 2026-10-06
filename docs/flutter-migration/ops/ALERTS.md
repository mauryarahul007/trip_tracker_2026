# Alerts, thresholds and the on-call note (Phase 11.4)

Queries live in `observability.sql` (section numbers below). Nothing here pages anyone automatically: Supabase has no built-in alerting on SQL, so a human or a scheduled check looks at these during beta and rollout. Thresholds are **proposals for the owner to confirm** (decision A1).

## 1. Owner and on-call note
- **Owner / first responder:** Rahul (single maintainer).
- **During a rollout stage:** check the dashboard at the start, +1 h, +4 h and next morning (see `ROLLOUT.md` go/no-go).
- **Out of hours:** nothing wakes you. That is why the ladder is staged and the kill switches (`ROLLOUT.md` section 4) exist.

## 2. Thresholds (proposed)
| Signal | Source | Warn | Halt the rollout |
|--------|--------|------|------------------|
| Sync failure rate, Flutter | sec. 2 `sync_fail_pct` | > 1% of active users for a day | > 2% over 1 h, or twice the Capacitor rate |
| Stuck queues, Flutter | sec. 3 | > 0.5% of active users | > 2% |
| Crash cases per 100 DAU, Flutter | sec. 6 | > 1 | > 3, or any new crash fingerprint hitting > 5 cases in an hour |
| DAU drop vs the previous same weekday | sec. 1 | -15% | -30% (sign-in or sync broken) |
| Push tokens per active Flutter user | sec. 5 | < 0.5 after day 3 (prompt never accepted) | token count falls (sign-out bug) |
| Auth errors | Supabase Auth logs | 2x baseline | 5x baseline, or any Apple/Google sign-in outage |
| Edge function `send-push` 4xx/5xx | Edge function logs | > 5% | > 20% |
| Join lockouts | sec. 8 | `locked_now` > 20 | rising steadily (brute force) |

Baselines: record the Capacitor numbers for the week **before** the first beta; compare Flutter to them, not to zero.

## 3. Runbook: `send-push` failures
1. Supabase, Edge Functions, `send-push`, Logs. Filter on status >= 400.
2. `UNREGISTERED` / `NOT_FOUND`: expected, the function deletes the token. Many in a row after a release = tokens rotated or the app was reinstalled.
3. `401/403` from FCM: the `FCM_SERVICE_ACCOUNT_JSON` secret is wrong or revoked. Re-set the secret, redeploy.
4. `429` from our own rate limit: check `settlement_reminder` cooldown (24 h) and per-user limits before raising them.
5. Nothing delivered but no errors: check `device_push_tokens` for the user (sec. 5), `quiet_hours_prefs`, `trip_mutes`, and `notification_digest_prefs` (digest users get a daily summary, not a push).
6. Log retention: Supabase keeps edge logs for a limited time (plan dependent, **verify on this project**). Export before a risky release if you need a longer history.

## 4. Gaps (honest list)
- **No push delivery log.** Delivery rate cannot be computed; only token supply and edge errors.
- **No auth-failure series in SQL.** Use Auth logs.
- **No p95 latency in SQL.** Use the dashboard.
- **Guest and vault exposure unmeasured** (see `LEGACY_DATA.md` section 3).
- **Outbox quarantine count is not an event.** `sync_fail` approximates it.
- **Crash users not countable** (`bugs` has no `user_id`; `API_CONTRACT.md` says it does, which is wrong).

## 5. Proposed additive migrations (DRAFTS, not applied)
Numbers are placeholders: latest applied is `0115`; take the next free numbers and record them in `HANDOFF.md`. Both are additive and safe to roll back.

```sql
-- 0116_app_events_more_kinds.sql (draft)
-- Allow the extra content-free events the final Capacitor release and Flutter want to send.
alter table public.app_events drop constraint if exists app_events_event_check;
alter table public.app_events add constraint app_events_event_check
  check (event in ('app_open','sync_fail','queue_stuck','flush_ok',
                   'outbox_quarantine','guest_trips_present','vault_docs_present'));
-- Rollback: re-add the original 4-value check (see 0108).
```

```sql
-- 0117_trips_import_batch.sql (draft)
-- Idempotent backup restore (BACKUP_IMPORT.md): a marker so the same file is not imported twice.
alter table public.trips add column if not exists import_batch_id text;
create unique index if not exists trips_owner_import_batch_uidx
  on public.trips (owner_id, import_batch_id) where import_batch_id is not null;
-- Rollback: drop index if exists trips_owner_import_batch_uidx; alter table public.trips drop column if exists import_batch_id;
-- The Flutter client must also send the column through create_trip / its upsert path (Phase 4 contract) before this is useful.
```

Decision A2: approve these two drafts? Until then B-146 (duplicate restore) and the missing events remain open.
