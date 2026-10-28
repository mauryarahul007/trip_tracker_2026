import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:trip_tracker/domain/models/trip.dart';
import 'package:trip_tracker/features/trip_details/presentation/widgets/trip_content_sheet.dart';
import 'package:trip_tracker/features/trip_details/presentation/widgets/trip_dashboard_header.dart';

void main() {
  const sampleTrip = Trip(
    id: 't_sikkim',
    name: 'Sikkim Backpacking',
    startDate: '2026-11-10',
    endDate: '2026-11-20',
    baseCurrency: 'INR',
    ownerId: 'u1',
    joinCode: 'sikkim26',
    destination: 'Bagdogra -> Gangtok -> Lachung',
    stops: [],
    createdAt: 100,
    updatedAt: 100,
  );

  group('TripDashboardHeader', () {
    testWidgets('renders expanded state at progress 0.0 with title, status, and actions', (tester) async {
      final progressNotifier = ValueNotifier<double>(0.0);
      var backPressed = false;
      var morePressed = false;

      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(
            home: Scaffold(
              body: TripDashboardHeader(
                trip: sampleTrip,
                progressNotifier: progressNotifier,
                onBack: () => backPressed = true,
                tab: 'expenses',
                actions: [
                  IconButton(
                    key: const Key('header_more_test'),
                    icon: const Icon(Icons.more_vert),
                    onPressed: () => morePressed = true,
                  ),
                ],
              ),
            ),
          ),
        ),
      );

      // Verify trip name is displayed
      expect(find.text('Sikkim Backpacking'), findsOneWidget);

      // Verify status badge is displayed
      expect(find.text('Upcoming'), findsOneWidget);

      // Verify action buttons are present and clickable
      expect(find.byKey(const Key('header_more_test')), findsOneWidget);
      await tester.tap(find.byKey(const Key('header_more_test')));
      expect(morePressed, isTrue);

      // Verify back button is clickable
      await tester.tap(find.byTooltip('Back'));
      expect(backPressed, isTrue);
    });

    testWidgets('squeezes at progress 1.0 without removing any action buttons or title', (tester) async {
      final progressNotifier = ValueNotifier<double>(1.0);
      var morePressed = false;

      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(
            home: Scaffold(
              body: TripDashboardHeader(
                trip: sampleTrip,
                progressNotifier: progressNotifier,
                onBack: () {},
                tab: 'expenses',
                actions: [
                  IconButton(
                    key: const Key('header_more_test'),
                    icon: const Icon(Icons.more_vert),
                    onPressed: () => morePressed = true,
                  ),
                ],
              ),
            ),
          ),
        ),
      );

      // Title and Action buttons are still 100% accessible
      expect(find.text('Sikkim Backpacking'), findsOneWidget);
      expect(find.byKey(const Key('header_more_test')), findsOneWidget);
      await tester.tap(find.byKey(const Key('header_more_test')));
      expect(morePressed, isTrue);

      // Metadata row is collapsed (height <= 1)
      expect(find.text('Upcoming'), findsNothing);
    });
  });

  group('TripContentSheet', () {
    testWidgets('starts at collapsed fraction and expands on tap', (tester) async {
      final progressNotifier = ValueNotifier<double>(0.0);
      bool? isFullState;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: TripContentSheet(
              progressNotifier: progressNotifier,
              collapsedFraction: 0.50,
              onFullChange: (full) => isFullState = full,
              child: const Text('Sheet Content Body'),
            ),
          ),
        ),
      );

      expect(find.text('Sheet Content Body'), findsOneWidget);
      expect(progressNotifier.value, 0.0);

      // Find the drag handle bar and tap it to toggle expand
      final handle = find.byType(GestureDetector).first;
      await tester.tap(handle);
      await tester.pumpAndSettle();

      // Progress should now be 1.0 (full screen)
      expect(progressNotifier.value, 1.0);
      expect(isFullState, isTrue);

      // Tap again to collapse
      await tester.tap(handle);
      await tester.pumpAndSettle();

      expect(progressNotifier.value, 0.0);
      expect(isFullState, isFalse);
    });

    testWidgets('snaps to full screen on a single gentle upward drag on the handle', (tester) async {
      final progressNotifier = ValueNotifier<double>(0.0);

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: TripContentSheet(
              progressNotifier: progressNotifier,
              collapsedFraction: 0.50,
              child: const Text('Sheet Content Body'),
            ),
          ),
        ),
      );

      final handle = find.byType(GestureDetector).first;
      // Single gentle upward swipe of 40 pixels
      await tester.drag(handle, const Offset(0, -40));
      await tester.pumpAndSettle();

      expect(progressNotifier.value, 1.0);
    });

    testWidgets('expands to full screen when scrolling child list from collapsed state', (tester) async {
      final progressNotifier = ValueNotifier<double>(0.0);

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: TripContentSheet(
              progressNotifier: progressNotifier,
              collapsedFraction: 0.50,
              child: ListView(
                children: List.generate(20, (i) => ListTile(title: Text('Item $i'))),
              ),
            ),
          ),
        ),
      );

      expect(progressNotifier.value, 0.0);

      // Swipe up on the list item inside the sheet
      await tester.drag(find.text('Item 0'), const Offset(0, -60));
      await tester.pumpAndSettle();

      expect(progressNotifier.value, 1.0);
    });
  });
}
