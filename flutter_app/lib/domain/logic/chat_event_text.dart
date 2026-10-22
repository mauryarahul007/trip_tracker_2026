/// Plain-language text for a chat event line (expense added, payment settled).
///
/// Event bodies are stored as logged ("Added Snacks · INR 600.00", "Settlement Settlement: A → B — Upi · INR
/// 50983.07"). The Compass chat shows them tidied: "Settlement" said once, ₹ for INR, payment methods upper-case.
String tidyChatEvent(String body) {
  var t = body.trim();
  t = t.replaceFirst(RegExp(r'^(Settlement:?\s*)+', caseSensitive: false), '');
  final wasSettlement = body.toLowerCase().contains('settlement');
  t = t.replaceAllMapped(RegExp(r'INR\s*([\d,]+(?:\.\d+)?)'), (m) {
    final raw = m[1]!.replaceAll(',', '');
    final v = double.tryParse(raw);
    if (v == null) return m[0]!;
    final whole = v == v.roundToDouble();
    final s = whole ? v.toStringAsFixed(0) : v.toStringAsFixed(2);
    final head = s.split('.').first;
    final grouped = _indian(head);
    return '₹$grouped${whole ? '' : '.${s.split('.').last}'}';
  });
  t = t.replaceAllMapped(RegExp(r'—\s*(upi|cash|card|bank|other)\b', caseSensitive: false), (m) {
    final k = m[1]!;
    return '· ${k.toLowerCase() == 'upi' ? 'UPI' : '${k[0].toUpperCase()}${k.substring(1).toLowerCase()}'}';
  });
  t = t.replaceAll('➔', 'paid').replaceAll('→', 'paid');
  return wasSettlement && !t.toLowerCase().contains('paid') ? 'Payment: $t' : t;
}

String _indian(String digits) {
  if (digits.length <= 3) return digits;
  final last3 = digits.substring(digits.length - 3);
  var rest = digits.substring(0, digits.length - 3);
  final parts = <String>[];
  while (rest.length > 2) {
    parts.insert(0, rest.substring(rest.length - 2));
    rest = rest.substring(0, rest.length - 2);
  }
  if (rest.isNotEmpty) parts.insert(0, rest);
  return '${parts.join(',')},$last3';
}
