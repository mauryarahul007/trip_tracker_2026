import 'package:flutter/material.dart';
import 'package:trip_tracker/core/platform/haptics.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:trip_tracker/core/platform/external_launcher.dart';
import 'package:trip_tracker/core/storage/prefs.dart';
import 'package:trip_tracker/data/providers.dart';
import 'package:trip_tracker/domain/models/travel_pass.dart';
import 'package:trip_tracker/domain/models/trip.dart';
import 'package:trip_tracker/features/expenses/presentation/widgets/upi_payment_sheet.dart';
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
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
  );
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('UpiPaymentSheet Widget Tests', () {
    late SharedPreferences prefs;

    setUp(() async {
      SharedPreferences.setMockInitialValues({});
      prefs = await SharedPreferences.getInstance();
      AppHaptics.enabled = false; // no platform-channel handler here: the haptic await would never complete
    });

    tearDown(() => AppHaptics.enabled = true);

    testWidgets('renders UPI settlement sheet with amount, app grid and dynamic QR toggle', (tester) async {
      bool settledConfirmed = false;

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            sharedPreferencesProvider.overrideWithValue(prefs),
            externalLauncherProvider.overrideWithValue((uri) async => true),
          ],
          child: MaterialApp(
            home: Scaffold(
              body: UpiPaymentSheet(
                fromName: 'Rahul',
                toName: 'Sneha',
                toMemberId: 'm-2',
                initialUpiId: 'sneha@okhdfcbank',
                amount: 1450.0,
                currency: 'INR',
                tripName: 'Goa Coastal Odyssey',
                onConfirmSettled: () async {
                  settledConfirmed = true;
                },
              ),
            ),
          ),
        ),
      );

      await tester.pump();

      // Header and amount display
      expect(find.byKey(const Key('upi-payment-sheet')), findsOneWidget);
      expect(find.text('1-TAP UPI SETTLEMENT'), findsOneWidget);
      expect(find.text('Pay Sneha'), findsOneWidget);
      expect(find.text('₹1450.00'), findsOneWidget);
      expect(find.text('From Rahul to Sneha'), findsOneWidget);

      // UPI ID input with initial value
      expect(find.byKey(const Key('upi-id-input')), findsOneWidget);
      expect(find.text('sneha@okhdfcbank'), findsOneWidget);

      // App buttons grid
      expect(find.byKey(const Key('upi-app-gpay')), findsOneWidget);
      expect(find.byKey(const Key('upi-app-phonepe')), findsOneWidget);
      expect(find.byKey(const Key('upi-app-paytm')), findsOneWidget);
      expect(find.byKey(const Key('upi-app-cred')), findsOneWidget);
      expect(find.byKey(const Key('upi-app-generic')), findsOneWidget);

      // Dynamic QR Code Toggle
      expect(find.byKey(const Key('upi-toggle-qr-btn')), findsOneWidget);
      expect(find.byKey(const Key('upi-qr-card')), findsNothing);

      // Tap to show Dynamic QR code
      await tester.tap(find.byKey(const Key('upi-toggle-qr-btn')));
      await tester.pump();
      expect(find.byKey(const Key('upi-qr-card')), findsOneWidget);
      expect(find.text('Scan with any UPI app to pay'), findsOneWidget);

      // Tap app button to launch
      await tester.ensureVisible(find.byKey(const Key('upi-app-gpay')));
      await tester.tap(find.byKey(const Key('upi-app-gpay')));
      await tester.pump();

      // Tap Mark as Settled
      await tester.ensureVisible(find.byKey(const Key('upi-confirm-settled-btn')));
      await tester.tap(find.byKey(const Key('upi-confirm-settled-btn')));
      await tester.pumpAndSettle(); // haptics and saving the UPI id are async before the callback fires
      expect(settledConfirmed, isTrue);
    });
  });

  group('NextUpTravelCapsule Layover Buffer Tests', () {
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

    test('calculates tight layover connection warning between Leg 1 and Leg 2', () {
      // Leg 1: 08:00 to 10:00 (arriving at DEL)
      final leg1 = _makePass(
        id: 'leg-1',
        title: 'IndiGo 6E 101',
        type: 'flight',
        origin: 'BOM',
        destination: 'DEL',
        startDateTime: '2026-11-10T08:00:00',
        endDateTime: '2026-11-10T10:00:00',
      );
      // Leg 2: 11:15 to 13:30 (departing from DEL) -> 1h 15m layover at DEL (tight)
      final leg2 = _makePass(
        id: 'leg-2',
        title: 'Air India AI 821',
        type: 'flight',
        origin: 'DEL',
        destination: 'IXL',
        startDateTime: '2026-11-10T11:15:00',
        endDateTime: '2026-11-10T13:30:00',
      );

      // At 10:15 (Leg 1 arrived 15m ago, Leg 2 in 1h):
      final now = DateTime(2026, 11, 10, 10, 15);
      final target = evaluateImminentPass([leg1, leg2], now);

      expect(target, isNotNull);
      expect(target!.pass.id, 'leg-2');
      expect(target.layoverInfo, isNotNull);
      expect(target.layoverInfo, contains('Tight Connection'));
      expect(target.layoverInfo, contains('1h 15m'));
      expect(target.layoverInfo, contains('DEL'));
    });

    testWidgets('renders layover badge in NextUpTravelCapsule UI', (tester) async {
      final now = DateTime.now();
      final leg1 = _makePass(
        id: 'leg-1',
        title: 'IndiGo 6E 101',
        type: 'flight',
        origin: 'BOM',
        destination: 'DEL',
        startDateTime: now.subtract(const Duration(hours: 1)).toIso8601String(),
        endDateTime: now.subtract(const Duration(minutes: 15)).toIso8601String(),
      );
      final leg2 = _makePass(
        id: 'leg-2',
        title: 'Air India AI 821',
        type: 'flight',
        origin: 'DEL',
        destination: 'IXL',
        startDateTime: now.add(const Duration(minutes: 45)).toIso8601String(),
        endDateTime: now.add(const Duration(hours: 2)).toIso8601String(),
      );

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            flagsRepositoryProvider.overrideWithValue(FakeFlags({'enableNextUpCapsule'}, {})),
          ],
          child: MaterialApp(
            home: Scaffold(
              body: NextUpTravelCapsule(trip: sampleTrip, passes: [leg1, leg2]),
            ),
          ),
        ),
      );

      await tester.pump();
      expect(find.byKey(const Key('next-up-capsule')), findsOneWidget);
      expect(find.byKey(const Key('next-up-layover-badge')), findsOneWidget);
      expect(find.textContaining('Tight Connection'), findsOneWidget);
    });
  });
}
