import 'currency.dart';

/// Port of src/utils/settlementShareCard.ts (layout + copy only; the PNG is
/// drawn by the widget layer).
class SettlementShareCardInput {
  const SettlementShareCardInput({
    required this.tripName,
    required this.fromLabel,
    required this.toLabel,
    required this.amount,
    required this.currencySymbol,
    this.upiId,
  });
  final String tripName;
  final String fromLabel;
  final String toLabel;
  final double amount;
  final String currencySymbol;
  final String? upiId;
}

class SettlementShareCardLayout {
  const SettlementShareCardLayout({
    required this.width,
    required this.height,
    required this.amountText,
    required this.caption,
    required this.fileName,
    required this.lines,
  });
  final int width;
  final int height;
  final String amountText;
  final String caption;
  final String fileName;
  final List<String> lines;
}

/// Always 2 decimals, grouped for [locale] (unlike `formatAmount`, which follows the currency).
String formatSettlementAmount(double amount, String currencySymbol, [String locale = 'en_US']) {
  final n = amount.isFinite ? amount : 0.0;
  return '$currencySymbol${formatMoneyNumber(n, 'USD', locale)}';
}

String buildSettlementShareCaption(SettlementShareCardInput i, [String locale = 'en_US']) {
  final amountText = formatSettlementAmount(i.amount, i.currencySymbol, locale);
  final trip = i.tripName.isEmpty ? 'Trip' : i.tripName;
  return 'Hey ${i.fromLabel}, just a reminder to settle $amountText to ${i.toLabel} for our trip "$trip".';
}

SettlementShareCardLayout settlementShareCardLayout(SettlementShareCardInput i, [String locale = 'en_US']) {
  final amountText = formatSettlementAmount(i.amount, i.currencySymbol, locale);
  final trip = i.tripName.isEmpty ? 'Trip' : i.tripName;
  final hasUpi = (i.upiId ?? '').isNotEmpty;
  final lines = [
    trip,
    'Settle up',
    '${i.fromLabel} → ${i.toLabel}',
    amountText,
    if (hasUpi) 'UPI ${i.upiId}',
    'Tracked with Trip Tracker',
  ];
  // The file name slug falls back to lowercase 'trip' (the headline uses 'Trip').
  final slug = (i.tripName.isEmpty ? 'trip' : i.tripName)
      .replaceAll(RegExp(r'\s+'), '_')
      .replaceAll(RegExp(r'[^\w-]'), '');
  return SettlementShareCardLayout(
    width: 1080,
    height: hasUpi ? 720 : 640,
    amountText: amountText,
    caption: buildSettlementShareCaption(i, locale),
    fileName: '${slug.isEmpty ? 'trip' : slug}_settle.png',
    lines: lines,
  );
}
