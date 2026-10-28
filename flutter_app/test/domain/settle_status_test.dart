import 'package:flutter_test/flutter_test.dart';
import 'package:trip_tracker/domain/logic/settle_status.dart';
import 'package:trip_tracker/domain/logic/spend_insights.dart';
import 'package:trip_tracker/domain/models/expense.dart';

Expense _pay(String id, String from, String to, double amount, String date, {int? confirmedAt, int createdAt = 1}) =>
    Expense(
      id: id,
      tripId: 't',
      title: 'Settlement: $from to $to',
      amount: amount,
      currency: 'INR',
      category: 'settlement',
      date: date,
      paidBy: from,
      splitMode: 'exact',
      splitMemberIds: [to],
      resolvedShares: {to: amount},
      isSettlement: true,
      settlementConfirmedAt: confirmedAt,
      createdAt: createdAt,
      updatedAt: createdAt,
    );

Expense _spend(String id, double amount, String date, {String? refundOf}) => Expense(
  id: id,
  tripId: 't',
  title: id,
  amount: amount,
  currency: 'INR',
  category: 'food',
  date: date,
  paidBy: 'a',
  splitMode: 'equal',
  splitMemberIds: const ['a'],
  resolvedShares: {'a': amount},
  refundOfExpenseId: refundOf,
  createdAt: 1,
  updatedAt: 1,
);

void main() {
  group('settleStatus', () {
    final rows = [
      _pay('p1', 'me', 'ben', 30, '2026-10-01', confirmedAt: 5),
      _pay('p2', 'cara', 'me', 20, '2026-10-03'),
      _pay('p3', 'ben', 'cara', 10, '2026-10-02'),
      _spend('x', 100, '2026-10-01'),
    ];

    test('with confirmation on: counts confirmed, waiting on me and waiting on others', () {
      final s = settleStatus(rows, outstanding: 40, me: 'me', confirmationOn: true);
      expect(s.settled, 60);
      expect(s.confirmed, 1);
      expect(s.waitingOnMe, 1);
      expect(s.waitingOnOthers, 1);
      expect(s.fraction, closeTo(0.6, 1e-9));
    });

    test('recent lists only my payments, newest first, with direction', () {
      final s = settleStatus(rows, outstanding: 40, me: 'me', confirmationOn: true);
      expect(s.recent.map((r) => r.id), ['p2', 'p1']);
      expect(s.recent.first.sent, isFalse);
      expect(s.recent.first.otherMemberId, 'cara');
      expect(s.recent.first.confirmed, isFalse);
      expect(s.recent.last.sent, isTrue);
    });

    test('with confirmation off every payment counts as confirmed', () {
      final s = settleStatus(rows, outstanding: 0, me: 'me', confirmationOn: false);
      expect(s.confirmed, 3);
      expect(s.waitingOnMe + s.waitingOnOthers, 0);
      expect(s.fraction, 1);
    });

    test('nothing to settle reads as done; deleted payments are ignored', () {
      final deleted = _pay('d', 'me', 'ben', 30, '2026-10-01').copyWith(deletedAt: 9);
      final s = settleStatus([deleted], outstanding: 0, me: 'me', confirmationOn: true);
      expect(s.payments, 0);
      expect(s.recent, isEmpty);
      expect(s.fraction, 1);
    });

    test('recentCount caps the list; null keeps all', () {
      expect(settleStatus(rows, outstanding: 0, me: 'me', confirmationOn: true, recentCount: 1).recent, hasLength(1));
      expect(
        settleStatus(rows, outstanding: 0, me: 'me', confirmationOn: true, recentCount: null).recent,
        hasLength(2),
      );
    });
  });

  group('insights helpers', () {
    test('runningTotals adds up day by day', () {
      expect(runningTotals(const [DaySpend('a', 10), DaySpend('b', 5), DaySpend('c', 20)]), [10, 15, 35]);
    });

    test('topExpenses ranks biggest first with refunds netted', () {
      final top = topExpenses([
        _spend('hotel', 300, '2026-10-01'),
        _spend('cab', 50, '2026-10-01'),
        _spend('dinner', 200, '2026-10-02'),
        _spend('refund', 150, '2026-10-03', refundOf: 'hotel'),
      ], n: 2);
      expect(top.map((e) => e.id), ['dinner', 'hotel']);
      expect(top.last.amount, 150);
    });
  });
}
