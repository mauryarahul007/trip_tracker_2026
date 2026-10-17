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

  Suggestion? first(List<Suggestion> l, SuggestionKind k) => l.where((x) => x.kind == k).firstOrNull;
  List<Suggestion> tips({
    double spent = 1000,
    double budget = 0,
    double? projected,
    ({String name, double percent})? cat,
    ({String name, double percent})? payer,
    int open = 0,
    ({String date, double total})? day,
    int days = 5,
    int members = 4,
    int max = 3,
  }) => buildSuggestions(
    totalSpent: spent,
    budget: budget,
    projectedTotal: projected,
    topCategory: cat,
    topPayer: payer,
    openPayments: open,
    biggestDay: day,
    dayCount: days,
    memberCount: members,
    max: max,
  );

  test('suggestions: no budget asks for one; over budget, pace and near-budget are exclusive', () {
    expect(tips().single.kind, SuggestionKind.setBudget);
    expect(tips(spent: 0).isEmpty, isTrue);
    expect(tips(budget: 800).first.kind, SuggestionKind.overBudget);
    expect(tips(budget: 800).first.amount, 200);
    expect(tips(spent: 500, budget: 800, projected: 1200).first.kind, SuggestionKind.overPace);
    expect(tips(spent: 700, budget: 800, projected: 780).first.kind, SuggestionKind.nearBudget);
    expect(tips(spent: 100, budget: 800, projected: 400).isEmpty, isTrue);
  });

  test('suggestions: open payments, heavy payer, top category and biggest day, capped at three', () {
    final all = tips(
      budget: 800,
      open: 3,
      payer: (name: 'Ben', percent: 70),
      cat: (name: 'Food', percent: 52),
      day: (date: '2026-10-03', total: 400),
    );
    expect(all.length, 3);
    expect(all.map((e) => e.kind), [SuggestionKind.overBudget, SuggestionKind.openPayments, SuggestionKind.payerHeavy]);
    final more = tips(
      spent: 100,
      budget: 800,
      projected: 300,
      payer: (name: 'Ben', percent: 70),
      cat: (name: 'Food', percent: 52),
      day: (date: '2026-10-03', total: 400),
      max: 5,
    );
    expect(first(more, SuggestionKind.topCategory)!.name, 'Food');
    expect(first(more, SuggestionKind.biggestDay)!.date, '2026-10-03');
    expect(
      tips(payer: (name: 'Ben', percent: 70), members: 2),
      isNot(contains(isA<Suggestion>().having((s) => s.kind, 'kind', SuggestionKind.payerHeavy))),
    );
    expect(tips(cat: (name: 'Food', percent: 30)).where((s) => s.kind == SuggestionKind.topCategory), isEmpty);
    expect(
      tips(day: (date: '2026-10-03', total: 400), days: 2).where((s) => s.kind == SuggestionKind.biggestDay),
      isEmpty,
    );
  });

  test('daily allowance: what is left per remaining day, zero once spent', () {
    expect(dailyAllowance(1000, 400, 3), 200);
    expect(dailyAllowance(1000, 1200, 3), 0);
    expect(dailyAllowance(0, 100, 3), isNull);
    expect(dailyAllowance(1000, 100, 0), isNull);
  });
}
