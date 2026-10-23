import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/auth_state.dart';
import '../../../core/platform/haptics.dart';
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
import '../../../shared/widgets/ask_text.dart';
import '../../../shared/widgets/skeleton_loader.dart';
import '../../../shared/widgets/undo_snackbar.dart';
import '../../trip_details/application/trip_nav.dart';
import '../../trips/application/trips_providers.dart';
import '../application/expenses_providers.dart';
import '../../notifications/application/activity_focus.dart';
import '../application/money_providers.dart';
import 'closeout_sheet.dart';
import 'conflict_sheet.dart';
import 'quick_add_sheet.dart';
import 'trip_tools_sheet.dart';
import 'widgets/expense_detail_sheet.dart';
import 'widgets/expense_filter_sheet.dart';
import '../../../core/flags/compass_flags.dart';
import '../../trip_details/presentation/widgets/trip_get_started.dart';
import 'widgets/add_expense_fab.dart';
import 'widgets/compass_active_filters.dart';
import 'widgets/compass_spend_summary.dart';
import 'widgets/expense_row.dart';
import 'widgets/expense_swipe.dart';
import '../../../core/platform/motion.dart';

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
  // Compass spend opens each day the first time it is seen; Collapse all / Expand all and taps work after that.
  final _seenDays = <String>{};
  final _hidden = <String>{}; // rows removed from view the instant they are swiped

  /// Wide windows show the selected expense in a side panel (board 08) instead of a bottom sheet.
  String? _selectedId;
  bool _compact = false;

  final _scroll = ScrollController();
  final _todayKey = GlobalKey();
  bool _away = false; // scrolled well below the top: offer Jump to today

  void _onScroll() {
    final away = _scroll.hasClients && _scroll.offset > 500;
    if (away != _away) setState(() => _away = away);
  }

  /// Opens today's day and brings it into view (newest first, so it is near the top).
  void _jumpToToday(String today) {
    unawaited(AppHaptics.selection());
    setState(() => _expandedDays.add(today));
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final ctx = _todayKey.currentContext;
      if (ctx != null) {
        unawaited(Scrollable.ensureVisible(ctx, duration: const Duration(milliseconds: 300), alignment: 0.15));
      } else if (_scroll.hasClients) {
        unawaited(_scroll.animateTo(0, duration: const Duration(milliseconds: 300), curve: Curves.easeOutCubic));
      }
    });
  }

  @override
  void initState() {
    super.initState();
    _scroll.addListener(_onScroll);
    _compact = ref.read(sharedPreferencesProvider).getBool(_compactPrefKey) ?? false;
    WidgetsBinding.instance.addPostFrameCallback((_) => _consumeFocus());
  }

  /// An Activity row asked for this expense: open its detail once it is loaded.
  void _consumeFocus() {
    final f = ref.read(activityFocusProvider);
    if (!mounted || f == null || f.kind != 'expense') return;
    final e = (ref.read(tripExpensesProvider(id)).value ?? const <Expense>[]).where((x) => x.id == f.id).firstOrNull;
    if (e == null) return;
    ref.read(activityFocusProvider.notifier).set(null);
    _openDetail(e);
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _search.dispose();
    _scroll.dispose();
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

  /// Swipe right: take an expense out of (or back into) the trip totals, with an undo.
  Future<void> _togglePersonal(Expense e) async {
    final l10n = context.l10n;
    final repo = ref.read(expenseRepositoryProvider);
    final now = !e.excludeFromTotals;
    await repo.update(e.copyWith(excludeFromTotals: now));
    if (!mounted) return;
    UndoSnackbar.show(
      context: context,
      message: now ? l10n.expMarkedPersonal : l10n.expCountedAgain,
      onUndo: () => unawaited(repo.update(e.copyWith(excludeFromTotals: !now))),
    );
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
    final height = MediaQuery.sizeOf(context).height;
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      clipBehavior: Clip.antiAlias,
      builder: (_) => SizedBox(
        height: height * 0.92,
        child: ExpenseFilterSheet(
          initial: ref.read(expenseFiltersProvider(id)),
          all: all,
          members: ref.read(tripMembersProvider(id)).value ?? const <Member>[],
          categories: ref.read(tripCategoriesProvider(id)),
          myMemberId: ref.read(myMemberIdProvider(id)),
          onApply: _setFilters,
        ),
      ),
    );
  }

  void _toggleCompact() {
    setState(() => _compact = !_compact);
    unawaited(ref.read(sharedPreferencesProvider).setBool(_compactPrefKey, _compact));
  }

  @override
  Widget build(BuildContext context) {
    ref.listen(activityFocusProvider, (_, _) => _consumeFocus());
    ref.listen(tripExpensesProvider(id), (_, _) => _consumeFocus());
    final l10n = context.l10n;
    final tokens = context.tokens;
    final trip = ref.watch(tripProvider(id)).value;
    final all = ref.watch(tripExpensesProvider(id));
    if (trip == null || all.isLoading) return const SkeletonPage();
    if (ref.watch(compassFlagProvider((tripGetStartedFlag, id))) &&
        !(all.value ?? const <Expense>[]).any((e) => e.deletedAt == null && !e.isSettlement)) {
      return TripGetStarted(tripId: id);
    }

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
    final failed = (ref.watch(flagProvider(('enableRowSyncRetry', id))).value ?? true)
        ? (ref.watch(failedIdsProvider).value ?? const <String>{})
        : const <String>{};
    final compactActive = _flag(ref, 'enableCompactLedgerView', id) && _compact;
    final quickChips = _flag(ref, 'enableExpenseQuickFilterChips', id);
    final personalOn = _flag(ref, 'enableExpenseExclusion', id);
    final savedOn = _flag(ref, 'enableSavedFilters', id);
    final saved = savedOn ? ref.watch(savedFiltersProvider(id)) : const <SavedFilter>[];
    final receiptsOn = _flag(ref, 'enableReceiptGallery', id);
    final binOn = _flag(ref, 'enableRecycleBin', id);

    final shown = filtered.take(_visible).toList();
    final compassSpend = ref.watch(compassFlagProvider((compassSpendFlag, id)));
    final dayGroups = groupByDay(shown.where(isActualExpense).toList());
    final settlementGroups = groupByDay(shown.where((e) => !isActualExpense(e)).toList());
    // Only once the flag has really loaded: while it loads it reads as its default (ON) and would open every day.
    if (ref.watch(flagProvider((compassSpendFlag, id))).value == true) {
      for (final g in dayGroups) {
        if (_seenDays.add(g.date)) _expandedDays.add(g.date);
      }
    }
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

    // Compass spend uses the flat tile rows and day cards of the redesign (what the tidy flag already draws).
    final tidyOn = _flag(ref, 'enableTidyExpenses', id) || compassSpend;
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
        colorRings:
            _flag(ref, 'enableCategoryColorRings', id) || ref.watch(compassFlagProvider((compassSpendFlag, id))),
        tidy: tidyOn,
        isDirty: dirty.contains(e.id),
        isConflict: conflicts.contains(e.id),
        onRetrySync: failed.contains(e.id) ? () => ref.read(retryRowSyncProvider)(e.id) : null,
        onTap: () => _openDetail(e),
      );
      // Bento: each expense is a rounded tile tinted by its category.
      final body = Padding(
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
        child: compactActive
            ? ClipRRect(
                borderRadius: BorderRadius.circular(tokens.radiusMd),
                child: ColoredBox(color: tokens.tones[toneFor(e.category)].bg, child: row),
              )
            : row,
      );
      if (!canManageExpense(e, isAdmin: isAdmin, userId: uid)) return body;
      return ExpenseSwipe(
        itemKey: ValueKey('swipe-${e.id}'),
        onEdit: isActualExpense(e) && e.refundOfExpenseId == null ? () => _edit(e) : null,
        onTogglePersonal: personalOn && isActualExpense(e) && e.refundOfExpenseId == null
            ? () => unawaited(_togglePersonal(e))
            : null,
        isPersonal: e.excludeFromTotals,
        onDelete: () => unawaited(_delete(e)),
        child: body,
      );
    }

    final sticky = _flag(ref, 'enableStickyDayHeaders', id);
    List<Widget> section(List<DayGroup> groups, {required bool collapsible}) {
      SliverPersistentHeader headerFor(DayGroup g, {required bool expanded}) => SliverPersistentHeader(
        pinned: sticky && expanded,
        delegate: _DayHeader(
          textScale: MediaQuery.textScalerOf(context).scale(1),
          date: g.date,
          label: _dayLabel(g.date, trip.startDate, l10n.expDayN),
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
          tidy: tidyOn,
          surface: tokens.bgSurface,
          border: tokens.borderColor,
          countText: l10n.expDayCount(g.expenses.length),
        ),
      );
      SliverList listFor(DayGroup g) => SliverList.builder(
        itemCount: g.expenses.length,
        itemBuilder: (_, i) {
          final row = rowFor(g.expenses[i], lastInGroup: i == g.expenses.length - 1);
          return i == 0 && g.date == _today(ref) ? KeyedSubtree(key: _todayKey, child: row) : row;
        },
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
          if (ref.watch(compassFlagProvider((compassSpendFlag, id)))) CompassSpendSummary(tripId: id),
          if (ref.watch(compassFlagProvider((compassSpendFlag, id)))) CompassActiveFilters(tripId: id),
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
                if (_flag(ref, 'enableVoiceInput', id))
                  Padding(
                    padding: const EdgeInsets.only(right: 4),
                    child: ActionChip(
                      key: const Key('voice-add'),
                      avatar: Icon(Icons.mic_rounded, size: 18, color: context.tokens.colorDanger),
                      label: const Text('Voice'),
                      onPressed: () => AppSheet.show<void>(
                        context: context,
                        title: 'Voice expense',
                        builder: (_) => QuickAddSheet(tripId: id, autoListen: true),
                      ),
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
                    if (v == 'receipts') context.push('/trip/$id/receipts');
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
                    if (receiptsOn)
                      PopupMenuItem(
                        value: 'receipts',
                        key: const Key('menu-receipts'),
                        child: Text(l10n.receiptsTitle),
                      ),
                    if (binOn) PopupMenuItem(value: 'bin', child: Text(l10n.expRecycleBin)),
                  ],
                ),
              ],
            ),
          ),
          if (categories.isNotEmpty)
            SizedBox(
              key: const Key('category-runway'),
              height: 52,
              child: ListView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.fromLTRB(16, 2, 16, 2),
                children: [
                  _RunwayChip(
                    key: const Key('runway-all'),
                    label: l10n.expAllExpenses,
                    selected: filters.categoryId.isEmpty,
                    onTap: () => _setFilters(filters.copyWith(categoryId: '')),
                  ),
                  for (final c in categories)
                    _RunwayChip(
                      key: Key('runway-${c.id}'),
                      label: c.name,
                      selected: filters.categoryId == c.id,
                      onTap: () => _setFilters(filters.copyWith(categoryId: filters.categoryId == c.id ? '' : c.id)),
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
                  if (personalOn)
                    FilterChip(
                      key: const Key('chip-personal'),
                      label: Text(l10n.expPersonalChip),
                      selected: filters.onlyPersonal,
                      onSelected: (on) => _setFilters(filters.copyWith(onlyPersonal: on)),
                    ),
                ],
              ),
            ),
          if (saved.isNotEmpty || (savedOn && filters.hasActive))
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 4, 16, 0),
              child: Wrap(
                spacing: 8,
                children: [
                  for (final f in saved)
                    Tooltip(
                      message: l10n.filterSavedTip,
                      child: GestureDetector(
                        onLongPress: () => ref.read(savedFiltersProvider(id).notifier).remove(f.name),
                        child: ActionChip(
                          key: Key('saved-filter-${f.name}'),
                          avatar: const Icon(Icons.bookmark_rounded, size: 16),
                          label: Text(f.name),
                          materialTapTargetSize: MaterialTapTargetSize.padded,
                          onPressed: () {
                            unawaited(AppHaptics.selection());
                            _search.text = f.filters.query;
                            _setFilters(f.filters);
                          },
                        ),
                      ),
                    ),
                  if (savedOn && filters.hasActive)
                    ActionChip(
                      key: const Key('save-filter'),
                      avatar: const Icon(Icons.bookmark_add_outlined, size: 16),
                      label: Text(l10n.filterSave),
                      materialTapTargetSize: MaterialTapTargetSize.padded,
                      onPressed: () async {
                        final name = await askText(context, l10n.filterSavePrompt);
                        if (name != null) {
                          unawaited(AppHaptics.success());
                          ref.read(savedFiltersProvider(id).notifier).add(name, filters);
                        }
                      },
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
            plain: true,
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
            controller: _scroll,
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
        if (_flag(ref, 'enableJumpToToday', id) && _away && dayGroups.any((g) => g.date == _today(ref)))
          Positioned(
            top: 8,
            left: 0,
            right: 0,
            child: Center(
              child: ActionChip(
                key: const Key('jump-today'),
                avatar: const Icon(Icons.vertical_align_top_rounded, size: 18),
                label: Text(l10n.expJumpToday),
                backgroundColor: tokens.bgSurface,
                elevation: 3,
                materialTapTargetSize: MaterialTapTargetSize.padded,
                onPressed: () => _jumpToToday(_today(ref)),
              ),
            ),
          ),
        AddExpenseFab(tripId: id),
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

const _months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/// Airline flight-log label: "OCT 14 · DAY 3" (day number counted from the trip start, when known).
String _dayLabel(String date, String tripStart, String Function(int) dayN) {
  final d = DateTime.tryParse(date);
  if (d == null) return date;
  final start = DateTime.tryParse(tripStart);
  final base = '${_months[d.month - 1]} ${d.day}';
  if (start == null) return base;
  final n =
      DateTime.utc(d.year, d.month, d.day).difference(DateTime.utc(start.year, start.month, start.day)).inDays + 1;
  return n >= 1 ? '$base · ${dayN(n)}' : base;
}

class _DayHeader extends SliverPersistentHeaderDelegate {
  _DayHeader({
    required this.textScale,
    required this.date,
    required this.label,
    required this.total,
    required this.count,
    required this.expanded,
    required this.collapsible,
    required this.semantics,
    required this.onTap,
    required this.background,
    required this.textColor,
    required this.mutedColor,
    required this.surface,
    required this.border,
    this.countText = '',
    this.tidy = false,
  });

  final bool tidy;
  final double textScale; // the header has a fixed height, so it grows with the user's text size
  final Color surface;
  final Color border;
  final String countText; // "3 expenses", tidy header only
  final String date;
  final String label; // "OCT 14 · DAY 3"
  final String total;
  final int count;
  final bool expanded;
  final bool collapsible;
  final String semantics;
  final VoidCallback onTap;
  final Color background;
  final Color textColor;
  final Color mutedColor;

  double get _h => (tidy ? 64.0 : 48.0) + (textScale - 1).clamp(0.0, 1.0) * 40;

  @override
  double get minExtent => _h;
  @override
  double get maxExtent => _h;

  Widget _tidyHeader(BuildContext context) => Material(
    color: background,
    child: Semantics(
      button: collapsible,
      label: semantics,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 6, 16, 6),
        child: Material(
          color: surface,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
            side: BorderSide(color: border),
          ),
          clipBehavior: Clip.antiAlias,
          child: InkWell(
            key: Key('day-$date'),
            onTap: collapsible ? onTap : null,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 14),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          label,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 0.6,
                            color: textColor,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          countText,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(fontSize: 12, color: mutedColor),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    total,
                    key: Key('day-total-$date'),
                    style: AppTypography.moneyDisplay(
                      fontSize: 18,
                      color: textColor,
                    ).copyWith(fontWeight: FontWeight.w800, letterSpacing: -0.2),
                  ),
                  if (collapsible) ...[
                    const SizedBox(width: 6),
                    Icon(expanded ? Icons.expand_less_rounded : Icons.expand_more_rounded, color: textColor),
                  ],
                ],
              ),
            ),
          ),
        ),
      ),
    ),
  );

  @override
  Widget build(BuildContext context, double shrinkOffset, bool overlapsContent) => tidy
      ? _tidyHeader(context)
      : Material(
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
                          label,
                          style: TextStyle(
                            fontFamily: 'monospace',
                            fontWeight: FontWeight.w800,
                            letterSpacing: 0.6,
                            color: textColor,
                          ),
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
      old.label != label ||
      old.total != total ||
      old.count != count ||
      old.expanded != expanded ||
      old.tidy != tidy ||
      old.textScale != textScale ||
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
                  style: TextStyle(
                    fontFeatures: AppTypography.tabularFigures,
                    fontWeight: FontWeight.w800,
                    color: t.textPrimary,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Pill on the filter runway; the active one glows teal.
class _RunwayChip extends StatelessWidget {
  const _RunwayChip({required this.label, required this.selected, required this.onTap, super.key});

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final t = context.tokens;
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: Semantics(
        button: true,
        selected: selected,
        child: GestureDetector(
          onTap: onTap,
          behavior: HitTestBehavior.opaque, // the touch area is the full 48 px row, the pill itself stays 36
          child: Center(
            child: AnimatedContainer(
              duration: AppMotion.of(context, const Duration(milliseconds: 180)),
              height: 36,
              alignment: Alignment.center,
              padding: const EdgeInsets.symmetric(horizontal: 14),
              decoration: BoxDecoration(
                color: selected ? t.primaryAccent.withValues(alpha: 0.16) : t.bgSurface,
                borderRadius: BorderRadius.circular(99),
                border: Border.all(color: selected ? t.primaryAccent : t.borderColor),
                boxShadow: selected ? [BoxShadow(color: t.primaryAccent.withValues(alpha: 0.4), blurRadius: 10)] : null,
              ),
              child: Text(
                label,
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: selected ? t.textPrimary : t.textSecondary,
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
