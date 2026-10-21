# Compass redesign: implementation plan

Mockups: https://claude.ai/artifact/J7kCrkFRCfojyWWYWTinzo (28 mobile screens, 3 desktop, light + dark).
Status: **implemented locally behind flags (all default ON), nothing committed or pushed.** See "What shipped" at the bottom.

## What the code already gives us (so the plan stays small)

| Compass needs | Already in the repo | Gap |
|---|---|---|
| Fonts | Bricolage Grotesque (titles), Figtree (body), IBM Plex Mono (money) bundled in `pubspec.yaml` | None. Mockup's Instrument Sans / DM Mono map to Figtree / Plex Mono. No new font assets. |
| Palette | Bento tokens in `shared/theme/app_colors.dart` (teal `#0F6F63`, ground `#F2F4EF`), dark + AMOLED | Add a `sun` (orange) action token + soft tints. Existing values stay. |
| Global dock | `enableHorizonNav` → `home_dock.dart`: Trips · Balances · ＋ · Activity · Me | Reorder to Home · Trips · ＋ · Wallet · Me |
| Trip dock | `TripNavTab { chat, expenses, ledger, members, notes }` in `trip_tabs.dart`, one `StatefulShellBranch` each in `router.dart` | Dock shows Spend · Balances · ＋ · Chat · Trip hub |
| Keypad add, quick add, receipts, insights, wrapped, passport, live map, claim-your-traveler join | `amount_keypad.dart`, `quick_add_sheet.dart`, `receipt_gallery_screen.dart`, `spend_insights_screen.dart`, `trip_wrapped_modal.dart`, `live_screen.dart`, `join_screen.dart` | Mostly restyle, not rebuild |
| Budget bar on Spend | **No `budget` field in `domain/models`** | Needs a schema change. Deferred (see Out of scope). |

## Unchanged by request
- **Login** (and the rest of Entry: onboarding, reset password) keeps today's design. Not touched in any phase.
- **Main home**, today's Trips screen at `/` (`trips_screen.dart`, `trip_card_stack`, hero/backdrop), keeps today's layout. No Today screen, no new trip cards, no new-trip stepper.

## Flags (Superadmin Ops Deck)

Per CLAUDE.md each flag is registered in `src/types/admin.ts` (`FeatureFlagKey`) and `src/utils/featureFlags.ts` (`FEATURE_FLAGS_META`, `DEFAULT_FEATURE_FLAGS`, `CONSUMER_PACKS`), then `scripts/export-golden-fixtures.mjs` regenerates `flutter_app/lib/domain/logic/flag_defaults.g.dart`. Bump the count in `src/utils/featureFlags.test.ts` (currently 176).

1. **`enableCompassNav`** (pack: Core). The single navigation flag you asked for. Covers: global dock order, trip dock, Trip hub, Activity moving to the Home bell, the desktop sidebar. OFF = today's behaviour exactly (Horizon dock or legacy menu). ON takes precedence over `enableHorizonNav`.
2. **Screen flags, one per surface, so each can be rolled back alone** (proposed, tell me if you want fewer; the Home flag is dropped since home stays as is):
   -    - `enableCompassSpend` (Trip): Spend summary, add expense, detail, receipts, insights
   - `enableCompassMoney` (Trip): Balances diverging bars, settle sheet, People, Notes, Chat event cards
   - `enableCompassMe` (Core): Me/settings, support, storage, bin, delete, notification prefs, Travel screens
   - `enableCompassWeb` (Core): 3-pane trip workspace on ≥1024px and the Ops Deck restyle

Default state: CLAUDE.md says Core/Trip default ON. For a redesign that changes every screen I recommend the **staged-rollout exception** already used by `boardingPassLogin` (default OFF, documented in the flag copy, flipped ON after QA). **Needs your OK.**

Each flag's label/description will state what the traveler sees ON, what is gone OFF, and what it does not do (data, balances and splits are never touched).

## Phases (each independently shippable, in this order)

**Phase 0: foundations (no flag, invisible)**
- `app_colors.dart` / `app_tokens.dart`: add `sun`, `sunSoft`, `priSoft`, category colors for light/dark/AMOLED. Additive only.
- New shared widgets in `shared/widgets/`: `cover_art.dart` (destination gradient covers; reuse `trip_backdrop.dart` / `cached_photo.dart` first), `diverging_bar.dart` (extend `balance_bars.dart`), `day_header.dart`.
- Tests: golden-free widget tests for each, light + dark.

**Phase 1: navigation (`enableCompassNav`)**
- `home_dock.dart`: the global dock keeps today's four destinations (Trips home at `/`, Balances renamed Wallet, Activity, Me) in the same order; only the Compass look (orange centre action, labels always visible) is added. The Mockup's separate "Home" tab is dropped, since home is unchanged. No new routes, so the 7 `go('/')` call sites are untouched.
- `trip_tabs.dart` + `trip_nav.dart`: add `TripNavTab.hub` branch. **Members and Notes stay as branches with the same URLs** (12 internal references and notification deep links keep working); they just leave the dock and are opened from the hub. `visibleTabsProvider` returns dock tabs only when the flag is on.
- `trip_shell_screen.dart`: when the current tab is valid but not in the dock (members, notes), highlight "Trip" instead of falling back to the first tab (today's `activeIndex < 0` redirect would otherwise bounce the user out).
- New `trip_hub_screen.dart`: the 6-tile grid + close-out row.
- Desktop (≥900px): sidebar items follow the same lists.
- Tests: extend `trip_tabs_test.dart`, `horizon_widgets_test.dart`; flag ON/OFF dock contents, deep link into `/trip/:id/notes` highlights Trip, back-trail still works.

**Phase 2: (dropped)** Home, trips list, new-trip flow and login stay as they are. The invite sheet is left alone too.

**Phase 3: Spend (`enableCompassSpend`)**
- `expenses_tab.dart` summary card + day headers; `expense_form_screen.dart` keypad-first layout with per-person split preview; detail sheet; receipts grid; insights donut/bars. Budget bar renders only if a budget exists (none today, so hidden).

**Phase 4: Balances, people, chat (`enableCompassMoney`)**
- `ledger_tab.dart` (2,479 lines, the riskiest file): extract the diverging bars and settle plan into new widgets rather than editing in place. Settle sheet over `upi_payment_sheet.dart`. People, Notes tickets, Chat event cards.

**Phase 5: Me, travel, alerts (`enableCompassMe`)**
- Settings with 3-way appearance control, support screens, storage, bin, delete account, notification prefs, passport, wrapped, live sheet, activity feed.

**Phase 6: web (`enableCompassWeb`)**
- Extend `wrapHomeBody` / trip shell for the 3-pane layout; restyle `features/admin/*` pages (overview, flags).

## Per-phase checklist (all mandatory per CLAUDE.md)
1. Register flag(s), regenerate `flag_defaults.g.dart`, bump the flag-count test.
2. Append numbered manual steps (flags, flag-OFF negative checks, pass criteria) to `docs/FEATURE_TEST_STEPS.md` and update its Index.
3. Light + dark + AMOLED checked; 44px targets; text scale 1.3; reduced motion; `test/a11y/a11y_test.dart` extended.
4. Last step before any push: `flutter analyze`, `flutter test`, `npm run lint`, `npm run build`, `npm test`.
5. Local only. Before any push I ask bug-fix vs feature for logging, bump version, note it in `decisions.md`, then close dev servers.

## Out of scope / decisions needed
- **Trip budget** (budget bar, daily-budget line): needs a `trips.budget` column, Supabase migration, local DB + sync mapper changes and web parity. Recommend a separate feature after Compass.
- **Retiring `enableHorizonNav`**: keep until Compass is fully ON, then remove in a cleanup.
- **Receipts, wrapped, passport**: restyle only. No behavior changes.

## Risks
- `ledger_tab.dart` and `trips_screen.dart` (1,254 lines) are large; extracting widgets first keeps diffs reviewable.
- Hidden-tab redirect in the trip shell (above) is the most likely regression; it gets its own test first.
- Token additions must not shift existing colors, or flag-OFF screens would change.

## What shipped (2026-10-21, local only)

| Phase | Flag | Delivered | Not delivered (and why) |
|---|---|---|---|
| 0 Foundations | none | `shared/theme/compass.dart` (sun orange, soft tints, category colours as an `AppTokens` extension, existing tokens untouched), `compass_cover.dart`, `day_header.dart`, `core/flags/compass_flags.dart` | `diverging_bar.dart`: `balance_bars.dart` already is one, reused |
| 1 Navigation | `enableCompassNav` | Compass dock (labels always visible, orange +), trip dock Spend / Balances / + / Chat / Trip, Trip hub screen, `TripNavTab.hub`, People and Notes stay as pages under Trip with Trip lit, Home dock restyled with Wallet label, old floating Add hidden when on, pager re-syncs when the tab list changes, trip still opens on Balances | |
| 2 Home | dropped | Home and login unchanged, by request | |
| 3 Spend | `enableCompassSpend` | Total spent card (total, per person, top category) and category colour rings on the Expenses tab | Day headers with totals, keypad-first form, save-and-add-another, receipts and insights already existed from earlier work, so no restyle was made |
| 4 Money | `enableCompassMoney` | Balance bars always on in Summary | Settle sheet, People, Notes, Chat event cards: restyle not done (existing screens already carry bars, settle ticket, member money row) |
| 5 Me | `enableCompassMe` | Storage screen total + split bar | Settings, bug report, bin, delete account, prefs, passport, wrapped, live sheet, activity: already match the design intent (segmented appearance row, typed DELETE confirm, grouped activity feed), left as is |
| 6 Web | `enableCompassWeb` | Settle-up pane on Expenses at 1280px+ | Ops Deck restyle not done |

Corrections to the original plan: a local trip budget (`features/expenses/application/trip_budget.dart`) does exist, so the budget bar is cheaper than first estimated; it is still deferred as agreed. Tests exposed that Compass flags loading as ON (registry default) briefly flips the tab list, so the pager now re-syncs its page when the list changes, and the test harness starts every older test with the Compass flags OFF (as it already does for `enableSummaryFocus`); Compass tests opt in with `flagsOn`.
