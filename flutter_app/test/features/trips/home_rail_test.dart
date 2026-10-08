import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:trip_tracker/features/trips/presentation/widgets/home_dock.dart';
import 'package:trip_tracker/l10n/app_localizations.dart';
import 'package:trip_tracker/shared/theme/app_theme.dart';
import 'package:trip_tracker/shared/widgets/app_bottom_nav.dart';

Widget _host({required bool horizon, HomeTab tab = HomeTab.trips}) => ProviderScope(
  overrides: [horizonNavProvider.overrideWithValue(horizon)],
  child: MaterialApp(
    theme: AppTheme.light(),
    localizationsDelegates: AppLocalizations.localizationsDelegates,
    supportedLocales: AppLocalizations.supportedLocales,
    home: Consumer(
      builder: (context, ref, _) => Scaffold(
        body: wrapHomeBody(context, ref, tab, const Center(child: Text('page body'))),
        bottomNavigationBar: buildHomeDock(context, ref, tab),
      ),
    ),
  ),
);

void main() {
  testWidgets('wide window with Horizon nav: left rail, no bottom dock', (tester) async {
    tester.view.physicalSize = const Size(1280, 800);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);
    await tester.pumpWidget(_host(horizon: true));
    expect(find.byType(AppSideNav), findsOneWidget);
    expect(find.byKey(const Key('rail-new-trip')), findsOneWidget);
    expect(find.byType(AppBottomNav), findsNothing);
    expect(find.text('page body'), findsOneWidget);
  });

  testWidgets('narrow window with Horizon nav: bottom dock, no rail', (tester) async {
    tester.view.physicalSize = const Size(400, 800);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);
    await tester.pumpWidget(_host(horizon: true));
    expect(find.byType(AppSideNav), findsNothing);
    expect(find.byType(AppBottomNav), findsOneWidget);
  });

  testWidgets('flag off: neither rail nor dock at any width', (tester) async {
    tester.view.physicalSize = const Size(1280, 800);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);
    await tester.pumpWidget(_host(horizon: false));
    expect(find.byType(AppSideNav), findsNothing);
    expect(find.byType(AppBottomNav), findsNothing);
    expect(find.text('page body'), findsOneWidget);
  });

  testWidgets('back from a non-Trips tab is intercepted (goes to Trips), Trips itself is not', (tester) async {
    tester.view.physicalSize = const Size(400, 800);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);
    await tester.pumpWidget(_host(horizon: true, tab: HomeTab.me));
    final inBody = find.descendant(of: find.byType(Scaffold), matching: find.byWidgetPredicate((w) => w is PopScope));
    final guarded = tester.widgetList<Widget>(inBody).cast<PopScope>().any((p) => !p.canPop);
    expect(guarded, isTrue);
    await tester.pumpWidget(_host(horizon: true, tab: HomeTab.trips));
    await tester.pump();
    expect(tester.widgetList<Widget>(inBody).cast<PopScope>().any((p) => !p.canPop), isFalse);
  });
}
