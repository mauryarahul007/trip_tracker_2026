# Phase 2 (FE): Foundation: scaffold, design system, CI

**Track:** Flutter UI · **Size:** M · **Depends on:** nothing (consume Phase 1 outputs as they appear) · **Parallel with:** 1, 3, 4
**Read first:** [README.md](README.md).

## Goal
A running, empty-but-architected Flutter app that builds for iOS and Android in CI, with the design system, navigation shell, theming, error handling and Supabase wiring in place, so feature phases only add screens.

## Inputs to read
`DESIGN.md`, `PRODUCT.md`, `src/index.css` (tokens/colours/typography/radii/spacing), `src/components/Icons.tsx`, `src/components/common/*`, `src/components/NavTabs.tsx`, `src/components/ConfirmDialog.tsx`, `src/components/UndoToasts.tsx`, `src/utils/haptics.ts`, `src/utils/stackChrome.ts`, `src/utils/tripStackMotion.ts`, `src/services/supabaseClient.ts`, `capacitor.config.ts`, `codemagic.yaml`, `.github/workflows/build-ios.yml`.

## Tasks

### 2.1 Scaffold (`flutter_app/`)
- `flutter create` with org/bundle `com.triptracker.app` (D2), flavors **dev / staging / prod** (iOS schemes + Android flavors) each with its own Supabase URL/anon key via `--dart-define-from-file` (`env/*.json`, git-ignored, with `env/*.example.json` committed). **Never commit keys.**
- Feature-first layout:
  ```
  lib/
    app/            (App widget, router, theme, bootstrap)
    core/           (env, errors, logging, result types, utils, platform services)
    data/           (supabase client, drift db, repositories: filled in Phase 5)
    domain/         (models + pure logic: filled in Phase 5)
    features/<name>/{presentation,application}   (one folder per feature, see PARITY_MATRIX)
    shared/         (design-system widgets)
  test/  integration_test/  tool/
  ```
- Dependencies from README D3–D6 pinned to exact versions in `pubspec.yaml`; record the version table in `flutter_app/docs/DEPENDENCIES.md` with the reason per package.
- Lint: `very_good_analysis` or `flutter_lints` + strict casts/inference/raw-types; zero warnings policy.

### 2.2 Design system (`lib/shared/`)
- Translate `src/index.css` + `DESIGN.md` into a `ThemeData` + `ThemeExtension<AppTokens>`: colours (light/dark), typography scale, radii, elevations, spacing scale, motion durations/curves. A single token file is the only place raw values live.
- Fonts: same families as web, bundled (no runtime network fetch).
- Icons: map the Lucide/`Icons.tsx` set to a Flutter icon set (Lucide Flutter package or Material Symbols); one `AppIcons` facade so it can be swapped.
- Base components (each with a widget test + a golden test, light & dark): `AppScaffold` (safe-area + keyboard aware), `AppButton` variants, `AppTextField` (+ money/date variants), `AppSheet` (bottom-sheet with drag-to-dismiss, replacing `useDragToDismiss`/`ActionSheet`), `ConfirmDialog`, `UndoSnackbarHost` (5-second undo, replacing `UndoToasts`), `AppSwitch` (replacing `SettingsSwitch`), `SkeletonLoader`, `EmptyState`, `Avatar`/initials (`avatarColor.ts`, `initials.ts`), `CategoryChip`, `PullToRefresh`, `SwipeableRow`, `SlideToUnlock`, `ConfettiBurst`, `AnimatedNumber`.
- Haptics facade (`core/platform/haptics.dart`) mirroring `haptics.ts` semantic names (light/medium/success/warning), respecting a user pref.
- Accessibility baked in: min 48dp targets, `Semantics` labels on all base components, text scaling to 200% without overflow, reduced-motion honoured.

### 2.3 App shell
- `go_router` with typed routes for: `/login`, `/reset-password`, `/privacy`, `/terms`, `/delete-account`, `/join/:code`, `/live/:token`, `/share/:token`, `/` (trips), `/trip/:id/{chat|expenses|ledger|members|notes|settings}`. Stubs only. Route guards via an `AuthState` provider (stub now, real in Phase 6).
- Bottom nav matching `visibleTripTabs()` semantics (flag-driven; stub flags provider returning defaults).
- Global error boundary (`runZonedGuarded` + `FlutterError.onError`), logger, **crash reporting hook** (Sentry or Firebase Crashlytics; pick one, ADR), and a hook where the existing `autoBugReporter`/`report_bug` flow will attach in Phase 10.
- Connectivity provider (replaces `online/offline` listeners); `OfflineBanner` stub.
- Localisation scaffold (`flutter_gen_l10n`, `en` only; all user strings go through `AppLocalizations` from day one, copy lifted from web strings; no hard-coded UI text in later phases).

### 2.4 Supabase bootstrap
`supabase_flutter` initialised from env; auth session persistence in secure storage; a thin `SupabaseGateway` interface (so repositories in Phase 5 are mockable). A `smoke_test` screen (debug flavor only) that signs in anonymously-or-as-test-user against **staging** and reads one row. This proves networking on both platforms in CI.

### 2.5 CI/CD
- GitHub Actions `flutter-ci.yml` (path-filtered to `flutter_app/**`): format check, analyze, unit+widget+golden tests, Android debug build. **Must not run on, or block, web-only PRs.**
- `codemagic.yaml`: add `flutter-ios-debug` (simulator build, then unsigned device build) and `flutter-android-debug` workflows; leave the Capacitor workflows untouched. Signing/TestFlight come in Phase 12 but stub the workflow with TODOs.
- Fastlane or Codemagic publishing scripts are Phase 12.
- Document the **"no local iOS build"** workflow in `flutter_app/README.md`.

### 2.6 Developer docs
`flutter_app/README.md`: setup, flavors, run/test commands, folder rules, "how to add a feature", import-boundary rules (presentation → application → domain; data implements domain interfaces; domain has zero Flutter imports; enforce via `import_lint`/`dependency_validator` or custom analyzer rule).

## Deliverables
`flutter_app/` scaffold, design-system package inside it, CI workflows, ADRs (state mgmt, crash reporting, icon set, lint), `HANDOFF.md` entry.

## Out of scope
Any real feature screen, Drift schema, repositories, auth UI.

## Exit criteria
- [ ] `flutter pub get && flutter analyze && flutter test` green from clean clone.
- [ ] Android debug APK builds in CI; iOS simulator build green on Codemagic.
- [ ] Smoke screen reads staging data on a real Android device/emulator and on iOS (Codemagic artifact + a human check, or documented gap).
- [ ] Theme golden tests exist for light/dark for every base component.
- [ ] Web CI unaffected (path filters verified by a docs-only and a web-only PR dry-run).
- [ ] No secrets in git (`git grep` for anon/service keys returns nothing).
