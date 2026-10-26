import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:trip_tracker/core/platform/motion.dart';
import 'package:trip_tracker/shared/theme/app_theme.dart';

Future<void> _push(WidgetTester tester) async {
  await tester.pumpWidget(
    MaterialApp(
      theme: AppTheme.light().copyWith(platform: TargetPlatform.android),
      home: Builder(
        builder: (context) => TextButton(
          onPressed: () => Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => const Text('next page'))),
          child: const Text('go'),
        ),
      ),
    ),
  );
  await tester.tap(find.text('go'));
  await tester.pump();
  await tester.pump(const Duration(milliseconds: 100));
}

/// The platform zoom wraps the page in widgets whose type names contain "Zoom".
Finder _zoom() => find.ancestor(
  of: find.text('next page', skipOffstage: false),
  matching: find.byWidgetPredicate((w) => w.runtimeType.toString().contains('Zoom')),
);

void main() {
  tearDown(() => AppMotion.reduce = false);

  testWidgets('Android page transition zooms normally', (tester) async {
    await _push(tester);
    expect(_zoom(), findsWidgets);
  });

  testWidgets('with Reduce motion on, the page fades in instead of zooming', (tester) async {
    AppMotion.reduce = true;
    await _push(tester);
    expect(_zoom(), findsNothing);
    expect(
      find.ancestor(of: find.text('next page', skipOffstage: false), matching: find.byType(FadeTransition)),
      findsWidgets,
    );
  });
}
