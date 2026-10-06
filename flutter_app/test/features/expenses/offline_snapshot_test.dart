import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:trip_tracker/domain/logic/offline_snapshot_service.dart';
import 'package:trip_tracker/domain/models/expense.dart';
import 'package:trip_tracker/domain/models/member.dart';
import 'package:trip_tracker/domain/models/trip.dart';
import 'package:trip_tracker/features/expenses/presentation/offline_snapshot_modal.dart';

void main() {
  group('OfflineSnapshotService Logic', () {
    const trip = Trip(
      id: 't-1',
      ownerId: 'u-1',
      name: 'Goa Holiday 2026',
      startDate: '2026-11-01',
      endDate: '2026-11-05',
      baseCurrency: 'INR',
      joinCode: 'GOA2026',
      createdAt: 1700000000000,
      updatedAt: 1700000000000,
    );

    const members = [
      Member(id: 'm-1', name: 'Alice'),
      Member(id: 'm-2', name: 'Bob'),
    ];

    const List<Expense> expenses = [
      Expense(
        id: 'e-1',
        tripId: 't-1',
        title: 'Dinner',
        amount: 1500.0,
        currency: 'INR',
        category: 'food',
        date: '2026-11-01',
        paidBy: 'm-1',
        splitMode: 'equal',
        splitMemberIds: ['m-1', 'm-2'],
        createdAt: 1700000000000,
        updatedAt: 1700000000000,
      ),
      Expense(
        id: 'e-2',
        tripId: 't-1',
        title: 'Cab ride',
        amount: 800.0,
        currency: 'INR',
        category: 'transport',
        date: '2026-11-02',
        paidBy: 'm-2',
        splitMode: 'equal',
        splitMemberIds: ['m-1', 'm-2'],
        createdAt: 1700000000000,
        updatedAt: 1700000000000,
      ),
    ];

    test('getSnapshotFilename sanitizes trip title and formats date correctly', () {
      final filename = getSnapshotFilename('Goa Holiday 2026 & Friends', DateTime(2026, 11, 10));
      expect(filename, equals('triptracker-goa-holiday-2026---friends-2026-11-10.triptracker'));
    });

    test('exportOfflineSnapshot generates structured bundle with manifest', () {
      final exportedJson = exportOfflineSnapshot(
        trip: trip,
        members: members,
        expenses: expenses,
        exportedAt: DateTime(2026, 11, 10, 12, 0),
      );

      final result = validateOfflineSnapshot(exportedJson);
      expect(result.valid, isTrue);
      expect(result.primaryTripName, equals('Goa Holiday 2026'));
      expect(result.tripCount, equals(1));
      expect(result.expenseCount, equals(2));
      expect(result.totalSpend, equals(2300.0));
      expect(result.manifest?.version, equals('3.3.0'));
      expect(result.manifest?.type, equals('single_trip_snapshot'));
    });

    test('validateOfflineSnapshot catches malformed or empty payloads', () {
      expect(validateOfflineSnapshot('').valid, isFalse);
      expect(validateOfflineSnapshot('{ invalid json }').valid, isFalse);
      expect(validateOfflineSnapshot('[]').valid, isFalse);
      expect(validateOfflineSnapshot('{"trips": []}').valid, isFalse);
    });
  });

  group('OfflineSnapshotModal Widget', () {
    testWidgets('allows pasting valid snapshot and reveals preview card', (tester) async {
      const validJson = '''
{
  "manifest": {
    "version": "3.3.0",
    "exportedAt": "2026-11-10T12:00:00Z",
    "appName": "Trip Tracker 2026",
    "tripCount": 1,
    "type": "single_trip_snapshot"
  },
  "trips": [
    {
      "id": "t-demo",
      "name": "Manali Trek",
      "startDate": "2026-12-01",
      "endDate": "2026-12-05",
      "baseCurrency": "INR"
    }
  ],
  "members": [],
  "expenses": [
    {
      "id": "e-1",
      "tripId": "t-demo",
      "title": "Hotel Stay",
      "amount": 4500.0,
      "currency": "INR",
      "category": "stay",
      "date": "2026-12-01",
      "paidBy": "m-1",
      "splitMemberIds": []
    }
  ]
}
''';

      await tester.pumpWidget(
        const ProviderScope(
          child: MaterialApp(
            home: Scaffold(
              body: OfflineSnapshotModal(tripId: 't-demo'),
            ),
          ),
        ),
      );

      await tester.pump();

      expect(find.text('Offline Snapshot (.triptracker)'), findsOneWidget);
      expect(find.byKey(const Key('btn_export_snapshot')), findsOneWidget);
      expect(find.byKey(const Key('btn_choose_snapshot_file')), findsOneWidget);

      // Enter valid JSON into text field
      await tester.enterText(find.byKey(const Key('snapshot_paste_input')), validJson);
      await tester.pump();

      // Tap inspect button
      await tester.tap(find.byKey(const Key('btn_parse_pasted_snapshot')));
      await tester.pump();

      expect(find.byKey(const Key('snapshot_preview_card')), findsOneWidget);
      expect(find.text('Manali Trek'), findsOneWidget);
      expect(find.text('1 expenses · Total: 4500.00'), findsOneWidget);
      expect(find.byKey(const Key('btn_confirm_import_snapshot')), findsOneWidget);
    });
  });
}
