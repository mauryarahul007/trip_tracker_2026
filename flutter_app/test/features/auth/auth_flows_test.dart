import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:trip_tracker/data/auth/social_auth.dart';
import 'package:trip_tracker/domain/logic/app_lock_policy.dart';
import 'package:trip_tracker/domain/repositories/repositories.dart';
import 'package:trip_tracker/features/auth/application/onboarding_state.dart';
import 'package:trip_tracker/shared/widgets/app_button.dart';

import '../../support/pump_app.dart';

Finder button(String label) => find.widgetWithText(AppButton, label);

Future<void> openSuperadmin(WidgetTester tester) async {
  await tester.ensureVisible(find.byKey(const Key('superadmin-toggle')));
  await tester.tap(find.byKey(const Key('superadmin-toggle')));
  await tester.pumpAndSettle();
}

void main() {
  group('login', () {
    testApp('shows Google, hides Apple off-iOS, shows Apple on iOS', (tester) async {
      await pumpApp(tester);
      expect(button('Continue with Google'), findsOneWidget);
      expect(button('Continue with Apple'), findsNothing);
    });

    testApp('wide window: two-pane landing with the Night Sky pitch; phone width has no pitch pane', (tester) async {
      await pumpApp(tester);
      expect(find.byKey(const Key('login-hero')), findsNothing); // harness is phone-sized
      tester.view.physicalSize = const Size(1400, 900);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.reset);
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('login-hero')), findsOneWidget);
      expect(button('Continue with Google'), findsOneWidget);
    });

    testApp('Apple button is offered on iOS', (tester) async {
      await pumpApp(tester, appleAvailable: true);
      expect(button('Continue with Apple'), findsOneWidget);
    });

    testApp('Google success signs in; cancel does nothing', (tester) async {
      final app = await pumpApp(tester);
      app.social.googleResult = null; // user cancelled
      await tester.tap(button('Continue with Google'));
      await tester.pumpAndSettle();
      expect(app.auth.calls, isEmpty);
      expect(find.text('My Trips'), findsNothing);

      app.social.googleResult = const SocialCredential(idToken: 'g-token');
      await tester.tap(button('Continue with Google'));
      await tester.pumpAndSettle();
      expect(app.auth.calls, ['google']);
    });

    testApp('paused sign-ups: banner shown, social + sign-up disabled', (tester) async {
      await pumpApp(tester, signInsPaused: true);
      expect(find.byKey(const Key('paused-banner')), findsOneWidget);
      expect(find.text('New sign-ins are temporarily paused. Please check back shortly.'), findsOneWidget);
      expect(tester.widget<AppButton>(button('Continue with Google')).onPressed, isNull);
    });

    testApp('normal users only see Google: no email form, sign-up, guest or demo', (tester) async {
      await pumpApp(tester);
      expect(find.byType(TextField), findsOneWidget); // only the trip-code box
      expect(find.byKey(const Key('superadmin-form')), findsNothing);
      expect(find.text('Continue as guest'), findsNothing);
      expect(find.text('Try the demo'), findsNothing);
      expect(find.text('New here? Create an account'), findsNothing);
      expect(find.text('Superadmin login'), findsOneWidget);
    });

    testApp('superadmin section expands, signs in and rejects empty fields', (tester) async {
      final app = await pumpApp(tester);
      await openSuperadmin(tester);
      await tester.tap(button('Sign In'));
      await tester.pumpAndSettle();
      expect(find.text('Enter your email and password.'), findsOneWidget);
      expect(app.auth.calls, isEmpty);
      await tester.enterText(field(0), 'root@b.c');
      await tester.enterText(field(1), 'pw');
      await tester.tap(button('Sign In'));
      await tester.pumpAndSettle();
      expect(app.auth.calls, ['superadmin:root@b.c']);
      // A superadmin lands on the Superadmin screen, not the traveller Trips page.
      expect(find.byKey(const Key('admin-portal')), findsOneWidget); // the native portal, not a web redirect
      expect(app.launched, isEmpty); // nothing was opened in a browser
      expect(find.byKey(const Key('admin-open-ops-deck')), findsOneWidget); // web-only tools stay one tap away
      expect(find.byKey(const Key('admin-view-traveller')), findsNothing); // the web portal has its own preview
      expect(find.text('My Trips'), findsNothing);
    });

    testApp('a non-superadmin account is rejected with Google guidance', (tester) async {
      final app = await pumpApp(tester);
      await openSuperadmin(tester);
      app.auth.failNext = const AuthException(AuthFailure.notSuperadmin, 'x');
      await tester.enterText(field(0), 'user@b.c');
      await tester.enterText(field(1), 'pw');
      await tester.tap(button('Sign In'));
      await tester.pumpAndSettle();
      expect(find.textContaining('not a superadmin'), findsOneWidget);
    });

    testApp('banned and offline errors have their own copy', (tester) async {
      final app = await pumpApp(tester);
      await openSuperadmin(tester);
      await tester.enterText(field(0), 'a@b.c');
      await tester.enterText(field(1), 'pw');
      app.auth.failNext = const AuthException(AuthFailure.banned, 'x');
      await tester.tap(button('Sign In'));
      await tester.pumpAndSettle();
      expect(find.text('This account has been suspended.'), findsOneWidget);
      app.auth.failNext = const AuthException(AuthFailure.network, 'x');
      await tester.tap(button('Sign In'));
      await tester.pumpAndSettle();
      expect(find.textContaining("Can't reach the server"), findsOneWidget);
    });

    testApp('6-digit trip code opens the join screen logged out', (tester) async {
      final app = await pumpApp(tester);
      await tester.enterText(find.widgetWithText(TextField, '').last, 'abc123');
      await tester.testTextInput.receiveAction(TextInputAction.go);
      await settle(tester, rounds: 8);
      expect(app.join.calls, contains('preview:ABC123'));
      expect(find.text('You\'re invited to "Goa Weekend"'), findsOneWidget);
    });
  });

  group('onboarding', () {
    testApp('first sign-in shows the carousel; Skip lands on trips and is remembered', (tester) async {
      final app = await pumpApp(tester, user: asha, onboarded: false);
      expect(find.text('Welcome to Trip Tracker'), findsOneWidget);
      await tester.tap(find.text('Skip'));
      await tester.pumpAndSettle();
      expect(find.text('My Trips'), findsOneWidget);
      expect(app.prefs.getBool(onboardedKey('u1')), isTrue);
    });

    testApp('three steps then Get started', (tester) async {
      await pumpApp(tester, user: asha, onboarded: false);
      await tester.tap(find.text('Next'));
      await tester.pumpAndSettle();
      expect(find.text('Create Your First Trip'), findsOneWidget);
      await tester.tap(find.text('Next'));
      await tester.pumpAndSettle();
      expect(find.text('Log & Split Expenses'), findsOneWidget);
      await tester.tap(find.text('Get started'));
      await tester.pumpAndSettle();
      expect(find.text('My Trips'), findsOneWidget);
    });

    testApp('already-onboarded user goes straight to trips', (tester) async {
      await pumpApp(tester, user: asha);
      expect(find.text('Welcome to Trip Tracker'), findsNothing);
      expect(find.text('My Trips'), findsOneWidget);
    });
  });

  group('reset password', () {
    testApp('request sends the link and confirms', (tester) async {
      final app = await pumpApp(tester);
      await openSuperadmin(tester);
      await tester.tap(find.text('Forgot Password?'));
      await tester.pumpAndSettle();
      await tester.enterText(field(0), 'a@b.c');
      await tester.tap(button('Send Reset Link'));
      await tester.pumpAndSettle();
      expect(app.auth.calls, ['reset:a@b.c']);
      expect(find.text('Check your email'), findsOneWidget);
    });

    testApp('recovery link switches to set-new-password with validation', (tester) async {
      final app = await pumpApp(tester);
      await openSuperadmin(tester);
      await tester.tap(find.text('Forgot Password?'));
      await tester.pumpAndSettle();
      app.auth.recovery.add(true);
      await tester.pumpAndSettle();
      expect(find.text('Choose a new password'), findsOneWidget);
      await tester.enterText(field(0), 'short');
      await tester.tap(button('Save Password'));
      await tester.pumpAndSettle();
      expect(find.text('Use at least 8 characters.'), findsOneWidget);
      await tester.enterText(field(0), 'longenough1');
      await tester.tap(button('Save Password'));
      await tester.pumpAndSettle();
      expect(app.auth.calls, contains('updatePassword'));
    });
  });

  group('app lock', () {
    const lockPrefs = {'security.biometric_lock': true};

    testApp('cold start locks when enabled + flag on; unlock reveals the app', (tester) async {
      final app = await pumpApp(tester, user: asha, flagsOn: {'enableBiometricAuth'}, prefsExtra: lockPrefs);
      await tester.pump(const Duration(milliseconds: 300));
      await tester.pumpAndSettle();
      expect(app.biometric.prompts, 1); // auto-prompt, passed
      expect(find.text('Trip Tracker is Locked'), findsNothing);
      expect(find.text('My Trips'), findsOneWidget);
    });

    testApp('failed biometrics keep the overlay with an error; retry unlocks', (tester) async {
      final app = await pumpApp(
        tester,
        user: asha,
        flagsOn: {'enableBiometricAuth'},
        prefsExtra: lockPrefs,
        biometricPasses: false,
      );
      await tester.pump(const Duration(milliseconds: 300));
      await tester.pumpAndSettle();
      expect(find.text('Trip Tracker is Locked'), findsOneWidget);
      expect(find.textContaining('Biometric verification failed'), findsOneWidget);
      expect(find.text('My Trips'), findsOneWidget); // present underneath, covered

      app.biometric.passes = true;
      await tester.tap(find.widgetWithText(FilledButton, 'Unlock'));
      await tester.pumpAndSettle();
      expect(find.text('Trip Tracker is Locked'), findsNothing);
    });

    testApp('signing out from the lock screen clears it', (tester) async {
      final app = await pumpApp(
        tester,
        user: asha,
        flagsOn: {'enableBiometricAuth'},
        prefsExtra: lockPrefs,
        biometricPasses: false,
      );
      await tester.pump(const Duration(milliseconds: 300));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Sign Out'));
      await tester.pumpAndSettle();
      expect(app.auth.calls, contains('signOut'));
      expect(find.text('Trip Tracker is Locked'), findsNothing);
    });

    testApp('flag off: never locks even if the user enabled it', (tester) async {
      final app = await pumpApp(tester, user: asha, prefsExtra: lockPrefs);
      await tester.pump(const Duration(milliseconds: 300));
      expect(app.biometric.prompts, 0);
      expect(find.text('Trip Tracker is Locked'), findsNothing);
    });

    testApp('user preference off: never locks even if flag is on', (tester) async {
      final app = await pumpApp(tester, user: asha, flagsOn: {'enableBiometricAuth'});
      await tester.pump(const Duration(milliseconds: 300));
      expect(app.biometric.prompts, 0);
    });

    test('policy: only locks after the timeout, only when enabled', () {
      final t0 = DateTime(2026, 1, 1, 12);
      bool at(int s, {bool enabled = true, DateTime? bg}) => shouldLockOnResume(
        enabled: enabled,
        backgroundedAt: bg ?? t0,
        now: t0.add(Duration(seconds: s)),
      );
      expect(at(5), isFalse);
      expect(at(29), isFalse);
      expect(at(30), isTrue);
      expect(at(600), isTrue);
      expect(at(600, enabled: false), isFalse);
      expect(shouldLockOnResume(enabled: true, backgroundedAt: null, now: t0), isFalse);
    });
  });
}
