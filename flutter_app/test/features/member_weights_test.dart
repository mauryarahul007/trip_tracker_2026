import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:trip_tracker/data/providers.dart';
import 'package:trip_tracker/domain/logic/member_weights.dart';
import 'package:trip_tracker/domain/logic/split_resolver.dart';
import 'package:trip_tracker/domain/logic/trip_collab_merge.dart';
import 'package:trip_tracker/domain/models/trip.dart';
import 'package:trip_tracker/features/trip_details/application/trip_nav.dart';

import '../support/pump_app.dart';
import '../support/seed.dart';

Finder key(String k) => find.byKey(Key(k));

Future<void> openTab(WidgetTester tester, Seed s, String tab) async {
  await settle(tester);
  GoRouter.of(tester.element(find.byType(Scaffold).first)).go('/trip/${s.tripId}/$tab');
  await settle(tester, rounds: 14);
}

Future<void> setWeights(WidgetTester tester, Seed s, Map<String, double> w) =>
    real(tester, () => containerOf(tester).read(tripRepositoryProvider).setMemberWeights(s.tripId, w));

Future<void> addFood(WidgetTester tester, Seed s, String amount) async {
  await openForm(tester, s);
  await tester.enterText(key('amount-field'), amount);
  await settle(tester, rounds: 2);
  await tester.enterText(key('title-field'), 'Dinner');
  await settle(tester, rounds: 2);
  await tester.ensureVisible(key('save'));
  await tester.tap(key('save'));
  await settle(tester, rounds: 14);
}

void main() {
  group('member weights (couples count as 2)', () {
    test('a couple weighted 2 pays twice an equal share', () {
      final shares = resolveShares(
        amount: 400,
        splitMode: 'custom',
        paidBy: 'a',
        participants: const ['a', 'b', 'c'],
        splitConfig: const {'a': 2, 'b': 1, 'c': 1},
        currency: 'INR',
      );
      expect(shares, {'a': 200.0, 'b': 100.0, 'c': 100.0});
    });

    test('a covered partner is left out and the payer carries both shares', () {
      final w = weightedDefaultSplit(selected: {'r', 'p', 'o'}, weights: const {}, covers: const {'p': 'r'})!;
      expect(w.selected, {'r', 'o'});
      expect(w.weights, {'r': 2.0, 'o': 1.0});
      // Payer not on the expense: the partner is charged normally.
      expect(weightedDefaultSplit(selected: {'p', 'o'}, weights: const {}, covers: const {'p': 'r'}), isNull);
      // Extra people not in the trip add on top.
      final x = weightedDefaultSplit(selected: {'r', 'p', 'o'}, weights: const {'r': 2}, covers: const {'p': 'r'})!;
      expect(x.weights['r'], 3.0);
      expect(
        memberWeightNote(memberId: 'p', weights: const {}, covers: const {'p': 'r'}, nameOf: (_) => 'Rahul'),
        'Paid for by Rahul',
      );
      expect(
        memberWeightNote(memberId: 'r', weights: const {}, covers: const {'p': 'r'}, nameOf: (_) => 'Rahul'),
        'Counts as 2',
      );
    });

    test('memberWeights survives JSON and a collab merge', () {
      const t = Trip(
        id: 't',
        name: 'Goa',
        startDate: '2026-12-01',
        endDate: '2026-12-05',
        baseCurrency: 'INR',
        ownerId: 'u1',
        joinCode: 'GOA7MX',
        createdAt: 0,
        updatedAt: 0,
        memberWeights: {'m1': 2},
        memberCovers: {'m2': 'm1'},
      );
      final back = Trip.fromJson(t.toJson());
      expect(back.memberWeights, {'m1': 2.0});
      expect(back.memberCovers, {'m2': 'm1'});
      expect(Trip.fromJson(t.copyWith(memberWeights: const {}).toJson()).memberWeights, isEmpty);
      expect(applyRemoteTrip(t.copyWith(memberWeights: const {}), t).memberWeights, {'m1': 2.0});
    });

    testApp('People: I pay for Cara, so I count as 2 and she is paid for', (tester) async {
      await pumpApp(tester, user: asha, flagsOn: {'enableMemberWeights'});
      final s = await seedTrip(tester);
      await openTab(tester, s, 'members');
      await tester.tap(key('member-actions-${s.me}'));
      await settle(tester, rounds: 4);
      await tester.ensureVisible(key('member-covers-${s.me}-${s.cara}'));
      await tester.tap(key('member-covers-${s.me}-${s.cara}'));
      await settle(tester, rounds: 8);
      expect(containerOf(tester).read(tripProvider(s.tripId)).value?.memberCovers, {s.cara: s.me});
      expect(find.textContaining('Counts as 2'), findsOneWidget);
      expect(find.textContaining('Paid for by Asha'), findsOneWidget);
    });

    testApp('a new expense leaves the covered partner out and charges the payer twice', (tester) async {
      await pumpApp(tester, user: asha, flagsOn: {'enableMemberWeights'});
      final s = await seedTrip(tester);
      final oldId = await addExpense(tester, s, amount: 90);
      await real(
        tester,
        () => containerOf(tester).read(tripRepositoryProvider).setMemberCovers(s.tripId, {s.cara: s.me}),
      );
      await addFood(tester, s, '300');
      final all = await expensesOf(tester, s);
      final fresh = all.firstWhere((e) => e.id != oldId);
      expect(fresh.resolvedShares[s.me], 200);
      expect(fresh.resolvedShares[s.ben], 100);
      expect(fresh.resolvedShares[s.cara] ?? 0, 0);
      expect(all.firstWhere((e) => e.id == oldId).resolvedShares[s.cara], 30);
    });

    testApp('a new expense splits by the weights; old ones keep their split', (tester) async {
      await pumpApp(tester, user: asha, flagsOn: {'enableMemberWeights'});
      final s = await seedTrip(tester);
      final oldId = await addExpense(tester, s, amount: 90);
      await setWeights(tester, s, {s.ben: 2});
      await addFood(tester, s, '400');
      final all = await expensesOf(tester, s);
      final fresh = all.firstWhere((e) => e.id != oldId);
      expect(fresh.splitMode, 'custom');
      expect(fresh.resolvedShares[s.ben], 200);
      expect(fresh.resolvedShares[s.me], 100);
      expect(fresh.resolvedShares[s.cara], 100);
      final old = all.firstWhere((e) => e.id == oldId);
      expect(old.splitMode, 'equal');
    });

    test('Apply on a Shares split restarts from pays-for', () {
      final w = applyCoversToSplit(
        mode: 'custom',
        selected: {'r', 'p', 'o'},
        config: const {'r': 1, 'p': 2, 'o': 1},
        weights: const {},
        covers: const {'p': 'r'},
      )!;
      expect(w.selected, {'r', 'o'});
      expect(w.weights, {'r': 2.0, 'o': 1.0});
      expect(
        applyCoversToSplit(
          mode: 'exact',
          selected: {'r', 'p'},
          config: const {},
          weights: const {},
          covers: const {'p': 'r'},
        ),
        isNull,
      );
      expect(
        coversSummary(
          selected: {'r', 'p', 'o'},
          covers: const {'p': 'r'},
          nameOf: (id) => id == 'r' ? 'Rahul' : 'Anita',
        ),
        'Rahul pays for Anita',
      );
      expect(coversSummary(selected: {'p', 'o'}, covers: const {'p': 'r'}, nameOf: (id) => id), isEmpty);
    });

    testApp('form: Apply chip shows when the partner is back in, and takes them out', (tester) async {
      await pumpApp(tester, user: asha, flagsOn: {'enableMemberWeights'});
      final s = await seedTrip(tester);
      await real(
        tester,
        () => containerOf(tester).read(tripRepositoryProvider).setMemberCovers(s.tripId, {s.cara: s.me}),
      );
      await openForm(tester, s);
      expect(key('apply-covers'), findsNothing);
      await tester.ensureVisible(key('split-${s.cara}'));
      await tester.tap(key('split-${s.cara}'));
      await settle(tester, rounds: 4);
      expect(key('apply-covers'), findsOneWidget);
      expect(find.textContaining('Asha pays for Cara'), findsOneWidget);
      await tester.tap(key('apply-covers'));
      await settle(tester, rounds: 4);
      expect(key('apply-covers'), findsNothing);
      await tester.enterText(key('amount-field'), '300');
      await settle(tester, rounds: 2);
      await tester.enterText(key('title-field'), 'Dinner');
      await settle(tester, rounds: 2);
      await tester.ensureVisible(key('save'));
      await tester.tap(key('save'));
      await settle(tester, rounds: 14);
      final e = (await expensesOf(tester, s)).single;
      expect(e.resolvedShares[s.me], 200);
      expect(e.resolvedShares[s.cara] ?? 0, 0);
    });

    testApp('quick add leaves the covered partner out too', (tester) async {
      await pumpApp(tester, user: asha, flagsOn: {'enableMemberWeights'});
      final s = await seedTrip(tester);
      await real(
        tester,
        () => containerOf(tester).read(tripRepositoryProvider).setMemberCovers(s.tripId, {s.cara: s.me}),
      );
      await openTab(tester, s, 'expenses');
      await tester.tap(key('tab-menu'));
      await settle(tester);
      await tester.tap(find.text('Quick add'));
      await settle(tester, rounds: 4);
      await tester.enterText(key('quick-add-text'), 'lunch 300');
      await settle(tester, rounds: 2);
      await tester.tap(key('quick-add-save'));
      await settle(tester, rounds: 10);
      final e = (await expensesOf(tester, s)).single;
      expect(e.splitMode, 'custom');
      expect(e.resolvedShares[s.me], 200);
      expect(e.resolvedShares[s.ben], 100);
      expect(e.resolvedShares[s.cara] ?? 0, 0);
    });

    test('a partner left out still rides along with their payer', () {
      expect(withCoveredPartners({'r', 'o'}, const {'p': 'r'}, {'r', 'p', 'o'}), {'r', 'p', 'o'});
      expect(withCoveredPartners({'p', 'o'}, const {'p': 'r'}, {'r', 'p', 'o'}), {'p', 'o'});
      expect(withCoveredPartners({'r'}, const {'p': 'r'}, {'r'}), {'r'});
    });

    testApp('a remembered split without the partner still charges the payer twice', (tester) async {
      await pumpApp(tester, user: asha, flagsOn: {'enableMemberWeights', 'enableRememberDefaultSplit'});
      final s = await seedTrip(tester);
      await openForm(tester, s);
      await tester.ensureVisible(key('split-${s.cara}'));
      await tester.tap(key('split-${s.cara}'));
      await settle(tester, rounds: 4);
      await tester.enterText(key('amount-field'), '100');
      await settle(tester, rounds: 2);
      await tester.enterText(key('title-field'), 'Snack');
      await settle(tester, rounds: 2);
      await tester.ensureVisible(key('save'));
      await tester.tap(key('save'));
      await settle(tester, rounds: 14);
      final oldId = (await expensesOf(tester, s)).single.id;
      await openTab(tester, s, 'expenses');
      await real(
        tester,
        () => containerOf(tester).read(tripRepositoryProvider).setMemberCovers(s.tripId, {s.cara: s.me}),
      );
      await addFood(tester, s, '300');
      final fresh = (await expensesOf(tester, s)).firstWhere((e) => e.id != oldId);
      expect(fresh.splitMode, 'custom');
      expect(fresh.resolvedShares[s.me], 200);
      expect(fresh.resolvedShares[s.ben], 100);
      expect(fresh.resolvedShares[s.cara] ?? 0, 0);
    });

    testApp('flag off: no Counts as setting and new expenses stay equal', (tester) async {
      await pumpApp(tester, user: asha);
      final s = await seedTrip(tester);
      await setWeights(tester, s, {s.ben: 2});
      await openTab(tester, s, 'members');
      await tester.tap(key('member-actions-${s.ben}'));
      await settle(tester, rounds: 4);
      expect(key('member-covers-${s.ben}-${s.cara}'), findsNothing);
      Navigator.of(tester.element(key('member-rename-${s.ben}'))).pop();
      await settle(tester, rounds: 4);
      await addFood(tester, s, '300');
      final e = (await expensesOf(tester, s)).single;
      expect(e.splitMode, 'equal');
      expect(e.resolvedShares[s.ben], 100);
    });
  });
}
