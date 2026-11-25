import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:trip_tracker/app/router.dart';
import 'package:trip_tracker/features/trips/presentation/widgets/create_trip_sheet.dart';
import 'package:trip_tracker/features/trips/presentation/widgets/join_code_sheet.dart';
import 'package:trip_tracker/shared/widgets/app_sheet.dart';

import '../support/pump_app.dart';
import '../support/seed.dart';

void main() {
  test('joinCodeFromClipboard reads a bare code or the end of a join link', () {
    expect(joinCodeFromClipboard(' goa7mx '), 'GOA7MX');
    expect(joinCodeFromClipboard('Join us: https://trip.app/join/ab12cd'), 'AB12CD');
    expect(joinCodeFromClipboard('hello world'), isNull);
    expect(joinCodeFromClipboard(null), isNull);
  });

  group('Horizon PR 4: home and account (flag enableHorizonUi)', () {
    Future<void> setup(WidgetTester tester, {bool horizon = true}) =>
        pumpApp(tester, user: asha, flagsOn: {if (horizon) 'enableHorizonUi'});

    Future<void> go(WidgetTester tester, String path) async {
      unawaited(containerOf(tester).read(routerProvider).push<void>(path));
      await settle(tester, rounds: 10);
    }

    Future<void> openSheet(WidgetTester tester, Widget sheet) async {
      unawaited(AppSheet.show<void>(context: tester.element(find.byType(Scaffold).first), builder: (_) => sheet));
      await settle(tester, rounds: 6);
    }

    testApp('Create trip: dates, currency beside budget, and Create and invite', (tester) async {
      await setup(tester);
      await openSheet(tester, const CreateTripSheet());
      expect(find.byKey(const Key('create-trip-starts')), findsOneWidget);
      expect(find.byKey(const Key('create-trip-ends')), findsOneWidget);
      expect(find.byKey(const Key('create-trip-currency')), findsOneWidget);
      expect(find.byKey(const Key('create-trip-budget')), findsOneWidget);
      expect(find.text('Create and invite'), findsOneWidget);
    });

    testApp('Join with code fills in a code found on the clipboard', (tester) async {
      await setup(tester);
      tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(SystemChannels.platform, (call) async {
        if (call.method == 'Clipboard.getData') return {'text': 'https://trip.app/join/goa7mx'};
        return null;
      });
      addTearDown(() => tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(SystemChannels.platform, null));
      unawaited(showJoinCodeSheet(tester.element(find.byType(Scaffold).first)));
      await settle(tester, rounds: 6);
      expect(find.text('Join a trip'), findsOneWidget);
      expect(find.text('Pasted the code you copied.'), findsOneWidget);
      expect(find.text('G'), findsOneWidget);
      expect(find.text('X'), findsOneWidget);
    });

    testApp('Me opens with one card of everyday settings', (tester) async {
      await setup(tester);
      containerOf(tester).read(routerProvider).go('/settings');
      await settle(tester, rounds: 10);
      expect(find.byKey(const Key('settings-me-card')), findsOneWidget);
    });

    testApp('Storage shows a usage card', (tester) async {
      await setup(tester);
      await go(tester, '/settings/storage');
      expect(find.byKey(const Key('storage-usage-card')), findsOneWidget);
      expect(find.text('Storage and data'), findsOneWidget);
    });

    testApp('Diagnostics: Sync and Queue cards and Copy log', (tester) async {
      await setup(tester);
      await go(tester, '/settings/diagnostics');
      expect(find.byKey(const Key('horizon-diagnostics')), findsOneWidget);
      expect(find.byKey(const Key('diag-sync')), findsOneWidget);
      expect(find.byKey(const Key('diag-queue')), findsOneWidget);
      await tester.ensureVisible(find.byKey(const Key('diag-copy')));
      await tester.tap(find.byKey(const Key('diag-copy')));
      await settle(tester, rounds: 4);
      expect(find.text('Log copied'), findsOneWidget);
    });

    testApp('Legal opens with a list of its sections', (tester) async {
      await setup(tester);
      await go(tester, '/privacy');
      expect(find.byKey(const Key('legal-sections')), findsOneWidget);
    });

    testApp('Delete account puts Cancel and Delete side by side', (tester) async {
      await setup(tester);
      await go(tester, '/delete-account');
      expect(find.byKey(const Key('delete-keep')), findsOneWidget);
      expect(find.byKey(const Key('delete-submit')), findsOneWidget);
      expect(find.text('Permanently Delete My Account'), findsNothing);
    });

    testApp('Flag off keeps the old create, legal and delete layouts', (tester) async {
      await setup(tester, horizon: false);
      await go(tester, '/privacy');
      expect(find.byKey(const Key('legal-sections')), findsNothing);
      await go(tester, '/delete-account');
      expect(find.byKey(const Key('delete-submit')), findsNothing);
      expect(find.text('Permanently Delete My Account'), findsOneWidget);
      await go(tester, '/settings/diagnostics');
      expect(find.byKey(const Key('horizon-diagnostics')), findsNothing);
    });
  });
}
