import 'package:flutter_test/flutter_test.dart';
import 'package:trip_tracker/domain/logic/settle_up.dart';
import 'package:trip_tracker/domain/logic/settlement.dart';
import 'package:trip_tracker/domain/models/expense.dart';
import 'package:trip_tracker/domain/models/group.dart';
import 'package:trip_tracker/domain/models/member.dart';
import 'package:trip_tracker/domain/models/trip.dart';

void main() {
  const t = Transfer(
    from: 'a',
    to: 'b',
    fromLabel: 'Ben',
    toLabel: 'Asha',
    fromMemberId: 'm2',
    toMemberId: 'm1',
    amount: 100,
  );

  test('full payment: web title, debtor pays, creditor takes 100%', () {
    final p = planSettlement(t, amount: 100, currency: 'INR', date: '2026-10-06')!;
    expect(p.isPartial, isFalse);
    expect(p.submission.title, 'Settlement: Ben ➔ Asha');
    expect(p.submission.paidBy, 'm2');
    expect(p.submission.splitMemberIds, ['m1']);
    expect(p.submission.splitConfig, {'m1': 100});
    expect(p.submission.splitMode, 'exact');
    expect(p.submission.category, 'cat-misc');
  });

  test('partial payment leaves the rest; note joins the title', () {
    final p = planSettlement(t, amount: 40, currency: 'INR', date: '2026-10-06', note: ' UPI ')!;
    expect(p.isPartial, isTrue);
    expect(p.remaining, 60);
    expect(p.submission.title, 'Settlement: Ben ➔ Asha — UPI');
  });

  test('non-positive amount is refused', () {
    expect(planSettlement(t, amount: 0, currency: 'INR', date: 'd'), isNull);
  });

  group('group side is recorded as the signed-in member', () {
    const couple = Group(id: 'g1', name: 'Bob & Charlie', memberIds: ['m2', 'm3']);
    final trip = Trip.fromJson({
      'id': 't',
      'name': 'T',
      'memberIds': ['m1', 'm2', 'm3'],
      'baseCurrency': 'INR',
    });
    final members = {
      for (final (id, name) in [('m1', 'Alice'), ('m2', 'Bob'), ('m3', 'Charlie')])
        id: Member(id: id, name: name, tripId: 't'),
    };
    const hotel = Expense(
      id: 'e1',
      tripId: 't',
      title: 'Hotel',
      amount: 1000,
      currency: 'INR',
      category: 'Stay',
      date: '2026-10-01',
      paidBy: 'm1',
      splitMode: 'equal',
      splitMemberIds: ['m2', 'm3'],
      resolvedShares: {'m2': 500, 'm3': 500},
      createdAt: 0,
      updatedAt: 0,
    );
    const bobPaysTen = Expense(
      id: 'e2',
      tripId: 't',
      title: 'Settlement: Bob & Charlie ➔ Alice',
      amount: 10,
      currency: 'INR',
      category: 'cat-misc',
      date: '2026-10-02',
      paidBy: 'm2',
      splitMode: 'exact',
      splitMemberIds: ['m1'],
      splitConfig: {'m1': 10},
      resolvedShares: {'m1': 10},
      createdAt: 0,
      updatedAt: 0,
      isSettlement: true,
    );

    test('second partial payment stays with Bob after the representative flips to Charlie', () {
      final r = calculateSettlements(trip, members, const [hotel, bobPaysTen], const [couple], true);
      final rest = r.transfers.single;
      expect(rest.from, 'group:g1');
      expect(rest.amount, 990);
      // Charlie now owes more, so the raw transfer names him -- recording that
      // as Bob would fail the expenses insert policy.
      expect(rest.fromMemberId, 'm3');

      final p = planSettlement(
        rest,
        amount: 990,
        currency: 'INR',
        date: '2026-10-03',
        recorderMemberId: 'm2',
        groups: const [couple],
      )!;
      expect(p.submission.paidBy, 'm2');
      expect(p.submission.splitMemberIds, ['m1']);
    });

    test('creditor-side group member becomes the recipient', () {
      const owed = Transfer(
        from: 'member:m1',
        to: 'group:g1',
        fromLabel: 'Alice',
        toLabel: 'Bob & Charlie',
        fromMemberId: 'm1',
        toMemberId: 'm3',
        amount: 40,
      );
      final parties = settlementPartiesForRecorder(owed, 'm2', const [couple]);
      expect(parties.fromMemberId, 'm1');
      expect(parties.toMemberId, 'm2');
    });

    test('outsider, missing member, and direct transfers are left alone', () {
      const direct = Transfer(
        from: 'member:m3',
        to: 'member:m1',
        fromLabel: 'Charlie',
        toLabel: 'Alice',
        fromMemberId: 'm3',
        toMemberId: 'm1',
        amount: 40,
      );
      for (final me in ['m4', null, 'm2']) {
        final parties = settlementPartiesForRecorder(direct, me, const [couple]);
        expect(parties.fromMemberId, 'm3');
        expect(parties.toMemberId, 'm1');
      }
    });
  });
  group('per person view after settling with fewest payments', () {
    final trip = Trip.fromJson({
      'id': 't',
      'name': 'T',
      'memberIds': ['m1', 'm2', 'm3'],
      'baseCurrency': 'INR',
    });
    final members = {
      for (final (id, name) in [('m1', 'Alice'), ('m2', 'Bob'), ('m3', 'Charlie')])
        id: Member(id: id, name: name, tripId: 't'),
    };
    Expense exp(String id, double amount, String paidBy, Map<String, double> shares, {bool settle = false}) => Expense(
      id: id,
      tripId: 't',
      title: settle ? 'Settlement: x' : 'Item $id',
      amount: amount,
      currency: 'INR',
      category: 'c',
      date: '2026-10-02',
      paidBy: paidBy,
      splitMode: settle ? 'exact' : 'equal',
      splitMemberIds: shares.keys.toList(),
      resolvedShares: shares,
      createdAt: 0,
      updatedAt: 0,
      isSettlement: settle,
    );
    final e1 = exp('e1', 60, 'm1', {'m1': 30, 'm2': 30});
    final e2 = exp('e2', 60, 'm2', {'m2': 30, 'm3': 30});
    final pay = exp('e3', 30, 'm3', {'m1': 30}, settle: true);

    test('settled in both views once everyone is square', () {
      for (final simplify in [true, false]) {
        final r = calculateSettlements(trip, members, [e1, e2, pay], const [], simplify);
        expect(r.transfers, isEmpty, reason: 'simplify=$simplify');
      }
    });

    test('a settled group settles its members too, in per person', () {
      const couple = Group(id: 'g1', name: 'Bob & Charlie', memberIds: ['m2', 'm3']);
      final dinner = exp('d1', 90, 'm1', {'m1': 30, 'm2': 30, 'm3': 30});
      final groupPay = exp('g-pay', 60, 'm2', {'m1': 60}, settle: true);
      for (final simplify in [true, false]) {
        final r = calculateSettlements(trip, members, [dinner, groupPay], const [couple], simplify);
        expect(r.transfers, isEmpty, reason: 'simplify=$simplify');
      }
    });

    test('Members list: a settled group shows square for its members, otherwise nothing is hidden', () {
      const couple = Group(id: 'g1', name: 'Bob & Charlie', memberIds: ['m2', 'm3']);
      final dinner = exp('d1', 90, 'm1', {'m1': 30, 'm2': 30, 'm3': 30});
      final groupPay = exp('g-pay', 60, 'm2', {'m1': 60}, settle: true);
      final settled = calculateSettlements(trip, members, [dinner, groupPay], const [couple], false).balances;
      expect(settled.firstWhere((b) => b.memberId == 'm2').balance, 30); // real, offsetting
      expect(memberBalancesForDisplay(settled, const [couple]).values.every((v) => v == 0), isTrue);
      final open = calculateSettlements(trip, members, [dinner], const [couple], false).balances;
      expect(memberBalancesForDisplay(open, const [couple]), {for (final b in open) b.memberId: b.balance});
    });

    test('before the payment per person still lists what is owed', () {
      expect(calculateSettlements(trip, members, [e1, e2], const [], false).transfers, hasLength(2));
    });
  });
}
