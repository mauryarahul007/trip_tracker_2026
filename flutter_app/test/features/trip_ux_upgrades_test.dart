import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:trip_tracker/app/router.dart';
import 'package:trip_tracker/data/providers.dart';
import 'package:trip_tracker/domain/repositories/repositories.dart' show AuthUser;
import 'package:trip_tracker/features/trip_details/application/trip_nav.dart';

import '../support/pump_app.dart';
import '../support/seed.dart';

Finder key(String k) => find.byKey(Key(k));

Future<void> openLedger(WidgetTester tester, Seed s) async {
  await settle(tester);
  GoRouter.of(tester.element(find.byType(Scaffold).first)).go('/trip/${s.tripId}/ledger');
  await settle(tester, rounds: 14);
}

Future<void> openTab(WidgetTester tester, Seed s, String tab) async {
  await settle(tester);
  GoRouter.of(tester.element(find.byType(Scaffold).first)).go('/trip/${s.tripId}/$tab');
  await settle(tester, rounds: 14);
}

/// Scrolls the Summary list until [f] is built (the page is taller now: cards above the transfers).
Future<void> toText(WidgetTester tester, Finder f, {double delta = 300}) async {
  final list = find.descendant(of: key('ledger-list'), matching: find.byType(Scrollable));
  await tester.scrollUntilVisible(f, delta, scrollable: list);
}

void main() {
  testApp('trip header strip shows status, dates and avatars on a tab; off with the flag', (tester) async {
    await pumpApp(tester, user: asha);
    final s = await seedTrip(tester);
    await openLedger(tester, s);
    expect(key('trip-strip'), findsOneWidget);
    expect(find.descendant(of: key('trip-strip'), matching: find.textContaining('Oct')), findsWidgets);
  });

  testApp('header strip is absent with its flag off', (tester) async {
    await pumpApp(tester, user: asha, flagsOff: {'enableTripHeaderStrip'});
    final s = await seedTrip(tester);
    await openLedger(tester, s);
    expect(key('trip-strip'), findsNothing);
  });

  testApp('add expense offers Quick add and Full form; quick add opens its sheet', (tester) async {
    await pumpApp(tester, user: asha);
    final s = await seedTrip(tester);
    await openLedger(tester, s);
    await tester.tap(key('add-expense-fab-${s.tripId}'));
    await settle(tester, rounds: 6);
    expect(key('fab-quick'), findsOneWidget);
    expect(key('fab-full'), findsOneWidget);
    await tester.tap(key('fab-quick'));
    await settle(tester, rounds: 8);
    expect(find.text('Quick add'), findsWidgets);
  });

  testApp('speed dial off: the button goes straight to the form', (tester) async {
    await pumpApp(tester, user: asha, flagsOff: {'enableQuickAddSpeedDial'});
    final s = await seedTrip(tester);
    await openLedger(tester, s);
    await tester.tap(key('add-expense-fab-${s.tripId}'));
    await settle(tester, rounds: 10);
    expect(key('fab-quick'), findsNothing);
    final path = GoRouterState.of(tester.element(find.byType(Scaffold).last)).uri.path;
    expect(path, '/trip/${s.tripId}/expenses/new');
  });

  testApp('summary next action: pay who you owe, or who owes you', (tester) async {
    await pumpApp(tester, user: asha);
    final s = await seedTrip(tester);
    await addExpense(tester, s, amount: 90); // Asha is owed by Ben and Cara
    await openLedger(tester, s);
    expect(key('next-action'), findsOneWidget);
    expect(
      find.descendant(of: key('next-action'), matching: find.textContaining('people still owe you')),
      findsOneWidget,
    );
    expect(key('next-action-pay'), findsNothing);
  });

  testApp('summary next action: a payment you owe has a Settle button that opens it', (tester) async {
    await pumpApp(tester, user: asha);
    final s = await seedTrip(tester);
    await addExpense(tester, s, amount: 60, paidBy: s.ben, split: [s.me, s.ben]);
    await openLedger(tester, s);
    expect(find.descendant(of: key('next-action'), matching: find.textContaining('Pay Ben')), findsOneWidget);
    await tester.tap(key('next-action-pay'));
    await settle(tester, rounds: 6);
    expect(find.text('Confirm settlement'), findsOneWidget);
  });

  testApp('next action is gone with its flag off', (tester) async {
    await pumpApp(tester, user: asha, flagsOff: {'enableSummaryNextAction'});
    final s = await seedTrip(tester);
    await addExpense(tester, s, amount: 60, paidBy: s.ben, split: [s.me, s.ben]);
    await openLedger(tester, s);
    expect(key('next-action'), findsNothing);
  });

  testApp('notes quick capture saves a note on done; absent with the flag off', (tester) async {
    await pumpApp(tester, user: asha);
    final s = await seedTrip(tester);
    await openTab(tester, s, 'notes');
    await tester.tap(find.descendant(of: key('notes-panes'), matching: find.text('Notes')));
    await settle(tester, rounds: 4);
    await tester.enterText(key('note-quick'), 'Buy sunscreen');
    await tester.testTextInput.receiveAction(TextInputAction.done);
    await settle(tester, rounds: 8);
    final notes = containerOf(tester).read(tripProvider(s.tripId)).value!.notes;
    expect(notes.single.title, 'Buy sunscreen');
    expect(tester.widget<TextField>(key('note-quick')).controller!.text, isEmpty);
  });

  testApp('notes quick capture box is absent with its flag off', (tester) async {
    await pumpApp(tester, user: asha, flagsOff: {'enableNotesQuickCapture'});
    final s = await seedTrip(tester);
    await openTab(tester, s, 'notes');
    await tester.tap(find.descendant(of: key('notes-panes'), matching: find.text('Notes')));
    await settle(tester, rounds: 4);
    expect(key('note-quick'), findsNothing);
  });

  for (final who in [(asha, 'owner'), (const AuthUser(id: 'u2', email: 'ben@b.c', provider: 'email'), 'member')]) {
    testApp('settlement can be switched between group and person view by the ${who.$2}', (tester) async {
      await pumpApp(tester, user: who.$1);
      final s = await seedTrip(tester);
      await real(
        tester,
        () => containerOf(tester).read(memberRepositoryProvider).createGroup(s.tripId, 'Duo', [s.ben, s.cara]),
      );
      await addExpense(tester, s, amount: 90); // Asha paid for three; Ben and Cara (group Duo) owe 30 each
      await openLedger(tester, s);
      await toText(tester, key('settle-view-toggle'));
      expect(key('settle-view-toggle'), findsOneWidget);
      await toText(tester, find.text('Duo pays Asha'));
      expect(find.text('Duo pays Asha'), findsOneWidget); // group view
      expect(find.text('Ben pays Asha'), findsNothing);
      await toText(tester, find.text('Person view'), delta: -300);
      await tester.tap(find.text('Person view'));
      await settle(tester, rounds: 6);
      await toText(tester, find.text('Ben pays Asha'));
      expect(find.text('Ben pays Asha'), findsOneWidget);
      expect(find.text('Cara pays Asha'), findsOneWidget);
      expect(find.text('Duo pays Asha'), findsNothing);
      await toText(tester, find.text('Group view'), delta: -300);
      await tester.tap(find.text('Group view'));
      await settle(tester, rounds: 6);
      await toText(tester, find.text('Duo pays Asha'));
      expect(find.text('Duo pays Asha'), findsOneWidget);
    });
  }

  testApp('the view switch is hidden without groups or with its flag off', (tester) async {
    await pumpApp(tester, user: asha);
    final s = await seedTrip(tester);
    await addExpense(tester, s, amount: 90);
    await openLedger(tester, s);
    expect(key('settle-view-toggle'), findsNothing); // no groups
  });

  testApp('flag off: groups still drive the list but there is no switch', (tester) async {
    await pumpApp(tester, user: asha, flagsOff: {'enableSettlementViewSwitch'});
    final s = await seedTrip(tester);
    await real(
      tester,
      () => containerOf(tester).read(memberRepositoryProvider).createGroup(s.tripId, 'Duo', [s.ben, s.cara]),
    );
    await addExpense(tester, s, amount: 90);
    await openLedger(tester, s);
    expect(key('settle-view-toggle'), findsNothing);
    await toText(tester, find.text('Duo pays Asha'));
    expect(find.text('Duo pays Asha'), findsOneWidget);
  });

  testApp('back from Settings opened inside a trip returns to the trip, then to the trips list', (tester) async {
    await pumpApp(tester, user: asha);
    final s = await seedTrip(tester);
    final router = containerOf(tester).read(routerProvider);
    // The visible page is what matters: the settings page has a profile row, a trip has its header strip.
    String where() => key('settings-profile').evaluate().isNotEmpty
        ? '/settings'
        : key('trip-strip').evaluate().isNotEmpty
        ? '/trip'
        : '/';
    await settle(tester, rounds: 8);
    unawaited(router.push<void>('/trip/${s.tripId}/ledger'));
    await settle(tester, rounds: 12);
    unawaited(router.push<void>('/settings'));
    await settle(tester, rounds: 10);
    expect(where(), '/settings');
    await tester.binding.handlePopRoute(); // the system back gesture
    await settle(tester, rounds: 10);
    expect(where(), '/trip');
    await tester.binding.handlePopRoute();
    await settle(tester, rounds: 10);
    expect(where(), '/');
  });

  testApp('back from Settings reached through the dock still lands on the trips list', (tester) async {
    await pumpApp(tester, user: asha);
    await seedTrip(tester);
    final router = containerOf(tester).read(routerProvider);
    router.go('/settings');
    await settle(tester, rounds: 10);
    await tester.binding.handlePopRoute();
    await settle(tester, rounds: 10);
    expect(key('settings-profile'), findsNothing);
    expect(find.text('Goa Weekend'), findsWidgets);
  });
}
