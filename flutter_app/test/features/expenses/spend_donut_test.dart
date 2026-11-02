import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:trip_tracker/features/expenses/presentation/widgets/spend_donut.dart';
import 'package:trip_tracker/shared/theme/app_theme.dart';

void main() {
  group('SpendDonut.segmentAt', () {
    const size = 200.0;
    const values = [50.0, 30.0, 20.0]; // 50% from 12 o'clock clockwise, then 30%, then 20%

    test('maps a point on the ring to its segment', () {
      expect(SpendDonut.segmentAt(const Offset(190, 100), size, values), 0); // 3 o'clock is inside the first half
      expect(SpendDonut.segmentAt(const Offset(10, 100), size, values), 1); // 9 o'clock, 75%
      expect(SpendDonut.segmentAt(const Offset(60, 20), size, values), 2); // near 11 o'clock, 91%
    });

    test('the middle and the outside are not a segment', () {
      expect(SpendDonut.segmentAt(const Offset(100, 100), size, values), isNull);
      expect(SpendDonut.segmentAt(const Offset(-20, -20), size, values), isNull);
    });

    test('an empty donut has no segments', () {
      expect(SpendDonut.segmentAt(const Offset(190, 100), size, const [0, 0]), isNull);
    });
  });

  group('SpendDonut widget', () {
    Widget host(Widget child) => MaterialApp(
      theme: AppTheme.light(),
      home: Scaffold(body: Center(child: child)),
    );

    testWidgets('tapping a segment reports it and tapping the middle clears it', (tester) async {
      final taps = <int?>[];
      await tester.pumpWidget(
        host(
          SpendDonut(
            values: const [50, 30, 20],
            colors: const [Colors.red, Colors.green, Colors.blue],
            centerLabel: 'Total',
            centerValue: '100',
            onSegmentTap: taps.add,
          ),
        ),
      );
      final box = tester.getRect(find.byType(SpendDonut));
      await tester.tapAt(Offset(box.right - 8, box.center.dy));
      await tester.tapAt(box.center);
      expect(taps, [0, null]);
    });

    testWidgets('without a handler tapping does nothing', (tester) async {
      await tester.pumpWidget(
        host(
          const SpendDonut(values: [1, 1], colors: [Colors.red, Colors.green], centerLabel: 'Total', centerValue: '2'),
        ),
      );
      await tester.tapAt(tester.getRect(find.byType(SpendDonut)).center);
      expect(tester.takeException(), isNull);
    });

    testWidgets('a legend badge is a button of at least 48dp when tappable', (tester) async {
      var tapped = 0;
      await tester.pumpWidget(
        host(DonutLegendBadge(label: 'Dining 20%', color: Colors.orange, selected: true, onTap: () => tapped++)),
      );
      expect(tester.getSize(find.byType(DonutLegendBadge)).height, greaterThanOrEqualTo(48));
      await tester.tap(find.text('Dining 20%'));
      expect(tapped, 1);
    });
  });
}
