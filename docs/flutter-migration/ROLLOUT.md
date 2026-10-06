# Staged rollout and rollback plan (Phase 11.5)

Goal: move existing Capacitor users to the Flutter app without losing data and with a way back. Owner decisions are marked **[Owner]**. Metrics and queries: `ops/observability.sql`, thresholds: `ops/ALERTS.md`.

## 1. Facts this plan rests on
- Flutter ships as an **update** of the same store listings (`com.triptracker.app`, D2). After a store update there is **no way to put the Capacitor build back** for those users.
- The backend serves both clients (D11): changes are additive only.
- The Capacitor app updates itself **over the air** (Capgo manifest), so a last web release can reach Capacitor users without store review (`contract/FINAL_CAPACITOR_RELEASE.md`). The Flutter app has no OTA (D9): fixes need a store release.
- The web app is unaffected and keeps deploying from `main`.

## 2. Release ladder
| Stage | Audience | Channel | Minimum soak | Entry condition |
|-------|----------|---------|--------------|-----------------|
| 0. Internal | Owner and 2-3 testers | TestFlight internal, Play internal | 3 days | Phase 12 device QA passes; backup/restore drill done (section 5) |
| 1. Closed beta | 10-30 invited users, **including the owner's real trips** | TestFlight external, Play closed track | 7 days | Stage 0 go |
| 2. 10% | Store staged rollout / App Store phased release day 1-2 | Production | 3 days | Stage 1 go; final Capacitor release live for >= 7 days |
| 3. 50% | same | Production | 3 days | Stage 2 go |
| 4. 100% | everyone | Production | n/a | Stage 3 go |
| 5. Sunset | Capacitor retired | n/a | n/a | Cutover window ended (section 3), owner decision |

Apple's phased release is time-based and can be paused; Play staged rollout can be halted and its percentage raised only. **[Owner]** confirm the stages and soak times.

## 3. Contract-freeze window
From the first beta until the **sunset date**, backend changes are limited to:
- additive columns, tables, RPCs, indexes, new flags and config keys;
- **never**: dropping or renaming a column, table or RPC; narrowing an RLS policy; changing an RPC's argument list or return shape; removing a flag.

Length: **at least two store release cycles after the 100% stage** (the time installed Capacitor builds need to disappear) **[Owner: set the sunset date]**. Anything that needs a destructive change waits until after sunset, then ships with a rollback script.

## 4. Kill switches
| What can go wrong | Switch | Who flips it | Effect |
|-------------------|--------|--------------|--------|
| Whole app unusable | `app_config.maintenance_mode` = true | Ops Deck / SQL | Flutter shows "Back soon" (web unaffected) |
| A bad build must stop being used | Raise `min_supported_version_<platform>` | SQL on `app_config` | Old builds see "Update required". Cannot lock out the *fixed* build |
| A risky feature | Its Ops Deck flag (see below) | Ops Deck | Flutter re-reads flags on start, sign-in and after 15 min in the background |
| Push misbehaving | Stop `send-push` (disable the function) or flip `enableQuietHours`/`enableDigestNotifications` | Supabase dashboard | In-app notifications keep working |
| Telemetry load | `enableGrowthTelemetry` off | Ops Deck | DB refuses new `app_events` |
| Staged rollout going badly | Halt rollout in the store console | Owner | Users already updated stay updated |

Flagged Flutter features (each can be flipped off server-side): chat (`enableTripChat`), live location (`enableLiveLocationShare`), receipt OCR (`enableReceiptOcr`), voice (`enableVoiceInput`), travel passes (`enableTravelPasses`), weather nudges (`enableWeatherItineraryNudges`), offline snapshot (`enableOfflineSnapshot`), Trip Wrapped / badges / passport (`enableTripWrapped`, `enableAchievements`, `enableTravelerPassport`), calendar export (`enableIcsExport`), notification grouping, quiet hours, digest, growth telemetry, feature suggestions, What's new, AMOLED, biometric lock, simplify-debts toggle, approval threshold. **Gaps (no server switch):** backup export/restore, the push permission prompt and token registration, the auto bug reporter, Diagnostics. Logged as B-175.

## 5. Data safety before the first beta
- **Backups:** confirm on the production Supabase project whether Point-in-Time Recovery or daily backups are on and the retention. **Not verified from the repo; needs the dashboard (B-176).** Record plan, retention and the date checked here.
- **Restore drill:** restore the latest backup into a scratch project, run the RLS suite and a smoke sign-in, record the time it took. Schedule date: ______ **[Owner]**.
- **Per-user safety net:** the Flutter outbox keeps work until the server acks; sign-out flushes first (`beforeWipe`).

## 6. Go / no-go checklist (every stage)
Collect numbers at stage start, +1 h, +4 h, +24 h, then daily.
- [ ] Sync failure rate (Flutter) below the halt threshold and not worse than Capacitor's baseline
- [ ] Stuck queues below threshold
- [ ] Crash cases per 100 DAU below threshold; no new fingerprint spiking
- [ ] DAU not dropping against the same weekday
- [ ] Push tokens being registered; no `send-push` error spike
- [ ] Auth errors at baseline; Google and Apple sign-in both confirmed by a human on a device
- [ ] No data-loss report (queue lost, missing expenses). **Any single confirmed data-loss report is an automatic halt**
- [ ] Support inbox / bug ledger reviewed
Decision recorded with date and numbers at the end of this file.

## 7. Rollback, precisely
| Situation | Action |
|-----------|--------|
| Flutter bug, data intact | Halt rollout; fix; release a new Flutter build; raise `min_supported_version` to the fixed build once it is live |
| Flutter bug that corrupts server data | Halt; flip the risky feature flag or `maintenance_mode`; restore affected rows from backup (section 5) |
| Backend change broke Capacitor | Roll back the migration (every migration carries rollback SQL); this is why the freeze window exists |
| Users want Capacitor back | Not possible after store update. Web app remains available (browser) |
| Whole migration judged a failure | Stop at the current stage; Capacitor installs not yet updated keep working; keep the backend dual-client |

## 8. Open decisions
R1 stages and soak times; R2 sunset date and freeze length; R3 who has the store console and flips switches when the owner is away; R4 restore-drill date.

## 9. Decision log
| Date | Stage | Numbers | Decision | By |
|------|-------|---------|----------|----|
| | | | | |
