enum PaymentRail {
  upi,
  revolut,
  venmo,
  cashapp,
  paypal,
  iban,
}

class PaymentRailDef {
  final PaymentRail id;
  final String name;
  final String tagline;
  final String emoji;
  final List<String> supportedCurrencies;

  const PaymentRailDef({
    required this.id,
    required this.name,
    required this.tagline,
    required this.emoji,
    required this.supportedCurrencies,
  });
}

const paymentRailDefs = <PaymentRail, PaymentRailDef>{
  PaymentRail.upi: PaymentRailDef(
    id: PaymentRail.upi,
    name: 'UPI Pay',
    tagline: 'Google Pay, PhonePe, Paytm, CRED',
    emoji: '⚡',
    supportedCurrencies: ['INR'],
  ),
  PaymentRail.revolut: PaymentRailDef(
    id: PaymentRail.revolut,
    name: 'Revolut',
    tagline: 'revolut.me instant transfer',
    emoji: '🔵',
    supportedCurrencies: ['EUR', 'GBP', 'USD', 'CHF', 'PLN', 'RON', 'HUF'],
  ),
  PaymentRail.venmo: PaymentRailDef(
    id: PaymentRail.venmo,
    name: 'Venmo',
    tagline: 'Instant settlement on Venmo',
    emoji: '✌️',
    supportedCurrencies: ['USD'],
  ),
  PaymentRail.cashapp: PaymentRailDef(
    id: PaymentRail.cashapp,
    name: 'Cash App',
    tagline: r'Direct $cashtag payment',
    emoji: '💵',
    supportedCurrencies: ['USD', 'GBP'],
  ),
  PaymentRail.paypal: PaymentRailDef(
    id: PaymentRail.paypal,
    name: 'PayPal',
    tagline: 'paypal.me global link',
    emoji: '🅿️',
    supportedCurrencies: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'SGD', 'JPY'],
  ),
  PaymentRail.iban: PaymentRailDef(
    id: PaymentRail.iban,
    name: 'Bank / IBAN',
    tagline: 'Copy wire details for bank transfer',
    emoji: '🏦',
    supportedCurrencies: ['EUR', 'GBP', 'USD', 'CHF', 'AUD', 'CAD'],
  ),
};

String cleanPaymentHandle(PaymentRail rail, String raw) {
  var val = raw.trim();
  if (rail == PaymentRail.cashapp && val.startsWith(r'$')) {
    val = val.substring(1);
  }
  if ((rail == PaymentRail.venmo || rail == PaymentRail.revolut) && val.startsWith('@')) {
    val = val.substring(1);
  }
  // Strip URLs if pasted full link
  val = val.replaceAll(
    RegExp(r'^https?://(?:www\.)?(?:revolut\.me/?|paypal\.me/?|cash\.app/(?:\$)?|venmo\.com/?)', caseSensitive: false),
    '',
  );
  while (val.startsWith('/')) {
    val = val.substring(1);
  }
  return val.trim();
}

class PaymentLinkResult {
  final String url;
  final bool isDeepLink;
  final String? copyText;

  const PaymentLinkResult({
    required this.url,
    this.isDeepLink = false,
    this.copyText,
  });
}

PaymentLinkResult buildPaymentLink({
  required PaymentRail rail,
  required String handle,
  required String payeeName,
  required double amount,
  required String currency,
  String note = 'Trip Settlement',
}) {
  final clean = cleanPaymentHandle(rail, handle);
  final formattedAmount = amount.toStringAsFixed(2);
  final upperCurr = currency.toUpperCase();

  switch (rail) {
    case PaymentRail.upi:
      final encodedName = Uri.encodeComponent(payeeName.trim());
      final encodedNote = Uri.encodeComponent(note.trim());
      final uri = 'upi://pay?pa=${Uri.encodeComponent(clean)}&pn=$encodedName&am=$formattedAmount&cu=INR&tn=$encodedNote';
      return PaymentLinkResult(url: uri, isDeepLink: true);

    case PaymentRail.revolut:
      final revolutUrl = 'https://revolut.me/${Uri.encodeComponent(clean)}?amount=$formattedAmount&currency=${Uri.encodeComponent(upperCurr)}';
      return PaymentLinkResult(url: revolutUrl, isDeepLink: false);

    case PaymentRail.venmo:
      final encodedNote = Uri.encodeComponent(note);
      final venmoUri = 'venmo://paycharge?txn=pay&recipients=${Uri.encodeComponent(clean)}&amount=$formattedAmount&note=$encodedNote';
      return PaymentLinkResult(url: venmoUri, isDeepLink: true);

    case PaymentRail.cashapp:
      final cashAppUrl = 'https://cash.app/\$${Uri.encodeComponent(clean)}/$formattedAmount';
      return PaymentLinkResult(url: cashAppUrl, isDeepLink: false);

    case PaymentRail.paypal:
      final paypalUrl = 'https://paypal.me/${Uri.encodeComponent(clean)}/$formattedAmount$upperCurr';
      return PaymentLinkResult(url: paypalUrl, isDeepLink: false);

    case PaymentRail.iban:
      final copy = formatIbanCopyText(
        payeeName: payeeName,
        iban: clean,
        amount: amount,
        currency: upperCurr,
        note: note,
      );
      return PaymentLinkResult(url: 'copy:$clean', isDeepLink: false, copyText: copy);
  }
}

String formatIbanCopyText({
  required String payeeName,
  required String iban,
  required double amount,
  required String currency,
  String note = 'Trip Tracker Settlement',
}) {
  return '''Bank Transfer Settlement:
Payee: $payeeName
IBAN/Account: $iban
Amount: ${amount.toStringAsFixed(2)} $currency
Reference: $note''';
}
