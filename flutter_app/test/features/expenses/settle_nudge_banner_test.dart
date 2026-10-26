import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:trip_tracker/core/clock.dart';

import '../../support/pump_app.dart';
import '../../support/seed.dart';

Finder key(String k) => find.byKey(Key(k));

Future<Seed> _quietTripWhereIOwe(WidgetTester tester, {Set<String> flagsOff = const {}, bool quiet = true}) async {
  await pumpApp(
    tester,
    user: asha,
    flagsOff: flagsOff,
    overrides: [if (quiet) nowProvider.overrideWithValue(() => DateTime.now().add(const Duration(days: 5)))],
  );
  final s = await seedTrip(tester);
  await addExpense(tester, s, amount: 60, paidBy: s.ben, split: [s.me, s.ben]); // Asha owes Ben 30
  await settle(tester);
  GoRouter.of(tester.element(find.byType(Scaffold).first)).go('/trip/${s.tripId}/expenses');
  await settle(tester, rounds: 14);
  return s;
}

void main() {
  testApp('a quiet trip where I owe shows the banner; dismiss hides it', (tester) async {
    await _quietTripWhereIOwe(tester);
    expect(key('settle-nudge'), findsOneWidget);
    expect(find.textContaining('You still owe'), findsOneWidget);
    await tester.tap(key('settle-nudge-dismiss'));
    await settle(tester);
    expect(key('settle-nudge'), findsNothing);
  });

  testApp('Settle up opens Balances', (tester) async {
    await _quietTripWhereIOwe(tester);
    await tester.tap(key('settle-nudge-go'));
    await settle(tester, rounds: 14);
    final router = GoRouter.of(tester.element(find.byType(Scaffold).first));
    expect(router.routerDelegate.currentConfiguration.uri.path, endsWith('/ledger'));
  });

  testApp('an active trip (just touched) shows no banner', (tester) async {
    await _quietTripWhereIOwe(tester, quiet: false);
    expect(key('settle-nudge'), findsNothing);
  });

  testApp('flag off: no banner', (tester) async {
    await _quietTripWhereIOwe(tester, flagsOff: {'enableSettleNudge'});
    expect(key('settle-nudge'), findsNothing);
  });
}
