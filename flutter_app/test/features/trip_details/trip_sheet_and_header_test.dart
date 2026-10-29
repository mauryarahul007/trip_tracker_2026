import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:trip_tracker/domain/models/trip.dart';
import 'package:trip_tracker/features/trip_details/presentation/widgets/trip_content_sheet.dart';
import 'package:trip_tracker/features/trip_details/presentation/widgets/trip_dashboard_header.dart';

import '../../support/pump_app.dart';
import '../../support/seed.dart';

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
    testApp('renders expanded state at progress 0.0 with title, status, and actions', (tester) async {
      await pumpApp(tester, user: asha);
      final progressNotifier = ValueNotifier<double>(0.0);
      var backPressed = false;
      var morePressed = false;

      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: containerOf(tester),
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

    testApp('squeezes at progress 1.0 without removing any action buttons or title', (tester) async {
      await pumpApp(tester, user: asha);
      final progressNotifier = ValueNotifier<double>(1.0);
      var morePressed = false;

      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: containerOf(tester),
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

      // Metadata row is collapsed
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

      // Initially at collapsed state (progress = 0.0)
      expect(progressNotifier.value, 0.0);
      expect(find.text('Sheet Content Body'), findsOneWidget);
      expect(find.byKey(const Key('trip_content_sheet_drag_handle')), findsOneWidget);

      // Tap on drag handle toggles to full screen
      await tester.tap(find.byKey(const Key('trip_content_sheet_drag_handle')));
      await tester.pumpAndSettle();

      // Expanded to full screen (progress = 1.0, isFull = true)
      expect(progressNotifier.value, 1.0);
      expect(isFullState, isTrue);

      // Tap again toggles back to collapsed
      await tester.tap(find.byKey(const Key('trip_content_sheet_drag_handle')));
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
              child: const Text('Sheet Drag Target'),
            ),
          ),
        ),
      );

      expect(progressNotifier.value, 0.0);

      // Perform a gentle upward drag of 50px (enough to exceed 8% threshold from 50vh)
      final handle = find.byKey(const Key('trip_content_sheet_drag_handle'));
      await tester.drag(handle, const Offset(0, -50));
      await tester.pumpAndSettle();

      // Drawer must immediately snap fully open
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
              child: ListView.builder(
                itemCount: 50,
                itemBuilder: (context, index) => ListTile(title: Text('Item $index')),
              ),
            ),
          ),
        ),
      );

      expect(progressNotifier.value, 0.0);

      // Dragging on the list scroll area upward pulls the drawer up
      await tester.drag(find.text('Item 2'), const Offset(0, -60));
      await tester.pumpAndSettle();

      // Drawer must snap fully open
      expect(progressNotifier.value, 1.0);
    });
  });
}
