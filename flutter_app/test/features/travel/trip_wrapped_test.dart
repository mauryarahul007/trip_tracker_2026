import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:trip_tracker/core/platform/share_service.dart';
import 'package:trip_tracker/domain/models/category.dart';
import 'package:trip_tracker/domain/models/expense.dart';
import 'package:trip_tracker/domain/models/member.dart';
import 'package:trip_tracker/domain/models/trip.dart';
import 'package:trip_tracker/features/expenses/application/expenses_providers.dart';
import 'package:trip_tracker/features/travel/presentation/trip_wrapped_modal.dart';
import 'package:trip_tracker/features/trip_details/application/trip_nav.dart';

class _FakeShareService extends ShareService {
  String? sharedText;
  String? sharedSubject;
  String? sharedPngName;

  @override
  Future<void> copy(String text) async {}

  @override
  Future<void> share(String text, {String? subject}) async {
    sharedText = text;
    sharedSubject = subject;
  }

  @override
  Future<void> sharePng(List<int> bytes, {required String fileName, String? text}) async {
    sharedPngName = fileName;
    sharedText = text;
  }
}

void main() {
  group('TripWrappedModal Widget', () {
    const mockTrip = Trip(
      id: 't-wrapped',
      name: 'Goa Odyssey 2026',
      destination: 'Goa',
      startDate: '2026-08-10',
      endDate: '2026-08-15',
      baseCurrency: 'INR',
      closed: true,
      memberIds: ['m-1', 'm-2'],
      groupIds: [],
      ownerId: 'u-1',
      joinCode: 'GOA26',
      createdAt: 1000,
      updatedAt: 1000,
    );

    const mockMembers = [
      Member(id: 'm-1', tripId: 't-wrapped', name: 'Rahul'),
      Member(id: 'm-2', tripId: 't-wrapped', name: 'Priya'),
    ];

    const mockCategories = [
      Category(id: 'cat-food', name: 'Food & Dining', icon: '🍔', isCustom: false),
      Category(id: 'cat-stay', name: 'Hotels & Stay', icon: '🏨', isCustom: false),
    ];

    const mockExpenses = [
      Expense(
        id: 'e-1',
        tripId: 't-wrapped',
        title: 'Seafood Banquet',
        amount: 4500.0,
        currency: 'INR',
        category: 'cat-food',
        date: '2026-08-11',
        paidBy: 'm-1',
        splitMode: 'equal',
        splitMemberIds: ['m-1', 'm-2'],
        resolvedShares: {'m-1': 2250, 'm-2': 2250},
        createdAt: 1000,
        updatedAt: 1000,
      ),
      Expense(
        id: 'e-2',
        tripId: 't-wrapped',
        title: 'Villa Stay',
        amount: 8000.0,
        currency: 'INR',
        category: 'cat-stay',
        date: '2026-08-12',
        paidBy: 'm-2',
        splitMode: 'equal',
        splitMemberIds: ['m-1', 'm-2'],
        resolvedShares: {'m-1': 4000, 'm-2': 4000},
        createdAt: 1000,
        updatedAt: 1000,
      ),
    ];

    testWidgets('renders welcome slide with customs stamp, navigates slides, and shares', (tester) async {
      final fakeShare = _FakeShareService();

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            tripProvider('t-wrapped').overrideWith((ref) => Stream.value(mockTrip)),
            tripExpensesProvider('t-wrapped').overrideWith((ref) => Stream.value(mockExpenses)),
            tripMembersProvider('t-wrapped').overrideWith((ref) => Stream.value(mockMembers)),
            tripCategoriesProvider('t-wrapped').overrideWithValue(mockCategories),
            shareServiceProvider.overrideWithValue(fakeShare),
          ],
          child: const MaterialApp(
            home: Scaffold(body: TripWrappedModal(tripId: 't-wrapped')),
          ),
        ),
      );

      await tester.pumpAndSettle();

      // Check Header & Slide 1 elements
      expect(find.text('TRIP WRAPPED'), findsOneWidget);
      expect(find.text('Goa Odyssey 2026'), findsOneWidget);
      expect(find.text('1 / 5'), findsOneWidget);
      expect(find.text('Next Chapter ➔'), findsOneWidget);

      // Verify theme mode switcher buttons
      expect(find.text('Night'), findsOneWidget);
      expect(find.text('Day'), findsOneWidget);
      await tester.tap(find.text('Day'));
      await tester.pumpAndSettle();

      // Tap Next to navigate to Slide 2 (Vibe Identity)
      await tester.tap(find.byKey(const Key('wrapped-next-action')));
      await tester.pumpAndSettle();
      expect(find.text('2 / 5'), findsOneWidget);

      // Tap Next to navigate to Slide 3 (Squad Superlatives)
      await tester.tap(find.byKey(const Key('wrapped-next-action')));
      await tester.pumpAndSettle();
      expect(find.text('3 / 5'), findsOneWidget);
      expect(find.text('SQUAD SUPERLATIVES'), findsOneWidget);

      // Verify Back button works
      expect(find.byKey(const Key('wrapped-prev')), findsOneWidget);
      await tester.tap(find.byKey(const Key('wrapped-prev')));
      await tester.pumpAndSettle();
      expect(find.text('2 / 5'), findsOneWidget);

      // Move forward to slide 3, 4, 5
      await tester.tap(find.byKey(const Key('wrapped-next-action')));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('wrapped-next-action')));
      await tester.pumpAndSettle();
      expect(find.text('4 / 5'), findsOneWidget);
      expect(find.text('EXPEDITION RHYTHM'), findsOneWidget);

      await tester.tap(find.byKey(const Key('wrapped-next-action')));
      await tester.pumpAndSettle();
      expect(find.text('5 / 5'), findsOneWidget);
      expect(find.text('Share Wrapped 📤'), findsOneWidget);

      // Tap Share
      await tester.runAsync(() async {
        await tester.tap(find.byKey(const Key('wrapped-next-action')));
        await Future<void>.delayed(const Duration(milliseconds: 150));
      });
      await tester.pumpAndSettle();

      expect(fakeShare.sharedPngName, 'Goa-Odyssey-2026-wrapped.png');
      expect(fakeShare.sharedText, contains('Goa Odyssey 2026 Trip Wrapped story'));
    });
  });
}
