# Flutter App UI & Performance Enhancements Plan

**Target Scope:** Flutter app (`flutter_app/`) only  
**Goal:** Make the Flutter app UI more aesthetic, professional, clean, and smooth while maintaining or improving 60/120fps performance (no heavy GPU blurs, offscreen `saveLayer` passes, or bloated dependencies).

All motion and visual refinements below respect `AppMotion.shouldAnimate(context)` / `AppMotion.reduce` and align with existing feature flags (`enableMotionPolish`, `enableNavPolish`, `enableHorizonUi`, `enableSkeletonLoaders`) so Reduce Motion, flag-OFF fallbacks, and WCAG contrast guarantees remain intact.

---

## Phase 1 — Rendering & Frame-Rate Optimizations (Zero-Jank Foundation)

These changes **reduce GPU/CPU work** while making the UI look cleaner and more responsive.

### 1.1 Remove live `BackdropFilter` from the floating bottom dock
- **File:** `flutter_app/lib/shared/widgets/app_bottom_nav.dart` (`_Dock`)
- **Current state:** When `polish` (`enableNavPolish`) is on, `_Dock` wraps the bar in `BackdropFilter(filter: ImageFilter.blur(sigmaX: 16, sigmaY: 16))` over scrolling content.
- **Planned change:**
  - Replace the live `BackdropFilter` with a crisp translucent surface (`bgSurface` at ~`0.94` alpha), a subtle `1px` top/inner highlight border, and `shadowLg`.
  - **Why:** Eliminates per-frame offscreen GPU blur passes during fast list flings and avoids muddy gray bleed on light surfaces.

### 1.2 Downscale `TripBackdrop` before blurring
- **File:** `flutter_app/lib/features/trips/presentation/widgets/trip_backdrop.dart` (`TripBackdrop`)
- **Current state:** Passes `logicalWidth: MediaQuery.sizeOf(context).width` to `cachedPhotoSized` and applies `ImageFilter.blur(sigmaX: 28, sigmaY: 28)` across the full screen.
- **Planned change:**
  - Decode the blurred atmospheric backdrop at a small thumbnail width (e.g., `logicalWidth: 96`) and reduce blur sigma to `12`.
  - **Why:** Cuts decoded texture pixel count dramatically (~16x fewer pixels) with an identical soft atmospheric gradient effect.

### 1.3 Eliminate whole-tree `Opacity` `saveLayer` in `SkeletonLoader`
- **File:** `flutter_app/lib/shared/widgets/skeleton_loader.dart` (`SkeletonLoader`, `SkeletonBox`, `SkeletonCircle`)
- **Current state:** `SkeletonLoader` wraps the entire `SkeletonPage` subtree in `Opacity(opacity: _animation.value, child: widget.child)`.
- **Planned change:**
  - Replace the parent `Opacity` wrapper with an inherited animation value or `ColorTween` / lightweight linear gradient shimmer inside leaf `SkeletonBox` and `SkeletonCircle` decorations.
  - **Why:** Removes the expensive full-subtree offscreen `saveLayer` allocation every animation frame while giving skeletons a crisper, modern pulse/shimmer.

### 1.4 Isolate repaints with `RepaintBoundary`
- **Files:**
  - `flutter_app/lib/features/trip_details/presentation/widgets/trip_content_sheet.dart` (`TripContentSheet`)
  - `flutter_app/lib/shared/widgets/rolling_money.dart` (`RollingMoneyText`)
  - `flutter_app/lib/features/trips/presentation/widgets/horizon_home_hero.dart` (`HorizonBalanceHero`)
  - `flutter_app/lib/features/expenses/presentation/widgets/horizon_position_hero.dart` (`HorizonPositionHero`)
- **Planned change:**
  - Wrap `TripContentSheet`'s inner `child`, `RollingMoneyText`, and the Horizon dark hero cards in `RepaintBoundary`.
  - **Why:** Prevents sheet drags/springs, odometer digit rolls, and radial card glows from forcing parent or sibling scroll views to repaint.

---

## Phase 2 — Surface Depth, Hierarchy & Layout Polish

Lightweight decoration, typography, and layout upgrades with zero runtime overhead.

### 2.1 Dark / AMOLED specular top-edge highlight on cards
- **Files:**
  - `flutter_app/lib/shared/widgets/app_surface.dart` (`AppCard`)
  - `flutter_app/lib/features/trips/presentation/widgets/horizon_home.dart` (`HorizonLiveTripCard`)
- **Planned change:**
  - In dark and AMOLED themes where drop shadows (`shadowSm`) are barely visible, add a subtle `1px` top-edge specular highlight (`Colors.white.withValues(alpha: 0.06)`) or crisper tonal border contrast so cards separate cleanly from `bgPage`.

### 2.2 Hero stat dividers & directional balance pills
- **Files:**
  - `flutter_app/lib/features/trips/presentation/widgets/horizon_home_hero.dart` (`HorizonBalanceHero`)
  - `flutter_app/lib/features/expenses/presentation/widgets/horizon_position_hero.dart` (`HorizonPositionHero`)
- **Planned change:**
  - Add thin vertical hairline dividers (`Colors.white.withValues(alpha: 0.14)`) between the summary stat columns.
  - Pair owe/owed figures with soft-tinted semantic pills (`10–12%` semantic color fill) and subtle directional icons (`↑` / `↓`), keeping `AppTypography.tabularFigures` alignment.

### 2.3 Dock-aware floating `UndoSnackbar`
- **File:** `flutter_app/lib/shared/widgets/undo_snackbar.dart` (`UndoSnackbar`)
- **Current state:** Uses a fixed `EdgeInsets.symmetric(horizontal: 16, vertical: 16)` margin with `SnackBarBehavior.floating`, which can sit too close to or overlap the floating `AppBottomNav` dock.
- **Planned change:**
  - Dynamically adjust bottom margin to clear the floating dock (accounting for `MediaQuery.paddingOf(context).bottom`), add a leading semantic icon, and refine padding/spacing.

### 2.4 Sticky day headers polish (`ExpensesTab`)
- **File:** `flutter_app/lib/features/expenses/presentation/expenses_tab.dart` (`_DayHeader`)
- **Current state:** `_DayHeader extends SliverPersistentHeaderDelegate` is already implemented behind `enableStickyDayHeaders` (default `false` in `flag_defaults.g.dart`).
- **Planned change:**
  - Polish `_DayHeader` when pinned (subtle bottom hairline divider and crisp background separation in Horizon/Calm modes).
  - Decide whether to keep `enableStickyDayHeaders` behind its Ops Deck flag or promote its default.

---

## Phase 3 — Smooth Micro-Interactions, Charts & Transitions

All transitions use Flutter's built-in implicit animations (`180–280ms`, `AppMotion.enter` / `AppMotion.fast`) and are skipped automatically when `AppMotion.shouldAnimate(context)` is `false`.

### 3.1 Animated `SpendDonut` slice selection & center readout
- **File:** `flutter_app/lib/features/expenses/presentation/widgets/spend_donut.dart` (`SpendDonut`, `_DonutPainter`)
- **Current state:** Tapping a segment immediately jumps to the highlighted stroke width, dimmed alpha, and updated center readout.
- **Planned change:**
  - Animate selected segment stroke width and opacity smoothly (~`220ms`, `AppMotion.enter`) via `TweenAnimationBuilder` / implicit state interpolation.
  - Wrap the center label and total readout in an `AnimatedSwitcher` for a smooth cross-fade/scale when switching slices.

### 3.2 Lightweight sliding-pill segmented control
- **Files:**
  - New shared widget: `flutter_app/lib/shared/widgets/app_segmented_pill.dart`
  - Consumers: `flutter_app/lib/features/expenses/presentation/ledger_tab.dart` (`Categories / People`), `flutter_app/lib/features/expenses/presentation/expenses_tab.dart` (`All / Expenses / Settlements`)
- **Planned change:**
  - Build a zero-dependency segmented switcher using `AnimatedAlign` + pill background thumb so toggling between views slides smoothly instead of snapping chips.

### 3.3 `AnimatedSize` on collapsible sections
- **Files:**
  - `flutter_app/lib/features/expenses/presentation/expenses_tab.dart` (collapsible day groups & advanced filter drawer)
  - `flutter_app/lib/features/trips/presentation/trips_screen.dart` (`Past trips` fold)
  - `flutter_app/lib/features/expenses/presentation/ledger_tab.dart` (`Transfers`, `Trip numbers`, `History` folds)
- **Planned change:**
  - Wrap collapsible section bodies in `AnimatedSize(duration: AppMotion.of(context, AppMotion.fast), curve: AppMotion.enter)`.

### 3.4 Tactile press-scale (`0.985`) on trip cards & Hub Bento tiles
- **Files:**
  - New shared helper: `flutter_app/lib/shared/widgets/app_tap_scale.dart` (mirroring `AppButton`'s press pattern with `AppMotion.shouldAnimate`)
  - Consumers: `HorizonLiveTripCard` (`horizon_home.dart`), `HorizonHubTile` (`horizon_hub.dart`)
- **Planned change:**
  - Add a subtle `0.985` scale on tap-down (~`90ms`), keeping `InkWell` ripple intact and disabling scale under Reduce Motion.

### 3.5 Softer `openTripFresh` trip-switch transition
- **File:** `flutter_app/lib/features/trip_details/application/trip_nav.dart` (`openTripFresh`)
- **Current state:** Covers the screen with an opaque `OverlayEntry` (`trip-switch-cover`) showing a `CircularProgressIndicator` ("Switching to…") held by a fixed `450ms` timer.
- **Planned change:**
  - Replace the raw spinner block with a brief, smooth `AnimatedOpacity` cross-fade over a clean surface/brand-mark cover dismissed right after the new trip route paints its first frame.

### 3.6 `AppSheet` drag-handle feedback & photo fade-in
- **Files:**
  - `flutter_app/lib/shared/widgets/app_sheet.dart` (`AppSheet`)
  - `flutter_app/lib/shared/widgets/cached_photo.dart`
- **Planned change:**
  - Give `AppSheet`'s drag handle subtle animated feedback (width/tint response) and consistent `24px` top corner curvature.
  - Add a lightweight `180ms` `frameBuilder` opacity fade-in helper for cached/network photos (trip covers and receipt thumbnails) so images never pop in abruptly.

---

## Verification & Engineering Checklist

- [ ] **Static analysis:** Run `flutter analyze` inside `flutter_app/` with zero warnings/errors.
- [ ] **Automated tests:** Run `flutter test` inside `flutter_app/` (covering widget, accessibility/WCAG, and motion-token parity tests).
- [ ] **Reduce Motion & Flag-OFF checks:** Verify every new animation is skipped cleanly when `AppMotion.reduce` or `MediaQuery.disableAnimationsOf(context)` is true, and when `enableMotionPolish` / `enableNavPolish` is false.
- [ ] **Device build check (when testing on hardware):** Always use `flutter run --flavor dev -t lib/main.dart --dart-define-from-file=env/dev.json` (or `flutter build apk --flavor dev --debug --dart-define-from-file=env/dev.json`).
- [ ] **ADR:** Record meaningful performance/UI trade-offs (e.g., removing dock `BackdropFilter` and `SkeletonLoader` `saveLayer`) in `decisions.md` during implementation.
