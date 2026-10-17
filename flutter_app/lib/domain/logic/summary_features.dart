import 'settlement.dart';
import 'settlement_share_card.dart';

/// Lines for the "Share summary" picture. Index 3 is the big line the PNG renderer enlarges, so keep it the total.
SettlementShareCardLayout tripSummaryShareLayout({
  required String tripName,
  required String currencySymbol,
  required double totalSpent,
  required double perPerson,
  required int travellers,
  required List<Transfer> transfers,
  String locale = 'en_US',
  int maxTransfers = 6,
}) {
  final trip = tripName.isEmpty ? 'Trip' : tripName;
  String money(double v) => formatSettlementAmount(v, currencySymbol, locale);
  final shown = transfers.take(maxTransfers).toList();
  final more = transfers.length - shown.length;
  final lines = [
    trip,
    'Trip summary',
    '$travellers travellers',
    money(totalSpent),
    '${money(perPerson)} per person',
    if (shown.isEmpty) 'All settled' else 'Who pays whom',
    for (final t in shown) '${t.fromLabel} → ${t.toLabel}  ${money(t.amount)}',
    if (more > 0) '+$more more',
    'Tracked with Trip Tracker',
  ];
  final slug = tripName.replaceAll(RegExp(r'\s+'), '_').replaceAll(RegExp(r'[^\w-]'), '');
  return SettlementShareCardLayout(
    width: 1080,
    height: 760 + 70 * (lines.length - 6),
    amountText: money(totalSpent),
    caption: 'Our "$trip" trip: ${money(totalSpent)} in total, ${money(perPerson)} per person.',
    fileName: '${slug.isEmpty ? 'trip' : slug}_summary.png',
    lines: lines,
  );
}

enum BudgetLevel { ok, warn, over }

/// How much of [budget] is used. [fraction] is capped to 0..1 for the bar; [remaining] goes negative when over.
({double fraction, double remaining, BudgetLevel level}) budgetStatus(double spent, double budget) {
  if (budget <= 0) return (fraction: 0, remaining: 0, level: BudgetLevel.ok);
  final f = spent / budget;
  return (
    fraction: f.clamp(0.0, 1.0),
    remaining: budget - spent,
    level: f > 1 ? BudgetLevel.over : (f >= 0.8 ? BudgetLevel.warn : BudgetLevel.ok),
  );
}

/// Done / total per checklist category, in first-seen order of [order] (categories with no items are left out).
List<({String category, int done, int total})> categoryProgress(
  Iterable<({String category, bool done})> items,
  List<String> order,
) {
  final done = <String, int>{};
  final total = <String, int>{};
  for (final i in items) {
    total[i.category] = (total[i.category] ?? 0) + 1;
    if (i.done) done[i.category] = (done[i.category] ?? 0) + 1;
  }
  return [
    for (final c in order)
      if ((total[c] ?? 0) > 0) (category: c, done: done[c] ?? 0, total: total[c]!),
  ];
}
