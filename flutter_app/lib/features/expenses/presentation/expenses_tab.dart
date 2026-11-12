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
import '../../../domain/logic/refunds.dart';
import '../../../domain/models/category.dart';
import '../../../domain/models/expense.dart';
import '../../../domain/models/member.dart';
import '../../../domain/models/trip.dart';
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
import '../../../shared/widgets/save_pulse.dart';
import '../application/just_saved.dart';
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
import 'widgets/expense_selection_bar.dart';
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
  final _picked = <String>{}; // rows ticked for the bulk actions (flag enableExpenseMultiSelect)

  /// Wide windows show the selected expense in a side panel (board 08) instead of a bottom sheet.
  String? _selectedId;
  bool _compact = false;

  final _scroll = ScrollController();
  final _todayKey = GlobalKey();
  bool _away = false; // scrolled well below the top: offer Jump to today

  /// Quiet All / Expenses / Refunds / Settlements row (`enableSpendSectionChips`).
  _SpendSection _section = _SpendSection.all;

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
        unawaited(Scrollable.ensureVisible(ctx, duration: AppMotion.base, alignment: 0.15));
      } else if (_scroll.hasClients) {
        unawaited(_scroll.animateTo(0, duration: AppMotion.base, curve: Curves.easeOutCubic));
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

  void _togglePick(Expense e) {
    unawaited(AppHaptics.selection());
    setState(() => _picked.contains(e.id) ? _picked.remove(e.id) : _picked.add(e.id));
  }

  void _clearPicks() => setState(_picked.clear);

  /// Delete every selected expense at once; one Undo brings them all back.
  Future<void> _deleteMany(List<Expense> list) async {
    final repo = ref.read(expenseRepositoryProvider);
    final uid = ref.read(authStateProvider).userId ?? '';
    final ids = [for (final e in list) e.id];
    setState(() {
      _hidden.addAll(ids);
      _picked.clear();
    });
    for (final id in ids) {
      await repo.delete(id, userId: uid);
    }
    if (!mounted) return;
    setState(() => _hidden.removeAll(ids));
    UndoSnackbar.show(
      context: context,
      message: ids.length == 1 ? context.l10n.expDeleted : '${ids.length} expenses deleted',
      onUndo: () {
        for (final id in ids) {
          unawaited(repo.restore(id));
        }
      },
    );
  }

  /// Mark the selected expenses personal (out of the trip totals), or count them again when they all already are.
  Future<void> _personalMany(List<Expense> list) async {
    final repo = ref.read(expenseRepositoryProvider);
    final targets = [
      for (final e in list)
        if (e.refundOfExpenseId == null) e,
    ];
    if (targets.isEmpty) return;
    final markPersonal = !targets.every((e) => e.excludeFromTotals);
    setState(_picked.clear);
    for (final e in targets) {
      await repo.update(e.copyWith(excludeFromTotals: markPersonal));
    }
    if (!mounted) return;
    UndoSnackbar.show(
      context: context,
      message: markPersonal ? '${targets.length} marked personal' : '${targets.length} counted in totals again',
      onUndo: () {
        for (final e in targets) {
          unawaited(repo.update(e));
        }
      },
    );
  }

  /// Pick a category once and apply it to every selected expense.
  Future<void> _categoryMany(List<Expense> list, List<Category> categories) async {
    final repo = ref.read(expenseRepositoryProvider);
    final chosen = await AppSheet.show<String>(
      context: context,
      title: 'Change category',
      builder: (sheetCtx) => ListView(
        key: const Key('selection-category-sheet'),
        shrinkWrap: true,
        children: [
          for (final c in categories)
            ListTile(
              key: Key('pick-category-${c.id}'),
              leading: Text(c.icon ?? '', style: const TextStyle(fontSize: 22)),
              title: Text(c.name),
              onTap: () => Navigator.of(sheetCtx).pop(c.id),
            ),
        ],
      ),
    );
    if (chosen == null || !mounted) return;
    final targets = [
      for (final e in list)
        if (e.category != chosen) e,
    ];
    setState(_picked.clear);
    for (final e in targets) {
      await repo.update(e.copyWith(category: chosen));
    }
    if (!mounted || targets.isEmpty) return;
    UndoSnackbar.show(
      context: context,
      message: 'Category changed on ${targets.length}',
      onUndo: () {
        for (final e in targets) {
          unawaited(repo.update(e));
        }
      },
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
      // Root navigator: the trip shell's own Scaffold owns a persistent FAB (Add expense) that
      // otherwise paints on top of a sheet opened on the branch's nested go_router Navigator.
      useRootNavigator: true,
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
    if (trip == null || all.isLoading) return const SkeletonPage(shape: SkeletonShape.spend);
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

    // Page only real expenses; settlements are few and must stay reachable without tapping "Load more".
    final filteredExpenses = filtered.where(isActualExpense).toList();
    final shown = [...filteredExpenses.take(_visible), ...filtered.where((e) => !isActualExpense(e))];
    // Bulk selection: only on narrow layouts, only expenses the viewer may change, never settlements.
    final multiOn =
        (ref.watch(flagProvider(('enableExpenseMultiSelect', id))).value ?? true) &&
        MediaQuery.sizeOf(context).width < _kDetailPanelBreakpoint;
    bool pickable(Expense e) => multiOn && isActualExpense(e) && canManageExpense(e, isAdmin: isAdmin, userId: uid);
    final pickedList = [
      for (final e in shown)
        if (_picked.contains(e.id) && pickable(e)) e,
    ];
    final selecting = pickedList.isNotEmpty;
    final refundedIds = {
      for (final r in active)
        if (isRefund(r) && r.deletedAt == null) r.refundOfExpenseId!,
    };
    final compassSpend = ref.watch(compassFlagProvider((compassSpendFlag, id)));
    final sectionChipsOn = _flag(ref, 'enableSpendSectionChips', id);
    final showExpenseDays = !sectionChipsOn || _section != _SpendSection.settlements;
    final showSettlements = !sectionChipsOn || _section == _SpendSection.all || _section == _SpendSection.settlements;
    final dayGroups = showExpenseDays
        ? groupByDay(shown.where(isActualExpense).toList())
        : const <DayGroup>[];
    final settlementGroups = showSettlements
        ? groupByDay(shown.where((e) => !isActualExpense(e)).toList())
        : const <DayGroup>[];
    String dayKey(DayGroup g, {required bool settlement}) =>
        settlement ? 'settlement:${g.date}' : g.date;
    // Only once the flag has really loaded: while it loads it reads as its default (ON) and would open every day.
    if (ref.watch(flagProvider((compassSpendFlag, id))).value == true) {
      for (final g in dayGroups) {
        if (_seenDays.add(g.date)) _expandedDays.add(dayKey(g, settlement: false));
      }
    }
    // Settlements were always open before; seed each settlement day once so first paint stays expanded
    // but Collapse All / per-header toggle can fold them.
    for (final g in settlementGroups) {
      final key = dayKey(g, settlement: true);
      if (_seenDays.add(key)) _expandedDays.add(key);
    }
    final expenseKeys = [for (final g in dayGroups) dayKey(g, settlement: false)];
    final settlementKeys = [for (final g in settlementGroups) dayKey(g, settlement: true)];
    final allKeys = [...expenseKeys, ...settlementKeys];
    final allExpanded =
        allKeys.isNotEmpty && allKeys.every((k) => _expandedDays.contains(k));

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

    final sticky = _flag(ref, 'enableStickyDayHeaders', id);

    // Compass spend uses the flat tile rows and day cards of the redesign (what the tidy flag already draws).
    final tidyOn = _flag(ref, 'enableTidyExpenses', id) || compassSpend;
    final justSaved = _flag(ref, 'enableSaveConfirmation', id) ? ref.watch(justSavedExpenseProvider) : null;
    Widget rowFor(Expense e, {required bool lastInGroup}) {
      if (wide) {
        return _TableRow(
          expense: e,
          baseCurrency: trip.baseCurrency,
          payer: members[e.paidBy]?.name ?? '',
          category: categories.where((c) => c.id == e.category).firstOrNull?.name ?? e.category,
          refunded: refundedIds.contains(e.id),
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
        refunded: refundedIds.contains(e.id),
        onTap: selecting && pickable(e) ? () => _togglePick(e) : () => _openDetail(e),
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
      final shown = e.id == justSaved
          ? SavePulse(
              key: ValueKey('pulse-${e.id}'),
              onDone: () => ref.read(justSavedExpenseProvider.notifier).clear(e.id),
              child: body,
            )
          : body;
      if (!canManageExpense(e, isAdmin: isAdmin, userId: uid)) return shown;
      // Press and hold starts selecting; while selecting, a tap ticks or unticks and swipes are off.
      Widget withPick(Widget child) {
        if (!pickable(e)) return child;
        final on = _picked.contains(e.id);
        return GestureDetector(
          behavior: HitTestBehavior.translucent,
          onLongPress: () => _togglePick(e),
          child: Stack(
            children: [
              child,
              if (on) ...[
                Positioned.fill(
                  child: IgnorePointer(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
                      child: DecoratedBox(
                        key: Key('picked-${e.id}'),
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(tokens.radiusMd),
                          color: tokens.primaryAccent.withValues(alpha: 0.08),
                          border: Border.all(color: tokens.primaryAccent, width: 2),
                        ),
                      ),
                    ),
                  ),
                ),
                Positioned(
                  top: 2,
                  left: 20,
                  child: IgnorePointer(
                    child: DecoratedBox(
                      decoration: BoxDecoration(color: tokens.bgSurface, shape: BoxShape.circle),
                      child: Icon(Icons.check_circle_rounded, size: 22, color: tokens.primaryAccent),
                    ),
                  ),
                ),
              ],
            ],
          ),
        );
      }

      if (selecting) return withPick(shown);
      return withPick(
        ExpenseSwipe(
          itemKey: ValueKey('swipe-${e.id}'),
          onEdit: isActualExpense(e) && e.refundOfExpenseId == null ? () => _edit(e) : null,
          onTogglePersonal: personalOn && isActualExpense(e) && e.refundOfExpenseId == null
              ? () => unawaited(_togglePersonal(e))
              : null,
          isPersonal: e.excludeFromTotals,
          onDelete: () => unawaited(_delete(e)),
          child: shown,
        ),
      );
    }

    List<Widget> section(
      List<DayGroup> groups, {
      required bool collapsible,
      bool isSettlement = false,
    }) {
      SliverPersistentHeader headerFor(DayGroup g, {required bool expanded}) {
        final key = dayKey(g, settlement: isSettlement);
        return SliverPersistentHeader(
          pinned: sticky && expanded && _expandedDays.length <= 1,
          delegate: _DayHeader(
            textScale: MediaQuery.textScalerOf(context).scale(1),
            date: key,
            label: isSettlement ? _settlementDateLabel(g.date) : _dayLabel(g.date, trip.startDate, l10n.expDayN),
            total: isSettlement
                ? '${formatMoney(context, g.total, trip.baseCurrency)} settled'
                : formatMoney(context, g.total, trip.baseCurrency),
            count: g.expenses.length,
            expanded: expanded,
            collapsible: collapsible,
            semantics: isSettlement
                ? '${_settlementDateLabel(g.date)}, ${g.expenses.length} settled, ${formatMoney(context, g.total, trip.baseCurrency)}'
                : l10n.expDaySemantics(g.date, g.expenses.length, formatMoney(context, g.total, trip.baseCurrency)),
            onTap: () => setState(
              () => _expandedDays.contains(key) ? _expandedDays.remove(key) : _expandedDays.add(key),
            ),
            background: tokens.bgPage,
            textColor: tokens.textPrimary,
            mutedColor: tokens.textMuted,
            tidy: tidyOn,
            surface: tokens.bgSurface,
            border: tokens.borderColor,
            countText: isSettlement
                ? '${g.expenses.length} settled'
                : g.expenses.isNotEmpty && g.expenses.every(isRefund)
                    ? l10n.expDayCountRefund(g.expenses.length)
                    : l10n.expDayCount(g.expenses.length),
          ),
        );
      }

      SliverList listFor(DayGroup g) => SliverList.builder(
        itemCount: g.expenses.length,
        itemBuilder: (_, i) {
          final e = g.expenses[i];
          if (isSettlement && !wide) {
            return _SettlementFeedTile(
              expense: e,
              trip: trip,
              members: members,
              myMemberId: myMember,
              onTap: () => _openDetail(e),
            );
          }
          final row = rowFor(e, lastInGroup: i == g.expenses.length - 1);
          return !isSettlement && i == 0 && g.date == _today(ref) ? KeyedSubtree(key: _todayKey, child: row) : row;
        },
      );
      return [
        for (final g in groups) ...[
          headerFor(g, expanded: !collapsible || _expandedDays.contains(dayKey(g, settlement: isSettlement))),
          if (!collapsible || _expandedDays.contains(dayKey(g, settlement: isSettlement))) listFor(g),
        ],
      ];
    }

    final header = SliverToBoxAdapter(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (ref.watch(compassFlagProvider((compassSpendFlag, id))) || context.tokens.calm)
            CompassSpendSummary(tripId: id),
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
                          _expandedDays
                            ..removeAll(expenseKeys)
                            ..removeAll(settlementKeys);
                        } else {
                          _expandedDays
                            ..addAll(expenseKeys)
                            ..addAll(settlementKeys);
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
          if (sectionChipsOn)
            SizedBox(
              key: const Key('spend-section-chips'),
              height: 48,
              child: ListView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.fromLTRB(16, 2, 16, 2),
                children: [
                  for (final s in _SpendSection.values)
                    Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: _RunwayChip(
                        key: Key('spend-section-${s.name}'),
                        label: switch (s) {
                          _SpendSection.all => l10n.expAll,
                          _SpendSection.expenses => 'Expenses',
                          _SpendSection.refunds => 'Refunds',
                          _SpendSection.settlements => l10n.expSettlements,
                        },
                        selected: _section == s,
                        onTap: () {
                          setState(() => _section = s);
                          final next = switch (s) {
                            _SpendSection.expenses => filters.copyWith(entryKind: EntryKind.expense),
                            _SpendSection.refunds => filters.copyWith(entryKind: EntryKind.refund),
                            _SpendSection.all || _SpendSection.settlements =>
                              filters.copyWith(clearEntryKind: true),
                          };
                          _setFilters(next);
                        },
                      ),
                    ),
                ],
              ),
            ),
          if (categories.isNotEmpty && _section != _SpendSection.settlements)
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

    final coachEmptyOn = _flag(ref, 'enableCoachEmptyStates', id);
    final Widget empty = active.isEmpty
        ? (coachEmptyOn
              ? _EmptySpendAccelerator(
                  tripId: id,
                  title: l10n.expNone,
                  subtitle: l10n.expNoneBody,
                  onAddExpense: () => context.push('/trip/$id/expenses/new'),
                  onScanReceipt: () => context.push('/trip/$id/receipts'),
                  onViewMembers: () => context.go('/trip/$id/members'),
                )
              : EmptyState(
                  plain: true,
                  title: l10n.expNone,
                  subtitle: l10n.expNoneBody,
                ))
        : EmptyState(
            plain: true,
            title: l10n.expNoMatches,
            subtitle: '',
            // One tap back to the full list instead of hunting for the chips that are filtering it.
            action: filters.hasActive
                ? AppButton(
                    key: const Key('empty-clear-filters'),
                    label: l10n.expClearFilters,
                    variant: AppButtonVariant.secondary,
                    onPressed: () {
                      _search.clear();
                      ref.read(expenseFiltersProvider(id).notifier).clear();
                      setState(() => _visible = _pageSize);
                    },
                  )
                : null,
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
                      padding: const EdgeInsets.fromLTRB(16, 20, 16, 8),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.all(5),
                                decoration: BoxDecoration(
                                  color: tokens.tones[BentoTone.mint].bg,
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Icon(
                                  Icons.handshake_outlined,
                                  size: 15,
                                  color: tokens.tones[BentoTone.mint].accent,
                                ),
                              ),
                              const SizedBox(width: 8),
                              Text(
                                l10n.expSettlements,
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w800,
                                  letterSpacing: 0.5,
                                  color: tokens.textSecondary,
                                ),
                              ),
                              const SizedBox(width: 8),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                                decoration: BoxDecoration(
                                  color: tokens.tones[BentoTone.mint].bg,
                                  borderRadius: BorderRadius.circular(10),
                                  border: Border.all(color: tokens.tones[BentoTone.mint].accent.withValues(alpha: 0.2)),
                                ),
                                child: Text(
                                  '${settlementGroups.fold<int>(0, (sum, g) => sum + g.expenses.length)}',
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w700,
                                    color: tokens.tones[BentoTone.mint].accent,
                                  ),
                                ),
                              ),
                            ],
                          ),
                          Flexible(
                            child: Text(
                              '${formatMoney(
                                context,
                                settlementGroups.fold<double>(0.0, (sum, g) => sum + g.total),
                                trip.baseCurrency,
                              )} settled',
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                                color: tokens.textMuted,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  ...section(settlementGroups, collapsible: true, isSettlement: true),
                ],
                if (filteredExpenses.length > _visible)
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
              SliverToBoxAdapter(
                child: SizedBox(height: 200.0 + MediaQuery.paddingOf(context).bottom),
              ),
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
        if (selecting)
          // At the top, like a contextual action bar: the app's floating + button owns the bottom-right corner.
          Positioned(
            left: 12,
            right: 12,
            top: 8,
            child: ExpenseSelectionBar(
              count: pickedList.length,
              onClose: _clearPicks,
              onSelectAll: () => setState(() {
                _picked
                  ..clear()
                  ..addAll([
                    for (final e in shown)
                      if (pickable(e)) e.id,
                  ]);
              }),
              onDelete: () => unawaited(_deleteMany(pickedList)),
              onPersonal: personalOn && pickedList.any((e) => e.refundOfExpenseId == null)
                  ? () => unawaited(_personalMany(pickedList))
                  : null,
              personalLabel: pickedList.where((e) => e.refundOfExpenseId == null).every((e) => e.excludeFromTotals)
                  ? 'Count again'
                  : 'Personal',
              onCategory: categories.isEmpty ? null : () => unawaited(_categoryMany(pickedList, categories)),
            ),
          )
        else
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

String _settlementDateLabel(String date) {
  final d = DateTime.tryParse(date);
  if (d == null) return date;
  return '${_months[d.month - 1]} ${d.day}';
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
                            fontFamily: AppTypography.fontMono,
                            fontSize: 12,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 0.8,
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
                      fontSize: 20,
                      color: textColor,
                    ).copyWith(
                      fontWeight: FontWeight.w800,
                      letterSpacing: -0.3,
                      fontFeatures: AppTypography.tabularFigures,
                    ),
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
    this.refunded = false,
  });

  final Expense expense;
  final String baseCurrency;
  final String payer;
  final String category;
  final bool selected;
  final VoidCallback onTap;
  final bool refunded;

  @override
  Widget build(BuildContext context) {
    final t = context.tokens;
    final muted = TextStyle(fontSize: 13.5, color: t.textSecondary);
    final refund = isRefund(expense);
    final money = formatMoney(context, expense.amount, baseCurrency);
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
                child: Row(
                  children: [
                    if (refund) const Padding(padding: EdgeInsets.only(right: 6), child: RefundChip()),
                    Flexible(
                      child: Text(
                        expense.title,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(fontWeight: FontWeight.w600, color: t.textPrimary),
                      ),
                    ),
                    if (refunded && !refund)
                      Padding(
                        key: const Key('row-refunded-badge'),
                        padding: const EdgeInsets.only(left: 5),
                        child: Tooltip(
                          message: context.l10n.rowRefunded,
                          child: Icon(Icons.undo_rounded, size: 14, color: t.colorSuccess),
                        ),
                      ),
                  ],
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
                  refund ? '−$money' : money,
                  textAlign: TextAlign.right,
                  style: TextStyle(
                    fontFeatures: AppTypography.tabularFigures,
                    fontWeight: FontWeight.w800,
                    color: refund ? t.colorSuccess : t.textPrimary,
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
              duration: AppMotion.of(context, AppMotion.fast),
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


class _SettlementFeedTile extends StatelessWidget {
  const _SettlementFeedTile({
    required this.expense,
    required this.trip,
    required this.members,
    required this.myMemberId,
    required this.onTap,
  });

  final Expense expense;
  final Trip trip;
  final Map<String, Member> members;
  final String? myMemberId;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final isMePayer = myMemberId != null && expense.paidBy == myMemberId;
    final isMeReceiver = myMemberId != null && expense.splitMemberIds.contains(myMemberId);
    final payerName = members[expense.paidBy]?.name ?? expense.paidBy;

    final isConfirmed = expense.settlementConfirmedAt != null;

    final mintBg = tokens.tones[BentoTone.mint].bg;
    final mintAccent = tokens.tones[BentoTone.mint].accent;

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
      child: Material(
        color: tokens.bgSurface,
        borderRadius: BorderRadius.circular(tokens.radiusMd),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
          child: Container(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(tokens.radiusMd),
              border: Border.all(color: tokens.borderColor.withValues(alpha: 0.8)),
            ),
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            child: Row(
              children: [
                // Transfer / Settlement Icon in Mint container
                Container(
                  width: 42,
                  height: 42,
                  decoration: BoxDecoration(
                    color: mintBg,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: mintAccent.withValues(alpha: 0.2)),
                  ),
                  child: Center(
                    child: Icon(
                      Icons.swap_horiz_rounded,
                      size: 22,
                      color: mintAccent,
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                // Title and Payer / Subtitle
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        expense.title,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                          color: tokens.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 3),
                      Row(
                        children: [
                          if (isConfirmed) ...[
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
                              margin: const EdgeInsets.only(right: 6),
                              decoration: BoxDecoration(
                                color: tokens.colorSuccess.withValues(alpha: 0.15),
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(Icons.check_circle_rounded, size: 10, color: tokens.colorSuccess),
                                  const SizedBox(width: 3),
                                  Text(
                                    'Confirmed',
                                    style: TextStyle(
                                      fontSize: 10,
                                      fontWeight: FontWeight.w700,
                                      color: tokens.colorSuccess,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                          Flexible(
                            child: Text(
                              payerName.isNotEmpty ? 'Paid by $payerName' : '',
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                fontSize: 12,
                                color: tokens.textMuted,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 10),
                // Amount + Role subtitle
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      formatMoney(context, expense.amount, expense.currency),
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w800,
                        color: tokens.textPrimary,
                      ),
                    ),
                    if (isMeReceiver)
                      Text(
                        'you get back',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          color: tokens.colorSuccess,
                        ),
                      )
                    else if (isMePayer)
                      Text(
                        'you paid',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w500,
                          color: tokens.textMuted,
                        ),
                      ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _EmptySpendAccelerator extends StatelessWidget {
  const _EmptySpendAccelerator({
    required this.tripId,
    required this.title,
    required this.subtitle,
    required this.onAddExpense,
    required this.onScanReceipt,
    required this.onViewMembers,
  });

  final String tripId;
  final String title;
  final String subtitle;
  final VoidCallback onAddExpense;
  final VoidCallback onScanReceipt;
  final VoidCallback onViewMembers;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 32),
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 420),
          child: Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: tokens.bgSurface,
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: tokens.borderColor.withValues(alpha: 0.8)),
              boxShadow: tokens.shadowSm,
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 54,
                  height: 54,
                  decoration: BoxDecoration(
                    color: tokens.tones[BentoTone.butter].bg,
                    shape: BoxShape.circle,
                  ),
                  alignment: Alignment.center,
                  child: const Icon(Icons.receipt_long_rounded, size: 26, color: Color(0xFFD97706)),
                ),
                const SizedBox(height: 14),
                Text(
                  title,
                  style: TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.w700,
                    color: tokens.textPrimary,
                    letterSpacing: -0.3,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 6),
                Text(
                  subtitle,
                  style: TextStyle(fontSize: 13.5, color: tokens.textSecondary, height: 1.35),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 20),
                Wrap(
                  spacing: 10,
                  runSpacing: 10,
                  alignment: WrapAlignment.center,
                  children: [
                    AppButton(
                      label: context.l10n.expAdd,
                      icon: AppIcons.add,
                      onPressed: onAddExpense,
                    ),
                    OutlinedButton.icon(
                      style: OutlinedButton.styleFrom(
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                        side: BorderSide(color: tokens.borderColor),
                      ),
                      onPressed: onScanReceipt,
                      icon: const Icon(Icons.document_scanner_rounded, size: 18),
                      label: const Text('Scan receipt'),
                    ),
                    OutlinedButton.icon(
                      style: OutlinedButton.styleFrom(
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                        side: BorderSide(color: tokens.borderColor),
                      ),
                      onPressed: onViewMembers,
                      icon: const Icon(Icons.people_outline_rounded, size: 18),
                      label: const Text('Members'),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Quiet Spend chip row (`enableSpendSectionChips`): which ledger sections to show.
enum _SpendSection { all, expenses, refunds, settlements }
