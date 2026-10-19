import '../models/expense.dart';

/// Port of src/utils/lastExpense.ts.
bool isNonSettlementExpense(Expense e) => !e.isSettlement && !e.title.startsWith('Settlement:') && e.deletedAt == null;

/// Newest by `createdAt`; on ties the earlier list entry wins (strict `>`).
Expense? latestNonSettlementExpense(List<Expense> expenses, {String? tripId}) {
  Expense? latest;
  for (final e in expenses) {
    if (!isNonSettlementExpense(e)) continue;
    if (tripId != null && e.tripId != tripId) continue;
    if (latest == null || e.createdAt > latest.createdAt) latest = e;
  }
  return latest;
}
