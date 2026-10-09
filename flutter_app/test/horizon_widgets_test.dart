import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:trip_tracker/shared/theme/app_theme.dart';
import 'package:trip_tracker/shared/widgets/app_bottom_nav.dart';
import 'package:trip_tracker/shared/widgets/app_surface.dart';

Widget host(Widget child) => MaterialApp(
  theme: AppTheme.light(),
  home: Scaffold(body: child),
);

const items = [
  AppNavItem(icon: Icons.receipt_long_rounded, label: 'Expenses'),
  AppNavItem(icon: Icons.chat_bubble_outline_rounded, label: 'Chat', badge: true),
  AppNavItem(icon: Icons.people_outline_rounded, label: 'Members'),
];

void main() {
  testWidgets('floating dock selects and reports taps', (tester) async {
    var tapped = -1;
    await tester.pumpWidget(
      host(
        Align(
          alignment: Alignment.bottomCenter,
          child: AppBottomNav(items: items, currentIndex: 0, onTap: (i) => tapped = i, forceDock: true),
        ),
      ),
    );
    await tester.tap(find.bySemanticsLabel('Members')); // Bento: only the selected item shows its label
    expect(tapped, 2);
    expect(find.byType(Badge), findsOneWidget);
  });

  testWidgets('dock centre button fires its action and keeps item indexes', (tester) async {
    var tapped = -1;
    var centre = 0;
    await tester.pumpWidget(
      host(
        Align(
          alignment: Alignment.bottomCenter,
          child: AppBottomNav(
            items: items,
            currentIndex: 0,
            onTap: (i) => tapped = i,
            forceDock: true,
            centerAction: () => centre++,
          ),
        ),
      ),
    );
    await tester.tap(find.byKey(const Key('dock-center')));
    expect(centre, 1);
    await tester.tap(find.bySemanticsLabel('Members')); // Bento: only the selected item shows its label
    expect(tapped, 2);
  });

  testWidgets('M3 bar renders the same items', (tester) async {
    var tapped = -1;
    await tester.pumpWidget(
      host(
        Align(
          alignment: Alignment.bottomCenter,
          child: AppBottomNav(items: items, currentIndex: 1, onTap: (i) => tapped = i, forceDock: false),
        ),
      ),
    );
    expect(find.byType(NavigationBar), findsOneWidget);
    await tester.tap(find.text('Expenses'));
    expect(tapped, 0);
  });

  testWidgets('side rail lists items and reports taps', (tester) async {
    var tapped = -1;
    await tester.pumpWidget(
      host(
        Row(
          children: [AppSideNav(items: items, currentIndex: 0, onTap: (i) => tapped = i, extended: true)],
        ),
      ),
    );
    await tester.tap(find.text('Chat'));
    expect(tapped, 1);
  });

  testWidgets('HeroSurface paints its child in white and MoneyText dims decimals', (tester) async {
    await tester.pumpWidget(
      host(
        const HeroSurface(
          kind: SurfaceKind.ember,
          child: MoneyText(whole: '₹84,320'),
        ),
      ),
    );
    expect(find.byType(HeroSurface), findsOneWidget);
    final rich = tester.widget<Text>(find.byType(Text)).textSpan! as TextSpan;
    expect(rich.children, hasLength(1));
  });
}
