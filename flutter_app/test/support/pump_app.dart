import 'package:drift/drift.dart' show driftRuntimeOptions;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/misc.dart' show Override;
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:trip_tracker/app/deep_link_listener.dart';
import 'package:trip_tracker/core/network/connectivity_provider.dart';
import 'package:trip_tracker/core/platform/share_service.dart';
import 'package:trip_tracker/features/trips/application/join_controller.dart';
import 'package:trip_tracker/core/storage/prefs.dart';
import 'package:trip_tracker/data/auth/biometric_service.dart';
import 'package:trip_tracker/data/auth/social_auth.dart';
import 'package:trip_tracker/data/local/app_database.dart';
import 'package:trip_tracker/data/providers.dart';
import 'package:trip_tracker/domain/repositories/repositories.dart';
import 'package:trip_tracker/features/auth/application/onboarding_state.dart';
import 'package:trip_tracker/main.dart';

import 'fakes.dart';

const asha = AuthUser(id: 'u1', email: 'a@b.c', provider: 'email');

AppDatabase? _lastDb;

/// `testWidgets` + deterministic cleanup. Drift schedules timers when query
/// streams are cancelled; they must be flushed (tree disposed, DB closed on
/// the real event loop) before the framework's pending-timer check.
void testApp(String name, Future<void> Function(WidgetTester tester) body) {
  testWidgets(name, (tester) async {
    await body(tester);
    await tester.pumpWidget(const SizedBox());
    await settle(tester, rounds: 3);
    await tester.runAsync(() async => _lastDb?.close());
    _lastDb = null;
    await tester.pump(const Duration(milliseconds: 10));
  });
}

class TestApp {
  TestApp({
    required this.auth,
    required this.social,
    required this.biometric,
    required this.flags,
    required this.prefs,
    required this.db,
    required this.join,
    required this.share,
    required this.shareService,
    required this.links,
  });
  final FakeAuthRepository auth;
  final FakeSocialAuth social;
  final FakeBiometric biometric;
  final FakeFlags flags;
  final SharedPreferences prefs;
  final AppDatabase db;
  final FakeJoinRepository join;
  final FakeShareRepository share;
  final FakeShareService shareService;
  final FakeDeepLinks links;
}

/// Boots the real app with every platform/backend seam faked.
Future<TestApp> pumpApp(
  WidgetTester tester, {
  AuthUser? user,
  bool onboarded = true,
  bool appleAvailable = false,
  bool signInsPaused = false,
  Set<String> flagsOn = const {},
  Set<String> flagsOff = const {},
  Map<String, Object> prefsExtra = const {},
  bool biometricPasses = true,
  bool online = true,
  List<Override> overrides = const [],
  Uri? launchLink,
  void Function(TestApp app)? setup,
}) async {
  tester.view.physicalSize = const Size(430, 1400);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
  SharedPreferences.setMockInitialValues({
    if (user != null && onboarded) onboardedKey(user.id): true,
    ...prefsExtra,
  });
  final prefs = await SharedPreferences.getInstance();
  final t = TestApp(
    auth: FakeAuthRepository(user: user, paused: signInsPaused),
    social: FakeSocialAuth(hasApple: appleAvailable),
    biometric: FakeBiometric()..passes = biometricPasses,
    flags: FakeFlags(flagsOn, flagsOff),
    prefs: prefs,
    db: AppDatabase.memory(),
    join: FakeJoinRepository(),
    share: FakeShareRepository(),
    shareService: FakeShareService(),
    links: FakeDeepLinks(launch: launchLink),
  );
  _lastDb = t.db;
  driftRuntimeOptions.dontWarnAboutMultipleDatabases = true; // one in-memory DB per test
  setup?.call(t);
  await tester.pumpWidget(
    ProviderScope(
      retry: (_, _) => null,
      overrides: [
        sharedPreferencesProvider.overrideWithValue(prefs),
        appDatabaseProvider.overrideWithValue(t.db),
        isOnlineProvider.overrideWith((ref) => Stream.value(online)),
        authRepositoryProvider.overrideWithValue(t.auth),
        socialAuthProvider.overrideWithValue(t.social),
        biometricServiceProvider.overrideWithValue(t.biometric),
        flagsRepositoryProvider.overrideWithValue(t.flags),
        joinRepositoryProvider.overrideWithValue(t.join),
        shareRepositoryProvider.overrideWithValue(t.share),
        shareServiceProvider.overrideWithValue(t.shareService),
        deepLinkSourceProvider.overrideWithValue(t.links),
        afterJoinSyncProvider.overrideWithValue((tripId) async {}),
        ...overrides,
      ],
      child: const TripTrackerApp(),
    ),
  );
  await settle(tester);
  return t;
}

/// Drift (sqlite) work runs outside FakeAsync, so plain pumpAndSettle never
/// sees stream emissions and loops on the skeleton animation. Interleave real
/// waits with pumps instead.
Future<void> settle(WidgetTester tester, {int rounds = 8}) async {
  for (var i = 0; i < rounds; i++) {
    await tester.runAsync(() => Future<void>.delayed(const Duration(milliseconds: 15)));
    await tester.pump(const Duration(milliseconds: 120));
  }
}

/// Runs a database-backed call on the real event loop.
Future<T> real<T>(WidgetTester tester, Future<T> Function() f) async {
  // A stuck DB call should fail loudly with a stack, not hang the whole run.
  final r = await tester.runAsync(() => f().timeout(const Duration(seconds: 15)));
  // Query streams created under the fake clock reload on write; let those
  // finish before the next call, or a following transaction would wait on a
  // reload that only advances when the test pumps.
  for (var i = 0; i < 3; i++) {
    await tester.pump();
    await tester.runAsync(() => Future<void>.delayed(const Duration(milliseconds: 2)));
  }
  return r as T;
}

Finder field(int i) => find.byType(TextField).at(i);
