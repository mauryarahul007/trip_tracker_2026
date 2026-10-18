import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:trip_tracker/data/providers.dart';
import 'package:trip_tracker/features/trips/presentation/widgets/trip_row.dart';

import '../../support/pump_app.dart';
import '../../support/seed.dart';

Finder key(String k) => find.byKey(Key(k));

Future<void> home(WidgetTester tester) async {
  GoRouter.of(tester.element(find.byType(Scaffold).first)).go('/');
  await settle(tester, rounds: 12);
}

void main() {
  testApp('trip card shows member avatars and your money position', (tester) async {
    await pumpApp(tester, user: asha);
    final s = await seedTrip(tester);
    await addExpense(tester, s, amount: 90); // Asha paid for three: she is owed 60
    await home(tester);
    expect(key('trip-avatars'), findsOneWidget);
    expect(
      tester.widget<Text>(find.descendant(of: key('trip-money'), matching: find.byType(Text))).data,
      "You're owed ₹60.00",
    );
  });

  testApp('trip card money and avatars are gone with the flag off', (tester) async {
    await pumpApp(tester, user: asha, flagsOff: {'enableTripListMoney'});
    final s = await seedTrip(tester);
    await addExpense(tester, s, amount: 90);
    await home(tester);
    expect(key('trip-avatars'), findsNothing);
    expect(key('trip-money'), findsNothing);
  });

  testApp('trips are grouped under a section header; a one-time swipe tip can be dismissed for good', (tester) async {
    final app = await pumpApp(tester, user: asha);
    await seedTrip(tester);
    await home(tester);
    expect(find.byWidgetPredicate((w) => w.key.toString().contains("'trip-section-")), findsOneWidget);
    expect(key('hint-trips-swipe'), findsOneWidget);
    await tester.tap(key('hint-dismiss-trips-swipe'));
    await settle(tester, rounds: 4);
    expect(key('hint-trips-swipe'), findsNothing);
    expect(app.prefs.getBool('hint.trips-swipe'), isTrue);
  });

  testApp('sections and tips are absent with their flags off', (tester) async {
    await pumpApp(tester, user: asha, flagsOff: {'enableTripListSections', 'enableCoachHints'});
    await seedTrip(tester);
    await home(tester);
    expect(find.byWidgetPredicate((w) => w.key.toString().contains("'trip-section-")), findsNothing);
    expect(key('hint-trips-swipe'), findsNothing);
  });

  String ymd(DateTime d) => d.toIso8601String().substring(0, 10);

  Future<String> tripOn(WidgetTester tester, String name, int startOffset, int endOffset) {
    final now = DateTime.now();
    return real(
      tester,
      () => containerOf(tester)
          .read(tripRepositoryProvider)
          .createTrip(
            name: name,
            startDate: ymd(now.add(Duration(days: startOffset))),
            endDate: ymd(now.add(Duration(days: endOffset))),
            baseCurrency: 'INR',
            ownerId: 'u1',
            creatorName: 'Asha',
          ),
    );
  }

  testApp('overview line sums your position across trips and opens balances; off with its flag', (tester) async {
    await pumpApp(tester, user: asha);
    final s = await seedTrip(tester);
    await addExpense(tester, s, amount: 90);
    await home(tester);
    expect(
      tester.widget<Text>(find.descendant(of: key('trips-overview'), matching: find.byType(Text)).first).data,
      "You're owed ₹60.00 across 1 trip",
    );
  });

  testApp('overview line is absent with its flag off', (tester) async {
    await pumpApp(tester, user: asha, flagsOff: {'enableTripsOverview'});
    await seedTrip(tester);
    await home(tester);
    expect(key('trips-overview'), findsNothing);
  });

  testApp('the trip happening now is a hero with a progress bar; others are compact rows', (tester) async {
    await pumpApp(tester, user: asha);
    final now = await tripOn(tester, 'Now Trip', -1, 3);
    final later = await tripOn(tester, 'Later Trip', 10, 14);
    await home(tester);
    expect(key('trip-row-$now'), findsOneWidget);
    expect(key('trip-row-$later'), findsOneWidget);
    expect(key('trip-progress'), findsOneWidget); // only the active trip has one
    expect(find.byWidgetPredicate((w) => w.key.toString().contains("'trip-section-HAPPENING")), findsNothing);
    expect(find.textContaining('HAPPENING NOW · 1'), findsOneWidget);
    expect(find.textContaining('UPCOMING · 1'), findsOneWidget);
  });

  testApp('the Past section folds away', (tester) async {
    await pumpApp(tester, user: asha);
    await tripOn(tester, 'Old Trip', -30, -25);
    await tripOn(tester, 'Later Trip', 10, 14);
    await home(tester);
    expect(find.text('Old Trip'), findsOneWidget);
    await tester.tap(find.textContaining('PAST · 1'));
    await settle(tester, rounds: 4);
    expect(find.text('Old Trip'), findsNothing);
    await tester.tap(find.textContaining('PAST · 1'));
    await settle(tester, rounds: 4);
    expect(find.text('Old Trip'), findsOneWidget);
  });

  testApp('photo tiles are the default; the toggle switches to compact rows and is remembered', (tester) async {
    final app = await pumpApp(tester, user: asha);
    final id = await tripOn(tester, 'Later Trip', 10, 14);
    await home(tester);
    expect(find.byType(TripTile), findsOneWidget);
    await tester.tap(key('trips-layout-toggle'));
    await settle(tester, rounds: 6);
    expect(find.byType(TripTile), findsNothing);
    expect(key('trip-row-$id'), findsOneWidget);
    expect(app.prefs.getString('trips_layout'), 'list');
  });

  testApp('the grid keeps the trip happening now as a wide hero', (tester) async {
    await pumpApp(tester, user: asha);
    await tripOn(tester, 'Now Trip', -1, 3);
    await tripOn(tester, 'Later Trip', 10, 14);
    await home(tester);
    expect(find.byType(TripHeroCard), findsOneWidget);
    expect(find.byType(TripTile), findsOneWidget);
  });

  testApp('tiles are off with their flag: only compact rows, no toggle', (tester) async {
    await pumpApp(tester, user: asha, flagsOff: {'enableTripGridTiles'});
    await tripOn(tester, 'Later Trip', 10, 14);
    await home(tester);
    expect(find.byType(TripTile), findsNothing);
    expect(key('trips-layout-toggle'), findsNothing);
  });

  testApp('search also lists expenses and notes found inside trips, and opens the right tab', (tester) async {
    await pumpApp(tester, user: asha);
    final s = await seedTrip(tester);
    await addExpense(tester, s, title: 'Moped rental', amount: 400);
    await home(tester);
    await tester.tap(key('trips-search-toggle'));
    await settle(tester, rounds: 4);
    await tester.enterText(find.byType(TextField).first, 'moped');
    await settle(tester, rounds: 6);
    expect(key('search-hits'), findsOneWidget);
    expect(find.text('Moped rental'), findsOneWidget);
    expect(find.text('No trips match your search.'), findsNothing); // the hit stands in for "no matches"
    await tester.tap(find.text('Moped rental'));
    await settle(tester, rounds: 12);
    expect(key('trip-title'), findsOneWidget); // opened the trip
  });

  testApp('search stays trip-only with its flag off', (tester) async {
    await pumpApp(tester, user: asha, flagsOff: {'enableGlobalSearch'});
    final s = await seedTrip(tester);
    await addExpense(tester, s, title: 'Moped rental', amount: 400);
    await home(tester);
    await tester.tap(key('trips-search-toggle'));
    await settle(tester, rounds: 4);
    await tester.enterText(find.byType(TextField).first, 'moped');
    await settle(tester, rounds: 6);
    expect(key('search-hits'), findsNothing);
    expect(find.text('No trips match your search.'), findsOneWidget);
  });
}
