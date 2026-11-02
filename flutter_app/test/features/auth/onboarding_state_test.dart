import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:trip_tracker/app/auth_state.dart';
import 'package:trip_tracker/core/storage/prefs.dart';
import 'package:trip_tracker/domain/repositories/repositories.dart';
import 'package:trip_tracker/features/auth/application/onboarding_state.dart';

void main() {
  Future<(ProviderContainer, SharedPreferences)> setup(Map<String, Object> initial) async {
    SharedPreferences.setMockInitialValues(initial);
    final prefs = await SharedPreferences.getInstance();
    final container = ProviderContainer(
      overrides: [
        sharedPreferencesProvider.overrideWithValue(prefs),
        authStateProvider.overrideWithValue(
          AuthState.signedIn(const AuthUser(id: 'u1', email: 'a@b.c', provider: 'google')),
        ),
      ],
    );
    addTearDown(container.dispose);
    return (container, prefs);
  }

  test('finishing the intro carousel also marks the Trips-list tour as seen, so a new user gets one intro', () async {
    final (container, prefs) = await setup({});
    expect(container.read(onboardedProvider), isFalse);
    expect(prefs.getBool(tourDoneKey), isNull);

    await container.read(onboardedProvider.notifier).markDone();

    expect(container.read(onboardedProvider), isTrue);
    expect(prefs.getBool(onboardedKey('u1')), isTrue);
    expect(prefs.getBool(tourDoneKey), isTrue);
  });

  test('someone who already finished the carousel keeps their own tour state', () async {
    final (container, prefs) = await setup({onboardedKey('u1'): true, tourDoneKey: false});
    expect(container.read(onboardedProvider), isTrue);
    expect(prefs.getBool(tourDoneKey), isFalse); // untouched: they have not seen the tour yet
  });
}
