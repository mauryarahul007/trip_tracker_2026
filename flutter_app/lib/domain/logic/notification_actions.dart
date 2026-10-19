import '../models/expense.dart';
import '../models/member.dart';

/// The settlement a "please confirm" notification is about, if [userId] is the one who must confirm it and it is
/// still unconfirmed. Matched by trip and title (the notification carries the title); the newest match wins.
Expense? settlementToConfirm({
  required String? tripId,
  required String? expenseTitle,
  required String? userId,
  required Iterable<Expense> expenses,
  required Iterable<Member> members,
}) {
  if (tripId == null || expenseTitle == null || userId == null) return null;
  final byId = {for (final m in members) m.id: m};
  final matches = expenses.where((e) {
    if (e.tripId != tripId || !e.isSettlement || e.deletedAt != null || e.settlementConfirmedAt != null) return false;
    if (e.title != expenseTitle || e.splitMemberIds.isEmpty) return false;
    return byId[e.splitMemberIds.first]?.linkedUserId == userId;
  }).toList()..sort((a, b) => b.createdAt.compareTo(a.createdAt));
  return matches.firstOrNull;
}
