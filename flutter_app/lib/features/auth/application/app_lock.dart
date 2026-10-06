import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/storage/prefs.dart';
import '../../../data/auth/biometric_service.dart';

const _enabledKey = 'security.biometric_lock';

/// User preference (toggled from Settings in Phase 10). Also requires the
/// `enableBiometricAuth` Ops Deck flag, like the web.
class BiometricLockEnabled extends Notifier<bool> {
  @override
  bool build() => ref.read(sharedPreferencesProvider).getBool(_enabledKey) ?? false;

  /// Enabling requires a successful prompt so a user can't lock themselves
  /// out of a device without biometrics.
  Future<bool> setEnabled(bool on, {String reason = 'Enable app lock'}) async {
    if (on) {
      final svc = ref.read(biometricServiceProvider);
      if (!await svc.isAvailable() || !await svc.authenticate(reason)) return false;
    }
    await ref.read(sharedPreferencesProvider).setBool(_enabledKey, on);
    state = on;
    return true;
  }
}

final biometricLockEnabledProvider = NotifierProvider<BiometricLockEnabled, bool>(BiometricLockEnabled.new);

/// True while the lock overlay must cover the app.
class AppLocked extends Notifier<bool> {
  @override
  bool build() => false;

  void lock() => state = true;

  void unlockNow() => state = false;

  Future<bool> tryUnlock(String reason) async {
    final ok = await ref.read(biometricServiceProvider).authenticate(reason);
    if (ok) state = false;
    return ok;
  }
}

final appLockedProvider = NotifierProvider<AppLocked, bool>(AppLocked.new);
