import 'package:flutter_test/flutter_test.dart';
import 'package:trip_tracker/domain/logic/payment_rails_logic.dart';

void main() {
  group('payment_rails_logic', () {
    test('cleanPaymentHandle strips symbols and URLs', () {
      expect(cleanPaymentHandle(PaymentRail.cashapp, r'$alice'), 'alice');
      expect(cleanPaymentHandle(PaymentRail.venmo, '@bob'), 'bob');
      expect(cleanPaymentHandle(PaymentRail.revolut, 'https://revolut.me/charlie'), 'charlie');
      expect(cleanPaymentHandle(PaymentRail.paypal, 'https://paypal.me/dan'), 'dan');
    });

    test('buildPaymentLink formats Revolut URL', () {
      final res = buildPaymentLink(
        rail: PaymentRail.revolut,
        handle: 'alex_travel',
        payeeName: 'Alex',
        amount: 50.0,
        currency: 'EUR',
      );
      expect(res.url, 'https://revolut.me/alex_travel?amount=50.00&currency=EUR');
      expect(res.isDeepLink, false);
    });

    test('buildPaymentLink formats Venmo deep link', () {
      final res = buildPaymentLink(
        rail: PaymentRail.venmo,
        handle: 'alex-doe',
        payeeName: 'Alex',
        amount: 25.5,
        currency: 'USD',
        note: 'Taxi share',
      );
      expect(res.url, contains('venmo://paycharge?txn=pay&recipients=alex-doe&amount=25.50&note=Taxi%20share'));
      expect(res.isDeepLink, true);
    });

    test('buildPaymentLink formats Cash App URL', () {
      final res = buildPaymentLink(
        rail: PaymentRail.cashapp,
        handle: r'$alex',
        payeeName: 'Alex',
        amount: 10.0,
        currency: 'USD',
      );
      expect(res.url, r'https://cash.app/$alex/10.00');
    });

    test('buildPaymentLink formats PayPal URL', () {
      final res = buildPaymentLink(
        rail: PaymentRail.paypal,
        handle: 'alex',
        payeeName: 'Alex',
        amount: 30.0,
        currency: 'GBP',
      );
      expect(res.url, 'https://paypal.me/alex/30.00GBP');
    });

    test('formatIbanCopyText produces clean wire instruction', () {
      final text = formatIbanCopyText(
        payeeName: 'Alex Doe',
        iban: 'GB29NWBK60161331926819',
        amount: 80.0,
        currency: 'EUR',
      );
      expect(text, contains('Payee: Alex Doe'));
      expect(text, contains('IBAN/Account: GB29NWBK60161331926819'));
      expect(text, contains('Amount: 80.00 EUR'));
    });
  });
}
