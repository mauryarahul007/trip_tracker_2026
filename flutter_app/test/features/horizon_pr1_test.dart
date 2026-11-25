import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:trip_tracker/app/router.dart';
import 'package:trip_tracker/data/local/app_database.dart';
import 'package:trip_tracker/features/expenses/presentation/quick_add_sheet.dart';
import 'package:trip_tracker/features/expenses/presentation/widgets/upi_payment_sheet.dart';
import 'package:trip_tracker/shared/widgets/app_sheet.dart';

import '../support/pump_app.dart';
import '../support/seed.dart';

Future<void> go(WidgetTester t, String path) async {
  unawaited(containerOf(t).read(routerProvider).push<void>(path));
  await settle(t, rounds: 10);
}

Future<void> typeAmount(WidgetTester tester, String digits) async {
  for (final k in digits.split('')) {
    await tester.tap(find.byKey(Key('pad-$k')));
  }
  await settle(tester, rounds: 2);
}

void main() {
  group('Horizon PR 1: split page and Quick add (flag enableHorizonUi)', () {
    testApp('Split chip opens "Split ₹2,400" with an equal share per person', (tester) async {
      await pumpApp(tester, user: asha, flagsOn: {'enableHorizonUi'});
      final s = await seedTrip(tester);
      await go(tester, '/trip/${s.tripId}/expenses/new');
      await typeAmount(tester, '2400');
      await tester.tap(find.byKey(const Key('horizon-chip-split')));
      await settle(tester, rounds: 6);
      expect(find.byKey(const Key('horizon-split')), findsOneWidget);
      expect(find.text('Split ₹2,400'), findsOneWidget);
      expect(find.text('₹800.00'), findsNWidgets(3));
      // Untick Ben: the other two now pay half each.
      await tester.tap(find.byKey(Key('split-${s.ben}')));
      await settle(tester, rounds: 2);
      expect(find.text('₹1,200.00'), findsNWidgets(2));
      await tester.tap(find.byKey(const Key('horizon-split-done')));
      await settle(tester, rounds: 4);
      expect(find.byKey(const Key('horizon-amount-first')), findsOneWidget);
      expect(find.text('Equal · 2'), findsOneWidget);
    });

    testApp('Exact split shows what is left to assign and saves exact amounts', (tester) async {
      await pumpApp(tester, user: asha, flagsOn: {'enableHorizonUi', 'enableAdvancedSplits'});
      final s = await seedTrip(tester);
      await go(tester, '/trip/${s.tripId}/expenses/new');
      await typeAmount(tester, '2400');
      await tester.tap(find.byKey(const Key('horizon-chip-split')));
      await settle(tester, rounds: 6);
      await tester.tap(find.byKey(const Key('split-mode-exact')));
      await settle(tester, rounds: 2);
      final boxes = find.descendant(of: find.byKey(const Key('horizon-split')), matching: find.byType(TextFormField));
      expect(boxes, findsNWidgets(3));
      await tester.enterText(boxes.at(0), '1000');
      await tester.enterText(boxes.at(1), '1000');
      await settle(tester, rounds: 2);
      expect(find.text('₹400.00 left to assign'), findsOneWidget);
      expect(tester.widget<FilledButton>(find.byKey(const Key('horizon-split-done'))).onPressed, isNull);
      await tester.enterText(boxes.at(2), '400');
      await settle(tester, rounds: 2);
      expect(find.byKey(const Key('horizon-left-to-assign')), findsNothing);
      await tester.tap(find.byKey(const Key('horizon-split-done')));
      await settle(tester, rounds: 4);
      expect(find.text('Exact · 3'), findsOneWidget);
      await tester.enterText(find.byKey(const Key('title-field')), 'Scuba');
      await tester.tap(find.byKey(const Key('save')));
      await settle(tester, rounds: 14);
      final db = containerOf(tester).read(appDatabaseProvider);
      final rows = await real(tester, () => db.select(db.expensesTable).get());
      expect(rows.single.amount, 2400);
      expect(rows.single.splitMode, 'exact');
    });

    testApp('Quick add previews the expense and carries it to Change split', (tester) async {
      await pumpApp(tester, user: asha, flagsOn: {'enableHorizonUi'});
      final s = await seedTrip(tester);
      containerOf(tester).read(routerProvider).go('/trip/${s.tripId}/expenses');
      await settle(tester, rounds: 10);
      unawaited(
        AppSheet.show<void>(
          context: tester.element(find.byType(Scaffold).first),
          builder: (_) => QuickAddSheet(tripId: s.tripId),
        ),
      );
      await settle(tester, rounds: 6);
      expect(find.text('Type it like a message'), findsOneWidget);
      await tester.enterText(find.byKey(const Key('quick-add-text')), 'lunch 2400');
      await settle(tester, rounds: 2);
      expect(find.byKey(const Key('quick-add-preview')), findsOneWidget);
      expect(tester.widget<Text>(find.byKey(const Key('quick-add-preview-amount'))).data, '₹2,400.00');
      expect(tester.widget<Text>(find.byKey(const Key('quick-add-preview-sub'))).data, 'You paid · Equal · 3 · Today');
      expect(find.byKey(const Key('quick-add-trip')), findsOneWidget);
      await tester.tap(find.byKey(const Key('quick-add-split')));
      await settle(tester, rounds: 14);
      expect(find.byKey(const Key('horizon-split')), findsOneWidget);
      expect(find.text('Split ₹2,400'), findsOneWidget);
    });

    testApp('Flag off: Quick add keeps the old box and no chips', (tester) async {
      await pumpApp(tester, user: asha);
      final s = await seedTrip(tester);
      containerOf(tester).read(routerProvider).go('/trip/${s.tripId}/expenses');
      await settle(tester, rounds: 10);
      unawaited(
        AppSheet.show<void>(
          context: tester.element(find.byType(Scaffold).first),
          builder: (_) => QuickAddSheet(tripId: s.tripId),
        ),
      );
      await settle(tester, rounds: 6);
      await tester.enterText(find.byKey(const Key('quick-add-text')), 'lunch 2400');
      await settle(tester, rounds: 2);
      expect(find.byKey(const Key('quick-add-split')), findsNothing);
      expect(find.text('Type it like a message'), findsNothing);
    });
  });

  group('Horizon PR 2: settling up (flag enableHorizonUi)', () {
    testApp('Settle up lists every payment with Remind and Mark paid', (tester) async {
      await pumpApp(tester, user: asha, flagsOn: {'enableHorizonUi'});
      final s = await seedTrip(tester);
      await addExpense(tester, s, amount: 90);
      containerOf(tester).read(routerProvider).go('/trip/${s.tripId}/ledger');
      await settle(tester, rounds: 12);
      await tester.tap(find.byKey(const Key('horizon-settle-up')));
      await settle(tester, rounds: 6);
      expect(find.byKey(const Key('horizon-settle-list')), findsOneWidget);
      expect(find.text('2 payments clear the whole trip.'), findsOneWidget);
      expect(find.text('Ben pays you'), findsOneWidget);
      expect(find.byKey(const Key('settle-remind-0')), findsOneWidget);
      expect(find.byKey(const Key('settle-paid-0')), findsOneWidget);
      await tester.tap(find.byKey(const Key('settle-paid-0')));
      await settle(tester, rounds: 8);
      expect(find.byKey(const Key('horizon-settle-list')), findsNothing);
    });

    Future<void> openUpi(WidgetTester tester, String upi) async {
      unawaited(
        AppSheet.show<void>(
          context: tester.element(find.byType(Scaffold).first),
          builder: (_) => UpiPaymentSheet(
            fromName: 'Asha',
            toName: 'Rohan',
            toMemberId: 'm2',
            initialUpiId: upi,
            amount: 1250,
            currency: 'INR',
            tripName: 'Goa',
            onConfirmSettled: () async {},
          ),
        ),
      );
      await settle(tester, rounds: 6);
    }

    testApp('UPI leads with the apps when the UPI id is known', (tester) async {
      await pumpApp(tester, user: asha, flagsOn: {'enableHorizonUi'});
      await seedTrip(tester);
      await openUpi(tester, 'rohan@okaxis');
      expect(find.byKey(const Key('upi-quick-phonepe')), findsOneWidget);
      expect(find.byKey(const Key('upi-come-back')), findsOneWidget);
      expect(find.byKey(const Key('upi-more')), findsOneWidget);
      expect(find.byKey(const Key('rail-chip-upi')), findsNothing); // folded until More ways to pay
    });

    testApp('UPI without an id keeps the full layout', (tester) async {
      await pumpApp(tester, user: asha, flagsOn: {'enableHorizonUi'});
      await seedTrip(tester);
      await openUpi(tester, '');
      expect(find.byKey(const Key('upi-quick-phonepe')), findsNothing);
      expect(find.byKey(const Key('rail-chip-upi')), findsOneWidget);
    });
  });
}
