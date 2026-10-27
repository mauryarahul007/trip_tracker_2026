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

/// Expenses and notes across [trips] that match [query], newest expenses first. An expense matches on its title,
/// and with [rich] also on its place, the payer's name (from [memberNames], member id to name) or its amount (a
/// number like "1200" or "1,200" matches 1200 and 1200.50). Notes match on title or text. Settlements and deleted
/// expenses are not hits. Empty query: no hits.
List<SearchHit> searchHits(
  String query,
  Iterable<Trip> trips,
  Iterable<Expense> expenses, {
  int max = 25,
  bool rich = false,
  Map<String, String> memberNames = const {},
}) {
  final q = query.trim().toLowerCase();
  if (q.isEmpty) return const [];
  final byId = {for (final t in trips) t.id: t};
  final hits = <SearchHit>[];
  final sorted = expenses.where((e) => !e.isSettlement && e.deletedAt == null && byId.containsKey(e.tripId)).toList()
    ..sort((a, b) => b.date.compareTo(a.date));
  final number = rich ? double.tryParse(q.replaceAll(',', '')) : null;
  for (final e in sorted) {
    final place = e.location?.placeName ?? e.location?.pendingName;
    final payer = memberNames[e.paidBy];
    final byTitle = e.title.toLowerCase().contains(q);
    final byPlace = rich && place != null && place.toLowerCase().contains(q);
    final byPayer = rich && payer != null && payer.toLowerCase().contains(q);
    final byAmount = number != null && e.amount.floorToDouble() == number.floorToDouble();
    if (byTitle || byPlace || byPayer || byAmount) {
      final why = byTitle ? '' : (byPlace ? place : (byPayer ? 'Paid by $payer' : ''));
      hits.add(
        SearchHit(
          kind: HitKind.expense,
          tripId: e.tripId,
          tripName: byId[e.tripId]!.name,
          title: e.title,
          detail: why.isEmpty ? e.date : '${e.date} · $why',
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
