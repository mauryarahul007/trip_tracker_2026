import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:trip_tracker/app/router.dart';
import 'package:trip_tracker/core/clock.dart';

import '../support/pump_app.dart';
import '../support/seed.dart';

/// Phase 4 (A13, B16): the screens a trip traveler lives in, plus the ones added in Phases 1 and 3, at 200% text
/// and in dark mode, with the tap-target, label and contrast guidelines. a11y_test.dart covers the rest.
Future<void> go(WidgetTester t, String path) async {
  unawaited(containerOf(t).read(routerProvider).push<void>(path));
  await settle(t, rounds: 10);
}

Future<void> guidelines(WidgetTester tester) async {
  await expectLater(tester, meetsGuideline(androidTapTargetGuideline));
  await expectLater(tester, meetsGuideline(iOSTapTargetGuideline));
  await expectLater(tester, meetsGuideline(labeledTapTargetGuideline));
  await expectLater(tester, meetsGuideline(textContrastGuideline));
}

final _screens = <String, String Function(String)>{
  'trip summary': (id) => '/trip/$id/ledger',
  'trip expenses': (id) => '/trip/$id/expenses',
  'trip activity': (id) => '/trip/$id/activity',
  'recycle bin': (id) => '/trip/$id/recycle-bin',
  'receipts': (id) => '/trip/$id/receipts',
  'categories': (id) => '/trip/$id/categories',
  'balances (all trips)': (_) => '/balances',
  'archived trips': (_) => '/settings/archived',
  'storage': (_) => '/settings/storage',
};

Future<void> _open(WidgetTester tester, String Function(String) path, {bool quiet = false}) async {
  await pumpApp(
    tester,
    user: asha,
    overrides: [if (quiet) nowProvider.overrideWithValue(() => DateTime.now().add(const Duration(days: 5)))],
  );
  final s = await seedTrip(tester);
  await addExpense(tester, s, amount: 300, paidBy: s.ben, split: [s.me, s.ben]);
  await go(tester, path(s.tripId));
}

/// Fails with the widget that overflowed, not just "overflowed by N pixels".
void _noOverflow(WidgetTester tester) {
  final ex = tester.takeException();
  if (ex == null) return;
  fail(ex is FlutterError ? ex.toStringDeep() : '$ex');
}

void main() {
  group('200% text', () {
    for (final e in _screens.entries) {
      testApp('${e.key} has no overflow', (tester) async {
        tester.platformDispatcher.textScaleFactorTestValue = 2.0;
        addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
        await _open(tester, e.value);
        _noOverflow(tester);
      });
    }

    testApp('trip with the settle-up banner has no overflow', (tester) async {
      tester.platformDispatcher.textScaleFactorTestValue = 2.0;
      addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
      await _open(tester, (id) => '/trip/$id/expenses', quiet: true);
      expect(find.byKey(const Key('settle-nudge')), findsOneWidget);
      _noOverflow(tester);
    });
  });

  group('guidelines, light and dark', () {
    for (final dark in [false, true]) {
      for (final e in _screens.entries) {
        testApp('${e.key} (${dark ? 'dark' : 'light'})', (tester) async {
          if (dark) {
            tester.platformDispatcher.platformBrightnessTestValue = Brightness.dark;
            addTearDown(tester.platformDispatcher.clearPlatformBrightnessTestValue);
          }
          final handle = tester.ensureSemantics();
          await _open(tester, e.value);
          await guidelines(tester);
          handle.dispose();
        });
      }
    }

    for (final dark in [false, true]) {
      testApp('settle-up banner (${dark ? 'dark' : 'light'})', (tester) async {
        if (dark) {
          tester.platformDispatcher.platformBrightnessTestValue = Brightness.dark;
          addTearDown(tester.platformDispatcher.clearPlatformBrightnessTestValue);
        }
        final handle = tester.ensureSemantics();
        await _open(tester, (id) => '/trip/$id/expenses', quiet: true);
        expect(find.byKey(const Key('settle-nudge')), findsOneWidget);
        await guidelines(tester);
        handle.dispose();
      });
    }
  });
}
