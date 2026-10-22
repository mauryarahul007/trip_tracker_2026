import 'package:flutter/material.dart';

import '../../../../shared/theme/app_tokens.dart';
import '../../../../shared/theme/app_typography.dart';
import '../../../../shared/theme/compass.dart';
import '../../../../shared/widgets/app_avatar.dart';

/// One suggested payment: `from > to`, amount, and an action. Orange Pay when you are the payer.
class CompassTransferRow extends StatelessWidget {
  const CompassTransferRow({
    required this.from,
    required this.to,
    required this.amount,
    required this.actionLabel,
    required this.onAction,
    required this.primary,
    this.actionKey,
    super.key,
  });

  final String from;
  final String to;
  final String amount;
  final String actionLabel;
  final VoidCallback onAction;
  final bool primary;
  final Key? actionKey;

  @override
  Widget build(BuildContext context) {
    final t = context.tokens;
    return Semantics(
      container: true,
      label: '$from pays $to $amount',
      child: Container(
        padding: const EdgeInsets.fromLTRB(14, 10, 10, 10),
        decoration: BoxDecoration(
          color: t.bgSurface,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: t.borderColor),
        ),
        child: Row(
          children: [
            AppAvatar(name: from, size: 30),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 6),
              child: Icon(Icons.chevron_right_rounded, size: 18, color: t.textMuted),
            ),
            AppAvatar(name: to, size: 30),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    amount,
                    style: AppTypography.moneyDisplay(
                      fontSize: 17,
                      color: t.textPrimary,
                    ).copyWith(fontWeight: FontWeight.w700),
                  ),
                  Text(
                    '$from to $to',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(fontSize: 12, color: t.textSecondary),
                  ),
                ],
              ),
            ),
            primary
                ? FilledButton(
                    key: actionKey,
                    style: FilledButton.styleFrom(
                      backgroundColor: t.sun,
                      foregroundColor: t.onSun,
                      minimumSize: const Size(72, 44),
                      shape: const StadiumBorder(),
                    ),
                    onPressed: onAction,
                    child: Text(actionLabel),
                  )
                : OutlinedButton(
                    key: actionKey,
                    style: OutlinedButton.styleFrom(minimumSize: const Size(72, 44), shape: const StadiumBorder()),
                    onPressed: onAction,
                    child: Text(actionLabel),
                  ),
          ],
        ),
      ),
    );
  }
}

/// Four small figures under the settlement pass (flag `enableCompassMoney`): Total spent, Per person,
/// You paid, Your share. One strip instead of several cards.
class CompassSummaryStrip extends StatelessWidget {
  const CompassSummaryStrip({required this.items, super.key});

  /// (label, formatted value) pairs, shown two per row on narrow screens.
  final List<(String, String)> items;

  @override
  Widget build(BuildContext context) {
    final t = context.tokens;
    return Container(
      key: const Key('compass-summary-strip'),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color: t.bgSurface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: t.borderColor),
      ),
      child: Wrap(
        runSpacing: 14,
        children: [
          for (final (label, value) in items)
            FractionallySizedBox(
              widthFactor: 0.5,
              child: SizedBox(
                width: double.infinity,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      label.toUpperCase(),
                      style: AppTypography.monoNumber(fontSize: 10.5, color: t.textMuted).copyWith(letterSpacing: 1),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      value,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: AppTypography.moneyDisplay(
                        fontSize: 18,
                        color: t.textPrimary,
                      ).copyWith(fontWeight: FontWeight.w700),
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}

/// Sticky bar at the bottom of Balances while you still owe: "You owe ₹2,450 · Settle".
class CompassSettleBar extends StatelessWidget {
  const CompassSettleBar({required this.label, required this.amount, required this.onSettle, super.key});

  final String label;
  final String amount;
  final VoidCallback onSettle;

  @override
  Widget build(BuildContext context) {
    final t = context.tokens;
    return Material(
      key: const Key('compass-settle-bar'),
      elevation: 6,
      color: t.bgSurface,
      shadowColor: Colors.black.withValues(alpha: 0.25),
      borderRadius: BorderRadius.circular(22),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 8, 8, 8),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(label, style: TextStyle(fontSize: 12, color: t.textSecondary)),
                  Text(
                    amount,
                    style: AppTypography.moneyDisplay(fontSize: 20, color: t.sun).copyWith(fontWeight: FontWeight.w800),
                  ),
                ],
              ),
            ),
            FilledButton(
              key: const Key('compass-settle-bar-action'),
              style: FilledButton.styleFrom(
                backgroundColor: t.sun,
                foregroundColor: t.onSun,
                minimumSize: const Size(96, 48),
                shape: const StadiumBorder(),
              ),
              onPressed: onSettle,
              child: const Text('Settle'),
            ),
          ],
        ),
      ),
    );
  }
}
