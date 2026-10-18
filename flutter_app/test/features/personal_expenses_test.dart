import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:trip_tracker/data/mappers/row_mappers.dart';
import 'package:trip_tracker/data/providers.dart';
import 'package:trip_tracker/domain/logic/expense_list_logic.dart';
import 'package:trip_tracker/domain/logic/spend_insights.dart';
import 'package:trip_tracker/domain/models/expense.dart';
import 'package:trip_tracker/features/expenses/application/expenses_providers.dart';

import '../support/model_builders.dart';
import '../support/pump_app.dart';
import '../support/seed.dart';

Finder key(String k) => find.byKey(Key(k));

Future<void> goTo(WidgetTester tester, String path) async {
  await settle(tester);
  GoRouter.of(tester.element(find.byType(Scaffold).first)).go(path);
  await settle(tester, rounds: 14);
}

Future<List<Expense>> stored(WidgetTester tester, Seed s) =>
    real(tester, () => containerOf(tester).read(expenseRepositoryProvider).watchActive(s.tripId).first);

void main() {
  group('the mark on an expense', () {
    test('survives JSON and the server row (it rides in itemized_config)', () {
      final e = expenseOf('e1', 't1', 'Gift').copyWith(excludeFromTotals: true);
      expect(Expense.fromJson(e.toJson()).excludeFromTotals, isTrue);
      expect(Expense.fromJson(expenseOf('e2', 't1', 'Lunch').toJson()).excludeFromTotals, isFalse);

      final args = expenseToUpsertArgs(e);
      expect(args['p_itemized_config'], {'excludeFromTotals': true});
      final back = expenseFromRow({
        'id': 'e1',
        'trip_id': 't1',
        'title': 'Gift',
        'amount': 100,
        'itemized_config': args['p_itemized_config'],
      });
      expect(back.excludeFromTotals, isTrue);
      expect(back.itemizedConfig, isNull); // not a receipt breakdown
      expect(expenseToUpsertArgs(expenseOf('e3', 't1', 'Plain'))['p_itemized_config'], isNull);
    });

    test('left out of totals, categories, days, spend per person and filters can find it', () {
      final shared = expenseOf('a', 't1', 'Dinner');
      final mine = expenseOf('b', 't1', 'Gift').copyWith(excludeFromTotals: true);
      final totals = computeTotals([shared, mine], visibleMemberCount: 2, categories: const []);
      expect(totals.totalSpent, 100);
      expect(totals.averageCost, 50);
      expect(spendByDay([shared, mine]).single.total, 100);
      expect(spendByCategory([shared, mine]).single.total, 100);
      expect(filterExpenses([shared, mine], const ExpenseFilters(onlyPersonal: true)), [mine]);
      expect(const ExpenseFilters(onlyPersonal: true).hasActive, isTrue);
    });

    test('saved filters keep what they filter on, but not dates', () {
      const f = ExpenseFilters(categoryId: 'cat-food', query: 'lunch', dateFrom: '2026-01-01', onlyPersonal: true);
      final back = SavedFilter.fromJson(const SavedFilter('Food', f).toJson()).filters;
      expect(back.categoryId, 'cat-food');
      expect(back.query, 'lunch');
      expect(back.onlyPersonal, isTrue);
      expect(back.dateFrom, isEmpty);
    });
  });

  group('personal expense form', () {
    testApp('Just for me: no split section, saved as paid and split by one person, out of the balances', (
      tester,
    ) async {
      await pumpApp(tester, user: asha);
      final s = await seedTrip(tester);
      await addExpense(tester, s, amount: 90, title: 'Dinner');
      await openForm(tester, s);
      await tester.enterText(key('amount-field'), '500');
      await tester.enterText(key('title-field'), 'My massage');
      await settle(tester, rounds: 2);
      expect(key('preset-everyone'), findsOneWidget);
      await tester.ensureVisible(key('personal-switch'));
      await tester.tap(key('personal-switch'));
      await settle(tester, rounds: 4);
      expect(key('preset-everyone'), findsNothing); // the split is hidden
      await tester.ensureVisible(key('save'));
      await tester.tap(key('save'));
      await settle(tester, rounds: 14);
      final mine = (await stored(tester, s)).singleWhere((e) => e.title == 'My massage');
      expect(mine.excludeFromTotals, isTrue);
      expect(mine.splitMemberIds, [s.me]);
      expect(mine.paidBy, s.me);
      final settle0 = containerOf(tester).read(tripSettlementProvider(s.tripId))!;
      expect(settle0.transfers.fold<double>(0, (a, t) => a + t.amount), 60); // only the 90 dinner is shared
    });

    testApp('flag off: no switch', (tester) async {
      await pumpApp(tester, user: asha, flagsOff: {'enableExpenseExclusion'});
      final s = await seedTrip(tester);
      await openForm(tester, s);
      expect(key('personal-switch'), findsNothing);
    });
  });

  group('counting an expense in or out later', () {
    testApp('the detail sheet switch takes a shared expense out of the settlement and back', (tester) async {
      await pumpApp(tester, user: asha);
      final s = await seedTrip(tester);
      final id = await addExpense(tester, s, amount: 90, title: 'Dinner');
      double owed() =>
          containerOf(tester).read(tripSettlementProvider(s.tripId))!.transfers.fold<double>(0, (a, t) => a + t.amount);
      await goTo(tester, '/trip/${s.tripId}/expenses');
      expect(owed(), 60);
      await tester.tap(find.byKey(const Key('tab-menu')));
      await settle(tester);
      await tester.tap(find.text('Expand all days'));
      await settle(tester);
      await tester.tap(find.text('Dinner'));
      await settle(tester, rounds: 8);
      await tester.ensureVisible(key('detail-count-switch'));
      await tester.tap(key('detail-count-switch'));
      await settle(tester, rounds: 8);
      expect((await stored(tester, s)).singleWhere((e) => e.id == id).excludeFromTotals, isTrue);
      expect(owed(), 0);
      await tester.tap(key('detail-count-switch'));
      await settle(tester, rounds: 8);
      expect(owed(), 60);
    });

    testApp('swipe right marks it personal with an undo', (tester) async {
      await pumpApp(tester, user: asha);
      final s = await seedTrip(tester);
      await addExpense(tester, s, title: 'Beach lunch');
      await goTo(tester, '/trip/${s.tripId}/expenses');
      await tester.tap(find.byKey(const Key('tab-menu')));
      await settle(tester);
      await tester.tap(find.text('Expand all days'));
      await settle(tester);
      await tester.drag(find.text('Beach lunch'), const Offset(600, 0));
      await settle(tester, rounds: 10);
      expect((await stored(tester, s)).single.excludeFromTotals, isTrue);
      await tester.tap(find.text('UNDO'));
      await settle(tester, rounds: 8);
      expect((await stored(tester, s)).single.excludeFromTotals, isFalse);
    });

    testApp('the Personal chip shows only left-out expenses', (tester) async {
      await pumpApp(tester, user: asha);
      final s = await seedTrip(tester);
      await addExpense(tester, s, title: 'Beach lunch');
      final id = await addExpense(tester, s, title: 'My gift');
      final e = (await stored(tester, s)).singleWhere((x) => x.id == id);
      await real(
        tester,
        () => containerOf(tester).read(expenseRepositoryProvider).update(e.copyWith(excludeFromTotals: true)),
      );
      await goTo(tester, '/trip/${s.tripId}/expenses');
      await tester.tap(find.byKey(const Key('tab-menu')));
      await settle(tester);
      await tester.tap(find.text('Expand all days'));
      await settle(tester);
      await tester.tap(key('chip-personal'));
      await settle(tester, rounds: 6);
      expect(find.text('My gift'), findsOneWidget);
      expect(find.text('Beach lunch'), findsNothing);
    });
  });

  group('saved filters', () {
    testApp('save the active filter under a name, tap it later, hold to remove', (tester) async {
      await pumpApp(tester, user: asha);
      final s = await seedTrip(tester);
      await addExpense(tester, s, title: 'Beach lunch');
      await addExpense(tester, s, title: 'Taxi', category: 'cat-transport');
      await goTo(tester, '/trip/${s.tripId}/expenses');
      await tester.tap(find.byKey(const Key('tab-menu')));
      await settle(tester);
      await tester.tap(find.text('Expand all days'));
      await settle(tester);
      expect(key('save-filter'), findsNothing); // nothing to save yet
      await tester.tap(key('chip-personal'));
      await settle(tester, rounds: 4);
      await tester.tap(key('save-filter'));
      await settle(tester, rounds: 6);
      await tester.enterText(key('ask-field'), 'Mine');
      await tester.tap(key('ask-ok'));
      await settle(tester, rounds: 6);
      expect(key('saved-filter-Mine'), findsOneWidget);
      await tester.tap(key('clear-filters'));
      await settle(tester, rounds: 4);
      expect(find.text('Beach lunch'), findsOneWidget);
      await tester.tap(key('saved-filter-Mine'));
      await settle(tester, rounds: 6);
      expect(find.text('Beach lunch'), findsNothing); // the personal filter is back on
      await tester.longPress(key('saved-filter-Mine'));
      await settle(tester, rounds: 4);
      expect(key('saved-filter-Mine'), findsNothing);
    });

    testApp('flag off: no save chip', (tester) async {
      await pumpApp(tester, user: asha, flagsOff: {'enableSavedFilters'});
      final s = await seedTrip(tester);
      await addExpense(tester, s);
      await goTo(tester, '/trip/${s.tripId}/expenses');
      await tester.tap(key('chip-personal'));
      await settle(tester, rounds: 4);
      expect(key('save-filter'), findsNothing);
    });
  });

  group('undo a recorded payment', () {
    Future<void> payBen(WidgetTester tester, Seed s) async {
      await goTo(tester, '/trip/${s.tripId}/ledger');
      final list = find.descendant(of: key('ledger-list'), matching: find.byType(Scrollable));
      await tester.scrollUntilVisible(key('settle-0'), 300, scrollable: list);
      await centre(tester, key('settle-0'));
      await tester.tap(key('settle-0'));
      await settle(tester, rounds: 6);
      await tester.tap(key('settle-confirm'));
      await settle(tester, rounds: 3);
    }

    testApp('UNDO takes the payment back to the recycle bin', (tester) async {
      await pumpApp(tester, user: asha);
      final s = await seedTrip(tester);
      await addExpense(tester, s, amount: 90);
      await payBen(tester, s);
      expect((await stored(tester, s)).where((e) => e.isSettlement), hasLength(1));
      await tester.tap(find.text('UNDO'));
      await settle(tester, rounds: 10);
      expect((await stored(tester, s)).where((e) => e.isSettlement), isEmpty);
    });

    testApp('flag off: the confirmation has no UNDO', (tester) async {
      await pumpApp(tester, user: asha, flagsOff: {'enableUndoSettlement'});
      final s = await seedTrip(tester);
      await addExpense(tester, s, amount: 90);
      await payBen(tester, s);
      expect(find.text('UNDO'), findsNothing);
    });
  });
}
