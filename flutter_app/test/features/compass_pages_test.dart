import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:trip_tracker/data/providers.dart';
import 'package:trip_tracker/domain/logic/chat_event_text.dart';
import 'package:trip_tracker/domain/models/expense.dart';
import 'package:trip_tracker/domain/models/trip_note.dart';
import 'package:trip_tracker/features/trip_details/application/trip_nav.dart';
import 'package:trip_tracker/domain/models/checklist_item.dart';

import '../support/pump_app.dart';
import '../support/seed.dart';

Finder key(String k) => find.byKey(Key(k));

const on = {'enableCompassNav', 'enableCompassMoney', 'enableCompassTripPages'};

Future<void> goTo(WidgetTester tester, String path) async {
  await settle(tester);
  GoRouter.of(tester.element(find.byType(Scaffold).first)).go(path);
  await settle(tester, rounds: 14);
}

void main() {
  test('chat events read as plain sentences', () {
    expect(tidyChatEvent('Settlement Settlement: Ben → Asha — Upi · INR 50983.07'), 'Ben paid Asha · UPI · ₹50,983.07');
    expect(tidyChatEvent('Added Snacks at airport · INR 600.00'), 'Added Snacks at airport · ₹600');
    expect(tidyChatEvent('Added Cab · INR 2161.50'), 'Added Cab · ₹2,161.50');
  });

  group('Settle sheet', () {
    testApp('shows who pays whom and a big amount, with extras tucked away; confirm still settles', (tester) async {
      await pumpApp(tester, user: asha, flagsOn: on);
      final s = await seedTrip(tester);
      await addExpense(tester, s, title: 'Hotel', amount: 900, paidBy: s.ben);
      await goTo(tester, '/trip/${s.tripId}/ledger');
      await tester.tap(key('compass-settle-bar-action'));
      await settle(tester, rounds: 8);
      await tester.tap(find.descendant(of: key('bar-pay-0'), matching: find.byType(FilledButton)).first);
      await settle(tester, rounds: 8);
      expect(find.text('Pays'), findsOneWidget);
      expect(find.text('Receives'), findsOneWidget);
      expect(key('settle-amount'), findsOneWidget);
      await tester.tap(key('settle-confirm'));
      await settle(tester, rounds: 14);
      final list = (await expensesOf(tester, s)).cast<Expense>();
      expect(list.where((e) => e.isSettlement), hasLength(1));
    });
  });

  group('Notes and Checklist', () {
    testApp('a note is a preview card; tapping opens the editor and saves', (tester) async {
      await pumpApp(tester, user: asha, flagsOn: on);
      final s = await seedTrip(tester);
      await containerOf(tester).read(tripRepositoryProvider).setNotes(s.tripId, [
        const TripNote(id: 'n1', title: 'Hotel', content: 'Check in 3pm', createdAt: 1, updatedAt: 1),
      ]);
      await goTo(tester, '/trip/${s.tripId}/notes');
      await tester.tap(find.descendant(of: key('notes-panes'), matching: find.textContaining('Notes')));
      await settle(tester, rounds: 4);
      expect(key('note-body-n1'), findsNothing);
      expect(find.text('Check in 3pm'), findsOneWidget);
      await tester.tap(key('note-open-n1'));
      await settle(tester, rounds: 6);
      await tester.enterText(key('note-new-body'), 'Check in 4pm');
      await tester.tap(key('note-save'));
      await settle(tester, rounds: 8);
      final notes = containerOf(tester).read(tripProvider(s.tripId)).value!.notes;
      expect(notes.single.content, 'Check in 4pm');
    });

    testApp('finished checklist items fold into a Done section', (tester) async {
      await pumpApp(tester, user: asha, flagsOn: on);
      final s = await seedTrip(tester);
      await containerOf(tester).read(tripRepositoryProvider).setChecklist(s.tripId, [
        const ChecklistItem(
          id: 'a',
          text: 'Passport',
          completed: true,
          category: 'documents',
          createdAt: 1,
          updatedAt: 1,
        ),
        const ChecklistItem(id: 'b', text: 'Charger', category: 'packing', createdAt: 2, updatedAt: 2),
      ]);
      await goTo(tester, '/trip/${s.tripId}/notes');
      await tester.tap(find.descendant(of: key('notes-panes'), matching: find.textContaining('Checklist')));
      await settle(tester, rounds: 4);
      expect(find.text('Charger'), findsOneWidget);
      expect(find.text('Passport'), findsNothing);
      expect(find.text('Done (1)'), findsOneWidget);
      await tester.tap(key('check-done-toggle'));
      await settle(tester, rounds: 4);
      expect(find.text('Passport'), findsOneWidget);
    });
  });

  group('Balances when settled', () {
    testApp('no repeated settled blocks: no celebration card, no progress card', (tester) async {
      await pumpApp(tester, user: asha, flagsOn: on);
      final s = await seedTrip(tester);
      await addExpense(tester, s, title: 'Dinner', amount: 900); // Asha paid
      await goTo(tester, '/trip/${s.tripId}/ledger');
      expect(key('compass-summary-strip'), findsOneWidget);
      expect(find.descendant(of: key('compass-summary-strip'), matching: find.text('TOTAL SPENT')), findsNothing);
      expect(find.descendant(of: key('compass-summary-strip'), matching: find.text('YOU PAID')), findsOneWidget);
    });
  });
}
