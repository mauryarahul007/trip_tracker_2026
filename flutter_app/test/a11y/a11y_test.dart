import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:trip_tracker/app/router.dart';
import 'package:trip_tracker/shared/theme/app_theme.dart';
import 'package:trip_tracker/shared/widgets/app_button.dart';
import 'package:trip_tracker/shared/widgets/app_switch.dart';
import 'package:trip_tracker/shared/widgets/app_text_field.dart';
import 'package:trip_tracker/shared/widgets/confirm_dialog.dart';
import 'package:trip_tracker/shared/widgets/empty_state.dart';

import '../support/pump_app.dart';
import '../support/seed.dart';

/// Phase 12.4: automated accessibility checks. They catch tap targets under 48 dp,
/// unlabeled tappables, low contrast, and layouts that break at 200% text or RTL.
/// They do NOT replace a VoiceOver / TalkBack pass on a device (see ACCESSIBILITY.md).
Future<void> go(WidgetTester t, String path) async {
  unawaited(containerOf(t).read(routerProvider).push<void>(path));
  await settle(t, rounds: 10);
}

Future<void> guidelines(WidgetTester tester, {bool contrast = true}) async {
  await expectLater(tester, meetsGuideline(androidTapTargetGuideline));
  await expectLater(tester, meetsGuideline(iOSTapTargetGuideline));
  await expectLater(tester, meetsGuideline(labeledTapTargetGuideline));
  if (contrast) await expectLater(tester, meetsGuideline(textContrastGuideline));
}

void main() {
  group('screens', () {
    testApp('login', (tester) async {
      final handle = tester.ensureSemantics();
      await pumpApp(tester);
      await guidelines(tester);
      handle.dispose();
    });

    testApp('trips list', (tester) async {
      final handle = tester.ensureSemantics();
      await pumpApp(tester, user: asha);
      await seedTrip(tester);
      await settle(tester);
      await guidelines(tester);
      handle.dispose();
    });

    testApp('add expense', (tester) async {
      final handle = tester.ensureSemantics();
      await pumpApp(tester, user: asha);
      final s = await seedTrip(tester);
      await go(tester, '/trip/${s.tripId}/expenses/new');
      await guidelines(tester);
      handle.dispose();
    });

    testApp('balances (settle up)', (tester) async {
      final handle = tester.ensureSemantics();
      await pumpApp(tester, user: asha);
      final s = await seedTrip(tester);
      await addExpense(tester, s, amount: 600);
      await go(tester, '/trip/${s.tripId}/ledger');
      await guidelines(tester);
      handle.dispose();
    });

    testApp('members', (tester) async {
      final handle = tester.ensureSemantics();
      await pumpApp(tester, user: asha);
      final s = await seedTrip(tester);
      await go(tester, '/trip/${s.tripId}/members');
      await guidelines(tester);
      handle.dispose();
    });

    testApp('chat', (tester) async {
      final handle = tester.ensureSemantics();
      await pumpApp(tester, user: asha, flagsOn: {'enableChatFirstNav'});
      final s = await seedTrip(tester);
      await go(tester, '/trip/${s.tripId}/chat');
      await guidelines(tester);
      handle.dispose();
    });

    testApp('settings', (tester) async {
      final handle = tester.ensureSemantics();
      await pumpApp(tester, user: asha);
      await go(tester, '/settings');
      await guidelines(tester);
      handle.dispose();
    });

    testApp('notifications', (tester) async {
      final handle = tester.ensureSemantics();
      await pumpApp(tester, user: asha);
      await go(tester, '/notifications');
      await guidelines(tester);
      handle.dispose();
    });
  });

  group('200% text on real screens (no overflow)', () {
    final screens = <String, String Function(String)>{
      'trips list': (_) => '/',
      'add expense': (id) => '/trip/$id/expenses/new',
      'balances': (id) => '/trip/$id/ledger',
      'members': (id) => '/trip/$id/members',
      'notes': (id) => '/trip/$id/notes',
      'trip settings': (id) => '/trip/$id/settings',
      'settings': (_) => '/settings',
      'notification preferences': (_) => '/settings/notifications',
      'notifications': (_) => '/notifications',
      'report a problem': (_) => '/settings/report-bug',
    };
    for (final e in screens.entries) {
      testApp(e.key, (tester) async {
        tester.platformDispatcher.textScaleFactorTestValue = 2.0;
        addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
        await pumpApp(tester, user: asha);
        final s = await seedTrip(tester);
        await addExpense(tester, s, amount: 300);
        final path = e.value(s.tripId);
        if (path != '/') await go(tester, path);
        await settle(tester);
        expect(tester.takeException(), isNull);
      });
    }
  });

  group('dark theme', () {
    for (final entry in {
      'trips list': (String _) => '/',
      'settings': (String _) => '/settings',
      'add expense': (String id) => '/trip/$id/expenses/new',
      'balances': (String id) => '/trip/$id/ledger',
    }.entries) {
      testApp('${entry.key} (dark)', (tester) async {
        tester.platformDispatcher.platformBrightnessTestValue = Brightness.dark;
        addTearDown(tester.platformDispatcher.clearPlatformBrightnessTestValue);
        final handle = tester.ensureSemantics();
        await pumpApp(tester, user: asha);
        final s = await seedTrip(tester);
        await addExpense(tester, s, amount: 300);
        final path = entry.value(s.tripId);
        if (path != '/') await go(tester, path);
        await guidelines(tester);
        handle.dispose();
      });
    }
  });

  group('large text and RTL on the shared components', () {
    Widget host(Widget child, {TextDirection dir = TextDirection.ltr, double scale = 1}) => MaterialApp(
      theme: AppTheme.light(),
      builder: (context, c) => Directionality(
        textDirection: dir,
        child: MediaQuery(
          data: MediaQuery.of(context).copyWith(textScaler: TextScaler.linear(scale)),
          child: c!,
        ),
      ),
      home: Scaffold(
        body: SingleChildScrollView(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const AppTextField(label: 'Expense title', hint: 'Dinner'),
                const SizedBox(height: 8),
                AppSwitch(
                  value: true,
                  onChanged: (_) {},
                  title: 'Simplify debts',
                  subtitle: 'Fewest payments to settle up',
                ),
                const SizedBox(height: 8),
                AppButton(label: 'Save expense', onPressed: () {}),
                const SizedBox(height: 8),
                child,
              ],
            ),
          ),
        ),
      ),
    );

    testWidgets('empty state fits a phone at 200% text', (tester) async {
      tester.view.physicalSize = const Size(360, 740);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.light(),
          builder: (c, w) => MediaQuery(
            data: MediaQuery.of(c).copyWith(textScaler: const TextScaler.linear(2)),
            child: w!,
          ),
          home: const Scaffold(
            body: EmptyState(
              icon: Icons.receipt_long_rounded,
              title: 'No expenses yet',
              subtitle: 'Add the first one to start splitting.',
            ),
          ),
        ),
      );
      await tester.pump();
      expect(tester.takeException(), isNull);
    });

    for (final scale in [1.0, 2.0]) {
      for (final dir in TextDirection.values) {
        testWidgets('no overflow at ${(scale * 100).round()}% text, ${dir.name}', (tester) async {
          tester.view.physicalSize = const Size(360, 740);
          tester.view.devicePixelRatio = 1;
          addTearDown(tester.view.resetPhysicalSize);
          addTearDown(tester.view.resetDevicePixelRatio);
          await tester.pumpWidget(host(const SizedBox(), dir: dir, scale: scale));
          await tester.pump();
          expect(tester.takeException(), isNull);
        });
      }
    }

    testWidgets('confirm dialog stays usable at 200% text', (tester) async {
      tester.view.physicalSize = const Size(360, 740);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      await tester.pumpWidget(host(const SizedBox(), scale: 2));
      final ctx = tester.element(find.byType(Scaffold));
      unawaited(
        ConfirmDialog.show(
          context: ctx,
          title: 'Delete this expense?',
          message: 'You can restore it from the recycle bin for 24 hours.',
          confirmLabel: 'Delete',
          isDestructive: true,
        ),
      );
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
      expect(find.text('Delete'), findsOneWidget);
    });
  });
}
