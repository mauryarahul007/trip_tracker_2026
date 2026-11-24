import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:trip_tracker/core/clock.dart';
import 'package:trip_tracker/domain/logic/predictive_expenses.dart';
import 'package:trip_tracker/domain/models/expense.dart';

import '../support/pump_app.dart';
import '../support/seed.dart';

Finder key(String k) => find.byKey(Key(k));

Expense ex(String title, {String category = 'cat-other', String date = '2026-10-03', int hour = 9}) => Expense(
  id: title,
  tripId: 't',
  title: title,
  amount: 100,
  currency: 'INR',
  category: category,
  splitMode: 'equal',
  createdAt: DateTime(2026, 10, 3, hour).millisecondsSinceEpoch,
  updatedAt: 0,
  paidBy: 'me',
  splitMemberIds: const ['me'],
  resolvedShares: const {'me': 100},
  date: date,
);

Future<void> openSpend(WidgetTester tester, Seed s) async {
  await settle(tester);
  GoRouter.of(tester.element(find.byType(Scaffold).first)).go('/trip/${s.tripId}/expenses');
  await settle(tester, rounds: 14);
}

void main() {
  group('meal slot logic', () {
    test('breakfast from 10 AM, lunch from 3 PM, dinner from 8 PM, nothing before 10', () {
      expect(mealSlotAt(DateTime(2026, 10, 3, 9, 59)), isNull);
      expect(mealSlotAt(DateTime(2026, 10, 3, 10)), MealSlot.breakfast);
      expect(mealSlotAt(DateTime(2026, 10, 3, 14, 59)), MealSlot.breakfast);
      expect(mealSlotAt(DateTime(2026, 10, 3, 15)), MealSlot.lunch);
      expect(mealSlotAt(DateTime(2026, 10, 3, 20)), MealSlot.dinner);
      expect(mealSlotAt(DateTime(2026, 10, 3, 23, 59)), MealSlot.dinner);
    });

    test('a meal counts as logged by its title or by a food expense in its hours, today only', () {
      final now = DateTime(2026, 10, 3, 10, 30);
      bool food(String c) => c == 'cat-food';
      expect(mealLogged(MealSlot.breakfast, [], now, food), isFalse);
      expect(mealLogged(MealSlot.breakfast, [ex('Breakfast at the shack')], now, food), isTrue);
      expect(mealLogged(MealSlot.breakfast, [ex('Idli', category: 'cat-food', hour: 8)], now, food), isTrue);
      expect(mealLogged(MealSlot.breakfast, [ex('Idli', category: 'cat-food', hour: 13)], now, food), isFalse);
      expect(mealLogged(MealSlot.breakfast, [ex('Breakfast', date: '2026-10-02')], now, food), isFalse);
      expect(mealLogged(MealSlot.lunch, [ex('Taxi')], now, food), isFalse);
    });
  });

  group('Spend meal nudge (flag enableMealNudges)', () {
    final morning = nowProvider.overrideWithValue(() => DateTime(2026, 10, 3, 10, 30));

    testApp('asks about breakfast during the trip; Add opens a Breakfast expense', (tester) async {
      await pumpApp(tester, user: asha, flagsOn: {'enableMealNudges'}, overrides: [morning]);
      final s = await seedTrip(tester); // 1-9 Oct: happening on the 3rd
      await openSpend(tester, s);
      expect(key('meal-nudge'), findsOneWidget);
      expect(find.text('Added breakfast?'), findsOneWidget);
      await tester.tap(key('meal-nudge-add'));
      await settle(tester, rounds: 10);
      expect(find.widgetWithText(TextField, 'Breakfast'), findsOneWidget);
    });

    testApp('Not today hides it and is remembered on the device', (tester) async {
      final app = await pumpApp(tester, user: asha, flagsOn: {'enableMealNudges'}, overrides: [morning]);
      final s = await seedTrip(tester);
      await openSpend(tester, s);
      await tester.tap(key('meal-nudge-dismiss'));
      await settle(tester);
      expect(key('meal-nudge'), findsNothing);
      expect(app.prefs.getBool('meal.nudge.${s.tripId}.2026-10-3.breakfast'), isTrue);
    });

    testApp('no card once breakfast is logged today', (tester) async {
      await pumpApp(tester, user: asha, flagsOn: {'enableMealNudges'}, overrides: [morning]);
      final s = await seedTrip(tester);
      await addExpense(tester, s, title: 'Breakfast', date: '2026-10-03');
      await openSpend(tester, s);
      expect(key('meal-nudge'), findsNothing);
    });

    testApp('flag off: no card', (tester) async {
      await pumpApp(tester, user: asha, overrides: [morning]);
      final s = await seedTrip(tester);
      await openSpend(tester, s);
      expect(key('meal-nudge'), findsNothing);
    });
  });
}
