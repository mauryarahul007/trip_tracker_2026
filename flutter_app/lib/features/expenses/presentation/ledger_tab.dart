import '../../../shared/widgets/cached_photo.dart';

import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/auth_state.dart';
import '../../../core/clock.dart';
import '../../../core/format/money.dart';
import '../../../core/storage/prefs.dart';
import '../../../core/platform/external_launcher.dart';
import '../../../core/platform/feedback.dart';
import '../../../core/settings/app_settings.dart' show summaryCollapsePrefProvider;
import '../../../core/platform/motion.dart';
import '../../../shared/widgets/flip_card.dart';
import '../../../core/platform/share_service.dart';
import '../../../data/providers.dart';
import '../../../data/sync/conflict_store.dart';
import '../../../domain/logic/category_color.dart';
import '../../../domain/logic/currency.dart';
import '../../../domain/logic/expense_list_logic.dart';
import '../../../domain/repositories/repositories.dart' show ExpenseRepository;
import '../../../domain/logic/group_spend.dart';
import '../../../domain/logic/expense_form_logic.dart';
import '../../../domain/logic/settle_up.dart';
import '../../../domain/logic/settlement.dart';
import '../../../domain/logic/settlement_share_card.dart';
import '../../../domain/logic/trip_utilities.dart';
import '../../../domain/models/expense.dart';
import '../../../domain/models/member.dart';
import '../../../l10n/app_localizations.dart';
import '../../../l10n/l10n_ext.dart';
import '../../../shared/theme/app_tokens.dart';
import '../../../shared/theme/app_typography.dart';
import '../../../shared/widgets/app_avatar.dart';
import '../../../domain/models/group.dart';
import '../../../shared/widgets/app_button.dart';
import '../../../shared/widgets/app_sheet.dart';
import '../../../shared/widgets/skeleton_loader.dart';
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
import '../../../domain/logic/burn_rate.dart';
import '../../../domain/logic/spend_insights.dart';
import '../../../domain/models/trip.dart';
import '../../../shared/widgets/ask_text.dart';
import '../../../shared/widgets/last_synced_caption.dart';
import '../../../shared/widgets/pull_to_refresh.dart';
import '../../../shared/widgets/rolling_money.dart';
import '../../../shared/widgets/confirm_dialog.dart';
import '../../../domain/logic/summary_features.dart';
import '../../../domain/logic/trip_status.dart';
import '../../trips/application/trips_providers.dart' show refreshTripsProvider;
import '../../trips/application/trip_accent.dart';
import '../application/trip_budget.dart';
import '../../trips/presentation/widgets/trip_card.dart' show tripHeadline;
import 'closeout_sheet.dart';
import 'widgets/summary_extras.dart';
import 'widgets/settlement_card.dart';
import 'widgets/upi_payment_sheet.dart';

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
  // History (flagged) starts folded away. Trip numbers fold too when the traveller chose to collapse them: applied
  // once, as soon as the flag has resolved (a loading flag must not count as permission), so later taps stay in charge.
  final _open = <String>{'transfers', 'analytics'};
  var _collapseChecked = false;
  var _numbersTab = 'categories';
  var _allCats = false;
  bool? _wasSettled; // to notice the moment the trip becomes settled
  var _personView = false; // Who paid card as people, not groups (this viewer only; never touches Who pays whom)

  /// Once the big balance card has scrolled away, a slim pass with the amount still owed stays pinned (phone layout).
  final _scroll = ScrollController();
  var _showMini = false;
  var _flipped = false; // settlement pass shows its reverse (your share)
  static const _miniAfter = 360.0;

  @override
  void initState() {
    super.initState();
    _scroll.addListener(() {
      final show = _scroll.hasClients && _scroll.offset > _miniAfter;
      if (show != _showMini) setState(() => _showMini = show);
    });
  }

  @override
  void dispose() {
    _scroll.dispose();
    super.dispose();
  }

  Future<void> _settle(BuildContext context, Transfer t, {bool focusAmount = false}) async {
    final trip = ref.read(tripProvider(widget.tripId)).value;
    if (trip == null) return;
    await AppSheet.show<void>(
      context: context,
      builder: (_) =>
          _SettleSheet(tripId: widget.tripId, transfer: t, currency: trip.baseCurrency, focusAmount: focusAmount),
    );
  }

  Future<void> _settleAll(BuildContext context, List<Transfer> mine, String cur) async {
    final l10n = context.l10n;
    final total = mine.fold<double>(0, (a, t) => a + t.amount);
    final ok = await ConfirmDialog.show(
      context: context,
      title: l10n.ledSettleAllTitle(mine.length),
      message: l10n.ledSettleAllBody(formatMoney(context, total, cur)),
      confirmLabel: l10n.ledSettleAllConfirm,
    );
    if (!ok || !context.mounted) return;
    final repo = ref.read(expenseRepositoryProvider);
    final userId = ref.read(authStateProvider).userId ?? '';
    final date = todayDateString(ref.read(nowProvider)());
    final undoOn = _flag(ref, 'enableUndoSettlement', widget.tripId);
    final me = ref.read(myMemberIdProvider(widget.tripId));
    final groups = ref.read(tripGroupsProvider(widget.tripId)).value ?? const <Group>[];
    final made = <String>[];
    for (final t in mine) {
      final plan = planSettlement(
        t,
        amount: t.amount,
        currency: cur,
        date: date,
        note: '',
        recorderMemberId: me,
        groups: groups,
      );
      if (plan == null) continue;
      final r = await repo.submit(plan.submission, tripId: widget.tripId, userId: userId);
      if (r.isOk) made.add(r.expenseId!);
    }
    final done = made.length;
    if (!context.mounted) return;
    if (done > 0) AppFeedback.success();
    showSettleSnack(
      ScaffoldMessenger.of(context),
      l10n.ledSettleAllDone(done),
      undoOn && done > 0 ? () => unawaited(_undoSettlements(repo, userId, made)) : null,
    );
  }

  /// Takes recorded settlements back (they go to the recycle bin, so balances return to what they were).
  Future<void> _undoSettlements(ExpenseRepository repo, String userId, List<String> ids) async {
    for (final id in ids) {
      await repo.delete(id, userId: userId);
    }
  }

  Future<void> _shareSummary(Trip trip, double total, double perPerson, List<Transfer> transfers) async {
    final layout = tripSummaryShareLayout(
      tripName: trip.name,
      currencySymbol: getCurrencySymbol(trip.baseCurrency),
      totalSpent: total,
      perPerson: perPerson,
      travellers: trip.memberIds.length,
      transfers: transfers,
    );
    final bytes = await renderSettlementPng(layout);
    if (!mounted) return;
    await ref.read(shareServiceProvider).sharePng(bytes, fileName: layout.fileName, text: layout.caption);
  }

  Future<void> _editBudget(BuildContext context, double current) async {
    final text = await askText(context, context.l10n.ledBudgetPrompt, initial: current > 0 ? '${current.round()}' : '');
    if (text == null) return;
    final parsed = jsParseFloat(text);
    final v = parsed.isFinite ? parsed : 0.0;
    await ref.read(tripBudgetProvider(widget.tripId).notifier).set(v < 0 ? 0 : v);
  }

  void _toggle(String id) => setState(() => _open.contains(id) ? _open.remove(id) : _open.add(id));

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final tokens = context.tokens;
    final id = widget.tripId;
    if (!_collapseChecked) {
      final collapseFlag = ref.watch(flagProvider(('enableSummaryCollapse', null))).value;
      final focusFlag = ref.watch(flagProvider(('enableSummaryFocus', id))).value;
      if (collapseFlag != null && focusFlag != null) {
        _collapseChecked = true;
        // Focus mode folds Trip numbers away until asked for; the Settings switch does the same for people who set it.
        if (focusFlag || (collapseFlag && ref.read(summaryCollapsePrefProvider))) _open.remove('analytics');
      }
    }
    final trip = ref.watch(tripProvider(id)).value;
    final result = ref.watch(tripSettlementProvider(id));
    if (trip == null || result == null) return const SkeletonPage();
    final cur = trip.baseCurrency;
    // The server only accepts this change from the trip owner or a superadmin (RLS), so only they get the switch;
    // for anyone else it would flip back on the next sync.
    final canToggle = ref.watch(canEditTripRulesProvider(id));
    final history = _flag(ref, 'enableSettlementHistory', id);
    final compact = _flag(ref, 'enableCompactLedgerView', id);
    final pad = compact ? 8.0 : 16.0;
    final settlements = [
      for (final e in ref.watch(tripExpensesProvider(id)).value ?? const <Expense>[])
        if (e.isSettlement && e.deletedAt == null) e,
    ]..sort((a, b) => b.date.compareTo(a.date));
    var allEven = result.transfers.isEmpty;
    final groups = ref.watch(tripGroupsProvider(id)).value ?? const <Group>[];
    final groupLedger = calculateGroupLedger(result.balances, groups);
    final conflicts = ref.watch(conflictStoreProvider)[id] ?? const [];
    final mine = ref.watch(myMemberIdProvider(id));
    final myBalance = mine == null ? null : result.balances.where((b) => b.memberId == mine).firstOrNull;
    Widget section(
      String key,
      String title,
      List<Widget> children, {
      bool bare = false,
      String? subtitle,
      List<Widget> actions = const [],
    }) {
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
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          title,
                          style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
                        ),
                        if (subtitle != null)
                          Text(subtitle, style: TextStyle(fontSize: 12, color: tokens.textSecondary)),
                      ],
                    ),
                  ),
                  if (open) ...actions,
                  AnimatedRotation(
                    turns: open ? 0.5 : 0,
                    duration: AppMotion.of(context, const Duration(milliseconds: 200)),
                    child: Icon(Icons.expand_more, color: tokens.textMuted),
                  ),
                ],
              ),
            ),
          ),
          AnimatedSize(
            duration: AppMotion.of(context, const Duration(milliseconds: 220)),
            curve: Curves.easeOutCubic,
            alignment: Alignment.topCenter,
            child: !open
                ? const SizedBox(width: double.infinity)
                : bare
                ? Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: children)
                : AppCard(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                    child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: children),
                  ),
          ),
          const SizedBox(height: 12),
        ],
      );
    }

    // Hero: with groups it is my group's balance, otherwise my own. Someone who is not on the trip (a superadmin
    // looking in) has no balance of their own, so they see what is still to settle across the trip.
    final iAmIn = mine != null;
    final myGroup = mine == null
        ? null
        : groupLedger.nodes.where((n) => n.id.startsWith('group:') && n.memberIds.contains(mine)).firstOrNull;
    // What is still to move comes from the real balances, so the pass reads the same in Fewest payments and Per
    // person (the list below can show more, smaller payments in Per person, never a different "settled").
    final outstanding = groupLedger.flows.fold<double>(0, (a, t) => a + t.amount);
    // The Groups / People switch is for the Who paid card only; it is a view, not a trip setting.
    final viewSwitchOn = _flag(ref, 'enableSettlementViewSwitch', id) && groupLedger.hasGroups;
    final baseTransfers = result.transfers; // settlements stay grouped; the Who paid switch is analytics only
    bool isMe(String node) => mine != null && (node == 'member:$mine' || node == myGroup?.id);
    // Your own payments lead the list: what you must pay first, then what is coming to you.
    int rank(Transfer t) => isMe(t.from) ? 0 : (isMe(t.to) ? 1 : 2);
    final transfers = [...baseTransfers]..sort((a, b) => rank(a).compareTo(rank(b)));
    allEven = transfers.isEmpty;
    // "Settled" is a fact about the whole trip (nobody owes anybody), never about one person's balance.
    final tripSettled = outstanding < 0.01;
    // Everyone square after there were payments: a small celebration, and a tap the moment it happens.
    final celebrateOn = _flag(ref, 'enableSettledCelebration', id) && tripSettled && result.balances.isNotEmpty;
    final becameSettled = _wasSettled == false && tripSettled;
    _wasSettled = tripSettled;
    if (becameSettled && celebrateOn) {
      WidgetsBinding.instance.addPostFrameCallback((_) => AppFeedback.success());
    }
    final heroBalance = iAmIn ? (myGroup?.balance ?? myBalance?.balance ?? 0.0) : outstanding;
    final heroName = myGroup?.name ?? l10n.ledYou;
    final iAmSquare = iAmIn && heroBalance.abs() < 0.01;
    final heroLabel = !iAmIn
        ? (tripSettled ? l10n.ledHeroSquare : l10n.ledHeroOutstanding)
        : iAmSquare
        ? (tripSettled ? l10n.ledHeroSquare : l10n.ledHeroSquareOthers)
        : myGroup != null
        ? (heroBalance > 0 ? l10n.ledHeroGroupOwed(heroName) : l10n.ledHeroGroupOwes(heroName))
        : (heroBalance > 0 ? l10n.ledHeroYouOwed : l10n.ledHeroYouOwe);
    // Personal position (not the group's): what I still receive and what I still pay.
    final myNet = myBalance?.balance ?? 0.0;
    final toReceive = myNet > 0.005 ? myNet : 0.0;
    final toPay = myNet < -0.005 ? -myNet : 0.0;
    final settledSoFar = settlements.fold<double>(0, (a, e) => a + e.amount);
    final progressTotal = outstanding + settledSoFar;
    final heroTone = tripSettled
        ? BentoTone.sky
        : (!iAmIn || iAmSquare ? BentoTone.butter : (heroBalance > 0 ? BentoTone.mint : BentoTone.peach));
    final heroColor = !iAmIn || iAmSquare
        ? tokens.textPrimary
        : (heroBalance > 0 ? tokens.colorSuccess : tokens.colorDanger);
    final counts = ref.watch(tripSettlementCountsProvider(id));
    final upgradesOn = _flag(ref, 'enableSummaryUpgrades', id);
    final flipOn = iAmIn && upgradesOn && _flag(ref, 'enableYouPaidVsShare', id);
    final totals = computeTotals(
      ref.watch(tripExpensesProvider(id)).value ?? const <Expense>[],
      visibleMemberCount: ref.watch(visibleMembersProvider(id)).length,
      categories: ref.watch(tripCategoriesProvider(id)),
    );

    final tripDates = trip.startDate.isEmpty ? '' : formatDateRange(trip.startDate, trip.endDate);
    final names = {for (final b in result.balances) b.memberId: b.name};
    final spend = memberSpend(ref.watch(tripExpensesProvider(id)).value ?? const <Expense>[]);
    final paid = spend.paid;
    final paidList = paid.entries.where((e) => e.value > 0.005).toList()..sort((a, b) => b.value.compareTo(a.value));
    final groupSpendOn = _flag(ref, 'enableGroupSpend', id) && groupLedger.hasGroups;
    final groupRows = groupSpendOn ? spendByGroup(spend.paid, spend.share, groups, names) : const <SpendRow>[];
    final showGroups = groupSpendOn && !_personView; // follows the page switch
    // The ring shows the same rows as the bars below it: people, or groups when Groups is chosen.
    final ringOn = _flag(ref, 'enableSpendRing', id);
    final ringRows = showGroups
        ? [for (final r in groupRows) (id: r.id, name: r.name, paid: r.paid, memberId: null as String?)]
        : [for (final e in paidList) (id: e.key, name: names[e.key] ?? '?', paid: e.value, memberId: e.key as String?)];
    final ringTotal = ringRows.fold<double>(0, (a, r) => a + r.paid);
    final paidMax = showGroups
        ? (groupRows.isEmpty ? 1.0 : groupRows.first.paid)
        : (paidList.isEmpty ? 1.0 : paidList.first.value);
    final cats = totals.categories.take(5).toList();
    final myPays = [
      for (final t in transfers)
        if (isMe(t.from)) t,
    ];
    final nextOn = _flag(ref, 'enableSummaryNextAction', id) && iAmIn && transfers.isNotEmpty;
    final nextPay = myPays.firstOrNull;
    final owedToMe = [
      for (final t in transfers)
        if (isMe(t.to)) t,
    ];
    final settleAllOn = _flag(ref, 'enableSettleAll', id) && iAmIn && myPays.length >= 2;
    final timelineOn = _flag(ref, 'enableDailyTimeline', id);
    final allDays = spendByDay(ref.watch(tripExpensesProvider(id)).value ?? const <Expense>[]);
    final days = timelineOn ? allDays : const <DaySpend>[];
    final recentDays = days.length > 14 ? days.sublist(days.length - 14) : days;
    final dayMax = recentDays.fold<double>(0, (m, d) => d.total > m ? d.total : m);
    final budgetOn = _flag(ref, 'enableTripBudget', id);
    final budget = budgetOn ? ref.watch(tripBudgetProvider(id)) : 0.0;
    final budgetState = budgetStatus(totals.totalSpent, budget);
    final budgetColor = switch (budgetState.level) {
      BudgetLevel.over => tokens.colorDanger,
      BudgetLevel.warn => const Color(0xFFE8890C),
      BudgetLevel.ok => tokens.colorSuccess,
    };
    final tripAccent = _flag(ref, 'enableTripAccent', id) ? ref.watch(tripAccentProvider(id)).value : null;
    // Plan and suggestions: where the budget stands and a few tips from the trip's own numbers.
    final suggestionsOn = _flag(ref, 'enableTripSuggestions', id);
    final burnRateOn = _flag(ref, 'enableBurnRateInsight', id);
    final burn = trip.startDate.isEmpty
        ? null
        : computeBurnRateInsight(trip.startDate, trip.endDate, totals.totalSpent, ref.read(nowProvider)());
    final daysLeft = burn == null ? 0 : (burn.daysTotal - burn.daysElapsed).clamp(0, 100000);
    final allowance = dailyAllowance(budget, totals.totalSpent, daysLeft);
    final paidTotal = paid.values.fold<double>(0, (a, b) => a + b);
    final topPayerEntry = paid.entries.isEmpty ? null : paid.entries.reduce((a, b) => b.value > a.value ? b : a);
    final biggest = allDays.isEmpty ? null : allDays.reduce((a, b) => b.total > a.total ? b : a);
    final tips = suggestionsOn
        ? buildSuggestions(
            totalSpent: totals.totalSpent,
            budget: budget,
            projectedTotal: burn?.projectedTotal,
            topCategory: totals.top == null ? null : (name: totals.top!.name, percent: totals.top!.percentage),
            topPayer: topPayerEntry == null || paidTotal <= 0
                ? null
                : (name: names[topPayerEntry.key] ?? '?', percent: topPayerEntry.value * 100 / paidTotal),
            openPayments: transfers.length,
            biggestDay: biggest == null ? null : (date: biggest.date, total: biggest.total),
            dayCount: allDays.length,
            memberCount: trip.memberIds.length,
          )
        : const <Suggestion>[];
    final planOn = budgetOn || tips.isNotEmpty;
    // Today card and the trip-over prompt.
    final nowDt = ref.read(nowProvider)();
    final phase = tripStatus(trip.startDate, trip.endDate, nowDt).phase;
    final todayOn = _flag(ref, 'enableTodayCard', id) && (phase == TripPhase.active || phase == TripPhase.upcoming);
    final upNext = todayOn ? nextPass(trip.passes, nowDt) : null;
    final closeoutOn =
        _flag(ref, 'enableCloseoutPrompt', id) && phase == TripPhase.ended && !trip.closed && !trip.archived;

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

    // Trip numbers: one tab at a time instead of everything stacked.
    final numberTabs = <(String, String)>[
      if (cats.isNotEmpty) ('categories', l10n.numbersTabCategories),
      if (paidList.isNotEmpty) ('people', l10n.numbersTabPeople),
      if (timelineOn && recentDays.isNotEmpty) ('days', l10n.numbersTabDays),
      if (cats.isNotEmpty || (timelineOn && recentDays.isNotEmpty)) ('details', l10n.numbersTabDetails),
    ];
    final numbersTab = numberTabs.any((t) => t.$1 == _numbersTab) ? _numbersTab : (numberTabs.firstOrNull?.$1 ?? '');
    List<Widget> numbersBody() => switch (numbersTab) {
      'categories' => [
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
              DonutLegendBadge(label: '${c.name} ${c.percentage.round()}%', color: Color(categoryColorArgb(c.id))),
          ],
        ),
        const SizedBox(height: 14),
        ...[
          for (final c in cats.take(_allCats ? cats.length : 3))
            Padding(
              key: Key('cat-row-${c.id}'),
              padding: const EdgeInsets.only(bottom: 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        width: 10,
                        height: 10,
                        decoration: BoxDecoration(shape: BoxShape.circle, color: Color(categoryColorArgb(c.id))),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          c.name,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(fontWeight: FontWeight.w700),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text(
                            formatMoney(context, c.amount, cur),
                            style: const TextStyle(fontWeight: FontWeight.w800),
                          ),
                          Text(
                            l10n.ledShareOfTotal(c.percentage.round()),
                            style: TextStyle(fontSize: 12, color: tokens.textSecondary),
                          ),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(99),
                    child: TweenAnimationBuilder<double>(
                      tween: Tween(end: (c.percentage / 100).clamp(0.02, 1.0)),
                      duration: AppMotion.of(context, const Duration(milliseconds: 400)),
                      curve: Curves.easeOutCubic,
                      builder: (_, v, _) => LinearProgressIndicator(
                        value: v,
                        minHeight: 6,
                        backgroundColor: tokens.borderColor,
                        color: Color(categoryColorArgb(c.id)),
                      ),
                    ),
                  ),
                ],
              ),
            ),
        ],
        if (cats.length > 3)
          Align(
            alignment: Alignment.centerLeft,
            child: TextButton(
              key: const Key('cats-show-all'),
              onPressed: () => setState(() => _allCats = !_allCats),
              child: Text(_allCats ? l10n.numbersShowLess : l10n.numbersShowAll(cats.length)),
            ),
          ),
      ],
      'people' => [
        Row(
          children: [
            Expanded(
              child: Text(
                l10n.ledWhoPaid,
                style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: tokens.textSecondary),
              ),
            ),
            // The same Groups / People choice as the switch at the top of the page (one shared state).
            if (viewSwitchOn)
              SegmentedButton<bool>(
                key: const Key('spend-view-toggle'),
                showSelectedIcon: false,
                style: const ButtonStyle(minimumSize: WidgetStatePropertyAll(Size(0, 48))), // a full 48 px target
                segments: [
                  ButtonSegment(value: false, label: Text(l10n.ledSpendGroups, maxLines: 1)),
                  ButtonSegment(value: true, label: Text(l10n.ledSpendMembers, maxLines: 1)),
                ],
                selected: {_personView},
                onSelectionChanged: (v) => setState(() => _personView = v.first),
              ),
          ],
        ),
        const SizedBox(height: 8),
        if (ringOn && ringRows.length >= 2 && ringTotal > 0) ...[
          Center(
            child: SpendDonut(
              key: const Key('spend-ring'),
              values: [for (final r in ringRows) r.paid],
              colors: [for (final r in ringRows) AppAvatar.colorForName(r.name)],
              centerLabel: l10n.ledWhoPaid,
              centerValue: formatMoney(context, ringRows.fold<double>(0, (a, r) => a + r.paid), cur),
            ),
          ),
          const SizedBox(height: 10),
          Wrap(
            alignment: WrapAlignment.center,
            spacing: 8,
            runSpacing: 6,
            children: [
              for (final r in ringRows)
                ActionChip(
                  key: Key('ring-chip-${r.id}'),
                  avatar: CircleAvatar(backgroundColor: AppAvatar.colorForName(r.name), radius: 6),
                  label: Text('${r.name} ${(r.paid * 100 / ringTotal).round()}%'),
                  // A person's chip shows their expenses; a group has no filter of its own.
                  onPressed: r.memberId == null
                      ? null
                      : () {
                          ref.read(expenseFiltersProvider(id).notifier).set(ExpenseFilters(memberId: r.memberId!));
                          context.go('/trip/$id/expenses');
                        },
                ),
            ],
          ),
          const SizedBox(height: 14),
        ],
        Padding(
          padding: const EdgeInsets.only(bottom: 10),
          child: Text(
            l10n.ledPaidLegend,
            key: const Key('paid-legend'),
            style: TextStyle(fontSize: 12, color: tokens.textMuted),
          ),
        ),
        if (showGroups)
          for (final r in groupRows)
            Padding(
              key: Key('spend-group-${r.id}'),
              padding: const EdgeInsets.only(bottom: 10),
              child: Row(
                children: [
                  AppAvatar(name: r.name, size: 28),
                  const SizedBox(width: 10),
                  Expanded(
                    flex: 3,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          r.name,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(fontWeight: FontWeight.w700),
                        ),
                        Text(
                          l10n.ledSpendShare(formatMoney(context, r.share, cur)),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(fontSize: 12, color: tokens.textSecondary),
                        ),
                      ],
                    ),
                  ),
                  Expanded(
                    flex: 3,
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(99),
                      child: LinearProgressIndicator(
                        value: (r.paid / paidMax).clamp(0.04, 1.0),
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
                      formatMoney(context, r.paid, cur),
                      textAlign: TextAlign.end,
                      style: const TextStyle(fontWeight: FontWeight.w800),
                    ),
                  ),
                ],
              ),
            )
        else
          for (final e in paidList)
            Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: Row(
                children: [
                  AppAvatar(name: names[e.key] ?? '?', size: 28),
                  const SizedBox(width: 10),
                  Expanded(
                    flex: 3,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          names[e.key] ?? '?',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(fontWeight: FontWeight.w700),
                        ),
                        Text(
                          l10n.ledSpendShare(formatMoney(context, spend.share[e.key] ?? 0, cur)),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(fontSize: 12, color: tokens.textSecondary),
                        ),
                      ],
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
      'days' => [
        Text(
          l10n.ledDayByDay,
          style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: tokens.textSecondary),
        ),
        const SizedBox(height: 8),
        _DayChart(
          key: const Key('day-chart'),
          days: recentDays,
          maxTotal: dayMax,
          color: tripAccent ?? tokens.primaryAccent,
          format: (v) => formatMoney(context, v, cur),
        ),
      ],
      'details' => [
        Text(
          l10n.ledSpendByCategory,
          style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: tokens.textSecondary),
        ),
        const SizedBox(height: 8),
        ...[
          for (final c in totals.categories)
            Padding(
              key: Key('cat-row-${c.id}'),
              padding: const EdgeInsets.only(bottom: 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        width: 10,
                        height: 10,
                        decoration: BoxDecoration(shape: BoxShape.circle, color: Color(categoryColorArgb(c.id))),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          c.name,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(fontWeight: FontWeight.w700),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text(
                            formatMoney(context, c.amount, cur),
                            style: const TextStyle(fontWeight: FontWeight.w800),
                          ),
                          Text(
                            l10n.ledShareOfTotal(c.percentage.round()),
                            style: TextStyle(fontSize: 12, color: tokens.textSecondary),
                          ),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(99),
                    child: TweenAnimationBuilder<double>(
                      tween: Tween(end: (c.percentage / 100).clamp(0.02, 1.0)),
                      duration: AppMotion.of(context, const Duration(milliseconds: 400)),
                      curve: Curves.easeOutCubic,
                      builder: (_, v, _) => LinearProgressIndicator(
                        value: v,
                        minHeight: 6,
                        backgroundColor: tokens.borderColor,
                        color: Color(categoryColorArgb(c.id)),
                      ),
                    ),
                  ),
                ],
              ),
            ),
        ],
        if (timelineOn && recentDays.isNotEmpty) ...[
          Text(
            l10n.ledDayByDay,
            style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: tokens.textSecondary),
          ),
          const SizedBox(height: 8),
          Column(
            key: const Key('day-timeline'),
            children: [
              for (final d in recentDays)
                Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Row(
                    children: [
                      SizedBox(
                        width: 52,
                        child: Text(
                          d.date.length >= 10 ? d.date.substring(5) : d.date,
                          style: TextStyle(fontSize: 12, color: tokens.textSecondary),
                        ),
                      ),
                      Expanded(
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(99),
                          child: LinearProgressIndicator(
                            value: dayMax <= 0 ? 0 : (d.total / dayMax).clamp(0.03, 1.0),
                            minHeight: 8,
                            backgroundColor: tokens.borderColor,
                            color: tripAccent ?? tokens.primaryAccent,
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      SizedBox(
                        width: 84,
                        child: Text(
                          formatMoney(context, d.total, cur),
                          textAlign: TextAlign.end,
                          style: const TextStyle(fontWeight: FontWeight.w700),
                        ),
                      ),
                    ],
                  ),
                ),
            ],
          ),
          const SizedBox(height: 6),
        ],
      ],
      _ => const <Widget>[],
    };

    final numbersActions = <Widget>[
      if (_flag(ref, 'enableShareSummaryImage', id))
        IconButton(
          key: const Key('share-summary'),
          tooltip: l10n.ledShareSummary,
          constraints: const BoxConstraints(minWidth: 44, minHeight: 44),
          icon: const Icon(Icons.ios_share_rounded, size: 20),
          onPressed: () => _shareSummary(trip, totals.totalSpent, totals.averageCost, transfers),
        ),
      if (_flag(ref, 'enableSpendInsights', id))
        IconButton(
          key: const Key('open-insights'),
          tooltip: l10n.ledOpenInsights,
          constraints: const BoxConstraints(minWidth: 44, minHeight: 44),
          icon: const Icon(Icons.insights_rounded, size: 20),
          onPressed: () => context.push('/trip/$id/insights'),
        ),
    ];

    // The Summary in two lists so a wide screen can show them side by side (flag `enableSummaryTwoPane`).
    final topChildren = <Widget>[
      const LastSyncedCaption(),
      if (upgradesOn) SummaryAttentionBar(tripId: id, onTransfers: () => setState(() => _open.add('transfers'))),
      if (todayOn)
        Padding(
          padding: const EdgeInsets.only(bottom: 16),
          child: BentoTile(
            key: const Key('today-card'),
            tone: BentoTone.sky,
            padding: const EdgeInsets.all(14),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      BentoTile.eyebrow(context, BentoTone.sky, l10n.todayTitle),
                      const SizedBox(height: 4),
                      Text(
                        tripHeadline(context, tripStatus(trip.startDate, trip.endDate, nowDt)),
                        style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800),
                      ),
                    ],
                  ),
                ),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      BentoTile.eyebrow(context, BentoTone.sky, l10n.todaySpent),
                      const SizedBox(height: 4),
                      Text(
                        key: const Key('today-spent'),
                        formatMoney(
                          context,
                          spentOn([for (final d in allDays) (date: d.date, total: d.total)], todayDateString(nowDt)),
                          cur,
                        ),
                        style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800),
                      ),
                    ],
                  ),
                ),
                if (upNext != null)
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        BentoTile.eyebrow(context, BentoTone.sky, l10n.todayNext),
                        const SizedBox(height: 4),
                        Text(
                          key: const Key('today-next'),
                          upNext.title,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800),
                        ),
                        Text(
                          (upNext.startDateTime ?? '').length >= 16
                              ? upNext.startDateTime!.substring(5, 16).replaceFirst('T', ' ')
                              : '',
                          style: TextStyle(fontSize: 12, color: tokens.textSecondary),
                        ),
                      ],
                    ),
                  ),
              ],
            ),
          ),
        ),
      // Gone once everything is settled: nothing is left to prompt (Close out trip stays in the chips above).
      if (closeoutOn && !tripSettled)
        Padding(
          padding: const EdgeInsets.only(bottom: 16),
          child: BentoTile(
            key: const Key('closeout-prompt'),
            tone: BentoTone.butter,
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(l10n.closeoutPromptTitle, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800)),
                const SizedBox(height: 10),
                Row(
                  children: [
                    Icon(
                      allEven ? Icons.check_circle_rounded : Icons.radio_button_unchecked_rounded,
                      size: 20,
                      color: allEven ? tokens.colorSuccess : tokens.textSecondary,
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        allEven ? l10n.closeoutStepSettled : l10n.closeoutStepSettle(transfers.length),
                        key: const Key('closeout-settle-step'),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                Wrap(
                  spacing: 8,
                  runSpacing: 4,
                  children: [
                    if (!allEven && settleAllOn)
                      TextButton(
                        key: const Key('closeout-settle-all'),
                        onPressed: () => _settleAll(context, myPays, cur),
                        child: Text(l10n.ledSettleAllConfirm),
                      ),
                    TextButton.icon(
                      key: const Key('closeout-share'),
                      icon: const Icon(Icons.ios_share_rounded, size: 18),
                      label: Text(l10n.ledShareSummary),
                      onPressed: () => _shareSummary(trip, totals.totalSpent, totals.averageCost, transfers),
                    ),
                    TextButton.icon(
                      key: const Key('closeout-close'),
                      icon: const Icon(Icons.lock_outline_rounded, size: 18),
                      label: Text(l10n.closeoutClose),
                      onPressed: () => AppSheet.show<void>(
                        context: context,
                        builder: (_) => CloseoutSheet(tripId: id),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      if (celebrateOn && totals.totalSpent > 0)
        Padding(
          padding: const EdgeInsets.only(bottom: 16),
          child: BentoTile(
            key: const Key('settled-celebration'),
            tone: BentoTone.mint,
            padding: const EdgeInsets.fromLTRB(16, 14, 8, 14),
            child: Row(
              children: [
                TweenAnimationBuilder<double>(
                  tween: Tween(begin: 0, end: 1),
                  duration: AppMotion.of(context, const Duration(milliseconds: 700)),
                  curve: Curves.elasticOut,
                  builder: (_, v, child) => Transform.scale(scale: v, child: child),
                  child: Icon(Icons.verified_rounded, size: 40, color: tokens.colorSuccess),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(l10n.celebrateTitle, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800)),
                      Text(l10n.celebrateBody, style: TextStyle(fontSize: 13, color: tokens.textSecondary)),
                    ],
                  ),
                ),
                IconButton(
                  key: const Key('celebrate-share'),
                  tooltip: l10n.ledShareSummary,
                  constraints: const BoxConstraints(minWidth: 44, minHeight: 44),
                  icon: const Icon(Icons.ios_share_rounded),
                  onPressed: () => _shareSummary(trip, totals.totalSpent, totals.averageCost, transfers),
                ),
              ],
            ),
          ),
        ),
      if (nextOn && (nextPay != null || owedToMe.isNotEmpty))
        Padding(
          padding: const EdgeInsets.only(bottom: 16),
          child: BentoTile(
            key: const Key('next-action'),
            tone: nextPay != null ? BentoTone.peach : BentoTone.mint,
            padding: const EdgeInsets.fromLTRB(16, 12, 12, 12),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    nextPay != null
                        ? l10n.ledNextPay(nextPay.toLabel, formatMoney(context, nextPay.amount, cur))
                        : owedToMe.length == 1
                        ? l10n.ledNextOwedOne(
                            owedToMe.first.fromLabel,
                            formatMoney(context, owedToMe.first.amount, cur),
                          )
                        : l10n.ledNextOwedMany(
                            owedToMe.length,
                            formatMoney(context, owedToMe.fold<double>(0, (a, t) => a + t.amount), cur),
                          ),
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
                  ),
                ),
                if (nextPay != null) ...[
                  const SizedBox(width: 8),
                  ConstrainedBox(
                    constraints: const BoxConstraints(minWidth: 88, maxWidth: 120),
                    child: AppButton(
                      key: const Key('next-action-pay'),
                      label: l10n.ledSettle,
                      onPressed: () => _settle(context, nextPay),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      // 1. Hero boarding pass: what is owed, stamped SETTLED or NOT SETTLED.
      Padding(
        key: const Key('sticky-balance'),
        padding: const EdgeInsets.only(bottom: 20),
        child: _flipWrap(
          on: flipOn,
          back: () {
            final paid = spend.paid[mine] ?? 0.0, share = spend.share[mine] ?? 0.0;
            final diff = double.parse((paid - share).toStringAsFixed(2));
            final even = diff.abs() < 0.01;
            return PassBack(
              title: trip.name,
              eyebrow: l10n.ledYourShare,
              chipLabel: l10n.ledPassTitle,
              paid: formatMoney(context, paid, cur),
              share: formatMoney(context, share, cur),
              diff: '${diff > 0.005 ? '+' : (diff < -0.005 ? '-' : '')}${formatMoney(context, diff.abs(), cur)}',
              diffColor: even ? tokens.textPrimary : (diff > 0 ? tokens.colorSuccess : tokens.colorDanger),
              why: even ? l10n.ledPaidEven : (diff > 0 ? l10n.ledPaidMore : l10n.ledPaidLess),
              labels: (l10n.ledYouPaid, l10n.ledYourShare, l10n.ledDifference),
              explainLabel: l10n.ledExplainTitle,
              onExplain: _flag(ref, 'enableBalanceExplainer', id)
                  ? () => _showBalanceExplainer(
                      context,
                      l10n,
                      cur,
                      myBalanceLines(ref.read(tripExpensesProvider(id)).value ?? const <Expense>[], mine!),
                    )
                  : null,
            );
          },
          chipLabel: l10n.ledYourShare,
          flipLabel: _flipped ? l10n.ledPassTitle : l10n.ledYourShare,
          front: BoardingPassCard(
            tone: heroTone,
            banner: _PassBanner(
              coverUrl: trip.coverImageUrl,
              title: trip.name,
              dates: tripDates,
              eyebrow: l10n.ledPassTitle,
            ),
            top: Column(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                BentoTile.eyebrow(context, heroTone, heroLabel),
                const SizedBox(height: 4),
                // The digits roll like an odometer when an expense or a settlement changes the balance,
                // also when you come back to this page after adding one (the last shown figure is remembered).
                Builder(
                  builder: (_) {
                    final sp = _splitMoney(formatMoney(context, heroBalance.abs(), cur));
                    return RollingMoneyText(
                      key: const Key('hero-amount'),
                      memoryKey: 'hero-$id',
                      whole: sp.$1,
                      decimals: sp.$2 ?? '',
                      fontSize: compact ? 38 : 46,
                      color: heroColor,
                    );
                  },
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    StatusStamp(
                      key: const Key('settle-stamp'),
                      settled: tripSettled,
                      text: tripSettled ? l10n.ledStampSettled : l10n.ledStampNotSettled,
                      tone: heroTone,
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        '${trip.memberIds.length} ${l10n.ledHeroTravellers}',
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
      ),
      // Your money: what I still receive and what I still pay (people on the trip only).
      if (iAmIn && !flipOn && _flag(ref, 'enableYouPaidVsShare', id))
        _paidVsShareStrip(
          context: context,
          tokens: tokens,
          l10n: l10n,
          cur: cur,
          paid: spend.paid[mine] ?? 0.0,
          share: spend.share[mine] ?? 0.0,
          explain: _flag(ref, 'enableBalanceExplainer', id)
              ? () => _showBalanceExplainer(
                  context,
                  l10n,
                  cur,
                  myBalanceLines(ref.read(tripExpensesProvider(id)).value ?? const <Expense>[], mine),
                )
              : null,
        )
      else if (iAmIn && !flipOn)
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
            remainingLabel: outstanding < 0.01 ? l10n.ledProgressDone : l10n.ledProgressLeft(result.transfers.length),
          ),
        ),
    ];
    final restChildren = <Widget>[
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
      section(
        'transfers',
        l10n.ledWhoPays,
        subtitle: allEven ? l10n.ledAllSettled : l10n.ledProgressLeft(transfers.length),
        [
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
          if (upgradesOn && counts != null)
            Align(
              alignment: Alignment.centerLeft,
              child: TextButton.icon(
                key: const Key('how-it-works'),
                onPressed: () => AppSheet.show<void>(
                  context: context,
                  title: 'How it works',
                  builder: (_) => HowSettlementsWorkSheet(simplified: counts.simplified, direct: counts.direct),
                ),
                icon: const Icon(Icons.help_outline_rounded, size: 18),
                label: const Text('How it works'),
                style: TextButton.styleFrom(minimumSize: const Size(48, 48)),
              ),
            ),
          if (settleAllOn)
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: AppButton(
                key: const Key('settle-all'),
                label: l10n.ledSettleAll(
                  myPays.length,
                  formatMoney(context, myPays.fold<double>(0, (a, t) => a + t.amount), cur),
                ),
                onPressed: () => _settleAll(context, myPays, cur),
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
            for (final (i, t) in transfers.indexed) ...[
              Padding(
                key: Key('transfer-$i'),
                padding: EdgeInsets.only(bottom: upgradesOn ? 0 : 14),
                child: LuggageStubTile(
                  tone: isMe(t.from) ? BentoTone.peach : (isMe(t.to) ? BentoTone.mint : toneFor(t.from)),
                  badge: isMe(t.from) ? l10n.ledYouPay : (isMe(t.to) ? l10n.ledPaysYou : null),
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
              if (upgradesOn)
                Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: TransferExtras(
                    onCustom: () => _settle(context, t, focusAmount: true),
                    onRemind: isMe(t.from)
                        ? null
                        : () => ref
                              .read(shareServiceProvider)
                              .share(
                                reminderMessage(
                                  from: t.fromLabel,
                                  to: t.toLabel,
                                  amount: formatMoney(context, t.amount, cur),
                                  trip: trip.name,
                                ),
                                subject: 'Settle up: ${trip.name}',
                              ),
                  ),
                ),
            ],
        ],
        bare: true,
      ),
      // 3. Trip analytics: totals, where the money went, who paid, and each person's balance.
      section(
        'analytics',
        l10n.ledNumbers,
        actions: numbersActions,
        subtitle: formatMoney(context, totals.totalSpent, cur),
        [
          if (upgradesOn)
            AtAGlanceGrid(
              total: formatMoney(context, totals.totalSpent, cur),
              perHead: formatMoney(context, totals.averageCost, cur),
              topCategory: totals.top?.name,
              topSpender: paidList.isEmpty ? null : names[paidList.first.key],
            ),
          if (planOn)
            Padding(
              padding: const EdgeInsets.only(top: 6, bottom: 16),
              child: BentoTile(
                key: const Key('plan-card'),
                tone: BentoTone.lilac,
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    BentoTile.eyebrow(context, BentoTone.lilac, l10n.planTitle),
                    if (budgetOn) ...[
                      const SizedBox(height: 10),
                      InkWell(
                        key: const Key('budget-card'),
                        borderRadius: BorderRadius.circular(12),
                        onTap: () => _editBudget(context, budget),
                        child: ConstrainedBox(
                          constraints: const BoxConstraints(minHeight: 48),
                          child: budget <= 0
                              ? Padding(
                                  padding: const EdgeInsets.symmetric(vertical: 6),
                                  child: Row(
                                    children: [
                                      const Icon(Icons.savings_outlined),
                                      const SizedBox(width: 10),
                                      Expanded(
                                        child: Text(
                                          l10n.ledBudgetSet,
                                          style: const TextStyle(fontWeight: FontWeight.w700),
                                        ),
                                      ),
                                      Icon(Icons.chevron_right_rounded, color: tokens.textMuted),
                                    ],
                                  ),
                                )
                              : Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      children: [
                                        Expanded(
                                          child: Text(
                                            l10n.ledBudgetOf(
                                              formatMoney(context, totals.totalSpent, cur),
                                              formatMoney(context, budget, cur),
                                            ),
                                            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
                                          ),
                                        ),
                                        Icon(Icons.edit_outlined, size: 18, color: tokens.textMuted),
                                      ],
                                    ),
                                    const SizedBox(height: 8),
                                    ClipRRect(
                                      borderRadius: BorderRadius.circular(99),
                                      child: TweenAnimationBuilder<double>(
                                        tween: Tween(end: budgetState.fraction),
                                        duration: AppMotion.of(context, const Duration(milliseconds: 400)),
                                        curve: Curves.easeOutCubic,
                                        builder: (_, v, _) => LinearProgressIndicator(
                                          key: const Key('budget-bar'),
                                          value: v,
                                          minHeight: 8,
                                          backgroundColor: tokens.borderColor,
                                          color: budgetColor,
                                        ),
                                      ),
                                    ),
                                    const SizedBox(height: 6),
                                    Text(
                                      key: const Key('budget-status'),
                                      budgetState.remaining >= 0
                                          ? l10n.ledBudgetLeft(formatMoney(context, budgetState.remaining, cur))
                                          : l10n.ledBudgetOver(formatMoney(context, -budgetState.remaining, cur)),
                                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: budgetColor),
                                    ),
                                    if (allowance != null)
                                      Text(
                                        key: const Key('budget-daily'),
                                        l10n.planDaily(formatMoney(context, allowance, cur), daysLeft),
                                        style: TextStyle(fontSize: 12, color: tokens.textSecondary),
                                      ),
                                    if (burn != null)
                                      Text(
                                        l10n.planPace(formatMoney(context, burn.projectedTotal, cur)),
                                        style: TextStyle(fontSize: 12, color: tokens.textSecondary),
                                      ),
                                    Text(l10n.ledBudgetLocal, style: TextStyle(fontSize: 11, color: tokens.textMuted)),
                                  ],
                                ),
                        ),
                      ),
                    ],
                    if (burnRateOn && burn != null) ...[
                      const SizedBox(height: 10),
                      Container(
                        key: const Key('burn-rate-pace-card'),
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                        decoration: BoxDecoration(
                          color: tokens.tones[BentoTone.butter].bg,
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: const Color(0xFFFF7A00).withValues(alpha: 0.3)),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'PACE · DAY ${burn.daysElapsed} OF ${burn.daysTotal}',
                              style: const TextStyle(
                                fontSize: 10.5,
                                fontWeight: FontWeight.w800,
                                letterSpacing: 0.8,
                                color: Color(0xFFFF7A00),
                              ),
                            ),
                            const SizedBox(height: 3),
                            Text(
                              'At this pace, ~${formatMoney(context, burn.projectedTotal, cur)} by trip end',
                              style: TextStyle(fontSize: 14.5, fontWeight: FontWeight.w800, color: tokens.textPrimary),
                            ),
                            Text(
                              '${formatMoney(context, burn.dailyAverage, cur)}/day average so far',
                              style: TextStyle(fontSize: 12, color: tokens.textSecondary),
                            ),
                          ],
                        ),
                      ),
                    ],
                    if (suggestionsOn && tips.isNotEmpty) ...[
                      if (budgetOn) Divider(height: 22, color: tokens.borderColor),
                      if (!budgetOn) const SizedBox(height: 8),
                      for (final (i, s) in tips.indexed)
                        Padding(
                          key: Key('suggestion-$i'),
                          padding: const EdgeInsets.only(bottom: 8),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Padding(
                                padding: const EdgeInsets.only(top: 1, right: 10),
                                child: Icon(Icons.lightbulb_outline_rounded, size: 18, color: tokens.textSecondary),
                              ),
                              Expanded(
                                child: Text(
                                  suggestionText(l10n, context, s, cur),
                                  style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, height: 1.3),
                                ),
                              ),
                              if (s.kind == SuggestionKind.setBudget && budgetOn)
                                TextButton(
                                  style: TextButton.styleFrom(foregroundColor: tokens.textPrimary),
                                  key: const Key('suggestion-set-budget'),
                                  onPressed: () => _editBudget(context, budget),
                                  child: Text(l10n.ledBudgetAction),
                                ),
                            ],
                          ),
                        ),
                    ],
                  ],
                ),
              ),
            ),
          // Headline numbers in one card.
          Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: BentoTile(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
              child: IntrinsicHeight(
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    for (final (i, cell) in [
                      (l10n.expTotalSpent, formatMoney(context, totals.totalSpent, cur), const Key('stat-total')),
                      (l10n.expPerPerson, formatMoney(context, totals.averageCost, cur), const Key('stat-avg')),
                      if (totals.top != null)
                        (
                          l10n.expTopCategory,
                          '${totals.top!.name} ${totals.top!.percentage.round()}%',
                          const Key('stat-top'),
                        ),
                    ].indexed) ...[
                      if (i > 0) VerticalDivider(width: 17, thickness: 1, color: tokens.borderColor),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              cell.$1,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: tokens.textSecondary),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              cell.$2,
                              key: cell.$3,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                fontFamily: AppTypography.fontTitle,
                                fontSize: 16,
                                fontWeight: FontWeight.w800,
                                color: tokens.textPrimary,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ),
          if (numberTabs.length > 1)
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  for (final tab in numberTabs)
                    ChoiceChip(
                      key: Key('numbers-tab-${tab.$1}'),
                      showCheckmark: false,
                      shape: const StadiumBorder(),
                      label: Text(tab.$2),
                      selected: numbersTab == tab.$1,
                      onSelected: (_) => setState(() => _numbersTab = tab.$1),
                    ),
                ],
              ),
            ),
          AnimatedSwitcher(
            duration: AppMotion.of(context, const Duration(milliseconds: 220)),
            child: Column(
              key: ValueKey(numbersTab),
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: numbersBody(),
            ),
          ),
        ],
      ),
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
              // The person who received the money confirms it here; everyone else just sees the state.
              trailing: e.settlementConfirmedAt == null && _canConfirm(e)
                  ? FilledButton.tonal(
                      key: Key('history-confirm-${e.id}'),
                      onPressed: () => unawaited(
                        ref
                            .read(expenseRepositoryProvider)
                            .confirmSettlement(e.id, userId: ref.read(authStateProvider).userId ?? ''),
                      ),
                      child: const Text('Confirm received'),
                    )
                  : Text(
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
    ];
    final twoPaneOn = _flag(ref, 'enableSummaryTwoPane', id);

    return Stack(
      children: [
        AppPullToRefresh(
          onRefresh: ref.read(refreshTripsProvider),
          child: LayoutBuilder(
            builder: (context, box) {
              final padding = EdgeInsets.fromLTRB(pad, 12, pad, 120);
              if (twoPaneOn && box.maxWidth >= 840) {
                return Row(
                  key: const Key('ledger-two-pane'),
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: ListView(
                        key: const Key('ledger-list-left'),
                        physics: const AlwaysScrollableScrollPhysics(),
                        padding: padding,
                        children: topChildren,
                      ),
                    ),
                    VerticalDivider(width: 1, color: tokens.borderColor),
                    Expanded(
                      child: ListView(
                        key: const Key('ledger-list'),
                        physics: const AlwaysScrollableScrollPhysics(),
                        padding: padding,
                        children: restChildren,
                      ),
                    ),
                  ],
                );
              }
              return ListView(
                key: const Key('ledger-list'),
                controller: _scroll,
                physics: const AlwaysScrollableScrollPhysics(),
                padding: padding,
                children: [...topChildren, ...restChildren],
              );
            },
          ),
        ),
        if (upgradesOn)
          Positioned(
            top: 8,
            left: 12,
            right: 12,
            child: AnimatedSwitcher(
              duration: AppMotion.of(context, const Duration(milliseconds: 200)),
              transitionBuilder: (child, anim) => FadeTransition(
                opacity: anim,
                child: SlideTransition(
                  position: Tween(begin: const Offset(0, -0.4), end: Offset.zero).animate(anim),
                  child: child,
                ),
              ),
              child: _showMini
                  ? MiniPassBar(
                      key: const Key('mini-pass'),
                      route: tripRouteText(trip),
                      meta: [
                        if (tripDays(trip) > 0) '${tripDays(trip)} Day${tripDays(trip) == 1 ? '' : 's'}',
                        if (trip.stops.isNotEmpty) '${trip.stops.length} Stop${trip.stops.length == 1 ? '' : 's'}',
                      ].join(' · '),
                      label: tripSettled ? 'SETTLED' : 'OUTSTANDING',
                      amount: formatMoney(context, outstanding, cur),
                      amountColor: tripSettled ? tokens.colorSuccess : tokens.colorDanger,
                      onTap: () => _scroll.animateTo(
                        0,
                        duration: AppMotion.of(context, const Duration(milliseconds: 300)),
                        curve: Curves.easeOutCubic,
                      ),
                    )
                  : const SizedBox.shrink(),
            ),
          ),
        AddExpenseFab(tripId: id),
      ],
    );
  }

  /// "You paid X, your share Y, difference Z": why you owe or are owed, before recorded settlements.
  Widget _paidVsShareStrip({
    required BuildContext context,
    required AppTokens tokens,
    required AppLocalizations l10n,
    required String cur,
    required double paid,
    required double share,
    required VoidCallback? explain,
  }) {
    final diff = double.parse((paid - share).toStringAsFixed(2));
    final tone = diff.abs() < 0.01 ? tokens.textPrimary : (diff > 0 ? tokens.colorSuccess : tokens.colorDanger);
    final why = diff.abs() < 0.01 ? l10n.ledPaidEven : (diff > 0 ? l10n.ledPaidMore : l10n.ledPaidLess);
    Widget cell(String label, String value, Color color) => Expanded(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: tokens.textSecondary),
          ),
          const SizedBox(height: 2),
          Text(
            value,
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: color),
          ),
        ],
      ),
    );
    final diffText = '${diff > 0.005 ? '+' : (diff < -0.005 ? '-' : '')}${formatMoney(context, diff.abs(), cur)}';
    return Padding(
      padding: const EdgeInsets.only(bottom: 20),
      child: BentoTile(
        key: const Key('paid-vs-share'),
        padding: const EdgeInsets.all(14),
        onTap: explain,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                cell(l10n.ledYouPaid, formatMoney(context, paid, cur), tokens.textPrimary),
                cell(l10n.ledYourShare, formatMoney(context, share, cur), tokens.textPrimary),
                cell(l10n.ledDifference, diffText, tone),
              ],
            ),
            const SizedBox(height: 10),
            Text(why, style: TextStyle(fontSize: 12, color: tokens.textSecondary)),
            if (explain != null) ...[
              const SizedBox(height: 4),
              Text(
                l10n.ledExplainTap,
                style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: tokens.primaryAccent),
              ),
            ],
          ],
        ),
      ),
    );
  }

  /// True when I am the member this settlement was paid to (the one who must confirm it).
  bool _canConfirm(Expense e) {
    final uid = ref.read(authStateProvider).userId;
    if (uid == null || !e.isSettlement || e.splitMemberIds.isEmpty) return false;
    if (!_flag(ref, 'enableSettlementConfirmation', widget.tripId)) return false;
    final members = ref.read(tripMembersProvider(widget.tripId)).value ?? const <Member>[];
    return members.where((m) => m.id == e.splitMemberIds.first).firstOrNull?.linkedUserId == uid;
  }

  Widget _flipWrap({
    required bool on,
    required Widget front,
    required Widget Function() back,
    required String chipLabel,
    required String flipLabel,
  }) {
    if (!on) return front;
    return FlipCard(
      key: const Key('pass-flip'),
      flipped: _flipped,
      label: 'Flip to $flipLabel',
      onTap: () => setState(() => _flipped = !_flipped),
      front: Stack(
        children: [
          front,
          Positioned(top: 12, right: 12, child: FlipChip(chipLabel, key: const Key('pass-flip-chip'))),
        ],
      ),
      back: back(),
    );
  }

  void _showBalanceExplainer(BuildContext context, AppLocalizations l10n, String cur, List<BalanceLine> lines) {
    AppSheet.show<void>(
      context: context,
      title: l10n.ledExplainTitle,
      builder: (ctx) {
        final tokens = ctx.tokens;
        if (lines.isEmpty) {
          return Padding(
            key: const Key('balance-explainer'),
            padding: const EdgeInsets.all(20),
            child: Text(l10n.ledExplainEmpty, style: TextStyle(color: tokens.textSecondary)),
          );
        }
        return ConstrainedBox(
          constraints: BoxConstraints(maxHeight: MediaQuery.of(ctx).size.height * 0.6),
          child: ListView(
            key: const Key('balance-explainer'),
            shrinkWrap: true,
            children: [
              for (final l in lines)
                ListTile(
                  title: Text(l.title, maxLines: 1, overflow: TextOverflow.ellipsis),
                  subtitle: Text(l10n.ledExplainRow(formatMoney(ctx, l.paid, cur), formatMoney(ctx, l.share, cur))),
                  trailing: Text(
                    '${l.diff > 0 ? '+' : '-'}${formatMoney(ctx, l.diff.abs(), cur)}',
                    style: TextStyle(
                      fontWeight: FontWeight.w700,
                      color: l.diff > 0 ? tokens.colorSuccess : tokens.colorDanger,
                    ),
                  ),
                ),
            ],
          ),
        );
      },
    );
  }
}

/// Banner of the settlement pass: a deep navy-to-teal gradient (the trip cover under a dark wash when it has one),
/// a faint flight arc, the trip name and its dates in white.
class _PassBanner extends StatelessWidget {
  const _PassBanner({required this.coverUrl, required this.title, required this.dates, required this.eyebrow});

  final String? coverUrl;
  final String title;
  final String dates;
  final String eyebrow;

  @override
  Widget build(BuildContext context) {
    // At least 150 high, taller when the text is scaled up, so nothing is ever clipped.
    return ConstrainedBox(
      key: const Key('ledger-banner'),
      constraints: const BoxConstraints(minHeight: 150),
      child: Stack(
        children: [
          const Positioned.fill(
            child: DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [Color(0xFF0B1F33), Color(0xFF123A57), Color(0xFF1F6F78)],
                ),
              ),
            ),
          ),
          if (coverUrl != null && coverUrl!.isNotEmpty)
            Positioned.fill(
              child: Image(
                image: CachedPhotoProvider(coverUrl!),
                fit: BoxFit.cover,
                errorBuilder: (_, _, _) => const SizedBox.shrink(),
              ),
            ),
          // Soft teal glow top-right, and a wash so white text is readable on any photo.
          const Positioned.fill(
            child: DecoratedBox(
              decoration: BoxDecoration(
                gradient: RadialGradient(
                  center: Alignment(0.9, -1.1),
                  radius: 1.1,
                  colors: [Color(0x3329D9C2), Color(0x00000000)],
                ),
              ),
            ),
          ),
          Positioned.fill(
            child: DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    Colors.black.withValues(alpha: coverUrl == null ? 0.0 : 0.25),
                    Colors.black.withValues(alpha: coverUrl == null ? 0.18 : 0.6),
                  ],
                ),
              ),
            ),
          ),
          Positioned.fill(child: CustomPaint(painter: _FlightArcPainter())),
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 14),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Icon(Icons.flight_takeoff_rounded, size: 15, color: Colors.white70),
                    const SizedBox(width: 6),
                    Flexible(
                      child: Text(
                        eyebrow.toUpperCase(),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontFamily: AppTypography.fontMono,
                          fontSize: 11,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 1.6,
                          color: Colors.white70,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 34),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontFamily: AppTypography.fontTitle,
                        fontSize: 27,
                        fontWeight: FontWeight.w800,
                        letterSpacing: -0.6,
                        color: Colors.white,
                        shadows: [Shadow(color: Color(0x66000000), blurRadius: 10)],
                      ),
                    ),
                    if (dates.isNotEmpty)
                      Padding(
                        padding: const EdgeInsets.only(top: 2),
                        child: Text(
                          dates,
                          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Colors.white70),
                        ),
                      ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// A faint dashed route across the banner, like a flight path on a departures board.
class _FlightArcPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final path = Path()
      ..moveTo(size.width * 0.05, size.height * 0.92)
      ..quadraticBezierTo(size.width * 0.5, -size.height * 0.15, size.width * 0.96, size.height * 0.5);
    final paint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.3
      ..color = Colors.white.withValues(alpha: 0.22);
    for (final m in path.computeMetrics()) {
      for (var d = 0.0; d < m.length; d += 9) {
        canvas.drawPath(m.extractPath(d, d + 4), paint);
      }
    }
  }

  @override
  bool shouldRepaint(_FlightArcPainter old) => false;
}

class _SettleSheet extends ConsumerStatefulWidget {
  const _SettleSheet({required this.tripId, required this.transfer, required this.currency, this.focusAmount = false});

  /// Open with the amount selected for typing (the Custom amount action).
  final bool focusAmount;
  final String tripId;
  final Transfer transfer;
  final String currency;

  @override
  ConsumerState<_SettleSheet> createState() => _SettleSheetState();
}

class _SettleSheetState extends ConsumerState<_SettleSheet> {
  late final _amount = TextEditingController(text: widget.transfer.amount.toStringAsFixed(2))
    ..selection = widget.focusAmount
        ? TextSelection(baseOffset: 0, extentOffset: widget.transfer.amount.toStringAsFixed(2).length)
        : const TextSelection.collapsed(offset: -1);
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
      recorderMemberId: ref.read(myMemberIdProvider(widget.tripId)),
      groups: ref.read(tripGroupsProvider(widget.tripId)).value ?? const [],
    );
    if (plan == null) {
      setState(() => _error = l10n.ledAmountInvalid);
      return;
    }
    setState(() => _busy = true);
    final nav = Navigator.of(context);
    final messenger = ScaffoldMessenger.of(context);
    final repo = ref.read(expenseRepositoryProvider);
    final userId = ref.read(authStateProvider).userId ?? '';
    final undoOn = ref.read(flagProvider(('enableUndoSettlement', widget.tripId))).value ?? false;
    final r = await repo.submit(plan.submission, tripId: widget.tripId, userId: userId);
    if (!mounted) return;
    if (r.isOk) {
      AppFeedback.success();
      nav.pop();
      showSettleSnack(
        messenger,
        l10n.ledSettledToast,
        undoOn ? () => unawaited(repo.delete(r.expenseId!, userId: userId)) : null,
      );
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

  void _openUpiSheet() {
    final trip = ref.read(tripProvider(widget.tripId)).value;
    final amount = _value ?? widget.transfer.amount;
    UpiPaymentSheet.show(
      context,
      fromName: widget.transfer.fromLabel,
      toName: widget.transfer.toLabel,
      toMemberId: widget.transfer.toMemberId,
      initialUpiId: _upi.text.trim(),
      amount: amount,
      currency: widget.currency,
      tripName: trip?.name,
      onConfirmSettled: () async {
        await _submit();
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final t = widget.transfer;
    final v = _value;
    final partial = v != null && v > 0 && v < t.amount - 0.01;
    final dateNote = ref.watch(flagProvider(('enableSettlementDateNote', widget.tripId))).value ?? false;
    ref.watch(flagProvider(('enableUndoSettlement', widget.tripId))); // loaded before Confirm reads it
    final upiOn = ref.watch(flagProvider(('enableUpiPayments', widget.tripId))).value ?? false;
    final shareOn = ref.watch(flagProvider(('enableWhatsAppSettlementShare', widget.tripId))).value ?? false;
    final roundingOn = ref.watch(flagProvider(('enableSettleRounding', widget.tripId))).value ?? true;
    final round = roundDownToClean(t.amount);
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
            autofocus: widget.focusAmount,
            label: l10n.ledAmount,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            onChanged: (_) => setState(() => _error = null),
          ),
          if (roundingOn && round != null && !(v != null && (v - round).abs() < 0.005))
            Align(
              alignment: Alignment.centerLeft,
              child: TextButton(
                key: const Key('settle-round'),
                onPressed: () => setState(() {
                  _amount.text = round == round.roundToDouble() ? round.toInt().toString() : round.toString();
                  _error = null;
                }),
                child: Text(l10n.settleRound(formatMoney(context, round, widget.currency))),
              ),
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
            Row(
              children: [
                Expanded(
                  child: AppButton(
                    key: const Key('settle-upi-pay'),
                    label: l10n.upiPay,
                    variant: AppButtonVariant.secondary,
                    onPressed: _payUpi,
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: AppButton(
                    key: const Key('settle-upi-apps'),
                    label: 'Apps & QR',
                    icon: Icons.qr_code_2_rounded,
                    variant: AppButtonVariant.secondary,
                    onPressed: _openUpiSheet,
                  ),
                ),
              ],
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

/// The sentence for one tip, in the app language.
String suggestionText(AppLocalizations l10n, BuildContext context, Suggestion s, String cur) {
  String money(double v) => formatMoney(context, v, cur);
  return switch (s.kind) {
    SuggestionKind.setBudget => l10n.sugSetBudget,
    SuggestionKind.overBudget => l10n.sugOverBudget(money(s.amount ?? 0)),
    SuggestionKind.overPace => l10n.sugOverPace(money(s.amount ?? 0)),
    SuggestionKind.nearBudget => l10n.sugNearBudget((s.percent ?? 0).round()),
    SuggestionKind.openPayments => l10n.sugOpenPayments(s.count ?? 0),
    SuggestionKind.payerHeavy => l10n.sugPayerHeavy(s.name ?? '', (s.percent ?? 0).round()),
    SuggestionKind.topCategory => l10n.sugTopCategory(s.name ?? '', (s.percent ?? 0).round()),
    SuggestionKind.biggestDay => l10n.sugBiggestDay(
      (s.date ?? '').length >= 10 ? s.date!.substring(5) : (s.date ?? ''),
      money(s.amount ?? 0),
    ),
  };
}

/// The last days of spend as one compact bar chart. Tap a bar to read its day and amount.
class _DayChart extends StatefulWidget {
  const _DayChart({required this.days, required this.maxTotal, required this.color, required this.format, super.key});

  final List<DaySpend> days;
  final double maxTotal;
  final Color color;
  final String Function(double) format;

  @override
  State<_DayChart> createState() => _DayChartState();
}

class _DayChartState extends State<_DayChart> {
  int? _picked;

  @override
  Widget build(BuildContext context) {
    final t = context.tokens;
    final days = widget.days;
    final i = _picked != null && _picked! < days.length ? _picked! : days.length - 1;
    final shown = days[i];
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          '${shown.date.length >= 10 ? shown.date.substring(5) : shown.date} · ${widget.format(shown.total)}',
          key: const Key('day-chart-selected'),
          style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800),
        ),
        const SizedBox(height: 10),
        SizedBox(
          height: 120,
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              for (final (k, d) in days.indexed)
                Expanded(
                  child: GestureDetector(
                    key: Key('day-bar-$k'),
                    behavior: HitTestBehavior.opaque,
                    onTap: () => setState(() => _picked = k),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 2),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.end,
                        children: [
                          Flexible(
                            child: FractionallySizedBox(
                              heightFactor: widget.maxTotal <= 0 ? 0.03 : (d.total / widget.maxTotal).clamp(0.03, 1.0),
                              child: DecoratedBox(
                                decoration: BoxDecoration(
                                  color: k == i ? widget.color : widget.color.withValues(alpha: 0.35),
                                  borderRadius: const BorderRadius.vertical(top: Radius.circular(6)),
                                ),
                                child: const SizedBox(width: double.infinity),
                              ),
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            d.date.length >= 10 ? d.date.substring(8) : '',
                            style: TextStyle(fontSize: 10, color: k == i ? t.textPrimary : t.textMuted),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
            ],
          ),
        ),
      ],
    );
  }
}

/// The "payment recorded" toast; with [onUndo] it carries an UNDO that moves the payment to the recycle bin.
void showSettleSnack(ScaffoldMessengerState messenger, String message, VoidCallback? onUndo) {
  messenger.hideCurrentSnackBar();
  messenger.showSnackBar(
    SnackBar(
      content: Text(message),
      persist: false,
      duration: const Duration(seconds: 6),
      action: onUndo == null
          ? null
          : SnackBarAction(
              label: 'UNDO',
              onPressed: () {
                AppFeedback.tap();
                onUndo();
              },
            ),
    ),
  );
}
