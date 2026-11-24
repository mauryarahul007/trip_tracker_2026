import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:trip_tracker/data/providers.dart';

import '../../support/pump_app.dart';
import '../../support/seed.dart';

Finder key(String k) => find.byKey(Key(k));

Future<void> home(WidgetTester tester) async {
  GoRouter.of(tester.element(find.byType(Scaffold).first)).go('/');
  await settle(tester, rounds: 12);
}

String ymd(DateTime d) => d.toIso8601String().substring(0, 10);

Future<String> tripOn(WidgetTester tester, String name, int startOffset, int endOffset) {
  final now = DateTime.now();
  return real(
    tester,
    () => containerOf(tester)
        .read(tripRepositoryProvider)
        .createTrip(
          name: name,
          startDate: ymd(now.add(Duration(days: startOffset))),
          endDate: ymd(now.add(Duration(days: endOffset))),
          baseCurrency: 'INR',
          ownerId: 'u1',
          creatorName: 'Asha',
        ),
  );
}

void main() {
  group('Horizon home is the only Trips view (flag enableHorizonUi)', () {
    testApp('greeting, search and bell; no card stack, layout, view or filter chips', (tester) async {
      await pumpApp(tester, user: asha, flagsOn: {'enableHorizonUi'});
      await seedTrip(tester);
      await home(tester);
      expect(key('horizon-home'), findsOneWidget);
      expect(key('horizon-greeting'), findsOneWidget);
      expect(key('trips-search-toggle'), findsOneWidget);
      expect(key('action-notifications'), findsOneWidget);
      expect(key('trip-stack'), findsNothing);
      expect(key('trips-view-toggle'), findsNothing);
      expect(key('trips-layout-toggle'), findsNothing);
      expect(key('trips-view-menu'), findsNothing);
      expect(key('trip-filters'), findsNothing);
    });

    testApp('hero shows Get and Pay pills', (tester) async {
      await pumpApp(tester, user: asha, flagsOn: {'enableHorizonUi'});
      final s = await seedTrip(tester);
      await addExpense(tester, s, amount: 90);
      await home(tester);
      expect(find.text('Get ₹60.00'), findsOneWidget);
      expect(find.text('Pay ₹0.00'), findsOneWidget);
    });

    testApp('Live now card with day label and spent; Upcoming and Past trips as rows', (tester) async {
      await pumpApp(tester, user: asha, flagsOn: {'enableHorizonUi'});
      final now = await tripOn(tester, 'Now Trip', -1, 3);
      final later = await tripOn(tester, 'Later Trip', 10, 14);
      final old = await tripOn(tester, 'Old Trip', -30, -25);
      await home(tester);
      expect(find.text('Live now'), findsOneWidget);
      expect(key('horizon-live-trip'), findsOneWidget);
      expect(find.text('Day 2/5'), findsOneWidget);
      expect(tester.widget<Text>(key('horizon-live-spent')).data, '₹0.00 spent');
      expect(find.text('Upcoming'), findsOneWidget);
      expect(find.text('Past trips'), findsOneWidget);
      for (final id in [now, later, old]) {
        expect(key('trip-row-$id'), findsOneWidget);
      }
      expect(key('trip-progress'), findsOneWidget);
    });

    testApp('See all shows every live trip', (tester) async {
      await pumpApp(tester, user: asha, flagsOn: {'enableHorizonUi'});
      final a = await tripOn(tester, 'Live A', -1, 3);
      final b = await tripOn(tester, 'Live B', -2, 2);
      await home(tester);
      expect(key('horizon-live-trip'), findsOneWidget);
      await tester.tap(key('section-action-Live now'));
      await settle(tester, rounds: 4);
      expect(key('horizon-live-trip'), findsNWidgets(2));
      expect(key('trip-row-$a'), findsOneWidget);
      expect(key('trip-row-$b'), findsOneWidget);
    });

    testApp('no trips: Where to first? with Start a trip and Join with code', (tester) async {
      await pumpApp(tester, user: asha, flagsOn: {'enableHorizonUi'});
      await home(tester);
      expect(key('horizon-empty'), findsOneWidget);
      expect(find.text('Where to first?'), findsOneWidget);
      expect(key('horizon-empty-start'), findsOneWidget);
      expect(key('horizon-empty-join'), findsOneWidget);
      expect(find.text('Your trips'), findsOneWidget);
    });

    testApp('flag off keeps the Calm list', (tester) async {
      await pumpApp(tester, user: asha);
      await seedTrip(tester);
      await home(tester);
      expect(key('horizon-home'), findsNothing);
      expect(key('trip-filters'), findsOneWidget);
    });
  });
}
