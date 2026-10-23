import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:trip_tracker/core/errors/tab_error_boundary.dart';
import 'package:trip_tracker/l10n/app_localizations.dart';
import 'package:trip_tracker/shared/theme/app_theme.dart';

var broken = true;

class Flaky extends StatelessWidget {
  const Flaky({super.key});
  @override
  Widget build(BuildContext context) {
    if (broken) throw StateError('tab exploded');
    return const Text('tab ok');
  }
}

Widget host(Widget body) => MaterialApp(
  theme: AppTheme.light(),
  localizationsDelegates: const [
    AppLocalizations.delegate,
    GlobalMaterialLocalizations.delegate,
    GlobalWidgetsLocalizations.delegate,
  ],
  supportedLocales: AppLocalizations.supportedLocales,
  home: Scaffold(body: body),
);

void main() {
  final original = ErrorWidget.builder;
  setUp(() {
    broken = true;
    installInPlaceErrorWidget();
  });
  tearDown(() => ErrorWidget.builder = original);

  testWidgets('a failing tab shows Retry in place, siblings keep working, Retry rebuilds', (tester) async {
    await tester.pumpWidget(
      host(
        const Column(
          children: [
            Text('header ok'),
            Expanded(child: TabErrorBoundary(child: Flaky())),
          ],
        ),
      ),
    );
    expect(tester.takeException(), isA<StateError>());
    expect(find.byKey(const Key('tab-error')), findsOneWidget);
    expect(find.text('header ok'), findsOneWidget);
    expect(find.textContaining('exploded'), findsNothing); // no raw error text for the user

    broken = false;
    await tester.tap(find.text('Retry'));
    await tester.pump();
    expect(find.text('tab ok'), findsOneWidget);
    expect(find.byKey(const Key('tab-error')), findsNothing);
  });

  testWidgets('outside a boundary the framework error widget is unchanged', (tester) async {
    await tester.pumpWidget(host(const Flaky()));
    expect(tester.takeException(), isA<StateError>());
    expect(find.byKey(const Key('tab-error')), findsNothing);
    expect(find.byType(ErrorWidget), findsOneWidget);
  });
}
