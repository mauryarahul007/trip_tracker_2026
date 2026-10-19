import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:trip_tracker/data/auth/social_auth.dart';

import '../../support/pump_app.dart';

Finder key(String k) => find.byKey(Key(k));

/// The boarding-gate login (same sign-in paths as the classic screen, a different layout).
void main() {
  testApp('shows the boarding gate: title, tagline, chips, passenger status and Board with Google', (tester) async {
    await pumpApp(tester, boardingLogin: true);
    expect(find.text('Trip Tracker'), findsOneWidget);
    expect(find.textContaining('Split costs effortlessly'), findsOneWidget);
    for (final chip in ['100% Offline-First', 'Smart Splits', 'Instant Sync']) {
      expect(find.text(chip), findsOneWidget, reason: chip);
    }
    expect(find.text('PARADISE EDITION · 2026'), findsOneWidget);
    expect(find.text('PASSENGER'), findsOneWidget);
    expect(find.text('Not signed in'), findsOneWidget);
    expect(find.text('Board with Google'), findsOneWidget);
    expect(find.text('Continue with Google'), findsNothing); // the classic layout is not shown
  });

  testApp('Board with Google signs in; cancelling does nothing', (tester) async {
    final app = await pumpApp(tester, boardingLogin: true);
    app.social.googleResult = null;
    await tester.tap(key('board-google'));
    await tester.pumpAndSettle();
    expect(app.auth.calls, isEmpty);
    app.social.googleResult = const SocialCredential(idToken: 'g-token');
    await tester.tap(key('board-google'));
    await tester.pumpAndSettle();
    expect(app.auth.calls, ['google']);
  });

  testApp('Board with Apple only where Apple sign-in exists', (tester) async {
    await pumpApp(tester, boardingLogin: true);
    expect(key('board-apple'), findsNothing);
  });

  testApp('Board with Apple is offered on iOS', (tester) async {
    await pumpApp(tester, boardingLogin: true, appleAvailable: true);
    expect(find.text('Board with Apple'), findsOneWidget);
  });

  testApp('paused sign-ins: banner, and Google is disabled', (tester) async {
    final app = await pumpApp(tester, boardingLogin: true, signInsPaused: true);
    expect(key('paused-banner'), findsOneWidget);
    await tester.tap(key('board-google'));
    await tester.pumpAndSettle();
    expect(app.social.googleCalls, 0);
  });

  group('gate code', () {
    testApp('Join stays dim until six characters, then opens the invite', (tester) async {
      final app = await pumpApp(tester, boardingLogin: true);
      expect(tester.widget<FilledButton>(key('gate-join')).onPressed, isNull);
      expect(find.text('6 DIGITS'), findsOneWidget);
      await tester.enterText(key('gate-code'), 'abc12');
      await tester.pump();
      expect(tester.widget<FilledButton>(key('gate-join')).onPressed, isNull);
      await tester.enterText(key('gate-code'), 'abc123');
      await tester.pump();
      expect(tester.widget<FilledButton>(key('gate-join')).onPressed, isNotNull);
      expect(find.text('6 DIGITS'), findsNothing);
      await tester.ensureVisible(key('gate-join'));
      await tester.tap(key('gate-join'));
      await settle(tester, rounds: 8);
      expect(app.join.calls, contains('preview:ABC123'));
    });

    testApp('the keyboard Go key joins too', (tester) async {
      final app = await pumpApp(tester, boardingLogin: true);
      await tester.enterText(key('gate-code'), 'abc123');
      await tester.testTextInput.receiveAction(TextInputAction.go);
      await settle(tester, rounds: 8);
      expect(app.join.calls, contains('preview:ABC123'));
    });
  });

  testApp('Staff opens the superadmin form and signs in to the native portal', (tester) async {
    final app = await pumpApp(tester, boardingLogin: true);
    expect(key('superadmin-form'), findsNothing);
    await tester.ensureVisible(key('superadmin-toggle'));
    await tester.tap(key('superadmin-toggle'));
    await tester.pumpAndSettle();
    expect(key('superadmin-form'), findsOneWidget);
    final fields = find.descendant(of: key('superadmin-form'), matching: find.byType(TextField));
    await tester.enterText(fields.at(0), 'root@b.c');
    await tester.enterText(fields.at(1), 'pw');
    await tester.ensureVisible(find.text('Sign In'));
    await tester.tap(find.text('Sign In'));
    await tester.pumpAndSettle();
    expect(app.auth.calls, ['superadmin:root@b.c']);
    expect(key('admin-portal'), findsOneWidget);
  });

  testApp('a small phone (360 x 640) at 130% text scrolls instead of overflowing', (tester) async {
    await pumpApp(tester, boardingLogin: true);
    tester.view.physicalSize = const Size(360, 640);
    tester.platformDispatcher.textScaleFactorTestValue = 1.3;
    addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
    expect(key('board-google'), findsOneWidget);
    await tester.scrollUntilVisible(key('gate-join'), 200, scrollable: find.byType(Scrollable).first);
    expect(key('gate-join'), findsOneWidget);
  });

  testApp('Terms and Privacy links are on the sheet', (tester) async {
    await pumpApp(tester, boardingLogin: true);
    expect(find.text('Terms of Service'), findsOneWidget);
    expect(find.text('Privacy Policy'), findsOneWidget);
  });
}
