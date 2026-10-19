# Backend security and compliance review for the cutover (Phase 11.6)

A read of the repo as of 3.45.0 (migrations to `0115`, edge functions, workflows). It is **a review, not a penetration test**, and not a substitute for the `/cso` audit the phase file offers: run that if you want a deeper pass. Items marked **verify** need the live Supabase project or dashboards.

## 1. Secrets
| Check | Result |
|-------|--------|
| Private keys / service accounts in tracked files | None found (grep for `BEGIN PRIVATE KEY`, `"private_key"`, service-role patterns outside docs) |
| `.env` ignored | Yes (`.gitignore`); only `.env.example` is tracked |
| Firebase client files | `android/app/google-services.json` and `ios/App/App/GoogleService-Info.plist` **are committed** (Capacitor). They hold client API keys, which Firebase treats as non-secret, **but they should be restricted by app id / SHA in Google Cloud Console** (**verify**). The Flutter app can reuse the same project (D2) |
| FCM service account | Read from `FCM_SERVICE_ACCOUNT_JSON` in edge function secrets, not in the repo |
| Flutter env | `flutter_app/env/*.json` are `dev`, `staging`, `prod` **examples/config**; confirm the real `prod.json` is not committed and holds only the anon key and URL (**verify**) |
| Anon key in the app | Expected and safe **only because RLS is on every table**; the RLS suite is the control |

## 2. Abuse and rate limits
| Surface | Control found | Gap |
|---------|---------------|-----|
| `lookup_trip_by_join_code` (signed in) | Per-user failed-attempt lockout (`trip_join_attempts`, migration 0047) | None seen |
| `preview_trip_by_join_code` (anonymous) | IP-keyed lockout using request headers (0081) | Behind a proxy the IP comes from headers: **verify** the header trusted is the Supabase edge one, not client-supplied |
| `get_trip_share`, `get_shared_location` | Unguessable uuid tokens; expiry; revoke | No throttle on repeated random guesses; the 128-bit token space makes enumeration impractical. Add a counter only if logs show probing |
| `get_app_version_gate`, `get_app_flag`, `get_public_growth_flags` (anonymous) | Read-only, tiny | Anonymous RPC cost: they are cheap; watch request volume after launch |
| `register_device_push_token` | Authenticated, per user | A user could register many tokens; `send-push` prunes dead ones. Add a per-user cap if the table grows oddly (sec. 5 of `observability.sql`) |
| `send-push` | Cooldown for settlement reminders; per-call recipient list | **Verify** the function checks the caller is a member of the trip it names, not just that it is authenticated |
| `report_bug`, `submit_feature_request` (authenticated, any user) | None seen | A signed-in user can flood the ledger. The Flutter auto-reporter limits itself (5 per session, de-duplicated); a server-side per-user rate limit is not present. Logged as B-177 |
| `app_events` insert | RLS: own user, only while telemetry flag on; unique `app_open` per day; props < 512 bytes | `event` values limited by CHECK; extending needs the draft migration |

## 3. Data exposure
- **Telemetry** carries no expense, member or search text (design rule in 0108); Flutter follows it.
- **Bug reports** from Flutter pass a PII scrubber (emails, phones, tokens) before sending; unit-tested, **real payloads not yet reviewed (B-161)**.
- **Receipts** private bucket, signed URLs 1 h (API contract section 6).
- **Document vault** never leaves the device by design; the final Capacitor release must keep it that way.
- **Backups** (Settings export) are a plain JSON file the user shares; they contain trip and member names. The UI says so only implicitly; add a line (B-178).

## 4. Deletion and retention (input to Phase 12 privacy answers)
- `delete_own_account` cascades the user's data and anonymises historical expenses (API contract). **Verify against staging** (B-013).
- `app_events` purge: weekly job deletes rows older than 180 days (0108).
- Recycle bin: soft-deleted expenses purge after 24 h.
- Push tokens: removed on sign-out (Flutter) and on `UNREGISTERED`.
- Deletion SLA stated in the privacy policy: 30 days for grievance requests; account deletion is immediate. Confirm wording with the owner.

## 5. RLS suite
Phase 4 produced the policy tests. Before the first beta: run them against a **prod-parity staging project** and record the date and result here: ______ (**blocked on a staging project, B-001**).

## 6. Findings to act on
1. Restrict the Firebase API keys in Google Cloud Console (**verify**).
2. Confirm `send-push` authorises the caller against the trip.
3. Add a per-user rate limit for `report_bug` / `submit_feature_request` (B-177).
4. Confirm the anonymous join preview trusts the right IP header.
5. Run the RLS suite on staging and record it.
