import 'package:flutter_test/flutter_test.dart';
import 'package:trip_tracker/domain/logic/settlement.dart';
import 'package:trip_tracker/domain/logic/summary_features.dart';

void main() {
  test('budget status: ok, warn at 80%, over past 100%', () {
    expect(budgetStatus(50, 100).level, BudgetLevel.ok);
    expect(budgetStatus(80, 100).level, BudgetLevel.warn);
    final over = budgetStatus(130, 100);
    expect((over.level, over.fraction, over.remaining), (BudgetLevel.over, 1.0, -30));
    expect(budgetStatus(10, 0).level, BudgetLevel.ok);
  });

  test('category progress counts done per category and skips empty ones', () {
    final r = categoryProgress(
      [(category: 'packing', done: true), (category: 'packing', done: false), (category: 'documents', done: true)],
      ['packing', 'prep', 'documents'],
    );
    expect(r.map((e) => (e.category, e.done, e.total)), [('packing', 1, 2), ('documents', 1, 1)]);
  });

  test('share layout: total is the big line; transfers are capped with a +more line', () {
    Transfer t(int i) => Transfer(
      from: 'a$i',
      to: 'b',
      fromLabel: 'A$i',
      toLabel: 'B',
      fromMemberId: 'a$i',
      toMemberId: 'b',
      amount: 10,
    );
    final l = tripSummaryShareLayout(
      tripName: 'Goa Trip',
      currencySymbol: '₹',
      totalSpent: 1200,
      perPerson: 300,
      travellers: 4,
      transfers: [for (var i = 0; i < 8; i++) t(i)],
    );
    expect(l.lines[3], '₹1,200.00');
    expect(l.lines.where((x) => x.contains('→')).length, 6);
    expect(l.lines, contains('+2 more'));
    expect(l.fileName, 'Goa_Trip_summary.png');
  });
}
