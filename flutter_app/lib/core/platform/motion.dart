import 'package:flutter/widgets.dart';

/// Reduce-motion facade: the app setting (when `enableReduceMotion` is on) or the phone's own "remove animations"
/// makes counting numbers, progress bars and section animations jump straight to their final state.
///
/// Also the app's motion tokens: use [fast] for taps, toggles and chips, [base] for sheets, rows and tab content,
/// [slow] for hero and page-level moves, with [enter] / [exit] / [standard] curves, so everything moves alike.
class AppMotion {
  static bool reduce = false;

  static const fast = Duration(milliseconds: 200);
  static const base = Duration(milliseconds: 300);
  static const slow = Duration(milliseconds: 400);

  static const Curve enter = Curves.easeOutCubic;
  static const Curve exit = Curves.easeInCubic;
  static const Curve standard = Curves.easeInOutCubic;

  static Duration of(BuildContext context, Duration d) =>
      (reduce || MediaQuery.disableAnimationsOf(context)) ? Duration.zero : d;
}
