import 'package:flutter_test/flutter_test.dart';
import 'package:trip_tracker/domain/logic/achievements_service.dart';
import 'package:trip_tracker/domain/models/category.dart';
import 'package:trip_tracker/domain/models/expense.dart';
import 'package:trip_tracker/domain/models/member.dart';
import 'package:trip_tracker/domain/models/trip.dart';

Expense _createExpense({
  required String id,
  required String title,
  required double amount,
  required String category,
  String? receiptImage,
}) {
  return Expense(
    id: id,
    tripId: 't-1',
    title: title,
    amount: amount,
    currency: 'INR',
    category: category,
    date: '2026-08-20',
    paidBy: 'm-1',
    splitMode: 'equal',
    splitMemberIds: const ['m-1'],
    resolvedShares: {'m-1': amount},
    isSettlement: false,
    receiptImage: receiptImage,
    createdAt: 1000,
    updatedAt: 1000,
  );
}

void main() {
  group('achievements_service', () {
    const mockTrip = Trip(
      id: 't-1',
      name: 'Goa Trip',
      startDate: '2026-08-20',
      endDate: '2026-08-25',
      baseCurrency: 'INR',
      memberIds: ['m1', 'm2', 'm3'],
      groupIds: [],
      ownerId: 'u1',
      joinCode: 'GOA26',
      createdAt: 1000,
      updatedAt: 1000,
    );

    const mockMembers = [
      Member(id: 'm1', tripId: 't-1', name: 'Rahul'),
      Member(id: 'm2', tripId: 't-1', name: 'Priya'),
      Member(id: 'm3', tripId: 't-1', name: 'Amit'),
    ];

    const mockCategories = [
      Category(id: 'cat-food', name: 'Food & Dining', icon: '🍕', isCustom: false),
      Category(id: 'cat-travel', name: 'Travel & Cab', icon: '🚗', isCustom: false),
      Category(id: 'cat-cafe', name: 'Cafe & Snacks', icon: '☕', isCustom: false),
    ];

    test('unlocks Squad Power badge for 3+ members', () {
      final badges = calculateTripAchievements(mockTrip, const [], mockMembers, mockCategories, false);
      final squadBadge = badges.firstWhere((b) => b.id == 'squad_harmony');
      expect(squadBadge.unlocked, true);
      expect(squadBadge.progressText, '3 Squad Members');
    });

    test('unlocks Lightning Settlement badge when trip is fully settled', () {
      final expenses = [_createExpense(id: 'e-1', title: 'Dinner', amount: 2000, category: 'cat-food')];

      final badges = calculateTripAchievements(mockTrip, expenses, mockMembers, mockCategories, true);
      final settleBadge = badges.firstWhere((b) => b.id == 'lightning_settle');
      expect(settleBadge.unlocked, true);
      expect(settleBadge.progressText, 'All Squared ✓');
    });

    test('unlocks Caffeine Logistics badge with 3+ coffee/cafe stops', () {
      final expenses = [
        _createExpense(id: 'e-1', title: 'Morning Coffee', amount: 300, category: 'cat-cafe'),
        _createExpense(id: 'e-2', title: 'Cafe Latte', amount: 400, category: 'cat-food'),
        _createExpense(id: 'e-3', title: 'Masala Chai', amount: 150, category: 'cat-food'),
      ];

      final badges = calculateTripAchievements(mockTrip, expenses, mockMembers, mockCategories, false);
      final coffeeBadge = badges.firstWhere((b) => b.id == 'caffeine');
      expect(coffeeBadge.unlocked, true);
      expect(coffeeBadge.progressText, '3/3 Stops');
    });

    test('unlocks Midnight Odyssey with 2+ night outings', () {
      final expenses = [
        _createExpense(id: 'e-1', title: 'Midnight Snack', amount: 300, category: 'cat-food'),
        _createExpense(id: 'e-2', title: 'Bar & Drinks', amount: 2000, category: 'cat-food'),
      ];

      final badges = calculateTripAchievements(mockTrip, expenses, mockMembers, mockCategories, false);
      final nightBadge = badges.firstWhere((b) => b.id == 'midnight');
      expect(nightBadge.unlocked, true);
      expect(nightBadge.progressText, '2/2 Night Outings');
    });

    test('unlocks Executive Gourmet when food spend is >= 35% of total', () {
      final expenses = [
        _createExpense(id: 'e-1', title: 'Seafood Feast', amount: 5000, category: 'cat-food'),
        _createExpense(id: 'e-2', title: 'Rental Car', amount: 5000, category: 'cat-travel'),
      ]; // Food is 50%

      final badges = calculateTripAchievements(mockTrip, expenses, mockMembers, mockCategories, false);
      final foodBadge = badges.firstWhere((b) => b.id == 'executive_gourmet');
      expect(foodBadge.unlocked, true);
      expect(foodBadge.progressText, '50% Food Spend');
    });

    test('unlocks Visual Chronicler when receipts are attached', () {
      final expenses = [
        _createExpense(
          id: 'e-1',
          title: 'Hotel',
          amount: 4000,
          category: 'cat-travel',
          receiptImage: 'https://img.com/rec.jpg',
        ),
      ];

      final badges = calculateTripAchievements(mockTrip, expenses, mockMembers, mockCategories, false);
      final photoBadge = badges.firstWhere((b) => b.id == 'visual_chronicler');
      expect(photoBadge.unlocked, true);
      expect(photoBadge.progressText, '1 Captured');
    });
  });
}
