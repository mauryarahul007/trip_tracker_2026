import '../models/expense.dart' show ReceiptItem;

/// Representation of an itemized receipt line item.
typedef ReceiptItemDto = ReceiptItem;

/// Extracted structured receipt data.
class ParsedReceiptData {
  final List<ReceiptItemDto> items;
  final double subtotal;
  final double tax;
  final double tip;
  final double discount;
  final double total;
  final double amount; // alias to total for compatibility
  final String? merchant;
  final String? date;
  final double confidence;
  final String? rawText;

  const ParsedReceiptData({
    required this.items,
    required this.subtotal,
    required this.tax,
    required this.tip,
    required this.discount,
    required this.total,
    required this.amount,
    this.merchant,
    this.date,
    this.confidence = 0.9,
    this.rawText,
  });

  Map<String, dynamic> toJson() => {
    'items': items.map((i) => i.toJson()).toList(),
    'subtotal': subtotal,
    'tax': tax,
    'tip': tip,
    'discount': discount,
    'total': total,
    'amount': amount,
    if (merchant != null) 'merchant': merchant,
    if (date != null) 'date': date,
    'confidence': confidence,
    if (rawText != null) 'rawText': rawText,
  };
}

enum ReceiptOcrFailure { empty, unreadable, engine }

class ReceiptOcrException implements Exception {
  final String message;
  final ReceiptOcrFailure reason;

  const ReceiptOcrException(this.message, this.reason);

  @override
  String toString() => 'ReceiptOcrException($reason): $message';
}

/// Known brand merchants for automatic matching.
const List<String> knownMerchants = [
  'Starbucks',
  'Uber',
  'Ola',
  "McDonald's",
  'McDonalds',
  'Subway',
  'Dominos',
  'Domino\'s',
  'KFC',
  'Burger King',
  'Costa Coffee',
  'Pizza Hut',
  'Blue Tokai',
  'Third Wave Coffee',
];

/// Regular expressions for summary rows.
final RegExp _subtotalRegex = RegExp(r'^(?:sub\s*total|subtotal|food\s*total|items\s*total)\b', caseSensitive: false);
final RegExp _taxRegex = RegExp(r'(?:tax|gst|cgst|sgst|vat|service\s*tax|hst)\b', caseSensitive: false);
final RegExp _tipRegex = RegExp(r'(?:tip|service\s*charge|gratuity)\b', caseSensitive: false);
final RegExp _discountRegex = RegExp(r'(?:discount|promo|coupon|savings|less)\b', caseSensitive: false);
final RegExp _totalRegex = RegExp(
  r'^(?:grand\s*total|net\s*amount|total\s*amount|total\s*due|final\s*total|total)\b',
  caseSensitive: false,
);

/// Pattern for price at end of line, e.g. "Burger $12.50", "Pizza 450.00", "Pasta ... 320"
final RegExp _linePriceRegex = RegExp(r'(?:[$€£₹]\s*)?([0-9]{1,5}(?:\.[0-9]{2})?)\s*$');

/// Pure Dart parser extracting line items, taxes, tips, discounts and total.
ParsedReceiptData parseReceiptText(String text, [List<String> defaultMemberIds = const []]) {
  final lines = text.split(RegExp(r'\r?\n')).map((l) => l.trim()).where((l) => l.isNotEmpty).toList();

  final items = <ReceiptItemDto>[];
  double detectedSubtotal = 0;
  double detectedTax = 0;
  double detectedTip = 0;
  double detectedDiscount = 0;
  double detectedTotal = 0;
  var itemIdCounter = 1;

  for (final line in lines) {
    final lower = line.toLowerCase();
    final match = _linePriceRegex.firstMatch(line);
    if (match == null) continue;

    final priceStr = match.group(1);
    if (priceStr == null) continue;
    final parsedPrice = double.tryParse(priceStr);
    if (parsedPrice == null || parsedPrice <= 0) continue;

    // Clean description (strip trailing price and dots/dashes)
    var desc = line.substring(0, match.start).trim();
    desc = desc.replaceAll(RegExp(r'[.\-_: ]+$'), '').trim();

    // Ignore lines with metadata keywords or order/store numbers
    if (RegExp(
      r'\b(?:202\d|inv|bill|table|date|time|cashier|tel|phone|token|pax|store|order|gstin|reg)\b|#',
      caseSensitive: false,
    ).hasMatch(line)) {
      continue;
    }

    if (_totalRegex.hasMatch(desc) || (lower == 'total' && parsedPrice > detectedTotal)) {
      detectedTotal = parsedPrice;
    } else if (_subtotalRegex.hasMatch(desc)) {
      detectedSubtotal = parsedPrice;
    } else if (_taxRegex.hasMatch(desc)) {
      detectedTax += parsedPrice;
    } else if (_tipRegex.hasMatch(desc)) {
      detectedTip += parsedPrice;
    } else if (_discountRegex.hasMatch(desc)) {
      detectedDiscount += parsedPrice;
    } else if (desc.length >= 2) {
      items.add(
        ReceiptItemDto(
          id: 'item_${itemIdCounter++}',
          name: desc,
          amount: parsedPrice,
          assignedMemberIds: List<String>.from(defaultMemberIds),
        ),
      );
    }
  }

  // Fallback if no explicit total was captured
  final itemsSum = items.fold(0.0, (sum, i) => sum + i.amount);
  if (detectedTotal <= 0) {
    detectedTotal = itemsSum + detectedTax + detectedTip - detectedDiscount;
  }
  if (detectedSubtotal <= 0) {
    detectedSubtotal = itemsSum;
  }

  // Detect merchant
  String? merchant;
  for (final m in knownMerchants) {
    if (RegExp('\\b${RegExp.escape(m)}\\b', caseSensitive: false).hasMatch(text)) {
      merchant = m;
      break;
    }
  }

  if (merchant == null) {
    for (final l in lines) {
      if (!_subtotalRegex.hasMatch(l) &&
          !_taxRegex.hasMatch(l) &&
          !_totalRegex.hasMatch(l) &&
          !_linePriceRegex.hasMatch(l) &&
          !RegExp(r'^\s*(?:date|table|time|order|receipt|invoice|thank|welcome)\b', caseSensitive: false).hasMatch(l)) {
        merchant = l
            .replaceAll(RegExp(r'#\d+.*$'), '')
            .replaceAll(RegExp(r'\breceipt\b', caseSensitive: false), '')
            .trim();
        if (merchant.isNotEmpty) break;
      }
    }
  }

  // Detect date
  String? date;
  final dateMatch =
      RegExp(r'\b(\d{4}-\d{2}-\d{2})\b').firstMatch(text) ??
      RegExp(r'\b(\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4})\b').firstMatch(text);
  if (dateMatch != null) {
    date = dateMatch.group(1);
  }

  return ParsedReceiptData(
    items: items,
    subtotal: detectedSubtotal,
    tax: detectedTax,
    tip: detectedTip,
    discount: detectedDiscount,
    total: detectedTotal,
    amount: detectedTotal,
    merchant: merchant,
    date: date,
    confidence: detectedTotal > 0 ? 0.95 : 0.4,
    rawText: text,
  );
}

/// Parses scanned receipt text and throws user-friendly [ReceiptOcrException] if invalid.
ParsedReceiptData parseScannedReceipt(String text, [List<String> defaultMemberIds = const []]) {
  final trimmed = text.trim();
  if (trimmed.isEmpty) {
    throw const ReceiptOcrException(
      "Couldn't read any text from this photo. Try a clearer shot, or paste the lines.",
      ReceiptOcrFailure.empty,
    );
  }

  final parsed = parseReceiptText(trimmed, defaultMemberIds);
  if (parsed.items.isEmpty && parsed.total <= 0) {
    throw const ReceiptOcrException(
      "We couldn't find prices on this receipt. Try a clearer photo, or paste the text.",
      ReceiptOcrFailure.unreadable,
    );
  }

  return parsed;
}
