import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/auth_state.dart';
import '../../../core/storage/prefs.dart';

String onboardedKey(String userId) => 'tt-$userId-tt-onboarded-v1';

/// Whether the signed-in user already saw the intro carousel (per user,
/// per install; same key shape as the web's localStorage entry).
class OnboardedNotifier extends Notifier<bool> {
  @override
  bool build() {
    final uid = ref.watch(authStateProvider).userId;
    if (uid == null) return true; // nothing to show when signed out
    return ref.read(sharedPreferencesProvider).getBool(onboardedKey(uid)) ?? false;
  }

  Future<void> markDone() async {
    final uid = ref.read(authStateProvider).userId;
    if (uid != null) await ref.read(sharedPreferencesProvider).setBool(onboardedKey(uid), true);
    state = true;
  }
}

final onboardedProvider = NotifierProvider<OnboardedNotifier, bool>(OnboardedNotifier.new);
