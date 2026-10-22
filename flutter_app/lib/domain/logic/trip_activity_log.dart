import '../models/expense.dart';
import '../models/member.dart';
import '../models/notification_item.dart';
import '../models/trip_message.dart';

const _maxLogItems = 200;
const _editGapMs = 60 * 1000;

String _iso(int ms) => DateTime.fromMillisecondsSinceEpoch(ms, isUtc: true).toIso8601String();

/// The trip's own history as read-only Activity rows: expenses (incl. your own), refunds, settlements, edits,
/// recent deletions and chat. Rows are marked read; ids start with `log-`. Anything [notifications] already
/// covers (same type and title/preview) is skipped so it shows once.
List<NotificationItem> buildTripActivityLog({
  required String tripId,
  required Iterable<Expense> expenses,
  required Iterable<Expense> recycled,
  required Iterable<TripMessage> messages,
  required Iterable<Member> members,
  required Iterable<NotificationItem> notifications,
}) {
  final names = {for (final m in members) m.id: m.name};
  final seen = <String>{
    for (final n in notifications) '${n.data?['type']}|${n.data?['expenseTitle'] ?? n.data?['preview']}',
  };
  final out = <NotificationItem>[];

  void add(String id, String type, int at, Map<String, dynamic> data, {String body = ''}) {
    final key = '$type|${data['expenseTitle'] ?? data['preview']}';
    if (seen.contains(key)) return;
    out.add(
      NotificationItem(
        id: 'log-$id',
        tripId: tripId,
        title: '',
        body: body,
        data: {'type': type, ...data},
        read: true,
        createdAt: _iso(at),
      ),
    );
  }

  Map<String, dynamic> money(Expense e, [String kind = 'expense']) => {
    'expenseTitle': e.title,
    'amount': '${e.amount}',
    'currency': e.currency,
    'targetKind': kind,
    'targetId': e.id,
  };

  for (final e in expenses) {
    if (e.tripId != tripId) continue;
    final refund = e.refundOfExpenseId != null;
    add('add-${e.id}', refund ? 'expense_refunded' : 'expense_added', e.createdAt, money(e));
    if (!refund && !e.isSettlement && e.updatedAt - e.createdAt > _editGapMs) {
      add('edit-${e.id}', 'expense_updated', e.updatedAt, money(e));
    }
  }
  for (final e in recycled) {
    if (e.tripId == tripId && e.deletedAt != null) add('del-${e.id}', 'expense_deleted', e.deletedAt!, money(e, 'bin'));
  }
  for (final m in messages) {
    if (m.tripId != tripId || m.deletedAt != null || (m.eventKind != null && m.eventKind != 'text')) continue;
    add('msg-${m.id}', 'chat_message', m.createdAt, {
      'senderName': names[m.memberId] ?? 'Someone',
      'preview': m.body,
      'targetKind': 'message',
      'targetId': m.id,
    });
  }
  out.sort((a, b) => b.createdAt.compareTo(a.createdAt));
  return out.take(_maxLogItems).toList();
}

/// What tapping [n] should open: the log rows carry it; notifications are matched by expense title or message
/// text. Null when nothing matches (the caller then opens the tab).
({String kind, String id})? activityTargetOf(
  NotificationItem n,
  Iterable<Expense> expenses,
  Iterable<TripMessage> messages,
) {
  final d = n.data;
  if (d?['targetId'] != null) return (kind: d!['targetKind'] as String, id: d['targetId'] as String);
  final type = d?['type'];
  if (type == 'chat_message') {
    final m = messages.where((m) => m.deletedAt == null && m.body == d?['preview']).lastOrNull;
    return m == null ? null : (kind: 'message', id: m.id);
  }
  if (type is String && type.startsWith('expense_') && type != 'expense_deleted') {
    final e = expenses.where((e) => e.tripId == n.tripId && e.title == d?['expenseTitle']).lastOrNull;
    return e == null ? null : (kind: 'expense', id: e.id);
  }
  return null;
}
