import 'package:flutter_test/flutter_test.dart';
import 'package:trip_tracker/domain/logic/budget_pacing_logic.dart';
import 'package:trip_tracker/domain/models/expense.dart';

Expense makeTestExpense({
  required String id,
  required double amount,
  required String date,
  String title = 'Expense',
  bool isSettlement = false,
}) {
  return Expense(
    id: id,
    tripId: 't1',
    title: title,
    amount: amount,
    currency: '₹',
    category: 'food',
    date: date,
    paidBy: 'm1',
    splitMode: 'equal',
    splitMemberIds: const ['m1'],
    resolvedShares: { 'm1': amount },
    isSettlement: isSettlement,
    createdAt: DateTime.now().millisecondsSinceEpoch,
    updatedAt: DateTime.now().millisecondsSinceEpoch,
  );
}

void main() {
  group('budget_pacing_logic', () {
    test('handles no budget gracefully', () {
      final res = calculateBudgetPacing(
        startDate: '2026-11-10',
        endDate: '2026-11-15',
        budget: 0,
        expenses: const [],
      );

      expect(res.hasBudget, false);
      expect(res.status, BudgetPacingStatus.noBudget);
      expect(res.totalTripDays, 6);
    });

    test('computes on-track daily allowance for ongoing trip', () {
      final expenses = [
        makeTestExpense(id: 'e1', amount: 10000, date: '2026-11-10'),
        makeTestExpense(id: 'e2', amount: 8000, date: '2026-11-11'),
        makeTestExpense(id: 'e3', amount: 4000, date: '2026-11-12'),
      ];

      // Simulated date Nov 12 (Day 3 of 6; 4 days remaining: 12, 13, 14, 15)
      final now = DateTime.utc(2026, 11, 12);
      final res = calculateBudgetPacing(
        startDate: '2026-11-10',
        endDate: '2026-11-15',
        budget: 60000,
        expenses: expenses,
        now: now,
      );

      expect(res.hasBudget, true);
      expect(res.totalBudget, 60000);
      expect(res.totalSpent, 22000);
      expect(res.remainingBudget, 38000);
      expect(res.totalTripDays, 6);
      expect(res.elapsedDays, 3);
      expect(res.remainingDays, 4);
      expect(res.isOngoing, true);
      // 42000 available entering today / 4 days = 10500/day
      expect(res.adjustedDailyAllowance, 10500);
      expect(res.todaySpent, 4000);
      expect(res.status, BudgetPacingStatus.onTrack);
    });

    test('detects warning when today spend exceeds target by > 25%', () {
      final expenses = [
        makeTestExpense(id: 'e1', amount: 10000, date: '2026-11-10'),
        makeTestExpense(id: 'e2', amount: 8500, date: '2026-11-12'),
      ];

      final now = DateTime.utc(2026, 11, 12);
      final res = calculateBudgetPacing(
        startDate: '2026-11-10',
        endDate: '2026-11-15',
        budget: 30000,
        expenses: expenses,
        now: now,
      );

      expect(res.status, BudgetPacingStatus.warning);
      expect(res.todayBurnRatio, closeTo(1.7, 0.05));
      expect(res.statusMessage, contains('1.7x daily burn'));
    });

    test('detects overBudget when total spent exceeds budget', () {
      final expenses = [
        makeTestExpense(id: 'e1', amount: 55000, date: '2026-11-11'),
      ];

      final now = DateTime.utc(2026, 11, 12);
      final res = calculateBudgetPacing(
        startDate: '2026-11-10',
        endDate: '2026-11-15',
        budget: 50000,
        expenses: expenses,
        now: now,
      );

      expect(res.status, BudgetPacingStatus.overBudget);
      expect(res.remainingBudget, 0);
      expect(res.statusMessage, contains('5000 over total budget'));
    });
  });
}
