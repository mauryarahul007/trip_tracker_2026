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

/// Sections other than "who pays whom" start folded away; tap a header to open it.
Future<void> openSection(WidgetTester tester, String section) async {
  await tester.ensureVisible(key('section-$section'));
  await tester.tap(key('section-$section'));
  await settle(tester, rounds: 4);
}

/// The list builds lazily: scroll down until [k] exists.
Future<void> scrollToKey(WidgetTester tester, String k) => tester.scrollUntilVisible(
  key(k),
  300,
  scrollable: find.descendant(of: key('ledger-list'), matching: find.byType(Scrollable)),
);

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
    await scrollToKey(tester, 'balance-${s.me}'); // Trip numbers is open by default, below the fold
    expect(text(tester, 'balance-${s.me}'), 'is owed ₹60.00');
    expect(text(tester, 'balance-${s.ben}'), 'owes ₹30.00');
    expect(find.text('Ben pays Asha'), findsOneWidget);
    expect(find.text('Cara pays Asha'), findsOneWidget);
  });

  testApp('the hero boarding pass is stamped SETTLED at zero and NOT SETTLED while money is owed', (tester) async {
    await pumpApp(tester, user: asha);
    final s = await seedTrip(tester);
    await openLedger(tester, s);
    expect(find.descendant(of: key('settle-stamp'), matching: find.text('SETTLED')), findsOneWidget);

    await addExpense(tester, s, amount: 90); // Ben and Cara now owe Asha
    await settle(tester, rounds: 8);
    expect(find.descendant(of: key('settle-stamp'), matching: find.text('NOT SETTLED')), findsOneWidget);
    expect(find.descendant(of: key('sticky-balance'), matching: find.text('YOU ARE OWED')), findsOneWidget);
  });

  testApp('Add expense is on the Summary tab and opens the expense form', (tester) async {
    await pumpApp(tester, user: asha);
    final s = await seedTrip(tester);
    await openLedger(tester, s);
    await tester.tap(key('add-expense-fab-${s.tripId}'));
    await settle(tester, rounds: 10);
    final path = GoRouterState.of(tester.element(find.byType(Scaffold).last)).uri.path;
    expect(path, '/trip/${s.tripId}/expenses/new');
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
    // Asha is the one being paid, so Ben's payment sits on her summary ticket (a row keyed transfer-N).
    await tester.tap(
      find.descendant(
        of: find.ancestor(
          of: find.text('Ben pays Asha'),
          matching: find.byWidgetPredicate((w) => w.key.toString().contains("'transfer-")),
        ),
        matching: find.byType(AppButton),
      ),
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

  testApp('simplify switch changes who pays whom (chain of debts collapses, then expands again)', (tester) async {
    await pumpApp(tester, user: asha);
    final s = await seedTrip(tester);
    // Asha paid for Asha+Ben (Ben owes 30); Ben paid for Ben+Cara (Cara owes 30).
    await addExpense(tester, s, title: 'Taxi', amount: 60, split: [s.me, s.ben]);
    await addExpense(tester, s, title: 'Lunch', amount: 60, paidBy: s.ben, split: [s.ben, s.cara]);
    await openLedger(tester, s);

    // The switch says what it does: one payment instead of two.
    expect(find.text('1 payment instead of 2'), findsOneWidget);

    // Simplified (default): Cara pays Asha directly, Ben is out of it.
    expect(find.text('Cara pays Asha'), findsOneWidget);
    expect(find.text('Ben pays Asha'), findsNothing);

    await tester.tap(find.descendant(of: key('simplify-toggle'), matching: find.text('Per person')));
    await settle(tester, rounds: 8);

    // Not simplified: every debt stays between the people who incurred it.
    expect(find.text('Ben pays Asha'), findsOneWidget);
    expect(find.text('Cara pays Ben'), findsOneWidget);
    expect(find.text('Cara pays Asha'), findsNothing);
  });

  testApp('when simplifying changes nothing the counts line says so', (tester) async {
    await pumpApp(tester, user: asha);
    final s = await seedTrip(tester);
    await addExpense(tester, s, amount: 90); // Asha paid for everyone: two payments either way
    await openLedger(tester, s);
    expect(find.text('2 payments either way for this trip'), findsOneWidget);
  });

  testApp('trip admins get the simplify switch without any flag', (tester) async {
    // The switch used to hide behind a Labs flag that is off by default, so it looked broken.
    await pumpApp(tester, user: asha, flagsOff: {'enableSimplifyDebtsToggle'});
    final s = await seedTrip(tester);
    await openLedger(tester, s);
    expect(key('simplify-toggle'), findsOneWidget);
  });

  testApp('history lists settlements with their confirmation state; flag-gated', (tester) async {
    await pumpApp(tester, user: asha, flagsOn: {'enableSettlementHistory'});
    final s = await seedTrip(tester);
    await addExpense(tester, s, amount: 60, split: [s.me, s.ben]);
    await addExpense(tester, s, title: 'Settlement: Ben ➔ Asha', amount: 30, paidBy: s.ben, split: [s.me]);
    await openLedger(tester, s);
    await scrollToKey(tester, 'section-history'); // below the fold; the list builds lazily
    await tester.drag(key('ledger-list'), const Offset(0, -200)); // lift the header clear of the floating nav
    await settle(tester, rounds: 2);
    await openSection(tester, 'history');
    await tester.drag(key('ledger-list'), const Offset(0, -300)); // reveal the rows under the header
    await settle(tester, rounds: 4);
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
