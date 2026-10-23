import 'package:flutter/services.dart';

/// How much the phone vibrates: every tap, only key actions, or nothing.
enum HapticsLevel { all, important, off }

/// Semantic haptics facade mirroring `src/utils/haptics.ts`.
///
/// Policy: always call these, never `HapticFeedback` directly (that ignores the traveller's Haptics setting; a test
/// enforces it).
///
/// | Moment | Call | Fires at |
/// |--------|------|----------|
/// | Tab switch, menu or chip pick, keypad key, toggle, arming a slider | [selection] (or [light]) | All taps |
/// | Something finished: expense saved, payment settled, scan read, share started | [success] (via `AppFeedback.success` / `saved` where there is a click) | Key actions |
/// | Undo, a light confirmation | `AppFeedback.tap` | All taps |
/// | A refused or risky action: swipe-to-delete, a failed scan, a bad quick-add | [warning] | Key actions |
/// | Committing a deliberate gesture (slide to confirm, pay) | [medium] | Key actions |
/// | A hard fail (wrong app-lock PIN) | [heavy] | Key actions |
///
/// Not on scroll, on every keystroke in a text field, or on passive updates (sync, incoming messages).
class AppHaptics {
  static HapticsLevel level = HapticsLevel.all;

  /// Quiet taps (tab switches, menus, selections) only fire at [HapticsLevel.all].
  static bool get _quietOk => level == HapticsLevel.all;

  /// Meaningful actions (save, settle, delete, warnings) fire at all but [HapticsLevel.off].
  static bool get _importantOk => level != HapticsLevel.off;

  /// On/off view of [level], kept for callers and tests that only care whether haptics are muted.
  static bool get enabled => level != HapticsLevel.off;
  static set enabled(bool v) => level = v ? HapticsLevel.all : HapticsLevel.off;

  static Future<void> light() async {
    if (!_quietOk) return;
    await HapticFeedback.lightImpact();
  }

  static Future<void> medium() async {
    if (!_importantOk) return;
    await HapticFeedback.mediumImpact();
  }

  static Future<void> heavy() async {
    if (!_importantOk) return;
    await HapticFeedback.heavyImpact();
  }

  static Future<void> selection() async {
    if (!_quietOk) return;
    await HapticFeedback.selectionClick();
  }

  static Future<void> success() async {
    if (!_importantOk) return;
    await HapticFeedback.lightImpact();
    await Future<void>.delayed(const Duration(milliseconds: 60));
    await HapticFeedback.mediumImpact();
  }

  static Future<void> warning() async {
    if (!_importantOk) return;
    await HapticFeedback.mediumImpact();
    await Future<void>.delayed(const Duration(milliseconds: 80));
    await HapticFeedback.lightImpact();
  }
}
