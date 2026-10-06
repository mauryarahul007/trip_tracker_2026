import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:trip_tracker/main.dart';

void main() {
  testWidgets('TripTrackerApp launches and mounts root navigation', (
    tester,
  ) async {
    await tester.pumpWidget(const ProviderScope(child: TripTrackerApp()));

    await tester.pumpAndSettle();

    // Verify root screen title and core elements render
    expect(find.text('My Trips'), findsOneWidget);
    expect(find.text('New Trip'), findsOneWidget);
  });
}
