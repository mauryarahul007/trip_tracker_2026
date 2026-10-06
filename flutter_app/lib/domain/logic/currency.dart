import 'package:intl/intl.dart';

const Set<String> zeroDecimalCodes = {
  'BIF', 'CLP', 'DJF', 'GNF', 'ISK', 'JPY', 'KMF', 'KRW',
  'PYG', 'RWF', 'UGX', 'VND', 'VUV', 'XAF', 'XOF', 'XPF',
};

int getCurrencyDecimals(String code) {
  return zeroDecimalCodes.contains(code.trim().toUpperCase()) ? 0 : 2;
}

String getCurrencySymbol(String code) {
  if (code.isEmpty) return '';
  switch (code.toUpperCase()) {
    case 'INR':
      return '₹';
    case 'USD':
      return '\$';
    case 'EUR':
      return '€';
    case 'GBP':
      return '£';
    case 'JPY':
      return '¥';
    default:
      return code;
  }
}


/// Rounds like ICU/`toLocaleString`: half away from zero on the *shortest
/// decimal representation* (so 1234.565 -> 1234.57), not on the binary value.
double _roundHalfExpand(double v, int decimals) {
  final s = v.abs().toString();
  if (s.contains('e') || s.contains('E')) return double.parse(v.toStringAsFixed(decimals));
  final parts = s.split('.');
  final frac = parts.length > 1 ? parts[1] : '';
  if (frac.length <= decimals) return v;
  final keep = BigInt.parse(parts[0] + frac.substring(0, decimals).padRight(decimals, '0'));
  final up = frac.codeUnitAt(decimals) >= 0x35 ? BigInt.one : BigInt.zero;
  final total = (keep + up).toString().padLeft(decimals + 1, '0');
  final cut = total.length - decimals;
  final out = decimals == 0 ? total : '${total.substring(0, cut)}.${total.substring(cut)}';
  final r = double.parse(out);
  return v < 0 ? -r : r;
}

/// Display number for an amount, grouped for [locale] (BCP-47 or ICU style,
/// default en-US). The web uses the device locale; callers pass theirs.
/// Verified against Node ICU for 8 locales (test/domain/locale_money_test.dart).
String formatMoneyNumber(double amount, [String currencyOrSymbol = '', String locale = 'en_US']) {
  final clean = currencyOrSymbol.trim();
  final decimals = clean == '¥' ? 0 : getCurrencyDecimals(clean);
  final valid = amount.isFinite ? amount : 0.0;
  final fmt = NumberFormat.decimalPatternDigits(locale: locale.replaceAll('-', '_'), decimalDigits: decimals);
  final rounded = _roundHalfExpand(valid, decimals);
  final out = fmt.format(rounded);
  // ICU "minimum grouping digits = 2": these locales leave 4-digit integers
  // ungrouped (1234,50 not 1.234,50); Dart intl does not implement that rule.
  // ponytail: only es/pt-PT/pl listed; extend if ICU diffs surface for other locales.
  final lang = locale.replaceAll('-', '_').split('_').first;
  final minGroup2 = lang == 'es' || lang == 'pl' || locale.replaceAll('-', '_') == 'pt_PT';
  if (minGroup2 && rounded.abs().truncate().toString().length == 4) {
    return out.replaceAll(fmt.symbols.GROUP_SEP, '');
  }
  return out;
}

String formatAmount(dynamic amount, String currencySymbol, [String locale = 'en_US']) {
  if (amount is num) {
    return '$currencySymbol${formatMoneyNumber(amount.toDouble(), currencySymbol, locale)}';
  }
  return '$currencySymbol$amount';
}

/// Live USD-based rates overlaid by trip custom rates. Custom wins.
Map<String, double> fxOverlay({Map<String, double>? live, Map<String, double>? custom}) => {
      ...?live,
      ...?custom,
    };

const Map<String, double> defaultExchangeRates = {
  'USD': 1.0,
  'INR': 87.25,
  'EUR': 0.92,
  'GBP': 0.78,
  'AED': 3.67,
  'THB': 35.8,
  'JPY': 154.5,
  'SGD': 1.34,
  'AUD': 1.52,
  'CAD': 1.38,
  'CHF': 0.88,
  'MYR': 4.65,
  'VND': 25400,
  'IDR': 15900,
};

class ConvertedRate {
  final double originalAmount;
  final String originalCurrency;
  final String targetCurrency;
  final double convertedAmount;
  final double rate;

  const ConvertedRate({
    required this.originalAmount,
    required this.originalCurrency,
    required this.targetCurrency,
    required this.convertedAmount,
    required this.rate,
  });

  Map<String, dynamic> toJson() => {
        'originalAmount': (originalAmount % 1 == 0) ? originalAmount.toInt() : originalAmount,
        'originalCurrency': originalCurrency,
        'targetCurrency': targetCurrency,
        'convertedAmount': (convertedAmount % 1 == 0) ? convertedAmount.toInt() : convertedAmount,
        'rate': (rate % 1 == 0) ? rate.toInt() : rate,
      };
}

ConvertedRate convertCurrency(
  double amount,
  String fromCurrency,
  String toCurrency, [
  Map<String, double>? customRates,
]) {
  final rates = {...defaultExchangeRates, ...(customRates ?? {})};
  final fromUpper = (fromCurrency.isEmpty ? 'INR' : fromCurrency).trim().toUpperCase();
  final toUpper = (toCurrency.isEmpty ? 'INR' : toCurrency).trim().toUpperCase();

  if (fromUpper == toUpper || amount == 0.0 || amount.isNaN) {
    return ConvertedRate(
      originalAmount: amount,
      originalCurrency: fromUpper,
      targetCurrency: toUpper,
      convertedAmount: amount,
      rate: 1.0,
    );
  }

  final fromRate = rates[fromUpper] ?? 1.0;
  final toRate = rates[toUpper] ?? 1.0;

  final amountInUsd = amount / fromRate;
  final convertedAmount = ((amountInUsd * toRate + 1e-7) * 100).round() / 100.0;
  final rate = (((toRate / fromRate) + 1e-7) * 10000).round() / 10000.0;

  return ConvertedRate(
    originalAmount: amount,
    originalCurrency: fromUpper,
    targetCurrency: toUpper,
    convertedAmount: convertedAmount,
    rate: rate,
  );
}

const Map<String, String> countryCurrencyMap = {
  'IN': 'INR', 'US': 'USD', 'GB': 'GBP', 'AE': 'AED', 'SG': 'SGD', 'TH': 'THB',
  'MY': 'MYR', 'ID': 'IDR', 'VN': 'VND', 'PH': 'PHP', 'LK': 'LKR', 'NP': 'NPR',
  'BT': 'BTN', 'BD': 'BDT', 'MV': 'MVR', 'JP': 'JPY', 'KR': 'KRW', 'CN': 'CNY',
  'HK': 'HKD', 'MO': 'MOP', 'TW': 'TWD', 'AU': 'AUD', 'NZ': 'NZD', 'CA': 'CAD',
  'MX': 'MXN', 'BR': 'BRL', 'AR': 'ARS', 'CL': 'CLP', 'CO': 'COP', 'PE': 'PEN',
  'DE': 'EUR', 'FR': 'EUR', 'IT': 'EUR', 'ES': 'EUR', 'PT': 'EUR', 'NL': 'EUR',
  'BE': 'EUR', 'AT': 'EUR', 'IE': 'EUR', 'GR': 'EUR', 'FI': 'EUR', 'CH': 'CHF',
  'SE': 'SEK', 'NO': 'NOK', 'DK': 'DKK', 'IS': 'ISK', 'PL': 'PLN', 'CZ': 'CZK',
  'HU': 'HUF', 'RO': 'RON', 'TR': 'TRY', 'RU': 'RUB', 'UA': 'UAH', 'EG': 'EGP',
  'ZA': 'ZAR', 'KE': 'KES', 'TZ': 'TZS', 'MA': 'MAD', 'NG': 'NGN', 'GHS': 'GHS',
  'IL': 'ILS', 'SA': 'SAR', 'QA': 'QAR', 'KW': 'KWD', 'BH': 'BHD', 'OM': 'OMR',
  'JO': 'JOD', 'LB': 'LBP', 'PK': 'PKR', 'KZ': 'KZT', 'GE': 'GEL', 'AM': 'AMD',
  'AZ': 'AZN', 'UZ': 'UZS', 'FJ': 'FJD', 'MU': 'MUR', 'SC': 'SCR', 'KH': 'KHR',
  'LA': 'LAK', 'MM': 'MMK', 'MN': 'MNT',
};

String? currencyForCountryCode(String? countryCode) {
  if (countryCode == null || countryCode.isEmpty) return null;
  return countryCurrencyMap[countryCode.toUpperCase()];
}
