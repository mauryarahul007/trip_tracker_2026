@Tags(['perf'])
@Timeout(Duration(minutes: 10))
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

import '../support/pump_app.dart';
import '../support/seed.dart';

/// Phase 0 baseline (docs/UX_ROADMAP.md). Prints how heavy the trip tabs are on a big trip.
/// Numbers go in docs/perf-baseline.md. Widget tests do not rasterise, so these are
/// build-cost proxies (widget and Text count, wall time); real frame timing needs `flutter run --profile`.
const _expenses = 500;
const _budgetMs = 60000; // generous: only fails if something is catastrophically slow

void main() {
  testApp('large trip: how heavy are the tabs', (tester) async {
    await pumpApp(tester, user: asha);
    await settle(tester);
    final s = await seedTrip(tester);

    final seeding = Stopwatch()..start();
    for (var i = 0; i < _expenses; i++) {
      await addExpense(
        tester,
        s,
        title: 'Expense $i',
        amount: 50.0 + i,
        date: '2026-10-0${1 + i % 9}',
        category: const ['cat-food', 'cat-transport', 'cat-stay'][i % 3],
      );
    }
    seeding.stop();
    // ignore: avoid_print
    print('PERF seed $_expenses expenses: ${seeding.elapsedMilliseconds} ms');

    for (final tab in ['expenses', 'ledger', 'notes']) {
      GoRouter.of(tester.element(find.byType(Scaffold).first)).go('/trip/${s.tripId}/chat');
      await settle(tester, rounds: 4);
      final sw = Stopwatch()..start();
      GoRouter.of(tester.element(find.byType(Scaffold).first)).go('/trip/${s.tripId}/$tab');
      await settle(tester, rounds: 14);
      sw.stop();
      final built = tester.allWidgets.length;
      final texts = find.byType(Text).evaluate().length;
      final scroller = find.byType(Scrollable).first;
      final fling = Stopwatch()..start();
      await tester.fling(scroller, const Offset(0, -3000), 4000);
      await tester.pump(const Duration(milliseconds: 500));
      fling.stop();
      // ignore: avoid_print
      print(
        'PERF $tab: open=${sw.elapsedMilliseconds} ms widgets=$built texts=$texts fling=${fling.elapsedMilliseconds} ms',
      );
      expect(sw.elapsedMilliseconds, lessThan(_budgetMs));
    }
  });
}
