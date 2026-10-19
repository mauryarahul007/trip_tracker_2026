import 'package:flutter/material.dart';

import '../../../../shared/theme/app_typography.dart';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../data/providers.dart';
import '../../../../domain/logic/expense_form_logic.dart' show todayDateString;
import '../../../../domain/logic/expense_list_logic.dart';
import '../../../../domain/models/expense.dart';
import '../../../../domain/models/member.dart';
import '../../../../domain/models/trip.dart';
import '../../../../core/clock.dart';
import '../../../../shared/theme/app_tokens.dart';
import '../../../../shared/widgets/app_sheet.dart';
import '../../../trip_details/application/trip_nav.dart' show tripProvider;
import '../../application/expenses_providers.dart';
import '../closeout_sheet.dart';

/// Attention chips and the "dates ended" banner at the top of the Summary (flag `enableSummaryUpgrades`).
class SummaryAttentionBar extends ConsumerWidget {
  const SummaryAttentionBar({required this.tripId, required this.onTransfers, super.key});

  final String tripId;

  /// "You owe" / "You're owed" chips jump to the payments list.
  final VoidCallback onTransfers;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = context.tokens;
    final trip = ref.watch(tripProvider(tripId)).value;
    final settlement = ref.watch(tripSettlementProvider(tripId));
    if (trip == null || settlement == null) return const SizedBox.shrink();
    bool flag(String k) => ref.watch(flagProvider((k, tripId))).value ?? false;
    final today = todayDateString(ref.read(nowProvider)());
    final chips = attentionChips(
      trip: trip,
      myMemberId: ref.watch(myMemberIdProvider(tripId)),
      balances: settlement.balances,
      expenses: ref.watch(tripExpensesProvider(tripId)).value ?? const <Expense>[],
      members: ref.watch(tripMembersProvider(tripId)).value ?? const <Member>[],
      disputesEnabled: flag('enableExpenseDisputes'),
      closeoutEnabled: flag('enableTripCloseout'),
      today: today,
    );
    // From the real balances, so Fewest payments and Per person always agree on whether money is still owed.
    final outstanding = settlement.balances.fold<double>(0, (a, b) => b.balance > 0 ? a + b.balance : a);
    final ended = !trip.closed && trip.endDate.isNotEmpty && trip.endDate.compareTo(today) < 0 && outstanding > 0.009;
    if (chips.isEmpty && !ended) return const SizedBox.shrink();

    String label(AttentionChip c) => switch (c.id) {
      'owe' => 'You owe · settle up',
      'owed' => "You're owed · see who",
      'disputes' => '${c.count} dispute${c.count == 1 ? '' : 's'}',
      'invites' => '${c.count} invite${c.count == 1 ? '' : 's'} pending',
      _ => 'Close out trip',
    };

    void openCloseout() => AppSheet.show<void>(
      context: context,
      builder: (_) => CloseoutSheet(tripId: tripId),
    );

    void tap(AttentionChip c) {
      switch (c.id) {
        case 'closeout':
          openCloseout();
        case 'owe' || 'owed':
          onTransfers();
        default:
          context.go('/trip/$tripId/${c.id == 'invites' ? 'members' : 'expenses'}');
      }
    }

    return Padding(
      key: const Key('summary-attention'),
      padding: const EdgeInsets.only(bottom: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (chips.isNotEmpty)
            Wrap(
              spacing: 8,
              runSpacing: 4,
              children: [
                for (final c in chips)
                  ActionChip(key: Key('summary-chip-${c.id}'), label: Text(label(c)), onPressed: () => tap(c)),
              ],
            ),
          if (ended) ...[
            const SizedBox(height: 8),
            InkWell(
              key: const Key('summary-ended-banner'),
              borderRadius: BorderRadius.circular(t.radiusMd),
              onTap: openCloseout,
              child: Container(
                constraints: const BoxConstraints(minHeight: 48),
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                decoration: BoxDecoration(
                  color: t.bgSurfaceHover,
                  borderRadius: BorderRadius.circular(t.radiusMd),
                  border: Border.all(color: t.borderColor),
                ),
                child: const Text(
                  'Trip dates ended — close out remaining balances',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontWeight: FontWeight.w700),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

/// Whole days from the trip's first to last day (inclusive); 0 when the dates are missing or reversed.
int tripDays(Trip trip) {
  final a = DateTime.tryParse(trip.startDate);
  final b = DateTime.tryParse(trip.endDate);
  if (a == null || b == null || b.isBefore(a)) return 0;
  return b.difference(a).inDays + 1;
}

/// The small "↻ Your share" label that says a pass turns over (the whole pass is the tap target).
class FlipChip extends StatelessWidget {
  const FlipChip(this.label, {super.key});
  final String label;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
    decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.18), borderRadius: BorderRadius.circular(99)),
    child: Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        const Icon(Icons.flip_rounded, size: 14, color: Colors.white),
        const SizedBox(width: 5),
        Text(
          label,
          style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Colors.white),
        ),
      ],
    ),
  );
}

/// Reverse of the settlement pass: what you paid, your share and the difference, with the reason.
class PassBack extends StatelessWidget {
  const PassBack({
    required this.title,
    required this.eyebrow,
    required this.paid,
    required this.share,
    required this.diff,
    required this.diffColor,
    required this.why,
    required this.labels,
    required this.chipLabel,
    this.onExplain,
    this.explainLabel = '',
    super.key,
  });

  final String title;
  final String eyebrow;
  final String paid;
  final String share;
  final String diff;
  final Color diffColor;
  final String why;

  /// You paid / Your share / Difference.
  final (String, String, String) labels;
  final String chipLabel;
  final VoidCallback? onExplain;
  final String explainLabel;

  @override
  Widget build(BuildContext context) {
    final t = context.tokens;
    Widget cell(String label, String value, Color color) => Expanded(
      child: Column(
        children: [
          Text(
            label.toUpperCase(),
            textAlign: TextAlign.center,
            style: TextStyle(
              fontFamily: AppTypography.fontMono,
              fontSize: 10,
              fontWeight: FontWeight.w700,
              letterSpacing: 1,
              color: t.textMuted,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            value,
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 19, fontWeight: FontWeight.w800, color: color),
          ),
        ],
      ),
    );
    return DefaultTextStyle.merge(
      style: TextStyle(color: t.textPrimary),
      child: Container(
        key: const Key('pass-back'),
        clipBehavior: Clip.antiAlias,
        decoration: BoxDecoration(
          color: t.bgSurface,
          borderRadius: BorderRadius.circular(22),
          border: Border.all(color: t.borderColor.withValues(alpha: 0.5)),
          boxShadow: [
            BoxShadow(color: Colors.black.withValues(alpha: 0.25), blurRadius: 16, offset: const Offset(0, 4)),
          ],
        ),
        child: Column(
          children: [
            Container(
              padding: const EdgeInsets.fromLTRB(20, 14, 14, 14),
              decoration: const BoxDecoration(
                gradient: LinearGradient(colors: [Color(0xFF0B1F33), Color(0xFF123A57), Color(0xFF1F6F78)]),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          eyebrow.toUpperCase(),
                          style: const TextStyle(
                            fontFamily: AppTypography.fontMono,
                            fontSize: 11,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 1.6,
                            color: Colors.white70,
                          ),
                        ),
                        Text(
                          title,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontFamily: AppTypography.fontTitle,
                            fontSize: 20,
                            fontWeight: FontWeight.w800,
                            color: Colors.white,
                          ),
                        ),
                      ],
                    ),
                  ),
                  FlipChip(chipLabel),
                ],
              ),
            ),
            Expanded(
              child: LayoutBuilder(
                builder: (_, c) => FittedBox(
                  fit: BoxFit.scaleDown,
                  child: SizedBox(
                    width: c.maxWidth,
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(18, 16, 18, 14),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              cell(labels.$1, paid, t.textPrimary),
                              cell(labels.$2, share, t.textPrimary),
                              cell(labels.$3, diff, diffColor),
                            ],
                          ),
                          const SizedBox(height: 14),
                          Text(
                            why,
                            key: const Key('pass-back-why'),
                            textAlign: TextAlign.center,
                            style: TextStyle(fontSize: 13, color: t.textSecondary),
                          ),
                          if (onExplain != null) ...[
                            const SizedBox(height: 12),
                            OutlinedButton(
                              key: const Key('pass-back-explain'),
                              onPressed: onExplain,
                              child: Text(explainLabel),
                            ),
                          ],
                        ],
                      ),
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

/// "Gangtok → Lachung → Pelling": the stops, else the destination, else the trip name.
String tripRouteText(Trip trip) {
  final stops = [
    for (final s in trip.stops)
      if (s.name.isNotEmpty) s.name,
  ];
  if (stops.isNotEmpty) return stops.join(' → ');
  final d = trip.destination?.trim() ?? '';
  return d.isNotEmpty ? d : trip.name;
}

/// The slim pass pinned under the top bar once the balance card has scrolled away.
class MiniPassBar extends StatelessWidget {
  const MiniPassBar({
    required this.route,
    required this.meta,
    required this.label,
    required this.amount,
    required this.amountColor,
    required this.onTap,
    super.key,
  });

  final String route;
  final String meta;
  final String label;
  final String amount;
  final Color amountColor;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final t = context.tokens;
    return Material(
      color: t.bgSurface,
      elevation: 3,
      shadowColor: Colors.black26,
      borderRadius: BorderRadius.circular(18),
      child: InkWell(
        borderRadius: BorderRadius.circular(18),
        onTap: onTap,
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: 56),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(10, 6, 6, 6),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(color: t.primaryAccent, borderRadius: BorderRadius.circular(6)),
                  child: Text(
                    'PASS',
                    style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, letterSpacing: 0.8, color: t.ctaFg),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        route,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontWeight: FontWeight.w700),
                      ),
                      if (meta.isNotEmpty)
                        Text(
                          meta,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(fontSize: 12, color: t.textSecondary),
                        ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      label,
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 0.8,
                        color: t.textMuted,
                      ),
                    ),
                    Text(
                      amount,
                      style: TextStyle(fontWeight: FontWeight.w800, color: amountColor),
                    ),
                  ],
                ),
                const Icon(Icons.keyboard_arrow_up_rounded),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Custom amount and Remind under a payment card (flag `enableSummaryUpgrades`).
class TransferExtras extends StatelessWidget {
  const TransferExtras({required this.onCustom, this.onRemind, super.key});

  final VoidCallback onCustom;

  /// Null when the payer is you: nobody to remind.
  final VoidCallback? onRemind;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(top: 6, bottom: 2),
    // A Wrap, not a Row: at large text sizes the two buttons stack instead of overflowing.
    child: Wrap(
      alignment: WrapAlignment.spaceBetween,
      crossAxisAlignment: WrapCrossAlignment.center,
      children: [
        TextButton.icon(
          key: const Key('transfer-custom'),
          onPressed: onCustom,
          icon: const Icon(Icons.edit_outlined, size: 18),
          label: const Text('Custom amount'),
          style: TextButton.styleFrom(minimumSize: const Size(48, 48)),
        ),
        if (onRemind != null)
          TextButton.icon(
            key: const Key('transfer-remind'),
            onPressed: onRemind,
            icon: const Icon(Icons.notifications_none_rounded, size: 18),
            label: const Text('Remind'),
            style: TextButton.styleFrom(minimumSize: const Size(48, 48)),
          ),
      ],
    ),
  );
}

/// The message Remind hands to the share sheet. Nothing is sent by the app itself.
String reminderMessage({required String from, required String to, required String amount, required String trip}) =>
    'Hi $from, a gentle reminder: you owe $to $amount for "$trip". Settle up whenever you can. Sent from Trip Tracker.';

/// "How it works" under the Simplified / Per person switch.
class HowSettlementsWorkSheet extends StatelessWidget {
  const HowSettlementsWorkSheet({required this.simplified, required this.direct, super.key});

  final int simplified;
  final int direct;

  @override
  Widget build(BuildContext context) {
    final t = context.tokens;
    Widget point(IconData icon, String title, String body) => Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: t.primaryAccent),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontWeight: FontWeight.w700)),
                const SizedBox(height: 2),
                Text(body, style: TextStyle(color: t.textSecondary)),
              ],
            ),
          ),
        ],
      ),
    );
    return Column(
      key: const Key('how-settlements-work'),
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        point(
          Icons.auto_awesome_rounded,
          'Simplified',
          'Debts are netted out across the group, so people pay the fewest possible payments. '
              '${simplified == direct ? 'This trip needs $direct either way.' : 'Here: $simplified instead of $direct.'}',
        ),
        point(
          Icons.groups_2_outlined,
          'Per person',
          'Every person pays exactly who they owe, with no netting. More payments, but each one traces back to real expenses.',
        ),
        point(
          Icons.balance_rounded,
          'Same totals',
          'Both views settle to the same balances. Switching only changes who pays whom.',
        ),
      ],
    );
  }
}

/// Four quick numbers for the trip, opening Trip numbers (flag `enableSummaryUpgrades`).
class AtAGlanceGrid extends StatelessWidget {
  const AtAGlanceGrid({
    required this.total,
    required this.perHead,
    required this.topCategory,
    required this.topSpender,
    super.key,
  });

  final String total;
  final String perHead;
  final String? topCategory;
  final String? topSpender;

  @override
  Widget build(BuildContext context) {
    final t = context.tokens;
    Widget tile(Key key, String label, String value) => Expanded(
      child: Container(
        key: key,
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: t.bgSurface,
          borderRadius: BorderRadius.circular(t.radiusMd),
          border: Border.all(color: t.borderColor),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              label.toUpperCase(),
              style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 0.6, color: t.textMuted),
            ),
            const SizedBox(height: 6),
            Text(
              value,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
            ),
          ],
        ),
      ),
    );
    return Padding(
      padding: const EdgeInsets.only(top: 6, bottom: 16),
      child: Column(
        key: const Key('at-a-glance'),
        children: [
          Row(
            children: [
              tile(const Key('glance-total'), 'Total spent', total),
              const SizedBox(width: 10),
              tile(const Key('glance-per-head'), 'Per-head cost', perHead),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              tile(const Key('glance-top-category'), 'Top category', topCategory ?? '—'),
              const SizedBox(width: 10),
              tile(const Key('glance-top-spender'), 'Biggest spender', topSpender ?? '—'),
            ],
          ),
        ],
      ),
    );
  }
}
