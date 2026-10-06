import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:trip_tracker/data/providers.dart';
import 'package:trip_tracker/data/sync/outbox_types.dart';
import 'package:trip_tracker/domain/models/expense.dart';
import 'package:trip_tracker/shared/widgets/app_button.dart';

import '../../support/pump_app.dart';
import '../../support/seed.dart';

Finder key(String k) => find.byKey(Key(k));

Future<void> openLedger(WidgetTester tester, Seed s) async {
  await settle(tester);
  GoRouter.of(tester.element(find.byType(Scaffold).first)).go('/trip/${s.tripId}/ledger');
  await settle(tester, rounds: 14);
}

String text(WidgetTester t, String k) {
  final w = t.widget(key(k));
  return w is Text ? w.data! : t.widget<Text>(find.descendant(of: key(k), matching: find.byType(Text)).last).data!;
}

void main() {
  testApp('balances and who-pays-whom for an unequal split', (tester) async {
    await pumpApp(tester, user: asha);
    final s = await seedTrip(tester);
    await addExpense(tester, s, amount: 90); // Asha paid, 3-way equal: Ben & Cara owe 30 each
    await openLedger(tester, s);
    expect(text(tester, 'balance-${s.me}'), 'is owed ₹60.00');
    expect(text(tester, 'balance-${s.ben}'), 'owes ₹30.00');
    expect(find.text('Ben pays Asha'), findsOneWidget);
    expect(find.text('Cara pays Asha'), findsOneWidget);
  });

  testApp('nothing owed shows the settled state', (tester) async {
    await pumpApp(tester, user: asha);
    final s = await seedTrip(tester);
    await openLedger(tester, s);
    expect(key('all-settled'), findsOneWidget);
  });

  testApp('settle up records a settlement expense, queued, and clears that debt', (tester) async {
    await pumpApp(tester, user: asha);
    final s = await seedTrip(tester);
    await addExpense(tester, s, amount: 90);
    await openLedger(tester, s);
    await tester.tap(
      find.descendant(of: find.widgetWithText(ListTile, 'Ben pays Asha'), matching: find.byType(AppButton)),
    );
    await settle(tester, rounds: 6);
    expect(find.text('Confirm settlement'), findsOneWidget);
    await tester.tap(key('settle-confirm'));
    await settle(tester, rounds: 14);
    final list = (await expensesOf(tester, s)).cast<Expense>();
    final st = list.singleWhere((e) => e.isSettlement);
    expect(st.title, 'Settlement: Ben ➔ Asha');
    expect(st.amount, 30);
    expect(st.paidBy, s.ben);
    final q = await real(tester, () => containerOf(tester).read(outboxStoreProvider).all());
    expect(q.where((x) => x.type == OutboxType.addExpense), hasLength(2));
    expect(find.text('Ben pays Asha'), findsNothing);
    expect(find.text('Cara pays Asha'), findsOneWidget);
  });

  testApp('partial amount: partial wording, remaining shown, rest stays owed', (tester) async {
    await pumpApp(tester, user: asha);
    final s = await seedTrip(tester);
    await addExpense(tester, s, amount: 60, split: [s.me, s.ben]);
    await openLedger(tester, s);
    await tester.tap(key('settle-0'));
    await settle(tester, rounds: 6);
    await tester.enterText(key('settle-amount'), '10');
    await settle(tester, rounds: 2);
    expect(find.text('Confirm partial settlement'), findsOneWidget);
    expect(text(tester, 'settle-remaining'), 'Remaining ₹20.00');
    await tester.tap(key('settle-confirm'));
    await settle(tester, rounds: 14);
    expect(find.descendant(of: key('transfer-0'), matching: find.text('₹20.00')), findsOneWidget);
  });

  testApp('zero amount is refused', (tester) async {
    await pumpApp(tester, user: asha);
    final s = await seedTrip(tester);
    await addExpense(tester, s, amount: 60, split: [s.me, s.ben]);
    await openLedger(tester, s);
    await tester.tap(key('settle-0'));
    await settle(tester, rounds: 6);
    await tester.enterText(key('settle-amount'), '0');
    await tester.tap(key('settle-confirm'));
    await settle(tester, rounds: 4);
    expect(text(tester, 'settle-error'), 'Enter an amount greater than 0.');
  });

  testApp('date and note fields only with their flag; note lands in the title', (tester) async {
    await pumpApp(tester, user: asha, flagsOn: {'enableSettlementDateNote'});
    final s = await seedTrip(tester);
    await addExpense(tester, s, amount: 60, split: [s.me, s.ben]);
    await openLedger(tester, s);
    await tester.tap(key('settle-0'));
    await settle(tester, rounds: 6);
    expect(key('settle-date'), findsOneWidget);
    await tester.enterText(key('settle-note'), 'UPI');
    await tester.tap(key('settle-confirm'));
    await settle(tester, rounds: 14);
    expect(
      ((await expensesOf(tester, s)).cast<Expense>().singleWhere((e) => e.isSettlement)).title,
      'Settlement: Ben ➔ Asha — UPI',
    );
  });

  testApp('no date/note fields without the flag', (tester) async {
    await pumpApp(tester, user: asha, flagsOff: {'enableSettlementDateNote'});
    final s = await seedTrip(tester);
    await addExpense(tester, s, amount: 60, split: [s.me, s.ben]);
    await openLedger(tester, s);
    await tester.tap(key('settle-0'));
    await settle(tester, rounds: 6);
    expect(key('settle-date'), findsNothing);
    expect(key('settle-note'), findsNothing);
  });

  testApp('simplify toggle persists on the trip and is flag-gated', (tester) async {
    await pumpApp(tester, user: asha, flagsOn: {'enableSimplifyDebtsToggle'});
    final s = await seedTrip(tester);
    await openLedger(tester, s);
    final before = (await real(
      tester,
      () => containerOf(tester).read(tripRepositoryProvider).watchTrip(s.tripId).first,
    ))!.simplifyDebts;
    await tester.tap(key('simplify-toggle'));
    await settle(tester, rounds: 6);
    final after = (await real(
      tester,
      () => containerOf(tester).read(tripRepositoryProvider).watchTrip(s.tripId).first,
    ))!.simplifyDebts;
    expect(after, !before);
  });

  testApp('no simplify toggle without the flag', (tester) async {
    await pumpApp(tester, user: asha, flagsOff: {'enableSimplifyDebtsToggle'});
    final s = await seedTrip(tester);
    await openLedger(tester, s);
    expect(key('simplify-toggle'), findsNothing);
  });

  testApp('history lists settlements with their confirmation state; flag-gated', (tester) async {
    await pumpApp(tester, user: asha, flagsOn: {'enableSettlementHistory'});
    final s = await seedTrip(tester);
    await addExpense(tester, s, amount: 60, split: [s.me, s.ben]);
    await addExpense(tester, s, title: 'Settlement: Ben ➔ Asha', amount: 30, paidBy: s.ben, split: [s.me]);
    await openLedger(tester, s);
    expect(find.text('Ben ➔ Asha'), findsOneWidget);
    expect(find.text('Awaiting confirmation'), findsOneWidget);
  });

  testApp('no history section without the flag', (tester) async {
    await pumpApp(tester, user: asha, flagsOff: {'enableSettlementHistory'});
    final s = await seedTrip(tester);
    await openLedger(tester, s);
    expect(find.text('Settlement history'), findsNothing);
  });
}
