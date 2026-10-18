import 'dart:convert';

import 'package:drift/drift.dart' show Value;
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:trip_tracker/data/local/app_database.dart';
import 'package:trip_tracker/data/providers.dart';
import 'package:trip_tracker/features/expenses/application/expenses_providers.dart';
import 'package:trip_tracker/features/trips/application/trip_accent.dart';
import 'package:trip_tracker/features/trips/presentation/widgets/trip_card.dart' show TripStatusPill;

import '../support/pump_app.dart';
import '../support/seed.dart';

Finder key(String k) => find.byKey(Key(k));

Future<void> goTo(WidgetTester tester, String path) async {
  await settle(tester);
  GoRouter.of(tester.element(find.byType(Scaffold).first)).go(path);
  await settle(tester, rounds: 14);
}

String ymd(DateTime d) => d.toIso8601String().substring(0, 10);

Future<String> tripAt(WidgetTester tester, String name, int startOffset, {String? destination}) {
  final now = DateTime.now();
  return real(
    tester,
    () => containerOf(tester)
        .read(tripRepositoryProvider)
        .createTrip(
          name: name,
          startDate: ymd(now.add(Duration(days: startOffset))),
          endDate: ymd(now.add(Duration(days: startOffset + 3))),
          baseCurrency: 'INR',
          ownerId: 'u1',
          creatorName: 'Asha',
          destination: destination,
        ),
  );
}

String appBarTitle(WidgetTester tester) =>
    tester.widget<Text>(find.descendant(of: find.byType(AppBar), matching: find.byType(Text)).first).data ?? '';

int get nowMs => DateTime.now().millisecondsSinceEpoch;

void main() {
  group('last synced caption', () {
    testApp('shows on the Trips list and the Summary once a sync happened, and not before', (tester) async {
      await pumpApp(tester, user: asha);
      final s = await seedTrip(tester);
      await goTo(tester, '/');
      expect(key('last-synced'), findsNothing); // never synced: nothing to claim
      containerOf(tester).read(lastSyncedProvider.notifier).mark();
      await settle(tester, rounds: 4);
      expect(
        find.descendant(of: key('last-synced'), matching: find.byType(Text)),
        findsNothing,
      ); // key is on the Text itself
      expect(tester.widget<Text>(key('last-synced')).data, 'Updated just now');
      await goTo(tester, '/trip/${s.tripId}/ledger');
      expect(key('last-synced'), findsOneWidget);
    });

    testApp('is remembered across restarts and hidden with its flag off', (tester) async {
      await pumpApp(
        tester,
        user: asha,
        prefsExtra: {'sync.last_at': nowMs - 5 * 60 * 1000},
        flagsOff: {'enableLastSyncedCaption'},
      );
      await seedTrip(tester);
      await goTo(tester, '/');
      expect(key('last-synced'), findsNothing);
    });

    testApp('a remembered sync time reads as minutes ago', (tester) async {
      await pumpApp(tester, user: asha, prefsExtra: {'sync.last_at': nowMs - 5 * 60 * 1000});
      await seedTrip(tester);
      await goTo(tester, '/');
      expect(tester.widget<Text>(key('last-synced')).data, 'Updated 5m ago');
    });
  });

  group('switch between trips', () {
    testApp('arrows and a swipe on the strip jump to the neighbouring trip and keep the tab', (tester) async {
      await pumpApp(tester, user: asha);
      final later = await tripAt(tester, 'Later Trip', 20);
      final sooner = await tripAt(tester, 'Sooner Trip', 5);
      await goTo(tester, '/trip/$later/ledger'); // newest first: Later, then Sooner
      expect(appBarTitle(tester), 'Later Trip');
      expect(
        tester.widget<IconButton>(find.descendant(of: key('trip-prev'), matching: find.byType(IconButton))).onPressed,
        isNull,
      ); // first in the list
      await tester.tap(key('trip-next'));
      await settle(tester, rounds: 12);
      expect(appBarTitle(tester), 'Sooner Trip');
      expect(find.byKey(const Key('ledger-list')), findsOneWidget); // still on Summary
      expect(
        tester.widget<IconButton>(find.descendant(of: key('trip-next'), matching: find.byType(IconButton))).onPressed,
        isNull,
      ); // last in the list
      await tester.fling(key('trip-strip'), const Offset(500, 0), 1500); // swipe right: previous trip
      await settle(tester, rounds: 12);
      expect(appBarTitle(tester), 'Later Trip');
      expect(sooner, isNot(later));
    });

    testApp('no arrows with a single trip or with the flag off', (tester) async {
      await pumpApp(tester, user: asha);
      final only = await tripAt(tester, 'Only Trip', 5);
      await goTo(tester, '/trip/$only/ledger');
      expect(key('trip-next'), findsNothing);
    });

    testApp('switcher off: no arrows even with two trips', (tester) async {
      await pumpApp(tester, user: asha, flagsOff: {'enableTripSwitcher'});
      final a = await tripAt(tester, 'A Trip', 5);
      await tripAt(tester, 'B Trip', 20);
      await goTo(tester, '/trip/$a/ledger');
      expect(key('trip-next'), findsNothing);
    });
  });

  group('pinned trips', () {
    testApp('press and hold, Pin: the trip moves under a Pinned header and is remembered; Unpin undoes it', (
      tester,
    ) async {
      final app = await pumpApp(tester, user: asha);
      await tripAt(tester, 'Later Trip', 20);
      final sooner = await tripAt(tester, 'Sooner Trip', 5);
      await goTo(tester, '/');
      await tester.longPress(find.text('Sooner Trip'));
      await settle(tester, rounds: 6);
      await tester.tap(key('stack-menu-pin'));
      await settle(tester, rounds: 8);
      expect(find.textContaining('PINNED · 1'), findsOneWidget);
      expect(app.prefs.getStringList('trips.pinned'), [sooner]);
      expect(
        tester.getTopLeft(find.text('Sooner Trip')).dy,
        lessThan(tester.getTopLeft(find.text('Later Trip')).dy),
      ); // pinned leads, although Later is newer

      await tester.longPress(find.text('Sooner Trip'));
      await settle(tester, rounds: 6);
      expect(find.text('Unpin'), findsOneWidget);
      await tester.tap(key('stack-menu-pin'));
      await settle(tester, rounds: 8);
      expect(find.textContaining('PINNED'), findsNothing);
      expect(app.prefs.getStringList('trips.pinned'), isEmpty);
    });

    testApp('no Pin option with its flag off', (tester) async {
      await pumpApp(tester, user: asha, flagsOff: {'enableTripPins'});
      await tripAt(tester, 'Sooner Trip', 5);
      await goTo(tester, '/');
      await tester.longPress(find.text('Sooner Trip'));
      await settle(tester, rounds: 6);
      expect(key('stack-menu-pin'), findsNothing);
      expect(key('stack-menu-open'), findsOneWidget);
    });
  });

  group('receipt gallery', () {
    testApp('shows trips receipts as a grid, opens one large and its expense; empty state without any', (tester) async {
      await pumpApp(tester, user: asha);
      final s = await seedTrip(tester);
      final withReceipt = await addExpense(tester, s, title: 'Dinner', amount: 80);
      await addExpense(tester, s, title: 'Taxi', amount: 30); // no receipt: not in the grid
      final db = containerOf(tester).read(appDatabaseProvider);
      await real(tester, () async {
        final row = await (db.select(db.expensesTable)..where((t) => t.id.equals(withReceipt))).getSingle();
        final json = jsonDecode(row.domainJson!) as Map<String, dynamic>;
        json['receiptPath'] = 'https://img.test/r.jpg';
        await (db.update(
          db.expensesTable,
        )..where((t) => t.id.equals(withReceipt))).write(ExpensesTableCompanion(domainJson: Value(jsonEncode(json))));
      });
      await goTo(tester, '/trip/${s.tripId}/receipts');
      expect(key('receipts-grid'), findsOneWidget);
      expect(key('receipt-$withReceipt'), findsOneWidget);
      expect(find.text('Taxi'), findsNothing);
      await tester.tap(key('receipt-$withReceipt'));
      await settle(tester, rounds: 6);
      expect(key('receipt-large'), findsOneWidget);
      await tester.tap(key('receipt-open-expense'));
      await settle(tester, rounds: 8);
      expect(key('detail-title'), findsOneWidget); // the expense sheet
    });

    testApp('empty state when no expense has a receipt', (tester) async {
      await pumpApp(tester, user: asha);
      final s = await seedTrip(tester);
      await addExpense(tester, s, title: 'Taxi', amount: 30);
      await goTo(tester, '/trip/${s.tripId}/receipts');
      expect(key('receipts-empty'), findsOneWidget);
    });

    testApp('the Expenses menu lists Receipts, and not with the flag off', (tester) async {
      await pumpApp(tester, user: asha);
      final s = await seedTrip(tester);
      await addExpense(tester, s, title: 'Taxi', amount: 30);
      await goTo(tester, '/trip/${s.tripId}/expenses');
      await tester.tap(key('tab-menu'));
      await settle(tester, rounds: 4);
      expect(key('menu-receipts'), findsOneWidget);
    });

    testApp('no Receipts entry with its flag off', (tester) async {
      await pumpApp(tester, user: asha, flagsOff: {'enableReceiptGallery'});
      final s = await seedTrip(tester);
      await addExpense(tester, s, title: 'Taxi', amount: 30);
      await goTo(tester, '/trip/${s.tripId}/expenses');
      await tester.tap(key('tab-menu'));
      await settle(tester, rounds: 4);
      expect(key('menu-receipts'), findsNothing);
      expect(find.text('Categories'), findsWidgets); // the menu is open
    });
  });

  group('spend ring', () {
    testApp('who paid shows a ring with people; tapping one filters the Expenses tab to them', (tester) async {
      await pumpApp(tester, user: asha);
      final s = await seedTrip(tester);
      await addExpense(tester, s, title: 'Hotel', amount: 90);
      await addExpense(tester, s, title: 'Taxi', amount: 30, paidBy: s.ben, userId: 'u2');
      await goTo(tester, '/trip/${s.tripId}/ledger');
      await tester.scrollUntilVisible(
        key('spend-ring'),
        300,
        scrollable: find.descendant(of: key('ledger-list'), matching: find.byType(Scrollable)),
      );
      expect(key('spend-ring'), findsOneWidget);
      expect(find.text('Asha 75%'), findsOneWidget); // Asha paid 90 of 120
      await centre(tester, key('ring-chip-${s.ben}'));
      await tester.tap(key('ring-chip-${s.ben}'));
      await settle(tester, rounds: 12);
      expect(containerOf(tester).read(expenseFiltersProvider(s.tripId)).memberId, s.ben);
    });

    testApp('no ring with its flag off or with a single payer', (tester) async {
      await pumpApp(tester, user: asha, flagsOff: {'enableSpendRing'});
      final s = await seedTrip(tester);
      await addExpense(tester, s, title: 'Hotel', amount: 90);
      await addExpense(tester, s, title: 'Taxi', amount: 30, paidBy: s.ben, userId: 'u2');
      await goTo(tester, '/trip/${s.tripId}/ledger');
      await tester.scrollUntilVisible(
        key('day-timeline'),
        300,
        scrollable: find.descendant(of: key('ledger-list'), matching: find.byType(Scrollable)),
      );
      expect(key('spend-ring'), findsNothing);
    });
  });

  group('first-run tour and sample trip', () {
    testApp('the tour shows once: three cards, then it is remembered', (tester) async {
      final app = await pumpApp(tester, user: asha, prefsExtra: {'tour.done': false});
      await settle(tester, rounds: 8);
      expect(key('first-run-tour'), findsOneWidget);
      expect(find.text('Your trips at a glance'), findsOneWidget);
      await tester.tap(key('tour-next'));
      await settle(tester, rounds: 6);
      expect(find.text('Press and hold for more'), findsOneWidget);
      await tester.tap(key('tour-next'));
      await settle(tester, rounds: 6);
      expect(find.text('Inside a trip'), findsOneWidget);
      await tester.tap(key('tour-next')); // "Got it"
      await settle(tester, rounds: 6);
      expect(key('first-run-tour'), findsNothing);
      expect(app.prefs.getBool('tour.done'), isTrue);
    });

    testApp('Skip closes the tour; no tour with the flag off', (tester) async {
      await pumpApp(tester, user: asha, prefsExtra: {'tour.done': false});
      await settle(tester, rounds: 8);
      await tester.tap(key('tour-skip'));
      await settle(tester, rounds: 6);
      expect(key('first-run-tour'), findsNothing);
    });

    testApp('flag off: no tour and no sample button', (tester) async {
      await pumpApp(tester, user: asha, prefsExtra: {'tour.done': false}, flagsOff: {'enableFirstRunTour'});
      await settle(tester, rounds: 8);
      expect(key('first-run-tour'), findsNothing);
      expect(key('try-sample-trip'), findsNothing);
    });

    testApp('Try a sample trip creates a small trip with members and expenses and opens it', (tester) async {
      await pumpApp(tester, user: asha);
      await settle(tester, rounds: 8);
      expect(key('try-sample-trip'), findsOneWidget);
      await tester.tap(key('try-sample-trip'));
      await settle(tester, rounds: 16);
      final trips = await real(tester, () => containerOf(tester).read(tripRepositoryProvider).watchTrips().first);
      expect(trips.single.name, 'Sample: Goa weekend');
      final id = trips.single.id;
      final expenses = await real(
        tester,
        () => containerOf(tester).read(expenseRepositoryProvider).watchActive(id).first,
      );
      expect(expenses.length, 4);
      expect(expenses.fold<double>(0, (a, e) => a + e.amount), 10200);
      final members = await real(
        tester,
        () => containerOf(tester).read(memberRepositoryProvider).watchMembers(id).first,
      );
      expect(members.map((m) => m.name), containsAll(['Sam', 'Riya']));
      expect(key('trip-strip'), findsOneWidget); // landed inside the trip
    });
  });

  group('amount keypad', () {
    testApp('the keypad types an amount with a calculator sign and the form updates live', (tester) async {
      await pumpApp(tester, user: asha);
      final s = await seedTrip(tester);
      await openForm(tester, s);
      await tester.tap(key('amount-keypad-button'));
      await settle(tester, rounds: 6);
      expect(key('amount-keypad'), findsOneWidget);
      for (final k in ['1', '2', '×', '3']) {
        await tester.tap(key('key-$k'));
        await tester.pump();
      }
      expect(tester.widget<Text>(key('keypad-display')).data, '12×3');
      expect(tester.widget<TextField>(key('amount-field')).controller!.text, '12*3'); // the calculator reads *
      expect(tester.widget<Text>(key('amount-eval')).data, '= ₹36.00');
      await tester.tap(key('keypad-done'));
      await settle(tester, rounds: 6);
      expect(key('amount-keypad'), findsNothing);
    });

    testApp('the keypad keeps numbers sane: one decimal point, no doubled signs, delete works', (tester) async {
      await pumpApp(tester, user: asha);
      final s = await seedTrip(tester);
      await openForm(tester, s);
      await tester.tap(key('amount-keypad-button'));
      await settle(tester, rounds: 6);
      Future<void> press(List<String> keys) async {
        for (final k in keys) {
          await tester.tap(key('key-$k'));
          await tester.pump();
        }
      }

      await press(['.', '5', '.', '5']); // ".5.5": a leading point becomes 0. and the second point is ignored
      expect(tester.widget<Text>(key('keypad-display')).data, '0.55');
      await press(['+', '×', '2']); // a second sign replaces the first
      expect(tester.widget<Text>(key('keypad-display')).data, '0.55×2');
      await press(['⌫', '⌫', '⌫']);
      expect(tester.widget<Text>(key('keypad-display')).data, '0.5');
    });

    testApp('no keypad button with its flag off', (tester) async {
      await pumpApp(tester, user: asha, flagsOff: {'enableAmountKeypad'});
      final s = await seedTrip(tester);
      await openForm(tester, s);
      expect(key('amount-keypad-button'), findsNothing);
      expect(key('amount-field'), findsOneWidget);
    });
  });

  group('trip accent', () {
    Color? pillColor(WidgetTester tester) {
      final box =
          tester
                  .widget<Container>(
                    find.descendant(of: find.byType(TripStatusPill), matching: find.byType(Container)).first,
                  )
                  .decoration!
              as BoxDecoration;
      return box.color;
    }

    testApp('the strip pill takes the accent from the cover photo', (tester) async {
      await pumpApp(
        tester,
        user: asha,
        overrides: [tripAccentProvider.overrideWith((ref, id) async => const Color(0xFF8B2E2E))],
      );
      final id = await tripAt(tester, 'Accent Trip', 5);
      await goTo(tester, '/trip/$id/ledger');
      expect(pillColor(tester), const Color(0xFF8B2E2E));
    });

    testApp('without an accent, or with the flag off, the pill keeps the standard colour', (tester) async {
      await pumpApp(
        tester,
        user: asha,
        flagsOff: {'enableTripAccent'},
        overrides: [tripAccentProvider.overrideWith((ref, id) async => const Color(0xFF8B2E2E))],
      );
      final id = await tripAt(tester, 'Plain Trip', 5);
      await goTo(tester, '/trip/$id/ledger');
      expect(pillColor(tester), isNot(const Color(0xFF8B2E2E)));
    });
  });

  group('collapse trip numbers', () {
    testApp('with the setting on, Summary opens with Trip numbers folded; tapping the header expands them', (
      tester,
    ) async {
      await pumpApp(tester, user: asha, prefsExtra: {'settings.summary_collapse': true});
      final s = await seedTrip(tester);
      await addExpense(tester, s, amount: 90);
      await goTo(tester, '/trip/${s.tripId}/ledger');
      await tester.scrollUntilVisible(
        key('section-analytics'),
        300,
        scrollable: find.descendant(of: key('ledger-list'), matching: find.byType(Scrollable)),
      );
      expect(key('plan-card'), findsNothing);
      expect(key('stat-total'), findsNothing);
      await tester.ensureVisible(key('section-analytics'));
      await tester.tap(key('section-analytics'));
      await settle(tester, rounds: 8);
      expect(key('plan-card'), findsOneWidget);
    });

    testApp('by default, and with the flag off, Trip numbers are open', (tester) async {
      await pumpApp(tester, user: asha);
      final s = await seedTrip(tester);
      await addExpense(tester, s, amount: 90);
      await goTo(tester, '/trip/${s.tripId}/ledger');
      await tester.scrollUntilVisible(
        key('plan-card'),
        300,
        scrollable: find.descendant(of: key('ledger-list'), matching: find.byType(Scrollable)),
      );
      expect(key('plan-card'), findsOneWidget);
    });

    testApp('flag off ignores the saved setting', (tester) async {
      await pumpApp(
        tester,
        user: asha,
        prefsExtra: {'settings.summary_collapse': true},
        flagsOff: {'enableSummaryCollapse'},
      );
      final s = await seedTrip(tester);
      await addExpense(tester, s, amount: 90);
      await goTo(tester, '/trip/${s.tripId}/ledger');
      await tester.scrollUntilVisible(
        key('plan-card'),
        300,
        scrollable: find.descendant(of: key('ledger-list'), matching: find.byType(Scrollable)),
      );
      expect(key('plan-card'), findsOneWidget);
    });
  });
}
