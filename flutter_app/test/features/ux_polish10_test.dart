import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:trip_tracker/core/platform/motion.dart';
import 'package:trip_tracker/shared/theme/app_theme.dart';
import 'package:trip_tracker/shared/theme/app_tokens.dart';
import 'package:trip_tracker/shared/widgets/animated_money_text.dart';
import 'package:trip_tracker/shared/widgets/app_button.dart';
import 'package:trip_tracker/shared/widgets/rolling_money.dart';
import 'package:trip_tracker/shared/widgets/skeleton_loader.dart';

Widget _theme(Widget child) => MaterialApp(theme: AppTheme.light(), home: Scaffold(body: child));

void main() {
  tearDown(() {
    AppMotion.reduce = false;
    AppMotion.polish = true;
  });

  test('spacing scale is 4/8/12/16/24', () {
    final t = AppTokens.light;
    expect(t.spaceXs, 4);
    expect(t.spaceSm, 8);
    expect(t.spaceMd, 12);
    expect(t.spaceLg, 16);
    expect(t.spaceXl, 24);
  });

  testWidgets('AppMotion.hero skips when polish is off', (tester) async {
    AppMotion.polish = false;
    await tester.pumpWidget(
      _theme(
        Builder(
          builder: (context) => AppMotion.hero(
            context: context,
            tag: 'trip-title-x',
            child: const Text('Goa', key: Key('title')),
          ),
        ),
      ),
    );
    expect(find.byType(Hero), findsNothing);
    expect(find.byKey(const Key('title')), findsOneWidget);
  });

  testWidgets('AppMotion.hero wraps when polish is on', (tester) async {
    AppMotion.polish = true;
    await tester.pumpWidget(
      _theme(
        Builder(
          builder: (context) => AppMotion.hero(
            context: context,
            tag: 'trip-title-y',
            child: const Text('Manali'),
          ),
        ),
      ),
    );
    expect(find.byType(Hero), findsOneWidget);
  });

  test('form is a first-class skeleton shape', () {
    expect(SkeletonShape.values.map((s) => s.name), contains('form'));
  });

  testWidgets('rolling money and animated money sit behind RepaintBoundary', (tester) async {
    await tester.pumpWidget(
      _theme(
        Column(
          children: [
            RollingMoneyText(whole: '₹100', decimals: '', fontSize: 24, color: Colors.black),
            AnimatedMoneyText(value: 42, format: (v) => v.toStringAsFixed(0)),
          ],
        ),
      ),
    );
    expect(find.byType(RepaintBoundary), findsWidgets);
  });

  testWidgets('AppButton still taps when polish press-scale is on', (tester) async {
    AppMotion.polish = true;
    var tapped = false;
    await tester.pumpWidget(_theme(AppButton(label: 'Save', onPressed: () => tapped = true)));
    await tester.tap(find.text('Save'));
    expect(tapped, isTrue);
  });
}
