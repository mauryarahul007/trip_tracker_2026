import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:trip_tracker/features/trip_details/domain/trip_tabs.dart';
import 'package:trip_tracker/shared/theme/app_theme.dart';
import 'package:trip_tracker/shared/theme/app_tokens.dart';
import 'package:trip_tracker/shared/theme/compass.dart';
import 'package:trip_tracker/shared/widgets/app_bottom_nav.dart';
import 'package:trip_tracker/shared/widgets/compass_cover.dart';
import 'package:trip_tracker/shared/widgets/day_header.dart';

Widget host(Widget child, {ThemeData? theme}) => MaterialApp(
  theme: theme ?? AppTheme.light(),
  home: Scaffold(body: child),
);

void main() {
  group('Compass tab lists (flag enableCompassNav)', () {
    test('dock is Balances, Spend, Activity, Trip: Chat is not repeated there', () {
      expect(compassDockTabs(), [TripNavTab.ledger, TripNavTab.expenses, TripNavTab.activity, TripNavTab.hub]);
      expect(compassDockTabs(), isNot(contains(TripNavTab.chat)));
    });

    test('pager keeps People and Notes as pages so old links still open them', () {
      final pages = compassPagerTabs(chatEnabled: true, showNotesTab: true);
      expect(pages, containsAll([TripNavTab.members, TripNavTab.notes, TripNavTab.hub, TripNavTab.chat]));
      expect(compassPagerTabs(chatEnabled: false, showNotesTab: true), isNot(contains(TripNavTab.chat)));
      expect(compassPagerTabs(chatEnabled: true, showNotesTab: false), isNot(contains(TripNavTab.notes)));
    });

    test('Chat, People and Notes light up the Trip dock item; others map to themselves', () {
      expect(compassDockTabFor(TripNavTab.chat), TripNavTab.hub);
      expect(compassDockTabFor(TripNavTab.members), TripNavTab.hub);
      expect(compassDockTabFor(TripNavTab.notes), TripNavTab.hub);
      expect(compassDockTabFor(TripNavTab.expenses), TripNavTab.expenses);
    });

    test('legacy tab list never contains the hub', () {
      expect(visibleTripTabs(isChatFirstNav: true, showNotesTab: true), isNot(contains(TripNavTab.hub)));
    });
  });

  group('Compass dock', () {
    const items = [
      AppNavItem(icon: Icons.receipt_long_rounded, label: 'Spend'),
      AppNavItem(icon: Icons.swap_horiz_rounded, label: 'Balances'),
      AppNavItem(icon: Icons.chat_bubble_outline_rounded, label: 'Activity'),
      AppNavItem(icon: Icons.explore_outlined, label: 'Trip'),
    ];

    testWidgets('shows every label, keeps item indexes and fires the centre Add', (tester) async {
      var tapped = -1;
      var added = 0;
      await tester.pumpWidget(
        host(
          Align(
            alignment: Alignment.bottomCenter,
            child: AppBottomNav(
              compass: true,
              items: items,
              currentIndex: 0,
              onTap: (i) => tapped = i,
              centerAction: () => added++,
              centerLabel: 'Add expense',
            ),
          ),
        ),
      );
      for (final l in ['Spend', 'Balances', 'Activity', 'Trip']) {
        expect(find.text(l), findsOneWidget);
      }
      await tester.tap(find.byKey(const Key('dock-center')));
      expect(added, 1);
      await tester.tap(find.text('Trip'));
      expect(tapped, 3);
      await tester.tap(find.text('Balances'));
      expect(tapped, 1);
    });

    testWidgets('as a Scaffold bottom bar it stays dock-sized and leaves the body its height', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.light(),
          home: Scaffold(
            body: const SizedBox.expand(key: Key('body')),
            bottomNavigationBar: AppBottomNav(compass: true, items: items, currentIndex: 0, onTap: (_) {}),
          ),
        ),
      );
      expect(tester.getSize(find.byKey(const Key('compass-dock'))).height, lessThan(120));
      expect(tester.getSize(find.byKey(const Key('body'))).height, greaterThan(400));
    });

    testWidgets('renders in dark mode without overflow', (tester) async {
      await tester.pumpWidget(
        host(
          Align(
            alignment: Alignment.bottomCenter,
            child: AppBottomNav(compass: true, items: items, currentIndex: 3, onTap: (_) {}, centerAction: () {}),
          ),
          theme: AppTheme.dark(),
        ),
      );
      expect(tester.takeException(), isNull);
      expect(find.byKey(const Key('compass-dock')), findsOneWidget);
    });
  });

  group('Compass foundations', () {
    testWidgets('sun action colour differs between light and dark and keeps contrast', (tester) async {
      late AppTokens light;
      late AppTokens dark;
      await tester.pumpWidget(
        host(
          Builder(
            builder: (c) {
              light = c.tokens;
              return const SizedBox();
            },
          ),
        ),
      );
      await tester.pumpWidget(
        host(
          Builder(
            builder: (c) {
              dark = c.tokens;
              return const SizedBox();
            },
          ),
          theme: AppTheme.dark(),
        ),
      );
      await tester.pumpAndSettle(); // the theme change animates
      expect(light.sun, isNot(dark.sun));
      double ratio(Color a, Color b) {
        final la = a.computeLuminance(), lb = b.computeLuminance();
        return (la > lb ? la + 0.05 : lb + 0.05) / (la > lb ? lb + 0.05 : la + 0.05);
      }

      expect(ratio(light.sun, light.onSun), greaterThanOrEqualTo(4.5));
      expect(ratio(dark.sun, dark.onSun), greaterThanOrEqualTo(4.5));
    });

    testWidgets('DayHeader and CompassCover render', (tester) async {
      await tester.pumpWidget(
        host(
          const Column(
            children: [
              DayHeader(label: 'Today · Fri 14 Nov', total: '₹12,940'),
              CompassCover(child: Text('Goa Weekend')),
            ],
          ),
        ),
      );
      expect(find.text('Today · Fri 14 Nov'), findsOneWidget);
      expect(find.text('Goa Weekend'), findsOneWidget);
    });
  });
}
