import 'package:drift/drift.dart' show Value;
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:trip_tracker/data/local/app_database.dart';

import '../../support/pump_app.dart';
import '../../support/seed.dart';

Future<void> insert(
  WidgetTester t,
  String id,
  String type, {
  String? tripId,
  String at = '2026-10-06T10:00:00Z',
  bool read = false,
  String data = '',
}) async {
  final db = containerOf(t).read(appDatabaseProvider);
  await real(
    t,
    () => db
        .into(db.notificationsTable)
        .insertOnConflictUpdate(
          NotificationsTableCompanion.insert(
            id: id,
            userId: 'u1',
            tripId: tripId == null ? const Value.absent() : Value(tripId),
            title: 'Goa Weekend',
            body: '',
            dataJson: Value(data.isEmpty ? '{"type":"$type","expenseTitle":"Item $id","senderName":"Ben"}' : data),
            read: Value(read),
            createdAt: at,
          ),
        ),
  );
}

void main() {
  testApp('bell shows unread count; mark all read clears it', (tester) async {
    await pumpApp(tester, user: asha);
    final s = await seedTrip(tester);
    await insert(tester, 'a', 'expense_added', tripId: s.tripId);
    await insert(tester, 'b', 'chat_message', tripId: s.tripId, at: '2026-10-06T14:00:00Z');
    await settle(tester);
    await tester.tap(find.text('Goa Weekend'));
    await settle(tester, rounds: 12);

    expect(find.byKey(const Key('action-notifications')), findsOneWidget);
    expect(find.text('2'), findsOneWidget);

    await tester.tap(find.byKey(const Key('action-notifications')));
    await settle(tester, rounds: 12);
    expect(find.text('Expense Added'), findsOneWidget);
    expect(find.text('New Message'), findsOneWidget);

    await tester.tap(find.byKey(const Key('notifications-mark-all')));
    await settle(tester);
    final db = containerOf(tester).read(appDatabaseProvider);
    final rows = await real(tester, () => db.select(db.notificationsTable).get());
    expect(rows.every((r) => r.read), isTrue);
  });

  testApp('bursts fold behind "Show more" and Money chip filters', (tester) async {
    await pumpApp(tester, user: asha);
    final s = await seedTrip(tester);
    await insert(tester, 'a', 'expense_added', tripId: s.tripId, at: '2026-10-06T10:00:00Z');
    await insert(tester, 'b', 'expense_added', tripId: s.tripId, at: '2026-10-06T10:10:00Z');
    await insert(tester, 'c', 'settlement_reminder', tripId: s.tripId, at: '2026-10-06T14:00:00Z');
    await settle(tester);
    await tester.tap(find.text('Goa Weekend'));
    await settle(tester, rounds: 12);
    await tester.tap(find.byKey(const Key('action-notifications')));
    await settle(tester, rounds: 12);

    expect(find.text('Expense Added'), findsOneWidget); // two folded into one
    await tester.tap(find.byKey(const Key('group-toggle-b')));
    await settle(tester);
    expect(find.text('Expense Added'), findsNWidgets(2));

    await tester.tap(find.byKey(const Key('filter-kind-money')));
    await settle(tester);
    expect(find.text('Settlement Reminder'), findsOneWidget);
    expect(find.text('Expense Added'), findsNothing);
  });

  testApp('flag OFF: no Money chip and bursts are not folded', (tester) async {
    await pumpApp(tester, user: asha, flagsOff: {'enableNotificationGrouping'});
    final s = await seedTrip(tester);
    await insert(tester, 'a', 'expense_added', tripId: s.tripId, at: '2026-10-06T10:00:00Z');
    await insert(tester, 'b', 'expense_added', tripId: s.tripId, at: '2026-10-06T10:10:00Z');
    await settle(tester);
    await tester.tap(find.text('Goa Weekend'));
    await settle(tester, rounds: 12);
    await tester.tap(find.byKey(const Key('action-notifications')));
    await settle(tester, rounds: 12);

    expect(find.byKey(const Key('filter-kind-money')), findsNothing);
    expect(find.text('Expense Added'), findsNWidgets(2));
  });

  testApp('tapping a row marks it read and opens the trip tab; swipe deletes', (tester) async {
    await pumpApp(tester, user: asha);
    final s = await seedTrip(tester);
    await insert(tester, 'a', 'member_joined', tripId: s.tripId, data: '{"type":"member_joined","memberName":"Diana"}');
    await settle(tester);
    await tester.tap(find.text('Goa Weekend'));
    await settle(tester, rounds: 12);
    await tester.tap(find.byKey(const Key('action-notifications')));
    await settle(tester, rounds: 12);

    await tester.tap(find.textContaining('Diana joined the trip'));
    await settle(tester, rounds: 12);
    final db = containerOf(tester).read(appDatabaseProvider);
    expect((await real(tester, () => db.select(db.notificationsTable).get())).single.read, isTrue);
    expect(find.text('Members'), findsWidgets); // landed on the Members tab

    await tester.tap(find.byKey(const Key('action-notifications')));
    await settle(tester, rounds: 12);
    await tester.drag(find.byKey(const ValueKey('notif-a')), const Offset(-600, 0));
    await settle(tester, rounds: 12);
    expect(await real(tester, () => db.select(db.notificationsTable).get()), isEmpty);
    expect(find.text('No notifications'), findsOneWidget);
  });

  testApp('a notification arriving now pops the banner and swipes away; old rows do not', (tester) async {
    await pumpApp(tester, user: asha);
    final s = await seedTrip(tester);
    await insert(tester, 'old', 'expense_added', tripId: s.tripId);
    await settle(tester);
    expect(find.byKey(const Key('notification-banner')), findsNothing);

    await insert(tester, 'new', 'expense_added', tripId: s.tripId, at: DateTime.now().toUtc().toIso8601String());
    await settle(tester);
    expect(find.byKey(const Key('notification-banner')), findsOneWidget);
    await tester.drag(find.byKey(const Key('notification-banner')), const Offset(0, -200));
    await settle(tester);
    expect(find.byKey(const Key('notification-banner')), findsNothing);
  });
}
