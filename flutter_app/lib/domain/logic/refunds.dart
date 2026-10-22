import '../models/expense.dart';
import 'currency.dart';

// A refund is its own expense row pointing at the expense it reduces (refundOfExpenseId). Its stored shares are
// {payer: amount} so a client that does not know about refunds nets it to zero instead of corrupting balances.
// Every balance calc runs applyRefunds first, which folds each refund into its parent pro-rata and drops the
// refund rows. Keep in step with src/utils/refunds.ts.

bool isRefund(Expense e) => e.refundOfExpenseId != null;

/// Splits [total] across [weights] to the currency's smallest unit; the parts always sum to [total].
Map<String, double> apportion(double total, Map<String, double> weights, {int decimals = 2}) {
  final scale = _pow10(decimals);
  final units = (total * scale).round();
  final keys = [
    for (final k in weights.keys)
      if (weights[k]! > 0) k,
  ];
  final sum = keys.fold<double>(0, (s, k) => s + weights[k]!);
  if (units <= 0 || sum <= 0) return {};
  final parts = [
    for (final k in keys)
      (
        key: k,
        base: (units * weights[k]! / sum).floor(),
        frac: units * weights[k]! / sum - (units * weights[k]! / sum).floor(),
      ),
  ];
  var left = units - parts.fold<int>(0, (s, p) => s + p.base);
  final bumped = <String>{};
  final byFrac = [...parts]..sort((a, b) => b.frac.compareTo(a.frac));
  for (final p in byFrac) {
    if (left <= 0) break;
    bumped.add(p.key);
    left -= 1;
  }
  return {for (final p in parts) p.key: (p.base + (bumped.contains(p.key) ? 1 : 0)) / scale};
}

double _pow10(int n) => n == 0 ? 1 : (n == 1 ? 10 : (n == 2 ? 100 : (n == 3 ? 1000 : 10000)));

double _round(double v, int decimals) => (v * _pow10(decimals)).round() / _pow10(decimals);

List<Expense> refundsFor(String parentId, Iterable<Expense> all) => [
  for (final r in all)
    if (r.refundOfExpenseId == parentId && r.deletedAt == null) r,
];

/// What can still be refunded on [parent] (original amount minus refunds already recorded).
double refundableRemaining(Expense parent, Iterable<Expense> all) {
  final refunded = refundsFor(parent.id, all).fold<double>(0, (s, r) => s + r.amount);
  final left = parent.amount - refunded;
  return left < 0 ? 0 : left;
}

/// Folds refunds into their parents and drops the refund rows. Refunds whose parent is gone are ignored.
List<Expense> applyRefunds(List<Expense> expenses) {
  final byParent = <String, double>{};
  for (final r in expenses) {
    if (r.refundOfExpenseId != null && r.deletedAt == null) {
      byParent[r.refundOfExpenseId!] = (byParent[r.refundOfExpenseId!] ?? 0) + r.amount;
    }
  }
  if (!expenses.any(isRefund)) return expenses;
  return [
    for (final e in expenses)
      if (!isRefund(e)) _fold(e, byParent[e.id]),
  ];
}

Expense _fold(Expense e, double? requested) {
  if (requested == null || e.amount <= 0) return e;
  final refunded = requested < e.amount ? requested : e.amount;
  final decimals = getCurrencyDecimals(e.currency);
  final cut = apportion(refunded, e.resolvedShares, decimals: decimals);
  final shares = {for (final s in e.resolvedShares.entries) s.key: _round(s.value - (cut[s.key] ?? 0), decimals)};
  Map<String, double>? paid = e.paidByShares;
  if (paid != null && paid.isNotEmpty) {
    final payerCut = apportion(refunded, paid, decimals: decimals);
    paid = {for (final p in paid.entries) p.key: _round(p.value - (payerCut[p.key] ?? 0), decimals)};
  }
  return e.copyWith(amount: _round(e.amount - refunded, decimals), resolvedShares: shares, paidByShares: paid);
}
