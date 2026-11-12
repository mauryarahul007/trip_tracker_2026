import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:trip_tracker/data/providers.dart';
import 'package:trip_tracker/domain/logic/cross_trip_balances.dart';
import 'package:trip_tracker/domain/models/expense.dart';
import 'package:trip_tracker/features/expenses/presentation/expense_form_screen.dart';

import '../support/pump_app.dart';
import '../support/seed.dart';

Finder key(String k) => find.byKey(Key(k));

Future<void> goTo(WidgetTester tester, String path) async {
  await settle(tester);
  GoRouter.of(tester.element(find.byType(Scaffold).first)).go(path);
  await settle(tester, rounds: 14);
}

String fieldText(WidgetTester t, String k) =>
    t.widget<TextField>(find.descendant(of: key(k), matching: find.byType(TextField))).controller!.text;

/// Opens the first "who pays whom" settle button on the Summary (Ben pays Asha).
Future<void> openSettle(WidgetTester tester, Seed s) async {
  tallScreen(tester);
  await goTo(tester, '/trip/${s.tripId}/ledger');
  await centre(tester, key('settle-0'));
  await tester.tap(key('settle-0'));
  await settle(tester, rounds: 6);
}

void main() {
  group('13 balances: cross-trip owe strip', () {
    test('largestOpenDebt / largestOwedToMe pick the biggest position and never blend', () {
      const a = TripNetPosition(tripId: 'a', tripName: 'Goa', currency: 'INR', net: -300);
      const b = TripNetPosition(tripId: 'b', tripName: 'Hampi', currency: 'INR', net: -800);
      const c = TripNetPosition(tripId: 'c', tripName: 'Leh', currency: 'INR', net: 500);
      expect(largestOpenDebt(const [a, b, c])?.tripId, 'b');
      expect(largestOwedToMe(const [a, b, c])?.tripId, 'c');
      expect(largestOpenDebt(const [c]), isNull);
      expect(largestOwedToMe(const [a, b]), isNull);
      expect(largestOpenDebt(const []), isNull);
    });

    testApp('you owe: the mint card names the trip and the CTA opens the settle chooser', (tester) async {
      await pumpApp(tester, user: asha);
      final s = await seedTrip(tester);
      await addExpense(tester, s, amount: 90, paidBy: s.ben); // Asha, Cara each owe Ben 30
      await goTo(tester, '/balances');
      expect(key('balances-largest-debt'), findsOneWidget);
      expect(find.textContaining('Goa Weekend'), findsWidgets);
      expect(key('balances-owed-cta'), findsNothing);
      await tester.tap(key('balances-owe-cta'));
      await settle(tester, rounds: 8);
      // Two open payments on the trip: the chooser, not a single sheet.
      expect(find.text('Record a settlement'), findsOneWidget);
    });

    testApp('you owe: the quiet link opens that trip\'s Balances', (tester) async {
      await pumpApp(tester, user: asha);
      final s = await seedTrip(tester);
      await addExpense(tester, s, amount: 90, paidBy: s.ben);
      await goTo(tester, '/balances');
      await tester.tap(key('balances-owe-open'));
      await settle(tester, rounds: 14);
      final path = GoRouterState.of(tester.element(find.byType(Scaffold).last)).uri.path;
      expect(path, '/trip/${s.tripId}/ledger');
    });

    testApp('only owed to you: no settle CTA, a link to who owes you', (tester) async {
      await pumpApp(tester, user: asha);
      final s = await seedTrip(tester);
      await addExpense(tester, s, amount: 90); // Asha paid
      await goTo(tester, '/balances');
      expect(key('balances-owe-cta'), findsNothing);
      expect(key('balances-largest-owed'), findsOneWidget);
      expect(key('balances-owed-cta'), findsOneWidget);
    });

    testApp('all square: neither CTA', (tester) async {
      await pumpApp(tester, user: asha);
      await seedTrip(tester);
      await goTo(tester, '/balances');
      expect(key('balances-even'), findsOneWidget);
      expect(key('balances-owe-cta'), findsNothing);
      expect(key('balances-owed-cta'), findsNothing);
    });
  });

  group('14 partial settle coach', () {
    testApp('partial settle offers Settle rest, which reopens the sheet prefilled with the remainder', (tester) async {
      await pumpApp(tester, user: asha);
      final s = await seedTrip(tester);
      await addExpense(tester, s, amount: 60, split: [s.me, s.ben]); // Ben owes 30
      await openSettle(tester, s);
      await tester.enterText(key('settle-amount'), '10');
      await settle(tester, rounds: 2);
      await tester.tap(key('settle-confirm'));
      await settle(tester, rounds: 14);
      expect(find.text('Partial payment recorded. ₹20.00 still to settle.'), findsOneWidget);
      await tester.tap(key('settle-rest'));
      await settle(tester, rounds: 8);
      expect(key('settle-amount'), findsOneWidget);
      expect(fieldText(tester, 'settle-amount'), '20.00');
      // Settling the rest in full is not partial: no coach again.
      await tester.tap(key('settle-confirm'));
      await settle(tester, rounds: 14);
      expect(key('settle-rest'), findsNothing);
      expect(find.text('Settlement recorded'), findsOneWidget);
    });

    testApp('full settle shows no coach', (tester) async {
      await pumpApp(tester, user: asha);
      final s = await seedTrip(tester);
      await addExpense(tester, s, amount: 60, split: [s.me, s.ben]);
      await openSettle(tester, s);
      await tester.tap(key('settle-confirm'));
      await settle(tester, rounds: 14);
      expect(key('settle-rest'), findsNothing);
      expect(find.text('Settlement recorded'), findsOneWidget);
    });

    testApp('flag off: a partial settle keeps the plain snack', (tester) async {
      await pumpApp(tester, user: asha, flagsOff: {'enablePartialSettleCoach'});
      final s = await seedTrip(tester);
      await addExpense(tester, s, amount: 60, split: [s.me, s.ben]);
      await openSettle(tester, s);
      await tester.enterText(key('settle-amount'), '10');
      await settle(tester, rounds: 2);
      await tester.tap(key('settle-confirm'));
      await settle(tester, rounds: 14);
      expect(key('settle-rest'), findsNothing);
      expect(find.textContaining('still to settle'), findsNothing);
      expect(find.text('Settlement recorded'), findsOneWidget);
    });
  });

  group('15 clone last from the Add dial', () {
    Future<void> openDial(WidgetTester tester, Seed s) async {
      await goTo(tester, '/trip/${s.tripId}/ledger');
      await tester.tap(key('add-expense-fab-${s.tripId}'));
      await settle(tester, rounds: 6);
    }

    testApp('Clone last opens the form with the last expense copied in', (tester) async {
      await pumpApp(tester, user: asha);
      final s = await seedTrip(tester);
      await addExpense(tester, s, title: 'Beach lunch', amount: 120);
      await openDial(tester, s);
      expect(key('fab-clone'), findsOneWidget);
      expect(find.textContaining('Beach lunch'), findsWidgets);
      await tester.tap(key('fab-clone'));
      await settle(tester, rounds: 14);
      expect(find.byType(ExpenseFormScreen), findsOneWidget);
      expect(find.descendant(of: find.byType(ExpenseFormScreen), matching: find.text('Beach lunch')), findsWidgets);
      expect(find.descendant(of: find.byType(ExpenseFormScreen), matching: find.text('120')), findsWidgets);
    });

    testApp('no expense yet: no Clone last tile', (tester) async {
      await pumpApp(tester, user: asha);
      final s = await seedTrip(tester);
      await openDial(tester, s);
      expect(key('fab-full'), findsOneWidget);
      expect(key('fab-clone'), findsNothing);
    });

    testApp('settlements do not count as the last expense', (tester) async {
      await pumpApp(tester, user: asha);
      final s = await seedTrip(tester);
      await addExpense(tester, s, title: 'Settlement: Ben ➔ Asha', amount: 30, paidBy: s.ben, split: [s.me]);
      await openDial(tester, s);
      expect(key('fab-clone'), findsNothing);
    });

    testApp('flag off: no Clone last tile', (tester) async {
      await pumpApp(tester, user: asha, flagsOff: {'enableCloneLastExpense'});
      final s = await seedTrip(tester);
      await addExpense(tester, s, amount: 120);
      await openDial(tester, s);
      expect(key('fab-clone'), findsNothing);
    });
  });

  group('16 approval threshold sheet', () {
    Future<Seed> openThreshold(WidgetTester tester, {double? existing}) async {
      await pumpApp(tester, user: asha, flagsOn: {'enableExpenseApprovalThreshold'});
      final s = await seedTrip(tester);
      if (existing != null) {
        await real(
          tester,
          () => containerOf(tester).read(tripRepositoryProvider).setApprovalThreshold(s.tripId, existing),
        );
      }
      await goTo(tester, '/trip/${s.tripId}/settings');
      await centre(tester, key('trip-approval'));
      await tester.tap(key('trip-approval'));
      await settle(tester, rounds: 6);
      return s;
    }

    Future<double?> savedThreshold(WidgetTester tester, Seed s) async =>
        (await real(tester, () => containerOf(tester).read(tripRepositoryProvider).watchTrip(s.tripId).first))!
            .approvalThreshold;

    testApp('a sheet, not a dialog: live money preview in the trip currency, then Save', (tester) async {
      final s = await openThreshold(tester);
      expect(find.byType(AlertDialog), findsNothing);
      expect(find.text('Empty means no limit: every expense is added without approval.'), findsOneWidget);
      await tester.enterText(key('threshold-field'), '500');
      await settle(tester, rounds: 2);
      expect(find.text('Expenses above ₹500.00 need approval'), findsOneWidget);
      await tester.tap(key('threshold-save'));
      await settle(tester, rounds: 8);
      expect(await savedThreshold(tester, s), 500);
      expect(find.text('Expenses above ₹500.00 need approval'), findsOneWidget); // now the tile subtitle
    });

    testApp('zero or junk is refused and Save is disabled', (tester) async {
      final s = await openThreshold(tester);
      await tester.enterText(key('threshold-field'), '0');
      await settle(tester, rounds: 2);
      expect(find.textContaining('greater than 0'), findsOneWidget);
      await tester.tap(key('threshold-save'), warnIfMissed: false);
      await settle(tester, rounds: 4);
      expect(key('threshold-field'), findsOneWidget); // sheet still open
      expect(await savedThreshold(tester, s), isNull);
    });

    testApp('Turn off clears an existing threshold', (tester) async {
      final s = await openThreshold(tester, existing: 250);
      expect(tester.widget<TextField>(key('threshold-field')).controller!.text, '250');
      await tester.tap(key('threshold-off'));
      await settle(tester, rounds: 8);
      expect(await savedThreshold(tester, s), isNull);
    });
  });

  group('17 recycle bin swipe restore', () {
    Future<(Seed, String)> openBin(WidgetTester tester) async {
      await pumpApp(tester, user: asha);
      final s = await seedTrip(tester);
      final id = await addExpense(tester, s, title: 'Beach lunch', amount: 120);
      await real(tester, () => containerOf(tester).read(expenseRepositoryProvider).delete(id, userId: 'u1'));
      await goTo(tester, '/trip/${s.tripId}/recycle-bin');
      return (s, id);
    }

    Future<List<Expense>> active(WidgetTester tester, Seed s) async => (await expensesOf(tester, s)).cast<Expense>();

    testApp('expiry copy stays; Restore is the one button and Delete forever hides in the menu', (tester) async {
      final (_, id) = await openBin(tester);
      expect(key('bin-expiry-$id'), findsOneWidget);
      expect(find.text('Deleted expenses stay here for 24 hours.'), findsOneWidget);
      expect(key('bin-restore-$id'), findsOneWidget);
      expect(find.text('Delete forever'), findsNothing);
      await tester.tap(key('bin-more-$id'));
      await settle(tester, rounds: 4);
      expect(find.text('Delete forever'), findsOneWidget);
    });

    testApp('the Restore button brings the expense back', (tester) async {
      final (s, id) = await openBin(tester);
      await tester.tap(key('bin-restore-$id'));
      await settle(tester, rounds: 10);
      expect((await active(tester, s)).map((e) => e.id), contains(id));
      expect(find.text('Restored Beach lunch'), findsOneWidget);
    });

    testApp('swiping a row right restores it', (tester) async {
      final (s, id) = await openBin(tester);
      await tester.drag(key('bin-dismiss-$id'), const Offset(420, 0));
      await settle(tester, rounds: 12);
      expect((await active(tester, s)).map((e) => e.id), contains(id));
      expect(key('bin-$id'), findsNothing);
      expect(find.text('Restored Beach lunch'), findsOneWidget);
    });

    testApp('Delete forever from the menu still asks first and then removes it for good', (tester) async {
      final (s, id) = await openBin(tester);
      await tester.tap(key('bin-more-$id'));
      await settle(tester, rounds: 4);
      await tester.tap(key('bin-delete-$id'));
      await settle(tester, rounds: 6);
      expect(find.textContaining('Beach lunch'), findsWidgets); // confirm dialog names it
      await tester.tap(find.text('Delete forever').last);
      await settle(tester, rounds: 10);
      expect(key('bin-$id'), findsNothing);
      expect((await active(tester, s)).map((e) => e.id), isNot(contains(id)));
    });
  });
}
