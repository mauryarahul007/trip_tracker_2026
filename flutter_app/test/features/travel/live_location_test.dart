import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:trip_tracker/core/platform/location_gateway.dart';
import 'package:trip_tracker/core/platform/map_gateway.dart';
import 'package:trip_tracker/data/repositories/supabase_location_share_repository.dart';
import 'package:trip_tracker/domain/logic/travel_status_service.dart';
import 'package:trip_tracker/domain/models/location_share.dart';
import 'package:trip_tracker/domain/models/member.dart';
import 'package:trip_tracker/features/travel/application/live_location_service.dart';
import 'package:trip_tracker/features/travel/presentation/live_location_chat_banner.dart';
import 'package:trip_tracker/features/travel/presentation/live_location_share_modal.dart';
import 'package:trip_tracker/features/travel/presentation/live_screen.dart';
import 'package:trip_tracker/features/travel/presentation/live_travel_status_modal.dart';

void main() {
  group('LocationShare Models', () {
    test('MyLocationShare handles expiry calculation correctly', () {
      final activeShare = MyLocationShare(
        isSharing: true,
        shareToken: 'token1',
        expiresAt: DateTime.now().add(const Duration(hours: 5)).toIso8601String(),
      );
      expect(activeShare.isExpired, isFalse);
      expect(activeShare.isActive, isTrue);

      final expiredShare = MyLocationShare(
        isSharing: true,
        shareToken: 'token2',
        expiresAt: DateTime.now().subtract(const Duration(hours: 1)).toIso8601String(),
      );
      expect(expiredShare.isExpired, isTrue);
      expect(expiredShare.isActive, isFalse);
    });

    test('SharedLocation handles json serialization and expiry', () {
      final json = {
        'member_name': 'Rahul',
        'trip_name': 'Goa Vacation',
        'lat': 15.2993,
        'lng': 74.1240,
        'updated_at': DateTime.now().toIso8601String(),
        'expires_at': DateTime.now().add(const Duration(hours: 2)).toIso8601String(),
      };
      final loc = SharedLocation.fromJson(json);
      expect(loc.memberName, 'Rahul');
      expect(loc.tripName, 'Goa Vacation');
      expect(loc.lat, 15.2993);
      expect(loc.lng, 74.1240);
      expect(loc.isExpired, isFalse);
    });
  });

  group('LiveLocationService Heartbeat', () {
    test('starts and stops heartbeat cleanly', () async {
      final fakeGateway = FakeLocationGateway();
      final fakeRepo = FakeLocationShareRepository();
      final service = LiveLocationService(
        locationGateway: fakeGateway,
        locationShareRepository: fakeRepo,
      );

      expect(service.isHeartbeatActive, isFalse);
      expect(service.activeTripId, isNull);

      service.startHeartbeat('trip_123');
      expect(service.isHeartbeatActive, isTrue);
      expect(service.activeTripId, 'trip_123');

      await service.tick();

      service.stopHeartbeat('trip_123');
      expect(service.isHeartbeatActive, isFalse);
      expect(service.activeTripId, isNull);
      service.dispose();
    });
  });

  group('LiveScreen Widget', () {
    testWidgets('renders active shared location with map and pulse status', (tester) async {
      final fakeRepo = FakeLocationShareRepository();
      fakeRepo.publicShares['valid_token'] = SharedLocation(
        memberName: 'Priya',
        tripName: 'Himachal Trek',
        lat: 32.2432,
        lng: 77.1892,
        updatedAt: DateTime.now().toIso8601String(),
        expiresAt: DateTime.now().add(const Duration(hours: 10)).toIso8601String(),
      );

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            locationShareRepositoryProvider.overrideWithValue(fakeRepo),
            mapGatewayProvider.overrideWithValue(const FakeMapGateway()),
          ],
          child: const MaterialApp(
            home: LiveScreen(token: 'valid_token'),
          ),
        ),
      );

      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));
      expect(find.textContaining('Priya · Himachal Trek'), findsOneWidget);
      expect(find.text('LIVE'), findsOneWidget);
      expect(find.byKey(const Key('fake_map_canvas')), findsOneWidget);
      expect(find.textContaining('32.2432°'), findsOneWidget);
    });

    testWidgets('renders ended state when token is invalid or expired', (tester) async {
      final fakeRepo = FakeLocationShareRepository();

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            locationShareRepositoryProvider.overrideWithValue(fakeRepo),
            mapGatewayProvider.overrideWithValue(const FakeMapGateway()),
          ],
          child: const MaterialApp(
            home: LiveScreen(token: 'non_existent_token'),
          ),
        ),
      );

      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));
      expect(find.text('Live Location Ended'), findsOneWidget);
      expect(find.text('Back to Trips'), findsOneWidget);
    });
  });

  group('LiveLocationShareModal Widget', () {
    testWidgets('starts sharing live location and stops sharing', (tester) async {
      final fakeRepo = FakeLocationShareRepository();
      final fakeGateway = FakeLocationGateway();

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            locationShareRepositoryProvider.overrideWithValue(fakeRepo),
            locationGatewayProvider.overrideWithValue(fakeGateway),
            mapGatewayProvider.overrideWithValue(const FakeMapGateway()),
          ],
          child: const MaterialApp(
            home: Scaffold(
              body: LiveLocationShareModal(
                tripId: 'trip_1',
                memberId: 'm1',
                userId: 'u1',
              ),
            ),
          ),
        ),
      );

      await tester.pumpAndSettle();
      expect(find.text('Live Location Sharing'), findsOneWidget);
      expect(find.text('Start Sharing Live Location'), findsOneWidget);

      // Tap Start Sharing
      await tester.tap(find.text('Start Sharing Live Location'));
      for (var i = 0; i < 10; i++) {
        await tester.pump(const Duration(milliseconds: 50));
      }

      expect(find.text('YOU ARE CURRENTLY SHARING'), findsOneWidget);
      expect(find.text('Stop Sharing Location'), findsOneWidget);
      expect(find.text('Copy Link'), findsOneWidget);

      // Tap Stop Sharing
      await tester.tap(find.text('Stop Sharing Location'));
      for (var i = 0; i < 10; i++) {
        await tester.pump(const Duration(milliseconds: 50));
      }

      expect(find.text('Start Sharing Live Location'), findsOneWidget);
    });
  });

  group('LiveLocationChatBanner Widget', () {
    testWidgets('renders active sharing members and toggles mini-map preview', (tester) async {
      final fakeRepo = FakeLocationShareRepository();
      fakeRepo.activeShares.add(
        TripActiveShare(
          memberId: 'm1',
          lat: 15.2993,
          lng: 74.1240,
          updatedAt: DateTime.now().toIso8601String(),
        ),
      );

      const members = [
        Member(id: 'm1', tripId: 't1', name: 'Asha'),
        Member(id: 'm2', tripId: 't1', name: 'Rohan'),
      ];

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            locationShareRepositoryProvider.overrideWithValue(fakeRepo),
            mapGatewayProvider.overrideWithValue(const FakeMapGateway()),
          ],
          child: const MaterialApp(
            home: Scaffold(
              body: LiveLocationChatBanner(
                tripId: 't1',
                members: members,
              ),
            ),
          ),
        ),
      );

      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));
      expect(find.text('1 member sharing live location'), findsOneWidget);
      expect(find.text('Asha'), findsOneWidget);

      // Tap member chip to expand mini-map
      await tester.tap(find.text('Asha'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      expect(find.byKey(const Key('fake_map_canvas')), findsOneWidget);
    });
  });

  group('LiveTravelStatusModal Widget', () {
    testWidgets('renders flight status portal links and details', (tester) async {
      const flightInfo = FlightStatusInfo(
        carrierCode: '6E',
        flightNumber: '537',
        airlineName: 'IndiGo',
        fullFlightCode: '6E-537',
        googleStatusUrl: 'https://google.com/search?q=6E-537',
        flightradar24Url: 'https://flightradar24.com/data/flights/6e537',
        flightAwareUrl: 'https://flightaware.com/live/flight/IGO537',
        origin: 'BLR',
        destination: 'HYD',
      );

      await tester.pumpWidget(
        const ProviderScope(
          child: MaterialApp(
            home: Scaffold(
              body: LiveTravelStatusModal(statusInfo: flightInfo),
            ),
          ),
        ),
      );

      await tester.pumpAndSettle();
      expect(find.text('Live Flight Status'), findsOneWidget);
      expect(find.text('6E-537'), findsOneWidget);
      expect(find.text('IndiGo'), findsOneWidget);
      expect(find.text('BLR'), findsOneWidget);
      expect(find.text('HYD'), findsOneWidget);
      expect(find.text('Google Flight Status'), findsOneWidget);
      expect(find.text('Flightradar24'), findsOneWidget);
      expect(find.text('FlightAware'), findsOneWidget);
    });

    testWidgets('renders train status portal links and PNR details', (tester) async {
      const trainInfo = TrainStatusInfo(
        pnr: '2345678901',
        trainNumber: '12002',
        trainName: 'Bhopal Shatabdi',
        confirmTktUrl: 'https://confirmtkt.com/pnr-status/2345678901',
        railYatriUrl: 'https://railyatri.in/pnr-status/2345678901',
        googleLiveTrainUrl: 'https://google.com/search?q=12002+train',
        origin: 'NDLS',
        destination: 'BPL',
      );

      await tester.pumpWidget(
        const ProviderScope(
          child: MaterialApp(
            home: Scaffold(
              body: LiveTravelStatusModal(statusInfo: trainInfo),
            ),
          ),
        ),
      );

      await tester.pumpAndSettle();
      expect(find.text('Live Train & PNR Tracker'), findsOneWidget);
      expect(find.text('Bhopal Shatabdi'), findsOneWidget);
      expect(find.text('Train #12002'), findsOneWidget);
      expect(find.text('PNR: 2345678901'), findsOneWidget);
      expect(find.text('ConfirmTkt PNR Status'), findsOneWidget);
      expect(find.text('RailYatri Live Running Status'), findsOneWidget);
    });
  });
}
