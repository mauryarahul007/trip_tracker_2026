@Tags(['perf'])
library;

import 'package:flutter_test/flutter_test.dart';
import 'package:trip_tracker/domain/logic/default_categories.g.dart';
import 'package:trip_tracker/domain/logic/expense_list_logic.dart';
import 'package:trip_tracker/domain/logic/group_spend.dart';
import 'package:trip_tracker/domain/logic/settlement.dart';
import 'package:trip_tracker/domain/logic/spend_insights.dart';
import 'package:trip_tracker/domain/models/expense.dart';

import '../support/model_builders.dart';

/// Phase 2 (docs/UX_ROADMAP.md): how long the pure functions that the Ledger tab runs inside build() take.
/// Prints PERF lines; see docs/perf-baseline.md.
void main() {
  final members = {for (final i in List.generate(6, (i) => 'm$i')) i: memberOf(i)};
  List<Expense> expenses(int n) => [
    for (var i = 0; i < n; i++)
      expenseOf('e$i', 't1', 'Expense $i', date: '2026-10-0${1 + i % 9}').copyWith(
        amount: 50.0 + i % 400,
        paidBy: 'm${i % 6}',
        splitMemberIds: [for (var k = 0; k < 6; k++) 'm$k'],
        category: const ['cat-food', 'cat-transport', 'cat-stay'][i % 3],
      ),
  ];

  double ms(void Function() f, {int reps = 20}) {
    f(); // warm up
    final sw = Stopwatch()..start();
    for (var i = 0; i < reps; i++) {
      f();
    }
    return sw.elapsedMicroseconds / reps / 1000;
  }

  for (final n in [500, 5000]) {
    test('ledger build maths at $n expenses', () {
      final ex = expenses(n);
      final trip = tripOf('t1', 'Goa');
      final settle = ms(() => calculateSettlements(trip, members, ex));
      final totals = ms(() => computeTotals(ex, visibleMemberCount: 6, categories: defaultCategories));
      final spend = ms(() => memberSpend(ex));
      final days = ms(() => spendByDay(ex));
      // ignore: avoid_print
      print(
        'PERF n=$n settlement=${settle.toStringAsFixed(2)} ms totals=${totals.toStringAsFixed(2)} ms '
        'memberSpend=${spend.toStringAsFixed(2)} ms spendByDay=${days.toStringAsFixed(2)} ms',
      );
    });
  }
}
