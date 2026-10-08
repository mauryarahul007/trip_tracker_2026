import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../data/providers.dart';
import '../../../domain/logic/currency.dart';
import '../../../domain/logic/trip_utilities.dart' show formatDateRange;
import '../../../domain/models/join_share.dart';
import '../../../l10n/l10n_ext.dart';
import '../../../shared/theme/app_icons.dart';
import '../../../shared/theme/app_tokens.dart';
import '../../../shared/widgets/app_button.dart';
import '../../../shared/widgets/app_scaffold.dart';
import '../../../shared/widgets/empty_state.dart';
import '../../../shared/widgets/app_surface.dart';

/// Public summary behind a share link; counts a view once per screen load.
final tripShareSummaryProvider = FutureProvider.autoDispose.family<TripShareSummary?, String>((ref, token) async {
  final repo = ref.watch(shareRepositoryProvider);
  final summary = await repo.summary(token);
  if (summary != null) await repo.recordView(token);
  return summary;
});

/// `/share/:token`: read-only, no sign-in.
class ShareScreen extends ConsumerWidget {
  const ShareScreen({required this.token, super.key});
  final String token;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final tokens = context.tokens;
    final async = ref.watch(tripShareSummaryProvider(token));

    final Widget body = async.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (_, _) => EmptyState(
        icon: AppIcons.alert,
        title: l10n.shareLoadError,
        subtitle: l10n.errorGenericMessage,
        action: AppButton(label: l10n.actionRetry, onPressed: () => ref.invalidate(tripShareSummaryProvider(token))),
      ),
      data: (s) {
        if (s == null) {
          return EmptyState(icon: AppIcons.share, title: l10n.shareEndedTitle, subtitle: l10n.shareEndedBody);
        }
        final spend = s.spendByCurrency.entries.toList()..sort((a, b) => b.value.compareTo(a.value));
        return SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Center(
            child: ConstrainedBox(
              constraints: BoxConstraints(maxWidth: MediaQuery.sizeOf(context).width >= 1024 ? 720 : 480),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(l10n.shareEyebrow, style: TextStyle(fontSize: 12, letterSpacing: 0.6, color: tokens.textMuted)),
                  const SizedBox(height: 8),
                  Text(
                    s.tripName,
                    style: TextStyle(fontSize: 26, fontWeight: FontWeight.w800, color: tokens.textPrimary),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    [
                      if ((s.destination ?? '').isNotEmpty) s.destination!,
                      if (s.startDate.isNotEmpty) formatDateRange(s.startDate, s.endDate),
                    ].join(' · '),
                    style: TextStyle(color: tokens.textSecondary),
                  ),
                  const SizedBox(height: 20),
                  Row(
                    children: [
                      Expanded(
                        child: _Stat(label: l10n.shareTravelers, value: '${s.memberCount}'),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: _Stat(label: l10n.shareExpenses, value: '${s.expenseCount}'),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  // Money lives on the Ember surface, same as the in-app summary.
                  HeroSurface(
                    kind: SurfaceKind.ember,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(l10n.shareTotalSpend, style: const TextStyle(fontSize: 12, color: Colors.white70)),
                        const SizedBox(height: 6),
                        for (final e in spend)
                          Text(
                            formatAmount(e.value, getCurrencySymbol(e.key)),
                            key: Key('spend-${e.key}'),
                            style: const TextStyle(fontSize: 32, fontWeight: FontWeight.w800, color: Colors.white),
                          ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );

    return AppScaffold(
      appBar: AppBar(
        title: Text(l10n.shareTripTitle),
        leading: IconButton(
          tooltip: l10n.actionBack,
          icon: const Icon(AppIcons.back, size: 20),
          onPressed: () => context.canPop() ? context.pop() : context.go('/'),
        ),
      ),
      body: SafeArea(child: body),
    );
  }
}

class _Stat extends StatelessWidget {
  const _Stat({required this.label, required this.value});
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: TextStyle(fontSize: 12, color: tokens.textMuted)),
          const SizedBox(height: 6),
          Text(
            value,
            style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700, color: tokens.textPrimary),
          ),
        ],
      ),
    );
  }
}
