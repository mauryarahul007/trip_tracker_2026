import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/format/money.dart';
import '../../../../l10n/l10n_ext.dart';
import '../../../../shared/theme/app_tokens.dart';
import '../../../../data/providers.dart';
import '../../../trip_details/application/trip_nav.dart';
import '../../application/settle_nudge_providers.dart';

/// Slim reminder at the top of a quiet trip where I still owe (flag `enableSettleNudge`, rules in `settleNudge`).
class SettleNudgeBanner extends ConsumerWidget {
  const SettleNudgeBanner({required this.tripId, super.key});

  final String tripId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (!(ref.watch(flagProvider(('enableSettleNudge', tripId))).value ?? true)) return const SizedBox.shrink();
    final t = ref.watch(settleNudgeProvider(tripId));
    final trip = ref.watch(tripProvider(tripId)).value;
    if (t == null || trip == null) return const SizedBox.shrink();
    final l10n = context.l10n;
    final tokens = context.tokens;
    return Material(
      key: const Key('settle-nudge'),
      color: tokens.colorSuccess.withValues(alpha: 0.12),
      child: Padding(
        padding: const EdgeInsets.only(left: 16, right: 4),
        child: Row(
          children: [
            Expanded(
              child: Text(
                l10n.settleNudgeText(t.toLabel, formatMoney(context, t.amount, trip.baseCurrency), trip.name),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
              ),
            ),
            TextButton(
              key: const Key('settle-nudge-go'),
              onPressed: () => context.go('/trip/$tripId/ledger'),
              child: Text(l10n.settleNudgeAction),
            ),
            IconButton(
              key: const Key('settle-nudge-dismiss'),
              tooltip: l10n.settleNudgeDismiss,
              icon: const Icon(Icons.close_rounded, size: 18),
              onPressed: () => ref.read(settleNudgeDismissedProvider(tripId).notifier).dismiss(),
            ),
          ],
        ),
      ),
    );
  }
}
