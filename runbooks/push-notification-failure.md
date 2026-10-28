# Incident: Push Notifications Not Delivering

## Purpose
Diagnose why users stop receiving push notifications (new expense, settlement, trip chat, etc.) via the Supabase Edge Function `send-push`.

## Impact
Users miss real-time alerts but all core app functionality (adding expenses, viewing trips, offline usage) is unaffected — `src/services/pushApi.ts` treats push as best-effort and explicitly never blocks the caller's primary action on push failure.

## Severity
P2 — degraded but non-blocking. Escalate to P1 only if it correlates with a broader Supabase/Edge Function outage also affecting other features.

## Symptoms
- `sendPushNotification()` (`src/services/pushApi.ts`) returns `{ ok: false, ... }`.
- Console error `"Push notification failed: ..."`.
- Response body includes `rateLimited: true` — this is the Edge Function's own rate limiter, not a Supabase outage.
- Devices stop receiving notifications despite the app reporting successful send (would indicate an APNs/FCM-side or `device_push_tokens` staleness issue rather than a `send-push` failure — NOT VERIFIED, outside this function's visibility).

## Immediate Actions
1. Confirm this is isolated to push (other Supabase-backed features like sync/auth working normally) — if not isolated, treat as [Supabase/Database Unavailable](supabase-database-unavailable.md) instead.
2. Check whether failures are `rateLimited: true` (expected throttling, not an incident) vs. a hard error.

## Diagnosis
- Inspect the Edge Function invocation error via `supabase.functions.invoke('send-push', ...)` — note the code already handles the case where a non-2xx response resolves rather than throws, and separately parses the `{error, rateLimited}` JSON body from `error.context` (a `FunctionsHttpError`). A generic/unparsed error suggests the Edge Function crashed or returned an unexpected shape rather than its normal rate-limit response.
- Check the Supabase project's Edge Function logs for `send-push` (dashboard) for stack traces — NOT VERIFIED, no CLI/script in this repo surfaces Edge Function logs.
- Confirm `device_push_tokens` table (migration `0045_add_device_push_tokens.sql`) is reachable and not the source of a query failure (statement timeout, RLS misconfiguration) masquerading as a push failure.

## Recovery
- If rate-limited: this is expected behavior; no recovery action needed beyond waiting for the window to reset. NOT VERIFIED what the exact rate-limit window/threshold for `send-push` is — check the Edge Function source (not in this repo's `src/`, likely in a separate Supabase Functions directory not scanned here).
- If the Edge Function is erroring: this requires a fix/redeploy of the Edge Function itself, which is outside `src/` and this repo's documented deploy pipeline — NOT VERIFIED where its source/deploy process lives.
- If `device_push_tokens` queries are failing due to a broader DB issue, follow [Supabase/Database Unavailable](supabase-database-unavailable.md).

## Validation
- Trigger a real notification-worthy action (e.g. add an expense in a trip with another registered member) and confirm `sendPushNotification` returns `{ ok: true }` and the device receives it.

## Rollback
No verified rollback mechanism found — Edge Function deployment process is not present in this repo's scanned scope.

## Escalation
Escalate to a human with Supabase project / Edge Function deploy access, since the `send-push` function's source and deploy process are not part of this repository as scanned.

## Do Not
- Do not retry-loop push sends aggressively to "force" delivery — this risks tripping the Edge Function's own rate limiter harder and is explicitly designed to be best-effort/non-blocking.
- Do not disable or bypass the rate limiter as a workaround.

## Root Cause Follow-Up
- If the Edge Function source lives in a separate repo/location, consider documenting that location here for future incidents (currently NOT VERIFIED from this codebase alone).
