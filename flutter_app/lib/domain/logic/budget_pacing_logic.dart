import '../models/expense.dart';
import 'refunds.dart';

enum BudgetPacingStatus {
  onTrack,
  warning,
  overBudget,
  noBudget,
}

class BudgetPacingResult {
  const BudgetPacingResult({
    required this.hasBudget,
    required this.totalBudget,
    required this.totalSpent,
    required this.remainingBudget,
    required this.budgetUsedPercent,
    required this.totalTripDays,
    required this.elapsedDays,
    required this.remainingDays,
    required this.isUpcoming,
    required this.isCompleted,
    required this.isOngoing,
    required this.plannedDailyBudget,
    required this.adjustedDailyAllowance,
    required this.todaySpent,
    required this.todayBurnRatio,
    required this.averageDailyBurn,
    required this.projectedTotalSpend,
    required this.projectedVariance,
    required this.status,
    required this.statusMessage,
  });

  final bool hasBudget;
  final double totalBudget;
  final double totalSpent;
  final double remainingBudget;
  final int budgetUsedPercent;

  final int totalTripDays;
  final int elapsedDays;
  final int remainingDays;
  final bool isUpcoming;
  final bool isCompleted;
  final bool isOngoing;

  final double plannedDailyBudget;
  final double adjustedDailyAllowance;
  final double todaySpent;
  final double todayBurnRatio;

  final double averageDailyBurn;
  final double projectedTotalSpend;
  final double projectedVariance;

  final BudgetPacingStatus status;
  final String statusMessage;
}

DateTime _parseDateUtc(String isoDate) {
  final parts = isoDate.split('T').first.split('-').map(int.parse).toList();
  return DateTime.utc(parts[0], parts[1], parts[2]);
}

String _toDateString(DateTime d) {
  final y = d.year.toString().padLeft(4, '0');
  final m = d.month.toString().padLeft(2, '0');
  final day = d.day.toString().padLeft(2, '0');
  return '$y-$m-$day';
}

int _calendarDayDiff(DateTime start, DateTime end) {
  final diffDays = end.difference(start).inDays;
  return diffDays < 0 ? 1 : diffDays + 1;
}

/// Computes daily budget allowance, today's burn pace, and projected variance.
BudgetPacingResult calculateBudgetPacing({
  required String startDate,
  required String endDate,
  required double budget,
  required Iterable<Expense> expenses,
  DateTime? now,
  String currencySymbol = '₹',
}) {
  final hasBudget = budget > 0;
  final totalBudget = hasBudget ? budget : 0.0;

  final activeExpenses = applyRefunds(
    expenses.where((e) => !e.isSettlement && e.deletedAt == null && !e.excludeFromTotals).toList(),
  );

  var totalSpent = 0.0;
  for (final e in activeExpenses) {
    totalSpent += e.amount;
  }
  if (totalSpent < 0) totalSpent = 0;

  final remainingBudget = (totalBudget - totalSpent) < 0 ? 0.0 : (totalBudget - totalSpent);
  final budgetUsedPercent = totalBudget > 0 ? ((totalSpent / totalBudget) * 100).round() : 0;

  final clock = now ?? DateTime.now();
  final todayUtc = DateTime.utc(clock.year, clock.month, clock.day);
  final todayStr = _toDateString(todayUtc);

  DateTime startUtc;
  DateTime endUtc;
  try {
    startUtc = _parseDateUtc(startDate);
    endUtc = _parseDateUtc(endDate);
  } catch (_) {
    startUtc = todayUtc;
    endUtc = todayUtc;
  }

  final totalTripDays = _calendarDayDiff(startUtc, endUtc);

  bool isUpcoming = false;
  bool isCompleted = false;
  bool isOngoing = false;
  int elapsedDays = 1;
  int remainingDays = 1;

  if (todayUtc.isBefore(startUtc)) {
    isUpcoming = true;
    elapsedDays = 0;
    remainingDays = totalTripDays;
  } else if (todayUtc.isAfter(endUtc)) {
    isCompleted = true;
    elapsedDays = totalTripDays;
    remainingDays = 0;
  } else {
    isOngoing = true;
    elapsedDays = _calendarDayDiff(startUtc, todayUtc);
    remainingDays = (totalTripDays - elapsedDays + 1) < 1 ? 1 : (totalTripDays - elapsedDays + 1);
  }

  // Today's Spend
  var todaySpent = 0.0;
  for (final e in activeExpenses) {
    if (e.date.startsWith(todayStr)) {
      todaySpent += e.amount;
    }
  }

  final plannedDailyBudget = totalBudget > 0 ? (totalBudget / totalTripDays) : 0.0;
  final effectiveRemainingDays = isCompleted ? 1 : (remainingDays < 1 ? 1 : remainingDays);

  final budgetEnteringToday = (remainingBudget + todaySpent) < 0 ? 0.0 : (remainingBudget + todaySpent);
  final adjustedDailyAllowance = totalBudget > 0 ? (budgetEnteringToday / effectiveRemainingDays) : 0.0;

  final double todayBurnRatio;
  if (adjustedDailyAllowance > 0) {
    todayBurnRatio = todaySpent / adjustedDailyAllowance;
  } else if (todaySpent > 0) {
    todayBurnRatio = 2.0;
  } else {
    todayBurnRatio = 0.0;
  }

  final effectiveElapsed = elapsedDays < 1 ? 1 : elapsedDays;
  final averageDailyBurn = totalSpent / effectiveElapsed;

  final double projectedTotalSpend;
  if (isCompleted || isUpcoming) {
    projectedTotalSpend = totalSpent;
  } else {
    final futureDays = (remainingDays - 1) < 0 ? 0 : (remainingDays - 1);
    projectedTotalSpend = totalSpent + (averageDailyBurn * futureDays);
  }

  final projectedVariance = totalBudget > 0 ? (totalBudget - projectedTotalSpend) : 0.0;

  BudgetPacingStatus status;
  String statusMessage;

  if (!hasBudget) {
    status = BudgetPacingStatus.noBudget;
    statusMessage = 'Set a trip budget to track daily burn pace';
  } else if (totalSpent > totalBudget) {
    status = BudgetPacingStatus.overBudget;
    final over = (totalSpent - totalBudget).round();
    statusMessage = '$currencySymbol$over over total budget';
  } else if (todayBurnRatio > 1.25 && isOngoing) {
    status = BudgetPacingStatus.warning;
    final diff = (todaySpent - adjustedDailyAllowance).round();
    statusMessage = '${todayBurnRatio.toStringAsFixed(1)}x daily burn • $currencySymbol$diff over today target';
  } else if (budgetUsedPercent >= 85) {
    status = BudgetPacingStatus.warning;
    statusMessage = '$budgetUsedPercent% of trip budget used ($remainingDays days left)';
  } else {
    status = BudgetPacingStatus.onTrack;
    if (isUpcoming) {
      statusMessage = 'Planned budget: $currencySymbol${plannedDailyBudget.round()}/day';
    } else if (isCompleted) {
      statusMessage = 'Trip finished with $currencySymbol${remainingBudget.round()} unspent';
    } else {
      statusMessage = 'On track: $currencySymbol${adjustedDailyAllowance.round()}/day remaining';
    }
  }

  return BudgetPacingResult(
    hasBudget: hasBudget,
    totalBudget: totalBudget,
    totalSpent: totalSpent,
    remainingBudget: remainingBudget,
    budgetUsedPercent: budgetUsedPercent,
    totalTripDays: totalTripDays,
    elapsedDays: elapsedDays,
    remainingDays: remainingDays,
    isUpcoming: isUpcoming,
    isCompleted: isCompleted,
    isOngoing: isOngoing,
    plannedDailyBudget: plannedDailyBudget,
    adjustedDailyAllowance: adjustedDailyAllowance,
    todaySpent: todaySpent,
    todayBurnRatio: todayBurnRatio,
    averageDailyBurn: averageDailyBurn,
    projectedTotalSpend: projectedTotalSpend,
    projectedVariance: projectedVariance,
    status: status,
    statusMessage: statusMessage,
  );
}
