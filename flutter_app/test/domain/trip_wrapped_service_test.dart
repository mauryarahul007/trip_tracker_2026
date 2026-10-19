import 'package:flutter_test/flutter_test.dart';
import 'package:trip_tracker/domain/logic/trip_wrapped_service.dart';
import 'package:trip_tracker/domain/models/category.dart';
import 'package:trip_tracker/domain/models/expense.dart';
import 'package:trip_tracker/domain/models/member.dart';
import 'package:trip_tracker/domain/models/trip.dart';

Expense _createExpense({
  required String id,
  required String title,
  required double amount,
  required String paidBy,
  required String category,
  required String date,
}) {
  return Expense(
    id: id,
    tripId: 't-1',
    title: title,
    amount: amount,
    currency: 'INR',
    category: category,
    date: date,
    paidBy: paidBy,
    splitMode: 'equal',
    splitMemberIds: const ['m-1', 'm-2'],
    resolvedShares: {'m-1': amount / 2, 'm-2': amount / 2},
    isSettlement: false,
    createdAt: 1000,
    updatedAt: 1000,
  );
}

void main() {
  group('trip_wrapped_service', () {
    const mockCategories = [
      Category(id: 'cat-food', name: 'Food & Dining', icon: '🍔', isCustom: false),
      Category(id: 'cat-hotel', name: 'Hotels & Stay', icon: '🏨', isCustom: false),
      Category(id: 'cat-transit', name: 'Travel & Transport', icon: '✈️', isCustom: false),
    ];

    const mockMembers = [
      Member(id: 'm-1', tripId: 't-1', name: 'Rahul'),
      Member(id: 'm-2', tripId: 't-1', name: 'Priya'),
      Member(id: 'm-3', tripId: 't-1', name: 'Amit'),
    ];

    const mockTrip = Trip(
      id: 't-1',
      name: 'Goa Holiday',
      destination: 'Goa',
      startDate: '2026-08-20',
      endDate: '2026-08-25',
      baseCurrency: 'INR',
      memberIds: ['m-1', 'm-2', 'm-3'],
      groupIds: [],
      ownerId: 'u-1',
      joinCode: 'GOA123',
      createdAt: 1000,
      updatedAt: 1000,
    );

    test('returns Clean Slate Odyssey when there are no expenses', () {
      final archetype = getTripArchetype(mockCategories, const []);
      expect(archetype.title, 'The Clean Slate Odyssey');
      expect(archetype.icon, '✨');
      expect(archetype.tag, 'NEW HORIZONS');
    });

    test('determines Gourmet Pilgrimage archetype when Food is top spend', () {
      final expenses = [
        _createExpense(
          id: 'e-1',
          title: 'Beach Dinner',
          amount: 5000,
          paidBy: 'm-1',
          category: 'cat-food',
          date: '2026-08-21',
        ),
        _createExpense(
          id: 'e-2',
          title: 'Lunch',
          amount: 3000,
          paidBy: 'm-2',
          category: 'cat-food',
          date: '2026-08-22',
        ),
        _createExpense(
          id: 'e-3',
          title: 'Taxi',
          amount: 1500,
          paidBy: 'm-3',
          category: 'cat-transit',
          date: '2026-08-21',
        ),
      ];

      final archetype = getTripArchetype(mockCategories, expenses);
      expect(archetype.title, 'The Gourmet Pilgrimage');
      expect(archetype.icon, '🍕');
      expect(archetype.tag, 'FOODIE PARADISE');
    });

    test('assigns member superlatives without including raw financial currency values', () {
      final expenses = [
        _createExpense(
          id: 'e-1',
          title: 'Beach Dinner',
          amount: 5000,
          paidBy: 'm-1',
          category: 'cat-food',
          date: '2026-08-21',
        ),
        _createExpense(
          id: 'e-2',
          title: 'Breakfast',
          amount: 1000,
          paidBy: 'm-1',
          category: 'cat-food',
          date: '2026-08-22',
        ),
        _createExpense(
          id: 'e-3',
          title: 'Flight',
          amount: 8000,
          paidBy: 'm-3',
          category: 'cat-transit',
          date: '2026-08-20',
        ),
      ];

      final superlatives = getMemberSuperlatives(mockMembers, expenses, mockCategories);
      expect(superlatives.isNotEmpty, true);

      // Rahul has most count (2 expenses) -> Chief Quartermaster
      expect(superlatives.firstWhere((s) => s.memberName == 'Rahul').title, 'Chief Quartermaster');
      // Amit paid for transit -> Transit Navigator
      expect(superlatives.firstWhere((s) => s.memberName == 'Amit').title, 'Transit Navigator');

      // Verify no rupee or dollar signs in descriptions
      for (final s in superlatives) {
        expect(s.note, isNot(contains('₹')));
        expect(s.note, isNot(contains(r'$')));
      }
    });

    test('calculates trip rhythm and peak adventure day cleanly', () {
      final expenses = [
        _createExpense(
          id: 'e-1',
          title: 'Beach Party',
          amount: 2000,
          paidBy: 'm-1',
          category: 'cat-food',
          date: '2026-08-22',
        ), // Saturday
        _createExpense(
          id: 'e-2',
          title: 'Scuba',
          amount: 4000,
          paidBy: 'm-2',
          category: 'cat-transit',
          date: '2026-08-22',
        ), // Saturday
      ];

      final rhythm = getTripRhythm(expenses, mockTrip);
      expect(rhythm.peakDay, 'Saturday');
      expect(rhythm.vibeTag, contains('GOA'));
      expect(rhythm.pace, 'Scenic, Unrushed & Relaxed');
    });

    test('handles multiple tied peak adventure days dynamically', () {
      final expenses = [
        _createExpense(
          id: 'e-1',
          title: 'Sightseeing',
          amount: 2000,
          paidBy: 'm-1',
          category: 'cat-food',
          date: '2026-08-19',
        ), // Wednesday
        _createExpense(
          id: 'e-2',
          title: 'Trek',
          amount: 4000,
          paidBy: 'm-2',
          category: 'cat-transit',
          date: '2026-08-20',
        ), // Thursday
      ];

      final rhythm = getTripRhythm(expenses, mockTrip);
      expect(rhythm.peakDay, 'Wednesday & Thursday');
    });

    test('computes member spend leaderboard sorted descending', () {
      final expenses = [
        _createExpense(
          id: 'e-1',
          title: 'Dinner',
          amount: 5000,
          paidBy: 'm-1',
          category: 'cat-food',
          date: '2026-08-21',
        ),
        _createExpense(
          id: 'e-2',
          title: 'Tickets',
          amount: 8000,
          paidBy: 'm-3',
          category: 'cat-transit',
          date: '2026-08-22',
        ),
      ];

      final leaderboard = getMemberSpendLeaderboard(mockMembers, expenses);
      expect(leaderboard.length, 2);
      expect(leaderboard[0].memberName, 'Amit');
      expect(leaderboard[0].amount, 8000.0);
      expect(leaderboard[1].memberName, 'Rahul');
      expect(leaderboard[1].amount, 5000.0);
    });
  });
}
