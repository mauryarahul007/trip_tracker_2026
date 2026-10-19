import 'package:flutter_test/flutter_test.dart';
import 'package:trip_tracker/domain/logic/pass_sort.dart';
import 'package:trip_tracker/domain/models/travel_pass.dart';

TravelPass p(String id, {String? name, String? leg, String? start, String? title}) => TravelPass(
  id: id,
  tripId: 't',
  type: 'flight',
  title: title ?? '$name · x',
  passengerName: name,
  legIdentifier: leg,
  startDateTime: start,
  createdAt: 1,
  updatedAt: 1,
);

List<String> ids(List<TravelPass> l) => [for (final x in l) x.id];

void main() {
  final passes = [
    p('a', name: 'Upama', leg: 'L2', start: '2026-10-10T09:00'),
    p('b', name: 'Rahul', leg: 'L1', start: '2026-10-05T08:00'),
    p('c', name: 'Upama', leg: 'L1', start: '2026-10-05T08:00'),
    p('d', name: 'Rahul', leg: 'L2', start: '2026-10-10T09:00'),
    p('e', title: 'Zed · misc'), // no name field, leg, or date
  ];

  test('time: chronological, undated last, stable', () {
    expect(ids(sortPasses(passes, PassSort.time)), ['b', 'c', 'a', 'd', 'e']);
  });

  test('leg: legs by time, passengers by name inside, no-leg last', () {
    expect(ids(sortPasses(passes, PassSort.leg)), ['b', 'c', 'd', 'a', 'e']);
  });

  test('name: passenger then time; title fallback sorts by first word', () {
    expect(ids(sortPasses(passes, PassSort.name)), ['b', 'd', 'c', 'a', 'e']);
  });

  test('does not mutate input', () {
    final before = ids(passes);
    sortPasses(passes, PassSort.name);
    expect(ids(passes), before);
  });
}
