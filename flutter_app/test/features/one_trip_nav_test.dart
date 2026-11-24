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
    await pumpApp(
      tester,
      user: asha,
      legacyNav: false,
      flagsOn: {'enableChatFirstNav', 'enableTripChat', 'enableHorizonUi'},
    );
    final s = await seedTrip(tester);
    final c = containerOf(tester);
    final dock = c.read(dockTabsProvider(s.tripId));
    // Horizon (default ON): Balances, Spend, Chat, Hub; Activity moves to the header bell.
    expect(dock, [TripNavTab.ledger, TripNavTab.expenses, TripNavTab.chat, TripNavTab.hub]);
    expect(c.read(visibleTabsProvider(s.tripId)), contains(TripNavTab.chat));
    expect(c.read(visibleTabsProvider(s.tripId)).first, TripNavTab.ledger); // chat-first no longer moves Chat
    c.read(routerProvider).go('/trip/${s.tripId}/ledger');
    await settle(tester, rounds: 10);
    expect(find.byKey(const Key('calm-dock')), findsOneWidget);
  });

  testApp('Horizon off keeps the Calm dock with Activity', (tester) async {
    await pumpApp(tester, user: asha, legacyNav: false, flagsOn: {'enableTripChat'}, flagsOff: {'enableHorizonUi'});
    final s = await seedTrip(tester);
    final c = containerOf(tester);
    final sub = c.listen(dockTabsProvider(s.tripId), (_, _) {}); // let the trip-scoped flag stream land
    await settle(tester, rounds: 3);
    final dock = c.read(dockTabsProvider(s.tripId));
    sub.close();
    expect(dock.take(3), [TripNavTab.ledger, TripNavTab.expenses, TripNavTab.activity]);
    expect(dock.last, TripNavTab.hub);
  });

  test('Horizon dock drops Activity and keeps Chat', () {
    expect(horizonDockTabs(chatEnabled: true), [
      TripNavTab.ledger,
      TripNavTab.expenses,
      TripNavTab.chat,
      TripNavTab.hub,
    ]);
    expect(horizonDockTabs(chatEnabled: false), [TripNavTab.ledger, TripNavTab.expenses, TripNavTab.hub]);
    expect(horizonDockTabFor(TripNavTab.activity), TripNavTab.hub);
  });

  test('Calm dock keeps Chat and moves Plans into the Hub', () {
    expect(calmDockTabs(chatEnabled: true), [
      TripNavTab.ledger,
      TripNavTab.expenses,
      TripNavTab.activity,
      TripNavTab.chat,
      TripNavTab.hub,
    ]);
    expect(calmDockTabs(chatEnabled: false), isNot(contains(TripNavTab.chat)));
    expect(calmDockTabs(chatEnabled: true), isNot(contains(TripNavTab.notes)));
    expect(calmPagerTabs(chatEnabled: true, showNotesTab: true), containsAll([TripNavTab.notes, TripNavTab.members]));
    expect(calmPagerTabs(chatEnabled: true, showNotesTab: false), isNot(contains(TripNavTab.notes)));
    expect(calmDockTabFor(TripNavTab.notes), TripNavTab.hub);
    expect(calmDockTabFor(TripNavTab.members), TripNavTab.hub);
    expect(calmDockTabFor(TripNavTab.chat), TripNavTab.chat);
  });

  testApp('Hub shows Plans instead of Notes and no Chat tile; Chat sits in the dock', (tester) async {
    await pumpApp(tester, user: asha, legacyNav: false, flagsOn: {'enableTripChat', 'enableNotesAndChecklist'});
    final s = await seedTrip(tester);
    final c = containerOf(tester);
    expect(c.read(dockTabsProvider(s.tripId)), contains(TripNavTab.chat));
    expect(c.read(dockTabsProvider(s.tripId)), isNot(contains(TripNavTab.notes)));
    c.read(routerProvider).go('/trip/${s.tripId}/hub');
    await settle(tester, rounds: 10);
    expect(find.byKey(const Key('hub-plans')), findsOneWidget);
    expect(find.byKey(const Key('hub-notes')), findsNothing);
    expect(find.byKey(const Key('hub-chat')), findsNothing);
    expect(find.descendant(of: find.byKey(const Key('calm-dock')), matching: find.text('Chat')), findsOneWidget);
    expect(find.descendant(of: find.byKey(const Key('calm-dock')), matching: find.text('Plans')), findsNothing);
    await tester.ensureVisible(find.byKey(const Key('hub-plans')));
    await tester.tap(find.byKey(const Key('hub-plans')));
    await settle(tester, rounds: 10);
    expect(find.byKey(const Key('tab-notes')), findsOneWidget);
  });
}
