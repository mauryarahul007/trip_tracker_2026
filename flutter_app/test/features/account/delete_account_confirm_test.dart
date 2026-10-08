import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:trip_tracker/features/account/presentation/delete_account_screen.dart';
import 'package:trip_tracker/shared/theme/app_theme.dart';
import 'package:trip_tracker/shared/widgets/app_button.dart';

void main() {
  testWidgets('delete button stays disabled until DELETE is typed', (tester) async {
    await tester.pumpWidget(
      ProviderScope(
        child: MaterialApp(theme: AppTheme.light(), home: const DeleteAccountScreen()),
      ),
    );
    AppButton button() => tester.widget<AppButton>(find.widgetWithText(AppButton, 'Permanently Delete My Account'));

    expect(button().onPressed, isNull);
    await tester.enterText(find.byKey(const Key('delete-confirm')), 'dele');
    await tester.pump();
    expect(button().onPressed, isNull);
    await tester.enterText(find.byKey(const Key('delete-confirm')), 'delete');
    await tester.pump();
    expect(button().onPressed, isNotNull);
  });
}
