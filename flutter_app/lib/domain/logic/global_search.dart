import '../models/expense.dart';
import '../models/trip.dart';

enum HitKind { expense, note }

/// One match found inside a trip (not the trip itself).
class SearchHit {
  const SearchHit({
    required this.kind,
    required this.tripId,
    required this.tripName,
    required this.title,
    required this.detail,
    this.amount,
    this.currency,
  });
  final HitKind kind;
  final String tripId;
  final String tripName;
  final String title;
  final String detail;
  final double? amount;
  final String? currency;
}

/// Expenses (by title) and notes (by title or text) across [trips] that contain [query], newest expenses first.
/// Settlements and deleted expenses are not hits. Empty query: no hits.
List<SearchHit> searchHits(String query, Iterable<Trip> trips, Iterable<Expense> expenses, {int max = 25}) {
  final q = query.trim().toLowerCase();
  if (q.isEmpty) return const [];
  final byId = {for (final t in trips) t.id: t};
  final hits = <SearchHit>[];
  final sorted = expenses.where((e) => !e.isSettlement && e.deletedAt == null && byId.containsKey(e.tripId)).toList()
    ..sort((a, b) => b.date.compareTo(a.date));
  for (final e in sorted) {
    if (e.title.toLowerCase().contains(q)) {
      hits.add(
        SearchHit(
          kind: HitKind.expense,
          tripId: e.tripId,
          tripName: byId[e.tripId]!.name,
          title: e.title,
          detail: e.date,
          amount: e.amount,
          currency: e.currency,
        ),
      );
    }
  }
  for (final t in trips) {
    for (final n in t.notes) {
      if (n.title.toLowerCase().contains(q) || n.content.toLowerCase().contains(q)) {
        hits.add(SearchHit(kind: HitKind.note, tripId: t.id, tripName: t.name, title: n.title, detail: ''));
      }
    }
  }
  return hits.take(max).toList();
}
