import 'package:flutter_test/flutter_test.dart';
import 'package:trip_tracker/domain/logic/notifications.dart';
import 'package:trip_tracker/domain/logic/trip_activity_log.dart';
import 'package:trip_tracker/domain/models/expense.dart';
import 'package:trip_tracker/domain/models/member.dart';
import 'package:trip_tracker/domain/models/notification_item.dart';
import 'package:trip_tracker/domain/models/trip_message.dart';

Expense ex(String id, String title, double amt, int at, {String? refundOf, int? updated, int? deleted}) => Expense(
  id: id,
  tripId: 't',
  title: title,
  amount: amt,
  currency: 'INR',
  category: 'c',
  date: '2026-10-01',
  paidBy: 'm1',
  splitMode: 'equal',
  splitMemberIds: const ['m1'],
  resolvedShares: {'m1': amt},
  createdAt: at,
  updatedAt: updated ?? at,
  refundOfExpenseId: refundOf,
  deletedAt: deleted,
);

void main() {
  targetTests();
  const members = [Member(id: 'm1', name: 'Rahul', tripId: 't')];
  List<NotificationItem> run({List<NotificationItem> notes = const []}) => buildTripActivityLog(
    tripId: 't',
    expenses: [
      ex('e1', 'Stay', 4202, 1000, updated: 500000),
      ex('r1', 'Refund: Stay', 800, 2000, refundOf: 'e1'),
    ],
    recycled: [ex('e2', 'Taxi', 90, 500, deleted: 3000)],
    messages: const [
      TripMessage(id: 'c1', tripId: 't', memberId: 'm1', body: 'hi', createdAt: 4000),
      TripMessage(id: 'c2', tripId: 't', memberId: 'm1', body: 'card', eventKind: 'expense_added', createdAt: 4100),
    ],
    members: members,
    notifications: notes,
  );

  test('own expense, edit, refund, delete and chat all appear, newest first', () {
    final types = run().map((n) => n.data!['type']).toList();
    expect(types.toSet(), {'expense_added', 'expense_updated', 'expense_refunded', 'expense_deleted', 'chat_message'});
    expect(run().every((n) => n.id.startsWith('log-') && n.read), isTrue);
    expect(run().first.data!['type'], 'expense_updated');
    expect(run().where((n) => n.data!['type'] == 'chat_message'), hasLength(1));
    expect(activityKindOf('expense_refunded'), ActivityFilter.money);
  });

  test('skips what a notification already shows', () {
    const note = NotificationItem(
      id: 'n',
      tripId: 't',
      title: '',
      body: '',
      createdAt: 'x',
      data: {'type': 'expense_added', 'expenseTitle': 'Stay'},
    );
    expect(
      run(notes: [note]).where((n) => n.data!['expenseTitle'] == 'Stay' && n.data!['type'] == 'expense_added'),
      isEmpty,
    );
  });
}

void targetTests() {
  group('activityTargetOf', () {
    test('log rows carry their target; notifications match by title or text', () {
      final log = buildTripActivityLog(
        tripId: 't',
        expenses: [ex('e1', 'Stay', 10, 1000)],
        recycled: [ex('e2', 'Taxi', 9, 500, deleted: 3000)],
        messages: const [TripMessage(id: 'c1', tripId: 't', memberId: 'm1', body: 'hi', createdAt: 4000)],
        members: const [Member(id: 'm1', name: 'Rahul', tripId: 't')],
        notifications: const [],
      );
      Map<String, String?> byType() => {
        for (final n in log) n.data!['type'] as String: activityTargetOf(n, const [], const [])?.kind,
      };
      expect(byType(), {'expense_added': 'expense', 'expense_deleted': 'bin', 'chat_message': 'message'});

      const note = NotificationItem(
        id: 'n',
        tripId: 't',
        title: '',
        body: '',
        createdAt: 'x',
        data: {'type': 'chat_message', 'preview': 'hi'},
      );
      const msg = TripMessage(id: 'c1', tripId: 't', memberId: 'm1', body: 'hi', createdAt: 1);
      expect(activityTargetOf(note, const [], const [msg])?.id, 'c1');
      expect(activityTargetOf(note, const [], const []), isNull);
    });
  });
}
