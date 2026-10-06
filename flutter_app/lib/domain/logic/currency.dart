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

String _insertCommas(String intStr) {
  final isNegative = intStr.startsWith('-');
  final digits = isNegative ? intStr.substring(1) : intStr;
  final buffer = StringBuffer();
  for (int i = 0; i < digits.length; i++) {
    if (i > 0 && (digits.length - i) % 3 == 0) {
      buffer.write(',');
    }
    buffer.write(digits[i]);
  }
  return isNegative ? '-$buffer' : buffer.toString();
}

String formatMoneyNumber(double amount, [String currencyOrSymbol = '']) {
  final clean = currencyOrSymbol.trim();
  final decimals = clean == '¥' ? 0 : getCurrencyDecimals(clean);
  final validAmount = amount.isFinite ? amount : 0.0;

  if (decimals == 0) {
    final rounded = validAmount.round();
    return _insertCommas(rounded.toString());
  } else {
    final fixed = validAmount.toStringAsFixed(decimals);
    final parts = fixed.split('.');
    final intPart = _insertCommas(parts[0]);
    return '$intPart.${parts[1]}';
  }
}

String formatAmount(dynamic amount, String currencySymbol) {
  if (amount is num) {
    return '$currencySymbol${formatMoneyNumber(amount.toDouble(), currencySymbol)}';
  }
  return '$currencySymbol$amount';
}

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
