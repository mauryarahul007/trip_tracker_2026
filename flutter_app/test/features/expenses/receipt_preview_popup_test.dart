import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:trip_tracker/shared/widgets/receipt_photo_viewer_dialog.dart';

void main() {
  group('ReceiptPhotoViewerDialog', () {
    testWidgets('renders fullscreen dialog, zoom view and close button', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Builder(
              builder: (context) => ElevatedButton(
                key: const Key('open-dialog'),
                onPressed: () => showReceiptPhotoViewer(
                  context,
                  previewPath: 'https://example.com/receipt.jpg',
                  title: 'Dinner Bill',
                  subtitle: '2026-10-19 · ₹1,200',
                ),
                child: const Text('Open'),
              ),
            ),
          ),
        ),
      );

      // Tap button to show dialog
      await tester.tap(find.byKey(const Key('open-dialog')));
      await tester.pumpAndSettle();

      expect(find.byKey(const Key('receipt-photo-viewer')), findsOneWidget);
      expect(find.text('Dinner Bill'), findsOneWidget);
      expect(find.text('2026-10-19 · ₹1,200'), findsOneWidget);
      expect(find.byKey(const Key('receipt-photo-close')), findsOneWidget);

      // Tap close button
      await tester.tap(find.byKey(const Key('receipt-photo-close')));
      await tester.pumpAndSettle();

      expect(find.byKey(const Key('receipt-photo-viewer')), findsNothing);
    });
  });
}
