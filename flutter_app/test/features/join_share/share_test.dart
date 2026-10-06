import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:trip_tracker/core/links/signup_attribution.dart';
import 'package:trip_tracker/data/local/app_database.dart';
import 'package:trip_tracker/data/providers.dart';
import 'package:trip_tracker/shared/widgets/app_button.dart';

import '../../support/pump_app.dart';

Finder button(String label) => find.widgetWithText(AppButton, label);
String where(WidgetTester t) => GoRouterState.of(t.element(find.byType(Scaffold).last)).uri.path;
ProviderContainer containerOf(WidgetTester tester) => ProviderScope.containerOf(tester.element(find.byType(MaterialApp)));

void main() {
  group('/share/:token (public, read-only)', () {
    testApp('signed out: summary renders and the view is counted once', (tester) async {
      final app = await pumpApp(tester, launchLink: Uri.parse('https://trip-tracker.blackmaroon.in/share/tok-abc'));
      expect(find.text('Goa Weekend'), findsOneWidget);
      expect(find.text('Goa · 1–5 Dec'), findsOneWidget);
      expect(find.text('4'), findsOneWidget); // travelers
      expect(find.text('12'), findsOneWidget); // expenses
      expect(find.byKey(const Key('spend-INR')), findsOneWidget);
      expect(find.text('₹24,500.50'), findsOneWidget);
      expect(find.text('\$40.00'), findsOneWidget);
      expect(app.share.calls, ['summary:tok-abc', 'view:tok-abc']);
      expect(app.auth.calls, isEmpty); // never asked to sign in
    });

    testApp('revoked or expired link: shows the ended state and records no view', (tester) async {
      final app = await pumpApp(tester, setup: (a) => a.share.summaryResult = null, launchLink: Uri.parse('com.triptracker.app://share/dead-token'));
      expect(find.text('This link has ended'), findsOneWidget);
      expect(app.share.calls, ['summary:dead-token']);
    });

    testApp('network failure: retry button loads it', (tester) async {
      final app = await pumpApp(tester, setup: (a) => a.share.summaryError = Exception('offline'), launchLink: Uri.parse('com.triptracker.app://share/tok-1'));
      expect(find.text("Couldn't load this trip summary."), findsOneWidget);
      app.share.summaryError = null;
      await tester.tap(button('Retry'));
      await settle(tester, rounds: 8);
      expect(find.text('Goa Weekend'), findsOneWidget);
    });
  });

  group('invite sheet', () {
    Future<String> openSheet(WidgetTester tester, {String owner = 'u1', String joinCode = 'ABC123'}) async {
      final c = containerOf(tester);
      final id = await real(
        tester,
        () => c.read(tripRepositoryProvider).createTrip(
            name: 'Goa Weekend', startDate: '2026-12-01', endDate: '2026-12-05', baseCurrency: 'INR', ownerId: owner, creatorName: 'Asha'),
      );
      if (joinCode.isNotEmpty) {
        // The server assigns the code; simulate the pulled row.
        await real(tester, () async {
          final db = c.read(appDatabaseProvider);
          await db.customStatement("UPDATE trips SET domain_json = json_set(domain_json, '\$.joinCode', ?) WHERE id = ?", [joinCode, id]);
        });
      }
      await settle(tester);
      await tester.tap(find.text('Goa Weekend'));
      await settle(tester, rounds: 12);
      await tester.tap(find.byTooltip('Share Trip'));
      await settle(tester, rounds: 12);
      return id;
    }

    testApp('shows the join code, a QR for the canonical join link, and shares/copies it', (tester) async {
      final app = await pumpApp(tester, user: asha);
      await openSheet(tester);
      expect(find.byKey(const Key('join-code')), findsOneWidget);
      expect(find.text('ABC123'), findsOneWidget);
      // The QR encodes the canonical join link (its key carries the payload).
      expect(find.byKey(const ValueKey('https://trip-tracker.blackmaroon.in/join/ABC123')), findsOneWidget);
      expect(find.byType(QrImageView), findsOneWidget);

      await tester.tap(button('Share invite'));
      await settle(tester);
      expect(app.shareService.shared.single, contains('https://trip-tracker.blackmaroon.in/join/ABC123'));
      expect(app.shareService.shared.single, contains('code ABC123'));

      await tester.tap(button('Copy code'));
      await settle(tester);
      await tester.tap(button('Copy link'));
      await settle(tester);
      expect(app.shareService.copied, ['ABC123', 'https://trip-tracker.blackmaroon.in/join/ABC123']);
    });

    testApp('a trip that has not synced yet explains the missing code instead of showing a broken QR', (tester) async {
      await pumpApp(tester, user: asha);
      await openSheet(tester, joinCode: '');
      expect(find.byKey(const Key('code-pending')), findsOneWidget);
      expect(find.byKey(const Key('join-qr')), findsNothing);
    });

    testApp('owner can create then turn off the view-only link', (tester) async {
      final app = await pumpApp(tester, user: asha);
      final id = await openSheet(tester);
      await tester.ensureVisible(button('Create view-only link'));
      await tester.tap(button('Create view-only link'));
      await settle(tester, rounds: 8);
      expect(app.share.calls, ['generate:$id']);
      expect(find.textContaining('Active until'), findsOneWidget);

      await tester.ensureVisible(button('Turn off link'));
      await tester.tap(find.widgetWithText(AppButton, 'Copy link').last);
      await settle(tester);
      expect(app.shareService.copied.last, 'https://trip-tracker.blackmaroon.in/share/tok-123');

      await tester.ensureVisible(button('Turn off link'));
      await tester.tap(button('Turn off link'));
      await settle(tester, rounds: 8);
      expect(app.share.calls, ['generate:$id', 'revoke:$id']);
      expect(button('Create view-only link'), findsOneWidget);
    });

    testApp('offline: link changes fail with a clear message and keep the sheet usable', (tester) async {
      final app = await pumpApp(tester, user: asha);
      await openSheet(tester);
      app.share.failWrites = true;
      await tester.ensureVisible(button('Create view-only link'));
      await tester.tap(button('Create view-only link'));
      await settle(tester, rounds: 8);
      expect(find.byKey(const Key('share-error')), findsOneWidget);
      expect(find.text('Connect to the internet to change the view-only link.'), findsOneWidget);
      expect(button('Create view-only link'), findsOneWidget);
    });

    testApp('flag off: no view-only link section at all (invite still works)', (tester) async {
      final app = await pumpApp(tester, user: asha, flagsOff: {'enableTripShareLink'});
      await openSheet(tester);
      expect(find.text('ABC123'), findsOneWidget);
      expect(find.text('View-only link'), findsNothing);
      expect(button('Create view-only link'), findsNothing);
      expect(app.share.calls, isEmpty);
    });

    testApp('Ops Deck flag off: no view-only link section at all (invite still works)', (tester) async {
      await pumpApp(tester, user: asha, flagsOff: {'enableTripShareLink'});
      await openSheet(tester);
      expect(find.text('ABC123'), findsOneWidget);
      expect(find.text('View-only link'), findsNothing);
      expect(button('Create view-only link'), findsNothing);
    });

    testApp('non-owners can invite but cannot manage the view-only link', (tester) async {
      final app = await pumpApp(tester, user: asha);
      await openSheet(tester, owner: 'someone-else');
      expect(find.text('ABC123'), findsOneWidget);
      await tester.ensureVisible(find.text('Only the trip owner or an admin can manage this link.'));
      expect(find.text('Only the trip owner or an admin can manage this link.'), findsOneWidget);
      expect(button('Create view-only link'), findsNothing);
      expect(app.share.calls, isEmpty);
    });
  });

  group('deep links while running', () {
    testApp('a link arriving mid-session opens the invite, and attribution is kept (first touch only)', (tester) async {
      final app = await pumpApp(tester, user: asha);
      app.links.controller.add(Uri.parse('https://trip-tracker.blackmaroon.in/join/zzz999?utm_source=whatsapp&utm_medium=invite'));
      await settle(tester, rounds: 10);
      expect(app.join.calls, contains('lookup:ZZZ999'));
      final store = containerOf(tester).read(signupAttributionStoreProvider);
      expect(store.load()!['utm_source'], 'whatsapp');

      app.links.controller.add(Uri.parse('com.triptracker.app://join/yyy888?utm_source=other'));
      await settle(tester, rounds: 10);
      expect(store.load()!['utm_source'], 'whatsapp'); // never overwritten
    });

    testApp('irrelevant links (OAuth callback) are ignored', (tester) async {
      final app = await pumpApp(tester, user: asha);
      app.links.controller.add(Uri.parse('com.triptracker.app://auth-callback?code=abc'));
      await settle(tester, rounds: 6);
      expect(where(tester), '/');
      expect(app.join.calls, isEmpty);
    });
  });

  test('attribution store: capture once, clear, ignore empty', () async {
    SharedPreferences.setMockInitialValues({});
    final store = SignupAttributionStore(await SharedPreferences.getInstance(), now: () => DateTime.utc(2026, 1, 1));
    await store.captureIfFirst({});
    expect(store.load(), isNull);
    await store.captureIfFirst({'utm_source': 'a'});
    await store.captureIfFirst({'utm_source': 'b'});
    expect(store.load(), {'utm_source': 'a', 'capturedAt': DateTime.utc(2026, 1, 1).millisecondsSinceEpoch});
    await store.clear();
    expect(store.load(), isNull);
  });
}
