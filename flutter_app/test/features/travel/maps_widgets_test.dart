import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:trip_tracker/core/platform/map_gateway.dart';
import 'package:trip_tracker/data/providers.dart';
import 'package:trip_tracker/domain/models/category.dart';
import 'package:trip_tracker/domain/models/expense.dart';
import 'package:trip_tracker/domain/models/trip.dart';
import 'package:trip_tracker/domain/repositories/repositories.dart';
import 'package:trip_tracker/features/travel/maps/deferred_trip_map_hero.dart';
import 'package:trip_tracker/features/travel/maps/trip_journey_map.dart';
import 'package:trip_tracker/features/travel/maps/trip_map_hero.dart';
import 'package:trip_tracker/features/travel/maps/trip_photo_hero.dart';
import 'package:trip_tracker/features/travel/maps/trip_route_modal.dart';

class _FakeTripRepo implements TripRepository {
  List<TripStop>? lastSavedStops;

  @override
  Future<void> setStops(String id, List<TripStop> stops) async {
    lastSavedStops = stops;
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

void main() {
  const sampleTrip = Trip(
    id: 'trip_1',
    name: 'North East Road Trip',
    startDate: '2026-10-10',
    endDate: '2026-10-18',
    baseCurrency: 'INR',
    ownerId: 'u1',
    joinCode: 'ne2026',
    destination: 'Guwahati -> Shillong -> Tawang',
    stops: [
      TripStop(id: 's1', name: 'Guwahati', lat: 26.1445, lng: 91.7362),
      TripStop(id: 's2', name: 'Shillong', lat: 25.5788, lng: 91.8933),
      TripStop(id: 's3', name: 'Tawang', lat: 27.5861, lng: 91.8594),
    ],
    createdAt: 100,
    updatedAt: 100,
  );

  group('TripPhotoHero & TripMapHero', () {
    testWidgets('TripPhotoHero renders container with gradient scrim', (
      tester,
    ) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: TripPhotoHero(destination: 'Manali', height: 200),
          ),
        ),
      );
      expect(find.byType(TripPhotoHero), findsOneWidget);
    });

    testWidgets(
      'TripMapHero renders via FakeMapGateway with markers and routes',
      (tester) async {
        await tester.pumpWidget(
          ProviderScope(
            overrides: [
              mapGatewayProvider.overrideWithValue(const FakeMapGateway()),
            ],
            child: const MaterialApp(
              home: Scaffold(body: TripMapHero(trip: sampleTrip, height: 220)),
            ),
          ),
        );
        await tester.pump();

        expect(find.byKey(const Key('fake_map_canvas')), findsOneWidget);
        expect(find.byKey(const Key('map_marker_s1')), findsOneWidget);
        expect(find.byKey(const Key('map_marker_s2')), findsOneWidget);
        expect(find.byKey(const Key('map_marker_s3')), findsOneWidget);
        expect(find.byKey(const Key('map_route_route_main')), findsOneWidget);
      },
    );

    testWidgets('DeferredTripMapHero defers map mount and transitions photo', (
      tester,
    ) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            mapGatewayProvider.overrideWithValue(const FakeMapGateway()),
          ],
          child: const MaterialApp(
            home: Scaffold(
              body: DeferredTripMapHero(trip: sampleTrip, height: 220),
            ),
          ),
        ),
      );

      // Initially photo hero is present and map is not mounted yet
      expect(find.byType(TripPhotoHero), findsOneWidget);
      expect(find.byKey(const Key('fake_map_canvas')), findsNothing);

      // Advance past the 300ms deferral timer
      await tester.pump(const Duration(milliseconds: 350));
      await tester.pump();

      // Now map is mounted
      expect(find.byKey(const Key('fake_map_canvas')), findsOneWidget);
    });
  });

  group('TripJourneyMap', () {
    testWidgets('shows empty state when no expenses have locations', (
      tester,
    ) async {
      await tester.pumpWidget(
        const ProviderScope(
          child: MaterialApp(
            home: Scaffold(
              body: TripJourneyMap(
                expenses: [],
                categories: [],
                baseCurrency: 'INR',
              ),
            ),
          ),
        ),
      );

      expect(find.text('No geotagged expenses yet'), findsOneWidget);
    });

    testWidgets(
      'shows markers and details card when expense marker is tapped',
      (tester) async {
        const expense = Expense(
          id: 'exp_1',
          tripId: 'trip_1',
          title: 'Highway Chai & Snacks',
          amount: 240,
          currency: 'INR',
          category: 'cat_food',
          date: '2026-10-11',
          paidBy: 'm1',
          splitMode: 'equal',
          location: ExpenseLocation(
            lat: 25.8,
            lng: 91.8,
            placeName: 'Nongpoh, Meghalaya',
          ),
          createdAt: 100,
          updatedAt: 100,
        );

        const category = Category(
          id: 'cat_food',
          name: 'Food & Drinks',
          icon: '☕',
        );

        await tester.pumpWidget(
          ProviderScope(
            overrides: [
              mapGatewayProvider.overrideWithValue(const FakeMapGateway()),
            ],
            child: const MaterialApp(
              home: Scaffold(
                body: TripJourneyMap(
                  expenses: [expense],
                  categories: [category],
                  baseCurrency: 'INR',
                ),
              ),
            ),
          ),
        );
        await tester.pump();

        expect(find.byKey(const Key('map_marker_exp_1')), findsOneWidget);

        // Tap marker to reveal details card
        await tester.tap(find.byKey(const Key('map_marker_exp_1')));
        await tester.pump();

        expect(find.text('Highway Chai & Snacks'), findsOneWidget);
        expect(find.text('Nongpoh, Meghalaya'), findsOneWidget);
        expect(find.text('₹240.00'), findsOneWidget);
      },
    );
  });

  group('TripRouteModal', () {
    testWidgets(
      'displays stops, supports reordering and saving to repository',
      (tester) async {
        final fakeRepo = _FakeTripRepo();

        await tester.pumpWidget(
          ProviderScope(
            overrides: [
              tripRepositoryProvider.overrideWithValue(fakeRepo),
              mapGatewayProvider.overrideWithValue(const FakeMapGateway()),
            ],
            child: const MaterialApp(
              home: Scaffold(body: TripRouteModal(trip: sampleTrip)),
            ),
          ),
        );
        await tester.pump();

        // Displays all 3 stops
        expect(find.text('Guwahati'), findsOneWidget);
        expect(find.text('Shillong'), findsOneWidget);
        expect(find.text('Tawang'), findsOneWidget);

        // Reorder: Move Shillong Up (above Guwahati)
        final moveUpButtons = find.byTooltip('Move Up');
        expect(moveUpButtons, findsWidgets);
        await tester.tap(moveUpButtons.first);
        await tester.pump();

        // Delete the last stop (Tawang)
        final removeButtons = find.byTooltip('Remove Stop');
        await tester.tap(removeButtons.last);
        await tester.pump();
        expect(find.text('Tawang'), findsNothing);

        // Tap Save
        await tester.tap(find.text('Save'));
        await tester.pumpAndSettle();

        expect(fakeRepo.lastSavedStops, isNotNull);
        expect(fakeRepo.lastSavedStops!.length, 2);
        expect(fakeRepo.lastSavedStops!.first.name, 'Shillong');
        expect(fakeRepo.lastSavedStops!.last.name, 'Guwahati');
      },
    );
  });
}
