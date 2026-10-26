import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:trip_tracker/data/providers.dart';
import 'package:trip_tracker/data/sync/conflict_store.dart';
import 'package:trip_tracker/data/sync/outbox_types.dart';
import 'package:trip_tracker/domain/logic/sync_merge.dart';
import 'package:trip_tracker/features/expenses/presentation/conflict_sheet.dart';

import '../../support/pump_app.dart';
import '../../support/seed.dart' show containerOf;
import 'expenses_tab_test.dart' show Seed, addExpense, openExpenses, seedTrip;

Future<void> stickExpense(WidgetTester tester, Seed s) async {
  await addExpense(tester, s, title: 'Stuck lunch');
  final store = containerOf(tester).read(outboxStoreProvider);
  final items = await real(tester, () => store.all());
  for (final i in items) {
    await real(tester, () => store.markFailed(i, 'server said no', quarantine: true));
  }
}

Future<void> expandDays(WidgetTester tester) async {
  await tester.tap(find.byKey(const Key('tab-menu')));
  await settle(tester);
  await tester.tap(find.text('Expand all days'));
  await settle(tester);
}

void main() {
  conflictSheetTests();
  testApp('a stuck expense shows Sync failed; tapping it queues a retry', (tester) async {
    await pumpApp(tester, user: asha);
    final s = await seedTrip(tester);
    await stickExpense(tester, s);
    await openExpenses(tester, s);
    await expandDays(tester);

    expect(find.byTooltip('Sync failed. Tap to retry.'), findsOneWidget);
    expect(find.byTooltip('Pending sync'), findsNothing);

    final store = containerOf(tester).read(outboxStoreProvider);
    int stuck(List<dynamic> items) => items.where((i) => i.status == OutboxStatus.poison).length;
    final before = stuck(await real(tester, () => store.all()));

    await tester.tap(find.byKey(const Key('row-sync-retry')));
    await settle(tester);
    final after = stuck(await real(tester, () => store.all()));
    expect(after, lessThan(before)); // this expense's changes were retried...
    expect(after, greaterThan(0)); // ...and unrelated stuck items were left alone
    expect(find.byTooltip('Sync failed. Tap to retry.'), findsNothing);
  });

  testApp('flag off: a stuck expense looks like any pending one', (tester) async {
    await pumpApp(tester, user: asha, flagsOff: {'enableRowSyncRetry'});
    final s = await seedTrip(tester);
    await stickExpense(tester, s);
    await openExpenses(tester, s);
    await expandDays(tester);

    expect(find.byKey(const Key('row-sync-retry')), findsNothing);
    expect(find.byTooltip('Pending sync'), findsWidgets);
  });
}

// The conflict sheet shares this file's helpers: it is the other half of "a row is out of sync".
void conflictSheetTests() {
  testApp('conflict sheet shows category names and a plain split, and says what the buttons do', (tester) async {
    await pumpApp(tester, user: asha);
    final s = await seedTrip(tester);
    final id = await addExpense(tester, s, title: 'Beach lunch');
    final c = containerOf(tester);
    final local = (await real(tester, () => c.read(expenseRepositoryProvider).watchActive(s.tripId).first)).single;
    final server = local.copyWith(category: 'cat-stay', splitMemberIds: [s.me]);
    c.read(conflictStoreProvider.notifier).setForTrip(s.tripId, [ExpenseConflict(id, local, server, 'updateExpense')]);
    await openExpenses(tester, s);

    await tester.tap(find.byKey(const Key('open-conflicts')));
    await settle(tester);
    Finder inSheet(Finder f) => find.descendant(of: find.byType(ConflictSheet), matching: f);
    expect(inSheet(find.text('Food & Dining')), findsOneWidget);
    expect(inSheet(find.text('Stay & Hotel')), findsOneWidget);
    expect(inSheet(find.text('Equal, 3 people')), findsOneWidget);
    expect(inSheet(find.text('Equal, 1 person')), findsOneWidget);
    expect(inSheet(find.textContaining('Keep mine sends your edit')), findsOneWidget);
    expect(inSheet(find.textContaining('cat-')), findsNothing);
  });
}
