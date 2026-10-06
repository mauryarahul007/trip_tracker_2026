import '../models/expense.dart';
import '../models/member.dart';
import '../models/trip.dart';
import 'currency.dart';
import 'math_expression.dart';
import 'split_resolver.dart';

// Ports of the pure parts of `handleSubmitLocal` (ExpenseForm.tsx) and the
// store's `addExpense` rules (frozen/closed trips, approval threshold).
// The resolver itself is `split_resolver.dart` (fixture-verified); these are
// transcribed from the component, so they are covered by hand-derived unit
// tests (see BACKLOG B-050).

/// JS `parseFloat`: leading numeric prefix, NaN otherwise.
double jsParseFloat(String s) {
  final m = RegExp(r'^\s*[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?').firstMatch(s);
  return m == null ? double.nan : double.parse(m.group(0)!.trim());
}

/// `parseFloat(x || '') || 0`: blank / NaN / 0 all become 0.
double _num(String? s) {
  final v = jsParseFloat(s ?? '');
  return v.isNaN ? 0 : v;
}

/// `evaluateMathExpression(amount) ?? parseFloat(amount)` (NaN if neither parses).
double resolveAmountText(String text) => evaluateMathExpression(text) ?? jsParseFloat(text);

enum PayerMode { single, multiple }

/// Everything the form holds as text/selection, as the web keeps it.
class ExpenseFormInput {
  const ExpenseFormInput({
    required this.title,
    required this.amountText,
    required this.currency,
    required this.baseCurrency,
    required this.category,
    required this.date,
    required this.paidBy,
    required this.splitMode,
    required this.splitSelectedIds,
    this.splitConfig = const {},
    this.payerMode = PayerMode.single,
    this.multiPayerShares = const {},
    this.multiPayerEnabled = false,
    this.currencyFxEnabled = false,
    this.customRates,
    this.receiptItems = const [],
    this.receiptTax = '',
    this.receiptTip = '',
    this.receiptDiscount = '',
    this.location,
  });

  final String title;
  final String amountText;
  final String currency;
  final String baseCurrency;
  final String category;
  final String date;
  final String paidBy;
  final String splitMode;
  final List<String> splitSelectedIds;

  /// Per-member text for exact amounts / percentages.
  final Map<String, String> splitConfig;
  final PayerMode payerMode;
  final Map<String, String> multiPayerShares;

  /// `enableMultiPayerExpenses` for this trip.
  final bool multiPayerEnabled;

  /// `enableCurrencyFx` for this trip.
  final bool currencyFxEnabled;
  final Map<String, double>? customRates;
  final List<ReceiptItem> receiptItems;
  final String receiptTax;
  final String receiptTip;
  final String receiptDiscount;
  final ExpenseLocation? location;
}

/// What the store receives (`ExpenseInput` minus receipt bytes).
class ExpenseSubmission {
  const ExpenseSubmission({
    required this.title,
    required this.amount,
    required this.currency,
    required this.category,
    required this.date,
    required this.paidBy,
    required this.splitMode,
    required this.splitMemberIds,
    this.paidByShares,
    this.splitConfig,
    this.itemizedConfig,
    this.location,
  });

  final String title;
  final double amount; // always the trip's base currency
  final String currency;
  final String category;
  final String date;
  final String paidBy;
  final Map<String, double>? paidByShares;
  final String splitMode;
  final List<String> splitMemberIds;
  final Map<String, double>? splitConfig;
  final ItemizedReceiptConfig? itemizedConfig;
  final ExpenseLocation? location;
}

class ExpenseFormResult {
  const ExpenseFormResult.ok(ExpenseSubmission this.submission) : error = null;
  const ExpenseFormResult.error(String this.error) : submission = null;
  final ExpenseSubmission? submission;
  final String? error;
  bool get isOk => submission != null;
}

/// Live "sum" shown under the exact/percent editor and used by validation.
({double sum, double? target, bool matches}) splitConfigStatus(ExpenseFormInput f) {
  final sum = f.splitSelectedIds.fold<double>(0, (s, id) => s + _num(f.splitConfig[id]));
  final double? target = f.splitMode == 'percentage'
      ? 100
      : f.splitMode == 'exact'
          ? _num(f.amountText)
          : null;
  return (sum: sum, target: target, matches: target == null || (sum - target).abs() < 0.02);
}

String _fixed2(double v) => v.toStringAsFixed(2);
double _round2(double v) => double.parse(_fixed2(v));

/// Port of `handleSubmitLocal`: validation order, messages and the base-currency
/// conversion are identical to the web.
ExpenseFormResult buildExpenseSubmission(ExpenseFormInput f) {
  final amountVal = resolveAmountText(f.amountText);
  if (amountVal.isNaN || amountVal <= 0) {
    return const ExpenseFormResult.error('Please enter a valid amount greater than 0.');
  }
  if (f.title.trim().isEmpty) {
    return const ExpenseFormResult.error('Please enter a title for the expense.');
  }
  if (f.splitSelectedIds.isEmpty) {
    return const ExpenseFormResult.error('Please select at least one member to split the expense with.');
  }

  final symbol = getCurrencySymbol(f.currency);
  final status = splitConfigStatus(f);
  if (f.splitMode != 'itemized' && !status.matches) {
    final modeLabel = f.splitMode == 'percentage' ? 'percentages' : 'exact amounts';
    final target = f.splitMode == 'percentage' ? '100%' : '$symbol ${_fixed2(amountVal)}';
    return ExpenseFormResult.error('Split $modeLabel sum (${_fixed2(status.sum)}) must equal $target.');
  }

  ItemizedReceiptConfig? itemized;
  if (f.splitMode == 'itemized') {
    if (f.receiptItems.isEmpty) {
      return const ExpenseFormResult.error('Please add at least one item to the itemized receipt breakdown.');
    }
    double? opt(String s) {
      final v = _num(s);
      return v == 0 ? null : v; // parseFloat(x) || undefined
    }

    itemized = ItemizedReceiptConfig(
      items: [
        for (final it in f.receiptItems)
          ReceiptItem(
            id: it.id,
            name: it.name,
            amount: it.amount,
            assignedMemberIds: it.assignedMemberIds.isNotEmpty ? it.assignedMemberIds : f.splitSelectedIds,
          ),
      ],
      tax: opt(f.receiptTax),
      tip: opt(f.receiptTip),
      discount: opt(f.receiptDiscount),
    );
  }

  final finalSplitConfig = <String, double>{};
  // Deliberate fix (BACKLOG B-062): the web collects per-person weights in "Shares" (custom)
  // mode but only saves them for exact/percentage, so Shares silently became an equal split.
  if (f.splitMode == 'percentage' || f.splitMode == 'exact' || f.splitMode == 'custom') {
    for (final id in f.splitSelectedIds) {
      finalSplitConfig[id] = _num(f.splitConfig[id]);
    }
  }

  // Persist in the trip's base currency: every total/balance assumes it.
  final foreign = f.currency != f.baseCurrency;
  final conversion = f.currencyFxEnabled && foreign && amountVal > 0
      ? convertCurrency(amountVal, f.currency, f.baseCurrency, f.customRates)
      : null;
  final finalAmount = foreign && conversion != null ? conversion.convertedAmount : amountVal;

  var finalPaidBy = f.paidBy;
  Map<String, double>? finalPaidByShares;

  if (f.multiPayerEnabled && f.payerMode == PayerMode.multiple) {
    final parsed = <String, double>{};
    var totalPaid = 0.0;
    f.multiPayerShares.forEach((id, text) {
      final n = jsParseFloat(text);
      if (!n.isNaN && n > 0.005) {
        parsed[id] = _round2(n);
        totalPaid += parsed[id]!;
      }
    });
    if (parsed.isEmpty) {
      return const ExpenseFormResult.error('Please allocate payment amounts for at least one member.');
    }
    if ((totalPaid - amountVal).abs() > 0.02) {
      return ExpenseFormResult.error(
        'Multi-payer sum ($symbol ${_fixed2(totalPaid)}) must equal total expense ($symbol ${_fixed2(amountVal)}). '
        'Difference: $symbol ${_fixed2((totalPaid - amountVal).abs())}.',
      );
    }

    // Stable, largest first (JS sort is stable; ties keep entry order).
    List<MapEntry<String, double>> byAmountDesc() {
      final entries = parsed.entries.toList();
      final order = {for (var i = 0; i < entries.length; i++) entries[i].key: i};
      entries.sort((a, b) {
        final c = b.value.compareTo(a.value);
        return c != 0 ? c : order[a.key]!.compareTo(order[b.key]!);
      });
      return entries;
    }

    if (foreign && conversion != null && amountVal > 0) {
      final ratio = finalAmount / amountVal;
      final base = <String, double>{};
      var allocated = 0.0;
      final entries = parsed.entries.toList();
      for (final e in entries) {
        final inBase = _round2(e.value * ratio);
        base[e.key] = inBase;
        allocated += inBase;
      }
      final diff = _round2(finalAmount - allocated);
      if (diff != 0 && entries.isNotEmpty) {
        final largest = byAmountDesc().first.key;
        base[largest] = _round2(base[largest]! + diff);
      }
      finalPaidByShares = base;
    } else {
      finalPaidByShares = parsed;
    }
    finalPaidBy = byAmountDesc().first.key;
  }

  return ExpenseFormResult.ok(
    ExpenseSubmission(
      title: f.title.trim(),
      amount: finalAmount,
      currency: f.currency,
      category: f.category,
      date: f.date,
      paidBy: finalPaidBy,
      paidByShares: finalPaidByShares,
      splitMode: f.splitMode,
      splitMemberIds: f.splitSelectedIds,
      splitConfig: finalSplitConfig.isEmpty ? null : finalSplitConfig,
      itemizedConfig: itemized,
      location: f.location,
    ),
  );
}

/// Store rule: settlements are never gated; otherwise an amount at or above the
/// trip's threshold waits for a second person's approval.
String computeApprovalStatus(Trip? trip, {required bool thresholdEnabled, required bool isSettlement, required double amount}) {
  if (isSettlement || !thresholdEnabled) return 'confirmed';
  final threshold = trip?.approvalThreshold;
  if (threshold == null || threshold <= 0) return 'confirmed';
  return amount >= threshold ? 'pending_approval' : 'confirmed';
}

bool isSettlementTitle(String title) => title.startsWith('Settlement:');

/// `addExpense` pre-flight: why a trip refuses new expenses (null = allowed).
String? tripWriteBlockReason(Trip? trip, {bool isSuperadmin = false}) {
  if (trip == null) return null;
  if (trip.frozen && !isSuperadmin) {
    return 'This trip is currently locked / frozen by Superadmin. Modifications are disabled.';
  }
  if (trip.closed) return 'This trip is closed. Reopen it to add expenses.';
  return null;
}

/// Port of `resolveDefaultExpensePayerId`: parsed payer, else me, else (optionally) the first member.
String? resolveDefaultExpensePayerId(
  List<Member> members, {
  String? parsedPaidById,
  String? currentMemberId,
  bool fallbackToFirstMember = false,
}) {
  bool has(String? id) => id != null && members.any((m) => m.id == id);
  if (has(parsedPaidById)) return parsedPaidById;
  if (has(currentMemberId)) return currentMemberId;
  if (fallbackToFirstMember && members.isNotEmpty) return members.first.id;
  return null;
}

/// Port of `isMemberPresentOnDate` (join/leave dates are inclusive yyyy-MM-dd).
bool isMemberPresentOnDate(Member m, String expenseDate) {
  final join = m.joinDate;
  final leave = m.leaveDate;
  if (join != null && join.isNotEmpty && expenseDate.compareTo(join) < 0) return false;
  if (leave != null && leave.isNotEmpty && expenseDate.compareTo(leave) > 0) return false;
  return true;
}

String todayDateString(DateTime now) =>
    '${now.year.toString().padLeft(4, '0')}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')}';

/// Live "who owes what" under the split editor, in the entry currency
/// (before any base-currency conversion). Empty until the amount is valid.
Map<String, double> previewShares(ExpenseFormInput f) {
  final amount = resolveAmountText(f.amountText);
  if (amount.isNaN || amount <= 0 || f.splitSelectedIds.isEmpty) return const {};
  final config = <String, double>{
    if (f.splitMode == 'percentage' || f.splitMode == 'exact' || f.splitMode == 'custom')
      for (final id in f.splitSelectedIds) id: _num(f.splitConfig[id]),
  };
  ItemizedReceiptConfig? itemized;
  if (f.splitMode == 'itemized' && f.receiptItems.isNotEmpty) {
    double? opt(String s) => _num(s) == 0 ? null : _num(s);
    itemized = ItemizedReceiptConfig(
      items: [
        for (final it in f.receiptItems)
          ReceiptItem(id: it.id, name: it.name, amount: it.amount, assignedMemberIds: it.assignedMemberIds.isNotEmpty ? it.assignedMemberIds : f.splitSelectedIds),
      ],
      tax: opt(f.receiptTax),
      tip: opt(f.receiptTip),
      discount: opt(f.receiptDiscount),
    );
  }
  return resolveShares(
    amount: amount,
    splitMode: f.splitMode,
    paidBy: f.paidBy,
    participants: f.splitSelectedIds,
    splitConfig: config.isEmpty ? null : config,
    itemizedConfig: itemized,
    currency: f.currency,
  );
}

/// Itemized receipt total shown next to the "use as amount" button.
double itemizedTotal(List<ReceiptItem> items, {String tax = '', String tip = '', String discount = ''}) {
  final subtotal = items.fold<double>(0, (s, i) => s + i.amount);
  final t = subtotal + _num(tax) + _num(tip) - _num(discount);
  return t < 0 ? 0 : t;
}

class ShareExplanation {
  const ShareExplanation(this.memberId, this.amount, this.formula);
  final String memberId;
  final double amount;

  /// Plain-English working, e.g. "100.00 × 2 ÷ 6 shares".
  final String formula;
}

/// "Explain this number": how each person's share came out, mirroring the
/// resolver's rules. Amounts are the resolver's own results; the formula
/// text is the working before cent rounding.
List<ShareExplanation> explainShares(ExpenseFormInput f) {
  final shares = previewShares(f);
  if (shares.isEmpty) return const [];
  final amount = resolveAmountText(f.amountText);
  final ids = f.splitSelectedIds;
  final dec = getCurrencyDecimals(f.currency);
  String n(double v) => v.toStringAsFixed(dec);
  String w(double v) => v == v.roundToDouble() ? v.toInt().toString() : v.toString();

  String formulaFor(String id) {
    switch (f.splitMode) {
      case 'equal':
        return '${n(amount)} ÷ ${ids.length}';
      case 'custom':
        final weights = {for (final i in ids) i: (_num(f.splitConfig[i]) == 0 ? 1.0 : _num(f.splitConfig[i]))};
        final total = weights.values.fold<double>(0, (a, b) => a + b);
        return '${n(amount)} × ${w(weights[id]!)} ÷ ${w(total)} shares';
      case 'percentage':
        return '${n(amount)} × ${w(_num(f.splitConfig[id]))}%';
      case 'exact':
        return 'typed amount ${n(_num(f.splitConfig[id]))}';
      case 'itemized':
        return 'items assigned to them + their part of tax, tip and discount';
      default:
        return '';
    }
  }

  return [for (final id in ids) ShareExplanation(id, shares[id] ?? 0, formulaFor(id))];
}
