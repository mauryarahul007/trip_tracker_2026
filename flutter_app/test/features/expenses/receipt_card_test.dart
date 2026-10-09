import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:trip_tracker/shared/theme/app_theme.dart';
import 'package:trip_tracker/shared/widgets/receipt_card.dart';

void main() {
  testWidgets('ReceiptCard renders body, and the footer only when given', (tester) async {
    Future<void> pump(Widget? footer) => tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.dark(),
        home: Scaffold(
          body: ReceiptCard(body: const Text('body'), footer: footer),
        ),
      ),
    );
    await pump(null);
    expect(find.text('body'), findsOneWidget);
    expect(find.text('footer'), findsNothing);
    await pump(const Text('footer'));
    expect(find.text('footer'), findsOneWidget);
  });
}
