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
