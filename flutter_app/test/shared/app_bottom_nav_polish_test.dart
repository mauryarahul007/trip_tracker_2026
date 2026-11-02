import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:trip_tracker/features/trip_details/application/scroll_to_top.dart';
import 'package:trip_tracker/shared/theme/app_theme.dart';
import 'package:trip_tracker/shared/widgets/app_bottom_nav.dart';

Widget host(Widget child) => MaterialApp(
  theme: AppTheme.light(calm: true),
  home: Scaffold(
    body: Align(alignment: Alignment.bottomCenter, child: child),
  ),
);

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
];

void main() {
  group('polished dock (enableNavPolish)', () {
    testWidgets('slides a pill to the tapped tab and shows the filled icon', (tester) async {
      var current = 0;
      await tester.pumpWidget(
        host(
          StatefulBuilder(
            builder: (context, setState) => AppBottomNav(
              polish: true,
              items: items,
              currentIndex: current,
              onTap: (i) => setState(() => current = i),
            ),
          ),
        ),
      );
      final pill = find.byKey(const Key('dock-pill'));
      final before = tester.getCenter(pill).dx;
      expect(find.byIcon(Icons.receipt_long_outlined), findsOneWidget);

      await tester.tap(find.text('Spend'));
      await tester.pumpAndSettle();

      expect(tester.getCenter(pill).dx, greaterThan(before));
      expect(find.byIcon(Icons.receipt_long_rounded), findsOneWidget);
      expect(find.byIcon(Icons.receipt_long_outlined), findsNothing);
    });

    testWidgets('shows a capped number on counted tabs and a dot on badged tabs', (tester) async {
      await tester.pumpWidget(host(AppBottomNav(polish: true, items: items, currentIndex: 0, onTap: (_) {})));
      expect(find.text('99+'), findsOneWidget);
      expect(find.byType(Badge), findsNWidgets(2));
    });

    testWidgets('without polish there is no pill', (tester) async {
      await tester.pumpWidget(host(AppBottomNav(items: items, currentIndex: 0, onTap: (_) {})));
      expect(find.byKey(const Key('dock-pill')), findsNothing);
    });
  });

  group('scrollVisibleTabToTop', () {
    testWidgets('scrolls the on-screen list back to the top', (tester) async {
      final controller = ScrollController();
      late BuildContext ctx;
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Builder(
              builder: (context) {
                ctx = context;
                return ListView.builder(
                  controller: controller,
                  itemCount: 100,
                  itemBuilder: (_, i) => SizedBox(height: 60, child: Text('row $i')),
                );
              },
            ),
          ),
        ),
      );
      controller.jumpTo(800);
      await tester.pump();

      expect(scrollVisibleTabToTop(ctx), isTrue);
      await tester.pumpAndSettle();
      expect(controller.offset, 0);
      expect(scrollVisibleTabToTop(ctx), isFalse); // already at the top
    });
  });
}
