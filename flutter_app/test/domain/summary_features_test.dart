import 'package:flutter_test/flutter_test.dart';
import 'package:trip_tracker/domain/logic/settlement.dart';
import 'package:trip_tracker/domain/models/travel_pass.dart';
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

  TravelPass pass(String id, String? start) =>
      TravelPass(id: id, tripId: 't', type: 'flight', title: id, startDateTime: start, createdAt: 0, updatedAt: 0);

  test('next pass: the earliest one still ahead; none when all are past or undated', () {
    final now = DateTime(2026, 10, 18, 12);
    final next = nextPass([
      pass('past', '2026-10-18T08:00'),
      pass('later', '2026-10-20T09:00'),
      pass('soon', '2026-10-18T15:30'),
      pass('undated', null),
    ], now);
    expect(next?.id, 'soon');
    expect(nextPass([pass('past', '2026-10-01T08:00'), pass('undated', null)], now), isNull);
  });

  test('next pass: multi-leg progression selects Leg 2 once Leg 1 reaches its endDateTime', () {
    final leg1 = TravelPass(
      id: 'leg1',
      tripId: 't',
      type: 'flight',
      title: 'Leg 1',
      startDateTime: '2026-10-18T08:00:00',
      endDateTime: '2026-10-18T10:00:00',
      createdAt: 0,
      updatedAt: 0,
    );
    final leg2 = TravelPass(
      id: 'leg2',
      tripId: 't',
      type: 'flight',
      title: 'Leg 2',
      startDateTime: '2026-10-18T12:00:00',
      endDateTime: '2026-10-18T14:00:00',
      createdAt: 0,
      updatedAt: 0,
    );

    // At 09:00: Leg 1 is currently underway
    final at0900 = DateTime(2026, 10, 18, 9, 0);
    expect(nextPass([leg1, leg2], at0900)?.id, 'leg1');

    // At 10:15: Leg 1 has finished; nextPass automatically returns Leg 2
    final at1015 = DateTime(2026, 10, 18, 10, 15);
    expect(nextPass([leg1, leg2], at1015)?.id, 'leg2');

    // At 14:30: Both legs have finished; returns null
    final at1430 = DateTime(2026, 10, 18, 14, 30);
    expect(nextPass([leg1, leg2], at1430), isNull);
  });

  test('spent on a day', () {
    expect(spentOn([(date: '2026-10-18', total: 40), (date: '2026-10-19', total: 5)], '2026-10-18'), 40);
    expect(spentOn(const [], '2026-10-18'), 0);
  });

  test('day buckets: today, yesterday, older by calendar day (not by 24 hours)', () {
    final now = DateTime(2026, 10, 18, 9);
    expect(dayBucket(DateTime(2026, 10, 18, 0, 5).toIso8601String(), now).bucket, DayBucket.today);
    expect(dayBucket(DateTime(2026, 10, 17, 23, 55).toIso8601String(), now).bucket, DayBucket.yesterday);
    expect(dayBucket(DateTime(2026, 10, 10, 12).toIso8601String(), now).bucket, DayBucket.older);
    expect(dayBucket('garbage', now).bucket, DayBucket.older);
  });

  test('round down to a clean amount: never up, nothing for small or already-clean amounts', () {
    expect(roundDownToClean(287), 280);
    expect(roundDownToClean(287.9), 280);
    expect(roundDownToClean(12340), 12300);
    expect(roundDownToClean(280), isNull); // already clean
    expect(roundDownToClean(19.5), isNull); // too small to bother
    expect(roundDownToClean(20.4), 20);
    expect(roundDownToClean(0), isNull);
  });

  test('expense history: the author by linked user, and an edit only well after creation', () {
    final members = [(linkedUserId: 'u1', name: 'Asha'), (linkedUserId: 'u2', name: 'Ben')];
    final fresh = expenseHistory(createdByUserId: 'u2', createdAt: 1000, updatedAt: 20000, members: members);
    expect((fresh.addedBy, fresh.edited), ('Ben', false)); // saved again within a minute: not an edit
    final edited = expenseHistory(createdByUserId: 'u1', createdAt: 1000, updatedAt: 500000, members: members);
    expect((edited.addedBy, edited.edited, edited.editedAt), ('Asha', true, 500000));
    expect(expenseHistory(createdByUserId: 'gone', createdAt: 1, updatedAt: 1, members: members).addedBy, isNull);
    expect(expenseHistory(createdByUserId: null, createdAt: 1, updatedAt: 1, members: members).addedBy, isNull);
  });
}
