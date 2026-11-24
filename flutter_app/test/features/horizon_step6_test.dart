import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:trip_tracker/app/router.dart';
import 'package:trip_tracker/data/providers.dart';
import 'package:trip_tracker/data/sync/conflict_store.dart';
import 'package:trip_tracker/domain/logic/sync_merge.dart';
import 'package:trip_tracker/features/expenses/presentation/conflict_sheet.dart';
import 'package:trip_tracker/features/expenses/presentation/quick_add_sheet.dart';
import 'package:trip_tracker/features/expenses/presentation/widgets/expense_detail_sheet.dart';
import 'package:trip_tracker/shared/widgets/app_sheet.dart';

import '../support/pump_app.dart';
import '../support/seed.dart';

void main() {
  group('Horizon step 6: states (flag enableHorizonUi)', () {
    testApp('Offline adds show a Queued pill on Spend', (tester) async {
      await pumpApp(tester, user: asha, online: false, flagsOn: {'enableHorizonUi'});
      final s = await seedTrip(tester);
      await addExpense(tester, s, amount: 90);
      containerOf(tester).read(routerProvider).go('/trip/${s.tripId}/expenses');
      await settle(tester, rounds: 14);
      expect(find.byKey(const Key('row-queued')), findsWidgets);
      expect(find.text('Queued'), findsWidgets);
    });

    testApp('Flag off keeps the Pending sync icon', (tester) async {
      await pumpApp(tester, user: asha);
      final s = await seedTrip(tester);
      await addExpense(tester, s, amount: 90);
      containerOf(tester).read(routerProvider).go('/trip/${s.tripId}/expenses');
      await settle(tester, rounds: 14);
      expect(find.byKey(const Key('row-queued')), findsNothing);
    });

    testApp('A trip this device does not have shows the cannot-find page', (tester) async {
      await pumpApp(tester, user: asha, flagsOn: {'enableHorizonUi'});
      await seedTrip(tester);
      containerOf(tester).read(routerProvider).go('/trip/no-such-trip/expenses');
      await settle(tester, rounds: 12);
      expect(find.byKey(const Key('trip-missing')), findsOneWidget);
      expect(find.text("We can't find this trip"), findsOneWidget);
      expect(find.byKey(const Key('trip-missing-join')), findsOneWidget);
      await tester.tap(find.byKey(const Key('trip-missing-home')));
      await settle(tester, rounds: 6);
      expect(find.byKey(const Key('trip-missing')), findsNothing);
    });
  });

  group('Horizon step 6: sheets (flag enableHorizonUi)', () {
    Future<void> open(WidgetTester tester, Widget sheet) async {
      unawaited(AppSheet.show<void>(context: tester.element(find.byType(Scaffold).first), builder: (_) => sheet));
      await settle(tester, rounds: 6);
    }

    Future<(Seed, String)> setup(WidgetTester tester, {bool horizon = true}) async {
      await pumpApp(tester, user: asha, flagsOn: {if (horizon) 'enableHorizonUi'});
      final s = await seedTrip(tester);
      final id = await addExpense(tester, s, title: 'Scuba', amount: 90);
      containerOf(tester).read(routerProvider).go('/trip/${s.tripId}/expenses');
      await settle(tester, rounds: 12);
      return (s, id);
    }

    testApp('Expense detail shows what it means for me', (tester) async {
      final (s, id) = await setup(tester);
      await open(tester, ExpenseDetailSheet(tripId: s.tripId, expenseId: id, onEdit: () {}, onDelete: () {}));
      expect(find.text('You lent ₹60.00 ↓'), findsOneWidget);
    });

    testApp('Sync conflict names the expense; Quick add names the trip', (tester) async {
      final (s, id) = await setup(tester);
      final c = containerOf(tester);
      final e = (await real(tester, () => c.read(expenseRepositoryProvider).watchActive(s.tripId).first)).first;
      c.read(conflictStoreProvider.notifier).setForTrip(s.tripId, [
        ExpenseConflict(id, e, e.copyWith(amount: 120), 'updateExpense'),
      ]);
      await open(tester, ConflictSheet(tripId: s.tripId));
      expect(find.text('Two versions of "Scuba"'), findsOneWidget);
      Navigator.of(tester.element(find.byType(ConflictSheet))).pop();
      await settle(tester);
      await open(tester, QuickAddSheet(tripId: s.tripId));
      expect(find.textContaining('Add to '), findsOneWidget);
    });

    testApp('Flag off keeps the old sheet copy', (tester) async {
      final (s, id) = await setup(tester, horizon: false);
      await open(tester, ExpenseDetailSheet(tripId: s.tripId, expenseId: id, onEdit: () {}, onDelete: () {}));
      expect(find.byKey(const Key('detail-share-chip')), findsNothing);
    });
  });
}
