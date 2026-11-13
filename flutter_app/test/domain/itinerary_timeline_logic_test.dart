import 'package:flutter_test/flutter_test.dart';
import 'package:trip_tracker/domain/logic/itinerary_timeline_logic.dart';
import 'package:trip_tracker/domain/models/expense.dart';
import 'package:trip_tracker/domain/models/itinerary_item.dart';
import 'package:trip_tracker/domain/models/travel_pass.dart';

void main() {
  group('itinerary_timeline_logic tests', () {
    test('formats time string into AM/PM format', () {
      expect(formatTimeDisplay('09:15'), '9:15 AM');
      expect(formatTimeDisplay('14:30'), '2:30 PM');
      expect(formatTimeDisplay('00:00'), '12:00 AM');
      expect(formatTimeDisplay('12:00'), '12:00 PM');
      expect(formatTimeDisplay(''), '');
    });

    test('generates Google Maps directions search URL', () {
      expect(
        getDirectionsUrl('Colosseum, Rome'),
        'https://www.google.com/maps/search/?api=1&query=Colosseum%2C%20Rome',
      );
      expect(getDirectionsUrl(''), '');
    });

    test('extracts date and time from TravelPass', () {
      const p1 = TravelPass(
        id: 'p1',
        tripId: 't1',
        type: 'flight',
        title: 'Flight AF123',
        startDateTime: '2026-10-12T09:30:00',
        createdAt: 1000,
        updatedAt: 1000,
      );
      final (d1, t1) = extractPassDateAndTime(p1);
      expect(d1, '2026-10-12');
      expect(t1, '09:30');

      const p2 = TravelPass(
        id: 'p2',
        tripId: 't1',
        type: 'stay',
        title: 'Rome Hotel',
        startDateTime: '2026-10-12',
        createdAt: 1000,
        updatedAt: 1000,
      );
      final (d2, t2) = extractPassDateAndTime(p2);
      expect(d2, '2026-10-12');
      expect(t2, '09:00');
    });

    test('builds chronological day-by-day itinerary groups', () {
      final activities = [
        const ItineraryItem(
          id: 'act1',
          tripId: 't1',
          date: '2026-10-12',
          time: '15:00',
          title: 'Colosseum Guided Tour',
          category: 'sightseeing',
          completed: true,
          createdAt: 1000,
          updatedAt: 1000,
        ),
        const ItineraryItem(
          id: 'act2',
          tripId: 't1',
          date: '2026-10-12',
          time: '20:00',
          title: 'Dinner at Roscioli',
          category: 'food',
          completed: false,
          createdAt: 1000,
          updatedAt: 1000,
        ),
      ];

      final passes = [
        const TravelPass(
          id: 'p1',
          tripId: 't1',
          type: 'flight',
          title: 'Flight to Rome',
          startDateTime: '2026-10-12T09:30:00',
          createdAt: 1000,
          updatedAt: 1000,
        ),
      ];

      final expenses = <Expense>[
        const Expense(
          id: 'e1',
          tripId: 't1',
          title: 'Gelato in Piazza',
          amount: 25.0,
          currency: 'EUR',
          category: 'food',
          date: '2026-10-12',
          paidBy: 'm1',
          splitMode: 'equal',
          splitMemberIds: ['m1'],
          resolvedShares: {'m1': 25.0},
          createdAt: 1000,
          updatedAt: 1000,
        ),
      ];

      final days = buildItineraryTimeline(
        tripStartDate: '2026-10-12',
        tripEndDate: '2026-10-14',
        activities: activities,
        passes: passes,
        expenses: expenses,
        todayIso: '2026-10-12',
      );

      expect(days.length, 3);
      final day1 = days[0];
      expect(day1.date, '2026-10-12');
      expect(day1.dayNumber, 1);
      expect(day1.isToday, isTrue);
      expect(day1.totalSpend, 25.0);
      expect(day1.completedActivitiesCount, 1);
      expect(day1.totalActivitiesCount, 2);

      // Order within Day 1: 09:30 Pass -> 12:00 Expense -> 15:00 Activity -> 20:00 Activity
      expect(day1.items.length, 4);
      expect(day1.items[0].kind, ItineraryItemKind.pass);
      expect(day1.items[0].time, '09:30');
      expect(day1.items[1].kind, ItineraryItemKind.expense);
      expect(day1.items[1].time, '12:00');
      expect(day1.items[2].kind, ItineraryItemKind.activity);
      expect(day1.items[2].time, '15:00');
      expect(day1.items[3].kind, ItineraryItemKind.activity);
      expect(day1.items[3].time, '20:00');
    });
  });
}
