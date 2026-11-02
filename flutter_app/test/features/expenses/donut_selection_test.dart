import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:trip_tracker/features/expenses/application/expenses_providers.dart';

import '../../support/pump_app.dart';
import '../../support/seed.dart';

Finder key(String k) => find.byKey(Key(k));

/// "Total spent" also heads a summary tile above the donut, so look inside the donut only.
Finder get donutTotal => find.descendant(of: key('spend-donut'), matching: find.text('Total spent'));

Future<void> goTo(WidgetTester tester, String path) async {
  await settle(tester);
  GoRouter.of(tester.element(find.byType(Scaffold).first)).go(path);
  await settle(tester, rounds: 14);
}

void main() {
  Future<Seed> openCategories(WidgetTester tester, {Set<String> flagsOff = const {}}) async {
    await pumpApp(tester, user: asha, flagsOff: flagsOff);
    final s = await seedTrip(tester);
    await addExpense(tester, s, title: 'Lunch', amount: 90);
    await addExpense(tester, s, title: 'Bus', amount: 30, category: 'cat-transport');
    await goTo(tester, '/trip/${s.tripId}/ledger');
    await tester.scrollUntilVisible(
      key('spend-donut'),
      300,
      scrollable: find.descendant(of: key('ledger-list'), matching: find.byType(Scrollable)),
    );
    await centre(tester, key('spend-donut'));
    return s;
  }

  testApp('tapping a category badge highlights it, shows its amount, and Clear selection resets it', (tester) async {
    await openCategories(tester);
    expect(key('donut-clear-selection'), findsNothing);
    expect(donutTotal, findsOneWidget);

    await tester.tap(key('donut-badge-cat-food'));
    await settle(tester, rounds: 4);
    expect(donutTotal, findsNothing); // the middle now names the category instead
    expect(key('donut-clear-selection'), findsOneWidget);
    expect(key('donut-see-expenses'), findsOneWidget);

    await centre(tester, key('donut-clear-selection'));
    await tester.tap(key('donut-clear-selection'));
    await settle(tester, rounds: 4);
    expect(key('donut-clear-selection'), findsNothing);
    expect(key('donut-see-expenses'), findsNothing);
    expect(donutTotal, findsOneWidget);
  });

  testApp('See expenses opens Spend filtered to the selected category', (tester) async {
    final s = await openCategories(tester);
    await tester.tap(key('donut-badge-cat-transport'));
    await settle(tester, rounds: 4);
    await centre(tester, key('donut-see-expenses'));
    await tester.tap(key('donut-see-expenses'));
    await settle(tester, rounds: 12);
    expect(containerOf(tester).read(expenseFiltersProvider(s.tripId)).categoryId, 'cat-transport');
  });

  testApp('with its flag off the badges and donut are display only', (tester) async {
    await openCategories(tester, flagsOff: {'enableInteractiveCharts'});
    await tester.tap(key('donut-badge-cat-food'));
    await settle(tester, rounds: 4);
    expect(key('donut-clear-selection'), findsNothing);
    expect(key('donut-see-expenses'), findsNothing);
    expect(donutTotal, findsOneWidget);
  });
}
