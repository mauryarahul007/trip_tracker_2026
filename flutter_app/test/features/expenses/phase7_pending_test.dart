import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:trip_tracker/core/clock.dart';
import 'package:trip_tracker/data/local/app_database.dart';
import 'package:trip_tracker/data/local/entity_codec.dart';
import 'package:trip_tracker/data/providers.dart';
import 'package:trip_tracker/data/sync/conflict_store.dart';
import 'package:trip_tracker/domain/logic/sync_merge.dart';
import 'package:trip_tracker/domain/models/expense.dart';

import '../../support/pump_app.dart';
import '../../support/seed.dart';

Finder key(String k) => find.byKey(Key(k));

Future<void> openLedger(WidgetTester tester, Seed s) async {
  await settle(tester);
  GoRouter.of(tester.element(find.byType(Scaffold).first)).go('/trip/${s.tripId}/ledger');
  await settle(tester, rounds: 14);
}

Future<void> openExpenses(WidgetTester tester, Seed s) async {
  await settle(tester);
  GoRouter.of(tester.element(find.byType(Scaffold).first)).go('/trip/${s.tripId}/expenses');
  await settle(tester, rounds: 14);
}

void main() {
  testApp('ledger shows golden balance strings and the sticky bar', (tester) async {
    await pumpApp(tester, user: asha);
    final s = await seedTrip(tester);
    await addExpense(tester, s, amount: 90);
    await openLedger(tester, s);
    // Top of the page first: the hero boarding pass and the payment tickets.
    expect(find.descendant(of: key('sticky-balance'), matching: find.text('YOU ARE OWED')), findsOneWidget);
    expect(find.text('Ben pays Asha'), findsOneWidget);
    // Then the per-person list under Trip numbers (open by default, below the fold; the list builds lazily).
    await tester.scrollUntilVisible(
      key('balance-${s.cara}'),
      300,
      scrollable: find.descendant(of: key('ledger-list'), matching: find.byType(Scrollable)),
    );
    expect(find.descendant(of: key('balance-${s.me}'), matching: find.text('is owed ₹60.00')), findsOneWidget);
    expect(find.descendant(of: key('balance-${s.ben}'), matching: find.text('owes ₹30.00')), findsOneWidget);
    expect(find.descendant(of: key('balance-${s.cara}'), matching: find.text('owes ₹30.00')), findsOneWidget);
  });

  testApp('settle sheet shares a card and copies an unopened UPI id', (tester) async {
    final app = await pumpApp(tester, user: asha);
    final s = await seedTrip(tester);
    await addExpense(tester, s, amount: 60, split: [s.me, s.ben]);
    await openLedger(tester, s);
    await tester.tap(key('settle-0'));
    await settle(tester, rounds: 6);
    expect(key('settle-upi'), findsOneWidget);
    expect(key('settle-share'), findsOneWidget);
    await tester.enterText(key('settle-upi'), 'not-a-upi');
    await tester.tap(key('settle-upi-pay'));
    await settle(tester, rounds: 4);
    expect(find.text('Enter a UPI id like name@bank.'), findsOneWidget);
    await tester.enterText(key('settle-upi'), 'asha@oksbi');
    await tester.tap(key('settle-upi-pay'));
    await settle(tester, rounds: 4);
    expect(find.text('No UPI app opened. The id is copied.'), findsOneWidget);
    await tester.tap(key('settle-share'));
    await settle(tester, rounds: 6);
    expect(app.shareService.pngs, isNotEmpty);
    expect(app.shareService.shared.single, contains('Ben'));
  });

  testApp('keep theirs replaces the local expense and clears the conflict', (tester) async {
    await pumpApp(tester, user: asha);
    final s = await seedTrip(tester);
    final id = await addExpense(tester, s, title: 'Beach lunch', amount: 90);
    final c = containerOf(tester);
    final local = (await real(tester, () => c.read(expenseRepositoryProvider).watchActive(s.tripId).first)).single;
    final server = local.copyWith(amount: 40, updatedAt: local.updatedAt + 1);
    c.read(conflictStoreProvider.notifier).setForTrip(s.tripId, [ExpenseConflict(id, local, server, 'updateExpense')]);
    await openLedger(tester, s);
    await tester.tap(key('open-conflicts'));
    await settle(tester, rounds: 4);
    await tester.tap(key('conflict-theirs-$id'));
    await settle(tester, rounds: 8);
    final after = (await real(tester, () => c.read(expenseRepositoryProvider).watchActive(s.tripId).first)).single;
    expect(after.amount, 40);
    expect(c.read(conflictStoreProvider)[s.tripId] ?? const <ExpenseConflict>[], isEmpty);
  });

  testApp('close out locks the trip after the end date', (tester) async {
    await pumpApp(tester, user: asha, overrides: [nowProvider.overrideWithValue(() => DateTime(2026, 10, 20))]);
    final s = await seedTrip(tester);
    await openExpenses(tester, s);
    await tester.tap(key('chip-closeout'));
    await settle(tester, rounds: 4);
    expect(key('closeout-title'), findsOneWidget);
    await tester.tap(key('closeout-lock'));
    await settle(tester, rounds: 8);
    final trip = await real(tester, () => containerOf(tester).read(tripRepositoryProvider).watchTrip(s.tripId).first);
    expect(trip!.closed, isTrue);
  });

  testApp('quick add, a custom category, and csv export', (tester) async {
    final app = await pumpApp(tester, user: asha);
    final s = await seedTrip(tester);
    await openExpenses(tester, s);
    await tester.tap(key('tab-menu'));
    await settle(tester);
    await tester.tap(find.text('Quick add'));
    await settle(tester, rounds: 4);
    await tester.enterText(key('quick-add-text'), 'lunch 240');
    await settle(tester, rounds: 2);
    expect(key('quick-add-preview'), findsOneWidget);
    await tester.tap(key('quick-add-save'));
    await settle(tester, rounds: 10);
    final titles = (await real(
      tester,
      () => containerOf(tester).read(expenseRepositoryProvider).watchActive(s.tripId).first,
    )).map((e) => e.title);
    expect(titles, contains('Lunch'));

    await tester.tap(key('tab-menu'));
    await settle(tester);
    await tester.tap(find.text('Categories'));
    await settle(tester, rounds: 8);
    await tester.tap(key('cat-add'));
    await settle(tester, rounds: 4);
    await tester.enterText(key('cat-name'), 'Snacks');
    await tester.tap(find.text('Save'));
    await settle(tester, rounds: 8);
    expect(find.text('Snacks'), findsOneWidget);

    GoRouter.of(tester.element(find.byType(Scaffold).first)).go('/trip/${s.tripId}/expenses');
    await settle(tester, rounds: 10);
    await tester.tap(key('tab-menu'));
    await settle(tester);
    await tester.tap(find.text('Export and import'));
    await settle(tester, rounds: 4);
    await tester.tap(key('export-csv'));
    await settle(tester, rounds: 6);
    expect(app.shareService.shared.single, contains('TRIP TRACKER — LEDGER EXPORT'));
    expect(key('import-splitwise'), findsNothing);
  });

  testApp('sticky day header pins only when the flag is on', (tester) async {
    await pumpApp(tester, user: asha, flagsOn: {'enableStickyDayHeaders'});
    final s = await seedTrip(tester);
    await addExpense(tester, s, title: 'Beach lunch');
    await openExpenses(tester, s);
    expect(tester.widget<SliverPersistentHeader>(find.byType(SliverPersistentHeader)).pinned, isFalse);
    await tester.tap(key('day-2026-10-06'));
    await settle(tester, rounds: 4);
    expect(tester.widget<SliverPersistentHeader>(find.byType(SliverPersistentHeader)).pinned, isTrue);
    expect(find.text('Beach lunch'), findsOneWidget);
  });

  testApp('cross-trip search lists a match on another trip', (tester) async {
    await pumpApp(tester, user: asha, flagsOn: {'enableCrossTripSearch'});
    final s = await seedTrip(tester);
    await addExpense(tester, s, title: 'Beach lunch');
    final c = containerOf(tester);
    final other = await real(
      tester,
      () => c
          .read(tripRepositoryProvider)
          .createTrip(
            name: 'Kerala',
            startDate: '2026-11-01',
            endDate: '2026-11-05',
            baseCurrency: 'INR',
            ownerId: 'u1',
            creatorName: 'Asha',
          ),
    );
    await real(tester, () async {
      final db = c.read(appDatabaseProvider);
      await db
          .into(db.expensesTable)
          .insert(
            expenseToCompanion(
              Expense(
                id: 'other-dinner',
                tripId: other,
                title: 'Beach dinner',
                amount: 80,
                currency: 'INR',
                category: 'cat-food',
                date: '2026-11-02',
                paidBy: s.me,
                splitMode: 'equal',
                createdAt: 1,
                updatedAt: 1,
              ),
            ),
          );
    });
    await openExpenses(tester, s);
    await tester.enterText(find.byType(TextField).first, 'beach');
    await tester.pump(const Duration(milliseconds: 300));
    await settle(tester, rounds: 8);
    expect(key('other-trips'), findsOneWidget);
    expect(find.text('Beach dinner'), findsOneWidget);
  });

  testApp('five hundred expenses still offer load more', (tester) async {
    await pumpApp(tester, user: asha);
    final s = await seedTrip(tester);
    final c = containerOf(tester);
    await real(tester, () async {
      final db = c.read(appDatabaseProvider);
      await db.batch((b) {
        for (var i = 0; i < 500; i++) {
          b.insert(
            db.expensesTable,
            expenseToCompanion(
              Expense(
                id: 'bulk-$i',
                tripId: s.tripId,
                title: 'Row $i',
                amount: 10,
                currency: 'INR',
                category: 'cat-food',
                date: '2026-10-0${(i % 9) + 1}',
                paidBy: s.me,
                splitMode: 'equal',
                splitMemberIds: [s.me, s.ben],
                createdAt: i,
                updatedAt: i,
              ),
            ),
          );
        }
      });
    });
    await openExpenses(tester, s);
    expect(find.text('Load more'), findsOneWidget);
    expect(find.text('Row 499'), findsNothing);
  });

  testApp('ledger at 200% text scale still shows who pays whom', (tester) async {
    tester.platformDispatcher.textScaleFactorTestValue = 2;
    addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
    await pumpApp(tester, user: asha);
    final s = await seedTrip(tester);
    await addExpense(tester, s, amount: 60, split: [s.me, s.ben]);
    await openLedger(tester, s);
    // At 200% the hero ticket fills the screen, so the first payment is below the fold: scroll to it.
    await tester.scrollUntilVisible(
      find.text('Ben pays Asha'),
      200,
      scrollable: find.descendant(of: find.byKey(const Key('ledger-list')), matching: find.byType(Scrollable)),
    );
    expect(find.text('Ben pays Asha'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
