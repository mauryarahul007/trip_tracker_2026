import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:package_info_plus/package_info_plus.dart';

import '../platform/haptics.dart';
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

final hapticsEnabledProvider = _boolPref('settings.haptics', true, onChange: (v) => AppHaptics.enabled = v);

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
