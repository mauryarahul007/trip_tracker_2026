import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/misc.dart' show Override;
import 'package:flutter_test/flutter_test.dart';
import 'package:trip_tracker/data/providers.dart';
import 'package:trip_tracker/domain/models/expense.dart';
import 'package:trip_tracker/domain/models/member.dart';
import 'package:trip_tracker/domain/models/trip.dart';
import 'package:trip_tracker/features/expenses/application/expenses_providers.dart'
    show tripExpensesProvider, tripMembersProvider;
import 'package:trip_tracker/features/trips/application/trips_providers.dart';
import 'package:trip_tracker/features/trips/presentation/widgets/trip_card_stack.dart';
import 'package:trip_tracker/shared/theme/app_theme.dart';
import 'package:trip_tracker/l10n/app_localizations.dart';
import 'package:flutter_localizations/flutter_localizations.dart';

import 'package:trip_tracker/features/travel/places/weather_service.dart';

import 'package:trip_tracker/shared/widgets/app_bottom_nav.dart';

import '../../support/fakes.dart' show FakeWeather;
import '../../support/pump_app.dart';
import 'trips_screen_test.dart' show containerOf, seedTrip;

Trip trip(
  String id,
  String name, {
  String start = '2026-10-10',
  String end = '2026-10-15',
  bool archived = false,
  String? destination,
  String? cover,
}) => Trip(
  id: id,
  name: name,
  startDate: start,
  endDate: end,
  baseCurrency: 'INR',
  ownerId: 'u1',
  joinCode: 'ABC123',
  archived: archived,
  destination: destination,
  coverImageUrl: cover,
  createdAt: 1,
  updatedAt: 1,
);

final trips = [trip('a', 'Goa'), trip('b', 'Alps'), trip('c', 'Kochi', start: '2026-01-01', end: '2026-01-04')];

Future<void> pumpStack(
  WidgetTester tester, {
  List<Trip>? list,
  required ValueChanged<Trip> onOpen,
  ValueChanged<Trip>? onLongPress,
  Future<String?> Function(String destination)? resolver,
  ValueChanged<Trip>? onTop,
  WeatherService? weather,
  List<Override> extra = const [],
}) async {
  tester.view.physicalSize = const Size(430, 900);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.reset);
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        tripCoverResolverProvider.overrideWithValue(resolver ?? (_) async => null),
        weatherServiceProvider.overrideWithValue(weather ?? FakeWeather()), // no network
        ...extra,
        tripMembersProvider.overrideWith((ref, id) => Stream.value(const <Member>[])),
        tripExpensesProvider.overrideWith((ref, id) => Stream.value(const <Expense>[])),
      ],
      child: MaterialApp(
        theme: AppTheme.light(),
        localizationsDelegates: const [
          AppLocalizations.delegate,
          GlobalMaterialLocalizations.delegate,
          GlobalWidgetsLocalizations.delegate,
        ],
        supportedLocales: AppLocalizations.supportedLocales,
        home: Scaffold(
          body: TripCardStack(
            trips: list ?? trips,
            now: DateTime(2026, 10, 9),
            onOpen: onOpen,
            onLongPress: onLongPress ?? (_) {},
            onTopChanged: onTop,
          ),
        ),
      ),
    ),
  );
  await tester.pumpAndSettle();
}

/// The deck's position as announced to screen readers ("2 of 7").
String position(WidgetTester tester) => tester
    .widget<Semantics>(find.descendant(of: find.byKey(const Key('stack-dots')), matching: find.byType(Semantics)).first)
    .properties
    .label!;

Finder get top => find.byKey(const Key('stack-top'));
Finder inTop(String text) => find.descendant(of: top, matching: find.text(text));

void main() {
  group('TripCardStack', () {
    testWidgets('shows the first trip on top with its position, and the next cards behind it', (tester) async {
      await pumpStack(tester, onOpen: (_) {});
      expect(inTop('Goa'), findsOneWidget);
      expect(position(tester), '1 of 3');
      expect(find.text('Alps'), findsOneWidget); // peeking out behind
    });

    testWidgets('swipe right flips back to the previous card and never opens a trip; a tap opens', (tester) async {
      final opened = <String>[];
      await pumpStack(tester, onOpen: (t) => opened.add(t.id));
      await tester.fling(top, const Offset(400, 0), 1500);
      await tester.pumpAndSettle();
      expect(opened, isEmpty);
      expect(position(tester), '3 of 3'); // the last card came to the front
      await tester.tap(top);
      await tester.pumpAndSettle();
      expect(opened, hasLength(1));
    });

    testWidgets('swipe left sends the card to the back; after a full round it is on top again', (tester) async {
      await pumpStack(tester, onOpen: (_) {});
      await tester.fling(top, const Offset(-400, 0), 1500);
      await tester.pumpAndSettle();
      expect(inTop('Alps'), findsOneWidget);
      expect(position(tester), '2 of 3');
      await tester.fling(top, const Offset(-400, 0), 1500);
      await tester.pumpAndSettle();
      await tester.fling(top, const Offset(-400, 0), 1500);
      await tester.pumpAndSettle();
      expect(inTop('Goa'), findsOneWidget);
    });

    testWidgets('a short drag springs back instead of committing', (tester) async {
      final opened = <String>[];
      await pumpStack(tester, onOpen: (t) => opened.add(t.id));
      await tester.drag(top, const Offset(40, 0));
      await tester.pumpAndSettle();
      expect(opened, isEmpty);
      expect(inTop('Goa'), findsOneWidget);
    });

    testWidgets('a tap on the card opens it', (tester) async {
      final opened = <String>[];
      await pumpStack(tester, onOpen: (t) => opened.add(t.id));
      await tester.tap(top);
      await tester.pumpAndSettle();
      expect(opened, ['a']);
    });

    testWidgets('long press hands the top trip to the menu callback', (tester) async {
      final pressed = <String>[];
      await pumpStack(tester, onOpen: (_) {}, onLongPress: (t) => pressed.add(t.id));
      await tester.longPress(top);
      expect(pressed, ['a']);
    });

    testWidgets('a single trip cannot be skipped', (tester) async {
      final opened = <String>[];
      await pumpStack(tester, list: [trips.first], onOpen: (t) => opened.add(t.id));
      await tester.fling(top, const Offset(-400, 0), 1500);
      await tester.pumpAndSettle();
      expect(inTop('Goa'), findsOneWidget); // snapped back
      expect(opened, isEmpty);
    });

    testWidgets('trips from every state are cards: upcoming, ended and archived', (tester) async {
      final all = [
        trip('a', 'Upcoming'),
        trip('c', 'Past one', start: '2026-01-01', end: '2026-01-04'),
        trip('d', 'Archived one', archived: true),
      ];
      await pumpStack(tester, list: all, onOpen: (_) {});
      for (final name in ['Upcoming', 'Past one', 'Archived one']) {
        expect(inTop(name), findsOneWidget);
        await tester.fling(top, const Offset(-400, 0), 1500);
        await tester.pumpAndSettle();
      }
      expect(inTop('Archived'), findsNothing); // back on top: Upcoming has no archived chip
    });
  });

  group('photos', () {
    test('destination search terms: the whole text, then the first place', () {
      expect(destinationQueries('Goa'), ['Goa']);
      expect(destinationQueries('Gangtok → Lachung → Pelling'), ['Gangtok → Lachung → Pelling', 'Gangtok']);
      expect(destinationQueries('Goa, India'), ['Goa, India', 'Goa']);
      expect(destinationQueries('  '), isEmpty);
    });

    testWidgets('a card shows the destination photo and the place name from the trip', (tester) async {
      final asked = <String>[];
      await pumpStack(
        tester,
        list: [
          trip('a', 'Sikkim Bagpacking', destination: 'Gangtok → Lachung'),
          trip('b', 'Plain'),
        ],
        resolver: (q) async {
          asked.add(q);
          return q == 'Gangtok'
              ? 'https://img.test/gangtok.jpg'
              : null; // the whole text finds nothing, the first place does
        },
        onOpen: (_) {},
      );
      expect(asked, ['Gangtok → Lachung', 'Gangtok']);
      expect(find.byKey(const Key('stack-photo-a')), findsOneWidget);
      expect(find.descendant(of: top, matching: find.byKey(const Key('stack-place'))), findsOneWidget);
      expect(tester.widget<Text>(find.byKey(const Key('stack-place'))).data, 'Gangtok → Lachung');
      expect(find.byKey(const Key('stack-photo-b')), findsNothing); // no destination, no photo: tinted gradient
    });

    testWidgets("a trip's own cover wins and is never looked up", (tester) async {
      final asked = <String>[];
      await pumpStack(
        tester,
        list: [trip('a', 'Goa', destination: 'Goa', cover: 'https://img.test/own.jpg')],
        resolver: (q) async {
          asked.add(q);
          return null;
        },
        onOpen: (_) {},
      );
      expect(asked, isEmpty);
      expect(find.byKey(const Key('stack-photo-a')), findsOneWidget);
    });

    testWidgets('reports the top trip so the screen can blur its photo behind the deck', (tester) async {
      final tops = <String>[];
      await pumpStack(tester, onOpen: (_) {}, onTop: (t) => tops.add(t.id));
      expect(tops, ['a']);
      await tester.fling(top, const Offset(-400, 0), 1500);
      await tester.pumpAndSettle();
      expect(tops, ['a', 'b']);
    });
  });

  group('card details', () {
    testWidgets('status, route with the weather, dates, spend and progress are on the card', (tester) async {
      await pumpStack(
        tester,
        list: [trip('a', 'Himachal 2', start: '2026-10-08', end: '2026-10-12', destination: 'Manali -> Shimla')],
        weather: _FixedWeather(),
        extra: [tripSpentProvider('a').overrideWithValue(319120)],
        onOpen: (_) {},
      );
      expect(tester.widget<Text>(find.byKey(const Key('stack-status'))).data, 'DAY 2 OF 5'); // now = 2026-10-09
      expect(tester.widget<Text>(find.byKey(const Key('stack-place'))).data, 'Manali → Shimla');
      expect(tester.widget<Text>(find.byKey(const Key('stack-weather'))).data, '☁️ 35°C');
      expect(tester.widget<Text>(find.byKey(const Key('stack-title'))).data, 'Himachal 2');
      expect(
        tester.widget<Text>(find.byKey(const Key('stack-spent'))).data,
        contains('319,120'),
      ); // grouped by the device locale
      expect(
        tester
            .widget<LinearProgressIndicator>(
              find.descendant(of: top, matching: find.byKey(const Key('stack-progress'))),
            )
            .value,
        closeTo(0.4, 0.001),
      );
    });

    testWidgets('an ended trip is COMPLETED-style full progress and an upcoming one is empty', (tester) async {
      await pumpStack(
        tester,
        list: [
          trip('a', 'Past', start: '2026-01-01', end: '2026-01-04'),
          trip('b', 'Soon'),
        ],
        onOpen: (_) {},
      );
      expect(
        tester
            .widget<LinearProgressIndicator>(
              find.descendant(of: top, matching: find.byKey(const Key('stack-progress'))),
            )
            .value,
        1.0,
      );
      await tester.fling(top, const Offset(-400, 0), 1500);
      await tester.pumpAndSettle();
      expect(
        tester
            .widget<LinearProgressIndicator>(
              find.descendant(of: top, matching: find.byKey(const Key('stack-progress'))),
            )
            .value,
        0.0,
      );
    });
  });

  group('Trips home: list / cards switch', () {
    testApp('the toggle swaps the list for the stack, includes archived trips, and is remembered', (tester) async {
      await pumpApp(tester, user: asha);
      final c = containerOf(tester);
      await seedTrip(tester, c, 'Goa Weekend', start: '2026-12-01', end: '2026-12-04');
      final old = await seedTrip(tester, c, 'Old Trip', start: '2026-01-01', end: '2026-01-04');
      await real(tester, () => c.read(tripRepositoryProvider).setTripState(old, archived: true));
      await settle(tester);

      expect(find.byKey(const Key('trip-stack')), findsNothing); // the list is the default
      await tester.tap(find.byKey(const Key('trips-view-toggle')));
      await settle(tester);
      expect(find.byKey(const Key('trip-stack')), findsOneWidget);
      expect(position(tester), '1 of 2'); // the archived trip is in the stack too
      expect(c.read(tripsViewProvider), TripsView.cards);

      await tester.tap(find.byKey(const Key('journeys-list'))); // the stack / list pill in the Journeys header
      await settle(tester);
      expect(find.byKey(const Key('trip-stack')), findsNothing);
    });

    testApp('card view is the Journeys screen: header, counted filter pills, floating New Trip / Join, no dock', (
      tester,
    ) async {
      await pumpApp(tester, user: asha, prefsExtra: {'trips_view_mode': 'cards'});
      final c = containerOf(tester);
      await seedTrip(tester, c, 'Goa Weekend', start: '2026-12-01', end: '2026-12-04');
      await seedTrip(tester, c, 'Old Trip', start: '2026-01-01', end: '2026-01-04');
      await settle(tester);
      expect(tester.widget<Text>(find.byKey(const Key('journeys-title'))).data, 'Departures');
      expect(tester.widget<Text>(find.byKey(const Key('journeys-count'))).data, '2 TRIPS · 0 ACTIVE');
      // On a wide enough screen the four pills sit centred under the header, not against the left edge.
      tester.view.physicalSize = const Size(1000, 1400);
      await settle(tester);
      final pills = tester.getRect(find.byKey(const Key('trip-filters')));
      final first = tester.getRect(find.byKey(const Key('trip-filter-all')));
      final last = tester.getRect(find.byKey(const Key('trip-filter-past')));
      expect(((first.left - pills.left) - (pills.right - last.right)).abs(), lessThan(2.0));
      expect(find.byKey(const Key('journeys-avatar')), findsOneWidget);
      expect(find.byKey(const Key('stack-actions')), findsOneWidget);
      expect(find.byType(AppBottomNav), findsNothing);
      // 2 trips: 1 upcoming, 1 past.
      expect(find.descendant(of: find.byKey(const Key('trip-filter-all')), matching: find.text('2')), findsOneWidget);
      expect(
        find.descendant(of: find.byKey(const Key('trip-filter-upcoming')), matching: find.text('1')),
        findsOneWidget,
      );
      expect(find.descendant(of: find.byKey(const Key('trip-filter-past')), matching: find.text('1')), findsOneWidget);
      // The pill filters the deck.
      await tester.drag(find.byKey(const Key('trip-filters')), const Offset(-300, 0)); // the pill row scrolls sideways
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('trip-filter-past')));
      await settle(tester);
      expect(find.descendant(of: find.byKey(const Key('stack-top')), matching: find.text('Old Trip')), findsOneWidget);
      // Join opens the join sheet.
      await tester.tap(find.byKey(const Key('stack-join')));
      await settle(tester);
      expect(find.text('Join with a trip code'), findsOneWidget);
    });

    testApp('the runway slider: slide the plane right to start a trip, left to join, short slides roll back', (
      tester,
    ) async {
      await pumpApp(tester, user: asha, prefsExtra: {'trips_view_mode': 'cards'});
      final c = containerOf(tester);
      await seedTrip(tester, c, 'Goa Weekend', start: '2026-12-01', end: '2026-12-04');
      await settle(tester);
      final thumb = find.byKey(const Key('runway-thumb'));
      // A short slide does nothing and the plane returns to the centre line.
      await tester.drag(thumb, const Offset(40, 0));
      await settle(tester);
      expect(find.text('Join with a trip code'), findsNothing);
      expect(find.text('New Trip').evaluate().length, greaterThanOrEqualTo(1));
      // Left to the end: the join sheet.
      await tester.drag(thumb, const Offset(-400, 0));
      await settle(tester);
      expect(find.text('Join with a trip code'), findsOneWidget);
      Navigator.of(tester.element(find.text('Join with a trip code'))).pop();
      await settle(tester);
      // Right to the end: the create-trip sheet.
      await tester.drag(thumb, const Offset(400, 0));
      await settle(tester);
      expect(find.text('Create Trip'), findsWidgets); // the sheet's title and its button
    });

    testApp('a small phone (360 x 640) at 130% text shows the Journeys screen without overflow', (tester) async {
      await pumpApp(tester, user: asha, prefsExtra: {'trips_view_mode': 'cards'});
      final c = containerOf(tester);
      await seedTrip(
        tester,
        c,
        'Goa Weekend With A Rather Long Name',
        start: '2026-12-01',
        end: '2026-12-04',
        destination: 'Goa -> Gokarna -> Hampi',
      );
      tester.view.physicalSize = const Size(360, 640);
      tester.platformDispatcher.textScaleFactorTestValue = 1.3;
      addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
      await settle(tester);
      expect(tester.takeException(), isNull);
      expect(find.byKey(const Key('stack-top')), findsOneWidget);
      expect(find.byKey(const Key('stack-actions')), findsOneWidget);
    });

    testApp('the chosen view is restored from the saved setting', (tester) async {
      await pumpApp(tester, user: asha, prefsExtra: {'trips_view_mode': 'cards'});
      final c = containerOf(tester);
      await seedTrip(tester, c, 'Goa Weekend', start: '2026-12-01', end: '2026-12-04');
      await settle(tester);
      expect(find.byKey(const Key('trip-stack')), findsOneWidget);
    });

    testApp('flag off: no switch, and a saved "cards" choice is ignored', (tester) async {
      await pumpApp(tester, user: asha, flagsOff: {'enableTripCardStack'}, prefsExtra: {'trips_view_mode': 'cards'});
      final c = containerOf(tester);
      await seedTrip(tester, c, 'Goa Weekend', start: '2026-12-01', end: '2026-12-04');
      await settle(tester);
      expect(find.byKey(const Key('trips-view-toggle')), findsNothing);
      expect(find.byKey(const Key('trip-stack')), findsNothing);
      expect(find.text('Goa Weekend'), findsOneWidget); // still listed
    });

    testApp('the blurred backdrop shows the top trip photo', (tester) async {
      await pumpApp(
        tester,
        user: asha,
        prefsExtra: {'trips_view_mode': 'cards'},
        coverResolver: (d) async => d == 'Goa' ? 'https://img.test/goa.jpg' : null,
      );
      final c = containerOf(tester);
      await seedTrip(tester, c, 'Goa Weekend', start: '2026-12-01', end: '2026-12-04', destination: 'Goa');
      await settle(tester);
      await settle(tester);
      expect(find.byKey(const Key('stack-backdrop-photo')), findsOneWidget);
    });

    testApp('long-press menu: owners can archive and delete, and open', (tester) async {
      await pumpApp(tester, user: asha, prefsExtra: {'trips_view_mode': 'cards'});
      final c = containerOf(tester);
      await seedTrip(tester, c, 'Goa Weekend', start: '2026-12-01', end: '2026-12-04');
      await settle(tester);
      await tester.longPress(find.byKey(const Key('stack-top')));
      await settle(tester);
      expect(find.byKey(const Key('stack-menu-open')), findsOneWidget);
      expect(find.byKey(const Key('stack-menu-archive')), findsOneWidget);
      expect(find.byKey(const Key('stack-menu-delete')), findsOneWidget);
      await tester.tap(find.byKey(const Key('stack-menu-archive')));
      await settle(tester);
      final trip = (await real(tester, () => c.read(tripRepositoryProvider).watchTrips().first)).single;
      expect(trip.archived, isTrue);
    });
  });
}

class _FixedWeather implements WeatherService {
  @override
  Future<WeatherData?> getDestinationWeather(
    dynamic destination, {
    void Function(WeatherData fresh)? onLiveUpdate,
    bool forceRefresh = false,
  }) async => const WeatherData(
    tempC: 35,
    tempF: 95,
    weatherCode: 3,
    weatherEmoji: '☁️',
    condition: 'Overcast',
    isDay: true,
    city: 'Manali',
    updatedAt: 0,
  );
}
