import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:trip_tracker/app/router.dart';
import 'package:trip_tracker/core/clock.dart';
import 'package:trip_tracker/domain/logic/expense_form_logic.dart' show todayDateString;
import 'package:trip_tracker/core/platform/haptics.dart';
import 'package:trip_tracker/shared/theme/app_theme.dart';
import 'package:trip_tracker/shared/theme/app_tokens.dart';

import '../support/pump_app.dart';
import '../support/seed.dart';

Finder key(String k) => find.byKey(Key(k));

Future<void> goTo(WidgetTester tester, String path) async {
  await settle(tester);
  GoRouter.of(tester.element(find.byType(Scaffold).first)).go(path);
  await settle(tester, rounds: 14);
}

double contrast(Color a, Color b) {
  final la = a.computeLuminance() + 0.05;
  final lb = b.computeLuminance() + 0.05;
  return la > lb ? la / lb : lb / la;
}

void main() {
  group('trip top bar', () {
    testApp('Share, Route map, Trip settings and App settings live in one More menu', (tester) async {
      await pumpApp(tester, user: asha);
      final s = await seedTrip(tester);
      await goTo(tester, '/trip/${s.tripId}/ledger');
      expect(find.byTooltip('Share Trip'), findsNothing); // no loose buttons any more
      expect(find.byTooltip('Settings'), findsNothing);
      await tester.tap(key('action-trip-more'));
      await settle(tester, rounds: 4);
      for (final k in ['action-share', 'action-trip-map', 'action-trip-settings', 'action-app-settings']) {
        expect(key(k), findsOneWidget, reason: k);
      }
    });

    testApp('flag off: the older separate buttons come back', (tester) async {
      await pumpApp(tester, user: asha, flagsOff: {'enableCleanTopBar'});
      final s = await seedTrip(tester);
      await goTo(tester, '/trip/${s.tripId}/ledger');
      expect(find.byTooltip('Share Trip'), findsOneWidget);
      expect(key('action-trip-map'), findsOneWidget);
    });
  });

  group('quick action buttons', () {
    testApp('Notes: Add item on the checklist, Add note on Notes; Members: Add member', (tester) async {
      await pumpApp(tester, user: asha);
      final s = await seedTrip(tester);
      await goTo(tester, '/trip/${s.tripId}/notes');
      expect(key('notes-fab'), findsOneWidget);
      await tester.tap(find.descendant(of: key('notes-panes'), matching: find.text('Notes')));
      await settle(tester, rounds: 4);
      await tester.tap(key('notes-fab'));
      await settle(tester, rounds: 6);
      expect(find.text('Add note'), findsWidgets);
      await goTo(tester, '/trip/${s.tripId}/members');
      expect(key('members-fab'), findsOneWidget);
    });

    testApp('flag off: no floating buttons on Notes or Members', (tester) async {
      await pumpApp(tester, user: asha, flagsOff: {'enableContextFab'});
      final s = await seedTrip(tester);
      await goTo(tester, '/trip/${s.tripId}/notes');
      expect(key('notes-fab'), findsNothing);
      await goTo(tester, '/trip/${s.tripId}/members');
      expect(key('members-fab'), findsNothing);
    });
  });

  group('jump to today', () {
    testApp('after scrolling down, a chip returns to today\'s day', (tester) async {
      await pumpApp(tester, user: asha);
      final s = await seedTrip(tester);
      final today = todayDateString(containerOf(tester).read(nowProvider)());
      for (var i = 0; i < 14; i++) {
        await addExpense(tester, s, title: 'Item $i', amount: 10.0 + i, date: today);
      }
      await goTo(tester, '/trip/${s.tripId}/expenses');
      await tester.tap(find.byKey(const Key('tab-menu')));
      await settle(tester);
      await tester.tap(find.text('Expand all days'));
      await settle(tester);
      expect(key('jump-today'), findsNothing); // already at the top
      await tester.drag(find.byType(CustomScrollView).first, const Offset(0, -1200));
      await settle(tester, rounds: 6);
      expect(key('jump-today'), findsOneWidget);
      await tester.tap(key('jump-today'));
      await settle(tester, rounds: 10);
      expect(key('jump-today'), findsNothing);
    });
  });

  group('Summary focus', () {
    testApp('Trip numbers start folded away; the header opens them', (tester) async {
      await pumpApp(tester, user: asha, flagsOn: {'enableSummaryFocus'}, flagsOff: {'enableSummaryUpgrades'});
      final s = await seedTrip(tester);
      await addExpense(tester, s, amount: 90);
      await goTo(tester, '/trip/${s.tripId}/ledger');
      final list = find.descendant(of: key('ledger-list'), matching: find.byType(Scrollable));
      await tester.scrollUntilVisible(key('section-analytics'), 300, scrollable: list);
      expect(key('plan-card'), findsNothing);
      // Scroll the header clear of the sticky bottom bar before tapping it.
      await tester.drag(
        find.descendant(of: key('ledger-list'), matching: find.byType(Scrollable)),
        const Offset(0, -200),
      );
      await tester.pump();
      await tester.tap(key('section-analytics'));
      await settle(tester, rounds: 8);
      expect(key('plan-card'), findsOneWidget);
    });
  });

  group('expense form quick amounts', () {
    testApp('recent amounts appear when the field is empty and fill it on tap', (tester) async {
      await pumpApp(tester, user: asha);
      final s = await seedTrip(tester);
      await addExpense(tester, s, amount: 250, title: 'Lunch');
      await addExpense(tester, s, amount: 80, title: 'Tea');
      await openForm(tester, s);
      expect(key('quick-amount-250.0'), findsOneWidget);
      expect(key('quick-amount-80.0'), findsOneWidget);
      await tester.tap(key('quick-amount-250.0'));
      await settle(tester, rounds: 3);
      expect(tester.widget<TextField>(key('amount-field')).controller!.text, '250');
      expect(key('quick-amount-80.0'), findsNothing); // the chips step aside once there is an amount
    });

    testApp('flag off: no chips', (tester) async {
      await pumpApp(tester, user: asha, flagsOff: {'enableQuickAmounts'});
      final s = await seedTrip(tester);
      await addExpense(tester, s, amount: 250);
      await openForm(tester, s);
      expect(key('quick-amount-250.0'), findsNothing);
    });
  });

  group('friendly empty states', () {
    testApp('empty Notes and checklist coach the first step; the flag off keeps the plain text', (tester) async {
      await pumpApp(tester, user: asha);
      final s = await seedTrip(tester);
      await goTo(tester, '/trip/${s.tripId}/notes');
      expect(key('checklist-empty'), findsOneWidget);
      await tester.tap(find.descendant(of: key('notes-panes'), matching: find.text('Notes')));
      await settle(tester, rounds: 4);
      expect(key('notes-empty'), findsOneWidget);
      expect(key('notes-fab'), findsOneWidget);
    });

    testApp('flag off: plain empty text', (tester) async {
      await pumpApp(tester, user: asha, flagsOff: {'enableCoachEmptyStates'});
      final s = await seedTrip(tester);
      await goTo(tester, '/trip/${s.tripId}/notes');
      expect(key('checklist-empty'), findsNothing);
    });
  });

  group('settings: contrast and haptics', () {
    Future<void> openAppearance(WidgetTester tester) async {
      unawaited(containerOf(tester).read(routerProvider).push<void>('/settings'));
      await settle(tester, rounds: 10);
      await tester.tap(key('settings-open-display'));
      await settle(tester, rounds: 6);
    }

    testApp('High contrast switch is there, remembered, and absent with its flag off', (tester) async {
      final app = await pumpApp(tester, user: asha);
      await openAppearance(tester);
      await tester.tap(key('settings-high-contrast'));
      await settle(tester);
      expect(app.prefs.getBool('settings.high_contrast'), isTrue);
    });

    testApp('flag off: no High contrast switch', (tester) async {
      await pumpApp(tester, user: asha, flagsOff: {'enableHighContrast'});
      await openAppearance(tester);
      expect(key('settings-high-contrast'), findsNothing);
    });

    testApp('Haptics switch only with its flag; without it haptics stay on', (tester) async {
      await pumpApp(tester, user: asha, flagsOff: {'enableHapticsSetting'}, prefsExtra: {'settings.haptics': false});
      unawaited(containerOf(tester).read(routerProvider).push<void>('/settings'));
      await settle(tester, rounds: 10);
      expect(key('settings-haptics'), findsNothing);
      expect(AppHaptics.enabled, isTrue);
    });

    test('the high contrast themes reach AAA (7:1) for body text on the surface', () {
      for (final theme in [AppTheme.highContrastLight(), AppTheme.highContrastDark()]) {
        final t = theme.extension<AppTokens>()!;
        expect(contrast(t.textPrimary, t.bgSurface), greaterThanOrEqualTo(7));
        expect(contrast(t.textSecondary, t.bgSurface), greaterThanOrEqualTo(7));
        expect(contrast(t.textMuted, t.bgSurface), greaterThanOrEqualTo(4.5));
      }
    });
  });
}
