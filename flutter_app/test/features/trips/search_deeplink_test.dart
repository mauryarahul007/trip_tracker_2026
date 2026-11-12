import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:trip_tracker/data/providers.dart';
import 'package:trip_tracker/domain/models/trip_note.dart';
import 'package:trip_tracker/features/notifications/application/activity_focus.dart';

import '../../support/pump_app.dart';
import '../../support/seed.dart';

Finder key(String k) => find.byKey(Key(k));

/// The location on top of the stack (also right after a `push`, which the browser-style URL does not show).
String _path(WidgetTester tester) =>
    GoRouter.of(tester.element(find.byType(Scaffold).first)).routerDelegate.currentConfiguration.last.matchedLocation;

/// A trip with an expense ("Moped rental") and two notes, then the Trips search opened on [query].
Future<Seed> _searchFor(WidgetTester tester, String query, {Set<String> flagsOff = const {}}) async {
  await pumpApp(tester, user: asha, flagsOff: flagsOff);
  final s = await seedTrip(tester);
  await addExpense(tester, s, title: 'Moped rental', amount: 400);
  await containerOf(tester).read(tripRepositoryProvider).setNotes(s.tripId, [
    const TripNote(id: 'n1', title: 'Hotel', content: 'Check in 3pm', createdAt: 1, updatedAt: 1),
    const TripNote(id: 'n2', title: 'Visa', content: 'Bring papers', createdAt: 2, updatedAt: 2),
  ]);
  await settle(tester);
  GoRouter.of(tester.element(find.byType(Scaffold).first)).go('/');
  await settle(tester, rounds: 12);
  await tester.tap(key('trips-search-toggle'));
  await settle(tester, rounds: 4);
  await tester.enterText(find.byType(TextField).first, query);
  await settle(tester, rounds: 6);
  return s;
}

void main() {
  testApp('deep link ON: a note hit goes into the Notes tab, on the Notes pane, with the note highlighted', (
    tester,
  ) async {
    final s = await _searchFor(tester, 'visa');
    await tester.tap(find.text('Visa').first);
    await settle(tester, rounds: 14);
    expect(_path(tester), '/trip/${s.tripId}/notes');
    expect(key('note-n2'), findsOneWidget); // the checklist is the default pane, so the Notes pane was switched to
    expect(containerOf(tester).read(activityFocusProvider), isNull); // read once, then cleared
    final card = tester.widget<Container>(find.ancestor(of: key('note-n2'), matching: find.byType(Container)).first);
    expect(card.decoration, isA<BoxDecoration>()); // highlight ring
  });

  testApp('deep link ON: an expense hit goes into Spend and its focus is consumed', (tester) async {
    final s = await _searchFor(tester, 'moped');
    await tester.tap(find.text('Moped rental').first);
    await settle(tester, rounds: 14);
    expect(_path(tester), '/trip/${s.tripId}/expenses');
    expect(containerOf(tester).read(activityFocusProvider), isNull);
  });

  testApp('deep link OFF: a note hit still opens the trip, but on the checklist pane with no highlight', (
    tester,
  ) async {
    final s = await _searchFor(tester, 'visa', flagsOff: {'enableSearchDeepLink'});
    await tester.tap(find.text('Visa').first);
    await settle(tester, rounds: 14);
    expect(_path(tester), '/trip/${s.tripId}/notes');
    expect(key('note-n2'), findsNothing); // Notes pane not selected
    expect(containerOf(tester).read(activityFocusProvider), isNull);
  });
}
