import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../support/pump_app.dart';

Finder key(String k) => find.byKey(Key(k));

void main() {
  testApp('signed out: an invite link offers "Join with just your name", which signs in a guest and joins', (
    tester,
  ) async {
    final app = await pumpApp(tester, launchLink: Uri.parse('com.triptracker.app://join/abc123'));
    expect(key('join-guest'), findsOneWidget);
    await tester.tap(key('join-guest'));
    await settle(tester, rounds: 6);
    expect(key('guest-name-join'), findsOneWidget);
    await tester.enterText(key('guest-name'), 'Ravi');
    await tester.pump();
    await tester.tap(key('guest-name-join'));
    await settle(tester, rounds: 14);
    expect(app.auth.calls, contains('inviteGuest:Ravi'));
    expect(app.join.calls, contains('joinWithName:ABC123:Ravi'));
  });

  testApp('the name box refuses an empty name', (tester) async {
    await pumpApp(tester, launchLink: Uri.parse('com.triptracker.app://join/abc123'));
    await tester.tap(key('join-guest'));
    await settle(tester, rounds: 6);
    expect(tester.widget<FilledButton>(key('guest-name-join')).onPressed, isNull);
  });

  testApp('flag off: only the sign-in buttons', (tester) async {
    await pumpApp(tester, launchLink: Uri.parse('com.triptracker.app://join/abc123'), flagsOff: {'enableGuestJoin'});
    expect(key('join-guest'), findsNothing);
  });
}
