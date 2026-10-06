import 'dart:math';

import 'package:flutter_test/flutter_test.dart';
import 'package:trip_tracker/domain/logic/settlement.dart';
import 'package:trip_tracker/domain/models/expense.dart';
import 'package:trip_tracker/domain/models/member.dart';
import 'package:trip_tracker/domain/models/trip.dart';

/// Property: for any set of expenses, balances sum to ~0 and applying the
/// suggested transfers settles everyone (both simplified and direct modes).
void main() {
  test('random expense sets: balances sum to 0 and transfers settle everyone', () {
    final rnd = Random(42);
    for (var iter = 0; iter < 200; iter++) {
      final n = 2 + rnd.nextInt(5);
      final ids = [for (var i = 0; i < n; i++) 'm$i'];
      final trip = Trip.fromJson({'id': 't', 'name': 'T', 'memberIds': ids, 'baseCurrency': 'INR'});
      final members = {for (final id in ids) id: Member(id: id, name: id.toUpperCase(), tripId: 't')};

      final expenses = <Expense>[];
      for (var e = 0; e < 1 + rnd.nextInt(12); e++) {
        final cents = 100 + rnd.nextInt(500000);
        final split = ([...ids]..shuffle(rnd)).take(1 + rnd.nextInt(n)).toList();
        // Distribute cents exactly so resolvedShares sums to the amount.
        final base = cents ~/ split.length;
        final shares = {for (final id in split) id: base / 100};
        shares[split.first] = (base + cents - base * split.length) / 100;
        expenses.add(Expense(
          id: 'e$iter-$e', tripId: 't', title: 'x', amount: cents / 100, currency: 'INR', category: 'Food',
          date: '2026-01-01', paidBy: ids[rnd.nextInt(n)], splitMode: 'equal',
          splitMemberIds: split, resolvedShares: shares, createdAt: 0, updatedAt: 0,
        ));
      }

      for (final simplify in [true, false]) {
        final r = calculateSettlements(trip, members, expenses, const [], simplify);
        final sum = r.balances.fold<double>(0, (a, b) => a + b.balance);
        expect(sum.abs(), lessThan(0.011 * n), reason: 'iter $iter simplify=$simplify');

        final net = {for (final b in r.balances) b.memberId: b.balance};
        for (final t in r.transfers) {
          net[t.fromMemberId] = net[t.fromMemberId]! + t.amount;
          net[t.toMemberId] = net[t.toMemberId]! - t.amount;
        }
        for (final v in net.values) {
          expect(v.abs(), lessThan(0.011 * n), reason: 'iter $iter simplify=$simplify residual');
        }
      }
    }
  });
}
