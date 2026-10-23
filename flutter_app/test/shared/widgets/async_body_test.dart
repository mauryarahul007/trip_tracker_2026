import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:trip_tracker/l10n/app_localizations.dart';
import 'package:trip_tracker/shared/theme/app_theme.dart';
import 'package:trip_tracker/shared/widgets/async_body.dart';
import 'package:trip_tracker/shared/widgets/skeleton_loader.dart';

Widget host(AsyncValue<int> v, {VoidCallback? onRetry}) => MaterialApp(
  theme: AppTheme.light(),
  localizationsDelegates: const [
    AppLocalizations.delegate,
    GlobalMaterialLocalizations.delegate,
    GlobalWidgetsLocalizations.delegate,
  ],
  supportedLocales: AppLocalizations.supportedLocales,
  home: Scaffold(
    body: AsyncBody<int>(value: v, onRetry: onRetry ?? () {}, builder: (_, n) => Text('n=$n')),
  ),
);

void main() {
  testWidgets('loading shows skeleton rows, not a spinner', (tester) async {
    await tester.pumpWidget(host(const AsyncLoading()));
    expect(find.byType(SkeletonLoader), findsNWidgets(3));
    expect(find.byType(CircularProgressIndicator), findsNothing);
  });

  testWidgets('error shows the message and Retry calls onRetry', (tester) async {
    var retried = 0;
    await tester.pumpWidget(host(const AsyncError<int>('boom', StackTrace.empty), onRetry: () => retried++));
    expect(find.byKey(const Key('async-error')), findsOneWidget);
    expect(find.text('boom'), findsNothing); // raw errors never reach the user
    await tester.tap(find.text('Retry'));
    expect(retried, 1);
  });

  testWidgets('data renders the builder', (tester) async {
    await tester.pumpWidget(host(const AsyncData(7)));
    expect(find.text('n=7'), findsOneWidget);
  });
}
