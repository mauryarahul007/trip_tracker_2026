import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:trip_tracker/data/auth/social_auth.dart';
import 'package:go_router/go_router.dart';
import 'package:trip_tracker/domain/models/join_share.dart';
import 'package:trip_tracker/shared/widgets/app_button.dart';

import '../../support/pump_app.dart';

Finder button(String label) => find.widgetWithText(AppButton, label);
String where(WidgetTester t) => GoRouterState.of(t.element(find.byType(Scaffold).last)).uri.path;

void main() {
  group('signed out (public preview)', () {
    testApp('shows the invite preview without any sign-in, and counts the preview', (tester) async {
      final app = await pumpApp(tester, launchLink: Uri.parse('com.triptracker.app://join/abc123'));
      expect(find.text('You\'re invited to "Goa Weekend"'), findsOneWidget);
      expect(find.text('Asha & Ben are already on this trip.'), findsOneWidget);
      expect(find.text('1–5 Dec'), findsOneWidget);
      expect(app.join.calls, containsAllInOrder(['preview:ABC123', 'recordPreview:ABC123']));
      expect(app.join.calls.where((c) => c.startsWith('lookup')), isEmpty);
      expect(button('Continue with Google'), findsOneWidget);
    });

    testApp('single existing member uses the singular wording', (tester) async {
      final app = await pumpApp(tester, launchLink: Uri.parse('com.triptracker.app://join/ABC123'));
      app.join.previewResult = const JoinPreview(
        tripName: 'Solo',
        startDate: '',
        endDate: '',
        memberFirstNames: ['Asha'],
      );
      GoRouter.of(tester.element(find.byType(AppBar).last)).go('/join/ZZZ999');
      await settle(tester);
      expect(find.text('Asha is already on this trip.'), findsOneWidget);
    });

    testApp('Google sign-in from the invite lands in the claim flow (not the intro carousel)', (tester) async {
      final app = await pumpApp(tester, launchLink: Uri.parse('com.triptracker.app://join/ABC123'));
      await tester.tap(button('Continue with Google'));
      await settle(tester, rounds: 12);
      expect(app.auth.calls, ['google']);
      expect(app.join.calls, contains('lookup:ABC123'));
      expect(find.text('Which traveler are you?'), findsOneWidget);
      expect(find.text('Skip'), findsNothing); // onboarding deferred until after the invite
    });

    testApp('guests are told to sign in with an account', (tester) async {
      final app = await pumpApp(tester, launchLink: Uri.parse('com.triptracker.app://join/ABC123'));
      await app.auth.signInAsGuest();
      await settle(tester, rounds: 8);
      expect(find.textContaining("Guest mode can't join"), findsOneWidget);
      expect(app.join.calls.where((c) => c.startsWith('lookup')), isEmpty);
    });

    testApp('unknown code: Invite not found with a way back', (tester) async {
      final app = await pumpApp(tester, launchLink: Uri.parse('com.triptracker.app://join/NOPE99'));
      app.join.previewResult = null;
      GoRouter.of(tester.element(find.byType(AppBar).last)).go('/join/NOPE98');
      await settle(tester);
      expect(find.text('Invite not found'), findsOneWidget);
      await tester.tap(button('Back to sign in'));
      await settle(tester);
      expect(find.text('Welcome to Trip Tracker'), findsWidgets);
    });

    testApp('rate-limited lookups show a countdown and block retry until it ends', (tester) async {
      await pumpApp(
        tester,
        launchLink: Uri.parse('com.triptracker.app://join/ABC123'),
        setup: (app) => app.join.error = const InviteException('Too many attempts, wait 3 seconds', lockoutSeconds: 3),
      );
      expect(find.text('Too many attempts. Try again in 3s.'), findsOneWidget);
      expect(tester.widget<AppButton>(button('Retry')).onPressed, isNull);
      await tester.pump(const Duration(seconds: 1));
      expect(find.text('Too many attempts. Try again in 2s.'), findsOneWidget);
      await tester.pump(const Duration(seconds: 3));
      expect(tester.widget<AppButton>(button('Retry')).onPressed, isNotNull);
    });

    testApp('"More sign-in options" returns to the invite after Google sign-in', (tester) async {
      final app = await pumpApp(tester, launchLink: Uri.parse('com.triptracker.app://join/ABC123'));
      await tester.tap(find.text('More sign-in options'));
      await settle(tester);
      app.social.googleResult = const SocialCredential(idToken: 'g-token');
      await tester.tap(find.widgetWithText(AppButton, 'Continue with Google'));
      await settle(tester, rounds: 12);
      expect(app.auth.calls, contains('google'));
      expect(where(tester), '/join/ABC123');
      expect(find.text('Which traveler are you?'), findsOneWidget);
    });
  });

  group('signed in (claim)', () {
    testApp('pick who you are, claim, and land in the trip', (tester) async {
      final app = await pumpApp(tester, user: asha, launchLink: Uri.parse('com.triptracker.app://join/ABC123'));
      expect(find.text('Join "Goa Weekend"'), findsOneWidget);
      await tester.tap(button("I'm Ben"));
      await settle(tester, rounds: 12);
      expect(app.join.calls, contains('claim:m2'));
      expect(where(tester), '/trip/trip-1/ledger'); // a trip opens on Summary, the first tab
    });

    testApp('lost the race: list reloads with a notice and nothing navigates', (tester) async {
      final app = await pumpApp(tester, user: asha, launchLink: Uri.parse('com.triptracker.app://join/ABC123'));
      app.join.claimResult = false;
      await tester.tap(button("I'm Asha K"));
      await settle(tester, rounds: 12);
      expect(find.byKey(const Key('claimed-by-other')), findsOneWidget);
      expect(find.text('Which traveler are you?'), findsOneWidget);
      expect(app.join.calls.where((c) => c.startsWith('lookup')).length, 2);
    });

    testApp('already a member: offers to open the trip', (tester) async {
      final app = await pumpApp(tester, user: asha);
      app.join.lookupResult = const JoinLookup(
        tripId: 'trip-1',
        tripName: 'Goa Weekend',
        isAdmin: true,
        myMemberId: 'm9',
      );
      GoRouter.of(tester.element(find.byType(AppBar).last)).go('/join/ABC123');
      await settle(tester, rounds: 8);
      expect(find.text('You\'re already in "Goa Weekend"'), findsOneWidget);
      expect(find.text("You're the admin of this trip."), findsOneWidget);
      await tester.tap(button('Open trip'));
      await settle(tester, rounds: 12);
      expect(where(tester), '/trip/trip-1/ledger'); // a trip opens on Summary, the first tab
    });

    testApp('everyone already claimed', (tester) async {
      final app = await pumpApp(tester, user: asha);
      app.join.lookupResult = const JoinLookup(tripId: 't', tripName: 'Goa Weekend', isAdmin: false);
      GoRouter.of(tester.element(find.byType(AppBar).last)).go('/join/ABC123');
      await settle(tester, rounds: 8);
      expect(find.text("Everyone's already joined"), findsOneWidget);
    });
  });

  group('manual code entry', () {
    testApp('empty-state "Join with Code" validates and opens the invite', (tester) async {
      final app = await pumpApp(tester, user: asha);
      await tester.tap(button('Join with Code'));
      await settle(tester);
      await tester.enterText(find.byType(TextField).last, 'abc');
      await tester.tap(button('Join'));
      await settle(tester);
      expect(find.text('Enter the 6-character code from your invite.'), findsOneWidget);
      expect(app.join.calls, isEmpty);

      await tester.enterText(find.byType(TextField).last, 'abc123');
      await tester.tap(button('Join'));
      await settle(tester, rounds: 10);
      expect(app.join.calls, contains('lookup:ABC123'));
    });
  });
}
