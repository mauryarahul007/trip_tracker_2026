import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:trip_tracker/data/providers.dart';

import '../../support/pump_app.dart';
import '../../support/seed.dart';

Finder key(String k) => find.byKey(Key(k));

Future<String> goaTrip(WidgetTester tester) => real(
  tester,
  () => containerOf(tester)
      .read(tripRepositoryProvider)
      .createTrip(
        name: 'Goa Weekend',
        startDate: '2026-10-01',
        endDate: '2026-10-09',
        baseCurrency: 'INR',
        ownerId: 'u1',
        creatorName: 'Asha',
        destination: 'Goa',
      ),
);

Future<void> openTrip(WidgetTester tester, String id) async {
  await settle(tester);
  GoRouter.of(tester.element(find.byType(Scaffold).first)).go('/trip/$id/ledger');
  await settle(tester, rounds: 14);
}

Future<String?> goa(String d) async => d == 'Goa' ? 'https://img.test/goa.jpg' : null;

void main() {
  testApp('the destination photo is on the tile and becomes the band under the trip top bar', (tester) async {
    await pumpApp(tester, user: asha, coverResolver: goa, flagsOn: {'enableTripCoverHeader', 'enableTripHeaderStrip'});
    final id = await goaTrip(tester);
    await settle(tester, rounds: 10);
    expect(key('trip-thumb-$id'), findsOneWidget); // the grid tile
    await openTrip(tester, id);
    expect(key('trip-cover'), findsOneWidget);
    expect(key('trip-strip'), findsOneWidget);
  });

  testApp('without a photo the strip is the plain status-and-dates strip', (tester) async {
    await pumpApp(tester, user: asha);
    final id = await goaTrip(tester);
    await openTrip(tester, id);
    expect(key('trip-cover'), findsNothing);
    expect(key('trip-title'), findsOneWidget);
  });

  testApp('the cover band is off by default', (tester) async {
    await pumpApp(tester, user: asha, coverResolver: goa);
    final id = await goaTrip(tester);
    await openTrip(tester, id);
    expect(key('trip-cover'), findsNothing);
  });

  testApp('sync icon: nothing in the top bar when everything is saved', (tester) async {
    await pumpApp(tester, user: asha);
    final id = await goaTrip(tester);
    await openTrip(tester, id);
    expect(key('sync-action'), findsNothing);
  });

  testApp('sync icon says Offline without a connection', (tester) async {
    await pumpApp(tester, user: asha, online: false);
    final id = await goaTrip(tester);
    await openTrip(tester, id);
    expect(tester.widget<IconButton>(key('sync-action')).tooltip, 'Offline');
  });

  testApp('sync icon is absent with its flag off', (tester) async {
    await pumpApp(tester, user: asha, online: false, flagsOff: {'enableSyncLine'});
    final id = await goaTrip(tester);
    await openTrip(tester, id);
    expect(key('sync-action'), findsNothing);
  });

  testApp('the strip (when turned on) still shows the saved line', (tester) async {
    await pumpApp(tester, user: asha, flagsOn: {'enableTripHeaderStrip'});
    final id = await goaTrip(tester);
    await openTrip(tester, id);
    expect(find.descendant(of: key('sync-line'), matching: find.text('All saved')), findsOneWidget);
  });
}
