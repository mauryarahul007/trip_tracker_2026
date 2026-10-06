import 'package:flutter_test/flutter_test.dart';
import 'package:trip_tracker/domain/logic/notifications.dart';
import 'package:trip_tracker/domain/models/notification_item.dart';

NotificationItem n(Map<String, dynamic> data, {String title = 'Alps', String body = ''}) =>
    NotificationItem(id: 'n', title: title, body: body, data: data, createdAt: '2026-10-06T00:00:00Z');

void main() {
  group('renderNotificationBody (web parity)', () {
    test('expense with amount, title only, and legacy sentence', () {
      expect(
        renderNotificationBody(
          n({'type': 'expense_added', 'expenseTitle': 'Dinner', 'currency': 'USD', 'amount': '85'}),
        ),
        'Dinner — USD 85.00',
      );
      expect(renderNotificationBody(n({'type': 'expense_added', 'expenseTitle': 'Dinner'})), 'Dinner');
      expect(renderNotificationBody(n({'type': 'expense_deleted'}, body: '"Lunch" was deleted')), 'Lunch');
      expect(renderNotificationBody(n({'type': 'expense_updated'})), 'Details unavailable');
    });

    test('zero-decimal currency and settlement copy', () {
      expect(
        renderNotificationBody(n({'type': 'settlement_confirmation_requested', 'currency': 'JPY', 'amount': '1500'})),
        'Someone marked JPY 1,500 as paid to you — confirm you received it',
      );
      expect(
        renderNotificationBody(
          n({'type': 'settlement_reminder', 'toLabel': 'Alice', 'currency': 'USD', 'amount': '45.00'}),
        ),
        'You owe Alice USD45.00 for this trip',
      );
    });

    test('member, trip and chat fallbacks', () {
      expect(renderNotificationBody(n({'type': 'member_added'})), 'You were added to Alps');
      expect(renderNotificationBody(n({'type': 'member_joined'}, body: 'x')), 'x');
      expect(renderNotificationBody(n({'type': 'trip_deleted', 'tripName': 'Goa'})), '"Goa" was deleted');
      expect(renderNotificationBody(n({'type': 'chat_message', 'senderName': 'Al', 'preview': 'hi'})), 'Al: hi');
      expect(renderNotificationBody(n({'type': 'unknown'})), 'You have a new notification');
    });
  });

  test('notificationTabFor routes by type', () {
    expect(notificationTabFor('chat_message'), 'chat');
    expect(notificationTabFor('settlement_reminder'), 'ledger');
    expect(notificationTabFor('member_joined'), 'members');
    expect(notificationTabFor('expense_added'), 'expenses');
    expect(notificationTabFor(null), 'expenses');
  });
}
