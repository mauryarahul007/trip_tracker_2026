import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:trip_tracker/data/providers.dart';

import '../../support/pump_app.dart';
import '../../support/seed.dart';

Finder key(String k) => find.byKey(Key(k));

Future<Seed> setup(WidgetTester tester, {Set<String> flagsOff = const {}, int extra = 0}) async {
  await pumpApp(tester, user: asha, flagsOff: flagsOff);
  final s = await seedTrip(tester);
  for (var i = 0; i < extra; i++) {
    await real(
      tester,
      () => containerOf(tester).read(memberRepositoryProvider).addMember(s.tripId, 'Guest $i', email: 'g$i@x.com'),
    );
  }
  await settle(tester);
  GoRouter.of(tester.element(find.byType(Scaffold).first)).go('/trip/${s.tripId}/members');
  await settle(tester, rounds: 14);
  return s;
}

void main() {
  testApp('tidy members: role chip on each row, no search for a small trip', (tester) async {
    final s = await setup(tester);
    expect(key('member-role-chip-${s.me}'), findsOneWidget);
    expect(key('member-search'), findsNothing);
  });

  testApp('search appears past 8 members and filters the list', (tester) async {
    await setup(tester, extra: 7); // 3 seeded + 7 = 10
    expect(key('member-search'), findsOneWidget);
    await tester.enterText(key('member-search'), 'Guest 3');
    await settle(tester, rounds: 4);
    Finder inRow(String n) => find.descendant(of: find.byType(ListTile), matching: find.text(n));
    expect(inRow('Guest 3'), findsOneWidget);
    expect(inRow('Guest 4'), findsNothing);
  });

  testApp('flag off: the old tinted rows, no chips or search', (tester) async {
    final s = await setup(tester, flagsOff: {'enableTidyMembers'}, extra: 7);
    expect(key('member-role-chip-${s.me}'), findsNothing);
    expect(key('member-search'), findsNothing);
    expect(key('member-${s.me}'), findsOneWidget);
  });
}
