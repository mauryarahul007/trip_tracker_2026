import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/format/money.dart';
import '../../../../shared/theme/app_tokens.dart';
import '../../../../shared/theme/compass.dart';
import '../../../expenses/application/expenses_providers.dart';
import '../../application/trip_nav.dart';

/// Right-hand pane of the Compass web workspace (flag `enableCompassWeb`, 1280px and wider): who pays whom, so a
/// debt can be settled without leaving the expense table.
class CompassBalancesRail extends ConsumerWidget {
  const CompassBalancesRail({required this.tripId, super.key});

  final String tripId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = context.tokens;
    final trip = ref.watch(tripProvider(tripId)).value;
    final result = ref.watch(tripSettlementProvider(tripId));
    final transfers = result?.transfers ?? const [];
    return DecoratedBox(
      key: const Key('compass-balances-rail'),
      decoration: BoxDecoration(
        color: t.bgSurface,
        border: Border(left: BorderSide(color: t.borderColor.withValues(alpha: 0.6))),
      ),
      child: SizedBox(
        width: 300,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Text('Settle up', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 10),
            if (transfers.isEmpty)
              Text('Everyone is settled.', style: TextStyle(color: t.textSecondary))
            else
              for (final tr in transfers)
                Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Material(
                    color: t.bgPage,
                    borderRadius: BorderRadius.circular(16),
                    child: InkWell(
                      borderRadius: BorderRadius.circular(16),
                      onTap: () => context.go('/trip/$tripId/ledger'),
                      child: Padding(
                        padding: const EdgeInsets.all(12),
                        child: Row(
                          children: [
                            Expanded(
                              child: Text(
                                '${tr.fromLabel} → ${tr.toLabel}',
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(fontWeight: FontWeight.w600),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Text(
                              trip == null ? '' : formatMoney(context, tr.amount, trip.baseCurrency),
                              style: TextStyle(fontWeight: FontWeight.w800, color: t.sun),
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
