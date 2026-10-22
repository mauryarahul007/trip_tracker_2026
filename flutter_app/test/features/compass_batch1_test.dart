import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:trip_tracker/data/providers.dart';
import 'package:trip_tracker/domain/logic/expense_list_logic.dart';
import 'package:trip_tracker/domain/models/expense.dart';
import 'package:trip_tracker/features/expenses/application/expenses_providers.dart';

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
  group('Trip name menu has no duplicates under Compass nav', () {
    testApp('with two trips the title opens the switcher directly, not the old action sheet', (tester) async {
      await pumpApp(tester, user: asha, flagsOn: compassOn);
      final a = await seedTrip(tester);
      await real(
        tester,
        () => containerOf(tester)
            .read(tripRepositoryProvider)
            .createTrip(
              name: 'Second Trip',
              startDate: '2026-11-01',
              endDate: '2026-11-03',
              baseCurrency: 'INR',
              ownerId: 'u1',
              creatorName: 'Asha',
            ),
      );
      await goTo(tester, '/trip/${a.tripId}/ledger');
      await tester.tap(key('trip-title-actions'));
      await settle(tester, rounds: 8);
      expect(key('trip-action-share'), findsNothing);
      expect(key('trip-action-edit'), findsNothing);
      expect(find.byKey(Key('switch-to-${a.tripId}')), findsOneWidget);
    });

    testApp('with one trip the title does nothing and shows no arrow', (tester) async {
      await pumpApp(tester, user: asha, flagsOn: compassOn);
      final a = await seedTrip(tester);
      await goTo(tester, '/trip/${a.tripId}/ledger');
      await tester.tap(key('trip-title-actions'));
      await settle(tester, rounds: 8);
      expect(key('trip-action-share'), findsNothing);
      expect(find.byIcon(Icons.expand_more_rounded), findsNothing);
    });

    testApp('flag off: the old action sheet is unchanged', (tester) async {
      await pumpApp(tester, user: asha);
      final a = await seedTrip(tester);
      await goTo(tester, '/trip/${a.tripId}/ledger');
      await tester.tap(key('trip-title-actions'));
      await settle(tester, rounds: 8);
      expect(key('trip-action-share'), findsOneWidget);
    });
  });

  group('Balances: sticky settle bar', () {
    testApp('when you owe, the "You owe · Settle" bar show and open your payments', (tester) async {
      await pumpApp(tester, user: asha, flagsOn: compassOn);
      final s = await seedTrip(tester);
      await addExpense(tester, s, title: 'Hotel', amount: 900, paidBy: s.ben);
      await goTo(tester, '/trip/${s.tripId}/ledger');
      expect(key('compass-settle-bar'), findsOneWidget);
      await tester.tap(key('compass-settle-bar-action'));
      await settle(tester, rounds: 10);
      expect(key('bar-pay-0'), findsOneWidget);
    });

    testApp('when you are owed there is no settle bar', (tester) async {
      await pumpApp(tester, user: asha, flagsOn: compassOn);
      final s = await seedTrip(tester);
      await addExpense(tester, s, title: 'Dinner', amount: 900); // Asha paid
      await goTo(tester, '/trip/${s.tripId}/ledger');
      expect(key('compass-settle-bar'), findsNothing);
    });

    testApp('flag off: neither shows', (tester) async {
      await pumpApp(tester, user: asha);
      final s = await seedTrip(tester);
      await addExpense(tester, s, title: 'Hotel', amount: 900, paidBy: s.ben);
      await goTo(tester, '/trip/${s.tripId}/ledger');
      expect(key('compass-summary-strip'), findsNothing);
      expect(key('compass-settle-bar'), findsNothing);
    });
  });

  group('Spend search and filter chips', () {
    test('wide search matches category, payer and amount; the plain search is title only', () {
      Expense e(String id, String title, String cat, String paidBy, double amount) => Expense(
        id: id,
        tripId: 't',
        title: title,
        amount: amount,
        currency: 'INR',
        category: cat,
        paidBy: paidBy,
        splitMode: 'equal',
        splitMemberIds: [paidBy],
        date: '2026-10-06',
        createdAt: 0,
        updatedAt: 0,
      );
      final all = [e('1', 'Lunch', 'cat-food', 'm1', 1200), e('2', 'Taxi', 'cat-move', 'm2', 340)];
      const cats = {'cat-food': 'Food & Dining', 'cat-move': 'Transport'};
      const members = {'m1': 'Asha', 'm2': 'Ben'};
      List<String> ids(String q, {bool wide = true}) => filterExpenses(
        all,
        ExpenseFilters(query: q),
        categoryNames: wide ? cats : null,
        memberNames: wide ? members : null,
      ).map((x) => x.id).toList();
      expect(ids('food'), ['1']);
      expect(ids('ben'), ['2']);
      expect(ids('1,200'), ['1']);
      expect(ids('340'), ['2']);
      expect(ids('food', wide: false), isEmpty);
      expect(ids('taxi', wide: false), ['2']);
    });

    testApp('an active filter shows as a removable chip', (tester) async {
      await pumpApp(tester, user: asha, flagsOn: compassOn);
      final s = await seedTrip(tester);
      await addExpense(tester, s, title: 'Beach lunch');
      await goTo(tester, '/trip/${s.tripId}/expenses');
      expect(key('compass-active-filters'), findsNothing);
      containerOf(tester)
          .read(expenseFiltersProvider(s.tripId).notifier)
          .set(const ExpenseFilters(categoryId: 'cat-food'));
      await settle(tester, rounds: 6);
      expect(key('active-filter-category'), findsOneWidget);
      await tester.tap(find.byTooltip('Remove filter'));
      await settle(tester, rounds: 6);
      expect(key('compass-active-filters'), findsNothing);
    });
  });

  group('Large text (130%) and touch targets on the Compass screens', () {
    testApp('Balances, Spend, Activity and the Trip hub lay out without overflow', (tester) async {
      tester.platformDispatcher.textScaleFactorTestValue = 1.3;
      addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
      await pumpApp(tester, user: asha, flagsOn: compassOn);
      final s = await seedTrip(tester);
      await addExpense(tester, s, title: 'Hotel', amount: 900, paidBy: s.ben);
      for (final tab in ['ledger', 'expenses', 'activity', 'hub']) {
        await goTo(tester, '/trip/${s.tripId}/$tab');
        expect(tester.takeException(), isNull, reason: tab);
      }
    });

    testApp('the settle bar and the payment row buttons are at least 44px tall', (tester) async {
      await pumpApp(tester, user: asha, flagsOn: compassOn);
      final s = await seedTrip(tester);
      await addExpense(tester, s, title: 'Hotel', amount: 900, paidBy: s.ben);
      await goTo(tester, '/trip/${s.tripId}/ledger');
      expect(tester.getSize(key('compass-settle-bar-action')).height, greaterThanOrEqualTo(44));
      expect(tester.getSize(key('settle-0')).height, greaterThanOrEqualTo(44));
    });
  });
}
