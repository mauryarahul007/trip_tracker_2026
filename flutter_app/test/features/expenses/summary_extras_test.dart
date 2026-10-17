import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:trip_tracker/domain/models/expense.dart';

import '../../support/pump_app.dart';
import '../../support/seed.dart';

Finder key(String k) => find.byKey(Key(k));

Future<void> openLedger(WidgetTester tester, Seed s) async {
  await settle(tester);
  GoRouter.of(tester.element(find.byType(Scaffold).first)).go('/trip/${s.tripId}/ledger');
  await settle(tester, rounds: 14);
}

Future<void> reveal(WidgetTester tester, String k) async {
  await tester.scrollUntilVisible(
    key(k),
    300,
    scrollable: find.descendant(of: key('ledger-list'), matching: find.byType(Scrollable)),
  );
  await tester.ensureVisible(key(k));
  await tester.drag(
    find.descendant(of: key('ledger-list'), matching: find.byType(Scrollable)).first,
    const Offset(0, -150),
  );
  await tester.pump();
}

void main() {
  testApp('settle all records every payment I owe after one confirmation', (tester) async {
    await pumpApp(tester, user: asha);
    final s = await seedTrip(tester);
    await addExpense(tester, s, amount: 60, paidBy: s.ben, split: [s.me, s.ben]); // Asha owes Ben 30
    await addExpense(tester, s, amount: 60, paidBy: s.cara, split: [s.me, s.cara]); // Asha owes Cara 30
    await openLedger(tester, s);
    expect(key('settle-all'), findsOneWidget);
    await tester.tap(key('settle-all'));
    await settle(tester, rounds: 6);
    await tester.tap(find.text('Mark as paid'));
    await settle(tester, rounds: 16);
    final list = (await expensesOf(tester, s)).cast<Expense>().where((e) => e.isSettlement).toList();
    expect(list.map((e) => e.amount), unorderedEquals([30, 30]));
    expect(key('settle-all'), findsNothing);
    expect(key('all-settled'), findsOneWidget);
  });

  testApp('settle all is hidden with one payment, and when the flag is off', (tester) async {
    await pumpApp(tester, user: asha);
    final s = await seedTrip(tester);
    await addExpense(tester, s, amount: 60, paidBy: s.ben, split: [s.me, s.ben]);
    await openLedger(tester, s);
    expect(key('settle-all'), findsNothing);
  });

  testApp('flag off: settle all, budget, day-by-day and share summary are gone', (tester) async {
    await pumpApp(
      tester,
      user: asha,
      flagsOff: {'enableSettleAll', 'enableTripBudget', 'enableDailyTimeline', 'enableShareSummaryImage'},
    );
    final s = await seedTrip(tester);
    await addExpense(tester, s, amount: 60, paidBy: s.ben, split: [s.me, s.ben]);
    await addExpense(tester, s, amount: 60, paidBy: s.cara, split: [s.me, s.cara]);
    await openLedger(tester, s);
    expect(key('settle-all'), findsNothing);
    await reveal(tester, 'open-insights');
    expect(key('budget-card'), findsNothing);
    expect(key('day-timeline'), findsNothing);
    expect(key('share-summary'), findsNothing);
  });

  testApp('budget: set it, see what is left; the day-by-day list shows the spend', (tester) async {
    final app = await pumpApp(tester, user: asha);
    final s = await seedTrip(tester);
    await addExpense(tester, s, amount: 90);
    await openLedger(tester, s);
    await reveal(tester, 'budget-card');
    expect(find.text('Set a trip budget'), findsOneWidget);
    await tester.tap(key('budget-card'));
    await settle(tester, rounds: 4);
    await tester.enterText(key('ask-field'), '100');
    await tester.tap(key('ask-ok'));
    await settle(tester, rounds: 6);
    expect(key('budget-bar'), findsOneWidget);
    expect(tester.widget<Text>(key('budget-status')).data, contains('left'));
    expect(app.prefs.getDouble('trip.budget.${s.tripId}'), 100);

    await tester.tap(key('budget-card'));
    await settle(tester, rounds: 4);
    await tester.enterText(key('ask-field'), '50');
    await tester.tap(key('ask-ok'));
    await settle(tester, rounds: 6);
    expect(tester.widget<Text>(key('budget-status')).data, contains('over budget'));

    await reveal(tester, 'day-timeline');
    expect(key('day-timeline'), findsOneWidget);
  });

  testApp('share summary makes a png and shares it', (tester) async {
    final app = await pumpApp(tester, user: asha);
    final s = await seedTrip(tester);
    await addExpense(tester, s, amount: 90);
    await openLedger(tester, s);
    await reveal(tester, 'share-summary');
    await tester.tap(key('share-summary'));
    await tester.runAsync(() => Future<void>.delayed(const Duration(milliseconds: 500)));
    await settle(tester, rounds: 6);
    expect(app.shareService.pngs.single, endsWith('_summary.png'));
  });
}
