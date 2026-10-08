import 'dart:convert';

import 'package:drift/drift.dart' show Value;
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:trip_tracker/data/local/app_database.dart';
import 'package:trip_tracker/data/providers.dart';
import 'package:trip_tracker/domain/models/travel_pass.dart';
import 'package:trip_tracker/domain/models/trip_message.dart';
import 'package:trip_tracker/features/expenses/application/expenses_providers.dart';
import 'package:trip_tracker/features/trip_details/application/trip_nav.dart';

import '../support/pump_app.dart';
import '../support/seed.dart';

Finder key(String k) => find.byKey(Key(k));

Future<void> openTab(WidgetTester tester, Seed s, String tab) async {
  await settle(tester);
  GoRouter.of(tester.element(find.byType(Scaffold).first)).go('/trip/${s.tripId}/$tab');
  await settle(tester, rounds: 14);
}

Future<void> typeAsk(WidgetTester tester, String text) async {
  await tester.enterText(key('ask-field'), text);
  await tester.tap(key('ask-ok'));
  await settle(tester, rounds: 8);
}

void main() {
  testApp('members: add, role, archive, group, invite, and the money row', (tester) async {
    await pumpApp(tester, user: asha);
    final s = await seedTrip(tester);
    await addExpense(tester, s, amount: 90);
    await openTab(tester, s, 'members');

    expect(find.text('Asha'), findsOneWidget);
    expect(find.textContaining('is owed'), findsOneWidget);
    expect(find.textContaining('owes'), findsWidgets);

    await tester.tap(key('member-add'));
    await settle(tester, rounds: 4);
    await typeAsk(tester, 'Dev');
    expect(find.text('Dev'), findsOneWidget);

    await tester.tap(key('member-actions-${s.ben}'));
    await settle(tester, rounds: 4);
    await tester.tap(find.text('Viewer').last);
    await settle(tester, rounds: 6);
    final trip = containerOf(tester).read(tripProvider(s.tripId)).value;
    expect(trip?.memberRoles[s.ben], 'viewer');

    await tester.tap(key('member-actions-${s.cara}'));
    await settle(tester, rounds: 4);
    await tester.tap(key('member-archive-${s.cara}'));
    await settle(tester, rounds: 6);
    expect(find.text('Archived'), findsOneWidget);
    final visible = containerOf(tester).read(visibleMembersProvider(s.tripId));
    expect(visible.any((m) => m.id == s.cara), isFalse);
    expect(find.text('Cara'), findsOneWidget);

    await tester.tap(key('member-group-add'));
    await settle(tester, rounds: 4);
    await tester.enterText(key('group-name'), 'Room');
    await tester.tap(key('group-pick-${s.me}'));
    await tester.tap(key('group-pick-${s.ben}'));
    await tester.tap(key('group-save'));
    await settle(tester, rounds: 8);
    expect(find.text('Room'), findsOneWidget);

    await tester.tap(key('member-invite'));
    await settle(tester, rounds: 6);
    expect(find.text('Invite travelers'), findsOneWidget);
  });

  testApp('notes on a wide window show members as a third column', (tester) async {
    await pumpApp(tester, user: asha);
    final s = await seedTrip(tester);
    await openTab(tester, s, 'notes');
    expect(find.byKey(const Key('planner-members')), findsNothing); // harness is phone-sized
    tester.view.physicalSize = const Size(1500, 900);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);
    await settle(tester);
    expect(find.byKey(const Key('planner-members')), findsOneWidget);
    expect(find.byKey(const Key('member-add')), findsOneWidget);
  });

  testApp('notes: checklist, packing suggestions, a linked note, and a manual pass', (tester) async {
    await pumpApp(tester, user: asha);
    final s = await seedTrip(tester);
    await openTab(tester, s, 'notes');

    await tester.tap(key('check-add'));
    await settle(tester, rounds: 4);
    await typeAsk(tester, 'Passport');
    expect(find.text('Passport'), findsOneWidget);
    expect(find.text('0 of 1'), findsOneWidget);

    await tester.tap(key('packing-suggest'));
    await settle(tester, rounds: 8);
    expect(find.text('Government Photo ID / Physical Passport'), findsOneWidget);

    await tester.tap(find.descendant(of: key('notes-panes'), matching: find.text('Notes')));
    await settle(tester, rounds: 4);
    await tester.tap(key('note-add'));
    await settle(tester, rounds: 4);
    await typeAsk(tester, 'Links');
    final note = containerOf(tester).read(tripProvider(s.tripId)).value!.notes.single;
    await tester.enterText(key('note-body-${note.id}'), 'See https://example.com/map');
    await tester.pump(const Duration(milliseconds: 500));
    await settle(tester, rounds: 8);
    final saved = containerOf(tester).read(tripProvider(s.tripId)).value!.notes.single.content;
    expect(saved, 'See https://example.com/map');
    expect(key('note-link-https://example.com/map'), findsOneWidget);

    await tester.tap(key('pass-add'));
    await settle(tester, rounds: 4);
    await tester.enterText(key('pass-title'), '6E 204');
    await tester.enterText(key('pass-from'), 'BLR');
    await tester.enterText(key('pass-to'), 'GOI');
    await tester.tap(key('pass-save'));
    await settle(tester, rounds: 8);
    expect(find.text('6E 204'), findsOneWidget);
    expect(find.text('Passes'), findsOneWidget);
  });

  testApp('notes: many passes scroll in their own area and keep the pane selector visible', (tester) async {
    tester.view.physicalSize = const Size(411, 900);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);
    await pumpApp(tester, user: asha);
    final s = await seedTrip(tester);
    await containerOf(tester).read(tripRepositoryProvider).setPasses(s.tripId, [
      for (var i = 0; i < 12; i++)
        TravelPass(id: 'p$i', tripId: s.tripId, type: 'flight', title: 'Pass $i', createdAt: 1, updatedAt: 1),
    ]);
    await openTab(tester, s, 'notes');

    expect(tester.takeException(), isNull);
    expect(key('notes-passes-scroll'), findsOneWidget);
    expect(tester.getTopLeft(key('notes-panes')).dy, lessThan(900));

    // Sort control: Leg mode groups by leg header; Name mode drops headers.
    expect(key('pass-sort'), findsOneWidget);
    await tester.tap(find.descendant(of: key('pass-sort'), matching: find.text('Leg')));
    await settle(tester, rounds: 4);
    expect(key('pass-leg-'), findsOneWidget); // no legIdentifier/route → one blank-leg group
    await tester.tap(find.descendant(of: key('pass-sort'), matching: find.text('Name')));
    await settle(tester, rounds: 4);
    expect(key('pass-leg-'), findsNothing);
    expect(tester.takeException(), isNull);
  });

  testApp('chat: unread on notes, a text bubble, and an expense card', (tester) async {
    await pumpApp(tester, user: asha);
    final s = await seedTrip(tester);
    final c = containerOf(tester);
    await real(
      tester,
      () =>
          c.read(messageRepositoryProvider).send(tripId: s.tripId, memberId: s.ben, senderName: 'Ben', body: 'see you'),
    );
    await openTab(tester, s, 'notes');
    expect(key('notes-chat-unread'), findsOneWidget);

    await tester.tap(key('notes-chat-unread'));
    await settle(tester, rounds: 8);
    expect(find.text('see you'), findsOneWidget);
    expect(key('notes-chat-unread'), findsNothing);

    await tester.enterText(key('chat-input'), 'on my way');
    await tester.tap(key('chat-send'));
    await settle(tester, rounds: 8);
    expect(find.text('on my way'), findsOneWidget);

    final expenseId = await addExpense(tester, s, title: 'Beach lunch');
    final msg = TripMessage(
      id: 'evt-1',
      tripId: s.tripId,
      memberId: s.me,
      body: 'Added Beach lunch',
      eventKind: 'expense_added',
      payload: {'expenseId': expenseId, 'title': 'Beach lunch'},
      createdAt: DateTime.now().millisecondsSinceEpoch,
    );
    final db = c.read(appDatabaseProvider);
    await real(
      tester,
      () => db
          .into(db.tripMessagesTable)
          .insert(
            TripMessagesTableCompanion.insert(
              id: msg.id,
              tripId: msg.tripId,
              userId: msg.memberId,
              senderName: 'Asha',
              kind: 'expense_added',
              message: msg.body,
              createdAt: DateTime.fromMillisecondsSinceEpoch(msg.createdAt, isUtc: true).toIso8601String(),
              domainJson: Value(jsonEncode(msg.toJson())),
            ),
          ),
    );
    await settle(tester, rounds: 8);
    expect(key('chat-event-evt-1'), findsOneWidget);
    await tester.tap(key('chat-event-evt-1'));
    await settle(tester, rounds: 8);
    expect(find.text('Beach lunch'), findsWidgets);
  });
}
