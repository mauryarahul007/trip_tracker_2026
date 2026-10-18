import 'dart:convert';

import 'package:drift/drift.dart' show Value;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:trip_tracker/data/local/app_database.dart';
import 'package:trip_tracker/data/providers.dart';
import 'package:trip_tracker/features/expenses/application/expenses_providers.dart';
import 'package:trip_tracker/features/trips/application/trip_accent.dart';
import 'package:trip_tracker/features/trips/presentation/widgets/invite_card.dart';
import 'package:trip_tracker/features/trips/presentation/widgets/create_trip_sheet.dart' show dateRangePickerProvider;
import 'package:trip_tracker/features/trips/application/trips_providers.dart'
    show pendingTripIdsProvider, syncItemsProvider;
import 'package:trip_tracker/data/sync/outbox_store.dart' show OutboxItem;
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
    testApp('the trip name opens a list; picking a trip opens it on the same tab', (tester) async {
      await pumpApp(tester, user: asha);
      final later = await tripAt(tester, 'Later Trip', 20);
      final sooner = await tripAt(tester, 'Sooner Trip', 5);
      await goTo(tester, '/trip/$later/ledger');
      expect(appBarTitle(tester), 'Later Trip');
      expect(key('trip-prev'), findsNothing); // the old arrows are gone
      await tester.tap(key('trip-switcher'));
      await settle(tester, rounds: 8);
      expect(key('switch-to-$later'), findsOneWidget);
      await tester.tap(key('switch-to-$sooner'));
      await settle(tester, rounds: 12);
      expect(appBarTitle(tester), 'Sooner Trip');
      expect(find.byKey(const Key('ledger-list')), findsOneWidget); // still on Summary
    });

    testApp('no switcher with a single trip', (tester) async {
      await pumpApp(tester, user: asha);
      final only = await tripAt(tester, 'Only Trip', 5);
      await goTo(tester, '/trip/$only/ledger');
      expect(key('trip-switcher'), findsNothing);
    });

    testApp('switcher off: plain title even with two trips', (tester) async {
      await pumpApp(tester, user: asha, flagsOff: {'enableTripSwitcher'});
      final a = await tripAt(tester, 'A Trip', 5);
      await tripAt(tester, 'B Trip', 20);
      await goTo(tester, '/trip/$a/ledger');
      expect(key('trip-switcher'), findsNothing);
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
        key('numbers-tab-people'),
        300,
        scrollable: find.descendant(of: key('ledger-list'), matching: find.byType(Scrollable)),
      );
      await centre(tester, key('numbers-tab-people'));
      await tester.tap(key('numbers-tab-people'));
      await settle(tester, rounds: 6);
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
        key('numbers-tab-people'),
        300,
        scrollable: find.descendant(of: key('ledger-list'), matching: find.byType(Scrollable)),
      );
      await centre(tester, key('numbers-tab-people'));
      await tester.tap(key('numbers-tab-people'));
      await settle(tester, rounds: 6);
      expect(key('spend-ring'), findsNothing);
      expect(find.text('Who paid'), findsWidgets); // the bars are still there
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
      expect(key('trip-title'), findsOneWidget); // landed inside the trip
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
        flagsOn: {'enableTripHeaderStrip'},
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
        flagsOn: {'enableTripHeaderStrip'},
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

  group('expense history', () {
    Future<void> openDetail(WidgetTester tester, Seed s, String title) async {
      await goTo(tester, '/trip/${s.tripId}/expenses');
      await tester.tap(key('tab-menu'));
      await settle(tester);
      await tester.tap(find.text('Expand all days')); // rows start folded under their day
      await settle(tester);
      await tester.tap(find.text(title));
      await settle(tester, rounds: 8);
    }

    testApp('the detail sheet says who added the expense and when; "Edited" only after a real change', (tester) async {
      await pumpApp(tester, user: asha);
      final s = await seedTrip(tester);
      final id = await addExpense(tester, s, title: 'Moped', amount: 300);
      await openDetail(tester, s, 'Moped');
      expect(find.text('Added'), findsOneWidget);
      expect(find.textContaining('by Asha, '), findsOneWidget); // the history line, not "Paid by Asha"
      expect(find.text('Edited'), findsNothing);
      Navigator.of(tester.element(find.byKey(const Key('detail-title')))).pop();
      await settle(tester);

      final db = containerOf(tester).read(appDatabaseProvider);
      await real(tester, () async {
        final row = await (db.select(db.expensesTable)..where((t) => t.id.equals(id))).getSingle();
        final json = jsonDecode(row.domainJson!) as Map<String, dynamic>;
        json['updatedAt'] = (json['createdAt'] as num).toInt() + 3600000; // an hour later
        await (db.update(
          db.expensesTable,
        )..where((t) => t.id.equals(id))).write(ExpensesTableCompanion(domainJson: Value(jsonEncode(json))));
      });
      await settle(tester, rounds: 4);
      await tester.tap(find.text('Moped'));
      await settle(tester, rounds: 8);
      expect(find.text('Edited'), findsOneWidget);
    });

    testApp('no history line with its flag off', (tester) async {
      await pumpApp(tester, user: asha, flagsOff: {'enableExpenseHistory'});
      final s = await seedTrip(tester);
      await addExpense(tester, s, title: 'Moped', amount: 300);
      await openDetail(tester, s, 'Moped');
      expect(find.text('Added'), findsNothing);
    });
  });

  group('pending sync dot', () {
    testApp('a trip with unsynced changes shows the dot, in tiles and rows', (tester) async {
      await pumpApp(tester, user: asha);
      await seedTrip(tester);
      await goTo(tester, '/');
      expect(key('trip-pending-dot'), findsOneWidget); // photo tile
      await tester.tap(key('trips-layout-toggle'));
      await settle(tester, rounds: 6);
      expect(key('trip-pending-dot'), findsOneWidget); // compact row
    });

    testApp('no dot with its flag off', (tester) async {
      await pumpApp(tester, user: asha, flagsOff: {'enablePendingDots'});
      await seedTrip(tester);
      await goTo(tester, '/');
      expect(key('trip-pending-dot'), findsNothing);
    });

    test('the pending set follows the outbox: trips with queued changes, and none once it is empty', () async {
      OutboxItem item(String id, String? trip) => OutboxItem(
        id: id,
        type: 'updateTripState',
        tripId: trip,
        payload: const {},
        idempotencyKey: id,
        attempts: 0,
        status: 'pending',
        lastError: null,
        lastAttemptedAt: null,
      );
      final c = ProviderContainer(
        overrides: [
          syncItemsProvider.overrideWith((ref) => Stream.value([item('1', 't1'), item('2', 't1'), item('3', null)])),
        ],
      );
      addTearDown(c.dispose);
      c.listen(pendingTripIdsProvider, (_, _) {}); // keep it (and the stream under it) alive
      await pumpEventQueue();
      expect(c.read(pendingTripIdsProvider), {'t1'});
      final empty = ProviderContainer(overrides: [syncItemsProvider.overrideWith((ref) => Stream.value([]))]);
      addTearDown(empty.dispose);
      empty.listen(pendingTripIdsProvider, (_, _) {});
      await pumpEventQueue();
      expect(empty.read(pendingTripIdsProvider), isEmpty);
    });
  });

  group('trip templates', () {
    final picker = dateRangePickerProvider.overrideWithValue(
      (context, today, initial) async => DateTimeRange(start: DateTime(2026, 12, 1), end: DateTime(2026, 12, 5)),
    );

    Future<void> createWith(WidgetTester tester, {String? template}) async {
      await tester.tap(key('dock-center'));
      await settle(tester);
      if (template != null) {
        await tester.tap(key('template-$template'));
        await tester.pump();
      }
      await tester.enterText(find.byType(TextField).at(0), 'Coorg');
      await tester.enterText(find.byType(TextField).at(1), 'Coorg run');
      await tester.tap(find.byIcon(Icons.date_range_rounded));
      await settle(tester);
      await tester.tap(find.text('Create Trip').last);
      await settle(tester, rounds: 14);
    }

    testApp('a template adds its categories and starter checklist to the new trip', (tester) async {
      await pumpApp(tester, user: asha, overrides: [picker]);
      await createWith(tester, template: 'roadtrip');
      final trip = (await real(
        tester,
        () => containerOf(tester).read(tripRepositoryProvider).watchTrips().first,
      )).single;
      final cats = await real(tester, () => containerOf(tester).read(categoryRepositoryProvider).watch(trip.id).first);
      expect(cats.map((c) => c.name), containsAll(['Fuel', 'Tolls', 'Parking']));
      expect(trip.checklist.length, 6);
      expect(trip.checklist.map((i) => i.category), contains('documents'));
    });

    testApp('no template: the trip starts empty as before', (tester) async {
      await pumpApp(tester, user: asha, overrides: [picker]);
      await createWith(tester);
      final trip = (await real(
        tester,
        () => containerOf(tester).read(tripRepositoryProvider).watchTrips().first,
      )).single;
      expect(trip.checklist, isEmpty);
    });

    testApp('no template chips with the flag off', (tester) async {
      await pumpApp(tester, user: asha, flagsOff: {'enableTripTemplates'});
      await tester.tap(key('dock-center'));
      await settle(tester);
      expect(key('template-roadtrip'), findsNothing);
    });
  });

  group('two panes on wide screens', () {
    void wide(WidgetTester tester) {
      tester.view.physicalSize = const Size(1500, 900);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.reset);
    }

    testApp('wide: balance and plan on the left, who pays whom and Trip numbers on the right', (tester) async {
      await pumpApp(tester, user: asha);
      wide(tester);
      final s = await seedTrip(tester);
      await addExpense(tester, s, amount: 90);
      await goTo(tester, '/trip/${s.tripId}/ledger');
      expect(key('ledger-two-pane'), findsOneWidget);
      expect(find.descendant(of: key('ledger-list-left'), matching: key('sticky-balance')), findsOneWidget);
      expect(find.descendant(of: key('ledger-list'), matching: key('section-transfers')), findsOneWidget);
      expect(find.descendant(of: key('ledger-list-left'), matching: key('section-transfers')), findsNothing);
    });

    testApp('a phone keeps one column, and so does a wide screen with the flag off', (tester) async {
      await pumpApp(tester, user: asha);
      final s = await seedTrip(tester);
      await goTo(tester, '/trip/${s.tripId}/ledger');
      expect(key('ledger-two-pane'), findsNothing);
      expect(key('ledger-list'), findsOneWidget);
    });

    testApp('flag off: one column even when wide', (tester) async {
      await pumpApp(tester, user: asha, flagsOff: {'enableSummaryTwoPane'});
      wide(tester);
      final s = await seedTrip(tester);
      await goTo(tester, '/trip/${s.tripId}/ledger');
      expect(key('ledger-two-pane'), findsNothing);
    });
  });

  group('invite card', () {
    test('the file name is safe', () {
      expect(inviteCardFileName('Goa weekend'), 'invite_Goa_weekend.png');
      expect(inviteCardFileName('  Café / Beach!  '), 'invite_Caf__Beach.png');
      expect(inviteCardFileName(''), 'invite_trip.png');
    });

    testWidgets('the card renders to a png (with and without a photo)', (tester) async {
      final png = await tester.runAsync(
        () => renderInviteCardPng(
          tripName: 'Goa weekend',
          dates: '1–5 Dec',
          code: 'ABC123',
          link: 'https://app.test/join/ABC123',
          joinLabel: 'Join code',
          scanLabel: 'Scan to join',
        ),
      );
      expect(png!.length, greaterThan(1000));
      expect(png.sublist(0, 4), [0x89, 0x50, 0x4E, 0x47]); // a PNG file
    });

    Future<void> giveJoinCode(WidgetTester tester, String tripId) async {
      final db = containerOf(tester).read(appDatabaseProvider);
      await real(
        tester,
        () => db.customStatement(
          "UPDATE trips SET domain_json = json_set(domain_json, '\$.joinCode', 'ABC123') WHERE id = ?",
          [tripId],
        ),
      );
    }

    testApp('the share sheet offers the invite picture and shares a png', (tester) async {
      final app = await pumpApp(tester, user: asha);
      final s = await seedTrip(tester);
      await giveJoinCode(tester, s.tripId);
      await goTo(tester, '/trip/${s.tripId}/ledger');
      await tripMenu(tester, 'action-share');
      await settle(tester, rounds: 8);
      expect(key('share-invite-card'), findsOneWidget);
      await tester.tap(key('share-invite-card'));
      await tester.runAsync(() => Future<void>.delayed(const Duration(milliseconds: 800)));
      await settle(tester, rounds: 8);
      expect(app.shareService.pngs.single, startsWith('invite_'));
    });

    testApp('no invite picture button with the flag off', (tester) async {
      await pumpApp(tester, user: asha, flagsOff: {'enableInviteCard'});
      final s = await seedTrip(tester);
      await giveJoinCode(tester, s.tripId);
      await goTo(tester, '/trip/${s.tripId}/ledger');
      await tripMenu(tester, 'action-share');
      await settle(tester, rounds: 8);
      expect(find.byKey(const Key('join-code')), findsOneWidget); // the sheet is open
      expect(key('share-invite-card'), findsNothing);
    });
  });

  group('app icon shortcuts', () {
    testApp('Add expense opens the latest trip\'s form, and back lands on that trip', (tester) async {
      final app = await pumpApp(tester, user: asha);
      await seedTrip(tester);
      await settle(tester, rounds: 6);
      app.links.controller.add(Uri.parse('com.triptracker.app://shortcut/add-expense'));
      await settle(tester, rounds: 16);
      expect(key('amount-field'), findsOneWidget);
      await tester.binding.handlePopRoute();
      await settle(tester, rounds: 10);
      expect(key('trip-title'), findsOneWidget);
    });

    testApp('Latest trip opens it', (tester) async {
      final app = await pumpApp(tester, user: asha);
      await seedTrip(tester);
      await settle(tester, rounds: 6);
      app.links.controller.add(Uri.parse('com.triptracker.app://shortcut/latest-trip'));
      await settle(tester, rounds: 16);
      expect(key('trip-title'), findsOneWidget);
    });

    testApp('with no trips, or the flag off, the shortcut just opens the home screen', (tester) async {
      final app = await pumpApp(tester, user: asha);
      app.links.controller.add(Uri.parse('com.triptracker.app://shortcut/add-expense'));
      await settle(tester, rounds: 12);
      expect(key('amount-field'), findsNothing);
      expect(key('trip-title'), findsNothing);
    });

    testApp('flag off: even with a trip, the shortcut only opens home', (tester) async {
      final app = await pumpApp(tester, user: asha, flagsOff: {'enableAppShortcuts'});
      await seedTrip(tester);
      await settle(tester, rounds: 6);
      app.links.controller.add(Uri.parse('com.triptracker.app://shortcut/latest-trip'));
      await settle(tester, rounds: 12);
      expect(key('trip-title'), findsNothing);
    });
  });
}
