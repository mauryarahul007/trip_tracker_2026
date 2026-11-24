import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:trip_tracker/app/router.dart';
import 'package:trip_tracker/features/notes/application/itinerary_providers.dart';

import '../support/pump_app.dart';
import '../support/seed.dart';

void main() {
  group('Horizon itinerary (flags enableHorizonUi + enableItineraryPlanner)', () {
    Future<Seed> open(WidgetTester tester, {bool horizon = true}) async {
      await pumpApp(tester, user: asha, flagsOn: {if (horizon) 'enableHorizonUi', 'enableItineraryPlanner'});
      final s = await seedTrip(tester); // 1-9 Oct 2026
      final it = containerOf(tester).read(tripItineraryProvider(s.tripId).notifier);
      await real(tester, () => it.add(date: '2026-10-01', time: '17:30', title: 'Sunset at Cabo de Rama'));
      await real(
        tester,
        () => it.add(
          date: '2026-10-01',
          time: '08:30',
          title: 'Scuba at Grande Island',
          location: 'Bogmalo',
          costEstimate: 10500,
        ),
      );
      await real(tester, () => it.add(date: '2026-10-01', title: 'Buy sunscreen', category: 'other'));
      containerOf(tester).read(routerProvider).go('/trip/${s.tripId}/notes');
      await settle(tester, rounds: 12);
      return s;
    }

    testApp('one day at a time: date pills, timeline in time order, Anytime first', (tester) async {
      await open(tester);
      expect(find.byKey(const Key('horizon-itinerary')), findsOneWidget);
      expect(find.byKey(const Key('itin-day-2026-10-01')), findsOneWidget);
      expect(find.byKey(const Key('itin-day-2026-10-02')), findsOneWidget);
      expect(tester.widget<Text>(find.byKey(const Key('itin-day-title'))).data, 'Day 1 · Thu 1 Oct');
      expect(find.text('ANYTIME'), findsOneWidget);
      expect(find.text('08:30'), findsOneWidget);
      final scuba = tester.getTopLeft(find.text('Scuba at Grande Island')).dy;
      final sunset = tester.getTopLeft(find.text('Sunset at Cabo de Rama')).dy;
      final anytime = tester.getTopLeft(find.text('Buy sunscreen')).dy;
      expect(anytime < scuba && scuba < sunset, isTrue);
      expect(find.textContaining('10,500'), findsOneWidget);

      // Another day: empty state with an add button.
      await tester.tap(find.byKey(const Key('itin-day-2026-10-02')));
      await settle(tester);
      expect(find.byKey(const Key('itin-empty-day')), findsOneWidget);
      expect(find.text('Nothing planned for Fri 2'), findsOneWidget);
    });

    testApp('tapping a stop opens actions; Mark done fades it', (tester) async {
      final s = await open(tester);
      await tester.tap(find.text('Scuba at Grande Island'));
      await settle(tester);
      expect(find.byKey(const Key('itin-act-directions')), findsOneWidget);
      expect(find.byKey(const Key('itin-act-bill')), findsOneWidget);
      await tester.tap(find.byKey(const Key('itin-act-done')));
      await settle(tester);
      final items = containerOf(tester).read(tripItineraryProvider(s.tripId));
      expect(items.firstWhere((i) => i.title.startsWith('Scuba')).completed, isTrue);
    });

    testApp('Add bill opens the form titled with the stop', (tester) async {
      await open(tester);
      await tester.tap(find.text('Sunset at Cabo de Rama'));
      await settle(tester);
      await tester.tap(find.byKey(const Key('itin-act-bill')));
      await settle(tester, rounds: 12);
      expect(tester.widget<TextField>(find.byKey(const Key('title-field'))).controller!.text, 'Sunset at Cabo de Rama');
    });

    testApp('flag off keeps the older day list', (tester) async {
      await open(tester, horizon: false);
      expect(find.byKey(const Key('horizon-itinerary')), findsNothing);
      expect(find.text('All Days'), findsOneWidget);
    });
  });
}
