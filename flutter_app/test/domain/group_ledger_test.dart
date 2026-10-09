import 'package:flutter_test/flutter_test.dart';
import 'package:trip_tracker/domain/logic/settlement.dart';
import 'package:trip_tracker/domain/models/group.dart';

void main() {
  const a = MemberBalance(memberId: 'a', name: 'Asha', balance: 100);
  const b = MemberBalance(memberId: 'b', name: 'Ben', balance: -40);
  const c = MemberBalance(memberId: 'c', name: 'Cara', balance: -60);

  test('group nodes net their members and flow between groups', () {
    final l = calculateGroupLedger(
      [a, b, c],
      [
        const Group(id: 'g1', name: 'Family A', memberIds: ['a', 'b']),
        const Group(id: 'g2', name: 'Family B', memberIds: ['c']),
      ],
    );
    expect(l.hasGroups, isTrue);
    expect({for (final n in l.nodes) n.name: n.balance}, {'Family A': 60.0, 'Family B': -60.0});
    expect(l.flows, hasLength(1));
    expect((l.flows.single.fromLabel, l.flows.single.toLabel, l.flows.single.amount), ('Family B', 'Family A', 60.0));
  });

  test('ungrouped members stay their own nodes and no groups means hasGroups is false', () {
    final l = calculateGroupLedger([a, b, c], const []);
    expect(l.hasGroups, isFalse);
    expect(l.nodes, hasLength(3));
    expect(l.flows.fold<double>(0, (s, f) => s + f.amount), 100.0);
  });
}
