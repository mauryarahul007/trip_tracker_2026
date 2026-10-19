import 'dart:async';

import 'package:flutter/services.dart';

import 'haptics.dart';

/// Haptics plus an optional soft click for the moments that finish something (settle, save, undo).
///
/// [packOn] mirrors the `enableFeedbackPack` flag; [sound] is the Settings > Appearance > Sound feedback switch and
/// stays off until the traveller turns it on. With the flag off the moments keep only what they always had.
class AppFeedback {
  static bool packOn = true;
  static bool sound = false;

  static void _click() {
    if (packOn && sound) unawaited(SystemSound.play(SystemSoundType.click));
  }

  /// A payment settled or an expense saved: the success haptic and, if wanted, a click.
  static void success() {
    unawaited(AppHaptics.success());
    _click();
  }

  /// A light confirmation (an undo, a toggle). Only with the pack on.
  static void tap() {
    if (!packOn) return;
    unawaited(AppHaptics.light());
    _click();
  }

  /// A save that had no feedback before: only with the pack on.
  static void saved() {
    if (!packOn) return;
    success();
  }
}
