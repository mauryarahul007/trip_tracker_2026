import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:trip_tracker/core/platform/share_service.dart';
import 'package:trip_tracker/data/providers.dart';
import 'package:trip_tracker/domain/models/member.dart';
import 'package:trip_tracker/domain/models/trip.dart';
import 'package:trip_tracker/features/expenses/application/expenses_providers.dart';
import 'package:trip_tracker/features/expenses/presentation/trip_tools_sheet.dart';
import 'package:trip_tracker/features/trip_details/application/trip_nav.dart';
import 'package:trip_tracker/l10n/app_localizations.dart';

import '../../support/fakes.dart';

void main() {
  const sampleTrip = Trip(
    id: 'trip-1',
    ownerId: 'user-1',
    name: 'Goa Holiday',
    startDate: '2026-11-10',
    endDate: '2026-11-15',
    baseCurrency: 'INR',
    joinCode: 'GOA26',
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
  );

  testWidgets('TripToolsSheet renders 9D tool triggers and responds to feature flags', (tester) async {
    final fakeShare = FakeShareService();

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          tripProvider('trip-1').overrideWith((ref) => Stream.value(sampleTrip)),
          tripMembersProvider('trip-1').overrideWith((ref) => Stream.value(const [
                Member(id: 'm-1', name: 'Alice'),
                Member(id: 'm-2', name: 'Bob'),
              ])),
          tripExpensesProvider('trip-1').overrideWith((ref) => Stream.value(const [])),
          shareServiceProvider.overrideWithValue(fakeShare),
          flagsRepositoryProvider.overrideWithValue(FakeFlags(
            {
              'enableTripWrapped',
              'enableIcsExport',
              'enableAchievements',
              'enableTravelerPassport',
              'enableOfflineSnapshot',
            },
            {},
          )),
        ],
        child: const MaterialApp(
          localizationsDelegates: AppLocalizations.localizationsDelegates,
          supportedLocales: AppLocalizations.supportedLocales,
          home: Scaffold(
            body: SingleChildScrollView(
              child: TripToolsSheet(tripId: 'trip-1'),
            ),
          ),
        ),
      ),
    );

    await tester.pumpAndSettle();

    // Verify 9D buttons exist
    expect(find.byKey(const Key('trip-wrapped')), findsOneWidget);
    expect(find.byKey(const Key('export-ics')), findsOneWidget);
    expect(find.byKey(const Key('trip-achievements')), findsOneWidget);
    expect(find.byKey(const Key('traveler-passport')), findsOneWidget);
    expect(find.byKey(const Key('offline-snapshot')), findsOneWidget);

    // Verify tapping export-ics invokes shareService
    await tester.tap(find.byKey(const Key('export-ics')));
    await tester.pumpAndSettle();
    expect(fakeShare.files.length, 1);
    expect(fakeShare.files.first, contains('.ics'));
  });
}
