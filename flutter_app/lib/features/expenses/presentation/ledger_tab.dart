import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/auth_state.dart';
import '../../../core/clock.dart';
import '../../../core/format/money.dart';
import '../../../core/storage/prefs.dart';
import '../../../core/platform/external_launcher.dart';
import '../../../core/platform/share_service.dart';
import '../../../data/providers.dart';
import '../../../data/sync/conflict_store.dart';
import '../../../domain/logic/category_color.dart';
import '../../../domain/logic/currency.dart';
import '../../../domain/logic/expense_list_logic.dart';
import '../../../domain/logic/expense_form_logic.dart';
import '../../../domain/logic/settle_up.dart';
import '../../../domain/logic/settlement.dart';
import '../../../domain/logic/settlement_share_card.dart';
import '../../../domain/logic/trip_utilities.dart';
import '../../../domain/models/expense.dart';
import '../../../l10n/l10n_ext.dart';
import '../../../shared/theme/app_tokens.dart';
import '../../../shared/theme/app_typography.dart';
import '../../../shared/widgets/app_avatar.dart';
import '../../../domain/models/group.dart';
import '../../../shared/widgets/app_button.dart';
import '../../../shared/widgets/app_sheet.dart';
import '../../../shared/widgets/app_surface.dart';
import '../../../shared/widgets/bento_tile.dart';
import '../../../shared/widgets/boarding_pass_card.dart';
import '../../../shared/widgets/flight_progress_runway.dart';
import '../../../shared/widgets/luggage_stub_tile.dart';
import '../../../shared/widgets/status_stamp.dart';
import '../../../shared/widgets/app_text_field.dart';
import '../../../shared/widgets/empty_state.dart';
import '../../trip_details/application/trip_nav.dart';
import '../application/expenses_providers.dart';
import '../application/money_providers.dart';
import 'conflict_sheet.dart';
import 'widgets/add_expense_fab.dart';
import 'widgets/spend_donut.dart';
import 'widgets/expense_detail_sheet.dart';
import 'widgets/settle_ticket.dart' show TicketBarcode;
import 'widgets/settlement_card.dart';

/// "₹1,200.00" -> ("₹1,200", ".00") so the decimals can be dimmed (MoneyText).
(String, String?) _splitMoney(String formatted) {
  final dot = formatted.lastIndexOf('.');
  if (dot < 0 || formatted.length - dot > 3) return (formatted, null);
  return (formatted.substring(0, dot), formatted.substring(dot));
}

bool _flag(WidgetRef ref, String key, String tripId) => ref.watch(flagProvider((key, tripId))).value ?? false;

/// Balances tab: who is owed what, who pays whom, settle up, settlement history.
class LedgerTab extends ConsumerStatefulWidget {
  const LedgerTab({required this.tripId, super.key});
  final String tripId;

  @override
  ConsumerState<LedgerTab> createState() => _LedgerTabState();
}

class _LedgerTabState extends ConsumerState<LedgerTab> {
  final _open = <String>{'transfers', 'analytics'}; // history (flagged) starts folded away

  Future<void> _settle(BuildContext context, Transfer t) async {
    final trip = ref.read(tripProvider(widget.tripId)).value;
    if (trip == null) return;
    await AppSheet.show<void>(
      context: context,
      builder: (_) => _SettleSheet(tripId: widget.tripId, transfer: t, currency: trip.baseCurrency),
    );
  }

  void _toggle(String id) => setState(() => _open.contains(id) ? _open.remove(id) : _open.add(id));

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final tokens = context.tokens;
    final id = widget.tripId;
    final trip = ref.watch(tripProvider(id)).value;
    final result = ref.watch(tripSettlementProvider(id));
    if (trip == null || result == null) return const Center(child: CircularProgressIndicator());
    final cur = trip.baseCurrency;
    // The server only lets the trip owner change this (RLS), so only the owner gets the switch; for anyone
    // else it would flip back on the next sync.
    final canToggle = trip.ownerId == ref.watch(authStateProvider).userId;
    final history = _flag(ref, 'enableSettlementHistory', id);
    final compact = _flag(ref, 'enableCompactLedgerView', id);
    final pad = compact ? 8.0 : 16.0;
    final settlements = [
      for (final e in ref.watch(tripExpensesProvider(id)).value ?? const <Expense>[])
        if (e.isSettlement && e.deletedAt == null) e,
    ]..sort((a, b) => b.date.compareTo(a.date));
    final allEven = result.transfers.isEmpty;
    final groups = ref.watch(tripGroupsProvider(id)).value ?? const <Group>[];
    final groupLedger = calculateGroupLedger(result.balances, groups);
    final conflicts = ref.watch(conflictStoreProvider)[id] ?? const [];
    final mine = ref.watch(myMemberIdProvider(id));
    final myBalance = mine == null ? null : result.balances.where((b) => b.memberId == mine).firstOrNull;
    Widget section(String key, String title, List<Widget> children, {bool bare = false}) {
      final open = _open.contains(key);
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          InkWell(
            key: Key('section-$key'),
            onTap: () => _toggle(key),
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 8),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      title,
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
                    ),
                  ),
                  Icon(open ? Icons.expand_less : Icons.expand_more, color: tokens.textMuted),
                ],
              ),
            ),
          ),
          if (open)
            bare
                ? Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: children)
                : AppCard(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                    child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: children),
                  ),
          const SizedBox(height: 12),
        ],
      );
    }

    // Hero: with groups it is my group's balance, otherwise my own.
    final myGroup = mine == null
        ? null
        : groupLedger.nodes.where((n) => n.id.startsWith('group:') && n.memberIds.contains(mine)).firstOrNull;
    final heroBalance = myGroup?.balance ?? myBalance?.balance ?? 0.0;
    final heroName = myGroup?.name ?? l10n.ledYou;
    final settled = heroBalance.abs() < 0.01;
    final heroLabel = settled
        ? l10n.ledHeroSquare
        : myGroup != null
        ? (heroBalance > 0 ? l10n.ledHeroGroupOwed(heroName) : l10n.ledHeroGroupOwes(heroName))
        : (heroBalance > 0 ? l10n.ledHeroYouOwed : l10n.ledHeroYouOwe);
    final heroSplit = _splitMoney(formatMoney(context, heroBalance.abs(), cur));
    // Personal position (not the group's): what I still receive and what I still pay.
    final myNet = myBalance?.balance ?? 0.0;
    final toReceive = myNet > 0.005 ? myNet : 0.0;
    final toPay = myNet < -0.005 ? -myNet : 0.0;
    final outstanding = result.transfers.fold<double>(0, (a, t) => a + t.amount);
    final settledSoFar = settlements.fold<double>(0, (a, e) => a + e.amount);
    final progressTotal = outstanding + settledSoFar;
    final heroTone = settled ? BentoTone.sky : (heroBalance > 0 ? BentoTone.mint : BentoTone.peach);
    final counts = ref.watch(tripSettlementCountsProvider(id));
    final totals = computeTotals(
      ref.watch(tripExpensesProvider(id)).value ?? const <Expense>[],
      visibleMemberCount: ref.watch(visibleMembersProvider(id)).length,
      categories: ref.watch(tripCategoriesProvider(id)),
    );

    final tripDates = trip.startDate.isEmpty ? '' : formatDateRange(trip.startDate, trip.endDate);
    final names = {for (final b in result.balances) b.memberId: b.name};
    final paid = <String, double>{};
    for (final e in ref.watch(tripExpensesProvider(id)).value ?? const <Expense>[]) {
      if (e.isSettlement || e.deletedAt != null || e.approvalStatus == 'pending_approval') continue;
      if (e.title.startsWith('Settlement:')) continue;
      if (e.paidByShares != null && e.paidByShares!.isNotEmpty) {
        e.paidByShares!.forEach((k, v) => paid[k] = (paid[k] ?? 0) + v);
      } else {
        paid[e.paidBy] = (paid[e.paidBy] ?? 0) + e.amount;
      }
    }
    final paidList = paid.entries.where((e) => e.value > 0.005).toList()..sort((a, b) => b.value.compareTo(a.value));
    final paidMax = paidList.isEmpty ? 1.0 : paidList.first.value;
    final cats = totals.categories.take(5).toList();

    Widget moneyCard(IconData icon, BentoTone tone, String label, double amount, Key key) {
      final split = _splitMoney(formatMoney(context, amount, cur));
      return Expanded(
        child: BentoTile(
          key: key,
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(color: tokens.tones[tone].bg, shape: BoxShape.circle),
                child: Icon(icon, size: 18, color: tokens.textPrimary),
              ),
              const SizedBox(height: 12),
              Text(
                label,
                style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: tokens.textSecondary),
              ),
              const SizedBox(height: 2),
              MoneyText(whole: split.$1, decimals: split.$2, fontSize: 22, color: tokens.textPrimary),
            ],
          ),
        ),
      );
    }

    Widget statTile(BentoTone tone, String label, String value, Key key) => Expanded(
      child: BentoTile(
        tone: tone,
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            BentoTile.eyebrow(context, tone, label),
            const SizedBox(height: 4),
            Text(
              value,
              key: key,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontFamily: AppTypography.fontTitle,
                fontSize: 19,
                fontWeight: FontWeight.w800,
                color: tokens.textPrimary,
              ),
            ),
          ],
        ),
      ),
    );

    // One boarding-pass field: small tinted label over a bold value.
    Widget field(String label, String value, {CrossAxisAlignment align = CrossAxisAlignment.start}) => Expanded(
      child: Column(
        crossAxisAlignment: align,
        children: [
          BentoTile.eyebrow(context, heroTone, label),
          const SizedBox(height: 2),
          FittedBox(
            fit: BoxFit.scaleDown,
            alignment: align == CrossAxisAlignment.end ? Alignment.centerRight : Alignment.centerLeft,
            child: Text(
              value,
              maxLines: 1,
              textAlign: align == CrossAxisAlignment.end ? TextAlign.end : TextAlign.start,
              style: TextStyle(
                fontFamily: AppTypography.fontTitle,
                fontSize: 16,
                fontWeight: FontWeight.w800,
                color: tokens.textPrimary,
              ),
            ),
          ),
        ],
      ),
    );

    return Stack(
      children: [
        ListView(
          key: const Key('ledger-list'),
          padding: EdgeInsets.fromLTRB(pad, 12, pad, 120),
          children: [
            // 1. Hero boarding pass: what is owed, stamped SETTLED or NOT SETTLED.
            Padding(
              key: const Key('sticky-balance'),
              padding: const EdgeInsets.only(bottom: 20),
              child: BoardingPassCard(
                tone: heroTone,
                banner: _TwilightBanner(coverUrl: trip.coverImageUrl, title: trip.name),
                top: Column(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    BentoTile.eyebrow(context, heroTone, l10n.ledPassTitle),
                    const SizedBox(height: 6),
                    MoneyText(
                      whole: heroSplit.$1,
                      decimals: heroSplit.$2,
                      fontSize: compact ? 38 : 46,
                      color: settled
                          ? tokens.textPrimary
                          : (heroBalance > 0 ? tokens.colorSuccess : tokens.colorDanger),
                      glow: !settled,
                    ),
                    const SizedBox(height: 2),
                    BentoTile.eyebrow(context, heroTone, heroLabel),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        StatusStamp(
                          key: const Key('settle-stamp'),
                          settled: settled,
                          text: settled ? l10n.ledStampSettled : l10n.ledStampNotSettled,
                          tone: heroTone,
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            [
                              if (tripDates.isNotEmpty) tripDates,
                              '${trip.memberIds.length} ${l10n.ledHeroTravellers}',
                            ].join('  ·  '),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            textAlign: TextAlign.end,
                            style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: tokens.textSecondary),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
                stub: Row(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    Expanded(
                      flex: 5,
                      child: Row(
                        children: [
                          field(l10n.expTotalSpent, formatMoney(context, totals.totalSpent, cur)),
                          const SizedBox(width: 12),
                          field(l10n.expPerPerson, formatMoney(context, totals.averageCost, cur)),
                          const SizedBox(width: 12),
                          field(l10n.ledHeroOpen, '${result.transfers.length}'),
                        ],
                      ),
                    ),
                    const SizedBox(width: 14),
                    Expanded(flex: 3, child: TicketBarcode(seed: trip.id, height: 44)),
                  ],
                ),
              ),
            ),
            // Your money: what I still receive and what I still pay.
            Padding(
              padding: const EdgeInsets.only(bottom: 20),
              child: Row(
                children: [
                  moneyCard(
                    Icons.south_west_rounded,
                    BentoTone.mint,
                    l10n.ledToReceive,
                    toReceive,
                    const Key('money-receive'),
                  ),
                  const SizedBox(width: 12),
                  moneyCard(Icons.north_east_rounded, BentoTone.peach, l10n.ledToPay, toPay, const Key('money-pay')),
                ],
              ),
            ),
            // Settlement progress, like a goal: how much of what was owed is already paid.
            if (progressTotal > 0.005)
              Padding(
                key: const Key('settle-progress'),
                padding: const EdgeInsets.only(bottom: 20),
                child: FlightProgressRunway(
                  tone: heroTone,
                  settledLabel: l10n.ledProgress,
                  totalLabel: l10n.ledHeroOpen,
                  settledAmount: formatMoney(context, settledSoFar, cur),
                  totalAmount: formatMoney(context, progressTotal, cur),
                  progress: (settledSoFar / progressTotal).clamp(0.0, 1.0),
                  remainingTransfers: result.transfers.length,
                  remainingLabel: outstanding < 0.01
                      ? l10n.ledProgressDone
                      : l10n.ledProgressLeft(result.transfers.length),
                ),
              ),
            if (conflicts.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: AppButton(
                  key: const Key('open-conflicts'),
                  label: l10n.conflictTitle,
                  variant: AppButtonVariant.secondary,
                  onPressed: () => AppSheet.show<void>(
                    context: context,
                    builder: (_) => ConflictSheet(tripId: id),
                  ),
                ),
              ),
            // 2. Who pays whom, and how it is worked out.
            section('transfers', l10n.ledWhoPays, [
              if (canToggle)
                Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: SegmentedButton<bool>(
                    key: const Key('simplify-toggle'),
                    showSelectedIcon: false,
                    segments: [
                      ButtonSegment(value: true, label: Text(l10n.ledModeFewest, maxLines: 1)),
                      ButtonSegment(value: false, label: Text(l10n.ledModePerPerson, maxLines: 1)),
                    ],
                    selected: {trip.simplifyDebts},
                    onSelectionChanged: (v) => ref.read(tripRepositoryProvider).setSimplifyDebts(id, v.first),
                  ),
                ),
              if (counts != null && counts.direct > 0)
                Padding(
                  key: const Key('simplify-counts'),
                  padding: const EdgeInsets.only(bottom: 12),
                  child: Text(
                    counts.simplified == counts.direct
                        ? l10n.ledCountsSame(counts.direct)
                        : l10n.ledCountsSaves(counts.simplified, counts.direct),
                    style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: tokens.textSecondary),
                  ),
                ),
              if (allEven)
                EmptyState(
                  key: const Key('all-settled'),
                  icon: Icons.check_circle_outline,
                  title: l10n.ledAllSettled,
                  subtitle: l10n.ledAllSettledHint,
                )
              else
                for (final (i, t) in result.transfers.indexed)
                  Padding(
                    key: Key('transfer-$i'),
                    padding: const EdgeInsets.only(bottom: 14),
                    child: LuggageStubTile(
                      tone: toneFor(t.from),
                      fromName: t.fromLabel,
                      toName: t.toLabel,
                      fromLabel: l10n.ledFrom,
                      toLabel: l10n.ledTo,
                      caption: l10n.ledTransfer(t.fromLabel, t.toLabel),
                      amountText: formatMoney(context, t.amount, cur),
                      settleLabel: l10n.ledSettle,
                      settleKey: Key('settle-$i'),
                      onSettle: () => _settle(context, t),
                    ),
                  ),
            ], bare: true),
            // 3. Trip analytics: totals, where the money went, who paid, and each person's balance.
            section('analytics', l10n.ledNumbers, [
              Padding(
                padding: const EdgeInsets.only(top: 6, bottom: 14),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    statTile(
                      BentoTone.butter,
                      l10n.expTotalSpent,
                      formatMoney(context, totals.totalSpent, cur),
                      const Key('stat-total'),
                    ),
                    const SizedBox(width: 10),
                    statTile(
                      BentoTone.mint,
                      l10n.expPerPerson,
                      formatMoney(context, totals.averageCost, cur),
                      const Key('stat-avg'),
                    ),
                    if (totals.top != null) ...[
                      const SizedBox(width: 10),
                      statTile(
                        BentoTone.peach,
                        l10n.expTopCategory,
                        '${totals.top!.name} ${totals.top!.percentage.round()}%',
                        const Key('stat-top'),
                      ),
                    ],
                  ],
                ),
              ),
              if (cats.isNotEmpty) ...[
                Text(
                  l10n.ledSpendByCategory,
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: tokens.textSecondary),
                ),
                const SizedBox(height: 8),
                Center(
                  child: SpendDonut(
                    key: const Key('spend-donut'),
                    values: [for (final c in cats) c.percentage],
                    colors: [for (final c in cats) Color(categoryColorArgb(c.id))],
                    centerLabel: l10n.expTotalSpent,
                    centerValue: formatMoney(context, totals.totalSpent, cur),
                  ),
                ),
                const SizedBox(height: 12),
                Wrap(
                  key: const Key('donut-legend'),
                  alignment: WrapAlignment.center,
                  spacing: 8,
                  runSpacing: 6,
                  children: [
                    for (final c in cats)
                      DonutLegendBadge(
                        label: '${c.name} ${c.percentage.round()}%',
                        color: Color(categoryColorArgb(c.id)),
                      ),
                  ],
                ),
                const SizedBox(height: 14),
                for (final c in cats)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: BentoTile(
                      padding: const EdgeInsets.all(14),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Container(
                                width: 12,
                                height: 12,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  color: Color(categoryColorArgb(c.id)),
                                ),
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Text(c.name, style: const TextStyle(fontWeight: FontWeight.w800)),
                              ),
                              Text(
                                formatMoney(context, c.amount, cur),
                                style: const TextStyle(fontWeight: FontWeight.w800),
                              ),
                            ],
                          ),
                          const SizedBox(height: 2),
                          Text(
                            l10n.ledShareOfTotal(c.percentage.round()),
                            style: TextStyle(fontSize: 12, color: tokens.textSecondary),
                          ),
                          const SizedBox(height: 8),
                          ClipRRect(
                            borderRadius: BorderRadius.circular(99),
                            child: LinearProgressIndicator(
                              value: (c.percentage / 100).clamp(0.02, 1.0),
                              minHeight: 8,
                              backgroundColor: tokens.borderColor,
                              color: Color(categoryColorArgb(c.id)),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                const SizedBox(height: 16),
              ],
              if (paidList.isNotEmpty) ...[
                Text(
                  l10n.ledWhoPaid,
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: tokens.textSecondary),
                ),
                const SizedBox(height: 8),
                for (final e in paidList)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: Row(
                      children: [
                        AppAvatar(name: names[e.key] ?? '?', size: 28),
                        const SizedBox(width: 10),
                        Expanded(
                          flex: 3,
                          child: Text(
                            names[e.key] ?? '?',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(fontWeight: FontWeight.w700),
                          ),
                        ),
                        Expanded(
                          flex: 4,
                          child: ClipRRect(
                            borderRadius: BorderRadius.circular(99),
                            child: LinearProgressIndicator(
                              value: (e.value / paidMax).clamp(0.04, 1.0),
                              minHeight: 8,
                              backgroundColor: tokens.borderColor,
                              color: tokens.primaryAccent,
                            ),
                          ),
                        ),
                        const SizedBox(width: 10),
                        SizedBox(
                          width: 84,
                          child: Text(
                            formatMoney(context, e.value, cur),
                            textAlign: TextAlign.end,
                            style: const TextStyle(fontWeight: FontWeight.w800),
                          ),
                        ),
                      ],
                    ),
                  ),
                const SizedBox(height: 6),
              ],
              const SizedBox(height: 22),
              const Divider(),
              Padding(
                padding: const EdgeInsets.only(top: 14, bottom: 6),
                child: Text(
                  l10n.ledEveryone,
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: tokens.textSecondary),
                ),
              ),
              for (final b in result.balances)
                ListTile(
                  key: Key('balance-${b.memberId}'),
                  contentPadding: EdgeInsets.zero,
                  dense: compact,
                  title: Text(b.name),
                  subtitle: b.balance.abs() < 0.01
                      ? null
                      : _BalanceBar(
                          fraction: b.balance.abs() / result.balances.map((x) => x.balance.abs()).reduce(math.max),
                          color: b.balance > 0 ? tokens.colorSuccess : tokens.colorDanger,
                          track: tokens.borderColor,
                        ),
                  // Bounded so a long amount wraps instead of consuming the tile (200% text, wide fonts).
                  trailing: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 150),
                    child: Text(
                      b.balance.abs() < 0.01
                          ? l10n.ledEven
                          : b.balance > 0
                          ? l10n.ledOwed(formatMoney(context, b.balance, cur))
                          : l10n.ledOwes(formatMoney(context, -b.balance, cur)),
                      textAlign: TextAlign.end,
                      style: TextStyle(
                        color: b.balance.abs() < 0.01
                            ? tokens.textSecondary
                            : (b.balance > 0 ? tokens.colorSuccess : tokens.colorDanger),
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ),
              if (_flag(ref, 'enableSpendInsights', id))
                Align(
                  alignment: Alignment.centerLeft,
                  child: TextButton.icon(
                    key: const Key('open-insights'),
                    icon: const Icon(Icons.insights_rounded, size: 18),
                    label: Text(l10n.ledOpenInsights),
                    onPressed: () => context.push('/trip/$id/insights'),
                  ),
                ),
            ]),
            if (history)
              section('history', l10n.ledHistory, [
                if (settlements.isEmpty)
                  Text(
                    l10n.ledNoHistory,
                    key: const Key('history-empty'),
                    style: TextStyle(color: tokens.textSecondary),
                  ),
                for (final e in settlements)
                  ListTile(
                    key: Key('history-${e.id}'),
                    contentPadding: EdgeInsets.zero,
                    title: Text(e.title.replaceFirst('Settlement: ', '')),
                    subtitle: Text('${e.date} · ${formatMoney(context, e.amount, e.currency)}'),
                    trailing: Text(
                      e.settlementConfirmedAt != null ? l10n.ledConfirmed : l10n.ledAwaiting,
                      style: TextStyle(
                        color: e.settlementConfirmedAt != null ? tokens.colorSuccess : tokens.textSecondary,
                      ),
                    ),
                    onTap: () => AppSheet.show<void>(
                      context: context,
                      builder: (sheetCtx) => ExpenseDetailSheet(
                        tripId: id,
                        expenseId: e.id,
                        onEdit: () => Navigator.of(sheetCtx).pop(),
                        onDelete: () => Navigator.of(sheetCtx).pop(),
                      ),
                    ),
                  ),
              ]),
          ],
        ),
        AddExpenseFab(tripId: id),
      ],
    );
  }
}

/// Twilight sky banner (trip cover when set) with the trip title, above the boarding-pass body.
class _TwilightBanner extends StatelessWidget {
  const _TwilightBanner({required this.coverUrl, required this.title});

  final String? coverUrl;
  final String title;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    return SizedBox(
      key: const Key('ledger-banner'),
      height: 120,
      child: Stack(
        fit: StackFit.expand,
        children: [
          const DecoratedBox(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [Color(0xFFFF9A62), Color(0xFFB4506E), Color(0xFF2A2F55)],
              ),
            ),
          ),
          if (coverUrl != null && coverUrl!.isNotEmpty)
            Image.network(coverUrl!, fit: BoxFit.cover, errorBuilder: (_, _, _) => const SizedBox.shrink()),
          DecoratedBox(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [Colors.transparent, tokens.bgSurface],
              ),
            ),
          ),
          Align(
            alignment: Alignment.bottomCenter,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(18, 0, 18, 8),
              child: Text(
                title,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontFamily: AppTypography.fontTitle,
                  fontSize: 24,
                  fontWeight: FontWeight.w800,
                  color: tokens.textPrimary,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _SettleSheet extends ConsumerStatefulWidget {
  const _SettleSheet({required this.tripId, required this.transfer, required this.currency});
  final String tripId;
  final Transfer transfer;
  final String currency;

  @override
  ConsumerState<_SettleSheet> createState() => _SettleSheetState();
}

class _SettleSheetState extends ConsumerState<_SettleSheet> {
  late final _amount = TextEditingController(text: widget.transfer.amount.toStringAsFixed(2));
  final _note = TextEditingController();
  late final _upi = TextEditingController(
    text: ref.read(sharedPreferencesProvider).getString('member_upi:${widget.transfer.toMemberId}') ?? '',
  );
  late String _date = todayDateString(ref.read(nowProvider)());
  String? _error;
  bool _busy = false;

  @override
  void dispose() {
    _amount.dispose();
    _note.dispose();
    _upi.dispose();
    super.dispose();
  }

  double? get _value => jsParseFloat(_amount.text);

  Future<void> _submit() async {
    final l10n = context.l10n;
    final dateNote = ref.read(flagProvider(('enableSettlementDateNote', widget.tripId))).value ?? false;
    final plan = planSettlement(
      widget.transfer,
      amount: _value ?? 0,
      currency: widget.currency,
      date: dateNote ? _date : todayDateString(ref.read(nowProvider)()),
      note: dateNote ? _note.text : '',
    );
    if (plan == null) {
      setState(() => _error = l10n.ledAmountInvalid);
      return;
    }
    setState(() => _busy = true);
    final nav = Navigator.of(context);
    final messenger = ScaffoldMessenger.of(context);
    final r = await ref
        .read(expenseRepositoryProvider)
        .submit(plan.submission, tripId: widget.tripId, userId: ref.read(authStateProvider).userId ?? '');
    if (!mounted) return;
    if (r.isOk) {
      nav.pop();
      messenger.showSnackBar(SnackBar(content: Text(l10n.ledSettledToast)));
    } else {
      setState(() {
        _busy = false;
        _error = r.error;
      });
    }
  }

  Future<void> _pickDate() async {
    final now = ref.read(nowProvider)();
    final d = await showDatePicker(
      context: context,
      initialDate: DateTime.tryParse(_date) ?? now,
      firstDate: DateTime(2000),
      lastDate: DateTime(now.year + 2),
    );
    if (d != null) setState(() => _date = todayDateString(d));
  }

  Future<void> _share() async {
    final trip = ref.read(tripProvider(widget.tripId)).value;
    final amount = _value ?? widget.transfer.amount;
    final symbol = getCurrencySymbol(widget.currency);
    final layout = settlementShareCardLayout(
      SettlementShareCardInput(
        tripName: trip?.name ?? '',
        fromLabel: widget.transfer.fromLabel,
        toLabel: widget.transfer.toLabel,
        amount: amount,
        currencySymbol: symbol,
        upiId: _upi.text.trim().isEmpty ? null : _upi.text.trim(),
      ),
    );
    final bytes = await renderSettlementPng(layout);
    if (!mounted) return;
    await ref.read(shareServiceProvider).sharePng(bytes, fileName: layout.fileName, text: layout.caption);
  }

  Future<void> _payUpi() async {
    final l10n = context.l10n;
    final id = _upi.text.trim();
    if (!isValidUpiId(id)) {
      setState(() => _error = l10n.upiInvalid);
      return;
    }
    await saveUpiId(ref, widget.transfer.toMemberId, id);
    final amount = _value ?? widget.transfer.amount;
    final uri = Uri.parse(
      generateUpiUri({
        'payeeUpiId': id,
        'payeeName': widget.transfer.toLabel,
        'amount': amount,
        'note': 'Trip Settlement',
      }),
    );
    final opened = await ref.read(externalLauncherProvider)(uri);
    if (!mounted) return;
    if (!opened) {
      await Clipboard.setData(ClipboardData(text: id));
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(l10n.upiUnavailable)));
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final t = widget.transfer;
    final v = _value;
    final partial = v != null && v > 0 && v < t.amount - 0.01;
    final dateNote = ref.watch(flagProvider(('enableSettlementDateNote', widget.tripId))).value ?? false;
    final upiOn = ref.watch(flagProvider(('enableUpiPayments', widget.tripId))).value ?? false;
    final shareOn = ref.watch(flagProvider(('enableWhatsAppSettlementShare', widget.tripId))).value ?? false;
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              AppAvatar(name: t.fromLabel, size: 44),
              const SizedBox(width: 12),
              Icon(Icons.arrow_forward_rounded, color: context.tokens.textMuted),
              const SizedBox(width: 12),
              AppAvatar(name: t.toLabel, size: 44),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            partial ? l10n.ledSettlePartialTitle : l10n.ledSettleTitle,
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 4),
          Text(l10n.ledTransfer(t.fromLabel, t.toLabel), textAlign: TextAlign.center),
          Text(partial ? l10n.ledSettlePartialBody : l10n.ledSettleBody, key: const Key('settle-body')),
          const SizedBox(height: 12),
          AppTextField(
            key: const Key('settle-amount'),
            controller: _amount,
            label: l10n.ledAmount,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            onChanged: (_) => setState(() => _error = null),
          ),
          if (partial)
            Padding(
              padding: const EdgeInsets.only(top: 4),
              child: Text(
                l10n.ledRemaining(formatMoney(context, t.amount - v, widget.currency)),
                key: const Key('settle-remaining'),
              ),
            ),
          if (dateNote) ...[
            const SizedBox(height: 8),
            OutlinedButton(key: const Key('settle-date'), onPressed: _pickDate, child: Text('${l10n.ledDate}: $_date')),
            const SizedBox(height: 8),
            AppTextField(key: const Key('settle-note'), controller: _note, label: l10n.ledNote),
          ],
          if (upiOn) ...[
            const SizedBox(height: 8),
            AppTextField(
              key: const Key('settle-upi'),
              controller: _upi,
              label: l10n.upiHint,
              onChanged: (_) => setState(() => _error = null),
            ),
            const SizedBox(height: 8),
            AppButton(
              key: const Key('settle-upi-pay'),
              label: l10n.upiPay,
              variant: AppButtonVariant.secondary,
              onPressed: _payUpi,
            ),
          ],
          if (shareOn) ...[
            const SizedBox(height: 8),
            AppButton(
              key: const Key('settle-share'),
              label: l10n.shareCard,
              variant: AppButtonVariant.secondary,
              onPressed: _share,
            ),
          ],
          if (_error != null)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Text(
                _error!,
                key: const Key('settle-error'),
                style: TextStyle(color: context.tokens.colorDanger),
              ),
            ),
          const SizedBox(height: 12),
          AppButton(
            key: const Key('settle-confirm'),
            label: partial ? l10n.ledMarkPartial : l10n.ledMarkSettled,
            isLoading: _busy,
            onPressed: _busy ? null : _submit,
          ),
        ],
      ),
    );
  }
}

class _BalanceBar extends StatelessWidget {
  const _BalanceBar({required this.fraction, required this.color, required this.track});

  final double fraction;
  final Color color;
  final Color track;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(top: 4),
    child: ClipRRect(
      borderRadius: BorderRadius.circular(99),
      child: LinearProgressIndicator(
        value: fraction.clamp(0.04, 1.0),
        minHeight: 6,
        backgroundColor: track,
        color: color,
      ),
    ),
  );
}
