import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:trip_tracker/shared/widgets/boarding_pass_card.dart';
import 'package:trip_tracker/shared/widgets/flight_progress_runway.dart';
import 'package:trip_tracker/shared/widgets/luggage_stub_tile.dart';
import 'package:trip_tracker/shared/widgets/status_stamp.dart';
import 'package:trip_tracker/shared/widgets/ticket_scallop_divider.dart';

void main() {
  testWidgets('TicketScallopDivider paints cleanly without errors', (tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: Center(
            child: TicketScallopDivider(notchRadius: 10, cardColor: Colors.black, cutoutColor: Colors.grey),
          ),
        ),
      ),
    );

    expect(find.byType(TicketScallopDivider), findsOneWidget);
  });

  testWidgets('StatusStamp renders SETTLED and NOT SETTLED correctly', (tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: Column(
            children: [
              StatusStamp(key: Key('stamp-settled'), settled: true, text: 'SETTLED'),
              StatusStamp(key: Key('stamp-not-settled'), settled: false, text: 'NOT SETTLED'),
            ],
          ),
        ),
      ),
    );

    expect(find.text('SETTLED'), findsOneWidget);
    expect(find.text('NOT SETTLED'), findsOneWidget);
  });

  testWidgets('FlightProgressRunway displays progress and amounts', (tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: FlightProgressRunway(
            settledAmount: '₹3,000',
            totalAmount: '₹6,000',
            settledLabel: 'Settled',
            totalLabel: 'Total',
            progress: 0.5,
            remainingTransfers: 1,
            remainingLabel: '1 transfer remaining',
          ),
        ),
      ),
    );

    expect(find.text('RUNWAY PROGRESS'), findsOneWidget);
    expect(find.text('50% CLEARED'), findsOneWidget);
    expect(find.text('₹3,000'), findsOneWidget);
    expect(find.text('₹6,000'), findsOneWidget);
    expect(find.text('1 transfer remaining'), findsOneWidget);
  });

  testWidgets('BoardingPassCard renders top and stub with scallop divider', (tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: BoardingPassCard(top: Text('Boarding Pass Top Segment'), stub: Text('Boarding Pass Stub Segment')),
        ),
      ),
    );

    expect(find.text('Boarding Pass Top Segment'), findsOneWidget);
    expect(find.text('Boarding Pass Stub Segment'), findsOneWidget);
    expect(find.byType(TicketScallopDivider), findsOneWidget);
  });

  testWidgets('LuggageStubTile renders route, amount, and handles settle action', (tester) async {
    var settled = false;
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: LuggageStubTile(
            fromName: 'Ben',
            toName: 'Asha',
            fromLabel: 'From',
            toLabel: 'To',
            caption: 'Ben pays Asha',
            amountText: '₹30.00',
            settleLabel: 'Settle',
            settleKey: const Key('settle-btn'),
            onSettle: () => settled = true,
          ),
        ),
      ),
    );

    expect(find.text('Ben'), findsOneWidget);
    expect(find.text('Asha'), findsOneWidget);
    expect(find.text('Ben pays Asha'), findsOneWidget);
    expect(find.text('₹30.00'), findsOneWidget);
    expect(find.byKey(const Key('settle-btn')), findsOneWidget);

    await tester.tap(find.byKey(const Key('settle-btn')));
    expect(settled, isTrue);
  });
}
