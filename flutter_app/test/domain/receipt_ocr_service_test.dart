import 'package:flutter_test/flutter_test.dart';
import 'package:trip_tracker/domain/logic/receipt_ocr_service.dart';

void main() {
  group('ReceiptOcrService Pure Logic', () {
    test('parses line items, subtotal, taxes, tip, and total from restaurant bill', () {
      const sample = '''
Starbucks Coffee
Store #4412
Date: 2026-04-12

Caffe Latte         240.00
Blueberry Muffin    180.00
Veg Sandwich        290.00
Subtotal            710.00
CGST 2.5%            17.75
SGST 2.5%            17.75
Tip                  50.00
Grand Total         795.50
Thank you for visiting!
''';

      final parsed = parseReceiptText(sample, ['m1', 'm2']);
      expect(parsed.merchant, 'Starbucks');
      expect(parsed.date, '2026-04-12');
      expect(parsed.items.length, 3);
      expect(parsed.items[0].name, 'Caffe Latte');
      expect(parsed.items[0].amount, 240.0);
      expect(parsed.items[0].assignedMemberIds, ['m1', 'm2']);
      expect(parsed.items[1].name, 'Blueberry Muffin');
      expect(parsed.items[1].amount, 180.0);
      expect(parsed.items[2].name, 'Veg Sandwich');
      expect(parsed.items[2].amount, 290.0);
      expect(parsed.subtotal, 710.0);
      expect(parsed.tax, closeTo(35.5, 0.01));
      expect(parsed.tip, 50.0);
      expect(parsed.total, 795.50);
      expect(parsed.amount, 795.50);
      expect(parsed.confidence, 0.95);
    });

    test('parses receipt with discount and currency symbols', () {
      const sample = '''
Pizza Hut
1x Margherita Pizza ₹450.00
1x Garlic Bread Sticks ₹150.00
Discount Promo -₹50.00
VAT Tax ₹30.00
Total Due ₹580.00
''';

      final parsed = parseReceiptText(sample);
      expect(parsed.merchant, 'Pizza Hut');
      expect(parsed.items.length, 2);
      expect(parsed.items[0].name, '1x Margherita Pizza');
      expect(parsed.items[0].amount, 450.0);
      expect(parsed.items[1].name, '1x Garlic Bread Sticks');
      expect(parsed.items[1].amount, 150.0);
      expect(parsed.discount, 50.0);
      expect(parsed.tax, 30.0);
      expect(parsed.total, 580.0);
    });

    test('falls back to summing items when grand total is missing', () {
      const sample = '''
Local Cafe
Coffee 5.50
Bagel 4.50
Juice 6.00
''';

      final parsed = parseReceiptText(sample);
      expect(parsed.items.length, 3);
      expect(parsed.subtotal, 16.0);
      expect(parsed.total, 16.0);
      expect(parsed.merchant, 'Local Cafe');
    });

    test('parseScannedReceipt throws on empty input', () {
      expect(
        () => parseScannedReceipt('   \n  '),
        throwsA(isA<ReceiptOcrException>().having((e) => e.reason, 'reason', ReceiptOcrFailure.empty)),
      );
    });

    test('parseScannedReceipt throws on unreadable receipt without prices', () {
      const garbage = '''
Some random text
Hello world
No numbers here
Goodbye
''';
      expect(
        () => parseScannedReceipt(garbage),
        throwsA(isA<ReceiptOcrException>().having((e) => e.reason, 'reason', ReceiptOcrFailure.unreadable)),
      );
    });
  });
}
