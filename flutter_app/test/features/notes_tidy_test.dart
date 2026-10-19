import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:trip_tracker/data/providers.dart';
import 'package:trip_tracker/domain/models/trip_note.dart';
import 'package:trip_tracker/features/trip_details/application/trip_nav.dart';

import '../support/pump_app.dart';
import '../support/seed.dart';

Finder key(String k) => find.byKey(Key(k));

Future<Seed> setup(WidgetTester tester, {Set<String> flagsOff = const {}}) async {
  await pumpApp(tester, user: asha, flagsOff: flagsOff);
  final s = await seedTrip(tester);
  await containerOf(tester).read(tripRepositoryProvider).setNotes(s.tripId, [
    const TripNote(id: 'n1', title: 'Hotel', content: 'Check in 3pm', createdAt: 1, updatedAt: 1),
    const TripNote(id: 'n2', title: 'Visa', content: 'Bring papers', createdAt: 2, updatedAt: 2),
  ]);
  await settle(tester);
  GoRouter.of(tester.element(find.byType(Scaffold).first)).go('/trip/${s.tripId}/notes');
  await settle(tester, rounds: 14);
  await tester.tap(find.descendant(of: key('notes-panes'), matching: find.textContaining('Notes')));
  await settle(tester, rounds: 4);
  return s;
}

List<TripNote> notesOf(WidgetTester tester, Seed s) => containerOf(tester).read(tripProvider(s.tripId)).value!.notes;

void main() {
  testApp('tidy notes: pin moves a note to the top, delete has Undo', (tester) async {
    final s = await setup(tester);
    expect(find.text('Notes (2)'), findsNothing); // label is split into name and count
    expect(find.text(' (2)'), findsWidgets);
    await tester.tap(key('note-menu-n2'));
    await settle(tester, rounds: 4);
    await tester.tap(find.text('Pin to top'));
    await settle(tester, rounds: 6);
    expect(notesOf(tester, s).firstWhere((n) => n.id == 'n2').isPinned, isTrue);
    expect(tester.getTopLeft(key('note-n2')).dy, lessThan(tester.getTopLeft(key('note-n1')).dy));

    await tester.tap(key('note-menu-n1'));
    await settle(tester, rounds: 4);
    await tester.tap(find.text('Delete'));
    await settle(tester, rounds: 6);
    expect(notesOf(tester, s).map((n) => n.id), ['n2']);
    await tester.tap(find.text('UNDO'));
    await settle(tester, rounds: 6);
    expect(notesOf(tester, s), hasLength(2));
  });

  testApp('flag off: plain note cards, no menu', (tester) async {
    await setup(tester, flagsOff: {'enableTidyNotes'});
    expect(key('note-n1'), findsOneWidget);
    expect(key('note-menu-n1'), findsNothing);
  });

  testApp('one Add control per pane: the floating button, not a second one in the page', (tester) async {
    await setup(tester);
    expect(key('notes-fab'), findsOneWidget);
    expect(key('note-add'), findsNothing);
    await tester.tap(find.descendant(of: key('notes-panes'), matching: find.textContaining('Check')));
    await settle(tester, rounds: 4);
    expect(key('notes-fab'), findsOneWidget);
    expect(key('check-add'), findsNothing);
  });

  testApp('floating Add off: the in-page buttons come back', (tester) async {
    await setup(tester, flagsOff: {'enableContextFab'});
    expect(key('notes-fab'), findsNothing);
    expect(key('note-add'), findsOneWidget);
  });
}
