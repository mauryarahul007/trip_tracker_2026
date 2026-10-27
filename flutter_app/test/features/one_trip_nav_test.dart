import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:trip_tracker/app/router.dart';
import 'package:trip_tracker/features/trip_details/application/trip_nav.dart';
import 'package:trip_tracker/features/trip_details/domain/trip_tabs.dart';

import '../support/pump_app.dart';
import '../support/seed.dart';

void main() {
  testApp('the shipped app has one trip navigation whatever the retired nav flags say', (tester) async {
    // pumpApp turns Compass and Calm off; with legacy nav not allowed (the real app) they must not matter.
    await pumpApp(tester, user: asha, legacyNav: false, flagsOn: {'enableChatFirstNav', 'enableTripChat'});
    final s = await seedTrip(tester);
    final c = containerOf(tester);
    final dock = c.read(dockTabsProvider(s.tripId));
    expect(dock.take(3), [TripNavTab.ledger, TripNavTab.expenses, TripNavTab.activity]);
    expect(dock.last, TripNavTab.hub);
    expect(c.read(visibleTabsProvider(s.tripId)), contains(TripNavTab.chat));
    expect(c.read(visibleTabsProvider(s.tripId)).first, TripNavTab.ledger); // chat-first no longer moves Chat
    c.read(routerProvider).go('/trip/${s.tripId}/ledger');
    await settle(tester, rounds: 10);
    expect(find.byKey(const Key('calm-dock')), findsOneWidget);
  });
}
