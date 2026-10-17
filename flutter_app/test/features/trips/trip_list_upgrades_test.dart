import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

import '../../support/pump_app.dart';
import '../../support/seed.dart';

Finder key(String k) => find.byKey(Key(k));

Future<void> home(WidgetTester tester) async {
  GoRouter.of(tester.element(find.byType(Scaffold).first)).go('/');
  await settle(tester, rounds: 12);
}

void main() {
  testApp('trip card shows member avatars and your money position', (tester) async {
    await pumpApp(tester, user: asha);
    final s = await seedTrip(tester);
    await addExpense(tester, s, amount: 90); // Asha paid for three: she is owed 60
    await home(tester);
    expect(key('trip-avatars'), findsOneWidget);
    expect(tester.widget<Text>(key('trip-money')).data, "You're owed ₹60.00");
  });

  testApp('trip card money and avatars are gone with the flag off', (tester) async {
    await pumpApp(tester, user: asha, flagsOff: {'enableTripListMoney'});
    final s = await seedTrip(tester);
    await addExpense(tester, s, amount: 90);
    await home(tester);
    expect(key('trip-avatars'), findsNothing);
    expect(key('trip-money'), findsNothing);
  });

  testApp('trips are grouped under a section header; a one-time swipe tip can be dismissed for good', (tester) async {
    final app = await pumpApp(tester, user: asha);
    await seedTrip(tester);
    await home(tester);
    expect(find.byWidgetPredicate((w) => w.key.toString().contains("'trip-section-")), findsOneWidget);
    expect(key('hint-trips-swipe'), findsOneWidget);
    await tester.tap(key('hint-dismiss-trips-swipe'));
    await settle(tester, rounds: 4);
    expect(key('hint-trips-swipe'), findsNothing);
    expect(app.prefs.getBool('hint.trips-swipe'), isTrue);
  });

  testApp('sections and tips are absent with their flags off', (tester) async {
    await pumpApp(tester, user: asha, flagsOff: {'enableTripListSections', 'enableCoachHints'});
    await seedTrip(tester);
    await home(tester);
    expect(find.byWidgetPredicate((w) => w.key.toString().contains("'trip-section-")), findsNothing);
    expect(key('hint-trips-swipe'), findsNothing);
  });
}
