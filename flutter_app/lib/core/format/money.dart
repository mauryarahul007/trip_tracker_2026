import 'package:flutter/widgets.dart';

import '../../domain/logic/currency.dart';

/// The device locale the web would have used (`toLocaleString(undefined, ...)`),
/// e.g. `en_IN` groups as 1,23,450.00.
String deviceLocaleName(BuildContext context) {
  final l = View.of(context).platformDispatcher.locale;
  return l.countryCode == null || l.countryCode!.isEmpty ? l.languageCode : '${l.languageCode}_${l.countryCode}';
}

/// "₹1,234.50" for an ISO code (symbol + locale grouping + the currency's own decimals).
String formatMoney(BuildContext context, double amount, String currencyCode) {
  final symbol = getCurrencySymbol(currencyCode);
  return formatAmount(amount, symbol, deviceLocaleName(context));
}

/// Number only, for places that print the symbol separately.
String formatMoneyPlain(BuildContext context, double amount, String currencyCode) =>
    formatMoneyNumber(amount, currencyCode, deviceLocaleName(context));
