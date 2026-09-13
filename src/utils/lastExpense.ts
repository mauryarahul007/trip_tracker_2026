import type { Expense } from '../types';

export function isNonSettlementExpense(expense: Expense): boolean {
  return !expense.isSettlement && !expense.title.startsWith('Settlement:') && !expense.deletedAt;
}

export function getLatestNonSettlementExpense(expenses: Expense[], tripId?: string | null): Expense | null {
  const list = expenses.filter((e) => isNonSettlementExpense(e) && (!tripId || e.tripId === tripId));
  if (list.length === 0) return null;
  let latest = list[0];
  for (let i = 1; i < list.length; i++) {
    if (list[i].createdAt > latest.createdAt) latest = list[i];
  }
  return latest;
}
