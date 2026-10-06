import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:trip_tracker/domain/models/category.dart';
import 'package:trip_tracker/domain/models/expense.dart';
import 'package:trip_tracker/domain/models/member.dart';
import 'package:trip_tracker/domain/models/trip.dart';
import 'package:trip_tracker/features/expenses/application/expenses_providers.dart';
import 'package:trip_tracker/features/travel/presentation/achievement_badge_modal.dart';
import 'package:trip_tracker/features/travel/presentation/traveler_passport_modal.dart';
import 'package:trip_tracker/features/trip_details/application/trip_nav.dart';
import 'package:trip_tracker/features/trips/application/trips_providers.dart';

void main() {
  const mockTrip1 = Trip(
    id: 't-1',
    name: 'Goa Trip 2026',
    destination: 'Goa',
    startDate: '2026-08-10',
    endDate: '2026-08-14',
    baseCurrency: 'INR',
    closed: true,
    memberIds: ['m-1', 'm-2', 'm-3'],
    groupIds: [],
    ownerId: 'u-1',
    joinCode: 'GOA26',
    createdAt: 1000,
    updatedAt: 1000,
  );

  const mockTrip2 = Trip(
    id: 't-2',
    name: 'Bali Retreat',
    destination: 'Bali',
    startDate: '2026-09-01',
    endDate: '2026-09-07',
    baseCurrency: 'USD',
    closed: false,
    memberIds: ['m-1'],
    groupIds: [],
    ownerId: 'u-1',
    joinCode: 'BALI26',
    createdAt: 2000,
    updatedAt: 2000,
  );

  const mockMembers = [
    Member(id: 'm-1', tripId: 't-1', name: 'Rahul'),
    Member(id: 'm-2', tripId: 't-1', name: 'Priya'),
    Member(id: 'm-3', tripId: 't-1', name: 'Amit'),
  ];

  const mockCategories = [
    Category(id: 'cat-food', name: 'Food & Dining', icon: '🍕', isCustom: false),
    Category(id: 'cat-cafe', name: 'Cafe & Bakery', icon: '☕', isCustom: false),
  ];

  const mockExpenses = [
    Expense(
      id: 'e-1',
      tripId: 't-1',
      title: 'Morning Latte',
      amount: 250.0,
      currency: 'INR',
      category: 'cat-cafe',
      date: '2026-08-11',
      paidBy: 'm-1',
      splitMode: 'equal',
      splitMemberIds: ['m-1', 'm-2'],
      resolvedShares: {'m-1': 125, 'm-2': 125},
      createdAt: 1000,
      updatedAt: 1000,
    ),
  ];

  group('AchievementBadgeModal Widget', () {
    testWidgets('renders badges list and shows unlocked squad badges', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            tripProvider('t-1').overrideWith((ref) => Stream.value(mockTrip1)),
            tripExpensesProvider('t-1').overrideWith((ref) => Stream.value(mockExpenses)),
            tripMembersProvider('t-1').overrideWith((ref) => Stream.value(mockMembers)),
            tripCategoriesProvider('t-1').overrideWithValue(mockCategories),
          ],
          child: const MaterialApp(
            home: Scaffold(body: AchievementBadgeModal(tripId: 't-1')),
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.text('Trip Achievements'), findsOneWidget);
      expect(find.text('SQUAD MILESTONES'), findsOneWidget);
      expect(find.byKey(const Key('badge-caffeine')), findsOneWidget);
      expect(find.byKey(const Key('badge-midnight')), findsOneWidget);

      // Scroll to reveal squad_harmony
      await tester.scrollUntilVisible(find.byKey(const Key('badge-squad_harmony')), 100);
      expect(find.byKey(const Key('badge-squad_harmony')), findsOneWidget);

      // Verify Done button exists
      expect(find.byKey(const Key('achievements-done')), findsOneWidget);
      await tester.tap(find.byKey(const Key('achievements-done')));
      await tester.pumpAndSettle();
    });
  });

  group('TravelerPassportModal Widget', () {
    testWidgets('renders lifetime passport metrics and passport stamp grid', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            tripsProvider.overrideWith((ref) => Stream.value([mockTrip1, mockTrip2])),
          ],
          child: const MaterialApp(home: Scaffold(body: TravelerPassportModal())),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.text('TRAVELER PASSPORT'), findsOneWidget);
      expect(find.text('Lifetime Odyssey'), findsOneWidget);

      // Verify lifetime stats (2 trips, 2 distinct destinations, 1 settled)
      expect(find.text('Trips'), findsOneWidget);
      expect(find.text('2'), findsWidgets); // Trips count: 2, Destinations count: 2
      expect(find.text('Destinations'), findsOneWidget);
      expect(find.text('Settled'), findsOneWidget);
      expect(find.text('1'), findsOneWidget); // Settled trips: 1

      // Verify Trip stamps
      expect(find.text('Goa Trip 2026'), findsOneWidget);
      expect(find.text('Bali Retreat'), findsOneWidget);

      // Close passport button
      expect(find.byKey(const Key('passport-done')), findsOneWidget);
      await tester.tap(find.byKey(const Key('passport-done')));
      await tester.pumpAndSettle();
    });
  });
}
