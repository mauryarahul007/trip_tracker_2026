import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/auth_state.dart';
import '../../../core/clock.dart';
import '../../../core/format/money.dart';
import '../../../domain/logic/expense_form_logic.dart';
import '../../../core/storage/prefs.dart';
import '../../../data/providers.dart';
import '../../../domain/logic/expense_list_logic.dart';
import '../../../domain/models/expense.dart';
import '../../../domain/models/member.dart';
import '../../../l10n/l10n_ext.dart';
import '../../../shared/theme/app_icons.dart';
import '../../../shared/theme/app_tokens.dart';
import '../../../shared/theme/app_typography.dart';
import '../../../shared/widgets/app_button.dart';
import '../../../shared/widgets/bento_tile.dart';
import '../../../shared/widgets/app_sheet.dart';
import '../../../shared/widgets/app_text_field.dart';
import '../../../shared/widgets/empty_state.dart';
import '../../../shared/widgets/pull_to_refresh.dart';
import '../../../shared/widgets/undo_snackbar.dart';
import '../../trip_details/application/trip_nav.dart';
import '../../trips/application/trips_providers.dart';
import '../application/expenses_providers.dart';
import '../application/money_providers.dart';
import 'closeout_sheet.dart';
import 'conflict_sheet.dart';
import 'quick_add_sheet.dart';
import 'trip_tools_sheet.dart';
import 'widgets/expense_detail_sheet.dart';
import 'widgets/expense_filter_sheet.dart';
import 'widgets/expense_row.dart';
import 'widgets/expense_swipe.dart';

const _pageSize = 50;
const _compactPrefKey = 'tt-compact-ledger';

bool _flag(WidgetRef ref, String key, String tripId) => ref.watch(flagProvider((key, tripId))).value ?? false;

/// Expenses tab: summary, search/filters, day-grouped list with swipe actions,
/// settlements section, pending-sync / dispute / approval badges.
class ExpensesTab extends ConsumerStatefulWidget {
  const ExpensesTab({required this.tripId, super.key});
  final String tripId;

  @override
  ConsumerState<ExpensesTab> createState() => _ExpensesTabState();
}

/// Window width from which the expense detail opens in a side panel.
const double _kDetailPanelBreakpoint = 1100;

class _ExpensesTabState extends ConsumerState<ExpensesTab> {
  final _search = TextEditingController();
  Timer? _debounce;
  int _visible = _pageSize;

  /// Days the user toggled away from the default (collapsed, like the web).
  final _expandedDays = <String>{};
  final _hidden = <String>{}; // rows removed from view the instant they are swiped

  /// Wide windows show the selected expense in a side panel (board 08) instead of a bottom sheet.
  String? _selectedId;
  bool _compact = false;

  @override
  void initState() {
    super.initState();
    _compact = ref.read(sharedPreferencesProvider).getBool(_compactPrefKey) ?? false;
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _search.dispose();
    super.dispose();
  }

  String get id => widget.tripId;

  void _onSearch(String q) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 200), () {
      final f = ref.read(expenseFiltersProvider(id));
      ref.read(expenseFiltersProvider(id).notifier).set(f.copyWith(query: q));
      if (mounted) setState(() => _visible = _pageSize);
    });
  }

  void _setFilters(ExpenseFilters f) {
    ref.read(expenseFiltersProvider(id).notifier).set(f);
    setState(() => _visible = _pageSize);
  }

  Future<void> _delete(Expense e) async {
    final l10n = context.l10n;
    final repo = ref.read(expenseRepositoryProvider);
    final uid = ref.read(authStateProvider).userId ?? '';
    setState(() => _hidden.add(e.id));
    await repo.delete(e.id, userId: uid);
    if (!mounted) return;
    setState(() => _hidden.remove(e.id));
    UndoSnackbar.show(context: context, message: l10n.expDeleted, onUndo: () => unawaited(repo.restore(e.id)));
  }

  void _edit(Expense e) => context.push('/trip/$id/expenses/${e.id}/edit');

  void _openDetail(Expense e) {
    if (MediaQuery.sizeOf(context).width >= _kDetailPanelBreakpoint) {
      setState(() => _selectedId = e.id);
      return;
    }
    AppSheet.show<void>(
      context: context,
      builder: (sheetCtx) => ExpenseDetailSheet(
        tripId: id,
        expenseId: e.id,
        onEdit: () {
          Navigator.of(sheetCtx).pop();
          _edit(e);
        },
        onDelete: () {
          Navigator.of(sheetCtx).pop();
          unawaited(_delete(e));
        },
      ),
    );
  }

  Future<void> _openFilters() async {
    final all = ref.read(tripExpensesProvider(id)).value ?? const <Expense>[];
    await AppSheet.show<void>(
      context: context,
      title: context.l10n.expFilters,
      builder: (_) => ExpenseFilterSheet(
        initial: ref.read(expenseFiltersProvider(id)),
        all: all,
        members: ref.read(tripMembersProvider(id)).value ?? const <Member>[],
        categories: ref.read(tripCategoriesProvider(id)),
        myMemberId: ref.read(myMemberIdProvider(id)),
        onApply: _setFilters,
      ),
    );
  }

  void _toggleCompact() {
    setState(() => _compact = !_compact);
    unawaited(ref.read(sharedPreferencesProvider).setBool(_compactPrefKey, _compact));
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final tokens = context.tokens;
    final trip = ref.watch(tripProvider(id)).value;
    final all = ref.watch(tripExpensesProvider(id));
    if (trip == null || all.isLoading) return const Center(child: CircularProgressIndicator());

    final members = {for (final m in ref.watch(tripMembersProvider(id)).value ?? const <Member>[]) m.id: m};
    final categories = ref.watch(tripCategoriesProvider(id));
    final filters = ref.watch(expenseFiltersProvider(id));
    final filtered = ref.watch(filteredExpensesProvider(id)).where((e) => !_hidden.contains(e.id)).toList();
    final active = (all.value ?? const <Expense>[]).where((e) => !_hidden.contains(e.id)).toList();
    final myMember = ref.watch(myMemberIdProvider(id));
    final uid = ref.watch(authStateProvider).userId;
    final isAdmin = ref.watch(isTripAdminProvider(id));
    final dirty = ref.watch(dirtyIdsProvider).value ?? const <String>{};
    final conflicts = ref.watch(conflictIdsProvider(id));
    final visibleMembers = ref.watch(visibleMembersProvider(id));
    final totals = computeTotals(active, visibleMemberCount: visibleMembers.length, categories: categories);
    final compactActive = _flag(ref, 'enableCompactLedgerView', id) && _compact;
    final quickChips = _flag(ref, 'enableExpenseQuickFilterChips', id);
    final binOn = _flag(ref, 'enableRecycleBin', id);

    final shown = filtered.take(_visible).toList();
    final dayGroups = groupByDay(shown.where(isActualExpense).toList());
    final settlementGroups = groupByDay(shown.where((e) => !isActualExpense(e)).toList());
    final allExpanded = dayGroups.isNotEmpty && dayGroups.every((g) => _expandedDays.contains(g.date));

    final settlement = ref.watch(tripSettlementProvider(id));
    final chips = attentionChips(
      trip: trip,
      myMemberId: myMember,
      balances: settlement?.balances ?? const [],
      expenses: active,
      members: ref.watch(tripMembersProvider(id)).value ?? const <Member>[],
      disputesEnabled: _flag(ref, 'enableExpenseDisputes', id),
      closeoutEnabled: _flag(ref, 'enableTripCloseout', id),
      today: _today(ref),
    );
    final sync = ref.watch(syncStatusProvider).value;

    String chipLabel(AttentionChip c) => switch (c.id) {
      'owe' => l10n.chipOwe,
      'owed' => l10n.chipOwed,
      'disputes' => l10n.chipDisputes(c.count),
      'invites' => l10n.chipInvites(c.count),
      _ => l10n.chipCloseout,
    };

    void chipTap(AttentionChip c) {
      if (c.id == 'closeout') {
        AppSheet.show<void>(
          context: context,
          builder: (_) => CloseoutSheet(tripId: id),
        );
        return;
      }
      final target = c.id == 'invites' ? 'members' : 'ledger';
      context.go('/trip/$id/$target');
    }

    // Desktop (board 08): rows become table rows with column headers.
    final wide = MediaQuery.sizeOf(context).width >= _kDetailPanelBreakpoint;

    Widget rowFor(Expense e, {required bool lastInGroup}) {
      if (wide) {
        return _TableRow(
          expense: e,
          baseCurrency: trip.baseCurrency,
          payer: members[e.paidBy]?.name ?? '',
          category: categories.where((c) => c.id == e.category).firstOrNull?.name ?? e.category,
          selected: e.id == _selectedId,
          onTap: () => _openDetail(e),
        );
      }
      final row = ExpenseRow(
        expense: e,
        trip: trip,
        members: members,
        categories: categories,
        myMemberId: myMember,
        compact: compactActive,
        colorRings: _flag(ref, 'enableCategoryColorRings', id),
        isDirty: dirty.contains(e.id),
        isConflict: conflicts.contains(e.id),
        onTap: () => _openDetail(e),
      );
      // Bento: each expense is a rounded tile tinted by its category.
      final body = Padding(
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(tokens.radiusMd),
          child: ColoredBox(color: tokens.tones[toneFor(e.category)].bg, child: row),
        ),
      );
      if (!canManageExpense(e, isAdmin: isAdmin, userId: uid)) return body;
      return ExpenseSwipe(
        itemKey: ValueKey('swipe-${e.id}'),
        onEdit: isActualExpense(e) ? () => _edit(e) : null,
        onDelete: () => unawaited(_delete(e)),
        child: body,
      );
    }

    final sticky = _flag(ref, 'enableStickyDayHeaders', id);
    List<Widget> section(List<DayGroup> groups, {required bool collapsible}) {
      SliverPersistentHeader headerFor(DayGroup g, {required bool expanded}) => SliverPersistentHeader(
        pinned: sticky && expanded,
        delegate: _DayHeader(
          date: g.date,
          total: formatMoney(context, g.total, trip.baseCurrency),
          count: g.expenses.length,
          expanded: expanded,
          collapsible: collapsible,
          semantics: l10n.expDaySemantics(g.date, g.expenses.length, formatMoney(context, g.total, trip.baseCurrency)),
          onTap: () =>
              setState(() => _expandedDays.contains(g.date) ? _expandedDays.remove(g.date) : _expandedDays.add(g.date)),
          background: tokens.bgPage,
          textColor: tokens.textPrimary,
          mutedColor: tokens.textMuted,
        ),
      );
      SliverList listFor(DayGroup g) => SliverList.builder(
        itemCount: g.expenses.length,
        itemBuilder: (_, i) => rowFor(g.expenses[i], lastInGroup: i == g.expenses.length - 1),
      );
      return [
        for (final g in groups) ...[
          if (sticky) ...[
            headerFor(g, expanded: !collapsible || _expandedDays.contains(g.date)),
            if (!collapsible || _expandedDays.contains(g.date)) listFor(g),
          ] else
            SliverMainAxisGroup(
              slivers: [
                headerFor(g, expanded: !collapsible || _expandedDays.contains(g.date)),
                if (!collapsible || _expandedDays.contains(g.date)) listFor(g),
              ],
            ),
        ],
      ];
    }

    final header = SliverToBoxAdapter(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if ((sync != null && !sync.idle) || chips.isNotEmpty)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
              child: Wrap(
                spacing: 8,
                runSpacing: 4,
                children: [
                  if (sync != null && !sync.idle)
                    ActionChip(
                      key: const Key('strip-sync'),
                      avatar: const Icon(AppIcons.sync, size: 16),
                      label: Text(l10n.syncPending(sync.pending)),
                      onPressed: () => unawaited(ref.read(refreshTripsProvider)()),
                    ),
                  if (conflicts.isNotEmpty)
                    ActionChip(
                      key: const Key('open-conflicts'),
                      label: Text(l10n.conflictTitle),
                      onPressed: () => AppSheet.show<void>(
                        context: context,
                        builder: (_) => ConflictSheet(tripId: id),
                      ),
                    ),
                  for (final c in chips)
                    ActionChip(key: Key('chip-${c.id}'), label: Text(chipLabel(c)), onPressed: () => chipTap(c)),
                ],
              ),
            ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
            child: GestureDetector(
              key: const Key('summary-card'),
              onTap: _flag(ref, 'enableSpendInsights', id) ? () => context.push('/trip/$id/insights') : null,
              child: Column(
                children: [
                  BentoTile(
                    tone: BentoTone.mint,
                    padding: EdgeInsets.all(_flag(ref, 'enableCompactSummary', id) ? 14 : 20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        BentoTile.eyebrow(context, BentoTone.mint, l10n.expTotalSpent),
                        const SizedBox(height: 4),
                        SizedBox(
                          width: double.infinity,
                          child: Text(
                            formatMoney(context, totals.totalSpent, trip.baseCurrency),
                            key: const Key('stat-total'),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: AppTypography.moneyDisplay(
                              fontSize: _flag(ref, 'enableCompactSummary', id) ? 30 : 40,
                              color: tokens.textPrimary,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 10),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: BentoTile(
                          tone: BentoTone.butter,
                          padding: const EdgeInsets.all(14),
                          child: _Stat(
                            tone: BentoTone.butter,
                            label: l10n.expPerPerson,
                            value: formatMoney(context, totals.averageCost, trip.baseCurrency),
                            valueKey: const Key('stat-avg'),
                          ),
                        ),
                      ),
                      if (totals.top != null) ...[
                        const SizedBox(width: 10),
                        Expanded(
                          child: BentoTile(
                            tone: BentoTone.peach,
                            padding: const EdgeInsets.all(14),
                            child: _Stat(
                              tone: BentoTone.peach,
                              label: l10n.expTopCategory,
                              value: '${totals.top!.name} ${totals.top!.percentage.round()}%',
                              valueKey: const Key('stat-top'),
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                ],
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 8, 0),
            child: Row(
              children: [
                Expanded(
                  child: AppTextField(
                    controller: _search,
                    hint: l10n.expSearchHint,
                    prefixIcon: const Icon(AppIcons.search),
                    onChanged: _onSearch,
                  ),
                ),
                IconButton(
                  key: const Key('open-filters'),
                  tooltip: l10n.expFilters,
                  constraints: const BoxConstraints(minWidth: 48, minHeight: 48),
                  icon: Badge(isLabelVisible: filters.hasActive, child: const Icon(AppIcons.filter)),
                  onPressed: _openFilters,
                ),
                PopupMenuButton<String>(
                  key: const Key('tab-menu'),
                  tooltip: l10n.rowEdit,
                  icon: const Icon(AppIcons.more),
                  onSelected: (v) {
                    if (v == 'bin') context.push('/trip/$id/recycle-bin');
                    if (v == 'categories') context.push('/trip/$id/categories');
                    if (v == 'tools') {
                      AppSheet.show<void>(
                        context: context,
                        builder: (_) => TripToolsSheet(tripId: id),
                      );
                    }
                    if (v == 'quick') {
                      AppSheet.show<void>(
                        context: context,
                        builder: (_) => QuickAddSheet(tripId: id),
                      );
                    }
                    if (v == 'compact') _toggleCompact();
                    if (v == 'expand') {
                      setState(() {
                        if (allExpanded) {
                          _expandedDays.clear();
                        } else {
                          _expandedDays.addAll(dayGroups.map((g) => g.date));
                        }
                      });
                    }
                  },
                  itemBuilder: (_) => [
                    PopupMenuItem(value: 'expand', child: Text(allExpanded ? l10n.expCollapseAll : l10n.expExpandAll)),
                    PopupMenuItem(value: 'quick', child: Text(l10n.toolsQuickAdd)),
                    PopupMenuItem(value: 'categories', child: Text(l10n.expCategories)),
                    PopupMenuItem(value: 'tools', child: Text(l10n.expTools)),
                    if (_flag(ref, 'enableCompactLedgerView', id))
                      PopupMenuItem(value: 'compact', child: Text(l10n.expCompactView)),
                    if (binOn) PopupMenuItem(value: 'bin', child: Text(l10n.expRecycleBin)),
                  ],
                ),
              ],
            ),
          ),
          if (quickChips && myMember != null)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 0),
              child: Wrap(
                spacing: 8,
                children: [
                  ChoiceChip(
                    label: Text(l10n.expAll),
                    selected: filters.relation == null,
                    onSelected: (_) => _setFilters(filters.copyWith(clearRelation: true)),
                  ),
                  ChoiceChip(
                    label: Text(l10n.expPaidByMe),
                    selected: filters.relation == ExpenseRelation.paidByMe,
                    onSelected: (_) => _setFilters(filters.copyWith(relation: ExpenseRelation.paidByMe)),
                  ),
                  ChoiceChip(
                    label: Text(l10n.expInvolvesMe),
                    selected: filters.relation == ExpenseRelation.involvesMe,
                    onSelected: (_) => _setFilters(filters.copyWith(relation: ExpenseRelation.involvesMe)),
                  ),
                ],
              ),
            ),
          if (filters.hasActive)
            Align(
              alignment: Alignment.centerLeft,
              child: TextButton(
                key: const Key('clear-filters'),
                onPressed: () {
                  _search.clear();
                  ref.read(expenseFiltersProvider(id).notifier).clear();
                  setState(() => _visible = _pageSize);
                },
                child: Text(l10n.expClearFilters),
              ),
            ),
          const SizedBox(height: 4),
        ],
      ),
    );

    final Widget empty = active.isEmpty
        ? EmptyState(
            icon: AppIcons.expenses,
            title: l10n.expNone,
            subtitle: l10n.expNoneBody,
            action: AppButton(label: l10n.expAdd, onPressed: () => context.push('/trip/$id/expenses/new')),
          )
        : Padding(
            padding: const EdgeInsets.all(32),
            child: Center(child: Text(l10n.expNoMatches)),
          );

    final list = Stack(
      children: [
        AppPullToRefresh(
          onRefresh: ref.read(refreshTripsProvider),
          child: CustomScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            slivers: [
              header,
              if (wide && shown.isNotEmpty) const SliverToBoxAdapter(child: _TableHead()),
              if (shown.isEmpty)
                SliverToBoxAdapter(child: empty)
              else ...[
                ...section(dayGroups, collapsible: true),
                if (settlementGroups.isNotEmpty) ...[
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(16, 16, 16, 4),
                      child: Text(
                        l10n.expSettlements,
                        style: TextStyle(fontWeight: FontWeight.w700, color: tokens.textSecondary),
                      ),
                    ),
                  ),
                  ...section(settlementGroups, collapsible: false),
                ],
                if (filtered.length > _visible)
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: AppButton(
                        label: l10n.expLoadMore,
                        variant: AppButtonVariant.secondary,
                        onPressed: () => setState(() => _visible += _pageSize),
                      ),
                    ),
                  ),
              ],
              if (_flag(ref, 'enableCrossTripSearch', id) && filters.query.trim().length >= 2)
                SliverToBoxAdapter(
                  child: _OtherTrips(tripId: id, query: filters.query.trim()),
                ),
              const SliverToBoxAdapter(child: SizedBox(height: 96)),
            ],
          ),
        ),
        Positioned(
          right: 16,
          bottom: 16,
          child: FloatingActionButton.extended(
            heroTag: 'add-expense-$id',
            onPressed: () => context.push('/trip/$id/expenses/new'),
            icon: const Icon(AppIcons.add),
            label: Text(l10n.expAdd),
          ),
        ),
      ],
    );

    final selected = (all.value ?? const <Expense>[]).where((e) => e.id == _selectedId).firstOrNull;
    if (selected == null || MediaQuery.sizeOf(context).width < _kDetailPanelBreakpoint) return list;
    return Row(
      children: [
        Expanded(child: list),
        Container(
          key: const Key('detail-panel'),
          width: 400,
          decoration: BoxDecoration(
            color: tokens.bgSurface,
            border: Border(left: BorderSide(color: tokens.borderColor)),
          ),
          child: Column(
            children: [
              Align(
                alignment: Alignment.centerRight,
                child: IconButton(
                  key: const Key('detail-panel-close'),
                  tooltip: MaterialLocalizations.of(context).closeButtonTooltip,
                  icon: const Icon(AppIcons.close),
                  onPressed: () => setState(() => _selectedId = null),
                ),
              ),
              Expanded(
                child: SingleChildScrollView(
                  child: ExpenseDetailSheet(
                    tripId: id,
                    expenseId: selected.id,
                    onEdit: () => _edit(selected),
                    onDelete: () {
                      setState(() => _selectedId = null);
                      unawaited(_delete(selected));
                    },
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  String _today(WidgetRef ref) => todayDateString(ref.read(nowProvider)());
}

class _OtherTrips extends ConsumerWidget {
  const _OtherTrips({required this.tripId, required this.query});
  final String tripId;
  final String query;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final q = query.toLowerCase();
    final rows = (ref.watch(allActiveExpensesProvider).value ?? const <Expense>[])
        .where((e) => e.tripId != tripId && e.deletedAt == null && e.title.toLowerCase().contains(q))
        .take(20)
        .toList();
    if (rows.isEmpty) return const SizedBox.shrink();
    final trips = <String, String>{};
    for (final t in ref.watch(allTripsProvider).value ?? const []) {
      trips['${t.id}'] = '${t.name}';
    }
    final l10n = context.l10n;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 4),
          child: Text(
            l10n.expOtherTrips,
            key: const Key('other-trips'),
            style: const TextStyle(fontWeight: FontWeight.w700),
          ),
        ),
        for (final e in rows)
          ListTile(key: Key('other-${e.id}'), title: Text(e.title), subtitle: Text(trips[e.tripId] ?? e.tripId)),
      ],
    );
  }
}

class _Stat extends StatelessWidget {
  const _Stat({required this.tone, required this.label, required this.value, required this.valueKey});
  final BentoTone tone;
  final String label;
  final String value;
  final Key valueKey;

  @override
  Widget build(BuildContext context) {
    final t = context.tokens;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: t.tones[tone].accent),
        ),
        const SizedBox(height: 2),
        Text(
          value,
          key: valueKey,
          maxLines: 2,
          overflow: TextOverflow.ellipsis,
          style: TextStyle(
            fontFamily: AppTypography.fontTitle,
            fontSize: 18,
            fontWeight: FontWeight.w800,
            color: t.textPrimary,
          ),
        ),
      ],
    );
  }
}

class _DayHeader extends SliverPersistentHeaderDelegate {
  _DayHeader({
    required this.date,
    required this.total,
    required this.count,
    required this.expanded,
    required this.collapsible,
    required this.semantics,
    required this.onTap,
    required this.background,
    required this.textColor,
    required this.mutedColor,
  });

  final String date;
  final String total;
  final int count;
  final bool expanded;
  final bool collapsible;
  final String semantics;
  final VoidCallback onTap;
  final Color background;
  final Color textColor;
  final Color mutedColor;

  static const _h = 48.0;

  @override
  double get minExtent => _h;
  @override
  double get maxExtent => _h;

  @override
  Widget build(BuildContext context, double shrinkOffset, bool overlapsContent) => Material(
    color: background,
    child: Semantics(
      button: collapsible,
      label: semantics,
      child: InkWell(
        key: Key('day-$date'),
        onTap: collapsible ? onTap : null,
        child: SizedBox(
          height: _h,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    date,
                    style: TextStyle(fontWeight: FontWeight.w700, color: textColor),
                  ),
                ),
                Text('$total · $count', style: TextStyle(color: mutedColor, fontSize: 13)),
                if (collapsible)
                  Icon(expanded ? Icons.expand_less_rounded : Icons.expand_more_rounded, color: mutedColor),
              ],
            ),
          ),
        ),
      ),
    ),
  );

  @override
  bool shouldRebuild(_DayHeader old) =>
      old.date != date ||
      old.total != total ||
      old.count != count ||
      old.expanded != expanded ||
      old.background != background;
}

const _tableCols = [4, 2, 2, 2, 2];

/// Column labels above the wide expense table.
class _TableHead extends StatelessWidget {
  const _TableHead();

  @override
  Widget build(BuildContext context) {
    final t = context.tokens;
    // ponytail: English-only column labels until the ARB files are regenerated.
    const labels = ['Expense', 'Category', 'Paid by', 'Date', 'Amount'];
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
      decoration: BoxDecoration(
        border: Border(bottom: BorderSide(color: t.borderColor)),
      ),
      child: Row(
        children: [
          for (var i = 0; i < labels.length; i++)
            Expanded(
              flex: _tableCols[i],
              child: Text(
                labels[i].toUpperCase(),
                textAlign: i == labels.length - 1 ? TextAlign.right : TextAlign.left,
                style: TextStyle(
                  fontFamily: AppTypography.fontMono,
                  fontSize: 10.5,
                  fontWeight: FontWeight.w600,
                  letterSpacing: 1.1,
                  color: t.textMuted,
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _TableRow extends StatelessWidget {
  const _TableRow({
    required this.expense,
    required this.baseCurrency,
    required this.payer,
    required this.category,
    required this.selected,
    required this.onTap,
  });

  final Expense expense;
  final String baseCurrency;
  final String payer;
  final String category;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final t = context.tokens;
    final muted = TextStyle(fontSize: 13.5, color: t.textSecondary);
    return Material(
      color: selected ? t.primaryAccent.withValues(alpha: 0.08) : Colors.transparent,
      child: InkWell(
        key: Key('table-row-${expense.id}'),
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
          decoration: BoxDecoration(
            border: Border(bottom: BorderSide(color: t.borderColor)),
          ),
          child: Row(
            children: [
              Expanded(
                flex: _tableCols[0],
                child: Text(
                  expense.title,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(fontWeight: FontWeight.w600, color: t.textPrimary),
                ),
              ),
              Expanded(
                flex: _tableCols[1],
                child: Text(category, maxLines: 1, overflow: TextOverflow.ellipsis, style: muted),
              ),
              Expanded(
                flex: _tableCols[2],
                child: Text(payer, maxLines: 1, overflow: TextOverflow.ellipsis, style: muted),
              ),
              Expanded(
                flex: _tableCols[3],
                child: Text(expense.date, style: muted),
              ),
              Expanded(
                flex: _tableCols[4],
                child: Text(
                  formatMoney(context, expense.amount, baseCurrency),
                  textAlign: TextAlign.right,
                  style: TextStyle(fontWeight: FontWeight.w800, color: t.textPrimary),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
