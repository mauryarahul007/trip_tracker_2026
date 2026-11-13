import 'package:flutter/material.dart';
import '../../core/format/money.dart';
import '../../core/platform/motion.dart';
import '../../domain/logic/budget_pacing_logic.dart';
import '../../domain/models/expense.dart';
import '../theme/app_colors.dart';
import '../theme/app_icons.dart';
import '../theme/app_tokens.dart';

class DailyBudgetPacingCard extends StatelessWidget {
  const DailyBudgetPacingCard({
    required this.startDate,
    required this.endDate,
    required this.budget,
    required this.expenses,
    required this.currency,
    this.onSetBudget,
    this.now,
    super.key,
  });

  final String startDate;
  final String endDate;
  final double budget;
  final Iterable<Expense> expenses;
  final String currency;
  final VoidCallback? onSetBudget;
  final DateTime? now;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final pacing = calculateBudgetPacing(
      startDate: startDate,
      endDate: endDate,
      budget: budget,
      expenses: expenses,
      now: now,
    );

    final statusColor = switch (pacing.status) {
      BudgetPacingStatus.overBudget => tokens.colorDanger,
      BudgetPacingStatus.warning => AppColors.budgetWarn,
      BudgetPacingStatus.onTrack => tokens.colorSuccess,
      BudgetPacingStatus.noBudget => tokens.textMuted,
    };

    final statusBg = switch (pacing.status) {
      BudgetPacingStatus.overBudget => tokens.colorDanger.withValues(alpha: 0.12),
      BudgetPacingStatus.warning => AppColors.budgetWarn.withValues(alpha: 0.14),
      BudgetPacingStatus.onTrack => tokens.colorSuccess.withValues(alpha: 0.12),
      BudgetPacingStatus.noBudget => tokens.bgSurfaceHover,
    };

    final statusLabel = switch (pacing.status) {
      BudgetPacingStatus.overBudget => 'Over Budget',
      BudgetPacingStatus.warning => 'Pacing Alert',
      BudgetPacingStatus.onTrack => 'On Track',
      BudgetPacingStatus.noBudget => 'No Budget',
    };

    return Container(
      margin: const EdgeInsets.symmetric(vertical: 8),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: tokens.bgSurface,
        borderRadius: BorderRadius.circular(tokens.radiusLg),
        border: Border.all(color: tokens.borderColor),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Header Row
          Row(
            children: [
              Container(
                width: 32,
                height: 32,
                decoration: BoxDecoration(
                  color: tokens.bgSurfaceHover,
                  shape: BoxShape.circle,
                ),
                child: Icon(AppIcons.ledger, size: 17, color: tokens.primaryAccent),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Daily Budget Pacing',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        color: tokens.textPrimary,
                      ),
                    ),
                    if (pacing.hasBudget)
                      Text(
                        'Day ${pacing.elapsedDays} of ${pacing.totalTripDays} • ${pacing.remainingDays} days left',
                        style: TextStyle(fontSize: 11, color: tokens.textMuted),
                      ),
                  ],
                ),
              ),
              if (pacing.hasBudget) ...[
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: statusBg,
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: Text(
                    statusLabel,
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: statusColor,
                    ),
                  ),
                ),
                if (onSetBudget != null)
                  IconButton(
                    icon: Icon(AppIcons.edit, size: 16, color: tokens.textMuted),
                    onPressed: onSetBudget,
                    tooltip: 'Edit Budget',
                    padding: const EdgeInsets.all(4),
                    constraints: const BoxConstraints(),
                  ),
              ] else if (onSetBudget != null) ...[
                TextButton.icon(
                  onPressed: onSetBudget,
                  icon: const Icon(AppIcons.add, size: 14),
                  label: const Text('Set Budget'),
                  style: TextButton.styleFrom(
                    visualDensity: VisualDensity.compact,
                    textStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                  ),
                ),
              ],
            ],
          ),

          if (pacing.hasBudget) ...[
            const SizedBox(height: 12),
            // Today's burn and daily target row
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                RichText(
                  text: TextSpan(
                    style: TextStyle(fontSize: 12, color: tokens.textMuted),
                    children: [
                      const TextSpan(text: "Today's spend: "),
                      TextSpan(
                        text: formatMoney(context, pacing.todaySpent, currency),
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w800,
                          color: tokens.textPrimary,
                        ),
                      ),
                    ],
                  ),
                ),
                RichText(
                  text: TextSpan(
                    style: TextStyle(fontSize: 11, color: tokens.textMuted),
                    children: [
                      const TextSpan(text: 'Daily target: '),
                      TextSpan(
                        text: formatMoney(context, pacing.adjustedDailyAllowance, currency),
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                          color: tokens.primaryAccent,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 6),
            // Linear Progress Track
            ClipRRect(
              borderRadius: BorderRadius.circular(4),
              child: TweenAnimationBuilder<double>(
                tween: Tween(end: (pacing.budgetUsedPercent / 100).clamp(0.0, 1.0)),
                duration: AppMotion.of(context, AppMotion.slow),
                curve: Curves.easeOutCubic,
                builder: (_, v, _) => LinearProgressIndicator(
                  value: v,
                  minHeight: 8,
                  backgroundColor: tokens.borderColor,
                  color: statusColor,
                ),
              ),
            ),
            const SizedBox(height: 10),
            // Metrics 3-box Grid
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
              decoration: BoxDecoration(
                color: tokens.bgSurfaceHover,
                borderRadius: BorderRadius.circular(tokens.radiusSm),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      children: [
                        Text('TOTAL SPENT', style: TextStyle(fontSize: 9.5, fontWeight: FontWeight.w700, color: tokens.textMuted, letterSpacing: 0.4)),
                        const SizedBox(height: 2),
                        Text(formatMoney(context, pacing.totalSpent, currency), style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w800, color: tokens.textPrimary)),
                        Text('${pacing.budgetUsedPercent}% used', style: TextStyle(fontSize: 9.5, color: tokens.textMuted)),
                      ],
                    ),
                  ),
                  Container(width: 1, height: 26, color: tokens.borderColor),
                  Expanded(
                    child: Column(
                      children: [
                        Text('REMAINING', style: TextStyle(fontSize: 9.5, fontWeight: FontWeight.w700, color: tokens.textMuted, letterSpacing: 0.4)),
                        const SizedBox(height: 2),
                        Text(formatMoney(context, pacing.remainingBudget, currency), style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w800, color: statusColor)),
                        Text('of ${formatMoney(context, pacing.totalBudget, currency)}', style: TextStyle(fontSize: 9.5, color: tokens.textMuted)),
                      ],
                    ),
                  ),
                  Container(width: 1, height: 26, color: tokens.borderColor),
                  Expanded(
                    child: Column(
                      children: [
                        Text('BURN RATE', style: TextStyle(fontSize: 9.5, fontWeight: FontWeight.w700, color: tokens.textMuted, letterSpacing: 0.4)),
                        const SizedBox(height: 2),
                        Text(
                          pacing.isOngoing && pacing.todayBurnRatio > 0
                              ? '${pacing.todayBurnRatio.toStringAsFixed(1)}x'
                              : '${formatMoney(context, pacing.plannedDailyBudget, currency)}/d',
                          style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w800, color: tokens.textPrimary),
                        ),
                        Text(pacing.isOngoing ? 'today pace' : 'planned', style: TextStyle(fontSize: 9.5, color: tokens.textMuted)),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 8),
            // Guidance caption
            Row(
              children: [
                if (pacing.status != BudgetPacingStatus.onTrack) ...[
                  Icon(AppIcons.alert, size: 14, color: statusColor),
                  const SizedBox(width: 4),
                ],
                Expanded(
                  child: Text(
                    pacing.statusMessage,
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w500,
                      color: pacing.status == BudgetPacingStatus.onTrack ? tokens.textSecondary : statusColor,
                    ),
                  ),
                ),
              ],
            ),
          ] else ...[
            const SizedBox(height: 6),
            Text(
              'Set a planned spending budget for this trip to calculate your daily allowance and burn rate forecasts.',
              style: TextStyle(fontSize: 12, color: tokens.textSecondary),
            ),
          ],
        ],
      ),
    );
  }
}
