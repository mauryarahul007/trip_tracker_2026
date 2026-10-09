import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:trip_tracker/domain/models/travel_pass.dart';
import 'package:trip_tracker/features/notes/presentation/pass_card.dart';
import 'package:trip_tracker/shared/theme/app_theme.dart';

void main() {
  testWidgets('PassCard shows route, passenger, flight and date; hides absent actions', (tester) async {
    const pass = TravelPass(
      id: 'p1',
      tripId: 't',
      type: 'flight',
      title: 'Rahul Maurya · IndiGo 6E-445 (IXB → BLR)',
      origin: 'IXB',
      destination: 'BLR',
      startDateTime: '2026-10-12T06:30:00',
      createdAt: 1,
      updatedAt: 1,
    );
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light(),
        home: const Scaffold(body: PassCard(pass: pass)),
      ),
    );
    expect(find.text('IXB  →  BLR'), findsOneWidget);
    expect(find.text('Rahul Maurya'), findsOneWidget);
    expect(find.text('IndiGo 6E-445'), findsOneWidget);
    expect(find.text('12 Oct · 06:30'), findsOneWidget);
    expect(find.byKey(const Key('pass-scan-p1')), findsNothing);
  });
}
