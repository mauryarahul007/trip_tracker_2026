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

    await reveal(tester, 'numbers-tab-days');
    await tester.tap(key('numbers-tab-days'));
    await settle(tester, rounds: 6);
    expect(key('day-chart'), findsOneWidget);
    expect(tester.widget<Text>(key('day-chart-selected')).data, contains('₹')); // the latest day is selected
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

  testApp('the Groups / People switch in Trip numbers drives Who paid only, never Who pays whom', (tester) async {
    await pumpApp(tester, user: asha);
    final s = await seedTrip(tester);
    await real(
      tester,
      () => containerOf(tester).read(memberRepositoryProvider).createGroup(s.tripId, 'Duo', [s.ben, s.cara]),
    );
    await addExpense(tester, s, amount: 90);
    await openLedger(tester, s);
    expect(key('settle-view-toggle'), findsNothing); // no switch above Who pays whom
    await reveal(tester, 'numbers-tab-people');
    await tester.tap(key('numbers-tab-people'));
    await settle(tester, rounds: 6);
    expect(key('spend-view-toggle'), findsOneWidget); // analytics only
    expect(find.byWidgetPredicate((w) => w.key.toString().contains("'spend-group-")), findsWidgets); // groups
    await centre(tester, key('spend-view-toggle'));
    await tester.tap(find.descendant(of: key('spend-view-toggle'), matching: find.text('Members')));
    await settle(tester, rounds: 6);
    expect(find.byWidgetPredicate((w) => w.key.toString().contains("'spend-group-")), findsNothing); // people
    await tester.scrollUntilVisible(
      find.text('Duo pays Asha'),
      -300,
      scrollable: find.descendant(of: key('ledger-list'), matching: find.byType(Scrollable)),
    );
    expect(find.text('Duo pays Asha'), findsOneWidget); // Who pays whom did not follow the switch
    expect(find.text('Ben pays Asha'), findsNothing);
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

  testApp('a settled trip with payments shows the celebration; not while something is owed; off with the flag', (
    tester,
  ) async {
    await pumpApp(tester, user: asha);
    final s = await seedTrip(tester);
    await addExpense(tester, s, amount: 60, split: [s.me, s.ben]); // Ben owes Asha
    await openLedger(tester, s);
    expect(key('settled-celebration'), findsNothing);
    await tester.scrollUntilVisible(
      key('settle-0'),
      300,
      scrollable: find.descendant(of: key('ledger-list'), matching: find.byType(Scrollable)),
    );
    await centre(tester, key('settle-0'));
    await tester.tap(key('settle-0'));
    await settle(tester, rounds: 6);
    await tester.tap(key('settle-confirm'));
    await settle(tester, rounds: 16);
    await tester.drag(key('ledger-list'), const Offset(0, 2000)); // back to the top
    await settle(tester, rounds: 4);
    expect(key('settled-celebration'), findsOneWidget);
    expect(key('celebrate-share'), findsOneWidget);
  });

  testApp('no celebration with its flag off', (tester) async {
    await pumpApp(tester, user: asha, flagsOff: {'enableSettledCelebration'});
    final s = await seedTrip(tester);
    await addExpense(tester, s, amount: 50, split: [s.me]); // paid by and for Asha: square
    await openLedger(tester, s);
    expect(key('settled-celebration'), findsNothing);
  });

  testApp('a trip with no payments owed from the start also shows it', (tester) async {
    await pumpApp(tester, user: asha);
    final s = await seedTrip(tester);
    await addExpense(tester, s, amount: 50, split: [s.me]);
    await openLedger(tester, s);
    expect(key('settled-celebration'), findsOneWidget);
  });

  Future<void> openSettleSheet(WidgetTester tester) async {
    await tester.scrollUntilVisible(
      key('settle-0'),
      300,
      scrollable: find.descendant(of: key('ledger-list'), matching: find.byType(Scrollable)),
    );
    await centre(tester, key('settle-0'));
    await tester.tap(key('settle-0'));
    await settle(tester, rounds: 6);
  }

  testApp('settling: a round amount rounds down, leaves the rest owed, and records the round payment', (tester) async {
    await pumpApp(tester, user: asha);
    final s = await seedTrip(tester);
    await addExpense(tester, s, amount: 574, split: [s.me, s.ben]); // Ben owes Asha 287
    await openLedger(tester, s);
    await openSettleSheet(tester);
    expect(find.text('Pay a round amount: ₹280.00'), findsOneWidget);
    await tester.tap(key('settle-round'));
    await settle(tester, rounds: 4);
    expect(
      tester
          .widget<TextField>(find.descendant(of: key('settle-amount'), matching: find.byType(TextField)))
          .controller!
          .text,
      '280',
    );
    expect(find.byKey(const Key('settle-remaining')), findsOneWidget); // the 7 left shows as remaining
    await tester.tap(key('settle-confirm'));
    await settle(tester, rounds: 16);
    final settlement = (await expensesOf(tester, s)).cast<Expense>().singleWhere((e) => e.isSettlement);
    expect(settlement.amount, 280);
  });

  testApp('no round option for a clean amount or with the flag off', (tester) async {
    await pumpApp(tester, user: asha);
    final s = await seedTrip(tester);
    await addExpense(tester, s, amount: 560, split: [s.me, s.ben]); // owes exactly 280
    await openLedger(tester, s);
    await openSettleSheet(tester);
    expect(key('settle-round'), findsNothing);
  });

  testApp('round option is hidden with its flag off', (tester) async {
    await pumpApp(tester, user: asha, flagsOff: {'enableSettleRounding'});
    final s = await seedTrip(tester);
    await addExpense(tester, s, amount: 574, split: [s.me, s.ben]);
    await openLedger(tester, s);
    await openSettleSheet(tester);
    expect(key('settle-round'), findsNothing);
  });
}
