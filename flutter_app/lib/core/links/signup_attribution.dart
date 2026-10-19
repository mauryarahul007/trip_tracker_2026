import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../storage/prefs.dart';

const _key = 'tt-signup-attribution-v1';

/// First-touch marketing attribution captured from a deep link, kept until the
/// user signs in and it is sent via `record_signup_source` (first touch wins).
class SignupAttributionStore {
  SignupAttributionStore(this._prefs, {DateTime Function()? now}) : _now = now ?? DateTime.now;
  final SharedPreferences _prefs;
  final DateTime Function() _now;

  Map<String, dynamic>? load() {
    final raw = _prefs.getString(_key);
    if (raw == null) return null;
    try {
      final m = jsonDecode(raw);
      return m is Map<String, dynamic> ? m : null;
    } catch (_) {
      return null;
    }
  }

  /// Never overwrites an earlier capture.
  Future<void> captureIfFirst(Map<String, String> attribution) async {
    if (attribution.isEmpty || load() != null) return;
    await _prefs.setString(_key, jsonEncode({...attribution, 'capturedAt': _now().millisecondsSinceEpoch}));
  }

  Future<void> clear() => _prefs.remove(_key);
}

final signupAttributionStoreProvider = Provider<SignupAttributionStore>(
  (ref) => SignupAttributionStore(ref.watch(sharedPreferencesProvider)),
);
