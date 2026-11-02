import 'package:animated_notch_bottom_bar/animated_notch_bottom_bar/animated_notch_bottom_bar.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:trip_tracker/shared/theme/app_theme.dart';
import 'package:trip_tracker/shared/widgets/app_bottom_nav.dart';

const items = [
  AppNavItem(icon: Icons.swap_horiz_rounded, label: 'Balances'),
  AppNavItem(icon: Icons.receipt_long_outlined, selectedIcon: Icons.receipt_long_rounded, label: 'Spend'),
  AppNavItem(
    icon: Icons.notifications_none_rounded,
    selectedIcon: Icons.notifications_rounded,
    label: 'Activity',
    count: 120,
  ),
  AppNavItem(icon: Icons.chat_bubble_outline_rounded, label: 'Chat', badge: true),
  AppNavItem(icon: Icons.grid_view_rounded, label: 'Hub'),
];

Widget host(Widget child, {double textScale = 1}) => MaterialApp(
  theme: AppTheme.light(calm: true),
  home: MediaQuery(
    data: MediaQueryData(size: const Size(400, 800), textScaler: TextScaler.linear(textScale)),
    child: Scaffold(
      body: Align(alignment: Alignment.bottomCenter, child: child),
    ),
  ),
);

void main() {
  group('notch bar', () {
    testWidgets('is used when asked for, with the dock key kept for tests and tooling', (tester) async {
      await tester.pumpWidget(host(AppBottomNav(notch: true, items: items, currentIndex: 0, onTap: (_) {})));
      expect(find.byType(AnimatedNotchBottomBar), findsOneWidget);
      expect(find.byKey(const Key('calm-dock')), findsOneWidget);
    });

    testWidgets('falls back to the regular dock for a centre action off the Calm theme, or for too many items', (
      tester,
    ) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.light(calm: false),
          home: Scaffold(
            body: AppBottomNav(
              notch: true,
              items: items.sublist(0, 4),
              currentIndex: 0,
              onTap: (_) {},
              centerAction: () {},
            ),
          ),
        ),
      );
      expect(find.byType(AnimatedNotchBottomBar), findsNothing);
      expect(find.byKey(const Key('dock-center')), findsOneWidget);

      await tester.pumpWidget(
        host(AppBottomNav(notch: true, items: [...items, items.first], currentIndex: 0, onTap: (_) {})),
      );
      expect(find.byType(AnimatedNotchBottomBar), findsNothing);
    });

    testWidgets('as a Scaffold bottom bar it stays dock-sized and sits at the bottom', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.light(calm: true),
          home: Scaffold(
            body: const SizedBox.expand(key: Key('body')),
            bottomNavigationBar: AppBottomNav(notch: true, items: items, currentIndex: 0, onTap: (_) {}),
          ),
        ),
      );
      final dock = tester.getRect(find.byKey(const Key('calm-dock')));
      expect(dock.height, lessThan(120));
      expect(tester.getSize(find.byKey(const Key('body'))).height, greaterThan(400));
      expect(dock.bottom, greaterThan(tester.view.physicalSize.height / tester.view.devicePixelRatio - 40));
    });

    testWidgets('tapping another tab reports its index', (tester) async {
      var tapped = -1;
      await tester.pumpWidget(host(AppBottomNav(notch: true, items: items, currentIndex: 0, onTap: (i) => tapped = i)));
      await tester.tap(find.text('Chat'));
      await tester.pumpAndSettle();
      expect(tapped, 3);
    });

    testWidgets('follows the selection when the router moves it (e.g. a tab swipe)', (tester) async {
      var current = 0;
      late StateSetter set;
      await tester.pumpWidget(
        host(
          StatefulBuilder(
            builder: (context, setState) {
              set = setState;
              return AppBottomNav(notch: true, items: items, currentIndex: current, onTap: (_) {});
            },
          ),
        ),
      );
      expect(find.byIcon(Icons.swap_horiz_rounded), findsOneWidget);
      set(() => current = 1);
      await tester.pumpAndSettle();
      // The bubble now holds the filled Spend icon; Balances is back to its idle icon.
      expect(find.byIcon(Icons.receipt_long_rounded), findsOneWidget);
      expect(find.byIcon(Icons.receipt_long_outlined), findsNothing);
    });

    testWidgets('keeps the unread number and dot, and a button label on every tab for screen readers', (tester) async {
      final handle = tester.ensureSemantics();
      await tester.pumpWidget(host(AppBottomNav(notch: true, items: items, currentIndex: 0, onTap: (_) {})));
      expect(find.text('99+'), findsOneWidget);
      expect(find.byType(Badge), findsNWidgets(2));
      for (final label in ['Balances', 'Spend', 'Activity', 'Chat', 'Hub']) {
        expect(find.bySemanticsLabel(RegExp(label)), findsWidgets, reason: label);
      }
      handle.dispose();
    });

    testWidgets('does not overflow at 200% text size', (tester) async {
      await tester.pumpWidget(
        host(AppBottomNav(notch: true, items: items, currentIndex: 2, onTap: (_) {}), textScale: 2),
      );
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
    });
  });
}
