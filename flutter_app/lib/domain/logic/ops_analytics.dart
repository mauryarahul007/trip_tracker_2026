import '../models/admin.dart';
import '../models/admin_fleet.dart';
import '../models/category.dart';
import '../models/expense.dart';
import 'default_categories.g.dart';
import 'ops_growth_metrics.dart';
import 'settlement.dart';

/// Port of the spend, lifecycle and engagement panels of `AdminAnalyticsPage.tsx`. Pure functions over [FleetData].

/// Non-settlement expenses of trips that are not archived: the pool every spend figure uses.
List<Expense> activeExpenses(FleetData d) {
  final ids = {for (final f in fleetTrips(d)) f.id};
  return [
    for (final e in d.expenses)
      if (ids.contains(e.tripId) && !e.title.startsWith('Settlement:')) e,
  ];
}

class CurrencyRow {
  const CurrencyRow(this.currency, this.total, this.count);
  final String currency;
  final double total;
  final int count;
}

List<CurrencyRow> currencyBreakdown(List<Expense> ex) {
  final m = <String, ({double total, int count})>{};
  for (final e in ex) {
    final c = e.currency.isEmpty ? 'USD' : e.currency;
    final cur = m[c] ?? (total: 0, count: 0);
    m[c] = (total: cur.total + e.amount, count: cur.count + 1);
  }
  return [for (final e in m.entries) CurrencyRow(e.key, e.value.total, e.value.count)]
    ..sort((a, b) => b.total.compareTo(a.total));
}

class CategoryRow {
  const CategoryRow(this.id, this.name, this.icon, this.amount, this.pct);
  final String id;
  final String name;
  final String icon;
  final double amount;
  final double pct;
}

List<CategoryRow> categoryBreakdown(List<Expense> ex, {List<Category> categories = defaultCategories}) {
  final total = ex.fold<double>(0, (s, e) => s + e.amount);
  final m = <String, double>{};
  for (final e in ex) {
    m[e.category] = (m[e.category] ?? 0) + e.amount;
  }
  return [
    for (final en in m.entries)
      () {
        final c = categories.where((c) => c.id == en.key).firstOrNull;
        return CategoryRow(
          en.key,
          c?.name ?? 'Other',
          c?.icon ?? '🏷️',
          en.value,
          total > 0 ? en.value / total * 100 : 0,
        );
      }(),
  ]..sort((a, b) => b.amount.compareTo(a.amount));
}

class SpenderRow {
  const SpenderRow(this.memberId, this.name, this.total);
  final String memberId;
  final String name;
  final double total;
}

List<SpenderRow> topSpenders(FleetData d, List<Expense> ex, {int limit = 8}) {
  final m = <String, double>{};
  for (final e in ex) {
    m[e.paidBy] = (m[e.paidBy] ?? 0) + e.amount;
  }
  return ([
    for (final e in m.entries) SpenderRow(e.key, d.members[e.key]?.name ?? 'Unknown', e.value),
  ]..sort((a, b) => b.total.compareTo(a.total))).take(limit).toList();
}

/// Daily spend volume, oldest day first (the hero sparkline).
List<double> dailyVolume(List<Expense> ex) {
  final m = <String, double>{};
  for (final e in ex) {
    m[e.date] = (m[e.date] ?? 0) + e.amount;
  }
  return [for (final k in (m.keys.toList()..sort())) m[k]!];
}

class Lifecycle {
  const Lifecycle({
    required this.active,
    required this.grounded,
    required this.archived,
    required this.avgDurationDays,
    required this.avgMembers,
    required this.avgExpenses,
  });
  final int active;
  final int grounded;
  final int archived;
  final double avgDurationDays;
  final double avgMembers;
  final double avgExpenses;
}

Lifecycle computeLifecycle(FleetData d, List<Expense> active) {
  final trips = d.trips.map((f) => f.trip).toList();
  final grounded = trips.where((t) => t.frozen).length;
  final archived = trips.where((t) => t.archived).length;
  final n = trips.length;
  double duration(String a, String b) {
    final s = DateTime.tryParse(a), e = DateTime.tryParse(b);
    if (s == null || e == null) return 0;
    final days = e.difference(s).inMilliseconds / dayMs;
    return days < 0 ? 0 : days;
  }

  return Lifecycle(
    active: n - grounded - archived,
    grounded: grounded,
    archived: archived,
    avgDurationDays: n == 0 ? 0 : trips.fold<double>(0, (s, t) => s + duration(t.startDate, t.endDate)) / n,
    avgMembers: n == 0 ? 0 : trips.fold<int>(0, (s, t) => s + t.memberIds.length) / n,
    avgExpenses: n == 0 ? 0 : active.length / (fleetTrips(d).isEmpty ? 1 : fleetTrips(d).length),
  );
}

class SettlementHealth {
  const SettlementHealth({
    required this.settledCount,
    required this.unsettledCount,
    required this.outstandingVolume,
    required this.settledPct,
  });
  final int settledCount;
  final int unsettledCount;
  final double outstandingVolume;
  final double settledPct;
}

/// Same rule as the web: a trip is settled when the sum of everyone's positive balance is under 1 paisa.
SettlementHealth computeSettlementHealth(FleetData d) {
  var settled = 0;
  var outstanding = 0.0;
  final pool = fleetTrips(d);
  final byTrip = <String, List<Expense>>{};
  for (final e in d.expenses) {
    (byTrip[e.tripId] ??= []).add(e);
  }
  for (final f in pool) {
    final r = calculateSettlements(f.trip, d.members, byTrip[f.id] ?? const []);
    final o = r.balances.fold<double>(0, (s, b) => s + (b.balance > 0 ? b.balance : 0));
    if (o < 0.01) settled++;
    outstanding += o;
  }
  return SettlementHealth(
    settledCount: settled,
    unsettledCount: pool.length - settled,
    outstandingVolume: outstanding,
    settledPct: pool.isEmpty ? 0 : settled / pool.length * 100,
  );
}

class SplitModeRow {
  const SplitModeRow(this.mode, this.label, this.count, this.pct);
  final String mode;
  final String label;
  final int count;
  final double pct;
}

const splitModeLabels = {
  'equal': 'Equal',
  'equalUnit': 'Weighted',
  'custom': 'Custom Weight',
  'exact': 'Exact Amount',
  'percentage': 'Percentage',
};

List<SplitModeRow> splitModeBreakdown(List<Expense> ex) {
  final m = <String, int>{};
  for (final e in ex) {
    m[e.splitMode] = (m[e.splitMode] ?? 0) + 1;
  }
  return [
    for (final en in m.entries)
      SplitModeRow(en.key, splitModeLabels[en.key] ?? en.key, en.value, ex.isEmpty ? 0 : en.value / ex.length * 100),
  ]..sort((a, b) => b.count.compareTo(a.count));
}

class FeatureAdoption {
  const FeatureAdoption(this.receiptPct, this.geotagPct, this.receipts);
  final double receiptPct;
  final double geotagPct;
  final int receipts;
}

FeatureAdoption computeFeatureAdoption(List<Expense> ex) {
  final r = ex.where((e) => (e.receiptPath ?? '').isNotEmpty).length;
  final g = ex.where((e) => e.location != null).length;
  return FeatureAdoption(ex.isEmpty ? 0 : r / ex.length * 100, ex.isEmpty ? 0 : g / ex.length * 100, r);
}

class StaleTrip {
  const StaleTrip(this.tripId, this.name, this.days);
  final String tripId;
  final String name;
  final int days;
}

/// Active trips with no expense for 30+ days (trip creation counts as activity).
List<StaleTrip> staleTrips(FleetData d, {required int now}) {
  final last = <String, int>{};
  for (final e in d.expenses) {
    if ((last[e.tripId] ?? 0) < e.createdAt) last[e.tripId] = e.createdAt;
  }
  return [
    for (final f in fleetTrips(d))
      () {
        final la = last[f.id] != null && last[f.id]! > f.trip.createdAt ? last[f.id]! : f.trip.createdAt;
        return StaleTrip(f.id, f.trip.name, ((now - la) / dayMs).floor());
      }(),
  ].where((s) => s.days >= 30).toList()..sort((a, b) => b.days.compareTo(a.days));
}

class JoinFunnel {
  const JoinFunnel(this.generated, this.joined, this.pct);
  final int generated;
  final int joined;
  final double pct;
}

JoinFunnel computeJoinFunnel(FleetData d) {
  final joined = d.trips
      .where((f) => f.trip.memberIds.any((id) => (d.members[id]?.linkedUserId ?? '').isNotEmpty))
      .length;
  return JoinFunnel(d.trips.length, joined, d.trips.isEmpty ? 0 : joined / d.trips.length * 100);
}

class RetentionRate {
  const RetentionRate(this.eligible, this.retained, this.pct);
  final int eligible;
  final int retained;
  final double pct;
}

/// Of users who signed up 14+ days ago, the share who created an expense in the last 30 days.
RetentionRate computeRetention(List<AdminUser> users, FleetData d, {required int now}) {
  final eligible = users
      .where((u) => u.createdAt != null && now - u.createdAt!.millisecondsSinceEpoch >= 14 * dayMs)
      .toList();
  final active = {
    for (final e in d.expenses)
      if (now - e.createdAt <= 30 * dayMs && (e.createdByUserId ?? '').isNotEmpty) e.createdByUserId!,
  };
  final retained = eligible.where((u) => active.contains(u.id)).length;
  return RetentionRate(eligible.length, retained, eligible.isEmpty ? 0 : retained / eligible.length * 100);
}

/// Expenses created per weekday, Sunday first (matches the web's `getDay()` order).
List<int> weekdayActivity(List<Expense> ex) {
  final counts = List<int>.filled(7, 0);
  for (final e in ex) {
    counts[DateTime.fromMillisecondsSinceEpoch(e.createdAt).weekday % 7]++;
  }
  return counts;
}

class EditRate {
  const EditRate(this.edited, this.pct);
  final int edited;
  final double pct;
}

EditRate computeEditRate(List<Expense> ex) {
  final n = ex.where((e) => e.updatedAt > e.createdAt).length;
  return EditRate(n, ex.isEmpty ? 0 : n / ex.length * 100);
}

class SevenDayTrend {
  const SevenDayTrend({
    required this.thisWeekSpend,
    required this.thisWeekCount,
    required this.lastWeekSpend,
    required this.pctChange,
    required this.dailyAvg,
    required this.dayBuckets,
  });
  final double thisWeekSpend;
  final int thisWeekCount;
  final double lastWeekSpend;
  final double pctChange;
  final double dailyAvg;

  /// Oldest day first, 7 entries of spend.
  final List<double> dayBuckets;
}

SevenDayTrend computeSevenDayTrend(List<Expense> ex, {required int now}) {
  const week = 7 * dayMs;
  var thisSpend = 0.0, lastSpend = 0.0;
  var thisCount = 0;
  final buckets = List<double>.filled(7, 0);
  for (final e in ex) {
    final at = DateTime.tryParse(e.date)?.millisecondsSinceEpoch ?? e.createdAt;
    final age = now - at;
    if (age >= 0 && age < week) {
      thisSpend += e.amount;
      thisCount++;
      final diff = (age / dayMs).floor();
      if (diff >= 0 && diff < 7) buckets[6 - diff] += e.amount;
    } else if (age >= week && age < 2 * week) {
      lastSpend += e.amount;
    }
  }
  final change = lastSpend > 0 ? (thisSpend - lastSpend) / lastSpend * 100 : (thisSpend > 0 ? 100.0 : 0.0);
  return SevenDayTrend(
    thisWeekSpend: thisSpend,
    thisWeekCount: thisCount,
    lastWeekSpend: lastSpend,
    pctChange: change,
    dailyAvg: thisSpend / 7,
    dayBuckets: buckets,
  );
}

class BugPulse {
  const BugPulse(this.open, this.critical, this.avgResolveHours, this.autoFiled, this.autoPct, this.total);
  final int open;
  final int critical;
  final double? avgResolveHours;
  final int autoFiled;
  final double autoPct;
  final int total;
}

BugPulse computeBugPulse(List<AdminBug> bugs) {
  final resolved = bugs.where((b) => b.status == 'resolved' && b.resolvedAt != null && b.createdAt != null).toList();
  final hours = resolved.isEmpty
      ? null
      : resolved.fold<double>(0, (s, b) {
              final ms = b.resolvedAt!.difference(b.createdAt!).inMilliseconds;
              return s + (ms < 0 ? 0 : ms) / (60 * 60 * 1000);
            }) /
            resolved.length;
  final auto = bugs.where((b) => b.foundBy == 'auto-crash-handler').length;
  return BugPulse(
    bugs.where((b) => b.isOpen).length,
    bugs.where((b) => b.severity == 'critical' && b.status != 'resolved' && b.status != 'wont_fix').length,
    hours,
    auto,
    bugs.isEmpty ? 0 : auto / bugs.length * 100,
    bugs.length,
  );
}
