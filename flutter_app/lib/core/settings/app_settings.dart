import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:package_info_plus/package_info_plus.dart';

import '../platform/feedback.dart';
import '../platform/haptics.dart';
import '../platform/motion.dart';
import '../storage/prefs.dart';

/// Install-scoped UI preferences (survive sign-out, like onboarding and the app lock).
class _PrefNotifier<T> extends Notifier<T> {
  _PrefNotifier(this.key, this.fallback, this.read, this.write);
  final String key;
  final T fallback;
  final T? Function(dynamic prefs, String key) read;
  final Future<void> Function(dynamic prefs, String key, T value) write;

  @override
  T build() => read(ref.read(sharedPreferencesProvider), key) ?? fallback;

  Future<void> set(T value) async {
    state = value;
    await write(ref.read(sharedPreferencesProvider), key, value);
  }
}

NotifierProvider<_PrefNotifier<bool>, bool> _boolPref(String key, bool fallback, {void Function(bool)? onChange}) =>
    NotifierProvider<_PrefNotifier<bool>, bool>(
      () => _PrefNotifier<bool>(key, fallback, (p, k) => p.getBool(k) as bool?, (p, k, v) async {
        onChange?.call(v);
        await p.setBool(k, v);
      }),
    );

/// 'system' | 'light' | 'dark'
final themeModePrefProvider = NotifierProvider<_PrefNotifier<String>, String>(
  () => _PrefNotifier<String>(
    'settings.theme',
    'system',
    (p, k) => p.getString(k) as String?,
    (p, k, v) => p.setString(k, v) as Future<void>,
  ),
);

ThemeMode themeModeFromPref(String v) => switch (v) {
  'light' => ThemeMode.light,
  'dark' => ThemeMode.dark,
  _ => ThemeMode.system,
};

/// Pure-black dark theme; only honoured when the `enableAmoledTheme` flag is on.
final amoledPrefProvider = _boolPref('settings.amoled', false);

/// Darker text and stronger borders. Only honoured while `enableHighContrast` is on.
final highContrastPrefProvider = _boolPref('settings.high_contrast', false);

/// Jump animations to their end state. Only honoured while `enableReduceMotion` is on.
final reduceMotionPrefProvider = _boolPref('settings.reduce_motion', false, onChange: (v) => AppMotion.reduce = v);

/// Soft click on settle, save and undo. Off by default.
final soundFeedbackPrefProvider = _boolPref('settings.sound_feedback', false, onChange: (v) => AppFeedback.sound = v);

/// Open the Summary with Trip numbers folded away. Only honoured while `enableSummaryCollapse` is on.
final summaryCollapsePrefProvider = _boolPref('settings.summary_collapse', false);

/// 'all' | 'important' | 'off'. Falls back to the old on/off `settings.haptics` switch so nobody's choice resets.
final hapticsLevelPrefProvider = NotifierProvider<_PrefNotifier<HapticsLevel>, HapticsLevel>(
  () => _PrefNotifier<HapticsLevel>(
    'settings.haptics_level',
    HapticsLevel.all,
    (p, k) {
      final v = p.getString(k) as String?;
      if (v != null) return HapticsLevel.values.asNameMap()[v];
      return p.getBool('settings.haptics') == false ? HapticsLevel.off : null;
    },
    (p, k, v) async {
      AppHaptics.level = v;
      await p.setString(k, v.name);
    },
  ),
);

/// Save a place with each expense. Stored per device; nothing reads it until the expense form captures a location.
final geotagExpensesPrefProvider = _boolPref('settings.geotag_expenses', false);

/// Keep the trip map collapsed and skip celebration animations. Only honoured while `enableDataSaverMode` is on.
final dataSaverPrefProvider = _boolPref('settings.data_saver', false);

/// Pass reminders (local notifications). Default on, like the web.
final passRemindersEnabledProvider = _boolPref('settings.pass_reminders', true);

/// Null = follow the trip's own currency.
final defaultCurrencyPrefProvider = NotifierProvider<_PrefNotifier<String?>, String?>(
  () => _PrefNotifier<String?>('settings.default_currency', null, (p, k) => p.getString(k) as String?, (p, k, v) async {
    if (v == null) {
      await p.remove(k);
    } else {
      await p.setString(k, v);
    }
  }),
);

class AppVersionInfo {
  const AppVersionInfo(this.version, this.build);
  final String version;
  final String build;
}

/// `0.0.0` when the platform plugin is unavailable (tests, unsupported host).
final appVersionProvider = FutureProvider<AppVersionInfo>((ref) async {
  try {
    final i = await PackageInfo.fromPlatform();
    return AppVersionInfo(i.version, i.buildNumber);
  } catch (_) {
    return const AppVersionInfo('0.0.0', '0');
  }
});
