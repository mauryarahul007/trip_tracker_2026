import 'package:drift/drift.dart' show Value;
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:trip_tracker/data/local/entity_codec.dart';
import 'package:trip_tracker/data/mappers/row_mappers.dart';
import 'package:trip_tracker/domain/models/member.dart';
import 'package:trip_tracker/features/expenses/application/expenses_providers.dart';

import '../../support/pump_app.dart';
import '../../support/seed.dart';

Finder key(String k) => find.byKey(Key(k));

Future<void> openTab(WidgetTester tester, Seed s, String tab) async {
  await settle(tester);
  GoRouter.of(tester.element(find.byType(Scaffold).first)).go('/trip/${s.tripId}/$tab');
  await settle(tester, rounds: 14);
}

void main() {
  group('Member Gmail Linking Domain & Data Mappings', () {
    test('Member model serializes and deserializes email field', () {
      const m = Member(
        id: 'm-123',
        name: 'Rahul Maurya',
        email: 'rahul@gmail.com',
        tripId: 't-456',
        linkedUserId: 'user-789',
      );

      final json = m.toJson();
      expect(json['email'], 'rahul@gmail.com');

      final fromJson = Member.fromJson(json);
      expect(fromJson.email, 'rahul@gmail.com');
      expect(fromJson.name, 'Rahul Maurya');
      expect(fromJson.linkedUserId, 'user-789');

      final copy = m.copyWith(email: 'new@gmail.com');
      expect(copy.email, 'new@gmail.com');
      expect(copy.name, 'Rahul Maurya');
    });

    test('memberFromRow maps email from Postgres row data', () {
      final row = {
        'id': 'm-99',
        'trip_id': 't-1',
        'name': 'Priya',
        'email': 'priya@gmail.com',
        'archived': false,
        'linked_user_id': null,
      };

      final m = memberFromRow(row);
      expect(m.email, 'priya@gmail.com');
      expect(m.name, 'Priya');
      expect(m.linkedUserId, isNull);
    });

    test('Drift entity_codec translates email to companion and back to member', () {
      const m = Member(id: 'm-55', name: 'Amit', email: 'amit@gmail.com', tripId: 't-1');

      final companion = memberToCompanion(m, 't-1');
      expect(companion.email, const Value('amit@gmail.com'));
      expect(m.email, 'amit@gmail.com');
    });
  });

  group('Member Add with Mandatory Gmail UI', () {
    testApp('validates mandatory @gmail.com and displays linked email on member card', (tester) async {
      await pumpApp(tester, user: asha);
      final s = await seedTrip(tester);
      await openTab(tester, s, 'members');

      // Tap Add Person
      await tester.tap(key('member-add'));
      await settle(tester, rounds: 4);

      // Verify Add Person sheet opened with Name and Gmail fields
      expect(find.byKey(const Key('ask-field')), findsOneWidget);
      expect(find.byKey(const Key('member-email-field')), findsOneWidget);

      // Enter name
      await tester.enterText(key('ask-field'), 'Vikram');
      await settle(tester, rounds: 2);

      // Clear the email field completely to test mandatory validation
      await tester.enterText(key('member-email-field'), '');
      await settle(tester, rounds: 2);

      // Try to save with empty email
      await tester.tap(key('ask-ok'));
      await settle(tester, rounds: 4);
      expect(find.text('Gmail ID is required'), findsOneWidget);

      // Try entering a non-gmail address (e.g. yahoo.com)
      await tester.enterText(key('member-email-field'), 'vikram@yahoo.com');
      await settle(tester, rounds: 2);
      await tester.tap(key('ask-ok'));
      await settle(tester, rounds: 4);
      expect(find.text('Only @gmail.com addresses are supported right now'), findsOneWidget);

      // Enter valid @gmail.com address
      await tester.enterText(key('member-email-field'), 'vikram@gmail.com');
      await settle(tester, rounds: 4);

      // Save member
      await tester.tap(key('ask-ok'));
      await settle(tester, rounds: 10);

      // Member should now be visible in list with name and email subtitle
      expect(find.text('Vikram'), findsOneWidget);
      expect(find.text('vikram@gmail.com'), findsOneWidget);

      // Verify the member in the database repository has the email saved
      final members = containerOf(tester).read(tripMembersProvider(s.tripId)).value ?? [];
      final vikram = members.firstWhere((m) => m.name == 'Vikram');
      expect(vikram.email, 'vikram@gmail.com');
    });
  });
}
