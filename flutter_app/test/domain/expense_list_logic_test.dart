import 'package:flutter_test/flutter_test.dart';
import 'package:trip_tracker/domain/logic/default_categories.g.dart';
import 'package:trip_tracker/domain/logic/expense_list_logic.dart';
import 'package:trip_tracker/domain/logic/settlement.dart' show MemberBalance;
import 'package:trip_tracker/domain/models/expense.dart';
import 'package:trip_tracker/domain/models/member.dart';
import 'package:trip_tracker/domain/models/trip.dart';

Expense ex(
  String id, {
  String title = 'Lunch',
  double amount = 100,
  String date = '2026-10-05',
  String category = 'cat-food',
  String paidBy = 'a',
  List<String> split = const ['a', 'b'],
  Map<String, double> shares = const {'a': 50, 'b': 50},
  bool settlement = false,
  String approval = 'confirmed',
  int? disputedAt,
  ExpenseLocation? location,
}) => Expense(
  id: id,
  tripId: 't',
  title: title,
  amount: amount,
  currency: 'INR',
  category: category,
  date: date,
  paidBy: paidBy,
  splitMode: 'equal',
  splitMemberIds: split,
  resolvedShares: shares,
  isSettlement: settlement,
  approvalStatus: approval,
  disputedAt: disputedAt,
  location: location,
  createdAt: 1,
  updatedAt: 1,
);

void main() {
  final all = [
    ex('1', title: 'Beach Lunch', amount: 120, date: '2026-10-06', paidBy: 'a', split: ['a', 'b']),
    ex('2', title: 'Taxi', amount: 40, date: '2026-10-06', category: 'cat-travel', paidBy: 'b', split: ['b', 'c']),
    ex('3', title: 'Hotel', amount: 900, date: '2026-10-05', category: 'cat-stay', paidBy: 'c', split: ['a', 'b', 'c']),
    ex(
      '4',
      title: 'Museum',
      amount: 60,
      date: '2026-10-04',
      category: 'cat-activities',
      paidBy: 'a',
      split: ['a'],
      location: const ExpenseLocation(lat: 1, lng: 2, placeName: 'Panjim'),
    ),
  ];
  ids(List<Expense> l) => [for (final e in l) e.id];

  group('filterExpenses (port of filteredExpenses)', () {
    test(
      'no filters keeps everything in order',
      () => expect(ids(filterExpenses(all, const ExpenseFilters())), ['1', '2', '3', '4']),
    );

    test('search is a case-insensitive title match, trimmed', () {
      expect(ids(filterExpenses(all, const ExpenseFilters(query: '  LUNCH '))), ['1']);
      expect(ids(filterExpenses(all, const ExpenseFilters(query: 'zzz'))), isEmpty);
    });

    test('category and member (payer OR in the split)', () {
      expect(ids(filterExpenses(all, const ExpenseFilters(categoryId: 'cat-stay'))), ['3']);
      expect(ids(filterExpenses(all, const ExpenseFilters(memberId: 'c'))), ['2', '3']);
      expect(ids(filterExpenses(all, const ExpenseFilters(memberId: 'a'))), ['1', '3', '4']);
    });

    test('date range is inclusive on both ends', () {
      expect(ids(filterExpenses(all, const ExpenseFilters(dateFrom: '2026-10-05', dateTo: '2026-10-06'))), [
        '1',
        '2',
        '3',
      ]);
      expect(ids(filterExpenses(all, const ExpenseFilters(dateFrom: '2026-10-06'))), ['1', '2']);
      expect(ids(filterExpenses(all, const ExpenseFilters(dateTo: '2026-10-04'))), ['4']);
    });

    test('amount bounds are inclusive; unparseable bounds are ignored like NaN', () {
      expect(ids(filterExpenses(all, const ExpenseFilters(amountMin: '60', amountMax: '120'))), ['1', '4']);
      expect(ids(filterExpenses(all, const ExpenseFilters(amountMin: 'abc'))), ['1', '2', '3', '4']);
      expect(ids(filterExpenses(all, const ExpenseFilters(amountMax: ' 40 '))), ['2']);
    });

    test('relation filters need a member id; without one they are ignored (web)', () {
      expect(ids(filterExpenses(all, const ExpenseFilters(relation: ExpenseRelation.paidByMe), myMemberId: 'a')), [
        '1',
        '4',
      ]);
      expect(ids(filterExpenses(all, const ExpenseFilters(relation: ExpenseRelation.involvesMe), myMemberId: 'c')), [
        '2',
        '3',
      ]);
      expect(ids(filterExpenses(all, const ExpenseFilters(relation: ExpenseRelation.paidByMe))), ['1', '2', '3', '4']);
    });

    test('location matches the place name exactly', () {
      expect(ids(filterExpenses(all, const ExpenseFilters(location: 'Panjim'))), ['4']);
      expect(ids(filterExpenses(all, const ExpenseFilters(location: 'panjim'))), isEmpty);
    });

    test('filters combine (AND) and hasActive reflects any of them', () {
      expect(ids(filterExpenses(all, const ExpenseFilters(memberId: 'a', categoryId: 'cat-activities'))), ['4']);
      expect(const ExpenseFilters().hasActive, isFalse);
      expect(const ExpenseFilters(amountMax: '1').hasActive, isTrue);
      expect(const ExpenseFilters(relation: ExpenseRelation.paidByMe).hasActive, isTrue);
      expect(const ExpenseFilters(relation: ExpenseRelation.paidByMe).copyWith(clearRelation: true).hasActive, isFalse);
    });
  });

  group('day groups', () {
    test('groups consecutive same-date rows and totals them', () {
      final g = groupByDay(all);
      expect([for (final d in g) d.date], ['2026-10-06', '2026-10-05', '2026-10-04']);
      expect(g.first.total, 160);
      expect(ids(g.first.expenses), ['1', '2']);
    });

    test('non-adjacent same dates stay separate (input is expected newest-first)', () {
      final g = groupByDay([ex('a', date: '2026-10-01'), ex('b', date: '2026-10-02'), ex('c', date: '2026-10-01')]);
      expect(g.length, 3);
    });

    test('average daily spend ignores zero days and empty lists', () {
      expect(averageDailySpend(groupByDay(all)), (160 + 900 + 60) / 3);
      expect(averageDailySpend([]), 0);
      expect(averageDailySpend(groupByDay([ex('z', amount: 0)])), 0);
    });

    test('settlements are separated from real expenses', () {
      expect(isActualExpense(ex('s', settlement: true)), isFalse);
      expect(isActualExpense(ex('s', title: 'Settlement: A → B')), isFalse);
      expect(isActualExpense(ex('s')), isTrue);
    });
  });

  group('totals (port of totalSpent / categoryData / averageCost)', () {
    test('settlements and pending-approval expenses never count; categories sort by spend', () {
      final list = [
        ex('1', amount: 100, category: 'cat-food'),
        ex('2', amount: 300, category: 'cat-stay'),
        ex('3', amount: 50, category: 'cat-food'),
        ex('4', title: 'Settlement: A → B', amount: 999),
        ex('5', amount: 700, approval: 'pending_approval', category: 'cat-travel'),
      ];
      final t = computeTotals(list, visibleMemberCount: 3, categories: defaultCategories);
      expect(t.totalSpent, 450);
      expect(t.averageCost, 150);
      expect([for (final c in t.categories) c.id], ['cat-stay', 'cat-food']);
      expect(t.top!.name, 'Stay & Hotel');
      expect(t.top!.percentage, closeTo(300 / 450 * 100, 1e-9));
    });

    test('unknown category shows as Other; no members -> zero average; empty -> no top', () {
      final t = computeTotals(
        [ex('1', amount: 10, category: 'gone')],
        visibleMemberCount: 0,
        categories: defaultCategories,
      );
      expect(t.categories.single.name, 'Other');
      expect(t.averageCost, 0);
      expect(computeTotals([], visibleMemberCount: 2, categories: defaultCategories).top, isNull);
    });

    test('equal-spend categories keep first-seen order (stable sort)', () {
      final t = computeTotals(
        [ex('1', amount: 10, category: 'cat-misc'), ex('2', amount: 10, category: 'cat-food')],
        visibleMemberCount: 1,
        categories: defaultCategories,
      );
      expect(
        [for (final c in t.categories) c.id],
        ['cat-food', 'cat-misc'],
      ); // follows the category list, like the web's object order
    });
  });

  group('row rules', () {
    final trip = Trip.fromJson({
      'id': 't',
      'name': 'T',
      'memberIds': ['a', 'b'],
    });

    test('removed payer / participants produce the web warnings', () {
      expect(reviewExpense(trip, ex('1')).needsReview, isFalse);
      expect(reviewExpense(trip, ex('1', paidBy: 'gone')).message, 'Payer was removed — assign a new payer.');
      expect(
        reviewExpense(trip, ex('1', split: ['a', 'gone'])).message,
        'A split member was removed — update the split.',
      );
      expect(
        reviewExpense(trip, ex('1', paidBy: 'gone', split: ['gone'])).message,
        'Payer and a split member were removed — reassign the payer and update the split.',
      );
    });

    test('who can manage a row: admin or author', () {
      const e = Expense(
        id: 'e',
        tripId: 't',
        title: 't',
        amount: 1,
        currency: 'INR',
        category: 'c',
        date: 'd',
        paidBy: 'a',
        splitMode: 'equal',
        createdByUserId: 'u1',
        createdAt: 1,
        updatedAt: 1,
      );
      expect(canManageExpense(e, isAdmin: true, userId: 'x'), isTrue);
      expect(canManageExpense(e, isAdmin: false, userId: 'u1'), isTrue);
      expect(canManageExpense(e, isAdmin: false, userId: 'u2'), isFalse);
      expect(canManageExpense(e, isAdmin: false, userId: null), isFalse);
    });

    test('"your share" only when it differs from the total', () {
      expect(myShareToShow(ex('1', amount: 100, shares: {'a': 50}), 'a'), 50);
      expect(myShareToShow(ex('1', amount: 100, shares: {'a': 100}), 'a'), isNull);
      expect(myShareToShow(ex('1', amount: 100, shares: {'a': 99.995}), 'a'), isNull); // within a cent
      expect(myShareToShow(ex('1'), null), isNull);
      expect(myShareToShow(ex('1'), 'zz'), isNull);
    });
  });

  group('attention chips (port of SummaryAttentionStrip)', () {
    final trip = Trip.fromJson({
      'id': 't',
      'name': 'T',
      'memberIds': ['a', 'b', 'c'],
      'endDate': '2026-10-01',
    });
    final members = [
      const Member(id: 'a', name: 'A', linkedUserId: 'u1'),
      const Member(id: 'b', name: 'B'),
      const Member(id: 'c', name: 'C', archived: true),
    ];
    List<AttentionChip> chips({
      double mine = 0,
      bool disputes = true,
      bool closeout = true,
      Trip? t,
      List<Expense>? ex2,
    }) => attentionChips(
      trip: t ?? trip,
      myMemberId: 'a',
      balances: [MemberBalance(memberId: 'a', name: 'A', balance: mine)],
      expenses: ex2 ?? [ex('1', disputedAt: 5), ex('2', disputedAt: 6), ex('3')],
      members: members,
      disputesEnabled: disputes,
      closeoutEnabled: closeout,
      today: '2026-10-06',
    );
    labels(List<AttentionChip> c) => [for (final x in c) x.label];

    test('owe / owed use a 0.009 threshold', () {
      expect(labels(chips(mine: -5)).first, 'You owe · settle up');
      expect(labels(chips(mine: 5)).first, "You're owed · see who");
      expect(labels(chips(mine: 0.005)).first, isNot(anyOf('You owe · settle up', "You're owed · see who")));
    });

    test('disputes count, singular/plural, flag-gated', () {
      expect(labels(chips()), contains('2 disputes'));
      expect(labels(chips(ex2: [ex('1', disputedAt: 5)])), contains('1 dispute'));
      expect(labels(chips(disputes: false)).any((l) => l.contains('dispute')), isFalse);
    });

    test('pending invites count only active unlinked members', () {
      expect(labels(chips()), contains('1 invite pending')); // b; archived c and linked a excluded
    });

    test('close-out only after the end date, if open, if enabled', () {
      expect(labels(chips()), contains('Close out trip'));
      expect(labels(chips(closeout: false)), isNot(contains('Close out trip')));
      expect(
        labels(
          chips(
            t: Trip.fromJson({
              'id': 't',
              'name': 'T',
              'memberIds': ['a'],
              'endDate': '2026-10-06',
            }),
          ),
        ),
        isNot(contains('Close out trip')),
      ); // ends today
      expect(
        labels(
          chips(
            t: Trip.fromJson({
              'id': 't',
              'name': 'T',
              'memberIds': ['a'],
              'endDate': '2026-10-01',
              'closed': true,
            }),
          ),
        ),
        isNot(contains('Close out trip')),
      );
    });
  });
}
