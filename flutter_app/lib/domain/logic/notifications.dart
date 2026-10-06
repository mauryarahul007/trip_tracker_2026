import '../models/notification_item.dart';
import 'currency.dart';

const Map<String, String> notificationTypeHeadlines = {
  'expense_added': 'Expense Added',
  'expense_updated': 'Expense Updated',
  'expense_deleted': 'Expense Deleted',
  'expense_restored': 'Expense Restored',
  'trip_deleted': 'Trip Deleted',
  'member_added': 'Member Added',
  'member_added_notice': 'Member Added',
  'member_joined': 'Member Joined',
  'settlement_reminder': 'Settlement Reminder',
  'settlement': 'Settlement Updated',
  'settle': 'Settlement Updated',
  'settlement_confirmation_requested': 'Confirm Settlement',
  'weather_itinerary_nudge': 'Weather Alert',
  'lifecycle_nudge': 'Trip Tip',
  'chat_message': 'New Message',
};

String getNotificationHeadline([String? type]) {
  if (type != null && notificationTypeHeadlines.containsKey(type)) {
    return notificationTypeHeadlines[type]!;
  }
  return 'Notification';
}

String _money(Object? amount, Object? currency) {
  final cur = currency?.toString() ?? '';
  final n = double.tryParse(amount?.toString() ?? '') ?? 0;
  return '$cur ${formatMoneyNumber(n, cur)}';
}

bool _has(Object? v) => v != null && v.toString().isNotEmpty;

/// Strips the legacy stored sentence ("X was deleted") down to the item name.
String _cleanFallbackBody(String body, String verb) {
  if (body.isEmpty) return 'Details unavailable';
  final t = body.trim();
  final pattern = switch (verb) {
    'deleted' => RegExp(r'^"?(.+?)"?\s+was deleted$', caseSensitive: false),
    'updated' => RegExp(r'^"?(.+?)"?\s+was updated$', caseSensitive: false),
    'restored' => RegExp(r'^"?(.+?)"?\s+was restored$', caseSensitive: false),
    _ => RegExp(r'^(.+?)\s+added$', caseSensitive: false),
  };
  return pattern.firstMatch(t)?.group(1) ?? t;
}

/// Port of web `renderNotificationBody`: body text from `type` + `data`,
/// falling back to the legacy stored sentence for rows that predate it.
String renderNotificationBody(NotificationItem n) {
  final d = n.data ?? const <String, dynamic>{};
  final body = n.body;
  String or(String fallback) => body.isNotEmpty ? body : fallback;
  switch (d['type']) {
    case 'expense_added':
      if (_has(d['expenseTitle']) && _has(d['currency']) && _has(d['amount'])) {
        return '${d['expenseTitle']} — ${_money(d['amount'], d['currency'])}';
      }
      if (_has(d['expenseTitle'])) return '${d['expenseTitle']}';
      return _cleanFallbackBody(body, 'added');
    case 'expense_updated':
      return _has(d['expenseTitle']) ? '${d['expenseTitle']}' : _cleanFallbackBody(body, 'updated');
    case 'expense_deleted':
      if (_has(d['expenseTitle'])) {
        return _has(d['currency']) && _has(d['amount'])
            ? '${d['expenseTitle']} — ${_money(d['amount'], d['currency'])}'
            : '${d['expenseTitle']}';
      }
      return _cleanFallbackBody(body, 'deleted');
    case 'expense_restored':
      return _has(d['expenseTitle']) ? '${d['expenseTitle']}' : _cleanFallbackBody(body, 'restored');
    case 'member_added':
      if (_has(d['tripName'])) return 'You were added to ${d['tripName']}';
      return n.title.isNotEmpty ? 'You were added to ${n.title}' : or('You were added to a trip');
    case 'member_added_notice':
      return _has(d['memberName']) ? '${d['memberName']} was added to the trip' : or('A member was added to the trip');
    case 'member_joined':
      return _has(d['memberName']) ? '${d['memberName']} joined the trip' : or('A member joined the trip');
    case 'settlement_reminder':
      if (_has(d['toLabel']) && _has(d['amount'])) {
        return 'You owe ${d['toLabel']} ${d['currency'] ?? ''}${d['amount']} for this trip';
      }
      return or('You have a pending settlement reminder');
    case 'settlement_confirmation_requested':
      if (_has(d['amount']) && _has(d['currency'])) {
        return 'Someone marked ${_money(d['amount'], d['currency'])} as paid to you — confirm you received it';
      }
      return or('Confirm a settlement paid to you');
    case 'weather_itinerary_nudge':
      return or('Rain looks likely tomorrow near your next stop — plan an indoor backup.');
    case 'trip_deleted':
      final name = _has(d['tripName']) ? d['tripName'] : (n.title.isNotEmpty ? n.title : 'Trip');
      return '"$name" was deleted';
    case 'chat_message':
      return _has(d['senderName']) && _has(d['preview'])
          ? '${d['senderName']}: ${d['preview']}'
          : or('New message in trip chat');
    default:
      return or('You have a new notification');
  }
}

/// Trip tab a notification opens (web opens the trip; native lands on the relevant tab).
String notificationTabFor(String? type) => switch (type) {
  'chat_message' => 'chat',
  'settlement' || 'settle' || 'settlement_reminder' || 'settlement_confirmation_requested' => 'ledger',
  'member_added' || 'member_added_notice' || 'member_joined' => 'members',
  _ => 'expenses',
};

const Set<String> moneyNotificationTypes = {
  'settlement',
  'settle',
  'settlement_reminder',
  'settlement_confirmation_requested',
};

bool isMoneyNotification(Map<String, dynamic> notification) {
  final data = notification['data'] as Map<String, dynamic>?;
  final type = data?['type'] as String? ?? '';
  return moneyNotificationTypes.contains(type);
}

const int burstWindowMs = 60 * 60 * 1000;

List<List<Map<String, dynamic>>> groupNotificationBursts(List<Map<String, dynamic>> list) {
  String key(Map<String, dynamic> n) {
    final tripId = (n['tripId'] ?? n['trip_id'] ?? '') as String;
    final data = n['data'] as Map<String, dynamic>?;
    final type = data?['type'] as String? ?? '';
    final sender = (data?['senderName'] ?? data?['memberName'] ?? '') as String;
    return '$tripId|$type|$sender';
  }

  final groups = <List<Map<String, dynamic>>>[];

  for (final n in list) {
    final last = groups.isNotEmpty ? groups.last : null;
    final prev = last != null && last.isNotEmpty ? last.last : null;
    final data = n['data'] as Map<String, dynamic>?;
    final type = data?['type'] as String? ?? '';

    final prevCreatedAt = prev != null
        ? DateTime.tryParse(prev['createdAt']?.toString() ?? prev['created_at']?.toString() ?? '')
              ?.millisecondsSinceEpoch
        : null;
    final curCreatedAt = DateTime.tryParse(n['createdAt']?.toString() ?? n['created_at']?.toString() ?? '')
        ?.millisecondsSinceEpoch;

    if (prev != null &&
        type != 'chat_message' &&
        key(prev) == key(n) &&
        prevCreatedAt != null &&
        curCreatedAt != null &&
        (prevCreatedAt - curCreatedAt).abs() <= burstWindowMs) {
      last!.add(n);
    } else {
      groups.add([n]);
    }
  }

  return groups;
}
