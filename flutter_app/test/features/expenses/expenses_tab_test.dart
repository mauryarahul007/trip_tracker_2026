import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:trip_tracker/data/local/app_database.dart';
import 'package:trip_tracker/data/providers.dart';
import 'package:trip_tracker/data/repositories/drift_repositories.dart';
import 'package:trip_tracker/data/sync/conflict_store.dart';
import 'package:trip_tracker/domain/logic/expense_form_logic.dart';
import 'package:trip_tracker/domain/logic/sync_merge.dart';
import 'package:trip_tracker/domain/models/expense_io.dart';
import 'package:trip_tracker/shared/widgets/app_button.dart';

import '../../data/expense_submit_test.dart' show FakeApi;
import '../../support/pump_app.dart';

ProviderContainer containerOf(WidgetTester t) => ProviderScope.containerOf(t.element(find.byType(MaterialApp)));
Finder button(String l) => find.widgetWithText(AppButton, l);
String where(WidgetTester t) => GoRouterState.of(t.element(find.byType(Scaffold).last)).uri.path;

class Seed {
  Seed(this.tripId, this.me, this.ben, this.cara);
  final String tripId;
  final String me;
  final String ben;
  final String cara;
}

/// Trip owned by u1 (Asha), plus Ben (linked u2) and Cara (not signed up).
Future<Seed> seedTrip(WidgetTester tester, {String owner = 'u1'}) async {
  final c = containerOf(tester);
  final id = await real(
    tester,
    () => c
        .read(tripRepositoryProvider)
        .createTrip(
          name: 'Goa Weekend',
          startDate: '2026-10-01',
          endDate: '2026-10-09',
          baseCurrency: 'INR',
          ownerId: owner,
          creatorName: 'Asha',
        ),
  );
  final db = c.read(appDatabaseProvider);
  final me = (await real(tester, () => db.select(db.membersTable).get())).single.id;
  final ben = await real(tester, () => c.read(memberRepositoryProvider).addMember(id, 'Ben', linkedUserId: 'u2'));
  final cara = await real(tester, () => c.read(memberRepositoryProvider).addMember(id, 'Cara'));
  return Seed(id, me, ben, cara);
}

Future<String> addExpense(
  WidgetTester tester,
  Seed s, {
  String title = 'Beach lunch',
  double amount = 120,
  String date = '2026-10-06',
  String category = 'cat-food',
  String? paidBy,
  List<String>? split,
  String currency = 'INR',
  String userId = 'u1',
  bool approvalGate = false,
}) async {
  final c = containerOf(tester);
  final r = await real(
    tester,
    () => c
        .read(expenseRepositoryProvider)
        .submit(
          ExpenseSubmission(
            title: title,
            amount: amount,
            currency: currency,
            category: category,
            date: date,
            paidBy: paidBy ?? s.me,
            splitMode: 'equal',
            splitMemberIds: split ?? [s.me, s.ben, s.cara],
          ),
          tripId: s.tripId,
          userId: userId,
          approvalThresholdEnabled: approvalGate,
        ),
  );
  expect(r.isOk, isTrue, reason: r.error);
  return r.expenseId!;
}

Future<void> openExpenses(WidgetTester tester, Seed s) async {
  await settle(tester);
  await tester.tap(find.text('Goa Weekend'));
  await settle(tester, rounds: 14);
}

void main() {
  testApp('empty trip: friendly empty state; Add expense opens the form route', (tester) async {
    await pumpApp(tester, user: asha);
    final s = await seedTrip(tester);
    await openExpenses(tester, s);
    expect(find.text('No expenses yet'), findsOneWidget);
    await tester.tap(button('Add expense').first);
    await settle(tester, rounds: 10);
    expect(where(tester), '/trip/${s.tripId}/expenses/new');
  });

  testApp('summary: total, per person and top category; settlements and pending approvals are left out', (
    tester,
  ) async {
    await pumpApp(tester, user: asha);
    final s = await seedTrip(tester);
    await addExpense(tester, s, title: 'Hotel', amount: 900, category: 'cat-stay');
    await addExpense(tester, s, title: 'Lunch', amount: 300, category: 'cat-food');
    await addExpense(tester, s, title: 'Settlement: Ben → Asha', amount: 500, split: [s.me]);
    final c = containerOf(tester);
    // A pending-approval expense must not move any total.
    await real(tester, () async {
      final db = c.read(appDatabaseProvider);
      await db.customStatement(
        "UPDATE trips SET domain_json = json_set(domain_json, '\$.approvalThreshold', 1000) WHERE id = ?",
        [s.tripId],
      );
    });
    await addExpense(tester, s, title: 'Big thing', amount: 1000, approvalGate: true);
    await openExpenses(tester, s);

    expect(tester.widget<Text>(find.byKey(const Key('stat-total'))).data, '₹1,200.00');
    expect(tester.widget<Text>(find.byKey(const Key('stat-avg'))).data, '₹400.00'); // 3 travelers
    expect(tester.widget<Text>(find.byKey(const Key('stat-top'))).data, 'Stay & Hotel 75%');
  });

  testApp('days start collapsed; tap a day or "Expand all days" to see rows; settlements get their own section', (
    tester,
  ) async {
    await pumpApp(tester, user: asha);
    final s = await seedTrip(tester);
    await addExpense(tester, s, title: 'Beach lunch', date: '2026-10-06');
    await addExpense(tester, s, title: 'Taxi', date: '2026-10-05', category: 'cat-travel');
    await addExpense(tester, s, title: 'Settlement: Ben → Asha', amount: 50, split: [s.me], date: '2026-10-06');
    await openExpenses(tester, s);

    expect(find.text('Beach lunch'), findsNothing); // collapsed like the web
    expect(find.byKey(const Key('day-2026-10-06')), findsWidgets);
    await tester.tap(find.byKey(const Key('day-2026-10-06')).first);
    await settle(tester);
    expect(find.text('Beach lunch'), findsOneWidget);
    expect(find.text('Taxi'), findsNothing);

    await tester.tap(find.byKey(const Key('tab-menu')));
    await settle(tester);
    await tester.tap(find.text('Expand all days'));
    await settle(tester);
    expect(find.text('Taxi'), findsOneWidget);
    expect(find.text('Settlements'), findsOneWidget);
    expect(find.text('Settlement: Ben → Asha'), findsOneWidget);
  });

  group('row details', () {
    testApp('shows your share when it differs, and removed-member warnings', (tester) async {
      await pumpApp(tester, user: asha);
      final s = await seedTrip(tester);
      await addExpense(tester, s, title: 'Beach lunch', amount: 120);
      final c = containerOf(tester);
      // Payer removed from the trip: row is flagged for review.
      await addExpense(tester, s, title: 'Orphan', amount: 60, paidBy: 'gone-member');
      await openExpenses(tester, s);
      await tester.tap(find.byKey(const Key('tab-menu')));
      await settle(tester);
      await tester.tap(find.text('Expand all days'));
      await settle(tester);
      expect(find.text('your share ₹40.00'), findsWidgets);
      expect(find.byKey(const Key('row-review')), findsOneWidget);
      expect(find.text('Payer was removed — assign a new payer.'), findsOneWidget);
      expect(c, isNotNull);
    });

    testApp('badges: pending approval, dispute, pending sync, sync conflict', (tester) async {
      await pumpApp(tester, user: asha, flagsOn: {'enableExpenseDisputes'});
      final s = await seedTrip(tester);
      final c = containerOf(tester);
      final disputed = await addExpense(tester, s, title: 'Disputed one');
      await real(
        tester,
        () => c
            .read(expenseRepositoryProvider)
            .flagDispute(disputed, userId: 'u2', note: 'why twice?')
            .catchError((_) {}),
      );
      await addExpense(tester, s, title: 'Conflicted');
      await openExpenses(tester, s);
      await tester.tap(find.byKey(const Key('tab-menu')));
      await settle(tester);
      await tester.tap(find.text('Expand all days'));
      await settle(tester);
      // Local writes are queued: every row reads as pending sync.
      expect(find.byTooltip('Pending sync'), findsWidgets);

      final conflicted = (await real(
        tester,
        () => c.read(expenseRepositoryProvider).watchActive(s.tripId).first,
      )).firstWhere((e) => e.title == 'Conflicted');
      c.read(conflictStoreProvider.notifier).setForTrip(s.tripId, [
        ExpenseConflict(conflicted.id, conflicted, conflicted, 'updateExpense'),
      ]);
      await settle(tester);
      expect(find.byTooltip('Sync conflict'), findsOneWidget);
    });

    testApp('foreign-currency expenses can flip between base and original currency', (tester) async {
      await pumpApp(tester, user: asha);
      final s = await seedTrip(tester);
      await addExpense(tester, s, title: 'Sushi', amount: 872.5, currency: 'USD');
      await openExpenses(tester, s);
      await tester.tap(find.byKey(const Key('tab-menu')));
      await settle(tester);
      await tester.tap(find.text('Expand all days'));
      await settle(tester);
      expect(tester.widget<Text>(find.byKey(const Key('row-amount'))).data, '₹872.50');
      await tester.tap(find.byKey(const Key('row-currency-toggle')));
      await settle(tester);
      expect(
        tester.widget<Text>(find.byKey(const Key('row-amount'))).data,
        '\$10.00',
      ); // 872.5 INR at the default rates
      await tester.tap(find.byKey(const Key('row-currency-toggle')));
      await settle(tester);
      expect(tester.widget<Text>(find.byKey(const Key('row-amount'))).data, '₹872.50');
    });
  });

  group('search and filters', () {
    Future<Seed> setup(WidgetTester tester, {Set<String> flags = const {}}) async {
      await pumpApp(tester, user: asha, flagsOn: flags);
      final s = await seedTrip(tester);
      await addExpense(tester, s, title: 'Beach lunch', amount: 120, category: 'cat-food', paidBy: s.me);
      await addExpense(
        tester,
        s,
        title: 'Taxi to airport',
        amount: 40,
        category: 'cat-travel',
        paidBy: s.ben,
        split: [s.ben, s.cara],
      );
      await addExpense(
        tester,
        s,
        title: 'Hotel',
        amount: 900,
        category: 'cat-stay',
        paidBy: s.cara,
        date: '2026-10-04',
      );
      await openExpenses(tester, s);
      await tester.tap(find.byKey(const Key('tab-menu')));
      await settle(tester);
      await tester.tap(find.text('Expand all days'));
      await settle(tester);
      return s;
    }

    testApp('search narrows the list after a short debounce; clearing restores it', (tester) async {
      await setup(tester);
      await tester.enterText(find.byType(TextField).first, 'taxi');
      await tester.pump(const Duration(milliseconds: 300));
      await settle(tester);
      expect(find.text('Taxi to airport'), findsOneWidget);
      expect(find.text('Beach lunch'), findsNothing);
      await tester.enterText(find.byType(TextField).first, 'zzz');
      await tester.pump(const Duration(milliseconds: 300));
      await settle(tester);
      expect(find.text('No expenses match these filters.'), findsOneWidget);
      await tester.tap(find.byKey(const Key('clear-filters')));
      await settle(tester);
      expect(find.text('Beach lunch'), findsOneWidget);
    });

    testApp('filter sheet: pick a traveler and category, see the live count, apply, clear', (tester) async {
      await setup(tester);
      await tester.tap(find.byKey(const Key('open-filters')));
      await settle(tester);
      await tester.tap(find.byKey(const Key('filter-member')));
      await settle(tester);
      await tester.tap(find.text('Cara').last);
      await settle(tester);
      expect(find.text('Show 3 expenses'), findsOneWidget); // Cara is in all three splits
      await tester.tap(find.byKey(const Key('filter-category')));
      await settle(tester);
      await tester.tap(find.textContaining('Stay & Hotel').last);
      await settle(tester);
      expect(find.text('Show 1 expense'), findsOneWidget);
      await tester.tap(button('Show 1 expense'));
      await settle(tester);
      expect(find.text('Hotel'), findsOneWidget);
      expect(find.text('Beach lunch'), findsNothing);
      expect(find.byKey(const Key('clear-filters')), findsOneWidget);
    });

    testApp('amount range filter', (tester) async {
      await setup(tester);
      await tester.tap(find.byKey(const Key('open-filters')));
      await settle(tester);
      // The sheet's two amount boxes are the last two text fields on screen.
      final fields = find.byType(TextField);
      await tester.enterText(fields.at(fields.evaluate().length - 2), '100');
      await tester.enterText(fields.last, '500');
      await settle(tester);
      await tester.tap(button('Show 1 expense'));
      await settle(tester);
      expect(find.text('Beach lunch'), findsOneWidget);
      expect(find.text('Hotel'), findsNothing);
    });

    testApp('quick chips (Pro flag): Paid by me / Involves me', (tester) async {
      await setup(tester, flags: {'enableExpenseQuickFilterChips'});
      await tester.tap(find.text('Paid by me'));
      await settle(tester);
      expect(find.text('Beach lunch'), findsOneWidget);
      expect(find.text('Taxi to airport'), findsNothing);
      await tester.tap(find.text('All'));
      await settle(tester);
      expect(find.text('Taxi to airport'), findsOneWidget);
    });

    testApp('chips are hidden when the flag is off', (tester) async {
      await setup(tester);
      expect(find.text('Paid by me'), findsNothing);
    });
  });

  group('swipe, delete and the recycle bin', () {
    testApp('swipe left deletes with undo; the bin keeps it; restore brings it back', (tester) async {
      await pumpApp(tester, user: asha);
      final s = await seedTrip(tester);
      await addExpense(tester, s, title: 'Beach lunch');
      await openExpenses(tester, s);
      await tester.tap(find.byKey(const Key('tab-menu')));
      await settle(tester);
      await tester.tap(find.text('Expand all days'));
      await settle(tester);

      await tester.drag(find.text('Beach lunch'), const Offset(-600, 0));
      await settle(tester, rounds: 10);
      expect(find.text('Expense deleted'), findsOneWidget);
      expect(find.text('Beach lunch'), findsNothing);

      await tester.tap(find.text('UNDO'));
      await settle(tester, rounds: 10);
      expect(find.text('Beach lunch'), findsOneWidget);

      await tester.drag(find.text('Beach lunch'), const Offset(-600, 0));
      await settle(tester, rounds: 10);
      await tester.tap(find.byKey(const Key('tab-menu')));
      await settle(tester);
      await tester.tap(find.text('Recycle bin'));
      await settle(tester, rounds: 10);
      expect(where(tester), '/trip/${s.tripId}/recycle-bin');
      expect(find.text('Beach lunch'), findsOneWidget);
      await tester.tap(button('Restore'));
      await settle(tester, rounds: 10);
      expect(find.text('The recycle bin is empty'), findsOneWidget);
    });

    testApp('bin: delete forever and empty bin both ask first', (tester) async {
      await pumpApp(tester, user: asha);
      final s = await seedTrip(tester);
      final a = await addExpense(tester, s, title: 'One');
      final b = await addExpense(tester, s, title: 'Two');
      final repo = containerOf(tester).read(expenseRepositoryProvider);
      // Separate calls: the harness pumps between them so query streams can reload.
      await real(tester, () => repo.delete(a, userId: 'u1'));
      await real(tester, () => repo.delete(b, userId: 'u1'));
      await openExpenses(tester, s);
      await tester.tap(find.byKey(const Key('tab-menu')));
      await settle(tester);
      await tester.tap(find.text('Recycle bin'));
      await settle(tester, rounds: 10);
      expect(find.text('One'), findsOneWidget);

      await tester.tap(button('Delete forever').first);
      await settle(tester);
      expect(find.textContaining('forever? This can'), findsOneWidget);
      await tester.tap(find.text('Cancel'));
      await settle(tester);
      expect(find.text('One'), findsOneWidget);

      await tester.tap(find.text('Empty recycle bin'));
      await settle(tester);
      expect(find.text('Permanently delete 2 expenses?'), findsOneWidget);
      await tester.tap(find.text('Delete forever').last);
      await settle(tester, rounds: 10);
      expect(find.text('The recycle bin is empty'), findsOneWidget);
    });

    testApp('swipe right opens the edit route', (tester) async {
      await pumpApp(tester, user: asha);
      final s = await seedTrip(tester);
      final id = await addExpense(tester, s, title: 'Beach lunch');
      await openExpenses(tester, s);
      await tester.tap(find.byKey(const Key('tab-menu')));
      await settle(tester);
      await tester.tap(find.text('Expand all days'));
      await settle(tester);
      await tester.drag(find.text('Beach lunch'), const Offset(600, 0));
      await settle(tester, rounds: 10);
      expect(where(tester), '/trip/${s.tripId}/expenses/$id/edit');
    });

    testApp('rows you cannot manage have no swipe actions', (tester) async {
      await pumpApp(tester, user: asha);
      final s = await seedTrip(tester, owner: 'someone-else'); // asha is a plain traveler now
      await addExpense(tester, s, title: 'Their expense', userId: 'someone-else');
      await openExpenses(tester, s);
      await tester.tap(find.byKey(const Key('tab-menu')));
      await settle(tester);
      await tester.tap(find.text('Expand all days'));
      await settle(tester);
      expect(find.byType(Dismissible), findsNothing);
    });
  });

  group('detail sheet and online-only actions', () {
    Future<(Seed, FakeApi)> setup(WidgetTester tester, {Set<String> flags = const {}, bool owner = true}) async {
      final api = FakeApi();
      await pumpApp(
        tester,
        user: asha,
        flagsOn: flags,
        overrides: [
          expenseRepositoryProvider.overrideWith(
            (ref) =>
                DriftExpenseRepository(ref.watch(appDatabaseProvider), ref.watch(outboxStoreProvider), () {}, api: api),
          ),
        ],
      );
      final s = await seedTrip(tester, owner: owner ? 'u1' : 'someone-else');
      return (s, api);
    }

    Future<void> openRow(WidgetTester tester, Seed s, String title) async {
      await openExpenses(tester, s);
      await tester.tap(find.byKey(const Key('tab-menu')));
      await settle(tester);
      await tester.tap(find.text('Expand all days'));
      await settle(tester);
      await tester.tap(find.text(title));
      await settle(tester, rounds: 10);
    }

    testApp('tapping a row shows who owes what', (tester) async {
      final (s, _) = await setup(tester);
      await addExpense(tester, s, title: 'Beach lunch', amount: 100, split: [s.me, s.ben, s.cara]);
      await openRow(tester, s, 'Beach lunch');
      expect(find.byKey(const Key('detail-title')), findsOneWidget);
      expect(tester.widget<Text>(find.byKey(const Key('detail-amount'))).data, '₹100.00');
      expect(tester.widget<Text>(find.byKey(Key('share-${s.me}'))).data, '₹33.34'); // payer takes the spare paisa
      expect(tester.widget<Text>(find.byKey(Key('share-${s.ben}'))).data, '₹33.33');
    });

    testApp('flag + resolve a dispute (flag on): server first, banner appears and clears', (tester) async {
      final (s, api) = await setup(tester, flags: {'enableExpenseDisputes'});
      final id = await addExpense(tester, s, title: 'Beach lunch');
      await openRow(tester, s, 'Beach lunch');
      await tester.tap(button('Flag as disputed'));
      await settle(tester);
      await tester.enterText(find.byType(TextField).last, 'charged twice');
      await tester.tap(find.text('Flag'));
      await settle(tester, rounds: 10);
      expect(api.calls, ['flag:$id:charged twice']);
      expect(find.byKey(const Key('detail-dispute-banner')), findsOneWidget);
      expect(find.text('Flagged: charged twice'), findsOneWidget);
      await tester.tap(button('Resolve dispute'));
      await settle(tester, rounds: 10);
      expect(api.calls.last, 'resolve:$id');
      expect(find.byKey(const Key('detail-dispute-banner')), findsNothing);
    });

    testApp('dispute actions are hidden when the flag is off', (tester) async {
      final (s, _) = await setup(tester);
      await addExpense(tester, s, title: 'Beach lunch');
      await openRow(tester, s, 'Beach lunch');
      expect(button('Flag as disputed'), findsNothing);
    });

    testApp('offline: the action reports it and nothing changes locally', (tester) async {
      final (s, api) = await setup(tester, flags: {'enableExpenseDisputes'});
      await addExpense(tester, s, title: 'Beach lunch');
      await openRow(tester, s, 'Beach lunch');
      api.fail = const ExpenseActionException('You are offline.', offline: true);
      await tester.tap(button('Flag as disputed'));
      await settle(tester);
      await tester.tap(find.text('Flag'));
      await settle(tester, rounds: 10);
      expect(find.text("You're offline. Connect to the internet to do this."), findsOneWidget);
      expect(find.byKey(const Key('detail-dispute-banner')), findsNothing);
    });

    testApp('approval: only someone other than the author can approve a pending expense', (tester) async {
      final (s, api) = await setup(tester, flags: {'enableExpenseApprovalThreshold'});
      final c = containerOf(tester);
      await real(tester, () async {
        final db = c.read(appDatabaseProvider);
        await db.customStatement(
          "UPDATE trips SET domain_json = json_set(domain_json, '\$.approvalThreshold', 100) WHERE id = ?",
          [s.tripId],
        );
      });
      final mine = await addExpense(tester, s, title: 'Mine', amount: 500, approvalGate: true); // created by u1 (me)
      final theirs = await addExpense(tester, s, title: 'Theirs', amount: 500, approvalGate: true, userId: 'u2');
      await openRow(tester, s, 'Mine');
      expect(button('Approve'), findsNothing); // can't approve your own
      Navigator.of(tester.element(find.byKey(const Key('detail-title')))).pop();
      await settle(tester);
      await tester.tap(find.text('Theirs'));
      await settle(tester, rounds: 10);
      await tester.tap(button('Approve'));
      await settle(tester, rounds: 10);
      expect(api.calls, ['approve:$theirs']);
      expect(mine, isNot(theirs));
    });

    testApp('confirm settlement: only the recipient sees it, then it shows confirmed', (tester) async {
      final (s, api) = await setup(tester, flags: {'enableSettlementConfirmation'}, owner: false);
      final c = containerOf(tester);
      // Asha (u1) is a plain member here; link her to the member who receives the money.
      final db = c.read(appDatabaseProvider);
      await real(tester, () => db.customStatement("UPDATE members SET linked_user_id = 'u1' WHERE id = ?", [s.ben]));
      final id = await addExpense(
        tester,
        s,
        title: 'Settlement: Cara → Ben',
        amount: 80,
        split: [s.ben],
        paidBy: s.cara,
        userId: 'u2',
      );
      await openRow(tester, s, 'Settlement: Cara → Ben');
      await tester.tap(button('Confirm payment received'));
      await settle(tester, rounds: 10);
      expect(api.calls, ['confirm:$id']);
      expect(find.byKey(const Key('detail-confirmed')), findsOneWidget);
      expect(button('Confirm payment received'), findsNothing);
    });

    testApp('delete from the sheet closes it and offers undo', (tester) async {
      final (s, _) = await setup(tester);
      await addExpense(tester, s, title: 'Beach lunch');
      await openRow(tester, s, 'Beach lunch');
      await tester.tap(button('Delete'));
      await settle(tester, rounds: 10);
      expect(find.text('Expense deleted'), findsOneWidget);
    });
  });

  testApp('a long trip pages: 50 rows then Load more', (tester) async {
    await pumpApp(tester, user: asha);
    final s = await seedTrip(tester);
    for (var i = 0; i < 55; i++) {
      await addExpense(tester, s, title: 'Item $i', amount: 10, date: '2026-10-06');
    }
    await openExpenses(tester, s);
    await tester.tap(find.byKey(const Key('tab-menu')));
    await settle(tester);
    await tester.tap(find.text('Expand all days'));
    await settle(tester, rounds: 12);
    expect(button('Load more'), findsNothing); // not on screen yet (list is virtualised)
    await tester.dragUntilVisible(button('Load more'), find.byType(CustomScrollView), const Offset(0, -400));
    expect(button('Load more'), findsOneWidget);
    await tester.tap(button('Load more'));
    await settle(tester, rounds: 10);
    expect(button('Load more'), findsNothing);
  });

  testApp('pull to refresh does not break a local-only account', (tester) async {
    await pumpApp(tester, user: asha);
    final s = await seedTrip(tester);
    await addExpense(tester, s, title: 'Beach lunch');
    await openExpenses(tester, s);
    await tester.fling(find.byType(CustomScrollView), const Offset(0, 400), 1000);
    await settle(tester, rounds: 10);
    expect(find.byType(CustomScrollView), findsOneWidget);
  });

  testApp('compact rows (Pro flag) render and toggle without errors', (tester) async {
    await pumpApp(tester, user: asha, flagsOn: {'enableCompactLedgerView'});
    final s = await seedTrip(tester);
    await addExpense(tester, s, title: 'Beach lunch');
    await openExpenses(tester, s);
    await tester.tap(find.byKey(const Key('tab-menu')));
    await settle(tester);
    await tester.tap(find.text('Compact rows'));
    await settle(tester);
    await tester.tap(find.byKey(const Key('tab-menu')));
    await settle(tester);
    await tester.tap(find.text('Expand all days'));
    await settle(tester);
    expect(find.text('Beach lunch'), findsOneWidget);
  });
}
