# Performance baseline (Phase 0 of docs/UX_ROADMAP.md)

Run: `cd flutter_app && flutter test test/perf` (tag `perf`, about 40 s). Re-run after each Phase 2 step and add a row.

**What it measures:** a seeded trip with 500 expenses, opened on each tab through the real router. It is a widget test, so nothing is rasterised: the numbers are build-cost proxies (wall time for open and settle, on-stage widget and Text counts, time for one fling). Settle includes fixed 15 ms real waits, so compare runs, not absolute values. Real frame timing still needs `flutter run --profile` with DevTools on a device.

## Baseline: 2026-10-23, v3.77.5 + header Sync button, dev machine

| Metric | Expenses | Ledger | Notes |
|--------|----------|--------|-------|
| Open + settle | 539 ms | 250 ms | 554 ms |
| Widgets on stage (whole shell) | 3173 | 3173 | 3241 |
| Text widgets on stage | 20 | 80 | 20 |
| One fling | 267 ms | 406 ms | 107 ms |

Seeding 500 expenses through the repository: about 32 s (about 64 ms per submit).

## Findings
- The Expenses tab already paginates (shows 50 with **Load more**), so it is not the lazy-list problem the code count suggested. Phase 2 step A4 should focus on the Ledger (slowest fling, most Text on stage) and Notes.
- The widget count is the same across tabs because the trip shell keeps all tab pages alive (`_KeepAlive`). Memory cost of that is worth a look in A5.
- A real-device profile (cold start, scroll jank on the ledger with 500 expenses) is still to be captured and added here.

## Not done
- **B24 telemetry:** `GrowthTelemetry` sends content-free events from a server-side allowlist (`app_open`, `sync_fail`, `queue_stuck`, `flush_ok`) behind `enableGrowthTelemetry`. Screen timings would need new server-accepted event names and a Supabase migration, so they are deferred until you decide that is wanted. Local timing lives in this harness for now.

## Phase 2 measurements (2026-10-23): is the Ledger's build maths slow?

`flutter test test/perf/ledger_compute_baseline_test.dart`: the pure functions the Ledger runs inside `build()`, averaged over 20 runs in the test VM (slower than a release build).

| Expenses | calculateSettlements | computeTotals | memberSpend | spendByDay | Sum |
|----------|----------------------|---------------|-------------|------------|-----|
| 500 | 0.88 ms | 0.74 ms | 0.39 ms | 0.21 ms | about 2.2 ms |
| 5,000 | 1.98 ms | 0.66 ms | 0.76 ms | 0.67 ms | about 4.1 ms |

A frame is 16 ms. Even at 10x the baseline trip, the maths is a quarter of one frame, so moving it to an isolate (A7), scoping watches with `select` (A5) or lazy lists in the Ledger (A4) are **not justified by these numbers**. The Ledger is a dashboard of a few dozen fixed sections, not a long list; the 500 expenses only feed aggregates.

## Found by reading, not yet measured
- `CachedPhotoProvider` decodes every photo at full resolution; callers show trip covers, avatars and thumbnails with no `ResizeImage`. Wrapping at those call sites is a cheap, low-risk memory and decode-time win (B3).
- `main()` awaits `AppSupabaseGateway.initialize` before `runApp`, so the first frame waits for it (B4). Profile cold start on a device before touching this: providers read `Supabase.instance` synchronously.

