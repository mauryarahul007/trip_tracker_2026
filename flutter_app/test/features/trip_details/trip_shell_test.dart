import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:trip_tracker/shared/widgets/app_bottom_nav.dart';
import 'package:trip_tracker/core/clock.dart';
import 'package:trip_tracker/data/providers.dart';
import 'package:trip_tracker/domain/logic/back_exit.dart';

import 'package:trip_tracker/features/expenses/presentation/expenses_tab.dart';

import '../../support/pump_app.dart';

ProviderContainer containerOf(WidgetTester tester) =>
    ProviderScope.containerOf(tester.element(find.byType(MaterialApp)));

Future<String> openTrip(WidgetTester tester, {String name = 'Goa Weekend'}) async {
  final c = containerOf(tester);
  final id = await real(
    tester,
    () => c
        .read(tripRepositoryProvider)
        .createTrip(
          name: name,
          startDate: '2026-12-01',
          endDate: '2026-12-05',
          baseCurrency: 'INR',
          ownerId: 'u1',
          creatorName: 'Asha',
        ),
  );
  await settle(tester);
  await tester.tap(find.text(name));
  await settle(tester, rounds: 12);
  return id;
}

/// Location of the top-most visible page (pushed routes don't change the delegate's base URI).
String location(WidgetTester tester) => GoRouterState.of(tester.element(find.byType(AppBar).last)).uri.path;

Finder tabBody(String tab) => find.byKey(Key('tab-$tab'));

/// Bento dock: only the selected item shows its label, so items are found by their button semantics.
Finder navItem(String label) => find.descendant(
  of: find.byType(AppBottomNav),
  matching: find.byWidgetPredicate((w) => w is Semantics && w.properties.button == true && w.properties.label == label),
);

void main() {
  testApp('wide window swaps the bottom bar for a side rail', (tester) async {
    await pumpApp(tester, user: asha);
    tester.view.physicalSize = const Size(1400, 900);
    addTearDown(tester.view.reset);
    await openTrip(tester);
    expect(find.byType(AppBottomNav), findsNothing);
    expect(find.byType(AppSideNav), findsOneWidget);
    expect(find.descendant(of: find.byType(AppSideNav), matching: find.text('Balances')), findsOneWidget);
    expect(find.byType(ExpensesTab), findsOneWidget);
  });

  testApp('opening a trip shows its name, default tabs and the Expenses tab', (tester) async {
    await pumpApp(tester, user: asha);
    final id = await openTrip(tester);
    expect(location(tester), '/trip/$id/expenses');
    expect(find.descendant(of: find.byType(AppBar), matching: find.text('Goa Weekend')), findsOneWidget);
    for (final label in ['Expenses', 'Balances', 'Members', 'Notes']) {
      expect(navItem(label), findsOneWidget, reason: label);
    }
    expect(navItem('Chat'), findsNothing);
    expect(find.byType(ExpensesTab), findsOneWidget);
  });

  testApp('chat-first flag puts Chat first and makes it the landing tab', (tester) async {
    await pumpApp(tester, user: asha, flagsOn: {'enableChatFirstNav'});
    final id = await openTrip(tester);
    final bar = find.byType(AppBottomNav);
    expect(navItem('Chat'), findsOneWidget);
    final items = tester.widget<AppBottomNav>(bar).items.map((i) => i.label).toList();
    expect(items.first, 'Chat');
    expect(id, isNotEmpty);
  });

  testApp('notes/passes/chat all off hides the Notes tab', (tester) async {
    await pumpApp(tester, user: asha, flagsOff: {'enableNotesAndChecklist', 'enableTravelPasses', 'enableTripChat'});
    await openTrip(tester);
    expect(navItem('Notes'), findsNothing);
  });

  testApp('tapping a tab switches content and the route', (tester) async {
    await pumpApp(tester, user: asha);
    final id = await openTrip(tester);
    await tester.tap(navItem('Members'));
    await settle(tester, rounds: 12);
    expect(location(tester), '/trip/$id/members');
    expect(tabBody('members'), findsOneWidget);
    expect(tester.getRect(tabBody('members')).left, 0); // paged fully into view
  });

  testApp('swiping the content moves to the next tab', (tester) async {
    await pumpApp(tester, user: asha);
    final id = await openTrip(tester);
    await tester.drag(find.byType(ExpensesTab), const Offset(-400, 0));
    await settle(tester, rounds: 14);
    expect(location(tester), '/trip/$id/ledger');
    await tester.drag(find.byKey(const Key('ledger-list')), const Offset(400, 0));
    await settle(tester, rounds: 14);
    expect(location(tester), '/trip/$id/expenses');
  });

  testApp('system back walks the tab trail, then leaves the trip', (tester) async {
    await pumpApp(tester, user: asha);
    final id = await openTrip(tester);
    await tester.tap(navItem('Balances'));
    await settle(tester, rounds: 10);
    await tester.tap(navItem('Members'));
    await settle(tester, rounds: 10);
    expect(location(tester), '/trip/$id/members');

    await tester.binding.handlePopRoute();
    await settle(tester, rounds: 10);
    expect(location(tester), '/trip/$id/ledger');
    await tester.binding.handlePopRoute();
    await settle(tester, rounds: 10);
    expect(location(tester), '/trip/$id/expenses');
    await tester.binding.handlePopRoute(); // trail empty: leave the trip
    await settle(tester, rounds: 10);
    expect(location(tester), '/');
    expect(find.text('My Trips'), findsOneWidget);
  });

  testApp('header back arrow returns to the trips list', (tester) async {
    await pumpApp(tester, user: asha);
    await openTrip(tester);
    await tester.tap(find.byTooltip('Back'));
    await settle(tester, rounds: 10);
    expect(find.text('My Trips'), findsOneWidget);
  });

  testApp('settings opens from the header and returns', (tester) async {
    await pumpApp(tester, user: asha);
    final id = await openTrip(tester);
    await tester.tap(find.byTooltip('Settings'));
    await settle(tester, rounds: 10);
    expect(location(tester), '/trip/$id/settings');
    await tester.tap(find.byIcon(Icons.arrow_back_ios_new_rounded));
    await settle(tester, rounds: 10);
    expect(location(tester), '/trip/$id/expenses');
  });

  testApp('a bare /trip/:id link lands on the first visible tab', (tester) async {
    await pumpApp(tester, user: asha);
    final c = containerOf(tester);
    final id = await real(
      tester,
      () => c
          .read(tripRepositoryProvider)
          .createTrip(
            name: 'Deep',
            startDate: '2026-12-01',
            endDate: '2026-12-05',
            baseCurrency: 'INR',
            ownerId: 'u1',
            creatorName: 'A',
          ),
    );
    GoRouter.of(tester.element(find.byType(Scaffold).first)).go('/trip/$id');
    await settle(tester, rounds: 10);
    expect(location(tester), '/trip/$id/expenses');
  });

  group('root double-back exit', () {
    testApp('first back shows the hint; second inside the window exits the app', (tester) async {
      final exits = <MethodCall>[];
      tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(SystemChannels.platform, (call) async {
        if (call.method == 'SystemNavigator.pop') exits.add(call);
        return null;
      });
      addTearDown(() => tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(SystemChannels.platform, null));

      await pumpApp(tester, user: asha);
      await tester.binding.handlePopRoute();
      await settle(tester, rounds: 4);
      expect(find.text('Press back again to exit'), findsOneWidget);
      expect(exits, isEmpty);

      await tester.binding.handlePopRoute();
      await settle(tester, rounds: 4);
      expect(exits, hasLength(1));
    });

    testApp('a second back after the window only re-shows the hint', (tester) async {
      final exits = <MethodCall>[];
      tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(SystemChannels.platform, (call) async {
        if (call.method == 'SystemNavigator.pop') exits.add(call);
        return null;
      });
      addTearDown(() => tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(SystemChannels.platform, null));

      var now = DateTime(2026, 1, 1, 12);
      await pumpApp(tester, user: asha, overrides: [nowProvider.overrideWithValue(() => now)]);
      await tester.binding.handlePopRoute();
      now = now.add(exitWindow + const Duration(seconds: 1));
      await tester.binding.handlePopRoute();
      await settle(tester, rounds: 4);
      expect(exits, isEmpty);
    });
  });
}
