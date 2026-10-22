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

  Map<String, dynamic> money(Expense e) => {'expenseTitle': e.title, 'amount': '${e.amount}', 'currency': e.currency};

  for (final e in expenses) {
    if (e.tripId != tripId) continue;
    final refund = e.refundOfExpenseId != null;
    add('add-${e.id}', refund ? 'expense_refunded' : 'expense_added', e.createdAt, money(e));
    if (!refund && !e.isSettlement && e.updatedAt - e.createdAt > _editGapMs) {
      add('edit-${e.id}', 'expense_updated', e.updatedAt, money(e));
    }
  }
  for (final e in recycled) {
    if (e.tripId == tripId && e.deletedAt != null) add('del-${e.id}', 'expense_deleted', e.deletedAt!, money(e));
  }
  for (final m in messages) {
    if (m.tripId != tripId || m.deletedAt != null || (m.eventKind != null && m.eventKind != 'text')) continue;
    add('msg-${m.id}', 'chat_message', m.createdAt, {'senderName': names[m.memberId] ?? 'Someone', 'preview': m.body});
  }
  out.sort((a, b) => b.createdAt.compareTo(a.createdAt));
  return out.take(_maxLogItems).toList();
}
