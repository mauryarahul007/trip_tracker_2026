import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:trip_tracker/data/providers.dart';
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
      );
      final back = Trip.fromJson(t.toJson());
      expect(back.memberWeights, {'m1': 2.0});
      expect(Trip.fromJson(t.copyWith(memberWeights: const {}).toJson()).memberWeights, isEmpty);
      expect(applyRemoteTrip(t.copyWith(memberWeights: const {}), t).memberWeights, {'m1': 2.0});
    });

    testApp('People: an organiser sets Counts as 2 and the row says so', (tester) async {
      await pumpApp(tester, user: asha, flagsOn: {'enableMemberWeights'});
      final s = await seedTrip(tester);
      await openTab(tester, s, 'members');
      await tester.tap(key('member-actions-${s.ben}'));
      await settle(tester, rounds: 4);
      await tester.ensureVisible(key('member-weight-${s.ben}-2'));
      await tester.tap(key('member-weight-${s.ben}-2'));
      await settle(tester, rounds: 8);
      expect(containerOf(tester).read(tripProvider(s.tripId)).value?.memberWeights, {s.ben: 2.0});
      expect(find.textContaining('Counts as 2'), findsOneWidget);
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

    testApp('flag off: no Counts as setting and new expenses stay equal', (tester) async {
      await pumpApp(tester, user: asha);
      final s = await seedTrip(tester);
      await setWeights(tester, s, {s.ben: 2});
      await openTab(tester, s, 'members');
      await tester.tap(key('member-actions-${s.ben}'));
      await settle(tester, rounds: 4);
      expect(key('member-weight-${s.ben}-2'), findsNothing);
      Navigator.of(tester.element(key('member-rename-${s.ben}'))).pop();
      await settle(tester, rounds: 4);
      await addFood(tester, s, '300');
      final e = (await expensesOf(tester, s)).single;
      expect(e.splitMode, 'equal');
      expect(e.resolvedShares[s.ben], 100);
    });
  });
}
