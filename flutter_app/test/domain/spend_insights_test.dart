import 'package:flutter_test/flutter_test.dart';
import 'package:trip_tracker/domain/logic/spend_insights.dart';
import 'package:trip_tracker/domain/models/expense.dart';

Expense _e(String id, double amount, String category, String date, {bool settlement = false, int? deletedAt}) =>
    Expense(
      id: id,
      tripId: 't-1',
      title: id,
      amount: amount,
      currency: 'INR',
      category: category,
      date: date,
      paidBy: 'm-1',
      splitMode: 'equal',
      splitMemberIds: const ['m-1'],
      resolvedShares: {'m-1': amount},
      isSettlement: settlement,
      deletedAt: deletedAt,
      createdAt: 1,
      updatedAt: 1,
    );

void main() {
  final all = [
    _e('a', 100, 'cat-food', '2026-11-13'),
    _e('b', 250, 'cat-stay', '2026-11-12'),
    _e('c', 50, 'cat-food', '2026-11-13'),
    _e('settle', 999, 'cat-misc', '2026-11-14', settlement: true),
    _e('gone', 999, 'cat-misc', '2026-11-14', deletedAt: 5),
  ];

  test('spendByDay sums per day, oldest first, ignoring settlements and deleted rows', () {
    final days = spendByDay(all);
    expect([for (final d in days) d.date], ['2026-11-12', '2026-11-13']);
    expect([for (final d in days) d.total], [250, 150]);
  });

  test('spendByCategory sums per category, biggest first', () {
    final cats = spendByCategory(all);
    expect([for (final c in cats) c.categoryId], ['cat-stay', 'cat-food']);
    expect([for (final c in cats) c.total], [250, 150]);
  });

  test('empty input gives empty lists', () {
    expect(spendByDay(const []), isEmpty);
    expect(spendByCategory(const []), isEmpty);
  });
}
