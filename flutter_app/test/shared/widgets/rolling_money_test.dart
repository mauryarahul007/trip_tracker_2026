import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:trip_tracker/shared/widgets/rolling_money.dart';

Widget host(String whole, {String? key}) => MaterialApp(
  home: Scaffold(
    body: Center(
      child: RollingMoneyText(whole: whole, decimals: '.00', fontSize: 40, color: Colors.black, memoryKey: key),
    ),
  ),
);

void main() {
  testWidgets('shows the figure for accessibility as one label', (tester) async {
    await tester.pumpWidget(host('₹60'));
    expect(tester.getSemantics(find.byKey(const Key('rolling-money'))).label, '₹60.00');
  });

  testWidgets('a change rolls: old and new digits are on screen mid-animation, only the new at the end', (
    tester,
  ) async {
    await tester.pumpWidget(host('₹60'));
    expect(find.text('6'), findsOneWidget);
    await tester.pumpWidget(host('₹90'));
    await tester.pump(const Duration(milliseconds: 120));
    expect(find.text('6'), findsOneWidget); // leaving
    expect(find.text('9'), findsOneWidget); // arriving
    await tester.pump(const Duration(milliseconds: 600));
    expect(find.text('6'), findsNothing);
    expect(find.text('9'), findsOneWidget);
  });

  testWidgets('coming back to the screen rolls from the remembered figure', (tester) async {
    await tester.pumpWidget(host('₹60', key: 'trip-a'));
    await tester.pumpWidget(const SizedBox()); // the page goes away
    await tester.pumpWidget(host('₹90', key: 'trip-a')); // and returns with a new balance
    expect(find.text('6'), findsOneWidget); // starts from what was shown last
    await tester.pump(const Duration(milliseconds: 120));
    await tester.pump(const Duration(milliseconds: 700));
    expect(find.text('6'), findsNothing);
    expect(find.text('9'), findsOneWidget);
  });
}
