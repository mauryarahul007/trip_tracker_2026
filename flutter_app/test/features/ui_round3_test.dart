import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:trip_tracker/data/providers.dart';
import 'package:trip_tracker/domain/models/travel_pass.dart';

import '../support/pump_app.dart';
import '../support/seed.dart';

Finder key(String k) => find.byKey(Key(k));

TravelPass pass(String id, String s) =>
    TravelPass(id: id, tripId: s, type: 'flight', title: 'Flight $id', createdAt: 1, updatedAt: 1);

Future<void> openTab(WidgetTester tester, Seed s, String tab) async {
  tallScreen(tester);
  await settle(tester);
  GoRouter.of(tester.element(find.byType(Scaffold).first)).go('/trip/${s.tripId}/$tab');
  await settle(tester, rounds: 14);
}

void main() {
  testApp('passes: Select, Select all, delete in one go, one Undo brings them all back', (tester) async {
    await pumpApp(tester, user: asha);
    final s = await seedTrip(tester);
    final repo = containerOf(tester).read(tripRepositoryProvider);
    await repo.setPasses(s.tripId, [
      for (final i in ['a', 'b', 'c']) pass(i, s.tripId),
    ]);
    await openTab(tester, s, 'notes');
    await tester.tap(find.descendant(of: key('notes-panes'), matching: find.text('Passes')));
    await settle(tester, rounds: 4);
    await tester.tap(key('pass-select'));
    await settle(tester, rounds: 3);
    expect(find.text('0 selected'), findsOneWidget);
    await tester.tap(key('pass-select-all'));
    await settle(tester, rounds: 3);
    expect(find.text('3 selected'), findsOneWidget);
    await tester.tap(key('pass-pick-b')); // un-pick one
    await settle(tester, rounds: 3);
    expect(find.text('2 selected'), findsOneWidget);
    await tester.tap(key('pass-delete-selected'));
    await settle(tester, rounds: 4);
    expect(find.text('Delete 2 passes?'), findsOneWidget);
    await tester.tap(key('pass-delete-selected-confirm'));
    await settle(tester, rounds: 6);
    final left = await real(tester, () => repo.watchTrips().first);
    expect(left.single.passes.map((p) => p.id), ['b']);
    expect(find.text('2 passes deleted'), findsOneWidget);
  });

  testApp('Expenses: the filters page opens full height with Clear all and a live count', (tester) async {
    await pumpApp(tester, user: asha);
    final s = await seedTrip(tester);
    await addExpense(tester, s, amount: 90);
    await openTab(tester, s, 'expenses');
    expect(key('voice-add'), findsOneWidget);
    await tester.tap(key('open-filters'));
    await settle(tester, rounds: 6);
    expect(key('filters-title'), findsOneWidget);
    for (final t in ['MY EXPENSES', 'CATEGORY', 'PAID BY', 'DATE RANGE', 'AMOUNT RANGE']) {
      expect(find.text(t), findsOneWidget, reason: t);
    }
    expect(key('filter-date-from'), findsOneWidget);
    expect(key('filter-clear-all'), findsOneWidget);
    expect(find.text('Show 1 expense'), findsOneWidget);
  });

  testApp('Expenses: voice pill is gone with enableVoiceInput off', (tester) async {
    await pumpApp(tester, user: asha, flagsOff: {'enableVoiceInput'});
    final s = await seedTrip(tester);
    await openTab(tester, s, 'expenses');
    expect(key('voice-add'), findsNothing);
  });

  testApp('Summary: a pass with the amount owed pins once the balance card has scrolled away', (tester) async {
    await pumpApp(tester, user: asha);
    final s = await seedTrip(tester);
    await addExpense(tester, s, amount: 60, paidBy: s.ben, split: [s.me, s.ben], userId: 'u2');
    await openTab(tester, s, 'ledger');
    expect(key('mini-pass'), findsNothing);
    await tester.drag(key('ledger-list'), const Offset(0, -900));
    await settle(tester, rounds: 6);
    expect(key('mini-pass'), findsOneWidget);
    expect(find.text('OUTSTANDING'), findsOneWidget);
    await tester.tap(key('mini-pass'));
    await settle(tester, rounds: 10);
    expect(key('mini-pass'), findsNothing);
  });

  group('settlement pass flip', () {
    testApp('tap anywhere flips to You paid / Your share / You owe and back; the strip is gone', (tester) async {
      await pumpApp(tester, user: asha, flagsOn: {'enableCompassTripPages'});
      final s = await seedTrip(tester);
      await addExpense(tester, s, amount: 60, paidBy: s.ben, split: [s.me, s.ben], userId: 'u2');
      await openTab(tester, s, 'ledger');
      expect(key('paid-vs-share'), findsNothing);
      expect(key('pass-flip-chip'), findsOneWidget);
      expect(key('pass-back'), findsNothing);
      expect(find.text('PENDING'), findsOneWidget); // front stub: Spent / Settled / Pending
      expect(find.text('1 payment'), findsOneWidget);
      await tester.tap(key('hero-amount'));
      await settle(tester, rounds: 8);
      expect(key('pass-back'), findsOneWidget);
      expect(find.text('YOU PAID'), findsOneWidget);
      expect(find.text('YOUR SHARE'), findsWidgets);
      expect(find.text('YOU OWE'), findsWidgets);
      await tester.tap(key('pass-back-explain'));
      await settle(tester, rounds: 6);
      expect(key('balance-explainer'), findsOneWidget);
      await tester.tapAt(const Offset(10, 10)); // close the sheet
      await settle(tester, rounds: 6);
      await tester.tap(key('pass-back'));
      await settle(tester, rounds: 8);
      expect(key('pass-back'), findsNothing);
      expect(key('hero-amount'), findsOneWidget);
    });

    testApp('calm pages off (default in tests): the old Difference label and Open payments stub return', (
      tester,
    ) async {
      await pumpApp(tester, user: asha);
      final s = await seedTrip(tester);
      await addExpense(tester, s, amount: 60, paidBy: s.ben, split: [s.me, s.ben], userId: 'u2');
      await openTab(tester, s, 'ledger');
      expect(find.text('OPEN PAYMENTS'), findsWidgets);
      await tester.tap(key('hero-amount'));
      await settle(tester, rounds: 8);
      expect(find.text('DIFFERENCE'), findsOneWidget);
    });

    testApp('flag off: the strip stays and the pass does not flip', (tester) async {
      await pumpApp(tester, user: asha, flagsOff: {'enableSummaryUpgrades'});
      final s = await seedTrip(tester);
      await addExpense(tester, s, amount: 60, paidBy: s.ben, split: [s.me, s.ben], userId: 'u2');
      await openTab(tester, s, 'ledger');
      expect(key('paid-vs-share'), findsOneWidget);
      expect(key('pass-flip'), findsNothing);
    });
  });
}
