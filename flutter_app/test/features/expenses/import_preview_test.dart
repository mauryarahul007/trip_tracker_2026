import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:trip_tracker/features/expenses/presentation/widgets/import_preview_sheet.dart';
import 'package:trip_tracker/l10n/app_localizations.dart';
import 'package:trip_tracker/shared/theme/app_theme.dart';

Widget _host(ImportPreview preview, ValueChanged<bool> onResult) => MaterialApp(
  theme: AppTheme.light(),
  localizationsDelegates: AppLocalizations.localizationsDelegates,
  supportedLocales: AppLocalizations.supportedLocales,
  home: Builder(
    builder: (context) => Scaffold(
      body: Center(
        child: TextButton(
          key: const Key('open'),
          onPressed: () async => onResult(await showImportPreview(context, preview: preview, currency: 'INR')),
          child: const Text('open'),
        ),
      ),
    ),
  ),
);

const _rows = [
  ImportPreviewRow(date: '12 Nov', title: 'Beach shack', amount: 3240),
  ImportPreviewRow(date: '12 Nov', title: 'Scooter rent', amount: 1800),
  ImportPreviewRow(date: '13 Nov', title: 'Fort entry', amount: 600),
  ImportPreviewRow(date: '13 Nov', title: 'Fourth row', amount: 10),
];

void main() {
  testWidgets('shows the first three rows and the total count, confirm returns true', (tester) async {
    bool? result;
    await tester.pumpWidget(
      _host(const ImportPreview(source: 'Splitwise CSV', rows: _rows, note: 'Kabir not found'), (v) => result = v),
    );
    await tester.tap(find.byKey(const Key('open')));
    await tester.pumpAndSettle();
    expect(find.text('Beach shack'), findsOneWidget);
    expect(find.text('Fort entry'), findsOneWidget);
    expect(find.text('Fourth row'), findsNothing);
    expect(find.text('Import 4 expenses'), findsOneWidget);
    expect(find.text('Kabir not found'), findsOneWidget);
    await tester.tap(find.byKey(const Key('import-confirm')));
    await tester.pumpAndSettle();
    expect(result, isTrue);
  });

  testWidgets('dismissing the sheet returns false and an empty file cannot be confirmed', (tester) async {
    bool? result;
    await tester.pumpWidget(_host(const ImportPreview(source: 'backup', rows: []), (v) => result = v));
    await tester.tap(find.byKey(const Key('open')));
    await tester.pumpAndSettle();
    expect(find.text('Import 0 expenses'), findsOneWidget);
    await tester.tapAt(const Offset(10, 10)); // barrier
    await tester.pumpAndSettle();
    expect(result, isFalse);
  });
}
