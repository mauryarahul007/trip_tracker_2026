import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:trip_tracker/data/providers.dart';
import 'package:trip_tracker/l10n/app_localizations.dart';
import 'package:trip_tracker/shared/theme/app_theme.dart';
import 'package:trip_tracker/shared/widgets/app_sheet.dart';
import 'package:trip_tracker/shared/widgets/discard_guard.dart';

import '../../support/fakes.dart';

class _Sheet extends StatefulWidget {
  const _Sheet();
  @override
  State<_Sheet> createState() => _SheetState();
}

class _SheetState extends State<_Sheet> {
  final c = TextEditingController(text: 'start');
  @override
  Widget build(BuildContext context) => DiscardGuard(
    controllers: [c],
    initial: const ['start'],
    child: Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        TextField(controller: c),
        TextButton(onPressed: () => Navigator.pop(context, 'saved'), child: const Text('Save')),
      ],
    ),
  );
}

Future<void> openSheet(WidgetTester tester, {Set<String> flagsOff = const {}}) async {
  await tester.pumpWidget(
    ProviderScope(
      overrides: [flagsRepositoryProvider.overrideWithValue(FakeFlags(const {}, flagsOff))],
      child: MaterialApp(
        theme: AppTheme.light(),
        localizationsDelegates: const [
          AppLocalizations.delegate,
          GlobalMaterialLocalizations.delegate,
          GlobalWidgetsLocalizations.delegate,
        ],
        supportedLocales: AppLocalizations.supportedLocales,
        home: Builder(
          builder: (context) => Scaffold(
            body: TextButton(
              onPressed: () =>
                  AppSheet.show<String>(context: context, enableDrag: false, builder: (_) => const _Sheet()),
              child: const Text('open'),
            ),
          ),
        ),
      ),
    ),
  );
  await tester.tap(find.text('open'));
  await tester.pumpAndSettle();
}

void main() {
  testWidgets('a clean sheet closes freely; Save pops without asking', (tester) async {
    await openSheet(tester);
    await tester.tapAt(const Offset(10, 10)); // barrier
    await tester.pumpAndSettle();
    expect(find.byType(TextField), findsNothing);
    expect(find.text('Discard changes?'), findsNothing);
  });

  testWidgets('a dirty sheet asks before closing by tapping outside; Keep editing keeps it', (tester) async {
    await openSheet(tester);
    await tester.enterText(find.byType(TextField), 'typed');
    await tester.pump();
    await tester.tapAt(const Offset(10, 10));
    await tester.pumpAndSettle();
    expect(find.text('Discard changes?'), findsOneWidget);
    await tester.tap(find.text('Keep editing'));
    await tester.pumpAndSettle();
    expect(find.byType(TextField), findsOneWidget);
    expect(find.text('typed'), findsOneWidget);
  });

  testWidgets('drag is off for guarded sheets; the system back button asks, Discard closes', (tester) async {
    await openSheet(tester);
    await tester.enterText(find.byType(TextField), 'typed');
    await tester.pump();
    await tester.fling(find.byType(TextField), const Offset(0, 600), 2000);
    await tester.pumpAndSettle();
    expect(find.byType(TextField), findsOneWidget); // a swipe cannot bypass the guard
    await tester.binding.handlePopRoute();
    await tester.pumpAndSettle();
    expect(find.text('Discard changes?'), findsOneWidget);
    await tester.tap(find.text('Discard'));
    await tester.pumpAndSettle();
    expect(find.byType(TextField), findsNothing);
  });

  testWidgets('the Save button closes a dirty sheet without asking', (tester) async {
    await openSheet(tester);
    await tester.enterText(find.byType(TextField), 'typed');
    await tester.pump();
    await tester.tap(find.text('Save'));
    await tester.pumpAndSettle();
    expect(find.text('Discard changes?'), findsNothing);
    expect(find.byType(TextField), findsNothing);
  });

  testWidgets('flag off: no guard, a dirty sheet closes freely', (tester) async {
    await openSheet(tester, flagsOff: {'enablePersistentExpenseDraft'});
    await tester.enterText(find.byType(TextField), 'typed');
    await tester.pump();
    await tester.tapAt(const Offset(10, 10));
    await tester.pumpAndSettle();
    expect(find.text('Discard changes?'), findsNothing);
    expect(find.byType(TextField), findsNothing);
  });
}
