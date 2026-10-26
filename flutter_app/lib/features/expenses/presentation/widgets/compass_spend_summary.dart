import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../app/auth_state.dart';
import '../../../../core/format/money.dart';
import '../../../../domain/logic/expense_list_logic.dart';
import '../../../../domain/logic/trip_list_money.dart';
import '../../../../domain/models/expense.dart';
import '../../../../shared/theme/app_colors.dart';
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
    if (t.calm) {
      final live = expenses.where((e) => e.deletedAt == null).toList();
      final net = myTripNet(
        ref.watch(authStateProvider).userId,
        trip,
        ref.watch(tripMembersProvider(tripId)).value ?? const [],
        live,
      ).net;
      return _CalmHeroPair(
        spent: money(totals.totalSpent),
        perPerson: money(totals.averageCost),
        net: net,
        netText: net == null ? null : money(net.abs()),
        onSettle: () => context.go('/trip/$tripId/ledger'),
      );
    }
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

/// Calm Passport Spend header: a night-green "group spend" card beside your signed position, with Settle up.
class _CalmHeroPair extends StatelessWidget {
  const _CalmHeroPair({
    required this.spent,
    required this.perPerson,
    required this.net,
    required this.netText,
    required this.onSettle,
  });

  final String spent;
  final String perPerson;
  final double? net;
  final String? netText;
  final VoidCallback onSettle;

  @override
  Widget build(BuildContext context) {
    final t = context.tokens;
    final settled = net != null && net!.abs() < 0.01;
    final owed = (net ?? 0) > 0;
    final label = net == null
        ? 'YOU'
        : settled
        ? 'ALL SETTLED'
        : owed
        ? 'YOU GET'
        : 'YOU OWE';
    final sign = settled || net == null ? '' : (owed ? '+ ' : '− ');
    final color = settled || net == null ? t.textPrimary : (owed ? t.colorSuccess : t.colorDanger);
    final tint = settled || net == null ? t.bgSurface : (owed ? t.tones.mint.bg : t.tones.peach.bg);
    const mono = TextStyle(
      fontFamily: AppTypography.fontMono,
      fontSize: 11,
      fontWeight: FontWeight.w600,
      letterSpacing: 1,
    );
    return Padding(
      key: const Key('compass-spend-summary'),
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
      child: IntrinsicHeight(
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Expanded(
              flex: 11,
              child: DecoratedBox(
                decoration: BoxDecoration(color: AppColors.calmNight, borderRadius: BorderRadius.circular(24)),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('GROUP SPEND', style: mono.copyWith(color: AppColors.calmDarkMute)),
                      const SizedBox(height: 6),
                      FittedBox(
                        fit: BoxFit.scaleDown,
                        alignment: Alignment.centerLeft,
                        child: Text(spent, style: AppTypography.moneyDisplay(fontSize: 30, color: Colors.white)),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        '$perPerson per person',
                        style: const TextStyle(
                          fontSize: 12.5,
                          color: AppColors.calmDarkTeal,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              flex: 9,
              child: Material(
                color: tint,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(24),
                  side: BorderSide(color: t.borderColor),
                ),
                child: InkWell(
                  key: const Key('calm-settle-up'),
                  borderRadius: BorderRadius.circular(24),
                  onTap: onSettle,
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(label, style: mono.copyWith(color: color)),
                        const SizedBox(height: 6),
                        FittedBox(
                          fit: BoxFit.scaleDown,
                          alignment: Alignment.centerLeft,
                          child: Text(
                            net == null ? '–' : (settled ? netText! : '$sign$netText'),
                            style: AppTypography.moneyDisplay(fontSize: 26, color: color),
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Settle up →',
                          style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: color),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
