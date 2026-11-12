import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/auth_state.dart';
import '../../../data/providers.dart';
import '../../../domain/logic/currency.dart';
import '../../../domain/logic/trip_utilities.dart' show formatDateRange;
import '../../../domain/models/join_share.dart';
import '../../../l10n/l10n_ext.dart';
import '../../../shared/theme/app_icons.dart';
import '../../../shared/theme/app_tokens.dart';
import '../../../shared/theme/app_typography.dart';
import '../../../shared/widgets/app_button.dart';
import '../../../shared/widgets/app_scaffold.dart';
import '../../../shared/widgets/async_body.dart';
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
    final signedIn = ref.watch(authStateProvider).isAuthenticated;
    // Existing "Invite & Share Signup Conversion" flag covers the share page's app CTA.
    final inviteConversion = ref.watch(flagProvider(('enableInviteConversion', null))).value ?? true;

    final Widget body = AsyncBody<TripShareSummary?>(
      value: async,
      errorTitle: l10n.shareLoadError,
      onRetry: () => ref.invalidate(tripShareSummaryProvider(token)),
      builder: (context, s) {
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
                  Text(
                    l10n.shareEyebrow.toUpperCase(),
                    style: AppTypography.eyebrowMono(color: tokens.textMuted, fontSize: 12),
                  ),
                  const SizedBox(height: 8),
                  Text(s.tripName, style: AppTypography.tripTitle(color: tokens.textPrimary, fontSize: 26)),
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
                  if (spend.isEmpty)
                    const AppCard(
                      key: Key('share-no-spend'),
                      child: EmptyState(
                        plain: true,
                        title: 'No expenses yet',
                        subtitle: 'Spending will show up here once the group logs its first expense.',
                      ),
                    )
                  else
                    HeroSurface(
                      kind: SurfaceKind.ember,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(l10n.shareTotalSpend.toUpperCase(), style: AppTypography.eyebrowMono(color: Colors.white70)),
                          const SizedBox(height: 6),
                          for (final e in spend)
                            Text(
                              formatAmount(e.value, getCurrencySymbol(e.key)),
                              key: Key('spend-${e.key}'),
                              style: AppTypography.moneyDisplay(fontSize: 32, color: Colors.white),
                            ),
                        ],
                      ),
                    ),
                  if (inviteConversion) ...[
                    const SizedBox(height: 20),
                    // Conversion only: the page stays read-only; this just hands a viewer to the app.
                    AppButton(
                      key: const Key('share-open-app'),
                      label: 'Open in Trip Tracker',
                      icon: AppIcons.share,
                      isFullWidth: true,
                      onPressed: () => context.go(signedIn ? '/' : '/login'),
                    ),
                  ],
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
          Text(label.toUpperCase(), style: AppTypography.eyebrowMono(color: tokens.textMuted)),
          const SizedBox(height: 6),
          Text(
            value,
            style: AppTypography.moneyInline(color: tokens.textPrimary, fontSize: 22),
          ),
        ],
      ),
    );
  }
}
