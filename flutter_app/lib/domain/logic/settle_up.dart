import 'expense_form_logic.dart';
import 'settlement.dart';

/// What recording a payment between two people looks like, mirroring the web's
/// `handleSettle` (App.tsx): an exact-split expense paid by the debtor, 100% to the creditor.
class SettleUpPlan {
  const SettleUpPlan({required this.submission, required this.isPartial, required this.remaining});
  final ExpenseSubmission submission;
  final bool isPartial;
  final double remaining;
}

/// Null when the amount is not positive. [note] is only used when non-empty
/// (the caller passes '' when the date/note flag is off).
SettleUpPlan? planSettlement(
  Transfer t, {
  required double amount,
  required String currency,
  required String date,
  String note = '',
  double? totalDebt,
}) {
  if (!(amount > 0)) return null;
  final total = totalDebt ?? t.amount;
  final n = note.trim();
  final title = n.isEmpty
      ? 'Settlement: ${t.fromLabel} ➔ ${t.toLabel}'
      : 'Settlement: ${t.fromLabel} ➔ ${t.toLabel} — $n';
  return SettleUpPlan(
    isPartial: amount < total - 0.01,
    remaining: (total - amount).clamp(0, double.infinity).toDouble(),
    submission: ExpenseSubmission(
      title: title,
      amount: amount,
      currency: currency,
      category: 'cat-misc',
      date: date,
      paidBy: t.fromMemberId,
      splitMode: 'exact',
      splitMemberIds: [t.toMemberId],
      splitConfig: {t.toMemberId: amount},
    ),
  );
}
