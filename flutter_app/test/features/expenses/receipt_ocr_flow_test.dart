import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:trip_tracker/core/platform/ocr_gateway.dart';
import 'package:trip_tracker/domain/logic/receipt_ocr_service.dart';
import 'package:trip_tracker/features/expenses/presentation/receipt_ocr_modal.dart';

void main() {
  group('Receipt OCR Modal and Flow', () {
    const sampleReceiptText = '''
Blue Tokai Coffee
Date: 2026-11-04
Flat White 280.00
Croissant 190.00
CGST 23.50
Total 493.50
''';

    testWidgets('parses text input and applies parsed data via callback', (tester) async {
      ParsedReceiptData? appliedData;

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            ocrGatewayProvider.overrideWithValue(FakeOcrGateway(cannedText: sampleReceiptText)),
          ],
          child: MaterialApp(
            home: Scaffold(
              body: ReceiptOcrModal(
                tripId: 't-1',
                onApplyReceipt: (data) => appliedData = data,
                defaultMemberIds: const ['m-1'],
              ),
            ),
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.text('Scan & Itemize Receipt'), findsOneWidget);
      expect(find.byKey(const Key('btn_parse_receipt')), findsOneWidget);
      expect(find.byKey(const Key('btn_scan_receipt_image')), findsOneWidget);

      // Enter sample receipt text into input
      await tester.enterText(find.byKey(const Key('receipt_text_input')), sampleReceiptText);
      await tester.pumpAndSettle();

      // Tap Parse Text
      await tester.tap(find.byKey(const Key('btn_parse_receipt')));
      await tester.pumpAndSettle();

      // Verify detected items & total
      expect(find.text('Blue Tokai'), findsOneWidget);
      expect(find.text('Flat White'), findsOneWidget);
      expect(find.text('Croissant'), findsOneWidget);
      expect(find.text('493.50'), findsWidgets);

      // Tap Apply Receipt
      final applyBtn = find.byKey(const Key('btn_apply_receipt'));
      expect(applyBtn, findsOneWidget);
      await tester.tap(applyBtn);
      await tester.pumpAndSettle();

      expect(appliedData, isNotNull);
      expect(appliedData!.merchant, equals('Blue Tokai'));
      expect(appliedData!.total, equals(493.50));
      expect(appliedData!.items.length, equals(2));
      expect(appliedData!.date, equals('2026-11-04'));
    });

    testWidgets('clicking scan camera/photo runs OCR gateway recognition', (tester) async {
      ParsedReceiptData? appliedData;
      final fakeOcr = FakeOcrGateway(cannedText: sampleReceiptText);

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            ocrGatewayProvider.overrideWithValue(fakeOcr),
          ],
          child: MaterialApp(
            home: Scaffold(
              body: ReceiptOcrModal(
                tripId: 't-1',
                onApplyReceipt: (data) => appliedData = data,
                defaultMemberIds: const ['m-1'],
              ),
            ),
          ),
        ),
      );

      await tester.pumpAndSettle();

      // Tap Scan Camera/Photo
      await tester.tap(find.byKey(const Key('btn_scan_receipt_image')));
      await tester.pumpAndSettle();

      expect(fakeOcr.recognizeCallCount, equals(1));
      expect(find.text('Blue Tokai'), findsOneWidget);
      expect(find.text('493.50'), findsWidgets);

      // Apply
      await tester.tap(find.byKey(const Key('btn_apply_receipt')));
      await tester.pumpAndSettle();

      expect(appliedData, isNotNull);
      expect(appliedData!.total, equals(493.50));
    });
  });
}
