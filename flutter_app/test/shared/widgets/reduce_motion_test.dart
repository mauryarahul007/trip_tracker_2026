import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:trip_tracker/core/platform/motion.dart';
import 'package:trip_tracker/shared/widgets/bento_tile.dart';

void main() {
  tearDown(() => AppMotion.reduce = false);

  Future<double> opacityAfterOneFrame(WidgetTester tester) async {
    await tester.pumpWidget(const MaterialApp(home: BentoEntrance(index: 3, child: Text('tile'))));
    await tester.pump(const Duration(milliseconds: 16));
    return tester.widget<Opacity>(find.byType(Opacity)).opacity;
  }

  testWidgets('with the Reduce motion setting on, an entrance animation is already finished', (tester) async {
    AppMotion.reduce = true;
    expect(await opacityAfterOneFrame(tester), 1);
  });

  testWidgets('with it off, the entrance is still in progress after one frame', (tester) async {
    expect(await opacityAfterOneFrame(tester), lessThan(1));
  });
}
