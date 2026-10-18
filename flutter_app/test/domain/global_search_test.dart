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
}
