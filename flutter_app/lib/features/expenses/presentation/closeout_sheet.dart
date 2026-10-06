import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/format/money.dart';
import '../../../data/providers.dart';
import '../../../l10n/l10n_ext.dart';
import '../../../shared/theme/app_tokens.dart';
import '../../../shared/widgets/app_button.dart';
import '../../trip_details/application/trip_nav.dart';
import '../application/expenses_providers.dart';

/// Lock the trip (web `closeTrip`). Pulse is asked when its flag is on; the
/// answer is not stored (the trip model has no pulse column yet).
class CloseoutSheet extends ConsumerStatefulWidget {
  const CloseoutSheet({required this.tripId, super.key});
  final String tripId;

  @override
  ConsumerState<CloseoutSheet> createState() => _CloseoutSheetState();
}

class _CloseoutSheetState extends ConsumerState<CloseoutSheet> {
  bool _locked = false;
  bool _pulse = false;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final trip = ref.watch(tripProvider(widget.tripId)).value;
    final result = ref.watch(tripSettlementProvider(widget.tripId));
    if (trip == null || result == null) return const SizedBox(height: 80, child: Center(child: CircularProgressIndicator()));
    final transfers = result.transfers;
    final settled = transfers.isEmpty;
    final outstanding = transfers.fold<double>(0, (s, t) => s + t.amount);
    final pulseOn = ref.watch(flagProvider(('enableCloseoutPulse', widget.tripId))).value ?? false;

    if (_pulse) {
      return Padding(
        padding: const EdgeInsets.all(16),
        child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Text(l10n.closeoutPulse, style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 12),
          AppButton(key: const Key('closeout-yes'), label: l10n.closeoutYes, onPressed: () => Navigator.of(context).pop()),
          const SizedBox(height: 8),
          AppButton(key: const Key('closeout-no'), label: l10n.closeoutNo, variant: AppButtonVariant.secondary, onPressed: () => Navigator.of(context).pop()),
        ]),
      );
    }

    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Text(_locked ? l10n.closeoutLocked : l10n.closeoutTitle(trip.name), key: const Key('closeout-title'), style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 8),
        Text(
          settled ? l10n.closeoutSettled : l10n.closeoutOutstanding(formatMoney(context, outstanding, trip.baseCurrency), transfers.length),
          key: const Key('closeout-body'),
          style: TextStyle(color: context.tokens.textSecondary),
        ),
        if (!_locked && !settled)
          for (final t in transfers.take(6))
            Padding(padding: const EdgeInsets.only(top: 4), child: Text('${t.fromLabel} → ${t.toLabel}')),
        const SizedBox(height: 16),
        if (!_locked && !settled)
          AppButton(
            key: const Key('closeout-review'),
            label: l10n.closeoutReview,
            onPressed: () {
              Navigator.of(context).pop();
              context.go('/trip/${widget.tripId}/ledger');
            },
          ),
        if (!_locked) ...[
          const SizedBox(height: 8),
          AppButton(
            key: const Key('closeout-lock'),
            label: settled ? l10n.closeoutLock : l10n.closeoutLockAnyway,
            variant: settled ? AppButtonVariant.primary : AppButtonVariant.secondary,
            onPressed: () async {
              await ref.read(tripRepositoryProvider).setTripState(widget.tripId, closed: true);
              if (!mounted) return;
              if (pulseOn) {
                setState(() => _pulse = true);
              } else {
                setState(() => _locked = true);
              }
            },
          ),
        ],
        const SizedBox(height: 8),
        AppButton(key: const Key('closeout-dismiss'), label: l10n.closeoutNotNow, variant: AppButtonVariant.secondary, onPressed: () => Navigator.of(context).pop()),
      ]),
    );
  }
}
