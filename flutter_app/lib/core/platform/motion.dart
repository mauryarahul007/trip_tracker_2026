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
class AppMotion {
  static bool reduce = false;

  // Same scale as the web CSS: fast = --dur-2, base = --dur-3, slow = --dur-4 (see motion_tokens_parity_test.dart).
  static const fast = Duration(milliseconds: 200);
  static const base = Duration(milliseconds: 320);
  static const slow = Duration(milliseconds: 400);

  static const Curve enter = Curves.easeOutCubic;
  static const Curve exit = Curves.easeInCubic;
  static const Curve standard = Curves.easeInOutCubic;

  static Duration of(BuildContext context, Duration d) =>
      (reduce || MediaQuery.disableAnimationsOf(context)) ? Duration.zero : d;
}
