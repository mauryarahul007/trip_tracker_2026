import '../models/expense.dart';
import 'currency.dart';

/// Port of `resolveShares` (src/store/tripStore.ts): turns a split mode into
/// exact per-person amounts that always sum to the expense amount.
///
/// Quirks kept on purpose (verified by fixtures):
///  - custom weights use JS `||`: a weight of 0 or a missing key counts as 1;
///  - the "largest remainder" ordering is *stable* (JS sort is; Dart's is not),
///    ties go to the payer first, then list order;
///  - unknown modes, and `itemized` without items, resolve to `{}`.
Map<String, double> resolveShares({
  required double amount,
  required String splitMode,
  required String paidBy,
  required List<String> participants,
  Map<String, double>? splitConfig,
  ItemizedReceiptConfig? itemizedConfig,
  String? currency,
}) {
  final decimals = getCurrencyDecimals(currency ?? '');
  final scale = _pow10(decimals);

  double fix(double v) => double.parse(v.toStringAsFixed(decimals)); // JS Number(x.toFixed(d))
  double weight(Map<String, double> c, String id, double fallback) {
    final w = c[id];
    return (w == null || w == 0) ? fallback : w; // JS: config[id] || fallback
  }

  // One indivisible remainder unit always lands on the payer (or first participant).
  Map<String, double> applyRounding(Map<String, double> shares) {
    final sum = shares.values.fold<double>(0, (a, b) => a + b);
    final diff = fix(amount - sum);
    if (diff != 0) {
      final target = participants.contains(paidBy) ? paidBy : (participants.isEmpty ? null : participants.first);
      if (target != null) shares[target] = fix((shares[target] ?? 0) + diff);
    }
    return shares;
  }

  Map<String, double> distribute(Map<String, double> raw) {
    final floorUnits = <String, int>{};
    final remainders = <_Rem>[];
    var allocated = 0;
    for (var i = 0; i < participants.length; i++) {
      final id = participants[i];
      final scaled = (raw[id] ?? 0) * scale;
      final floored = scaled.floor();
      floorUnits[id] = floored;
      remainders.add(_Rem(id, scaled - floored, i));
      allocated += floored;
    }
    var remaining = (amount * scale + 0.5).floor() - allocated; // JS Math.round

    remainders.sort((a, b) {
      if (b.frac != a.frac) return b.frac.compareTo(a.frac);
      if (a.id == paidBy && b.id != paidBy) return -1;
      if (b.id == paidBy && a.id != paidBy) return 1;
      return a.index.compareTo(b.index); // stable
    });

    var i = 0;
    while (remaining > 0 && i < remainders.length) {
      floorUnits[remainders[i].id] = floorUnits[remainders[i].id]! + 1;
      remaining--;
      i++;
    }
    // Defensive: float drift pushed floors past the target; claw back from the smallest remainders.
    i = remainders.length - 1;
    while (remaining < 0 && i >= 0) {
      floorUnits[remainders[i].id] = floorUnits[remainders[i].id]! - 1;
      remaining++;
      i--;
    }

    return {for (final id in participants) id: fix(floorUnits[id]! / scale)};
  }

  final items = itemizedConfig?.items ?? const <ReceiptItem>[];
  if (splitMode == 'itemized' && itemizedConfig != null && items.isNotEmpty) {
    final sums = {for (final id in participants) id: 0.0};
    var itemsTotal = 0.0;
    for (final item in items) {
      final assigned = item.assignedMemberIds.where(participants.contains).toList();
      final targets = assigned.isNotEmpty ? assigned : participants;
      final per = item.amount / targets.length;
      itemsTotal += item.amount;
      for (final id in targets) {
        sums[id] = (sums[id] ?? 0) + per;
      }
    }
    final extras = (itemizedConfig.tax ?? 0) + (itemizedConfig.tip ?? 0) - (itemizedConfig.discount ?? 0);
    final raw = <String, double>{};
    for (final id in participants) {
      final sub = sums[id] ?? 0;
      final memberExtras = itemsTotal > 0 ? (sub / itemsTotal) * extras : extras / participants.length;
      raw[id] = sub + memberExtras;
    }
    return distribute(raw);
  }

  switch (splitMode) {
    case 'equal':
      final each = amount / participants.length;
      return distribute({for (final id in participants) id: each});
    case 'custom':
      final config = splitConfig ?? const <String, double>{};
      final total = participants.fold<double>(0, (s, id) => s + weight(config, id, 1));
      if (total <= 0) {
        final each = amount / participants.length;
        return distribute({for (final id in participants) id: each});
      }
      return distribute({for (final id in participants) id: (weight(config, id, 1) / total) * amount});
    case 'exact':
      final config = splitConfig ?? const <String, double>{};
      return applyRounding({for (final id in participants) id: fix(config[id] ?? 0)});
    case 'percentage':
      final config = splitConfig ?? const <String, double>{};
      return distribute({for (final id in participants) id: ((config[id] ?? 0) / 100) * amount});
    default:
      return <String, double>{};
  }
}

double _pow10(int n) {
  var r = 1.0;
  for (var i = 0; i < n; i++) {
    r *= 10;
  }
  return r;
}

class _Rem {
  _Rem(this.id, this.frac, this.index);
  final String id;
  final double frac;
  final int index;
}
