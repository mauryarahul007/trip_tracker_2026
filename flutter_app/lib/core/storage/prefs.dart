import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../domain/logic/expense_draft.dart' show KeyValueStore;

/// Install-scoped preferences. Unlike the Drift DB these survive sign-out
/// (onboarding seen, lock preference); main() injects the loaded instance.
/// Unsent drafts (expense form, chat composer) are stored under this prefix.
const draftKeyPrefix = 'tt_draft_';

/// Sign-out wipes the Drift DB but not preferences, so drafts are removed here: the next account
/// on this device must not see (or inherit) what the last one left unsent.
Future<void> clearDrafts(SharedPreferences p) async {
  for (final k in p.getKeys().where((k) => k.startsWith(draftKeyPrefix)).toList()) {
    await p.remove(k);
  }
}

final sharedPreferencesProvider = Provider<SharedPreferences>(
  (ref) => throw UnimplementedError('sharedPreferencesProvider must be overridden'),
);

class PrefsDraftStore implements KeyValueStore {
  PrefsDraftStore(this._p);
  final SharedPreferences _p;
  @override
  String? getString(String key) => _p.getString(key);
  @override
  Future<void> setString(String key, String value) => _p.setString(key, value);
  @override
  Future<void> remove(String key) => _p.remove(key);
}
