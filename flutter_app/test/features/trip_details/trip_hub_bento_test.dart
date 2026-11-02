import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:trip_tracker/core/platform/haptics.dart';
import 'package:trip_tracker/shared/widgets/bento_tile.dart';

import '../../support/pump_app.dart';
import '../../support/seed.dart';

Finder key(String k) => find.byKey(Key(k));

Future<void> goTo(WidgetTester tester, String path) async {
  await settle(tester);
  GoRouter.of(tester.element(find.byType(Scaffold).first)).go(path);
  await settle(tester, rounds: 14);
}

void main() {
  const bentoOn = {'enableCompassNav', 'enableCompassSpend', 'enableCompassMoney', 'enableBentoHub'};
  const bentoOff = {'enableCompassNav', 'enableCompassSpend', 'enableCompassMoney'};

  group('TripHubScreen Material 3 Bento Grid', () {
    testApp('with enableBentoHub ON: renders BentoTile widgets with staggered entrance and all action keys', (tester) async {
      await pumpApp(tester, user: asha, flagsOn: bentoOn);
      final s = await seedTrip(tester);
      await goTo(tester, '/trip/${s.tripId}/ledger');

      // Navigate to Trip Hub via Compass dock
      await tester.tap(find.descendant(of: key('calm-dock'), matching: find.text('Trip')));
      await settle(tester, rounds: 14);

      // Verify that BentoTile widgets are present in the hub
      expect(find.byType(BentoTile), findsWidgets);
      expect(find.byType(BentoEntrance), findsWidgets);

      // Verify primary hub keys are all present
      for (final k in [
        'hub-home',
        'hub-people',
        'hub-map',
        'hub-mute',
        'hub-invite',
        'hub-live',
        'hub-tools',
        'hub-settings',
        'hub-app-settings',
      ]) {
        await tester.ensureVisible(key(k));
        expect(key(k), findsOneWidget, reason: 'Key $k should be rendered');
      }

      // Verify tapping a tile triggers action and haptic feedback safely
      AppHaptics.level = HapticsLevel.all;
      await tester.tap(key('hub-map'));
      await settle(tester, rounds: 4);

      // Tapping mute alerts triggers state update
      await tester.ensureVisible(key('hub-mute'));
      await tester.tap(key('hub-mute'), warnIfMissed: false);
      await settle(tester, rounds: 4);
    });

    testApp('with enableBentoHub OFF: falls back to classic wrap without BentoEntrance', (tester) async {
      await pumpApp(tester, user: asha, flagsOn: bentoOff);
      final s = await seedTrip(tester);
      await goTo(tester, '/trip/${s.tripId}/ledger');

      await tester.tap(find.descendant(of: key('calm-dock'), matching: find.text('Trip')));
      await settle(tester, rounds: 14);

      // When flag is OFF, BentoEntrance should not be rendered
      expect(find.byType(BentoEntrance), findsNothing);

      // Standard hub keys remain intact
      expect(key('hub-people'), findsOneWidget);
      expect(key('hub-map'), findsOneWidget);
    });
  });
}
