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

String renderNotificationBody(dynamic notificationOrType, [String? tripName, Map<String, dynamic>? params]) {
  if (notificationOrType is Map<String, dynamic>) {
    final data = notificationOrType['data'] as Map<String, dynamic>?;
    final type = data?['type'] as String?;
    final body = notificationOrType['body'] as String?;
    if (type == null) {
      return body ?? 'You have a new notification';
    }
  }
  // Fallback behavior matching JS when called with (type, tripName, params)
  return 'You have a new notification';
}

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
        ? DateTime.tryParse(prev['createdAt']?.toString() ?? prev['created_at']?.toString() ?? '')?.millisecondsSinceEpoch
        : null;
    final curCreatedAt = DateTime.tryParse(n['createdAt']?.toString() ?? n['created_at']?.toString() ?? '')?.millisecondsSinceEpoch;

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
