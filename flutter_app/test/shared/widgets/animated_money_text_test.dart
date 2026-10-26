import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:trip_tracker/core/platform/motion.dart';
import 'package:trip_tracker/shared/widgets/animated_money_text.dart';

Widget _host(double v) => MaterialApp(
  home: AnimatedMoneyText(value: v, format: (x) => '₹${x.round()}'),
);

void main() {
  tearDown(() => AppMotion.reduce = false);

  testWidgets('first build shows the figure, a change counts up to it and ends exactly on it', (tester) async {
    await tester.pumpWidget(_host(100));
    expect(find.text('₹100'), findsOneWidget);
    await tester.pumpWidget(_host(500));
    await tester.pump(const Duration(milliseconds: 200));
    final mid = int.parse(tester.widget<Text>(find.byType(Text)).data!.substring(1));
    expect(mid, inExclusiveRange(100, 500));
    await tester.pumpAndSettle();
    expect(find.text('₹500'), findsOneWidget);
  });

  testWidgets('with Reduce motion on it jumps straight to the new figure', (tester) async {
    AppMotion.reduce = true;
    await tester.pumpWidget(_host(100));
    await tester.pumpWidget(_host(500));
    await tester.pump(const Duration(milliseconds: 16));
    expect(find.text('₹500'), findsOneWidget);
  });
}
