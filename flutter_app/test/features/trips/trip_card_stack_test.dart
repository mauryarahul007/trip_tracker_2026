import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:trip_tracker/data/providers.dart';
import 'package:trip_tracker/domain/models/trip.dart';
import 'package:trip_tracker/features/trips/application/trips_providers.dart';
import 'package:trip_tracker/features/trips/presentation/widgets/trip_card_stack.dart';
import 'package:trip_tracker/shared/theme/app_theme.dart';
import 'package:trip_tracker/l10n/app_localizations.dart';
import 'package:flutter_localizations/flutter_localizations.dart';

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
}) async {
  tester.view.physicalSize = const Size(430, 900);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.reset);
  await tester.pumpWidget(
    ProviderScope(
      overrides: [tripCoverResolverProvider.overrideWithValue(resolver ?? (_) async => null)],
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

Finder get top => find.byKey(const Key('stack-top'));
Finder inTop(String text) => find.descendant(of: top, matching: find.text(text));

void main() {
  group('TripCardStack', () {
    testWidgets('shows the first trip on top with its position, and the next cards behind it', (tester) async {
      await pumpStack(tester, onOpen: (_) {});
      expect(inTop('Goa'), findsOneWidget);
      expect(find.text('1 of 3'), findsOneWidget);
      expect(find.text('Alps'), findsOneWidget); // peeking out behind
    });

    testWidgets('swipe right opens the trip and the card comes back', (tester) async {
      final opened = <String>[];
      await pumpStack(tester, onOpen: (t) => opened.add(t.id));
      await tester.fling(top, const Offset(400, 0), 1500);
      await tester.pumpAndSettle();
      expect(opened, ['a']);
      expect(inTop('Goa'), findsOneWidget); // back on top after the trip closes
    });

    testWidgets('swipe left sends the card to the back; after a full round it is on top again', (tester) async {
      await pumpStack(tester, onOpen: (_) {});
      await tester.fling(top, const Offset(-400, 0), 1500);
      await tester.pumpAndSettle();
      expect(inTop('Alps'), findsOneWidget);
      expect(find.text('2 of 3'), findsOneWidget);
      await tester.tap(find.byKey(const Key('stack-skip')));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('stack-skip')));
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

    testWidgets('Open and Skip buttons do what the swipes do; a tap on the card opens it', (tester) async {
      final opened = <String>[];
      await pumpStack(tester, onOpen: (t) => opened.add(t.id));
      await tester.tap(find.byKey(const Key('stack-open')));
      await tester.pumpAndSettle();
      await tester.tap(top);
      await tester.pumpAndSettle();
      expect(opened, ['a', 'a']);
      await tester.tap(find.byKey(const Key('stack-skip')));
      await tester.pumpAndSettle();
      expect(inTop('Alps'), findsOneWidget);
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
      expect(
        tester
            .widget<InkWell>(find.descendant(of: find.byKey(const Key('stack-skip')), matching: find.byType(InkWell)))
            .onTap,
        isNull,
      );
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
        await tester.tap(find.byKey(const Key('stack-skip')));
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
      await tester.tap(find.byKey(const Key('stack-skip')));
      await tester.pumpAndSettle();
      expect(tops, ['a', 'b']);
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
      expect(find.text('1 of 2'), findsOneWidget); // the archived trip is in the stack too
      expect(c.read(tripsViewProvider), TripsView.cards);

      await tester.tap(find.byKey(const Key('trips-view-toggle')));
      await settle(tester);
      expect(find.byKey(const Key('trip-stack')), findsNothing);
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
