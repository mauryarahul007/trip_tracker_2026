import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:trip_tracker/app/router.dart';
import 'package:trip_tracker/data/local/app_database.dart';
import 'package:trip_tracker/data/providers.dart';
import 'package:trip_tracker/data/sync/conflict_store.dart';
import 'package:trip_tracker/domain/logic/sync_merge.dart';
import 'package:trip_tracker/features/expenses/presentation/closeout_sheet.dart';
import 'package:trip_tracker/features/expenses/presentation/conflict_sheet.dart';
import 'package:trip_tracker/features/expenses/presentation/trip_tools_sheet.dart';
import 'package:trip_tracker/features/expenses/presentation/widgets/expense_detail_sheet.dart';
import 'package:trip_tracker/features/trips/presentation/widgets/share_trip_sheet.dart';
import 'package:trip_tracker/shared/widgets/app_sheet.dart';

import '../support/pump_app.dart';
import '../support/seed.dart';

void main() {
  group('Horizon PR 3: trip pages and sheets (flag enableHorizonUi)', () {
    Future<void> open(WidgetTester tester, Widget sheet) async {
      unawaited(AppSheet.show<void>(context: tester.element(find.byType(Scaffold).first), builder: (_) => sheet));
      await settle(tester, rounds: 6);
    }

    Future<(Seed, String)> setup(
      WidgetTester tester, {
      bool horizon = true,
      String? joinCode,
      bool legacy = true,
    }) async {
      await pumpApp(tester, user: asha, legacyNav: legacy, flagsOn: {if (horizon) 'enableHorizonUi'});
      final s = await seedTrip(tester);
      if (joinCode != null) {
        await real(tester, () async {
          final db = containerOf(tester).read(appDatabaseProvider);
          await db.customStatement(
            "UPDATE trips SET domain_json = json_set(domain_json, '\$.joinCode', ?) WHERE id = ?",
            [joinCode, s.tripId],
          );
        });
      }
      final id = await addExpense(tester, s, title: 'Scuba', amount: 90);
      containerOf(tester).read(routerProvider).go('/trip/${s.tripId}/expenses');
      await settle(tester, rounds: 12);
      return (s, id);
    }

    testApp('Trip settings: one rules card, state rows and a Delete trip card', (tester) async {
      final (s, _) = await setup(tester);
      unawaited(containerOf(tester).read(routerProvider).push<void>('/trip/${s.tripId}/settings'));
      await settle(tester, rounds: 10);
      expect(find.byKey(const Key('trip-currency')), findsOneWidget);
      expect(find.text('Removes it for all 3 people'), findsOneWidget);
      expect(find.text('Lock edits after settling'), findsOneWidget);
      await tester.tap(find.byKey(const Key('trip-freeze')));
      await settle(tester, rounds: 6);
      expect(find.text('Frozen. Tap to unfreeze'), findsOneWidget);
      await tester.tap(find.byKey(const Key('trip-close')));
      await settle(tester, rounds: 6);
      expect(find.byKey(const Key('horizon-closeout')), findsOneWidget);
    });

    testApp('Close out lists the checks and Freeze and close freezes the trip', (tester) async {
      final (s, _) = await setup(tester);
      await open(tester, CloseoutSheet(tripId: s.tripId));
      expect(find.byKey(const Key('closeout-settled')), findsOneWidget);
      expect(find.text('2 payments still open'), findsOneWidget);
      expect(find.text('1 expense without a receipt'), findsOneWidget);
      expect(find.byKey(const Key('closeout-freeze-note')), findsOneWidget);
      await tester.tap(find.byKey(const Key('closeout-lock')));
      await settle(tester, rounds: 6);
      final trip = await real(tester, () => containerOf(tester).read(tripRepositoryProvider).watchTrip(s.tripId).first);
      expect(trip!.closed, isTrue);
      expect(trip.frozen, isTrue);
    });

    testApp('Invite shows the code beside the QR, with WhatsApp and Copy link', (tester) async {
      final (s, _) = await setup(tester, joinCode: 'GOA7MX');
      await open(tester, ShareTripSheet(tripId: s.tripId));
      expect(find.byKey(const Key('horizon-invite')), findsOneWidget);
      expect(find.text('GOA7MX'), findsOneWidget);
      expect(find.byKey(const Key('invite-copy-code')), findsOneWidget);
      expect(find.byKey(const Key('invite-whatsapp')), findsOneWidget);
      expect(find.byKey(const Key('invite-copy-link')), findsOneWidget);
    });

    testApp('Sync conflict shows yours and theirs side by side', (tester) async {
      final (s, id) = await setup(tester);
      final c = containerOf(tester);
      final e = (await real(tester, () => c.read(expenseRepositoryProvider).watchActive(s.tripId).first)).first;
      c.read(conflictStoreProvider.notifier).setForTrip(s.tripId, [
        ExpenseConflict(id, e, e.copyWith(amount: 120), 'updateExpense'),
      ]);
      await open(tester, ConflictSheet(tripId: s.tripId));
      expect(find.byKey(Key('conflict-yours-$id')), findsOneWidget);
      expect(find.byKey(Key('conflict-server-$id')), findsOneWidget);
      expect(find.descendant(of: find.byKey(Key('conflict-yours-$id')), matching: find.text('₹90.00')), findsOneWidget);
      expect(
        find.descendant(of: find.byKey(Key('conflict-server-$id')), matching: find.text('₹120.00')),
        findsOneWidget,
      );
      await tester.tap(find.byKey(Key('conflict-mine-$id')));
      await settle(tester, rounds: 4);
      expect(c.read(conflictStoreProvider)[s.tripId] ?? const [], isEmpty);
    });

    testApp('Expense detail: paid and split rows, shares on tap, the rest under More', (tester) async {
      final (s, id) = await setup(tester);
      await open(tester, ExpenseDetailSheet(tripId: s.tripId, expenseId: id, onEdit: () {}, onDelete: () {}));
      expect(find.byKey(const Key('horizon-detail')), findsOneWidget);
      expect(find.text('Asha paid'), findsOneWidget);
      expect(find.text('Split equally'), findsOneWidget);
      expect(find.text('3 people · ₹30.00 each'), findsOneWidget);
      expect(find.byKey(Key('share-${s.ben}')), findsNothing);
      await tester.tap(find.byKey(const Key('detail-split-row')));
      await settle(tester, rounds: 2);
      expect(find.byKey(Key('share-${s.ben}')), findsOneWidget);
      expect(find.byKey(const Key('detail-delete')), findsOneWidget);
      await tester.ensureVisible(find.byKey(const Key('detail-more')));
      await tester.tap(find.byKey(const Key('detail-more')));
      await settle(tester, rounds: 2);
      expect(find.text('Paid by'), findsOneWidget);
    });

    testApp('Filter spend: date switch and involves-me toggle', (tester) async {
      final (_, _) = await setup(tester);
      await tester.tap(find.byKey(const Key('open-filters')));
      await settle(tester, rounds: 6);
      expect(find.byKey(const Key('horizon-filters')), findsOneWidget);
      expect(find.text('Filter spend'), findsOneWidget);
      expect(find.text('Show 1'), findsOneWidget);
      await tester.tap(find.byKey(const Key('filter-dates-today')));
      await settle(tester, rounds: 2);
      expect(find.text('Show 0'), findsOneWidget);
      await tester.tap(find.byKey(const Key('filter-dates-custom')));
      await settle(tester, rounds: 2);
      expect(find.byKey(const Key('filter-date-from')), findsOneWidget);
    });

    testApp('Hub tiles carry live facts and Tools ends with Trip Wrapped', (tester) async {
      final (s, _) = await setup(tester, legacy: false);
      containerOf(tester).read(routerProvider).go('/trip/${s.tripId}/hub');
      await settle(tester, rounds: 10);
      expect(find.text('People'), findsWidgets);
      expect(find.text('3 members'), findsOneWidget);
      expect(find.text('Food is 100%'), findsOneWidget);
      await open(tester, TripToolsSheet(tripId: s.tripId));
      expect(find.byKey(const Key('horizon-tools')), findsOneWidget);
      expect(find.text('Export spreadsheet'), findsOneWidget);
    });

    testApp('Flag off keeps the old trip settings, detail and conflict layouts', (tester) async {
      final (s, id) = await setup(tester, horizon: false);
      await open(tester, ExpenseDetailSheet(tripId: s.tripId, expenseId: id, onEdit: () {}, onDelete: () {}));
      expect(find.byKey(const Key('horizon-detail')), findsNothing);
      Navigator.of(tester.element(find.byType(ExpenseDetailSheet))).pop();
      await settle(tester);
      await open(tester, CloseoutSheet(tripId: s.tripId));
      expect(find.byKey(const Key('horizon-closeout')), findsNothing);
      expect(find.byKey(const Key('closeout-review')), findsOneWidget);
    });
  });
}
