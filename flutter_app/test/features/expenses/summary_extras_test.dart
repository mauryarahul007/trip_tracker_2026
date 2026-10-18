import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:trip_tracker/data/providers.dart';
import 'package:trip_tracker/domain/models/expense.dart';

import '../../support/pump_app.dart';
import '../../support/seed.dart';

Finder key(String k) => find.byKey(Key(k));

Future<void> openLedger(WidgetTester tester, Seed s) async {
  await settle(tester);
  GoRouter.of(tester.element(find.byType(Scaffold).first)).go('/trip/${s.tripId}/ledger');
  await settle(tester, rounds: 14);
}

Future<void> reveal(WidgetTester tester, String k) async {
  await tester.scrollUntilVisible(
    key(k),
    300,
    scrollable: find.descendant(of: key('ledger-list'), matching: find.byType(Scrollable)),
  );
  await tester.ensureVisible(key(k));
  await tester.drag(
    find.descendant(of: key('ledger-list'), matching: find.byType(Scrollable)).first,
    const Offset(0, -150),
  );
  await tester.pump();
}

void main() {
  testApp('settle all records every payment I owe after one confirmation', (tester) async {
    await pumpApp(tester, user: asha);
    final s = await seedTrip(tester);
    await addExpense(tester, s, amount: 60, paidBy: s.ben, split: [s.me, s.ben]); // Asha owes Ben 30
    await addExpense(tester, s, amount: 60, paidBy: s.cara, split: [s.me, s.cara]); // Asha owes Cara 30
    await openLedger(tester, s);
    await reveal(tester, 'settle-all');
    await tester.tap(key('settle-all'));
    await settle(tester, rounds: 6);
    await tester.tap(find.text('Mark as paid'));
    await settle(tester, rounds: 16);
    final list = (await expensesOf(tester, s)).cast<Expense>().where((e) => e.isSettlement).toList();
    expect(list.map((e) => e.amount), unorderedEquals([30, 30]));
    expect(key('settle-all'), findsNothing);
    expect(key('all-settled'), findsOneWidget);
  });

  testApp('settle all is hidden with one payment, and when the flag is off', (tester) async {
    await pumpApp(tester, user: asha);
    final s = await seedTrip(tester);
    await addExpense(tester, s, amount: 60, paidBy: s.ben, split: [s.me, s.ben]);
    await openLedger(tester, s);
    expect(key('settle-all'), findsNothing);
  });

  testApp('flag off: settle all, budget, day-by-day and share summary are gone', (tester) async {
    await pumpApp(
      tester,
      user: asha,
      flagsOff: {'enableSettleAll', 'enableTripBudget', 'enableDailyTimeline', 'enableShareSummaryImage'},
    );
    final s = await seedTrip(tester);
    await addExpense(tester, s, amount: 60, paidBy: s.ben, split: [s.me, s.ben]);
    await addExpense(tester, s, amount: 60, paidBy: s.cara, split: [s.me, s.cara]);
    await openLedger(tester, s);
    expect(key('settle-all'), findsNothing);
    await reveal(tester, 'open-insights');
    expect(key('budget-card'), findsNothing);
    expect(key('day-timeline'), findsNothing);
    expect(key('share-summary'), findsNothing);
  });

  testApp('budget: set it, see what is left; the day-by-day list shows the spend', (tester) async {
    final app = await pumpApp(tester, user: asha);
    final s = await seedTrip(tester);
    await addExpense(tester, s, amount: 90);
    await openLedger(tester, s);
    await reveal(tester, 'budget-card');
    expect(find.text('Set a trip budget'), findsOneWidget);
    await tester.tap(key('budget-card'));
    await settle(tester, rounds: 4);
    await tester.enterText(key('ask-field'), '100');
    await tester.tap(key('ask-ok'));
    await settle(tester, rounds: 6);
    expect(key('budget-bar'), findsOneWidget);
    expect(tester.widget<Text>(key('budget-status')).data, contains('left'));
    expect(app.prefs.getDouble('trip.budget.${s.tripId}'), 100);

    await tester.tap(key('budget-card'));
    await settle(tester, rounds: 4);
    await tester.enterText(key('ask-field'), '50');
    await tester.tap(key('ask-ok'));
    await settle(tester, rounds: 6);
    expect(tester.widget<Text>(key('budget-status')).data, contains('over budget'));

    await reveal(tester, 'day-timeline');
    expect(key('day-timeline'), findsOneWidget);
  });

  testApp('share summary makes a png and shares it', (tester) async {
    final app = await pumpApp(tester, user: asha);
    final s = await seedTrip(tester);
    await addExpense(tester, s, amount: 90);
    await openLedger(tester, s);
    await reveal(tester, 'share-summary');
    await tester.tap(key('share-summary'));
    await tester.runAsync(() => Future<void>.delayed(const Duration(milliseconds: 500)));
    await settle(tester, rounds: 6);
    expect(app.shareService.pngs.single, endsWith('_summary.png'));
  });

  testApp(
    'plan and suggestions come first in Trip numbers: set-budget tip, then budget status with a daily allowance',
    (tester) async {
      await pumpApp(tester, user: asha);
      final s = await seedTrip(tester);
      await addExpense(tester, s, amount: 90);
      await openLedger(tester, s);
      await reveal(tester, 'plan-card');
      expect(find.text('PLAN AND SUGGESTIONS'), findsOneWidget);
      expect(key('suggestion-0'), findsOneWidget);
      expect(find.descendant(of: key('suggestion-0'), matching: find.textContaining('budget')), findsWidgets);
      // The plan card sits above the headline numbers.
      final planY = tester.getTopLeft(key('plan-card')).dy;
      final statY = tester.getTopLeft(key('stat-total')).dy;
      expect(planY, lessThan(statY));

      await tester.tap(key('suggestion-set-budget'));
      await settle(tester, rounds: 4);
      await tester.enterText(key('ask-field'), '50');
      await tester.tap(key('ask-ok'));
      await settle(tester, rounds: 6);
      expect(tester.widget<Text>(key('budget-status')).data, contains('over budget'));
      expect(find.descendant(of: key('plan-card'), matching: find.textContaining('over budget')), findsWidgets);
    },
  );

  testApp('tips are gone with their flag off; the budget still shows', (tester) async {
    await pumpApp(tester, user: asha, flagsOff: {'enableTripSuggestions'});
    final s = await seedTrip(tester);
    await addExpense(tester, s, amount: 90);
    await openLedger(tester, s);
    await reveal(tester, 'plan-card');
    expect(key('suggestion-0'), findsNothing);
    expect(key('budget-card'), findsOneWidget);
  });

  testApp('one shared Groups / People state drives Who pays whom and Who paid, from either switch', (tester) async {
    await pumpApp(tester, user: asha);
    final s = await seedTrip(tester);
    await real(
      tester,
      () => containerOf(tester).read(memberRepositoryProvider).createGroup(s.tripId, 'Duo', [s.ben, s.cara]),
    );
    await addExpense(tester, s, amount: 90);
    await openLedger(tester, s);
    expect(key('settle-view-toggle'), findsOneWidget); // the page switch
    await reveal(tester, 'spend-view-toggle');
    expect(key('spend-view-toggle'), findsOneWidget); // and its twin in Trip numbers, same state
    await reveal(tester, 'day-timeline');
    expect(find.byWidgetPredicate((w) => w.key.toString().contains("'spend-group-")), findsWidgets); // groups
    await reveal(tester, 'spend-view-toggle');
    await tester.tap(find.descendant(of: key('spend-view-toggle'), matching: find.text('Members'))); // the twin switch
    await settle(tester, rounds: 6);
    expect(find.byWidgetPredicate((w) => w.key.toString().contains("'spend-group-")), findsNothing); // people
    await tester.scrollUntilVisible(
      key('settle-view-toggle'),
      -300,
      scrollable: find.descendant(of: key('ledger-list'), matching: find.byType(Scrollable)),
    );
    expect(find.text('Ben pays Asha'), findsOneWidget); // the top list followed the twin switch
  });

  String ymd(DateTime d) => d.toIso8601String().substring(0, 10);

  Future<String> liveTrip(WidgetTester tester, {int start = -1, int end = 3}) {
    final now = DateTime.now();
    return real(
      tester,
      () => containerOf(tester)
          .read(tripRepositoryProvider)
          .createTrip(
            name: 'Live Trip',
            startDate: ymd(now.add(Duration(days: start))),
            endDate: ymd(now.add(Duration(days: end))),
            baseCurrency: 'INR',
            ownerId: 'u1',
            creatorName: 'Asha',
          ),
    );
  }

  Future<void> openLive(WidgetTester tester, String id) async {
    await settle(tester);
    GoRouter.of(tester.element(find.byType(Scaffold).first)).go('/trip/$id/ledger');
    await settle(tester, rounds: 14);
  }

  testApp('today card: day of the trip and spent today while the trip is on; off with its flag', (tester) async {
    await pumpApp(tester, user: asha);
    final id = await liveTrip(tester);
    await openLive(tester, id);
    expect(key('today-card'), findsOneWidget);
    expect(find.descendant(of: key('today-card'), matching: find.text('Day 2 of 5')), findsOneWidget);
    expect(tester.widget<Text>(key('today-spent')).data, '₹0.00');
    expect(key('closeout-prompt'), findsNothing); // the trip is not over
  });

  testApp('today card is absent for a finished trip and with its flag off', (tester) async {
    await pumpApp(tester, user: asha, flagsOff: {'enableTodayCard'});
    final id = await liveTrip(tester);
    await openLive(tester, id);
    expect(key('today-card'), findsNothing);
  });

  testApp('a finished trip shows the wrap-up prompt with the settle step; off with its flag', (tester) async {
    await pumpApp(tester, user: asha);
    final s = await seedTrip(tester); // dated in the past
    await addExpense(tester, s, amount: 90);
    await openLedger(tester, s);
    expect(key('closeout-prompt'), findsOneWidget);
    expect(key('today-card'), findsNothing);
    expect(tester.widget<Text>(key('closeout-settle-step')).data, contains('payments left'));
    await tester.tap(key('closeout-close'));
    await settle(tester, rounds: 6);
    expect(find.byType(BottomSheet), findsOneWidget); // the existing close-trip sheet
  });

  testApp('no wrap-up prompt with its flag off', (tester) async {
    await pumpApp(tester, user: asha, flagsOff: {'enableCloseoutPrompt'});
    final s = await seedTrip(tester);
    await openLedger(tester, s);
    expect(key('closeout-prompt'), findsNothing);
  });
}
