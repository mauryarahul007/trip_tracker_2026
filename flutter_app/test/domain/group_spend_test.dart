import 'package:flutter_test/flutter_test.dart';
import 'package:trip_tracker/domain/logic/group_spend.dart';
import 'package:trip_tracker/domain/models/group.dart';

void main() {
  test('groups sum their members; ungrouped members keep their own row', () {
    final rows = spendByGroup(
      {'a': 100, 'b': 50, 'c': 30},
      {'a': 60, 'b': 60, 'c': 60},
      [
        const Group(id: 'g1', name: 'Family', memberIds: ['a', 'b']),
      ],
      {'a': 'Asha', 'b': 'Ben', 'c': 'Cy'},
    );
    expect(rows.map((r) => r.name), ['Family', 'Cy']);
    expect((rows[0].paid, rows[0].share, rows[0].memberCount), (150, 120, 2));
    expect((rows[1].paid, rows[1].share), (30, 60));
  });
}
