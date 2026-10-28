import '../models/expense.dart';
import 'refunds.dart';

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
Iterable<Expense> _spending(Iterable<Expense> all) =>
    applyRefunds(all.where((e) => !e.isSettlement && e.deletedAt == null && !e.excludeFromTotals).toList());

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

/// Running total after each day in [days] (same order), for the "how spend built up" line.
List<double> runningTotals(List<DaySpend> days) {
  var sum = 0.0;
  return [for (final d in days) sum += d.total];
}

/// The [n] biggest spending rows, refunds already netted into their parent, biggest first.
List<Expense> topExpenses(Iterable<Expense> all, {int n = 5}) {
  final out = _spending(all).toList()..sort((a, b) => b.amount.compareTo(a.amount));
  return out.take(n).toList();
}
