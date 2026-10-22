import type { Expense } from '../types';
import { getCurrencyDecimals } from './currency';

// A refund is its own expense row pointing at the expense it reduces
// (refundOfExpenseId). Its stored shares are {payer: amount} so a client that
// does not know about refunds nets it to zero instead of corrupting balances.
// Every balance calc runs applyRefunds first, which folds each refund into its
// parent pro-rata and drops the refund rows. Keep in step with refunds.dart.

export const isRefund = (e: Pick<Expense, 'refundOfExpenseId'>): boolean => Boolean(e.refundOfExpenseId);

/** Splits `total` across `weights` to the currency's smallest unit; the parts always sum to `total`. */
export function apportion(total: number, weights: Record<string, number>, decimals = 2): Record<string, number> {
  const scale = Math.pow(10, decimals);
  const units = Math.round(total * scale);
  const keys = Object.keys(weights).filter((k) => weights[k] > 0);
  const sum = keys.reduce((s, k) => s + weights[k], 0);
  const out: Record<string, number> = {};
  if (units <= 0 || sum <= 0) return out;
  const floors = keys.map((k) => {
    const exact = (units * weights[k]) / sum;
    return { k, base: Math.floor(exact), frac: exact - Math.floor(exact) };
  });
  let left = units - floors.reduce((s, f) => s + f.base, 0);
  [...floors].sort((a, b) => b.frac - a.frac).forEach((f) => {
    if (left > 0) {
      f.base += 1;
      left -= 1;
    }
  });
  floors.forEach((f) => {
    out[f.k] = f.base / scale;
  });
  return out;
}

const liveRefunds = (expenses: Expense[]) => expenses.filter((e) => isRefund(e) && !e.deletedAt);

/** What can still be refunded on `parent` (original amount minus refunds already recorded). */
export function refundableRemaining(parent: Expense, expenses: Expense[]): number {
  const refunded = liveRefunds(expenses)
    .filter((r) => r.refundOfExpenseId === parent.id)
    .reduce((s, r) => s + r.amount, 0);
  return Math.max(0, Number((parent.amount - refunded).toFixed(4)));
}

export function refundsFor(parentId: string, expenses: Expense[]): Expense[] {
  return liveRefunds(expenses).filter((r) => r.refundOfExpenseId === parentId);
}

/** Folds refunds into their parents and drops the refund rows. Refunds whose parent is gone are ignored. */
export function applyRefunds(expenses: Expense[]): Expense[] {
  const refunds = liveRefunds(expenses);
  if (!expenses.some(isRefund)) return expenses;
  const byParent = new Map<string, number>();
  refunds.forEach((r) => byParent.set(r.refundOfExpenseId!, (byParent.get(r.refundOfExpenseId!) ?? 0) + r.amount));

  return expenses
    .filter((e) => !isRefund(e))
    .map((e) => {
      const requested = byParent.get(e.id);
      if (!requested || e.amount <= 0) return e;
      const refunded = Math.min(requested, e.amount);
      const decimals = getCurrencyDecimals(e.currency);
      const cut = apportion(refunded, e.resolvedShares, decimals);
      const resolvedShares = Object.fromEntries(
        Object.entries(e.resolvedShares).map(([id, v]) => [id, Number((v - (cut[id] ?? 0)).toFixed(decimals))])
      );
      let paidByShares = e.paidByShares;
      if (paidByShares && Object.keys(paidByShares).length > 0) {
        const payerCut = apportion(refunded, paidByShares, decimals);
        paidByShares = Object.fromEntries(
          Object.entries(paidByShares).map(([id, v]) => [id, Number((v - (payerCut[id] ?? 0)).toFixed(decimals))])
        );
      }
      return { ...e, amount: Number((e.amount - refunded).toFixed(decimals)), resolvedShares, paidByShares };
    });
}

/** Headline spend: refund rows count as negative so totals match the folded view. */
export const netAmount = (e: Pick<Expense, 'amount' | 'refundOfExpenseId'>): number => (isRefund(e) ? -e.amount : e.amount);

