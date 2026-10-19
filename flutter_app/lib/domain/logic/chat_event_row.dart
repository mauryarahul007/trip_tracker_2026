import 'passes_and_chat_cards.dart' show expenseEventBody;

/// Row for the `trip_messages` event card the web posts after an expense lands
/// or its dispute state changes (kinds: expense_added, settlement_recorded,
/// expense_disputed, expense_dispute_resolved). [id] is fixed up front so a
/// replayed write upserts the same card.
Map<String, dynamic> buildExpenseChatRow({
  required String id,
  required String tripId,
  required String memberId,
  required String kind,
  required String expenseId,
  required String title,
  required double amount,
  required String currency,
  String? note,
}) {
  final payload = <String, dynamic>{
    'expenseId': expenseId,
    'title': title,
    'amount': amount,
    'currency': currency,
    if (note != null && note.isNotEmpty) 'note': note,
  };
  return {
    'id': id,
    'trip_id': tripId,
    'member_id': memberId,
    'body': expenseEventBody(kind, {'title': title, 'amount': amount, 'currency': currency, 'note': note}),
    'kind': kind,
    'payload': payload,
  };
}
