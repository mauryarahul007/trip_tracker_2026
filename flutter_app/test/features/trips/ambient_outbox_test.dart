import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:trip_tracker/data/providers.dart';
import 'package:trip_tracker/data/sync/outbox_types.dart';
import 'package:trip_tracker/features/trips/presentation/widgets/ambient_outbox_sheet.dart';

import '../../support/pump_app.dart';
import '../../support/seed.dart';

Finder key(String k) => find.byKey(Key(k));

Future<String> createTestTrip(WidgetTester tester) => real(
  tester,
  () => containerOf(tester)
      .read(tripRepositoryProvider)
      .createTrip(
        name: 'Sikkim Trip',
        startDate: '2026-10-10',
        endDate: '2026-10-17',
        baseCurrency: 'INR',
        ownerId: 'u1',
        creatorName: 'Asha',
        destination: 'Sikkim',
      ),
);

Future<void> openTrip(WidgetTester tester, String id) async {
  await settle(tester);
  GoRouter.of(tester.element(find.byType(Scaffold).first)).go('/trip/$id/ledger');
  await settle(tester, rounds: 14);
}

void main() {
  testApp('Ambient Outbox Sheet opens when offline and sync button is tapped with enableAmbientOutboxDrawer ON', (tester) async {
    await pumpApp(
      tester,
      user: asha,
      online: false,
      flagsOn: {'enableAmbientOutboxDrawer', 'enableSyncLine'},
    );
    final tripId = await createTestTrip(tester);
    await openTrip(tester, tripId);

    // Sync button should exist
    expect(key('sync-action'), findsOneWidget);

    // Tap sync button while offline
    await tester.tap(key('sync-action'));
    await settle(tester, rounds: 6);

    // Ambient outbox sheet should open
    expect(find.byType(AmbientOutboxSheet), findsOneWidget);
    expect(find.text('Trip Outbox & Sync'), findsOneWidget);
    expect(find.text('Offline Mode — All Changes Staged'), findsOneWidget);
    expect(key('ambient-outbox-list'), findsOneWidget);
    expect(find.text('Create trip: Sikkim Trip'), findsOneWidget);
  });

  testApp('Ambient Outbox Sheet displays queued items and metrics when items exist in outbox', (tester) async {
    await pumpApp(
      tester,
      user: asha,
      online: false,
      flagsOn: {'enableAmbientOutboxDrawer', 'enableSyncLine'},
    );
    final tripId = await createTestTrip(tester);

    // Manually enqueue an outbox item
    final outbox = containerOf(tester).read(outboxStoreProvider);
    await outbox.enqueue(
      OutboxType.addExpense,
      {
        'tripId': tripId,
        'expenseData': {
          'title': 'Monastery Entry Tickets',
          'amount': 600.0,
          'currency': 'INR',
        },
      },
      tripId: tripId,
    );

    await openTrip(tester, tripId);

    // Tap sync button to open sheet
    await tester.tap(key('sync-action'));
    await settle(tester, rounds: 6);

    // Outbox list should display the queued expense
    expect(find.byType(AmbientOutboxSheet), findsOneWidget);
    expect(key('ambient-outbox-list'), findsOneWidget);
    expect(find.text('Add expense: Monastery Entry Tickets'), findsOneWidget);
    expect(find.text('Pending'), findsOneWidget);
  });

  testApp('Ambient Outbox Sheet displays empty state when outbox is completely clear', (tester) async {
    await pumpApp(
      tester,
      user: asha,
      online: false,
      flagsOn: {'enableAmbientOutboxDrawer', 'enableSyncLine'},
    );
    final tripId = await createTestTrip(tester);

    // Clear all outbox items to simulate a clean/synced outbox
    final outbox = containerOf(tester).read(outboxStoreProvider);
    for (final item in await outbox.all()) {
      await outbox.markDone(item.id);
    }

    await openTrip(tester, tripId);

    // Tap sync button to open sheet
    await tester.tap(key('sync-action'));
    await settle(tester, rounds: 6);

    // Outbox should show empty state
    expect(find.byType(AmbientOutboxSheet), findsOneWidget);
    expect(key('ambient-outbox-empty'), findsOneWidget);
    expect(find.text('Outbox is completely clear'), findsOneWidget);
  });
}
