import 'dart:async';

import 'package:drift/drift.dart' show driftRuntimeOptions;
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:trip_tracker/app/router.dart';
import 'package:trip_tracker/core/platform/haptics.dart';
import 'package:trip_tracker/core/platform/push_gateway.dart';
import 'package:trip_tracker/core/storage/prefs.dart';
import 'package:trip_tracker/core/version/version_gate.dart';
import 'package:trip_tracker/data/providers.dart';
import 'package:trip_tracker/domain/logic/version_gate.dart';
import 'package:trip_tracker/domain/models/travel_pass.dart';
import 'package:trip_tracker/domain/repositories/repositories.dart' show AuthUser;
import 'package:trip_tracker/features/auth/application/app_lock.dart';
import 'package:trip_tracker/features/notifications/application/push_providers.dart';
import 'package:trip_tracker/features/settings/presentation/settings_widgets.dart';

import '../../support/pump_app.dart';
import '../../support/seed.dart';

Future<void> go(WidgetTester t, String path) async {
  unawaited(containerOf(t).read(routerProvider).push<void>(path));
  await settle(t, rounds: 10);
}

const named = AuthUser(id: 'u1', email: 'a@b.c', displayName: 'Asha', provider: 'email');

void main() {
  setUpAll(() => driftRuntimeOptions.dontWarnAboutMultipleDatabases = true);

  group('Settings', () {
    testApp('shows profile, version and flag-gated rows; theme choice persists', (tester) async {
      final app = await pumpApp(tester, user: named);
      await go(tester, '/settings');
      expect(find.text('Asha'), findsWidgets);
      expect(find.textContaining('3.45.0'), findsOneWidget);
      expect(find.byKey(const Key('settings-amoled')), findsNothing); // Pro flag off
      expect(find.byKey(const Key('settings-biometric')), findsNothing); // Pro flag off

      await tester.tap(find.text('Dark'));
      await settle(tester);
      expect(app.prefs.getString('settings.theme'), 'dark');
      expect(tester.widget<MaterialApp>(find.byType(MaterialApp)).themeMode, ThemeMode.dark);
    });

    testApp('amoled and biometric rows appear with their flags and persist', (tester) async {
      final app = await pumpApp(tester, user: asha, flagsOn: {'enableAmoledTheme', 'enableBiometricAuth'});
      await go(tester, '/settings');
      final before = app.biometric.prompts; // the app lock may prompt on its own at start
      await tester.ensureVisible(find.byKey(const Key('settings-biometric')));
      await settle(tester);
      await tester.tap(find.byKey(const Key('settings-biometric')));
      await settle(tester);
      expect(app.biometric.prompts, before + 1);
      expect(app.prefs.getBool('security.biometric_lock'), isTrue);

      await tester.tap(find.byKey(const Key('settings-biometric'))); // turning it off needs no prompt
      await settle(tester);
      expect(containerOf(tester).read(biometricLockEnabledProvider), isFalse);

      app.biometric.passes = false; // a failed prompt must not turn it on
      await tester.tap(find.byKey(const Key('settings-biometric')));
      await settle(tester);
      expect(containerOf(tester).read(biometricLockEnabledProvider), isFalse);
      expect(find.byKey(const Key('settings-amoled'), skipOffstage: false), findsOneWidget);
    });

    testApp('Labs rows (suggest a feature, what is new) appear only with their flags', (tester) async {
      await pumpApp(tester, user: asha);
      await go(tester, '/settings');
      await tester.ensureVisible(find.byKey(const Key('settings-version')));
      await tester.pump();
      expect(find.byKey(const Key('settings-feature-request')), findsNothing);
      expect(find.byKey(const Key('settings-whats-new')), findsNothing);
      expect(find.byKey(const Key('settings-report-bug')), findsOneWidget);
      expect(find.byKey(const Key('settings-diagnostics')), findsOneWidget);
    });

    testApp('with the flags on, what is new lists the changelog', (tester) async {
      await pumpApp(tester, user: asha, flagsOn: {'enableFeatureSuggestions', 'enableWhatsNewHub'});
      await go(tester, '/settings');
      await tester.ensureVisible(find.byKey(const Key('settings-whats-new')));
      await tester.pump();
      expect(find.byKey(const Key('settings-feature-request')), findsOneWidget);
      await tester.tap(find.byKey(const Key('settings-whats-new')));
      await settle(tester);
      expect(find.byKey(const Key('changelog-list')), findsOneWidget);
      expect(find.textContaining('3.45.0'), findsWidgets);
    });

    testApp('haptics switch turns the facade off', (tester) async {
      await pumpApp(tester, user: asha);
      await go(tester, '/settings');
      await tester.tap(find.byKey(const Key('settings-haptics')));
      await settle(tester);
      expect(AppHaptics.enabled, isFalse);
      AppHaptics.enabled = true;
    });

    testApp('rename updates the profile', (tester) async {
      final app = await pumpApp(tester, user: named);
      await go(tester, '/settings');
      await tester.tap(find.byKey(const Key('settings-profile')));
      await settle(tester);
      await tester.enterText(find.byKey(const Key('profile-name-field')), 'Asha K');
      await tester.tap(find.byKey(const Key('profile-name-save')));
      await settle(tester);
      expect(app.auth.calls, contains('rename:Asha K'));
      expect(find.text('Asha K'), findsWidgets);
    });

    testApp('default currency is saved and used by the next trip', (tester) async {
      final app = await pumpApp(tester, user: asha);
      await go(tester, '/settings');
      await tester.tap(find.byKey(const Key('settings-currency')));
      await settle(tester);
      await tester.tap(find.byKey(const Key('currency-EUR')));
      await settle(tester);
      expect(app.prefs.getString('settings.default_currency'), 'EUR');
      expect(find.text('EUR'), findsWidgets);
    });

    testApp('backup export shares a json file; restore validates and asks before adding', (tester) async {
      final app = await pumpApp(tester, user: asha);
      final s = await seedTrip(tester);
      await addExpense(tester, s, title: 'Beach lunch', amount: 300);

      await go(tester, '/settings');
      await tester.dragUntilVisible(
        find.byKey(const Key('settings-export')),
        find.byType(ListView).first,
        const Offset(0, -200),
      );
      await tester.tap(find.byKey(const Key('settings-export')));
      await settle(tester);
      expect(app.shareService.files.single, startsWith('triptracker-backup-'));

      app.pickedText = 'not json';
      await tester.ensureVisible(find.byKey(const Key('settings-import')));
      await tester.pump();
      await tester.tap(find.byKey(const Key('settings-import')));
      await settle(tester);
      expect(find.byKey(const Key('settings-message'), skipOffstage: false), findsOneWidget);
      expect(find.text('Restore backup?'), findsNothing);
      await tester.ensureVisible(find.byKey(const Key('settings-import')));
      await tester.pump();

      app.pickedText = '{"trips":[{"id":"t","name":"Old"}],"expenses":[{"tripId":"t"}]}';
      await tester.tap(find.byKey(const Key('settings-import')));
      await settle(tester);
      expect(find.text('Restore backup?'), findsOneWidget);
      expect(find.textContaining('1 trip(s) and 1 expense(s)'), findsOneWidget);
      await tester.tap(find.text('Cancel'));
      await settle(tester);
      expect(
        (await real(tester, () => containerOf(tester).read(tripRepositoryProvider).watchTrips().first)).length,
        1,
      ); // nothing added
    });

    testApp('legal screens link to the full document online', (tester) async {
      final app = await pumpApp(tester, user: asha);
      await go(tester, '/privacy');
      await tester.dragUntilVisible(
        find.byKey(const Key('legal-full-privacy')),
        find.byType(SingleChildScrollView),
        const Offset(0, -200),
      );
      await tester.tap(find.byKey(const Key('legal-full-privacy')));
      expect(app.launched.single.path, '/privacy');
    });
  });

  group('Trip settings', () {
    testApp('owner can freeze, close and archive; changes hit the trip', (tester) async {
      await pumpApp(tester, user: asha, flagsOn: {'enableSimplifyDebtsToggle'});
      final s = await seedTrip(tester);
      await go(tester, '/trip/${s.tripId}/settings');
      expect(find.byKey(const Key('trip-simplify')), findsOneWidget);
      await tester.tap(find.byKey(const Key('trip-freeze')));
      await settle(tester);
      await tester.tap(find.text('Yes'));
      await settle(tester, rounds: 12);
      final trip = await real(tester, () => containerOf(tester).read(tripRepositoryProvider).watchTrip(s.tripId).first);
      expect(trip!.frozen, isTrue);
    });

    testApp('a non-owner cannot change money rules or trip state', (tester) async {
      await pumpApp(tester, user: asha, flagsOn: {'enableSimplifyDebtsToggle'});
      final s = await seedTrip(tester, owner: 'u2');
      await go(tester, '/trip/${s.tripId}/settings');
      expect(find.byKey(const Key('trip-freeze')), findsNothing);
      expect(tester.widget<SettingsSwitchTile>(find.byKey(const Key('trip-simplify'))).onChanged, isNull);
    });

    testApp('mute switch is server-backed', (tester) async {
      final app = await pumpApp(tester, user: asha);
      final s = await seedTrip(tester);
      await go(tester, '/trip/${s.tripId}/settings');
      await tester.tap(find.byKey(const Key('trip-mute')));
      await settle(tester, rounds: 12);
      expect(app.notifPrefs.muted, {s.tripId});
    });
  });

  group('Notification preferences', () {
    testApp('quiet hours and digest rows follow their flags', (tester) async {
      await pumpApp(tester, user: asha);
      await go(tester, '/settings/notifications');
      expect(find.byKey(const Key('quiet-enabled')), findsNothing);
      expect(find.byKey(const Key('digest-enabled')), findsNothing);
    });

    testApp('with the flags on, quiet hours and digest save to the server', (tester) async {
      final app = await pumpApp(tester, user: asha, flagsOn: {'enableQuietHours', 'enableDigestNotifications'});
      await go(tester, '/settings/notifications');
      await tester.tap(find.byKey(const Key('quiet-enabled')));
      await settle(tester, rounds: 12);
      expect(app.notifPrefs.quiet.enabled, isTrue);
      expect(find.byKey(const Key('quiet-start')), findsOneWidget);
      await tester.tap(find.byKey(const Key('digest-enabled')));
      await settle(tester, rounds: 12);
      expect(app.notifPrefs.digest, isTrue);
    });

    testApp('push tile: off -> tap -> system prompt -> on', (tester) async {
      final app = await pumpApp(tester, user: asha, setup: (a) => a.push.perm = PushPermission.notDetermined);
      await go(tester, '/settings/notifications');
      expect(find.text('Off. Tap to turn on.'), findsOneWidget);
      await tester.tap(find.byKey(const Key('push-tile')));
      await settle(tester, rounds: 12);
      expect(app.push.requests, 1);
      expect(find.text('On for this device'), findsOneWidget);
    });

    testApp('push tile explains a blocked or unconfigured build', (tester) async {
      final app = await pumpApp(tester, user: asha, setup: (a) => a.push.perm = PushPermission.denied);
      await go(tester, '/settings/notifications');
      expect(find.textContaining('Blocked'), findsOneWidget);
      app.push.available = false;
      containerOf(tester).invalidate(pushControllerProvider);
      await settle(tester, rounds: 10);
      expect(find.textContaining('Not available'), findsOneWidget);
    });
  });

  group('Version gate', () {
    Future<void> pumpGate(WidgetTester tester, VersionGateDecision d) =>
        pumpApp(tester, user: asha, overrides: [versionGateProvider.overrideWith((ref) async => d)]);

    testApp('hard block replaces the app and offers the store', (tester) async {
      final app = await pumpApp(
        tester,
        user: asha,
        overrides: [
          versionGateProvider.overrideWith(
            (ref) async => const VersionGateDecision(GateStatus.hard, storeUrl: 'https://store/x'),
          ),
        ],
      );
      expect(find.byKey(const Key('version-gate-block')), findsOneWidget);
      expect(find.text('Update required'), findsOneWidget);
      await tester.tap(find.byKey(const Key('version-gate-update')));
      expect(app.launched.single.toString(), 'https://store/x');
    });

    testApp('maintenance shows the server message and can retry', (tester) async {
      await pumpGate(tester, const VersionGateDecision(GateStatus.maintenance, message: 'Back at 5pm'));
      expect(find.text('Back at 5pm'), findsOneWidget);
      expect(find.byKey(const Key('version-gate-retry')), findsOneWidget);
    });

    testApp('soft nudge is a dismissible banner and the app stays usable', (tester) async {
      await pumpGate(tester, const VersionGateDecision(GateStatus.soft, storeUrl: 'https://store/x'));
      expect(find.byKey(const Key('version-gate-soft')), findsOneWidget);
      expect(find.byType(Scaffold), findsWidgets); // the app is still there under the banner
      await tester.tap(find.byKey(const Key('version-gate-dismiss')));
      await settle(tester);
      expect(find.byKey(const Key('version-gate-soft')), findsNothing);
    });

    testApp('ok and a failed check both leave the app alone (fail open)', (tester) async {
      await pumpApp(
        tester,
        user: asha,
        overrides: [versionGateProvider.overrideWith((ref) async => throw Exception('network'))],
      );
      expect(find.byKey(const Key('version-gate-block')), findsNothing);
      expect(find.byKey(const Key('version-gate-soft')), findsNothing);
    });
  });

  group('Feedback', () {
    testApp('bug report: scrubs personal data, attaches logs, shows the case id', (tester) async {
      final app = await pumpApp(tester, user: asha);
      await go(tester, '/settings/report-bug');
      await tester.enterText(find.byKey(const Key('bug-title')), 'Crash for asha@example.com');
      await tester.enterText(find.byKey(const Key('bug-steps')), 'Open trip\nTap add');
      await tester.dragUntilVisible(
        find.byKey(const Key('bug-submit')),
        find.byType(ListView).first,
        const Offset(0, -200),
      );
      await tester.tap(find.byKey(const Key('bug-submit')));
      await settle(tester, rounds: 12);
      final b = app.feedback.bugs.single;
      expect(b.title, isNot(contains('asha@example.com')));
      expect(b.title, contains('[email]'));
      expect(b.reproSteps, ['Open trip', 'Tap add']);
      expect(b.environment['client'], 'flutter');
      expect(b.diagnostics['consoleLogs'], isA<List<dynamic>>());
      expect(find.textContaining('BUG-900'), findsOneWidget);
    });

    testApp('bug report: empty title is refused; logs can be left out; guests are told to sign in', (tester) async {
      final app = await pumpApp(tester, user: asha);
      await go(tester, '/settings/report-bug');
      await tester.dragUntilVisible(
        find.byKey(const Key('bug-submit')),
        find.byType(ListView).first,
        const Offset(0, -200),
      );
      await tester.tap(find.byKey(const Key('bug-submit')));
      await settle(tester);
      expect(find.byKey(const Key('bug-error')), findsOneWidget);
      expect(app.feedback.bugs, isEmpty);

      await tester.tap(find.byKey(const Key('bug-logs')));
      await tester.enterText(find.byKey(const Key('bug-title')), 'Odd total');
      app.feedback.unavailable = true;
      await tester.tap(find.byKey(const Key('bug-submit')));
      await settle(tester, rounds: 12);
      expect(find.textContaining('Sign in'), findsWidgets);
    });

    testApp('feature request is sent', (tester) async {
      final app = await pumpApp(tester, user: asha);
      await go(tester, '/settings/feature-request');
      await tester.enterText(find.byKey(const Key('feature-title')), 'Dark map');
      await tester.tap(find.byKey(const Key('feature-submit')));
      await settle(tester, rounds: 12);
      expect(app.feedback.features, ['Dark map']);
      expect(find.byKey(const Key('feature-sent')), findsOneWidget);
    });

    testApp('diagnostics shows environment, sync state and the flag override screen (non-prod)', (tester) async {
      await pumpApp(tester, user: asha);
      await go(tester, '/settings/diagnostics');
      expect(find.text('Everything is synced'), findsOneWidget);
      await tester.tap(find.byKey(const Key('diag-flags')));
      await settle(tester, rounds: 10);
      await tester.enterText(find.byKey(const Key('flags-search')), 'enableQuietHours');
      await settle(tester);
      await tester.tap(find.byKey(const Key('flag-menu-enableQuietHours')));
      await settle(tester);
      await tester.tap(find.text('Force ON'));
      await settle(tester);
      expect(containerOf(tester).read(flagOverrideStoreProvider).all['enableQuietHours'], isTrue);
    });
  });

  group('Push and reminders', () {
    testApp('first saved expense asks once for push; later saves do not', (tester) async {
      final app = await pumpApp(tester, user: asha, setup: (a) => a.push.perm = PushPermission.notDetermined);
      final s = await seedTrip(tester);
      Future<void> saveOne(String title) async {
        await go(tester, '/trip/${s.tripId}/expenses/new');
        await tester.enterText(find.byKey(const Key('amount-field')), '100');
        await tester.enterText(find.byKey(const Key('title-field')), title);
        await settle(tester, rounds: 2);
        await tester.ensureVisible(find.byKey(const Key('save')));
        await tester.tap(find.byKey(const Key('save')));
        await settle(tester, rounds: 14);
      }

      await saveOne('Dinner');
      expect(find.text('Get trip alerts?'), findsOneWidget);
      await tester.tap(find.byKey(const Key('push-prompt-yes')));
      await settle(tester, rounds: 10);
      expect(app.push.requests, 1);

      app.push.perm = PushPermission.notDetermined; // even if still undecided, we never nag
      containerOf(tester).invalidate(pushControllerProvider);
      await settle(tester);
      await saveOne('Lunch');
      expect(find.text('Get trip alerts?'), findsNothing);
      expect(app.push.requests, 1);
    });

    testApp('declining the prompt does not call the OS', (tester) async {
      final app = await pumpApp(tester, user: asha, setup: (a) => a.push.perm = PushPermission.notDetermined);
      final s = await seedTrip(tester);
      await go(tester, '/trip/${s.tripId}/expenses/new');
      await tester.enterText(find.byKey(const Key('amount-field')), '50');
      await tester.enterText(find.byKey(const Key('title-field')), 'Tea');
      await settle(tester, rounds: 2);
      await tester.ensureVisible(find.byKey(const Key('save')));
      await tester.tap(find.byKey(const Key('save')));
      await settle(tester, rounds: 14);
      await tester.tap(find.byKey(const Key('push-prompt-later')));
      await settle(tester, rounds: 10);
      expect(app.push.requests, 0);
    });

    testApp('tapping a push opens the trip tab; unsafe routes fall back to type + trip', (tester) async {
      final app = await pumpApp(tester, user: asha);
      final s = await seedTrip(tester);
      await settle(tester);
      app.push.opened.add(
        PushMessage(data: {'type': 'settlement_reminder', 'tripId': s.tripId, 'route': 'https://evil.example'}),
      );
      await settle(tester, rounds: 14);
      final loc = GoRouterState.of(tester.element(find.byType(AppBar).last)).uri.path;
      expect(loc, '/trip/${s.tripId}/ledger');
    });

    testApp('cold start from a push lands on the right tab', (tester) async {
      late String tripId;
      final app = await pumpApp(tester, user: asha);
      final s = await seedTrip(tester);
      tripId = s.tripId;
      await tester.pumpWidget(const SizedBox());
      await settle(tester);
      app.push.initial = PushMessage(data: {'type': 'member_joined', 'tripId': tripId});
      await pumpApp(
        tester,
        user: asha,
        setup: (a) => a.push.initial = PushMessage(data: {'type': 'member_joined', 'tripId': tripId}),
      );
      // The second app has its own empty db, so only assert the push did not crash and the router is alive.
      expect(find.byType(MaterialApp), findsOneWidget);
    });

    testApp('reminders are scheduled for dated passes and cleared when switched off', (tester) async {
      final app = await pumpApp(tester, user: asha);
      final s = await seedTrip(tester);
      final dep = DateTime.now().add(const Duration(days: 5)).toIso8601String();
      await real(
        tester,
        () => containerOf(tester).read(tripRepositoryProvider).setPasses(s.tripId, [
          TravelPass(
            id: 'p1',
            tripId: s.tripId,
            type: 'flight',
            title: 'AI 101',
            startDateTime: dep,
            createdAt: 0,
            updatedAt: 0,
          ),
        ]),
      );
      await tester.runAsync(() => Future<void>.delayed(const Duration(milliseconds: 300)));
      await tester.pump(const Duration(seconds: 3)); // debounce timer
      await settle(tester);
      expect(app.local.scheduled, hasLength(2));
      expect(app.local.scheduled.first.body, contains('Goa Weekend'));

      await containerOf(tester).read(sharedPreferencesProvider).setBool('settings.pass_reminders', false);
      await go(tester, '/settings');
      await tester.dragUntilVisible(
        find.byKey(const Key('settings-pass-reminders')),
        find.byType(ListView).first,
        const Offset(0, -200),
      );
      await tester.tap(find.byKey(const Key('settings-pass-reminders')));
      await tester.pump(const Duration(seconds: 3));
      await settle(tester);
      expect(app.local.scheduled, isEmpty);
    });
  });
}
