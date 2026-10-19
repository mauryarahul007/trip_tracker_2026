import 'package:flutter/widgets.dart';

/// Reduce-motion facade: the app setting (when `enableReduceMotion` is on) or the phone's own "remove animations"
/// makes counting numbers, progress bars and section animations jump straight to their final state.
class AppMotion {
  static bool reduce = false;

  static Duration of(BuildContext context, Duration d) =>
      (reduce || MediaQuery.disableAnimationsOf(context)) ? Duration.zero : d;
}
