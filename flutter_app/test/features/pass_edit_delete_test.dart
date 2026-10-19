import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:trip_tracker/data/providers.dart';
import 'package:trip_tracker/domain/models/travel_pass.dart';
import 'package:trip_tracker/features/trip_details/application/trip_nav.dart';

import '../support/pump_app.dart';
import '../support/seed.dart';

Finder key(String k) => find.byKey(Key(k));

Future<void> openPasses(WidgetTester tester, Seed s) async {
  await settle(tester);
  GoRouter.of(tester.element(find.byType(Scaffold).first)).go('/trip/${s.tripId}/notes');
  await settle(tester, rounds: 14);
  await tester.tap(find.descendant(of: key('notes-panes'), matching: find.text('Passes')));
  await settle(tester, rounds: 4);
}

List<TravelPass> passesOf(WidgetTester tester, Seed s) =>
    containerOf(tester).read(tripProvider(s.tripId)).value!.passes;

const _pass = TravelPass(
  id: 'p1',
  tripId: '',
  type: 'flight',
  title: '6E 204',
  origin: 'BLR',
  destination: 'GOI',
  bookingId: 'BK-77',
  qrData: 'QR-DATA',
  createdAt: 1,
  updatedAt: 1,
);

void main() {
  Future<Seed> setup(WidgetTester tester) async {
    await pumpApp(tester, user: asha);
    final s = await seedTrip(tester);
    await containerOf(tester).read(tripRepositoryProvider).setPasses(s.tripId, [_pass.copyWith(tripId: s.tripId)]);
    await openPasses(tester, s);
    return s;
  }

  testApp('edit a pass: changes show, hidden fields (booking id, QR) are kept', (tester) async {
    final s = await setup(tester);
    await tester.tap(key('pass-menu-p1'));
    await settle(tester, rounds: 4);
    await tester.tap(find.text('Edit'));
    await settle(tester, rounds: 6);
    expect(find.text('Edit pass'), findsOneWidget);
    await tester.enterText(key('pass-to'), 'DEL');
    await tester.enterText(key('pass-seat'), '12A');
    await tester.ensureVisible(key('pass-save'));
    await tester.tap(key('pass-save'));
    await settle(tester, rounds: 8);
    final p = passesOf(tester, s).single;
    expect(p.destination, 'DEL');
    expect(p.seatOrRoom, '12A');
    expect(p.origin, 'BLR');
    expect(p.bookingId, 'BK-77');
    expect(p.qrData, 'QR-DATA');
  });

  testApp('delete asks first, removes the pass, and Undo brings it back', (tester) async {
    final s = await setup(tester);
    await tester.tap(key('pass-menu-p1'));
    await settle(tester, rounds: 4);
    await tester.tap(find.text('Delete'));
    await settle(tester, rounds: 4);
    await tester.tap(find.text('Keep'));
    await settle(tester, rounds: 4);
    expect(passesOf(tester, s), hasLength(1)); // cancelled

    await tester.tap(key('pass-menu-p1'));
    await settle(tester, rounds: 4);
    await tester.tap(find.text('Delete'));
    await settle(tester, rounds: 4);
    await tester.tap(key('pass-delete-confirm'));
    await settle(tester, rounds: 6);
    expect(passesOf(tester, s), isEmpty);
    await tester.tap(find.text('UNDO'));
    await settle(tester, rounds: 6);
    expect(passesOf(tester, s).single.id, 'p1');
  });

  testApp('flag off: no menu on the pass card', (tester) async {
    await pumpApp(tester, user: asha, flagsOff: {'enablePassEditDelete'});
    final s = await seedTrip(tester);
    await containerOf(tester).read(tripRepositoryProvider).setPasses(s.tripId, [_pass.copyWith(tripId: s.tripId)]);
    await openPasses(tester, s);
    expect(key('pass-p1'), findsOneWidget);
    expect(key('pass-menu-p1'), findsNothing);
  });
}
