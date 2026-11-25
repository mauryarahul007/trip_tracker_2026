import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:trip_tracker/data/providers.dart';
import 'package:trip_tracker/domain/models/member.dart';
import 'package:trip_tracker/features/trip_details/application/trip_nav.dart';

import '../support/pump_app.dart';
import '../support/seed.dart';

Finder key(String k) => find.byKey(Key(k));

Future<void> openPeople(WidgetTester tester, Seed s) async {
  await settle(tester);
  GoRouter.of(tester.element(find.byType(Scaffold).first)).go('/trip/${s.tripId}/members');
  await settle(tester, rounds: 14);
}

Future<List<Member>> membersOf(WidgetTester tester, Seed s) =>
    real(tester, () => containerOf(tester).read(memberRepositoryProvider).watchMembers(s.tripId).first);

Future<void> openSheet(WidgetTester tester, String memberId) async {
  await tester.tap(key('member-actions-$memberId'));
  await settle(tester, rounds: 4);
}

void main() {
  group('delete a member (enableMemberDelete)', () {
    testApp('a member on no expense is deleted and their pays-for is cleared', (tester) async {
      await pumpApp(tester, user: asha, flagsOn: {'enableMemberDelete', 'enableMemberWeights'});
      final s = await seedTrip(tester);
      await real(
        tester,
        () => containerOf(tester).read(tripRepositoryProvider).setMemberCovers(s.tripId, {s.cara: s.me}),
      );
      await openPeople(tester, s);
      await openSheet(tester, s.cara);
      await tester.ensureVisible(key('member-delete-${s.cara}'));
      await tester.tap(key('member-delete-${s.cara}'));
      await settle(tester, rounds: 4);
      await tester.tap(key('member-delete-confirm'));
      await settle(tester, rounds: 10);
      expect((await membersOf(tester, s)).map((m) => m.id), isNot(contains(s.cara)));
      expect(containerOf(tester).read(tripProvider(s.tripId)).value?.memberCovers, isEmpty);
    });

    testApp('a member on an expense cannot be deleted; Archive is offered instead', (tester) async {
      await pumpApp(tester, user: asha, flagsOn: {'enableMemberDelete'});
      final s = await seedTrip(tester);
      await addExpense(tester, s, amount: 90);
      await openPeople(tester, s);
      await openSheet(tester, s.ben);
      await tester.ensureVisible(key('member-delete-${s.ben}'));
      await tester.tap(key('member-delete-${s.ben}'));
      await settle(tester, rounds: 4);
      expect(key('member-delete-blocked'), findsOneWidget);
      await tester.tap(key('member-delete-archive'));
      await settle(tester, rounds: 10);
      final ben = (await membersOf(tester, s)).firstWhere((m) => m.id == s.ben);
      expect(ben.archived, isTrue);
    });

    testApp('no Delete for yourself, and none with the flag off', (tester) async {
      await pumpApp(tester, user: asha, flagsOn: {'enableMemberDelete'});
      final s = await seedTrip(tester);
      await openPeople(tester, s);
      await openSheet(tester, s.me);
      expect(key('member-delete-${s.me}'), findsNothing);
    });

    testApp('flag off: no Delete in the member sheet', (tester) async {
      await pumpApp(tester, user: asha);
      final s = await seedTrip(tester);
      await openPeople(tester, s);
      await openSheet(tester, s.cara);
      expect(key('member-delete-${s.cara}'), findsNothing);
      expect(key('member-archive-${s.cara}'), findsOneWidget);
    });
  });
}
