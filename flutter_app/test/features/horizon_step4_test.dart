import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:trip_tracker/app/router.dart';
import 'package:trip_tracker/data/providers.dart';

import '../support/pump_app.dart';
import '../support/seed.dart';

void main() {
  group('Horizon step 4: People and Categories (flag enableHorizonUi)', () {
    Future<Seed> open(WidgetTester tester, String page, {bool horizon = true}) async {
      await pumpApp(tester, user: asha, flagsOn: {if (horizon) 'enableHorizonUi'});
      final s = await seedTrip(tester);
      await addExpense(tester, s, amount: 90);
      if (page == 'categories') {
        await real(tester, () => containerOf(tester).read(categoryRepositoryProvider).add(s.tripId, 'Surf lessons'));
      }
      containerOf(tester).read(routerProvider).go('/trip/${s.tripId}/$page');
      await settle(tester, rounds: 12);
      return s;
    }

    testApp('People: Members/Groups segment, You, paid and net, Add a person row', (tester) async {
      final s = await open(tester, 'members');
      expect(find.text('Members · 3'), findsOneWidget);
      expect(find.text('You'), findsOneWidget);
      expect(find.textContaining('paid ₹90.00'), findsOneWidget);
      expect(tester.widget<Text>(find.byKey(Key('member-balance-${s.me}'))).data, '+₹60.00');
      expect(find.byKey(const Key('member-add')), findsOneWidget);
      await tester.tap(find.byKey(const Key('people-groups')));
      await settle(tester);
      expect(find.byKey(const Key('member-group-add')), findsOneWidget);
    });

    testApp('People flag off keeps the Add person / Invite buttons on top', (tester) async {
      await open(tester, 'members', horizon: false);
      expect(find.byKey(const Key('people-segment')), findsNothing);
      expect(find.text('Add person'), findsOneWidget);
    });

    testApp('Categories: + in the bar, counts, and a Your own section', (tester) async {
      await open(tester, 'categories');
      expect(find.byKey(const Key('cat-add')), findsOneWidget);
      expect(find.text('1 expense'), findsOneWidget);
      expect(find.text('YOUR OWN'), findsOneWidget);
      expect(find.text('Surf lessons'), findsOneWidget);
    });
  });
}
