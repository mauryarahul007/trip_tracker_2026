import 'package:flutter_test/flutter_test.dart';
import 'package:trip_tracker/domain/logic/csv_export.dart';
import 'package:trip_tracker/domain/logic/expense_list_logic.dart';
import 'package:trip_tracker/domain/logic/refunds.dart';
import 'package:trip_tracker/domain/logic/settlement.dart';
import 'package:trip_tracker/domain/models/expense.dart';
import 'package:trip_tracker/domain/models/member.dart';
import 'package:trip_tracker/domain/models/trip.dart';

Expense _e(
  String id,
  double amount,
  String paidBy,
  Map<String, double> shares, {
  String? refundOf,
  bool settlement = false,
  List<String>? split,
}) => Expense(
  id: id,
  tripId: 't1',
  title: refundOf != null ? 'Refund: Hotel' : (settlement ? 'Settlement: x' : 'Hotel'),
  amount: amount,
  currency: 'INR',
  category: 'Food',
  date: '2026-08-01',
  paidBy: paidBy,
  splitMode: 'equal',
  splitMemberIds: split ?? shares.keys.toList(),
  resolvedShares: shares,
  isSettlement: settlement,
  refundOfExpenseId: refundOf,
  createdAt: 0,
  updatedAt: 0,
);

void main() {
  final ids = ['a', 'b', 'c', 'd'];
  final parent = _e('e1', 5000, 'a', {for (final i in ids) i: 1250});
  Expense refund(double amt, [String id = 'r1']) => _e(id, amt, 'a', {'a': amt}, refundOf: 'e1', split: ['a']);

  Map<String, double> bal(List<Expense> list) {
    final trip = Trip.fromJson({'id': 't1', 'name': 'T', 'memberIds': ids});
    final members = {
      for (final i in ids) i: Member.fromJson({'id': i, 'tripId': 't1', 'name': i}),
    };
    return {for (final b in calculateSettlements(trip, members, list).balances) b.memberId: b.balance};
  }

  test('5000 across 4 with a 1000 refund: payer is out 4000, each owes 1000', () {
    expect(bal([parent]), {'a': 3750, 'b': -1250, 'c': -1250, 'd': -1250});
    expect(bal([parent, refund(1000)]), {'a': 3000, 'b': -1000, 'c': -1000, 'd': -1000});
  });

  test('a refund after members already paid flips to the payer owing them', () {
    final settled = _e('s', 1250, 'b', {'a': 1250}, settlement: true, split: ['a']);
    expect(bal([parent, settled, refund(1000)])['b'], 250);
  });

  test('cents stay exact, refunds stack, are capped and deletion restores', () {
    expect(apportion(1000, {'a': 1, 'b': 1, 'c': 1}).values.fold<double>(0, (s, v) => s + v), closeTo(1000, 1e-9));
    expect(refundableRemaining(parent, [parent, refund(1000), refund(500, 'r2')]), 3500);
    expect(applyRefunds([parent, refund(9000)]).single.amount, 0);
    expect(applyRefunds([parent, refund(1000).copyWith(deletedAt: 1)]).single.amount, 5000);
  });

  test('day total nets a refund off instead of adding it', () {
    expect(groupByDay([parent, refund(1000)]).single.total, 4000);
  });

  test('CSV exports a refund as a negative amount', () {
    final trip = Trip.fromJson({'id': 't1', 'name': 'T', 'memberIds': ids});
    final csv = exportTripLedgerCsv(trip: trip, members: const [], expenses: [parent, refund(1000)]);
    expect(csv, contains('5000.00'));
    expect(csv, contains(',-1000.00,'));
  });

  test('json round trip keeps the link', () {
    expect(Expense.fromJson(refund(10).toJson()).refundOfExpenseId, 'e1');
  });
}
