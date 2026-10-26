import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

import '../support/pump_app.dart';
import '../support/seed.dart';

Finder key(String k) => find.byKey(Key(k));

Future<void> _openTrip(WidgetTester tester) async {
  final s = await seedTrip(tester);
  await settle(tester);
  GoRouter.of(tester.element(find.byType(Scaffold).first)).go('/trip/${s.tripId}/ledger');
  await settle(tester, rounds: 14);
}

void main() {
  testApp('Compass nav: sync and bell only, no menu', (tester) async {
    await pumpApp(tester, user: asha, flagsOn: {'enableCompassNav'});
    await _openTrip(tester);
    expect(key('action-trip-more'), findsNothing);
    expect(key('action-trip-map'), findsNothing);
  });

  testApp('Clean bar: one More menu with share, map, settings and live location', (tester) async {
    await pumpApp(tester, user: asha);
    await _openTrip(tester);
    expect(key('action-trip-map'), findsNothing); // inside the menu until opened
    await tester.tap(key('action-trip-more'));
    await settle(tester, rounds: 4);
    for (final k in [
      'action-share',
      'action-trip-map',
      'action-trip-settings',
      'action-app-settings',
      'action-live-location',
    ]) {
      expect(key(k), findsOneWidget, reason: k);
    }
  });

  testApp('Legacy bar: loose Map, Share and Settings buttons and a smaller menu', (tester) async {
    await pumpApp(tester, user: asha, flagsOff: {'enableCleanTopBar', 'enableCompassNav'});
    await _openTrip(tester);
    expect(key('action-trip-map'), findsOneWidget);
    expect(find.byTooltip('Share Trip'), findsOneWidget);
    expect(find.byTooltip('Settings'), findsOneWidget);
    await tester.tap(key('action-trip-more'));
    await settle(tester, rounds: 4);
    expect(key('action-app-settings'), findsOneWidget);
    expect(key('action-live-location'), findsOneWidget);
    expect(key('action-share'), findsNothing);
  });
}
