import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/format/money.dart';
import '../../../../domain/logic/expense_list_logic.dart';
import '../../../../domain/models/expense.dart';
import '../../../../shared/theme/app_tokens.dart';
import '../../../../shared/theme/app_typography.dart';
import '../../../../shared/theme/compass.dart';
import '../../../trip_details/application/trip_nav.dart';
import '../../application/expenses_providers.dart';

/// Compass Spend header (flag `enableCompassSpend`): total spent, per person and the top category. No budget
/// bar: trips have no budget on this screen yet.
class CompassSpendSummary extends ConsumerWidget {
  const CompassSpendSummary({required this.tripId, super.key});

  final String tripId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = context.tokens;
    final trip = ref.watch(tripProvider(tripId)).value;
    final expenses = ref.watch(tripExpensesProvider(tripId)).value ?? const <Expense>[];
    if (trip == null) return const SizedBox.shrink();
    final totals = computeTotals(
      expenses.where((e) => e.deletedAt == null).toList(),
      visibleMemberCount: ref.watch(visibleMembersProvider(tripId)).length,
      categories: ref.watch(tripCategoriesProvider(tripId)),
    );
    final top = totals.top;
    String money(double v) => formatMoney(context, v, trip.baseCurrency);
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
      child: DecoratedBox(
        key: const Key('compass-spend-summary'),
        decoration: BoxDecoration(
          color: t.bgSurface,
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: t.borderColor),
          boxShadow: t.shadowSm,
        ),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'TOTAL SPENT',
                style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 1.1, color: t.textMuted),
              ),
              const SizedBox(height: 4),
              FittedBox(
                fit: BoxFit.scaleDown,
                alignment: Alignment.centerLeft,
                child: Text(
                  money(totals.totalSpent),
                  style: AppTypography.moneyDisplay(fontSize: 38, color: t.textPrimary),
                ),
              ),
              const SizedBox(height: 10),
              Wrap(
                spacing: 8,
                runSpacing: 6,
                crossAxisAlignment: WrapCrossAlignment.center,
                children: [
                  Text(
                    'Per person ${money(totals.averageCost)}',
                    style: AppTypography.monoNumber(fontSize: 12.5, color: t.textSecondary),
                  ),
                  if (top != null)
                    DecoratedBox(
                      decoration: BoxDecoration(color: t.sunSoft, borderRadius: BorderRadius.circular(99)),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        child: Text(
                          '${top.name} ${top.percentage.round()}%',
                          style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: t.sun),
                        ),
                      ),
                    ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
