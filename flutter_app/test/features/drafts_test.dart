import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:trip_tracker/core/storage/prefs.dart';
import 'package:trip_tracker/data/local/app_database.dart';
import 'package:trip_tracker/data/providers.dart';

import 'support_drafts.dart';
import '../support/pump_app.dart';
import '../support/seed.dart';

void main() {
  test('sign-out removes unsent drafts so the next account never sees them', () async {
    SharedPreferences.setMockInitialValues({
      '${draftKeyPrefix}expense_t1': '{"savedAt":1,"data":{}}',
      '${draftKeyPrefix}chat_t1': '{"savedAt":1,"data":{"text":"hi"}}',
      'onboarded': true,
    });
    final prefs = await SharedPreferences.getInstance();
    final db = AppDatabase.memory();
    final c = ProviderContainer(
      overrides: [sharedPreferencesProvider.overrideWithValue(prefs), appDatabaseProvider.overrideWithValue(db)],
    );
    addTearDown(() async {
      c.dispose();
      await db.close();
    });

    await c.read(authRepositoryProvider).signOut();

    expect(prefs.getKeys().where((k) => k.startsWith(draftKeyPrefix)), isEmpty);
    expect(prefs.getBool('onboarded'), isTrue); // other preferences survive
  });

  testApp('a half-typed chat message comes back after leaving the trip', (tester) async {
    final app = await pumpApp(tester, user: asha, flagsOn: {'enableTripChat'});
    final s = await seedTrip(tester);
    await openChat(tester, s.tripId);

    await tester.enterText(find.byKey(const Key('chat-input')), 'meet at the pier');
    await tester.pump(const Duration(milliseconds: 600));
    expect(app.prefs.getString('${draftKeyPrefix}chat_${s.tripId}'), contains('meet at the pier'));

    GoRouter.of(tester.element(find.byType(Scaffold).first)).go('/');
    await settle(tester, rounds: 6);
    await openChat(tester, s.tripId);
    expect(find.text('meet at the pier'), findsOneWidget);

    await tester.tap(find.byKey(const Key('chat-send')));
    await settle(tester);
    expect(app.prefs.getString('${draftKeyPrefix}chat_${s.tripId}'), isNull);
  });

  testApp('flag off: nothing about the chat composer is saved', (tester) async {
    final app = await pumpApp(
      tester,
      user: asha,
      flagsOn: {'enableTripChat'},
      flagsOff: {'enablePersistentExpenseDraft'},
    );
    final s = await seedTrip(tester);
    await openChat(tester, s.tripId);
    await tester.enterText(find.byKey(const Key('chat-input')), 'private thought');
    await tester.pump(const Duration(milliseconds: 600));
    expect(app.prefs.getString('${draftKeyPrefix}chat_${s.tripId}'), isNull);
  });
}
