import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:trip_tracker/data/providers.dart';
import 'package:trip_tracker/domain/models/travel_pass.dart';
import 'package:trip_tracker/domain/models/trip.dart';
import 'package:trip_tracker/features/travel/presentation/next_up_capsule.dart';

import '../../support/fakes.dart';

TravelPass _makePass({
  required String id,
  required String title,
  required String type,
  String? startDateTime,
  String? endDateTime,
  String? origin,
  String? destination,
  String? seatOrRoom,
  String? bookingId,
  String? referenceCode,
}) {
  return TravelPass(
    id: id,
    tripId: 'trip-1',
    title: title,
    type: type,
    startDateTime: startDateTime,
    endDateTime: endDateTime,
    origin: origin,
    destination: destination,
    seatOrRoom: seatOrRoom,
    bookingId: bookingId,
    referenceCode: referenceCode,
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
  );
}

void main() {
  const sampleTrip = Trip(
    id: 'trip-1',
    ownerId: 'user-1',
    name: 'Goa Coastal Odyssey',
    startDate: '2026-11-10',
    endDate: '2026-11-15',
    baseCurrency: 'INR',
    joinCode: 'GOA26',
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
  );

  group('evaluateImminentPass Logic', () {
    final fixedNow = DateTime(2026, 11, 10, 10, 0);

    test('returns null when no passes provided', () {
      expect(evaluateImminentPass([], fixedNow), isNull);
    });

    test('ignores passes far in future (>36h) or far past (<-3h)', () {
      final farFuture = _makePass(
        id: 'p-1',
        title: 'Future Flight',
        type: 'flight',
        startDateTime: fixedNow.add(const Duration(hours: 48)).toIso8601String(),
      );
      final farPast = _makePass(
        id: 'p-2',
        title: 'Past Flight',
        type: 'flight',
        startDateTime: fixedNow.subtract(const Duration(hours: 5)).toIso8601String(),
      );
      expect(evaluateImminentPass([farFuture, farPast], fixedNow), isNull);
    });

    test('categorizes boarding soon when within 90 minutes', () {
      final pass = _makePass(
        id: 'p-3',
        title: 'Indigo 6E 204',
        type: 'flight',
        startDateTime: fixedNow.add(const Duration(minutes: 45)).toIso8601String(),
        seatOrRoom: '12B',
      );
      final target = evaluateImminentPass([pass], fixedNow);
      expect(target, isNotNull);
      expect(target!.status, 'boarding-soon');
      expect(target.countdownText, 'Boarding in 45m');
    });

    test('categorizes en-route when departure has occurred within 3h', () {
      final pass = _makePass(
        id: 'p-4',
        title: 'Vistara UK 811',
        type: 'flight',
        startDateTime: fixedNow.subtract(const Duration(hours: 1)).toIso8601String(),
      );
      final target = evaluateImminentPass([pass], fixedNow);
      expect(target, isNotNull);
      expect(target!.status, 'en-route');
      expect(target.countdownText, 'En Route / Airborne');
    });

    test('categorizes upcoming with hours and minutes when 1.5h to 24h away', () {
      final pass = _makePass(
        id: 'p-5',
        title: 'Air India AI 542',
        type: 'flight',
        startDateTime: fixedNow.add(const Duration(hours: 3, minutes: 20)).toIso8601String(),
      );
      final target = evaluateImminentPass([pass], fixedNow);
      expect(target, isNotNull);
      expect(target!.status, 'upcoming');
      expect(target.countdownText, 'Departs in 3h 20m');
    });

    test('multi-leg journey: automatically advances to Leg 2 when Leg 1 completes', () {
      // Leg 1: 08:00 -> 10:00
      final leg1 = _makePass(
        id: 'leg-1',
        title: 'IndiGo 6E 101 (BOM → DEL)',
        type: 'flight',
        origin: 'BOM',
        destination: 'DEL',
        startDateTime: '2026-11-10T08:00:00',
        endDateTime: '2026-11-10T10:00:00',
      );
      // Leg 2: 12:00 -> 14:00
      final leg2 = _makePass(
        id: 'leg-2',
        title: 'Air India AI 821 (DEL → IXL)',
        type: 'flight',
        origin: 'DEL',
        destination: 'IXL',
        startDateTime: '2026-11-10T12:00:00',
        endDateTime: '2026-11-10T14:00:00',
      );

      final passes = [leg1, leg2];

      // At 07:15 (before Leg 1 departs): Leg 1 is upcoming
      final at0715 = DateTime(2026, 11, 10, 7, 15);
      final target0715 = evaluateImminentPass(passes, at0715);
      expect(target0715?.pass.id, 'leg-1');
      expect(target0715?.status, 'boarding-soon');

      // At 09:00 (Leg 1 is airborne): Leg 1 is active / en-route
      final at0900 = DateTime(2026, 11, 10, 9, 0);
      final target0900 = evaluateImminentPass(passes, at0900);
      expect(target0900?.pass.id, 'leg-1');
      expect(target0900?.status, 'en-route');

      // At 10:15 (Leg 1 finished at 10:00, Leg 2 departs at 12:00):
      // Leg 2 MUST be displayed instead of Leg 1 based on start/end timing
      final at1015 = DateTime(2026, 11, 10, 10, 15);
      final target1015 = evaluateImminentPass(passes, at1015);
      expect(target1015, isNotNull);
      expect(target1015?.pass.id, 'leg-2');
      expect(target1015?.status, 'upcoming');
      expect(target1015?.countdownText, 'Departs in 1h 45m');

      // At 11:30: Leg 2 is boarding soon
      final at1130 = DateTime(2026, 11, 10, 11, 30);
      final target1130 = evaluateImminentPass(passes, at1130);
      expect(target1130?.pass.id, 'leg-2');
      expect(target1130?.status, 'boarding-soon');
      expect(target1130?.countdownText, 'Boarding in 30m');

      // At 12:30: Leg 2 is airborne
      final at1230 = DateTime(2026, 11, 10, 12, 30);
      final target1230 = evaluateImminentPass(passes, at1230);
      expect(target1230?.pass.id, 'leg-2');
      expect(target1230?.status, 'en-route');

      // At 14:15 (Leg 2 landed at 14:00, no more legs): shows completed for Leg 2
      final at1415 = DateTime(2026, 11, 10, 14, 15);
      final target1415 = evaluateImminentPass(passes, at1415);
      expect(target1415?.pass.id, 'leg-2');
      expect(target1415?.status, 'completed');
      expect(target1415?.countdownText, 'Landed / Arrived');

      // At 18:00 (> 3h after final leg): no imminent pass
      final at1800 = DateTime(2026, 11, 10, 18, 0);
      expect(evaluateImminentPass(passes, at1800), isNull);
    });
  });

  group('NextUpTravelCapsule & PassScannerModal Widgets', () {
    testWidgets('hidden when enableNextUpCapsule flag is disabled', (tester) async {
      final imminentPass = _makePass(
        id: 'pass-now',
        title: 'Air India Express IX 123',
        type: 'flight',
        startDateTime: DateTime.now().add(const Duration(hours: 2)).toIso8601String(),
      );

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            flagsRepositoryProvider.overrideWithValue(FakeFlags({}, {'enableNextUpCapsule'})),
          ],
          child: MaterialApp(
            home: Scaffold(
              body: NextUpTravelCapsule(trip: sampleTrip, passes: [imminentPass]),
            ),
          ),
        ),
      );

      await tester.pump();
      expect(find.byKey(const Key('next-up-capsule')), findsNothing);
    });

    testWidgets('renders capsule, shows details, and opens PassScannerModal', (tester) async {
      final imminentPass = _makePass(
        id: 'pass-now',
        title: 'IndiGo 6E 532',
        type: 'flight',
        origin: 'BOM',
        destination: 'GOI',
        startDateTime: DateTime.now().add(const Duration(hours: 2)).toIso8601String(),
        seatOrRoom: '14C',
        bookingId: 'PNR8976',
        referenceCode: 'IND-6E532',
      );

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            flagsRepositoryProvider.overrideWithValue(FakeFlags({'enableNextUpCapsule', 'enableGateScanner'}, {})),
          ],
          child: MaterialApp(
            home: Scaffold(
              body: NextUpTravelCapsule(trip: sampleTrip, passes: [imminentPass]),
            ),
          ),
        ),
      );

      await tester.pump();

      // Capsule checks
      expect(find.byKey(const Key('next-up-capsule')), findsOneWidget);
      expect(find.text('NEXT UP'), findsOneWidget);
      expect(find.text('IndiGo 6E 532'), findsOneWidget);
      expect(find.text('BOM → GOI'), findsOneWidget);
      expect(find.text('14C'), findsOneWidget);
      expect(find.byKey(const Key('next-up-show-pass')), findsOneWidget);

      // Open PassScannerModal
      await tester.tap(find.byKey(const Key('next-up-show-pass')));
      await tester.pumpAndSettle();

      // Verify Scanner modal contents
      expect(find.text('BOARDING PASS SCANNER'), findsOneWidget);
      expect(find.text('IndiGo 6E 532'), findsNWidgets(2)); // in capsule + modal
      expect(find.text('SEAT: '), findsOneWidget);
      expect(find.text('BOOKING / PNR CODE'), findsOneWidget);
      expect(find.text('IND-6E532'), findsOneWidget);
      expect(find.byKey(const Key('scanner-copy')), findsOneWidget);

      // Tap Copy
      await tester.tap(find.byKey(const Key('scanner-copy')));
      await tester.pump();
      expect(find.text('Copied'), findsOneWidget);

      // Wait 2 seconds for copy notification to expire or close modal
      await tester.tap(find.byKey(const Key('scanner-done')));
      await tester.pumpAndSettle();
      expect(find.text('BOARDING PASS SCANNER'), findsNothing);
    });
  });
}
