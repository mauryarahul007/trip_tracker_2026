import 'package:drift/drift.dart' show Value;
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:trip_tracker/data/local/app_database.dart';
import 'package:trip_tracker/data/providers.dart';
import 'package:trip_tracker/domain/logic/expense_form_logic.dart';
import 'package:trip_tracker/domain/logic/notifications.dart';
import 'package:trip_tracker/domain/models/notification_item.dart';

import '../support/pump_app.dart';
import '../support/seed.dart';

Finder key(String k) => find.byKey(Key(k));

Future<void> goTo(WidgetTester tester, String path) async {
  await settle(tester);
  GoRouter.of(tester.element(find.byType(Scaffold).first)).go(path);
  await settle(tester, rounds: 14);
}

String appBarTitle(WidgetTester tester) =>
    tester.widget<Text>(find.descendant(of: find.byType(AppBar), matching: find.byType(Text)).first).data ?? '';

const compassOn = {'enableCompassNav', 'enableCompassSpend', 'enableCompassMoney'};

Future<void> clearNotes(WidgetTester t) async {
  final db = containerOf(t).read(appDatabaseProvider);
  await real(t, () => db.delete(db.notificationsTable).go());
}

Future<void> note(WidgetTester t, String id, String type, String tripId, {bool read = false}) async {
  final db = containerOf(t).read(appDatabaseProvider);
  await real(
    t,
    () => db
        .into(db.notificationsTable)
        .insertOnConflictUpdate(
          NotificationsTableCompanion.insert(
            id: id,
            userId: 'u1',
            tripId: Value(tripId),
            title: 'Goa Weekend',
            body: '',
            dataJson: Value('{"type":"$type","expenseTitle":"Item $id","senderName":"Ben","memberName":"Ben"}'),
            read: Value(read),
            createdAt: DateTime.now().toUtc().toIso8601String(),
          ),
        ),
  );
}

Future<void> openActivity(WidgetTester tester, String tripId) async {
  await goTo(tester, '/trip/$tripId/ledger');
  await tester.tap(find.descendant(of: key('compass-dock'), matching: find.text('Activity')));
  await settle(tester, rounds: 14);
}

void main() {
  group('Activity filters', () {
    NotificationItem n(String type, {bool read = false}) => NotificationItem(
      id: type,
      title: '',
      body: '',
      data: {'type': type},
      read: read,
      createdAt: '2026-10-06T00:00:00Z',
    );

    test('Money covers expenses and settlements, People joins, Chat messages; tips only show under All', () {
      for (final t in [
        'expense_added',
        'expense_updated',
        'expense_deleted',
        'expense_restored',
        'settlement',
        'settle',
        'settlement_reminder',
        'settlement_confirmation_requested',
      ]) {
        expect(matchesActivityFilter(n(t), ActivityFilter.money), isTrue, reason: t);
        expect(matchesActivityFilter(n(t), ActivityFilter.people), isFalse, reason: t);
      }
      for (final t in ['member_added', 'member_added_notice', 'member_joined']) {
        expect(matchesActivityFilter(n(t), ActivityFilter.people), isTrue, reason: t);
        expect(matchesActivityFilter(n(t), ActivityFilter.money), isFalse, reason: t);
      }
      expect(matchesActivityFilter(n('chat_message'), ActivityFilter.chat), isTrue);
      expect(matchesActivityFilter(n('chat_message'), ActivityFilter.money), isFalse);
      expect(matchesActivityFilter(n('lifecycle_nudge'), ActivityFilter.money), isFalse);
      expect(matchesActivityFilter(n('lifecycle_nudge'), ActivityFilter.all), isTrue);
    });

    test('Unread hides what was read', () {
      expect(matchesActivityFilter(n('expense_added', read: true), ActivityFilter.unread), isFalse);
      expect(matchesActivityFilter(n('expense_added'), ActivityFilter.unread), isTrue);
    });
  });

  group('Compass Activity tab', () {
    testApp('chips filter the list: Money, People, Chat, Unread', (tester) async {
      await pumpApp(tester, user: asha, flagsOn: compassOn);
      final s = await seedTrip(tester);
      await clearNotes(tester);
      await note(tester, 'm1', 'expense_added', s.tripId);
      await note(tester, 'm2', 'settlement', s.tripId);
      await note(tester, 'p1', 'member_joined', s.tripId);
      await note(tester, 'c1', 'chat_message', s.tripId, read: true);
      await openActivity(tester, s.tripId);
      int rows() =>
          find.byWidgetPredicate((w) => w is Dismissible && '${w.key}'.contains('dismiss-')).evaluate().length;
      expect(rows(), 4);
      await tester.ensureVisible(key('activity-filter-money'));
      await tester.tap(key('activity-filter-money'));
      await settle(tester);
      expect(rows(), 2);
      await tester.ensureVisible(key('activity-filter-people'));
      await tester.tap(key('activity-filter-people'));
      await settle(tester);
      expect(rows(), 1);
      await tester.ensureVisible(key('activity-filter-chat'));
      await tester.tap(key('activity-filter-chat'));
      await settle(tester);
      expect(rows(), 1);
      await tester.ensureVisible(key('activity-filter-unread'));
      await tester.tap(key('activity-filter-unread'));
      await settle(tester);
      expect(rows(), 3);
    });

    testApp('a chat update offers Reply right on the row', (tester) async {
      await pumpApp(tester, user: asha, flagsOn: compassOn);
      final s = await seedTrip(tester);
      await clearNotes(tester);
      await note(tester, 'c1', 'chat_message', s.tripId);
      await openActivity(tester, s.tripId);
      expect(key('activity-reply-c1'), findsOneWidget);
    });

    testApp('an empty chip says what it is waiting for', (tester) async {
      await pumpApp(tester, user: asha, flagsOn: compassOn);
      final s = await seedTrip(tester);
      await clearNotes(tester);
      await note(tester, 'c1', 'chat_message', s.tripId);
      await openActivity(tester, s.tripId);
      await tester.ensureVisible(key('activity-filter-money'));
      await tester.tap(key('activity-filter-money'));
      await settle(tester);
      expect(find.text('No money updates yet'), findsOneWidget);
    });

    testApp('Delete all asks first, then clears only this trip', (tester) async {
      await pumpApp(tester, user: asha, flagsOn: compassOn);
      final s = await seedTrip(tester);
      final other = await real(
        tester,
        () => containerOf(tester)
            .read(tripRepositoryProvider)
            .createTrip(
              name: 'Other',
              startDate: '2026-11-01',
              endDate: '2026-11-03',
              baseCurrency: 'INR',
              ownerId: 'u1',
              creatorName: 'Asha',
            ),
      );
      await clearNotes(tester);
      await note(tester, 'a', 'expense_added', s.tripId);
      await note(tester, 'b', 'chat_message', s.tripId);
      await note(tester, 'z', 'expense_added', other);
      await openActivity(tester, s.tripId);
      await tester.tap(key('activity-delete-all'));
      await settle(tester);
      expect(find.text('Delete all activity?'), findsOneWidget);
      await tester.tap(find.text('Delete all'));
      await settle(tester, rounds: 12);
      expect(find.text('No activity yet'), findsOneWidget);
      final db = containerOf(tester).read(appDatabaseProvider);
      final left = await real(tester, () => db.select(db.notificationsTable).get());
      expect(left.map((r) => r.id), ['z']);
    });
  });

  group('Trip menu moved into the Trip tab', () {
    testApp('Compass nav: no top-right menu; the hub has Edit trip, Route map, App settings', (tester) async {
      await pumpApp(tester, user: asha, flagsOn: compassOn);
      final s = await seedTrip(tester);
      await goTo(tester, '/trip/${s.tripId}/ledger');
      expect(key('action-trip-more'), findsNothing);
      await tester.tap(find.descendant(of: key('compass-dock'), matching: find.text('Trip')));
      await settle(tester, rounds: 14);
      for (final k in [
        'hub-edit',
        'hub-map',
        'hub-mute',
        'hub-app-settings',
        'hub-invite',
        'hub-live',
        'hub-settings',
      ]) {
        await tester.ensureVisible(key(k));
        expect(key(k), findsOneWidget, reason: k);
      }
    });

    testApp('flag off: the old menu is still there', (tester) async {
      await pumpApp(tester, user: asha);
      final s = await seedTrip(tester);
      await goTo(tester, '/trip/${s.tripId}/ledger');
      expect(key('action-trip-more'), findsOneWidget);
    });
  });

  group('Switching trips', () {
    testApp('picking another trip replaces every tab with that trip, not just the page you were on', (tester) async {
      await pumpApp(tester, user: asha, flagsOn: compassOn);
      final a = await seedTrip(tester);
      await addExpense(tester, a, title: 'Alpha dinner');
      final b = await real(
        tester,
        () => containerOf(tester)
            .read(tripRepositoryProvider)
            .createTrip(
              name: 'Bravo Trip',
              startDate: '2026-11-01',
              endDate: '2026-11-03',
              baseCurrency: 'INR',
              ownerId: 'u1',
              creatorName: 'Asha',
            ),
      );
      final db = containerOf(tester).read(appDatabaseProvider);
      final bMe = (await real(tester, () => db.select(db.membersTable).get())).firstWhere((m) => m.tripId == b).id;
      final r = await real(
        tester,
        () => containerOf(tester)
            .read(expenseRepositoryProvider)
            .submit(
              ExpenseSubmission(
                title: 'Bravo breakfast',
                amount: 90,
                currency: 'INR',
                category: 'cat-food',
                date: '2026-11-02',
                paidBy: bMe,
                splitMode: 'equal',
                splitMemberIds: [bMe],
              ),
              tripId: b,
              userId: 'u1',
            ),
      );
      expect(r.isOk, isTrue, reason: r.error);
      // Visit Spend on Trip A so that tab is alive, then come back to Balances and switch from there.
      await goTo(tester, '/trip/${a.tripId}/expenses');
      expect(find.text('Alpha dinner'), findsWidgets);
      await tester.tap(find.descendant(of: key('compass-dock'), matching: find.text('Balances')));
      await settle(tester, rounds: 12);
      await tester.tap(key('trip-title-actions'));
      await settle(tester, rounds: 8);
      await tester.tap(key('switch-to-$b'));
      await settle(tester, rounds: 16);
      expect(appBarTitle(tester), 'Bravo Trip');
      await tester.tap(find.descendant(of: key('compass-dock'), matching: find.text('Spend')));
      await settle(tester, rounds: 14);
      expect(find.text('Bravo breakfast'), findsWidgets);
      expect(find.text('Alpha dinner'), findsNothing);
    });
  });
}
