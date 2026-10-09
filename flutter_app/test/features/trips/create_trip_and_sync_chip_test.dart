import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:trip_tracker/data/providers.dart';
import 'package:trip_tracker/data/sync/outbox_store.dart';
import 'package:trip_tracker/data/sync/outbox_types.dart';
import 'package:trip_tracker/features/trips/application/trips_providers.dart';
import 'package:trip_tracker/features/trips/presentation/widgets/create_trip_sheet.dart';
import 'package:trip_tracker/shared/widgets/app_button.dart';

import '../../support/pump_app.dart';

ProviderContainer containerOf(WidgetTester tester) =>
    ProviderScope.containerOf(tester.element(find.byType(MaterialApp)));

OutboxItem item(String id, String type, String status, {String? err, Map<String, dynamic> payload = const {}}) =>
    OutboxItem(
      id: id,
      type: type,
      tripId: 't',
      payload: payload,
      idempotencyKey: id,
      attempts: 1,
      status: status,
      lastError: err,
      lastAttemptedAt: null,
    );

void main() {
  group('create trip', () {
    final picker = dateRangePickerProvider.overrideWithValue(
      (context, today, initial) async => DateTimeRange(start: DateTime(2026, 12, 1), end: DateTime(2026, 12, 5)),
    );

    testApp('requires a name and dates', (tester) async {
      final app = await pumpApp(tester, user: asha);
      await tester.tap(find.byKey(const Key('dock-center'))); // the dock's centre button opens create trip
      await settle(tester);
      await tester.tap(find.widgetWithText(AppButton, 'Create Trip').last);
      await settle(tester);
      expect(find.text('Give your trip a name.'), findsOneWidget);
      expect(find.text('Pick the trip dates.'), findsOneWidget);
      expect(await real(tester, () => containerOf(tester).read(outboxStoreProvider).all()), isEmpty);
      expect(app.auth.calls, isEmpty);
    });

    testApp('creates the trip locally, queues createTrip, opens it', (tester) async {
      await pumpApp(tester, user: asha, overrides: [picker]);
      await tester.tap(find.byKey(const Key('dock-center'))); // the dock's centre button opens create trip
      await settle(tester);
      await tester.enterText(find.byType(TextField).at(1), 'Goa Weekend');
      await tester.enterText(find.byType(TextField).at(2), 'Tokyo');
      await settle(tester);
      await tester.tap(find.byIcon(Icons.date_range_rounded));
      await settle(tester);
      expect(find.text('1–5 Dec'), findsOneWidget);
      // Destination drives the currency suggestion (Tokyo -> JPY).
      expect(find.text('JPY'), findsOneWidget);
      await tester.tap(find.widgetWithText(AppButton, 'Create Trip').last);
      await settle(tester, rounds: 12);

      final c = containerOf(tester);
      final queued = await real(tester, () => c.read(outboxStoreProvider).all());
      expect(queued.single.type, OutboxType.createTrip);
      final trip = queued.single.payload['trip'] as Map;
      expect(trip['name'], 'Goa Weekend');
      expect(trip['base_currency'], 'JPY');
      expect(trip['start_date'], '2026-12-01');
      expect(trip['owner_id'], 'u1');
      expect(trip['destination'], 'Tokyo');
      // Navigated into the new trip's shell.
      expect(find.text('My Trips'), findsNothing);
    });

    testApp('destination autocomplete: suggests, picks, sets name and currency', (tester) async {
      await pumpApp(tester, user: asha, overrides: [picker]);
      await tester.tap(find.byKey(const Key('dock-center'))); // the dock's centre button opens create trip
      await settle(tester);
      await tester.enterText(find.byType(TextField).at(2), 'Toky');
      await settle(tester);
      expect(find.byKey(const Key('destination-suggestions')), findsOneWidget);
      await tester.tap(find.byKey(const Key('destination-option-Tokyo')));
      await settle(tester);
      expect(find.widgetWithText(TextField, 'Tokyo'), findsWidgets);
      expect(find.widgetWithText(TextField, 'Tokyo trip'), findsOneWidget);
      expect(find.text('JPY'), findsOneWidget);
    });

    testApp('destination autocomplete: offers a did-you-mean fix', (tester) async {
      await pumpApp(tester, user: asha, overrides: [picker]);
      await tester.tap(find.byKey(const Key('dock-center'))); // the dock's centre button opens create trip
      await settle(tester);
      await tester.enterText(find.byType(TextField).at(2), 'Munar');
      await settle(tester);
      await tester.tap(find.byKey(const Key('destination-fix')));
      await settle(tester);
      expect(find.widgetWithText(TextField, 'Munnar'), findsOneWidget);
    });

    testApp('blank name falls back to a suggestion from destination + dates', (tester) async {
      await pumpApp(tester, user: asha, overrides: [picker]);
      await tester.tap(find.byKey(const Key('dock-center'))); // the dock's centre button opens create trip
      await settle(tester);
      await tester.enterText(find.byType(TextField).at(2), 'Tokyo');
      await tester.tap(find.byIcon(Icons.date_range_rounded));
      await settle(tester);
      await tester.tap(find.widgetWithText(AppButton, 'Create Trip').last);
      await settle(tester, rounds: 12);
      final queued = await real(tester, () => containerOf(tester).read(outboxStoreProvider).all());
      expect((queued.single.payload['trip'] as Map)['name'], contains('Tokyo'));
    });
  });

  group('sync chip', () {
    testApp('shows the pending count and is inert without the inspector flag', (tester) async {
      await pumpApp(
        tester,
        user: asha,
        overrides: [syncStatusProvider.overrideWith((ref) => Stream.value(const SyncStatus(pending: 3)))],
      );
      expect(find.text('3 changes waiting to sync'), findsOneWidget);
      await tester.tap(find.text('3 changes waiting to sync'));
      await settle(tester);
      expect(find.text('Sync queue'), findsNothing);
    });

    testApp('issue state opens the review sheet with retry/discard when the flag is on', (tester) async {
      await pumpApp(
        tester,
        user: asha,
        flagsOn: {'enableSyncQueueInspector'},
        overrides: [
          syncStatusProvider.overrideWith((ref) => Stream.value(const SyncStatus(pending: 1, issues: 1))),
          syncItemsProvider.overrideWith(
            (ref) => Stream.value([
              item(
                'i1',
                OutboxType.addCategory,
                OutboxStatus.poison,
                err: '42501 rls',
                payload: {
                  'row': {'name': 'Fuel'},
                },
              ),
            ]),
          ),
        ],
      );
      expect(find.text('Sync issue: tap to review'), findsOneWidget);
      await tester.tap(find.text('Sync issue: tap to review'));
      await settle(tester);
      expect(find.text('Sync queue'), findsOneWidget);
      expect(find.text('42501 rls'), findsOneWidget);
      expect(find.text('Retry'), findsOneWidget);
      expect(find.text('Discard'), findsOneWidget);
    });

    testApp('idle: no chip', (tester) async {
      await pumpApp(tester, user: asha);
      expect(find.textContaining('waiting to sync'), findsNothing);
      expect(find.textContaining('Sync issue'), findsNothing);
    });
  });
}
