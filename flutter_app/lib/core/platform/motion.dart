import 'package:flutter/widgets.dart';

/// Reduce-motion facade: the app setting (when `enableReduceMotion` is on) or the phone's own "remove animations"
/// makes counting numbers, progress bars and section animations jump straight to their final state.
///
/// Also the app's motion tokens: use [fast] for taps, toggles and chips, [base] for sheets, rows and tab content,
/// [slow] for hero and page-level moves, with [enter] / [exit] / [standard] curves, so everything moves alike.
///
/// Motion budget (Flutter UX polish): keep sheet enter/exit, press scale, tab slide, just-saved glow.
/// Prefer [fast]/[base] (≈150–320ms). Avoid continuous parallax, new animation libraries, and haptic on every
/// tab when Haptics is set to Important only ([AppHaptics.selection] already no-ops then).
///
/// [polish] mirrors Superadmin `enableMotionPolish` (default ON). When off (or reduce-motion is on), press scale,
/// sheet drag-dismiss, and trip-card Heroes are skipped so chrome stays still.
class AppMotion {
  static bool reduce = false;

  /// Wired from `enableMotionPolish` in [TripTrackerApp].
  static bool polish = true;

  // Same scale as the web CSS: fast = --dur-2, base = --dur-3, slow = --dur-4 (see motion_tokens_parity_test.dart).
  static const fast = Duration(milliseconds: 200);
  static const base = Duration(milliseconds: 320);
  static const slow = Duration(milliseconds: 400);

  /// Subtle press shrink for primary buttons and dock tabs when polish is on.
  static const pressScale = 0.96;

  static const Curve enter = Curves.easeOutCubic;
  static const Curve exit = Curves.easeInCubic;
  static const Curve standard = Curves.easeInOutCubic;

  static Duration of(BuildContext context, Duration d) =>
      (reduce || MediaQuery.disableAnimationsOf(context)) ? Duration.zero : d;

  /// True when press scale, sheet drag, and Heroes should run for this frame.
  static bool shouldAnimate(BuildContext context) => polish && !reduce && !MediaQuery.disableAnimationsOf(context);

  /// Trip card → header morph. Skipped when polish / reduce-motion says stay still (avoids a half-flight morph).
  static Widget hero({required String tag, required Widget child, required BuildContext context}) {
    if (!shouldAnimate(context)) return child;
    return Hero(tag: tag, child: child);
  }
}
