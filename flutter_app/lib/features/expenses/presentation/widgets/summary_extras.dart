import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../data/providers.dart';
import '../../../../domain/logic/expense_form_logic.dart' show todayDateString;
import '../../../../domain/logic/expense_list_logic.dart';
import '../../../../domain/models/expense.dart';
import '../../../../domain/models/member.dart';
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
    final outstanding = settlement.transfers.fold<double>(0, (a, x) => a + x.amount);
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
