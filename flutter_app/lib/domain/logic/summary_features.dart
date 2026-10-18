import '../models/travel_pass.dart';
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

enum SuggestionKind { setBudget, overBudget, overPace, nearBudget, openPayments, payerHeavy, topCategory, biggestDay }

/// One tip for the Plan and suggestions card. Which fields are set depends on [kind]; the screen words it.
class Suggestion {
  const Suggestion(this.kind, {this.name, this.amount, this.percent, this.count, this.date});
  final SuggestionKind kind;
  final String? name;
  final double? amount;
  final double? percent;
  final int? count;
  final String? date;
}

/// Up to [max] tips worked out from the trip's own numbers, most useful first. Pure: no money is moved or changed.
List<Suggestion> buildSuggestions({
  required double totalSpent,
  required double budget,
  required double? projectedTotal,
  required ({String name, double percent})? topCategory,
  required ({String name, double percent})? topPayer,
  required int openPayments,
  required ({String date, double total})? biggestDay,
  required int dayCount,
  required int memberCount,
  int max = 3,
}) {
  final out = <Suggestion>[];
  if (budget > 0) {
    if (totalSpent > budget) {
      out.add(Suggestion(SuggestionKind.overBudget, amount: totalSpent - budget));
    } else if (projectedTotal != null && projectedTotal > budget) {
      out.add(Suggestion(SuggestionKind.overPace, amount: projectedTotal - budget));
    } else if (totalSpent >= budget * 0.8) {
      out.add(Suggestion(SuggestionKind.nearBudget, percent: totalSpent * 100 / budget));
    }
  } else if (totalSpent > 0) {
    out.add(const Suggestion(SuggestionKind.setBudget));
  }
  if (openPayments > 0) out.add(Suggestion(SuggestionKind.openPayments, count: openPayments));
  if (topPayer != null && memberCount >= 3 && topPayer.percent >= 60) {
    out.add(Suggestion(SuggestionKind.payerHeavy, name: topPayer.name, percent: topPayer.percent));
  }
  if (topCategory != null && topCategory.percent >= 40) {
    out.add(Suggestion(SuggestionKind.topCategory, name: topCategory.name, percent: topCategory.percent));
  }
  if (biggestDay != null && dayCount >= 3) {
    out.add(Suggestion(SuggestionKind.biggestDay, date: biggestDay.date, amount: biggestDay.total));
  }
  return out.take(max).toList();
}

/// What you can still spend per remaining day to stay in [budget]; null with no budget or no days left.
double? dailyAllowance(double budget, double spent, int daysLeft) {
  if (budget <= 0 || daysLeft <= 0) return null;
  final left = budget - spent;
  return left <= 0 ? 0 : left / daysLeft;
}

/// The earliest pass that starts at or after [now] (passes without a parseable start are ignored).
TravelPass? nextPass(Iterable<TravelPass> passes, DateTime now) {
  TravelPass? best;
  DateTime? bestAt;
  for (final p in passes) {
    final at = DateTime.tryParse(p.startDateTime ?? '');
    if (at == null || at.isBefore(now)) continue;
    if (bestAt == null || at.isBefore(bestAt)) {
      best = p;
      bestAt = at;
    }
  }
  return best;
}

/// What was spent on the day [ymd] (yyyy-MM-dd), from per-day totals.
double spentOn(Iterable<({String date, double total})> days, String ymd) {
  for (final d in days) {
    if (d.date == ymd) return d.total;
  }
  return 0;
}

enum DayBucket { today, yesterday, older }

/// Which day bucket a notification timestamp falls in, relative to [now] (local time). Unparseable: older.
({DayBucket bucket, DateTime? day}) dayBucket(String iso, DateTime now) {
  final at = DateTime.tryParse(iso)?.toLocal();
  if (at == null) return (bucket: DayBucket.older, day: null);
  final d = DateTime(at.year, at.month, at.day);
  final today = DateTime(now.year, now.month, now.day);
  final diff = today.difference(d).inDays;
  if (diff == 0) return (bucket: DayBucket.today, day: d);
  if (diff == 1) return (bucket: DayBucket.yesterday, day: d);
  return (bucket: DayBucket.older, day: d);
}

/// The owed [amount] rounded down to a clean figure (for example 287 to 280, 12,340 to 12,300), or null when it is
/// already clean, too small to bother (under 20) or rounding would give nothing. Never rounds up: nobody overpays.
double? roundDownToClean(double amount) {
  if (amount < 20) return null;
  final step = amount >= 10000 ? 100.0 : 10.0;
  final r = (amount / step).floorToDouble() * step;
  if (r <= 0 || (amount - r).abs() < 0.005) return null;
  return r;
}

/// The history line of an expense: who added it and when, and whether it was changed afterwards. [editedAfterMs] is
/// how long after creation counts as an edit (saving twice within a minute is not one).
({String? addedBy, int addedAt, bool edited, int editedAt}) expenseHistory({
  required String? createdByUserId,
  required int createdAt,
  required int updatedAt,
  required Iterable<({String? linkedUserId, String name})> members,
  int editedAfterMs = 60000,
}) {
  String? who;
  for (final m in members) {
    if (createdByUserId != null && m.linkedUserId == createdByUserId) {
      who = m.name;
      break;
    }
  }
  return (addedBy: who, addedAt: createdAt, edited: updatedAt - createdAt > editedAfterMs, editedAt: updatedAt);
}
