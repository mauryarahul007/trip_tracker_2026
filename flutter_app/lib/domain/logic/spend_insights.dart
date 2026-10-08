import '../models/expense.dart';

/// Total spent on one calendar day (`yyyy-MM-dd`).
class DaySpend {
  const DaySpend(this.date, this.total);
  final String date;
  final double total;
}

/// Total spent in one category.
class CategorySpend {
  const CategorySpend(this.categoryId, this.total);
  final String categoryId;
  final double total;
}

/// Settlements and deleted rows are not spending.
Iterable<Expense> _spending(Iterable<Expense> all) => all.where((e) => !e.isSettlement && e.deletedAt == null);

/// Daily totals, oldest first. Days without spending are omitted.
List<DaySpend> spendByDay(Iterable<Expense> all) {
  final byDay = <String, double>{};
  for (final e in _spending(all)) {
    byDay[e.date] = (byDay[e.date] ?? 0) + e.amount;
  }
  final days = byDay.keys.toList()..sort();
  return [for (final d in days) DaySpend(d, byDay[d]!)];
}

/// Category totals, biggest first.
List<CategorySpend> spendByCategory(Iterable<Expense> all) {
  final byCat = <String, double>{};
  for (final e in _spending(all)) {
    byCat[e.category] = (byCat[e.category] ?? 0) + e.amount;
  }
  final out = [for (final c in byCat.entries) CategorySpend(c.key, c.value)];
  out.sort((a, b) => b.total.compareTo(a.total));
  return out;
}
