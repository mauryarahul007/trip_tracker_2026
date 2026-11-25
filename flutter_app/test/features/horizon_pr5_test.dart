import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:trip_tracker/app/router.dart';
import 'package:trip_tracker/domain/logic/settlement.dart';
import 'package:trip_tracker/features/expenses/application/reminder_log.dart';
import 'package:trip_tracker/features/expenses/presentation/widgets/horizon_settle_list.dart';
import 'package:trip_tracker/features/trips/presentation/widgets/join_code_sheet.dart';
import 'package:trip_tracker/shared/widgets/app_sheet.dart';

import '../support/pump_app.dart';
import '../support/seed.dart';

void main() {
  group('reminder log helpers', () {
    final now = DateTime(2026, 11, 25, 15);
    test('label reads today, yesterday or N days ago', () {
      int at(DateTime d) => d.millisecondsSinceEpoch;
      final log = {
        'ben': at(DateTime(2026, 11, 25, 9)),
        'cara': at(DateTime(2026, 11, 24, 23)),
        'dev': at(DateTime(2026, 11, 22, 12)),
      };
      expect(remindedLabel(log, 'Ben', now: now), 'Reminded today');
      expect(remindedLabel(log, ' cara ', now: now), 'Reminded yesterday');
      expect(remindedLabel(log, 'Dev', now: now), 'Reminded 3d ago');
      expect(remindedLabel(log, 'Eve', now: now), isNull);
    });

    test('remind everyone lists each person and amount', () {
      final m = remindEveryoneMessage([('Ben', '₹30.00'), ('Cara', '€20.00')]);
      expect(m, contains('• Ben: ₹30.00'));
      expect(m, contains('• Cara: €20.00'));
    });
  });

  group('PR 5: reminders and join preview', () {
    Future<void> typeCode(WidgetTester tester, String code) async {
      unawaited(showJoinCodeSheet(tester.element(find.byType(Scaffold).first)));
      await settle(tester, rounds: 4);
      await tester.enterText(find.byType(TextField).last, code);
      await settle(tester, rounds: 4);
    }

    testApp('Join sheet shows the trip behind a full code', (tester) async {
      final app = await pumpApp(tester, user: asha, flagsOn: {'enableJoinCodePreview'});
      await typeCode(tester, 'goa7mx');
      expect(find.byKey(const Key('join-preview')), findsOneWidget);
      expect(find.text('Goa Weekend'), findsOneWidget);
      expect(find.textContaining('2 people'), findsOneWidget);
      expect(app.join.calls, ['preview:GOA7MX']);
    });

    testApp('Join sheet says when no trip uses the code', (tester) async {
      final app = await pumpApp(tester, user: asha, flagsOn: {'enableJoinCodePreview'});
      app.join.previewResult = null;
      await typeCode(tester, 'ZZZ999');
      expect(find.byKey(const Key('join-preview-missing')), findsOneWidget);
    });

    testApp('Join preview flag off: no lookup', (tester) async {
      final app = await pumpApp(tester, user: asha);
      await typeCode(tester, 'GOA7MX');
      expect(find.byKey(const Key('join-preview')), findsNothing);
      expect(app.join.calls, isEmpty);
    });

    Future<void> openSettle(WidgetTester tester, List<String> shared) async {
      const tr = Transfer(
        from: 'Ben',
        to: 'Asha',
        fromLabel: 'Ben',
        toLabel: 'Asha',
        fromMemberId: 'ben',
        toMemberId: 'me',
        amount: 30,
      );
      unawaited(
        AppSheet.show<void>(
          context: tester.element(find.byType(Scaffold).first),
          builder: (_) => HorizonSettleList(
            transfers: const [tr],
            members: const {},
            me: 'me',
            currency: 'INR',
            onMarkPaid: (_) {},
            onRemind: (t) => shared.add(t.fromLabel),
          ),
        ),
      );
      await settle(tester, rounds: 4);
      await tester.tap(find.byKey(const Key('settle-remind-0')));
      await settle(tester, rounds: 4);
    }

    testApp('Settle up row shows when I last reminded', (tester) async {
      await pumpApp(tester, user: asha, flagsOn: {'enableReminderStatus'});
      final sent = <String>[];
      await openSettle(tester, sent);
      expect(sent, ['Ben']);
      expect(find.text('Reminded today'), findsOneWidget);
    });

    testApp('Reminder status flag off: nothing recorded', (tester) async {
      await pumpApp(tester, user: asha);
      await openSettle(tester, <String>[]);
      expect(find.text('Reminded today'), findsNothing);
      expect(containerOf(tester).read(reminderLogProvider), isEmpty);
    });

    testApp('All balances: Remind everyone shares one message', (tester) async {
      final app = await pumpApp(
        tester,
        user: asha,
        flagsOn: {'enableHorizonUi', 'enableRemindEveryone', 'enableReminderStatus'},
      );
      final s = await seedTrip(tester);
      await addExpense(tester, s, amount: 90);
      unawaited(containerOf(tester).read(routerProvider).push<void>('/balances'));
      await settle(tester, rounds: 10);
      await tester.ensureVisible(find.byKey(const Key('balances-remind-all')));
      expect(find.text('Remind everyone (2)'), findsOneWidget);
      await tester.tap(find.byKey(const Key('balances-remind-all')));
      await settle(tester, rounds: 4);
      expect(app.shareService.shared.single, allOf(contains('Ben'), contains('Cara')));
      expect(find.textContaining('Reminded today'), findsNWidgets(2));
    });

    testApp('Remind everyone flag off: no button', (tester) async {
      await pumpApp(tester, user: asha, flagsOn: {'enableHorizonUi'});
      final s = await seedTrip(tester);
      await addExpense(tester, s, amount: 90);
      unawaited(containerOf(tester).read(routerProvider).push<void>('/balances'));
      await settle(tester, rounds: 10);
      expect(find.byKey(const Key('balances-remind-all')), findsNothing);
    });
  });
}
