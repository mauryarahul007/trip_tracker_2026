# UX, stability and speed roadmap (Flutter app)

Living plan. Item ids: **A1–A14** from the evaluation, **B1–B24** from the extra ideas. 🚩 = needs a Superadmin flag (+ pack, flag-count test bump, `FEATURE_TEST_STEPS.md` entry). Refactors and perf work need no flag.

Rules: small PRs on the `flutter` branch; `flutter analyze` + `flutter test` green at the end of every phase; nothing pushed without an explicit instruction.

**Pack assignment (agreed):** Core = B19. Trip = B9, B12, B20, B22. Labs/Travel (default OFF) = B17 only. Do not use Pro. Reuse an existing flag when the surface is the same (for example `enableSyncLine`).

## Status

| Phase | Scope | Status |
|-------|-------|--------|
| 0 | Baseline: B23 perf harness (done), B24 telemetry (deferred, needs server event names) | done |
| 1 | Stability: A1 done, A2/B6 done, B21 done, B19 done (enableRowSyncRetry), B20 done, B22 done | done |
| 2 | Speed: measured first. A4, A5, A7 dropped for the Ledger (maths is about 2 ms at 500 expenses). Remaining: B3 image decode, A6 RepaintBoundary, B4 startup, B2 prefetch, B1 optimistic | in progress |
| 3 | Flows: A11 done (audit: only Balances-with-no-trips lacked an action; the rest are informational or already had one). B9 already exists (quick parser + sheet). B10 done (freeze, close, settle-all use Undo; 9 dialogs kept on purpose). B12 done (enableSettleNudge, Trip pack). A9 done (trip header actions in one place, 3 variants kept). B13, B8, B11 dropped by audit (hints and sheet keyboard handling exist; snap points = 65 call sites; search is a new feature) | done |
| 4 | Polish and a11y: A14 done (confetti, flip card, rolling numbers already respected it; 12 more implicit animations and the live pulse now do). B15 done (expense rows, transfers and hero figures already tabular; 14 more stacked money columns now are). A13+B16 done (30 new screen checks at 200% text and light/dark guidelines; fixed Expenses day header and Balances trip row overflow). A12/B14 done (7 repeated hues now named AppColors constants, 30 sites; ratchet test caps raw literals at 155). B18 done (policy table in haptics.dart; 3 direct HapticFeedback calls now respect the Haptics setting; guard test). B7 done (hero balance already rolled; AnimatedMoneyText now counts balance-bar and member balances, 0.4 s, reduce-motion aware). A8 done as far as it earns its place (card-to-header Hero already existed; pages now fade instead of zoom under Reduce motion; shared-axis dropped). Next: B17 only. B5/B7/A8/B17 later | in progress |
| 5 | Hygiene: A3 (split big files), A10 (strings to l10n) | ongoing |

Order: P0 → P1 → P2 → P3 → P4 → P5. Phase 2 needs the Phase 0 numbers. B1 depends on B19. A5 comes before A8 and B5.

## Phase 0: Baseline (1–2 days)
- **B23 perf harness:** seed a trip with about 500 expenses and 300 chat messages; integration test that scrolls the ledger and notes tabs and records frame times; save a DevTools profile before any change.
- **B24 light telemetry:** time-to-first-content, taps-to-add-expense, error rate per screen, via the existing `growth_telemetry.dart`.
- **Exit:** a saved baseline for scroll jank, cold start and ledger open time (see `docs/perf-baseline.md`).

## Phase 1: Stability foundations (about 1 week)
Scoped after reading the code: error-with-retry, drafts and a conflict sheet already exist in places, so this phase generalises them rather than building from scratch.
- **A1** extract the retry pattern from `trips_screen` / `share_screen` / `AdminAsync` into one `AsyncBody` (loading skeleton, error + Retry, data) in `shared/widgets/`; adopt it where a stream error is currently swallowed by `.value ?? const []`.
- **A2, B6** spinners to `SkeletonLoader` on list screens (members, notes, expenses, ledger); `AnimatedSwitcher` crossfade.
- **B21** per-tab error boundary in the trip shell, so one failing tab shows an in-place error and the rest keeps working.
- **B19 🚩 (Core, ON)** per-row pending / failed tick on expenses and chat messages, from outbox `entityKey`; inline Retry on failed rows.
- **B20 (no new flag unless behaviour changes)** polish the existing `conflict_sheet.dart`: plain-language copy, side-by-side values, a badge on the affected row.
- **B22 (reuse `enablePersistentExpenseDraft`)** expense draft already exists; audit and close gaps for the notes editor and chat composer, and verify drafts are wiped on logout and never cross accounts.

## Phase 2: Speed and smoothness (1–2 weeks)
Re-run the Phase 0 harness after each step.
1. **A4** lazy lists in ledger and notes (`SliverList` / `ListView.builder`).
2. **A5** split heavy sections of `ledger_tab` / `expenses_tab` into `ConsumerWidget`s; use `.select()`.
3. **A6** `RepaintBoundary` around charts, confetti, animated numbers.
4. **A7** profile balances, settle-up, search; `compute()` only the slow ones.
5. **B3** decode images at display size (`cacheWidth` / `cacheHeight`) + placeholders.
6. **B4** defer non-critical startup work until after the first frame.
7. **B2** prefetch next trip providers on card press / visibility.
8. **B1** optimistic adds and edits on top of the outbox, with the B19 pending tick.

Exit: at least 30% better frame times than baseline; no frames over 16 ms in the scroll test.

## Phase 3: Intuitive flows (1–2 weeks)
- **B9 🚩 (Trip, ON)** quick-add: "Dinner 1200" parses into title + amount; smart defaults for payer, category, split, currency. Locale-sensitive parser, test thoroughly.
- **B10** undo snackbars instead of confirm dialogs where reversible.
- **B8** draggable sheets with snap points and keyboard-aware padding.
- **B11** first-use coach hints (reuse `coach_hint`).
- **B12 🚩 (Trip, ON)** settle-up nudge banner for quiet trips with unsettled balances.
- **B13** one consistent global-search entry point.
- **A9** one source of truth for the three header variants; sync + bell primary, rest in the menu.
- **A11** every empty state has a primary action.

## Phase 4: Visual polish and accessibility (1–2 weeks)
- **A12, B14** hardcoded `Color(0x…)` to semantic tokens; 3–4 step radius/elevation scale; grep check to stop new ones.
- **B15** tabular figures for money. **B16** dark mode check (surface tint, no pure black).
- **B17 🚩 (Labs/Travel, OFF)** per-trip accent colour from the cover photo.
- **B18** haptics policy (tap / toggle / success).
- **B5, B7** animate list changes and balance numbers (cap about 400 ms).
- **A8** shared-axis / fade-through route transitions; `Hero` trip card to trip header.
- **A13** `Semantics` on tappable rows, 48dp targets, 200% text scale, dark contrast; extend `a11y_test.dart`.
- **A14** confetti, flip cards, rolling numbers respect `disableAnimations`.

## Phase 5: Ongoing hygiene
- **A3** split `ledger_tab`, `notes_tab`, `trips_screen`, `expense_form_screen` as they are touched, not in one rewrite.
- **A10** move the 117 hardcoded strings into ARB files, one feature folder at a time.

## Risks
1. The same four large files are touched by A3, A4, A5, A12, A13: land in separate small PRs, in order.
2. B1 without B19 and B20 hides failed syncs: do not ship B1 first.
3. No baseline, no proof: do not skip Phase 0.
4. Flag sprawl: new flags only for B9, B12, B17, B19, B20, B22.
