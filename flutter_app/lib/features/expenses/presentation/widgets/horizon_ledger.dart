import 'package:flutter/material.dart';

import '../../../../l10n/l10n_ext.dart';
import '../../../../shared/theme/app_tokens.dart';
import '../../../../shared/theme/app_typography.dart';
import '../../../../shared/widgets/app_avatar.dart';

/// Horizon trip Balances (flag `enableHorizonUi`): "Budget pace" card under the position hero. A warning pill with
/// the share used and the trip day, a bar, and what is left per day. Without a budget it offers to set one.
class HorizonBudgetPace extends StatelessWidget {
  const HorizonBudgetPace({
    super.key,
    required this.budget,
    required this.fraction,
    required this.pill,
    required this.caption,
    required this.warn,
    required this.onTap,
  });

  /// False shows the "Set a budget" prompt instead of the bar.
  final bool budget;

  /// 0..1 of the budget used.
  final double fraction;

  /// "81% used, day 4/7".
  final String pill;

  /// "₹11,380 left · about ₹3,790 a day".
  final String caption;

  /// Spending ahead of the days (or over budget): amber pill and bar.
  final bool warn;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final t = context.tokens;
    final l10n = context.l10n;
    final warnColor = t.colorWarning;
    final barColor = warn ? warnColor : t.primaryAccent;
    return Padding(
      padding: const EdgeInsets.only(bottom: 20),
      child: Material(
        color: t.bgSurface,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(18),
          side: BorderSide(color: t.borderColor),
        ),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          key: const Key('horizon-budget-pace'),
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        budget ? l10n.horizonBudgetPace : l10n.horizonSetBudget,
                        style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: t.textPrimary),
                      ),
                    ),
                    if (budget && pill.isNotEmpty)
                      Container(
                        key: const Key('horizon-budget-pill'),
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: (warn ? warnColor : t.primaryAccent).withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(99),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            if (warn) ...[
                              Icon(Icons.warning_amber_rounded, size: 14, color: warnColor),
                              const SizedBox(width: 4),
                            ],
                            Text(
                              pill,
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                                color: warn ? warnColor : t.primaryAccent,
                              ),
                            ),
                          ],
                        ),
                      ),
                    if (!budget) Icon(Icons.chevron_right_rounded, color: t.textMuted),
                  ],
                ),
                if (budget) ...[
                  const SizedBox(height: 12),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(99),
                    child: LinearProgressIndicator(
                      key: const Key('horizon-budget-bar'),
                      value: fraction.clamp(0.0, 1.0),
                      minHeight: 8,
                      color: barColor,
                      backgroundColor: t.bgSurfaceHover,
                    ),
                  ),
                  const SizedBox(height: 10),
                ] else
                  const SizedBox(height: 4),
                Text(caption, style: TextStyle(fontSize: 13, color: t.textSecondary)),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// One payment in the Horizon settle plan.
class HorizonPlanRow {
  const HorizonPlanRow({
    required this.fromName,
    required this.title,
    required this.subtitle,
    required this.amount,
    required this.sign,
    required this.onTap,
  });
  final String fromName;

  /// "Rohan → You".
  final String title;

  /// "Owes you", "You pay", "Not you".
  final String subtitle;
  final String amount;

  /// 1 money coming to you (green, "+"), -1 you pay (red, "−"), 0 not you (plain).
  final int sign;
  final VoidCallback onTap;
}

/// Horizon trip Balances: "Settle plan · N payments" with a Settle up link, then one row per payment.
class HorizonSettlePlan extends StatelessWidget {
  const HorizonSettlePlan({super.key, required this.rows, required this.onSettleUp, this.empty});
  final List<HorizonPlanRow> rows;
  final VoidCallback? onSettleUp;

  /// Shown instead of the rows when everyone is square.
  final Widget? empty;

  @override
  Widget build(BuildContext context) {
    final t = context.tokens;
    final l10n = context.l10n;
    return Padding(
      key: const Key('horizon-settle-plan'),
      padding: const EdgeInsets.only(bottom: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  l10n.horizonSettlePlan(rows.length),
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: t.textPrimary),
                ),
              ),
              if (rows.isNotEmpty && onSettleUp != null)
                TextButton(
                  key: const Key('horizon-settle-up'),
                  style: TextButton.styleFrom(minimumSize: const Size(48, 48)),
                  onPressed: onSettleUp,
                  child: Text(
                    l10n.horizonSettleUp,
                    style: TextStyle(fontWeight: FontWeight.w700, color: t.primaryAccent),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 4),
          if (rows.isEmpty && empty != null)
            empty!
          else
            Material(
              color: t.bgSurface,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(18),
                side: BorderSide(color: t.borderColor),
              ),
              clipBehavior: Clip.antiAlias,
              child: Column(
                children: [
                  for (final (i, r) in rows.indexed) ...[
                    if (i > 0) Divider(height: 1, indent: 64, endIndent: 16, color: t.borderColor),
                    InkWell(
                      key: Key('horizon-plan-$i'),
                      onTap: r.onTap,
                      child: Padding(
                        padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
                        child: Row(
                          children: [
                            AppAvatar(name: r.fromName, size: 40),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    r.title,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: t.textPrimary),
                                  ),
                                  Text(r.subtitle, style: TextStyle(fontSize: 12, color: t.textSecondary)),
                                ],
                              ),
                            ),
                            Text(
                              '${r.sign > 0
                                  ? '+'
                                  : r.sign < 0
                                  ? '−'
                                  : ''}${r.amount}',
                              style: TextStyle(
                                fontFamily: AppTypography.fontMono,
                                fontFeatures: AppTypography.tabularFigures,
                                fontSize: 15,
                                fontWeight: FontWeight.w700,
                                color: r.sign > 0
                                    ? t.colorSuccess
                                    : r.sign < 0
                                    ? t.colorDanger
                                    : t.textSecondary,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ),
        ],
      ),
    );
  }
}
