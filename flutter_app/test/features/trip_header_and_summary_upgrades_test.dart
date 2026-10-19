import 'package:drift/drift.dart' show driftRuntimeOptions;
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:trip_tracker/data/providers.dart';
import 'package:trip_tracker/domain/repositories/repositories.dart' show AuthUser;
import 'package:trip_tracker/features/expenses/presentation/widgets/summary_extras.dart' show reminderMessage;

import '../support/pump_app.dart';
import '../support/seed.dart';

Finder key(String k) => find.byKey(Key(k));

Future<void> openTab(WidgetTester tester, Seed s, String tab) async {
  tallScreen(tester);
  await settle(tester);
  GoRouter.of(tester.element(find.byType(Scaffold).first)).go('/trip/${s.tripId}/$tab');
  await settle(tester, rounds: 14);
}

/// Opens the trip actions sheet (a tap on the trip name).
Future<void> longPressTitle(WidgetTester tester) async {
  await tester.tap(find.byKey(const Key('trip-title-actions')));
  await settle(tester, rounds: 6);
}

void main() {
  setUpAll(() => driftRuntimeOptions.dontWarnAboutMultipleDatabases = true);

  group('Trip header actions', () {
    testApp('tapping the trip name opens the sheet with its meta line and actions', (tester) async {
      await pumpApp(tester, user: asha);
      final s = await seedTrip(tester);
      await addExpense(tester, s, amount: 90);
      await openTab(tester, s, 'ledger');
      await longPressTitle(tester);
      expect(find.text('Goa Weekend'), findsWidgets);
      expect(find.textContaining('3 members  ·  1 expense'), findsWidgets);
      for (final k in ['share', 'mute', 'edit', 'settings']) {
        expect(key('trip-action-$k'), findsOneWidget, reason: k);
      }
      expect(key('trip-action-switch'), findsNothing); // only one trip
    });

    testApp('Edit Trip Details is a popup that renames the trip', (tester) async {
      await pumpApp(tester, user: asha);
      final s = await seedTrip(tester);
      await openTab(tester, s, 'ledger');
      await longPressTitle(tester);
      await tester.tap(key('trip-action-edit'));
      await settle(tester, rounds: 6);
      await tester.enterText(key('edit-trip-name'), 'Goa Reunion');
      await tester.tap(key('edit-trip-save'));
      await settle(tester, rounds: 6);
      final trips = await real(tester, () => containerOf(tester).read(tripRepositoryProvider).watchTrips().first);
      expect(trips.single.name, 'Goa Reunion');
      expect(trips.single.startDate, '2026-10-01'); // dates are kept when only the name changes
    });

    testApp('Edit Trip: one box per destination, add and remove, saved comma-separated', (tester) async {
      await pumpApp(tester, user: asha);
      final s = await seedTrip(tester);
      await openTab(tester, s, 'ledger');
      await longPressTitle(tester);
      await tester.tap(key('trip-action-edit'));
      await settle(tester, rounds: 6);
      expect(find.byType(TextField), findsNWidgets(2)); // name + one destination
      await tester.tap(key('edit-trip-add-destination'));
      await settle(tester, rounds: 3);
      await tester.tap(key('edit-trip-add-destination'));
      await settle(tester, rounds: 3);
      final boxes = find.byType(TextField);
      expect(boxes, findsNWidgets(4));
      await tester.enterText(boxes.at(1), '');
      await tester.enterText(boxes.at(1), 'Goa');
      await tester.enterText(boxes.at(2), 'Gokarna');
      await tester.enterText(boxes.at(3), 'Hampi');
      await tester.tap(key('edit-trip-remove-destination-0')); // drop Goa
      await settle(tester, rounds: 3);
      await tester.tap(key('edit-trip-save'));
      await settle(tester, rounds: 6);
      final trips = await real(tester, () => containerOf(tester).read(tripRepositoryProvider).watchTrips().first);
      expect(trips.single.destination, 'Gokarna, Hampi');
    });

    testApp('an empty name is refused', (tester) async {
      await pumpApp(tester, user: asha);
      final s = await seedTrip(tester);
      await openTab(tester, s, 'ledger');
      await longPressTitle(tester);
      await tester.tap(key('trip-action-edit'));
      await settle(tester, rounds: 6);
      await tester.enterText(key('edit-trip-name'), '  ');
      await tester.tap(key('edit-trip-save'));
      await settle(tester, rounds: 4);
      expect(find.text('Give the trip a name'), findsOneWidget);
    });

    testApp('only the owner is offered Edit Trip Details', (tester) async {
      await pumpApp(
        tester,
        user: const AuthUser(id: 'u2', email: 'b@b.c', provider: 'email'),
      );
      final s = await seedTrip(tester, owner: 'u1');
      await openTab(tester, s, 'ledger');
      await longPressTitle(tester);
      // Shown but disabled, with the reason, so the option is discoverable.
      expect(tester.widget<ListTile>(key('trip-action-edit')).enabled, isFalse);
      expect(find.text('Only the organizer can edit'), findsOneWidget);
      expect(key('trip-action-share'), findsOneWidget);
    });

    testApp('the title carries one meta line (dates, members, expenses) and a tap opens the actions', (tester) async {
      await pumpApp(tester, user: asha);
      final s = await seedTrip(tester);
      await addExpense(tester, s, amount: 90);
      await openTab(tester, s, 'ledger');
      expect(find.textContaining('3 members  ·  1 expense'), findsWidgets);
      expect(key('trip-status-dot'), findsOneWidget);
      await tester.tap(key('trip-title-actions'));
      await settle(tester, rounds: 6);
      expect(key('trip-action-share'), findsOneWidget);
    });

    testApp('flag off: no chip, no long-press sheet', (tester) async {
      await pumpApp(tester, user: asha, flagsOff: {'enableTripHeaderActions'});
      final s = await seedTrip(tester);
      await openTab(tester, s, 'ledger');
      expect(key('trip-meta'), findsNothing);
      await tester.longPress(find.byKey(const Key('trip-title')));
      await settle(tester, rounds: 4);
      expect(key('trip-action-share'), findsNothing);
    });
  });

  group('Summary upgrades', () {
    Future<Seed> owed(WidgetTester tester) async {
      final s = await seedTrip(tester);
      // Ben paid 60 for Asha and himself: Asha owes Ben 30.
      await addExpense(tester, s, amount: 60, paidBy: s.ben, split: [s.me, s.ben], userId: 'u2');
      await openTab(tester, s, 'ledger');
      return s;
    }

    testApp('an ended trip with money owed shows the chips and the close-out banner', (tester) async {
      await pumpApp(tester, user: asha);
      await owed(tester);
      expect(key('summary-attention'), findsOneWidget);
      expect(key('summary-chip-owe'), findsOneWidget);
      expect(key('summary-ended-banner'), findsOneWidget);
      expect(find.text('Trip dates ended — close out remaining balances'), findsOneWidget);
    });

    testApp('flag off: the Summary has none of the new parts', (tester) async {
      await pumpApp(tester, user: asha, flagsOff: {'enableSummaryUpgrades'});
      await owed(tester);
      expect(key('summary-attention'), findsNothing);
      expect(key('how-it-works'), findsNothing);
      expect(key('transfer-custom'), findsNothing);
      expect(key('at-a-glance'), findsNothing);
    });

    testApp('How it works explains simplified settlements', (tester) async {
      await pumpApp(tester, user: asha);
      await owed(tester);
      await centre(tester, key('how-it-works'));
      await tester.tap(key('how-it-works'));
      await settle(tester, rounds: 6);
      expect(key('how-settlements-work'), findsOneWidget);
      expect(find.textContaining('fewest possible payments'), findsOneWidget);
    });

    testApp('Custom amount opens Settle with the amount ready to type', (tester) async {
      await pumpApp(tester, user: asha);
      await owed(tester);
      await centre(tester, key('transfer-custom'));
      await tester.tap(key('transfer-custom'));
      await settle(tester, rounds: 6);
      final field = tester.widget<TextField>(
        find.descendant(of: key('settle-amount'), matching: find.byType(TextField)),
      );
      expect(field.autofocus, isTrue);
      expect(field.controller!.selection.extentOffset - field.controller!.selection.baseOffset, 5); // "30.00"
    });

    testApp('Remind hands a ready message to the share sheet, only for someone else owing', (tester) async {
      final app = await pumpApp(tester, user: asha);
      await owed(tester);
      // Asha owes Ben, so there is nobody to remind on that payment.
      expect(key('transfer-remind'), findsNothing);
      expect(
        reminderMessage(from: 'Cara', to: 'Asha', amount: '₹30.00', trip: 'Goa Weekend'),
        'Hi Cara, a gentle reminder: you owe Asha ₹30.00 for "Goa Weekend". Settle up whenever you can. Sent from Trip Tracker.',
      );
      expect(app.shareService.shared, isEmpty);
    });

    testApp('Remind appears when someone else owes you and shares the message', (tester) async {
      final app = await pumpApp(tester, user: asha);
      final s = await seedTrip(tester);
      await addExpense(tester, s, amount: 60, split: [s.me, s.ben]); // Asha paid, Ben owes her 30
      await openTab(tester, s, 'ledger');
      await centre(tester, key('transfer-remind'));
      await tester.tap(key('transfer-remind'));
      await settle(tester, rounds: 4);
      expect(app.shareService.shared.single, contains('you owe'));
      expect(app.shareService.shared.single, contains('Goa Weekend'));
    });

    testApp('At a Glance shows the four numbers when Trip numbers is open', (tester) async {
      await pumpApp(tester, user: asha);
      await owed(tester);
      await centre(tester, key('at-a-glance'));
      for (final k in ['total', 'per-head', 'top-category', 'top-spender']) {
        expect(key('glance-$k'), findsOneWidget, reason: k);
      }
      expect(find.text('Ben'), findsWidgets); // biggest spender
    });
  });
}
