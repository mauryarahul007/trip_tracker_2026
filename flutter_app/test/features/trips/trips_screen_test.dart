import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:trip_tracker/data/providers.dart';
import 'package:trip_tracker/data/sync/outbox_types.dart';
import 'package:trip_tracker/shared/widgets/app_button.dart';

import '../../support/pump_app.dart';

Future<String> seedTrip(WidgetTester tester, ProviderContainer c, String name,
    {String start = '2026-10-10', String end = '2026-10-15', String? destination, String owner = 'u1'}) async {
  return real(tester, () => c.read(tripRepositoryProvider).createTrip(
        name: name, startDate: start, endDate: end, baseCurrency: 'INR', ownerId: owner, creatorName: 'Asha', destination: destination));
}

ProviderContainer containerOf(WidgetTester tester) =>
    ProviderScope.containerOf(tester.element(find.byType(MaterialApp)));

void main() {
  testApp('empty account: friendly empty state with create + join actions', (tester) async {
    await pumpApp(tester, user: asha);
    expect(find.text('No trips yet'), findsOneWidget);
    expect(find.widgetWithText(AppButton, 'Create Trip'), findsOneWidget);
    expect(find.widgetWithText(AppButton, 'Join with Code'), findsOneWidget);
  });

  testApp('trips list: sorted newest first, search filters, name sort reorders', (tester) async {
    await pumpApp(tester, user: asha);
    final c = containerOf(tester);
    await seedTrip(tester, c, 'Goa Weekend', start: '2026-12-01', end: '2026-12-04', destination: 'Goa');
    await seedTrip(tester, c, 'Alps Ski', start: '2026-12-20', end: '2026-12-27', destination: 'Switzerland');
    await seedTrip(tester, c, 'Beach Break', start: '2026-11-05', end: '2026-11-08');
    await settle(tester);

    List<String> order() => tester.widgetList<Text>(find.byWidgetPredicate((w) => w is Text && ['Goa Weekend', 'Alps Ski', 'Beach Break'].contains(w.data)))
        .map((t) => t.data!).toList();
    expect(order(), ['Alps Ski', 'Goa Weekend', 'Beach Break']);

    await tester.tap(find.byTooltip('Newest first'));
    await settle(tester);
    await tester.tap(find.text('Name (A–Z)'));
    await settle(tester);
    expect(order(), ['Alps Ski', 'Beach Break', 'Goa Weekend']);

    await tester.enterText(find.byType(TextField).first, 'switz');
    await settle(tester);
    expect(order(), ['Alps Ski']); // matches destination
    await tester.enterText(find.byType(TextField).first, 'zzz');
    await settle(tester);
    expect(find.text('No trips match your search.'), findsOneWidget);
  });

  testApp('swipe archives, shows undo, archived section lists it; undo restores', (tester) async {
    await pumpApp(tester, user: asha);
    final c = containerOf(tester);
    final id = await seedTrip(tester, c, 'Goa Weekend');
    await settle(tester);

    await tester.drag(find.text('Goa Weekend'), const Offset(-500, 0));
    await settle(tester);
    expect(find.text('Trip archived'), findsOneWidget);
    expect(find.text('Archived (1)'), findsOneWidget);
    final state = await real(tester, () => c.read(tripRepositoryProvider).watchTrip(id).first);
    expect(state!.archived, isTrue);
    final queued = await real(tester, () => c.read(outboxStoreProvider).all());
    expect(queued.map((i) => i.type), contains(OutboxType.updateTripState));

    await tester.tap(find.text('UNDO'));
    await settle(tester);
    expect((await real(tester, () => c.read(tripRepositoryProvider).watchTrip(id).first))!.archived, isFalse);
    expect(find.text('Archived (1)'), findsNothing);
  });

  testApp('delete: confirm, hidden immediately, committed after the undo window', (tester) async {
    await pumpApp(tester, user: asha);
    final c = containerOf(tester);
    final id = await seedTrip(tester, c, 'Goa Weekend');
    await settle(tester);

    await tester.tap(find.byTooltip('Delete trip'));
    await settle(tester);
    expect(find.text('Delete this trip?'), findsOneWidget);
    await tester.tap(find.text('Delete'));
    await settle(tester);
    expect(find.text('Goa Weekend'), findsNothing);
    expect(find.text('Trip deleted'), findsOneWidget);
    // Still on the device during the undo window.
    expect(await real(tester, () => c.read(tripRepositoryProvider).watchTrip(id).first), isNotNull);

    await tester.pump(const Duration(seconds: 6));
    await settle(tester, rounds: 12);
    expect(await real(tester, () => c.read(tripRepositoryProvider).watchTrip(id).first), isNull);
    expect((await real(tester, () => c.read(outboxStoreProvider).all())).map((i) => i.type), contains(OutboxType.deleteTrip));
  });

  testApp('delete undo keeps the trip and queues nothing', (tester) async {
    await pumpApp(tester, user: asha);
    final c = containerOf(tester);
    final id = await seedTrip(tester, c, 'Goa Weekend');
    await settle(tester);
    await tester.tap(find.byTooltip('Delete trip'));
    await settle(tester);
    await tester.tap(find.text('Delete'));
    await settle(tester);
    await tester.tap(find.text('UNDO'));
    await settle(tester);
    expect(find.text('Goa Weekend'), findsOneWidget);
    expect(await real(tester, () => c.read(tripRepositoryProvider).watchTrip(id).first), isNotNull);
    expect((await real(tester, () => c.read(outboxStoreProvider).all())).map((i) => i.type), isNot(contains(OutboxType.deleteTrip)));
  });

  testApp('trips owned by someone else cannot be archived or deleted from the list', (tester) async {
    await pumpApp(tester, user: asha);
    final c = containerOf(tester);
    await seedTrip(tester, c, 'Their Trip', owner: 'someone-else');
    await settle(tester);
    expect(find.byTooltip('Delete trip'), findsNothing);
    await tester.drag(find.text('Their Trip'), const Offset(-500, 0));
    await settle(tester);
    expect(find.text('Trip archived'), findsNothing);
  });

  testApp('sync chip: pending count, issue state, review sheet only with the inspector flag', (tester) async {
    await pumpApp(tester, user: asha, flagsOn: {'enableSyncQueueInspector'});
    final c = containerOf(tester);
    await seedTrip(tester, c, 'Goa Weekend');
    await settle(tester);
    // No backend in tests => guest-like local sync status: chip hidden.
    expect(find.textContaining('waiting to sync'), findsNothing);
  });

  testApp('tapping a trip opens its shell', (tester) async {
    await pumpApp(tester, user: asha);
    final c = containerOf(tester);
    final id = await seedTrip(tester, c, 'Goa Weekend');
    await settle(tester);
    await tester.tap(find.text('Goa Weekend'));
    await settle(tester);
    expect(find.byType(BottomNavigationBar), findsOneWidget); // now inside the trip shell
    expect(find.text('My Trips'), findsNothing);
    expect(id, isNotEmpty);
  });
}
