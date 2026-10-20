import 'package:flutter/material.dart';

import '../../../../domain/logic/settlement.dart';
import '../../../../l10n/l10n_ext.dart';
import '../../../../shared/theme/app_tokens.dart';

/// Members whose balance is not zero, biggest creditor first. Under half a paisa counts as settled.
List<MemberBalance> balanceBarRows(List<MemberBalance> balances) => [
  for (final b in balances)
    if (b.balance.abs() >= 0.005) b,
]..sort((a, b) => b.balance.compareTo(a.balance));

/// Each person's net balance as a bar from a centre line: owed to them grows right (green), what they owe grows
/// left (red). Every bar is scaled to the biggest balance on the trip, so the lengths compare across people.
class BalanceBars extends StatelessWidget {
  const BalanceBars({required this.balances, required this.format, super.key});

  final List<MemberBalance> balances;
  final String Function(double amount) format;

  @override
  Widget build(BuildContext context) {
    final rows = balanceBarRows(balances);
    if (rows.isEmpty) return const SizedBox.shrink();
    final l10n = context.l10n;
    final tokens = context.tokens;
    final max = rows.map((r) => r.balance.abs()).reduce((a, b) => a > b ? a : b);
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Column(
        key: const Key('balance-bars'),
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            l10n.balanceBarsTitle,
            style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: tokens.textSecondary),
          ),
          const SizedBox(height: 8),
          for (final r in rows)
            Semantics(
              container: true,
              label: r.balance > 0
                  ? l10n.balanceBarOwed(r.name, format(r.balance))
                  : l10n.balanceBarOwes(r.name, format(-r.balance)),
              child: ExcludeSemantics(
                child: Padding(
                  key: Key('balance-bar-${r.memberId}'),
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Row(
                    children: [
                      Expanded(flex: 3, child: Text(r.name, maxLines: 1, overflow: TextOverflow.ellipsis)),
                      Expanded(
                        flex: 5,
                        child: Row(
                          children: [
                            Expanded(
                              child: Align(
                                alignment: Alignment.centerRight,
                                child: _bar(r.balance < 0 ? -r.balance / max : 0, tokens.colorDanger),
                              ),
                            ),
                            Container(width: 1.5, height: 16, color: tokens.borderColor),
                            Expanded(
                              child: Align(
                                alignment: Alignment.centerLeft,
                                child: _bar(r.balance > 0 ? r.balance / max : 0, tokens.colorSuccess),
                              ),
                            ),
                          ],
                        ),
                      ),
                      SizedBox(
                        width: 84,
                        child: Text(
                          format(r.balance.abs()),
                          textAlign: TextAlign.end,
                          style: const TextStyle(fontWeight: FontWeight.w800),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _bar(double fraction, Color color) => FractionallySizedBox(
    widthFactor: fraction.clamp(0.0, 1.0),
    child: Container(
      height: 10,
      decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(99)),
    ),
  );
}
