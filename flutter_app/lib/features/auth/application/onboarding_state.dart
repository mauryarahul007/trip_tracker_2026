import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/auth_state.dart';
import '../../../core/storage/prefs.dart';

String onboardedKey(String userId) => 'tt-$userId-tt-onboarded-v1';

/// Device flag for the 3-card first-run tour on the Trips list (flag `enableFirstRunTour`).
const tourDoneKey = 'tour.done';

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
    final prefs = ref.read(sharedPreferencesProvider);
    if (uid != null) await prefs.setBool(onboardedKey(uid), true);
    // A new user has just been through the intro carousel; the Trips-list tour straight after it would be a second
    // intro, so it counts as seen. (Someone who skipped the carousel earlier still gets the tour.)
    await prefs.setBool(tourDoneKey, true);
    state = true;
  }
}

final onboardedProvider = NotifierProvider<OnboardedNotifier, bool>(OnboardedNotifier.new);
