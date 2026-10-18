import 'package:flutter_test/flutter_test.dart';
import 'package:trip_tracker/domain/logic/trip_neighbours.dart';

void main() {
  test('neighbours in the list order, none at the ends or for an unknown trip', () {
    const ids = ['a', 'b', 'c'];
    expect(tripNeighbours(ids, 'b'), (previous: 'a', next: 'c'));
    expect(tripNeighbours(ids, 'a'), (previous: null, next: 'b'));
    expect(tripNeighbours(ids, 'c'), (previous: 'b', next: null));
    expect(tripNeighbours(ids, 'zzz'), (previous: null, next: null));
    expect(tripNeighbours(const ['only'], 'only'), (previous: null, next: null));
  });
}
