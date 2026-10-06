import '../models/category.dart';
import '../models/expense.dart';
import '../models/member.dart';
import '../models/trip.dart';
import 'settlement.dart' show MemberBalance;

// Ports of the Expenses tab rules: `filteredExpenses` / `totalSpent` (App.tsx),
// `groupByDay` and the per-row review logic (ExpenseList.tsx), and
// SummaryAttentionStrip's chips. Hand-transcribed; covered by unit tests
// derived from the web code (BACKLOG B-051).

double _jsNumber(String s) => double.tryParse(s.trim()) ?? double.nan;

enum ExpenseRelation { paidByMe, involvesMe }

class ExpenseFilters {
  const ExpenseFilters({
    this.query = '',
    this.categoryId = '',
    this.memberId = '',
    this.dateFrom = '',
    this.dateTo = '',
    this.amountMin = '',
    this.amountMax = '',
    this.relation,
    this.location = '',
  });

  final String query;
  final String categoryId;
  final String memberId;
  final String dateFrom; // yyyy-MM-dd, inclusive
  final String dateTo;
  final String amountMin;
  final String amountMax;
  final ExpenseRelation? relation;
  final String location;

  bool get hasActive =>
      query.isNotEmpty ||
      categoryId.isNotEmpty ||
      memberId.isNotEmpty ||
      dateFrom.isNotEmpty ||
      dateTo.isNotEmpty ||
      amountMin.isNotEmpty ||
      amountMax.isNotEmpty ||
      relation != null ||
      location.isNotEmpty;

  ExpenseFilters copyWith({
    String? query,
    String? categoryId,
    String? memberId,
    String? dateFrom,
    String? dateTo,
    String? amountMin,
    String? amountMax,
    ExpenseRelation? relation,
    bool clearRelation = false,
    String? location,
  }) =>
      ExpenseFilters(
        query: query ?? this.query,
        categoryId: categoryId ?? this.categoryId,
        memberId: memberId ?? this.memberId,
        dateFrom: dateFrom ?? this.dateFrom,
        dateTo: dateTo ?? this.dateTo,
        amountMin: amountMin ?? this.amountMin,
        amountMax: amountMax ?? this.amountMax,
        relation: clearRelation ? null : (relation ?? this.relation),
        location: location ?? this.location,
      );
}

/// Port of `filteredExpenses`. Search is a case-insensitive title match; the
/// member filter matches payer OR anyone in the split; relation filters only
/// apply once the viewer has a member id.
List<Expense> filterExpenses(List<Expense> all, ExpenseFilters f, {String? myMemberId}) {
  final minV = f.amountMin.trim().isEmpty ? null : _jsNumber(f.amountMin);
  final maxV = f.amountMax.trim().isEmpty ? null : _jsNumber(f.amountMax);
  final q = f.query.trim().toLowerCase();
  return [
    for (final e in all)
      if ((q.isEmpty || e.title.toLowerCase().contains(q)) &&
          (f.categoryId.isEmpty || e.category == f.categoryId) &&
          (f.memberId.isEmpty || e.paidBy == f.memberId || e.splitMemberIds.contains(f.memberId)) &&
          (f.dateFrom.isEmpty || e.date.compareTo(f.dateFrom) >= 0) &&
          (f.dateTo.isEmpty || e.date.compareTo(f.dateTo) <= 0) &&
          (minV == null || minV.isNaN || e.amount >= minV) &&
          (maxV == null || maxV.isNaN || e.amount <= maxV) &&
          (myMemberId == null ||
              f.relation == null ||
              (f.relation == ExpenseRelation.paidByMe && e.paidBy == myMemberId) ||
              (f.relation == ExpenseRelation.involvesMe && (e.paidBy == myMemberId || e.splitMemberIds.contains(myMemberId)))) &&
          (f.location.isEmpty || e.location?.placeName == f.location))
        e,
  ];
}

bool isActualExpense(Expense e) => !e.isSettlement && !e.title.startsWith('Settlement:');

class DayGroup {
  DayGroup(this.date, this.expenses);
  final String date;
  final List<Expense> expenses;
  double get total => expenses.fold(0.0, (s, e) => s + e.amount);
}

/// Consecutive expenses sharing a date (input is already newest-first).
List<DayGroup> groupByDay(List<Expense> list) {
  final groups = <DayGroup>[];
  for (final e in list) {
    if (groups.isNotEmpty && groups.last.date == e.date) {
      groups.last.expenses.add(e);
    } else {
      groups.add(DayGroup(e.date, [e]));
    }
  }
  return groups;
}

/// Mean of the non-zero daily totals (web `avgDailySpend`).
double averageDailySpend(List<DayGroup> days) {
  final totals = [for (final g in days) g.total].where((t) => t > 0).toList();
  if (totals.isEmpty) return 0;
  return totals.fold<double>(0, (a, b) => a + b) / totals.length;
}

class CategorySpend {
  const CategorySpend(this.id, this.name, this.icon, this.amount, this.percentage);
  final String id;
  final String name;
  final String icon;
  final double amount;
  final double percentage;
}

class TripTotals {
  const TripTotals({required this.totalSpent, required this.averageCost, required this.categories});
  final double totalSpent;
  final double averageCost;

  /// Largest first, zero-spend categories dropped.
  final List<CategorySpend> categories;
  CategorySpend? get top => categories.isEmpty ? null : categories.first;
}

/// Port of `nonSettlementExpenses`/`totalSpent`/`categoryData`/`averageCost`.
/// Settlements and expenses still waiting for approval never count toward money totals.
TripTotals computeTotals(List<Expense> active, {required int visibleMemberCount, required List<Category> categories}) {
  final counted = [
    for (final e in active)
      if (!e.title.startsWith('Settlement:') && e.approvalStatus != 'pending_approval') e,
  ];
  final total = counted.fold<double>(0, (s, e) => s + e.amount);
  final byCat = <String, double>{for (final c in categories) c.id: 0};
  for (final e in counted) {
    byCat[e.category] = (byCat[e.category] ?? 0) + e.amount;
  }
  final data = <CategorySpend>[];
  byCat.forEach((id, amount) {
    if (amount <= 0) return;
    Category? cat;
    for (final c in categories) {
      if (c.id == id) cat = c;
    }
    data.add(CategorySpend(id, cat?.name ?? 'Other', cat?.icon ?? '🏷️', amount, total > 0 ? amount / total * 100 : 0));
  });
  // JS sort is stable; Dart's is not, so tie-break on first-seen order.
  final order = {for (var i = 0; i < data.length; i++) data[i].id: i};
  data.sort((a, b) {
    final c = b.amount.compareTo(a.amount);
    return c != 0 ? c : order[a.id]!.compareTo(order[b.id]!);
  });
  return TripTotals(
    totalSpent: total,
    averageCost: visibleMemberCount > 0 ? total / visibleMemberCount : 0,
    categories: data,
  );
}

/// Who may edit/delete a row: trip admins or the expense's author.
bool canManageExpense(Expense e, {required bool isAdmin, required String? userId}) =>
    isAdmin || (userId != null && e.createdByUserId == userId);

class ExpenseReview {
  const ExpenseReview({required this.payerRemoved, required this.participantRemoved});
  final bool payerRemoved;
  final bool participantRemoved;
  bool get needsReview => payerRemoved || participantRemoved;

  /// Same wording as the web row warning.
  String? get message => !needsReview
      ? null
      : payerRemoved && participantRemoved
          ? 'Payer and a split member were removed — reassign the payer and update the split.'
          : payerRemoved
              ? 'Payer was removed — assign a new payer.'
              : 'A split member was removed — update the split.';
}

/// A payer or split member that is no longer on the trip.
ExpenseReview reviewExpense(Trip trip, Expense e) => ExpenseReview(
      payerRemoved: !trip.memberIds.contains(e.paidBy),
      participantRemoved: e.splitMemberIds.any((id) => !trip.memberIds.contains(id)),
    );

/// Port of the "your share" hint: shown only when it differs from the line total.
double? myShareToShow(Expense e, String? myMemberId) {
  final share = myMemberId == null ? null : e.resolvedShares[myMemberId];
  return (share != null && (share - e.amount).abs() > 0.01) ? share : null;
}

class AttentionChip {
  const AttentionChip(this.id, this.label, {this.count = 0});
  final String id; // owe | owed | disputes | invites | closeout
  final String label; // web wording (the UI localises from id + count)
  final int count;
}

/// Port of SummaryAttentionStrip's chips. [today] is yyyy-MM-dd.
List<AttentionChip> attentionChips({
  required Trip trip,
  required String? myMemberId,
  required List<MemberBalance> balances,
  required List<Expense> expenses,
  required List<Member> members,
  required bool disputesEnabled,
  required bool closeoutEnabled,
  required String today,
}) {
  final chips = <AttentionChip>[];
  if (myMemberId != null) {
    final mine = balances.where((b) => b.memberId == myMemberId).firstOrNull;
    if (mine != null && mine.balance < -0.009) {
      chips.add(const AttentionChip('owe', 'You owe · settle up'));
    } else if (mine != null && mine.balance > 0.009) {
      chips.add(const AttentionChip('owed', "You're owed · see who"));
    }
  }
  if (disputesEnabled) {
    final open = expenses.where((e) => e.tripId == trip.id && e.disputedAt != null).length;
    if (open > 0) chips.add(AttentionChip('disputes', '$open dispute${open == 1 ? '' : 's'}', count: open));
  }
  final byId = {for (final m in members) m.id: m};
  final unlinked = [for (final id in trip.memberIds) byId[id]].whereType<Member>().where((m) => !m.archived && m.linkedUserId == null).length;
  if (unlinked > 0) chips.add(AttentionChip('invites', '$unlinked invite${unlinked == 1 ? '' : 's'} pending', count: unlinked));
  if (!trip.closed && trip.endDate.isNotEmpty && closeoutEnabled && trip.endDate.compareTo(today) < 0) {
    chips.add(const AttentionChip('closeout', 'Close out trip'));
  }
  return chips;
}

/// Port of `getOrderedCategories`: the trip's saved order first; unlisted
/// categories keep their relative position at the end.
List<Category> orderedCategories(List<Category> categories, List<String>? order) {
  if (order == null || order.isEmpty) return categories;
  final rank = {for (var i = 0; i < order.length; i++) order[i]: i};
  final indexed = [for (var i = 0; i < categories.length; i++) (i, categories[i])];
  indexed.sort((a, b) {
    final ra = rank[a.$2.id] ?? 1 << 30;
    final rb = rank[b.$2.id] ?? 1 << 30;
    return ra != rb ? ra.compareTo(rb) : a.$1.compareTo(b.$1);
  });
  return [for (final e in indexed) e.$2];
}
