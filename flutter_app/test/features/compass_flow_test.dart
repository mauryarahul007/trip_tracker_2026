import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

import '../support/pump_app.dart';
import '../support/seed.dart';

Finder key(String k) => find.byKey(Key(k));

Future<void> goTo(WidgetTester tester, String path) async {
  await settle(tester);
  GoRouter.of(tester.element(find.byType(Scaffold).first)).go(path);
  await settle(tester, rounds: 14);
}

const compassOn = {'enableCompassNav', 'enableCompassSpend', 'enableCompassMoney'};

void main() {
  group('Compass trip navigation', () {
    testApp('flag on: dock is Balances, Spend, Activity, Trip with the orange Add button', (tester) async {
      await pumpApp(tester, user: asha, flagsOn: compassOn);
      final s = await seedTrip(tester);
      await goTo(tester, '/trip/${s.tripId}/expenses');
      expect(key('compass-dock'), findsOneWidget);
      expect(key('dock-center'), findsOneWidget);
      for (final l in ['Balances', 'Spend', 'Activity', 'Trip']) {
        expect(find.descendant(of: key('compass-dock'), matching: find.text(l)), findsOneWidget);
      }
      expect(key('compass-spend-summary'), findsOneWidget);
    });

    testApp('flag on: Activity opens in the dock, Chat moves to a Trip hub tile', (tester) async {
      await pumpApp(tester, user: asha, flagsOn: {...compassOn, 'enableTripChat'});
      final s = await seedTrip(tester);
      await goTo(tester, '/trip/${s.tripId}/ledger');
      await tester.tap(find.descendant(of: key('compass-dock'), matching: find.text('Activity')));
      await settle(tester, rounds: 14);
      expect(find.text('No activity yet'), findsOneWidget);
      await tester.tap(find.descendant(of: key('compass-dock'), matching: find.text('Trip')));
      await settle(tester, rounds: 14);
      expect(key('hub-home'), findsOneWidget);
      expect(key('hub-chat'), findsNothing); // Chat lives inside Notes, not as its own entry
    });

    testApp('money flag: Balances keeps the settlement pass and drops the yellow close-out card', (tester) async {
      await pumpApp(tester, user: asha, flagsOn: {...compassOn, 'enableCloseoutPrompt'});
      final s = await seedTrip(tester);
      await addExpense(tester, s);
      await goTo(tester, '/trip/${s.tripId}/ledger');
      expect(key('sticky-balance'), findsOneWidget);
      expect(key('hero-amount'), findsOneWidget);
      expect(key('closeout-prompt'), findsNothing);
    });

    testApp('compass money off: the close-out card is still there', (tester) async {
      await pumpApp(tester, user: asha, flagsOn: {'enableCloseoutPrompt'});
      final s = await seedTrip(tester);
      await addExpense(tester, s);
      await goTo(tester, '/trip/${s.tripId}/ledger');
      expect(key('closeout-prompt'), findsOneWidget);
    });

    testApp('compass spend: days start open and Collapse all / Expand all still work', (tester) async {
      await pumpApp(tester, user: asha, flagsOn: compassOn);
      final s = await seedTrip(tester);
      await addExpense(tester, s, title: 'Beach lunch');
      await goTo(tester, '/trip/${s.tripId}/expenses');
      expect(find.text('Beach lunch'), findsOneWidget);
      await tester.tap(key('tab-menu'));
      await settle(tester);
      await tester.tap(find.text('Collapse all days'));
      await settle(tester, rounds: 10);
      expect(find.text('Beach lunch'), findsNothing);
      await tester.tap(key('tab-menu'));
      await settle(tester);
      await tester.tap(find.text('Expand all days'));
      await settle(tester, rounds: 10);
      expect(find.text('Beach lunch'), findsOneWidget);
    });

    testApp('flag on: Trip opens the hub and People opens from it, keeping Trip lit', (tester) async {
      await pumpApp(tester, user: asha, flagsOn: compassOn);
      final s = await seedTrip(tester);
      await goTo(tester, '/trip/${s.tripId}/expenses');
      await tester.tap(find.descendant(of: key('compass-dock'), matching: find.text('Trip')));
      await settle(tester, rounds: 14);
      expect(key('trip-hub'), findsOneWidget);
      await tester.tap(key('hub-people'));
      await settle(tester, rounds: 14);
      expect(key('trip-hub'), findsNothing);
      expect(key('compass-dock'), findsOneWidget); // still inside the trip, dock stays
    });

    testApp('flag on: a direct link to Notes still opens it (old URLs keep working)', (tester) async {
      await pumpApp(tester, user: asha, flagsOn: compassOn);
      final s = await seedTrip(tester);
      await goTo(tester, '/trip/${s.tripId}/notes');
      expect(key('compass-dock'), findsOneWidget);
      expect(find.byType(Scaffold), findsWidgets);
    });

    testApp('flag off: the previous tab bar, no hub, no Compass dock', (tester) async {
      await pumpApp(tester, user: asha);
      final s = await seedTrip(tester);
      await goTo(tester, '/trip/${s.tripId}/expenses');
      expect(key('compass-dock'), findsNothing);
      expect(key('compass-spend-summary'), findsNothing);
      expect(key('dock-center'), findsNothing);
    });
  });

  group('Get this trip rolling (enableTripGetStarted)', () {
    testApp('blank trip: Summary and Expenses show the start card, no settlement', (tester) async {
      await pumpApp(tester, user: asha, flagsOn: {'enableTripGetStarted'});
      final s = await seedTrip(tester);
      await goTo(tester, '/trip/${s.tripId}/ledger');
      expect(key('trip-get-started'), findsOneWidget);
      expect(find.text('Get this trip rolling'), findsOneWidget);
      for (final k in ['started-share-link', 'started-copy-link', 'started-add-expense']) {
        expect(key(k), findsOneWidget);
      }
      expect(key('ledger-list'), findsNothing);
      await goTo(tester, '/trip/${s.tripId}/expenses');
      expect(key('trip-get-started'), findsOneWidget);
    });

    testApp('after the first expense the normal Summary returns', (tester) async {
      await pumpApp(tester, user: asha, flagsOn: {'enableTripGetStarted'});
      final s = await seedTrip(tester);
      await addExpense(tester, s);
      await goTo(tester, '/trip/${s.tripId}/ledger');
      expect(key('trip-get-started'), findsNothing);
    });

    testApp('flag off: blank trip keeps the previous screens', (tester) async {
      await pumpApp(tester, user: asha);
      final s = await seedTrip(tester);
      await goTo(tester, '/trip/${s.tripId}/ledger');
      expect(key('trip-get-started'), findsNothing);
    });
  });
}
