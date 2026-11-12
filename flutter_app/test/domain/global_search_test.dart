import 'package:flutter_test/flutter_test.dart';
import 'package:trip_tracker/domain/logic/global_search.dart';
import 'package:trip_tracker/domain/models/trip_note.dart';

import '../support/model_builders.dart';

void main() {
  test('search finds expenses by title and notes by title or text, skipping settlements and other trips', () {
    final trips = [
      tripOf(
        't1',
        'Goa',
        notes: [const TripNote(id: 'n', title: 'Packing', content: 'bring sunscreen', createdAt: 0, updatedAt: 0)],
      ),
      tripOf('t2', 'Alps'),
    ];
    final expenses = [
      expenseOf('e1', 't1', 'Beach lunch', date: '2026-10-02'),
      expenseOf('e2', 't2', 'Lunch box', date: '2026-10-05'),
      expenseOf('e3', 't1', 'Settlement: lunch', date: '2026-10-06', isSettlement: true),
      expenseOf('e4', 'gone', 'Lunch elsewhere', date: '2026-10-07'),
    ];
    final lunch = searchHits('LUNCH', trips, expenses);
    expect(lunch.map((h) => h.title), ['Lunch box', 'Beach lunch']); // newest first, no settlement, no unknown trip
    final sun = searchHits('sunscreen', trips, expenses);
    expect(sun.single.kind, HitKind.note);
    expect(sun.single.tripName, 'Goa');
    expect(searchHits('  ', trips, expenses), isEmpty);
    expect(searchHits('lunch', trips, expenses, max: 1).length, 1);
  });

  test('hits carry the matched row id and map to the trip tab that shows it (enableSearchDeepLink)', () {
    final trips = [
      tripOf(
        't1',
        'Goa',
        notes: [const TripNote(id: 'n', title: 'Packing', content: 'bring sunscreen', createdAt: 0, updatedAt: 0)],
      ),
    ];
    final expense = searchHits('lunch', trips, [expenseOf('e1', 't1', 'Beach lunch', date: '2026-10-02')]).single;
    expect(expense.itemId, 'e1');
    expect(searchHitTarget(expense), (path: '/trip/t1/expenses', focusKind: 'expense', focusId: 'e1'));

    final note = searchHits('sunscreen', trips, const []).single;
    expect(searchHitTarget(note), (path: '/trip/t1/notes', focusKind: 'note', focusId: 'n'));

    const message = SearchHit(kind: HitKind.message, tripId: 't1', tripName: 'Goa', title: 'hi', detail: '', itemId: 'm1');
    expect(searchHitTarget(message), (path: '/trip/t1/chat', focusKind: 'message', focusId: 'm1'));

    // Trip-only hit: bare trip path (router redirect picks the default tab), nothing to highlight.
    const tripHit = SearchHit(kind: HitKind.trip, tripId: 't1', tripName: 'Goa', title: 'Goa', detail: '');
    expect(searchHitTarget(tripHit), (path: '/trip/t1', focusKind: null, focusId: null));
  });
}
