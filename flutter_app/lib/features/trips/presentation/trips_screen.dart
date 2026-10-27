import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/auth_state.dart';
import '../../../core/clock.dart';
import '../../../core/env/app_env.dart';
import '../../../core/storage/prefs.dart' show sharedPreferencesProvider;
import '../../../core/settings/app_settings.dart' show defaultCurrencyPrefProvider;
import '../../../core/format/money.dart';
import '../../../data/providers.dart';
import '../../../domain/logic/back_exit.dart';
import '../../../domain/logic/flag_defaults.g.dart';
import '../../../domain/logic/global_search.dart';
import '../../../domain/logic/cross_trip_balances.dart';
import '../../../domain/logic/trip_list_money.dart';
import '../../../domain/logic/trip_status.dart';
import '../../../domain/models/expense.dart';
import '../../../domain/models/group.dart';
import '../../../domain/models/member.dart';
import '../../../domain/models/trip.dart';
import '../../../l10n/l10n_ext.dart';
import '../../../shared/theme/app_icons.dart';
import '../../../shared/theme/app_tokens.dart';
import '../../../shared/theme/app_typography.dart';
import '../../../shared/widgets/app_avatar.dart';
import '../../../shared/widgets/app_bottom_nav.dart';
import '../../../shared/widgets/app_button.dart';
import '../../../shared/widgets/app_scaffold.dart';
import '../../../shared/widgets/app_sheet.dart';
import '../../../shared/widgets/app_text_field.dart';
import '../../../shared/widgets/bento_tile.dart';
import '../../../shared/widgets/coach_hint.dart';
import '../../../shared/widgets/confirm_dialog.dart';
import '../../../shared/widgets/empty_state.dart';
import '../../../shared/widgets/friendly_error.dart';
import '../../../core/network/connectivity_provider.dart';
import '../../../shared/widgets/offline_banner.dart';
import '../../../shared/widgets/pull_to_refresh.dart';
import '../../../shared/widgets/last_synced_caption.dart';
import '../../../shared/widgets/runway_slider.dart';
import '../../../shared/widgets/section_label.dart';
import '../../../shared/widgets/skeleton_loader.dart';
import '../../../shared/widgets/swipeable_row.dart';
import '../../../shared/widgets/undo_snackbar.dart';
import '../../expenses/application/expenses_providers.dart';
import '../../expenses/application/money_providers.dart' show allTripsProvider;
import '../application/trips_providers.dart';
import 'widgets/home_dock.dart';
import '../application/sample_trip.dart';
import 'widgets/first_run_tour.dart';
import 'widgets/join_code_sheet.dart';
import 'widgets/sync_chip.dart';
import 'widgets/trip_backdrop.dart';
import 'widgets/trip_row.dart';
import 'widgets/trip_card_stack.dart';
import '../../../core/platform/motion.dart';

class TripsScreen extends ConsumerStatefulWidget {
  const TripsScreen({this.now, super.key});

  /// Injectable clock for deterministic tests/goldens.
  final DateTime Function()? now;

  @override
  ConsumerState<TripsScreen> createState() => _TripsScreenState();
}

class _TripsScreenState extends ConsumerState<TripsScreen> {
  /// Trips removed from view the instant the user acts, so a dismissed row
  /// never lingers while the local write streams back.
  final _hidden = <String>{};
  DateTime? _lastBackPress;

  // Filled in build() for the cards below (flag `enableTripListMoney`); empty when the flag is off.
  var _membersByTrip = <String, List<Member>>{};
  var _expensesByTrip = <String, List<Expense>>{};
  var _groupsByTrip = <String, List<Group>>{};
  var _moneyOn = false;
  var _pastFolded = false;
  Set<String> _pendingIds = const {};

  bool _flagOn(String key) => ref.watch(flagProvider((key, null))).value ?? (defaultFeatureFlags[key] ?? false);

  /// Board 03 filter chips: all, active, upcoming, past.
  String _filter = 'all';

  /// The trip on top of the card stack, whose photo is blurred into the background.
  Trip? _stackTop;
  bool _searchOpen = false;

  DateTime get _now => widget.now?.call() ?? ref.read(nowProvider)();

  void _open(Trip t) => context.push('/trip/${t.id}/ledger'); // opens on Summary, the first tab

  Future<void> _create() => createTripFlow(context);

  bool _matchesFilter(Trip t) {
    if (_filter == 'all') return true;
    final phase = tripStatus(t.startDate, t.endDate, _now).phase;
    return switch (_filter) {
      'active' => phase == TripPhase.active,
      'upcoming' => phase == TripPhase.upcoming,
      'past' => phase == TripPhase.ended,
      _ => true,
    };
  }

  Future<void> _setArchived(Trip t, bool archived) async {
    final l10n = context.l10n;
    final repo = ref.read(tripRepositoryProvider);
    setState(() => _hidden.add(t.id));
    await repo.setTripState(t.id, archived: archived);
    if (!mounted) return;
    setState(() => _hidden.remove(t.id));
    UndoSnackbar.show(
      context: context,
      message: archived ? l10n.tripArchived : l10n.tripUnarchived,
      onUndo: () => unawaited(repo.setTripState(t.id, archived: !archived)),
    );
  }

  Future<void> _delete(Trip t) async {
    final l10n = context.l10n;
    final ok = await ConfirmDialog.show(
      context: context,
      title: l10n.tripDeleteTitle,
      message: l10n.tripDeleteBody(t.name),
      confirmLabel: l10n.actionDelete,
      cancelLabel: l10n.actionCancel,
      isDestructive: true,
    );
    if (!ok || !mounted) return;
    final repo = ref.read(tripRepositoryProvider); // captured: screen may be gone when the snackbar closes
    setState(() => _hidden.add(t.id));
    unawaited(
      UndoSnackbar.show(context: context, message: l10n.tripDeleted, onUndo: () {}).closed.then((reason) {
        // Only an explicit UNDO keeps the trip; timeout/dismiss/replace commits.
        if (reason == SnackBarClosedReason.action) {
          if (mounted) setState(() => _hidden.remove(t.id));
        } else {
          unawaited(repo.deleteTrip(t.id));
        }
      }),
    );
  }

  /// Live trip counts per filter pill, from the same phases the filter uses.
  ({int all, int active, int upcoming, int past}) _phaseCounts(List<Trip> trips) {
    var a = 0, u = 0, p = 0;
    for (final t in trips) {
      switch (tripStatus(t.startDate, t.endDate, _now).phase) {
        case TripPhase.active:
          a++;
        case TripPhase.upcoming:
          u++;
        case TripPhase.ended:
          p++;
        case TripPhase.unknown:
          break;
      }
    }
    return (all: trips.length, active: a, upcoming: u, past: p);
  }

  /// Long-press menu on a stack card: the same actions the list has (archive by swipe, delete from the card menu).
  Future<void> _tripMenu(Trip t, bool isOwner) async {
    final l10n = context.l10n;
    final action = await AppSheet.show<String>(
      context: context,
      title: t.name,
      builder: (sheetCtx) => Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          ListTile(
            key: const Key('stack-menu-open'),
            leading: const Icon(Icons.arrow_forward_rounded),
            title: Text(l10n.tripsStackOpen),
            onTap: () => Navigator.of(sheetCtx).pop('open'),
          ),
          if (_flagOn('enableTripPins') && !t.archived)
            ListTile(
              key: const Key('stack-menu-pin'),
              leading: Icon(ref.read(pinnedTripsProvider).contains(t.id) ? Icons.push_pin : Icons.push_pin_outlined),
              title: Text(ref.read(pinnedTripsProvider).contains(t.id) ? l10n.tripUnpin : l10n.tripPin),
              onTap: () => Navigator.of(sheetCtx).pop('pin'),
            ),
          if (isOwner) ...[
            ListTile(
              key: const Key('stack-menu-archive'),
              leading: Icon(t.archived ? AppIcons.undo : Icons.archive_outlined),
              title: Text(t.archived ? l10n.tripUnarchive : l10n.tripArchive),
              onTap: () => Navigator.of(sheetCtx).pop('archive'),
            ),
            ListTile(
              key: const Key('stack-menu-delete'),
              leading: Icon(Icons.delete_outline_rounded, color: context.tokens.colorDanger),
              title: Text(l10n.tripDelete, style: TextStyle(color: context.tokens.colorDanger)),
              onTap: () => Navigator.of(sheetCtx).pop('delete'),
            ),
          ],
          const SizedBox(height: 8),
        ],
      ),
    );
    if (!mounted) return;
    switch (action) {
      case 'open':
        _open(t);
      case 'pin':
        ref.read(pinnedTripsProvider.notifier).toggle(t.id);
      case 'archive':
        await _setArchived(t, !t.archived);
      case 'delete':
        await _delete(t);
    }
  }

  /// Your money line and colour for a trip, and who is on it (empty when `enableTripListMoney` is off).
  ({String? money, Color? color, List<String> names}) _facts(Trip t) {
    final tokens = context.tokens;
    final members = _membersByTrip[t.id] ?? const <Member>[];
    String? money;
    Color? moneyColor;
    if (_moneyOn) {
      final pos = myTripNet(
        ref.read(authStateProvider).userId,
        t,
        members,
        _expensesByTrip[t.id] ?? const <Expense>[],
        _groupsByTrip[t.id] ?? const <Group>[],
      );
      final net = pos.net;
      if (net != null) {
        final l10n = context.l10n;
        if (net.abs() < 0.01) {
          money = l10n.tripMoneySettled;
        } else if (net > 0) {
          money = l10n.tripMoneyOwed(formatMoney(context, net, pos.currency));
          moneyColor = tokens.colorSuccess;
        } else {
          money = l10n.tripMoneyOwe(formatMoney(context, -net, pos.currency));
          moneyColor = tokens.colorDanger;
        }
      }
    }
    final names = _moneyOn
        ? [
            for (final m in members)
              if (!m.archived) m.name,
          ]
        : const <String>[];
    return (money: money, color: moneyColor, names: names);
  }

  /// A square photo tile for the grid. Press and hold opens the trip menu (a grid has no swipe).
  Widget _tile(Trip t, bool isOwner) {
    final f = _facts(t);
    return TripTile(
      trip: t,
      now: _now,
      onTap: () => _open(t),
      onLongPress: () => _tripMenu(t, isOwner),
      avatarNames: f.names,
      moneyText: f.money,
      moneyColor: f.color,
      pending: _pendingIds.contains(t.id),
    );
  }

  Widget _card(Trip t, bool isOwner, {bool featured = false}) {
    final f = _facts(t);
    final money = f.money;
    final moneyColor = f.color;
    final names = f.names;
    final hero = featured && tripStatus(t.startDate, t.endDate, _now).phase == TripPhase.active;
    final card = hero
        ? TripHeroCard(
            trip: t,
            now: _now,
            onTap: () => _open(t),
            onLongPress: () => _tripMenu(t, isOwner),
            avatarNames: names,
            moneyText: money,
          )
        : TripRow(
            trip: t,
            now: _now,
            onTap: () => _open(t),
            onLongPress: () => _tripMenu(t, isOwner),
            avatarNames: names,
            moneyText: money,
            moneyColor: moneyColor,
            pending: _pendingIds.contains(t.id),
          );
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: isOwner
          ? SwipeableRow(
              itemKey: ValueKey('trip-${t.id}'),
              actionIcon: t.archived ? AppIcons.undo : Icons.archive_outlined,
              actionLabel: t.archived ? context.l10n.tripUnarchive : context.l10n.tripArchive,
              backgroundColor: context.tokens.secondaryAccent,
              onDismissed: () => _setArchived(t, !t.archived),
              child: card,
            )
          : card,
    );
  }

  /// One line for the whole list: where you stand across your trips. Null when there is nothing to say.
  Widget? _overviewLine(List<Trip> trips) {
    final live = [
      for (final t in trips)
        if (!t.archived) t,
    ];
    if (live.isEmpty) return null;
    final l10n = context.l10n;
    final nets = crossTripNets(
      userId: ref.read(authStateProvider).userId,
      trips: live,
      membersByTrip: _membersByTrip,
      expensesByTrip: _expensesByTrip,
      groupsByTrip: _groupsByTrip,
    );
    final t = context.tokens;
    final String text;
    final Color color;
    if (nets.isEmpty) {
      text = l10n.tripsOverviewEven(live.length);
      color = t.textSecondary;
    } else if (nets.length > 1) {
      text = l10n.tripsOverviewMulti(nets.length);
      color = t.textSecondary;
    } else if (nets.first.net > 0) {
      text = l10n.tripsOverviewOwed(formatMoney(context, nets.first.net, nets.first.currency), live.length);
      color = t.colorSuccess;
    } else {
      text = l10n.tripsOverviewOwe(formatMoney(context, -nets.first.net, nets.first.currency), live.length);
      color = t.colorDanger;
    }
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Material(
        color: t.bgSurface,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(t.radiusMd),
          side: BorderSide(color: t.borderColor),
        ),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          key: const Key('trips-overview'),
          onTap: () => context.go('/balances'),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(14, 12, 10, 12),
            child: Row(
              children: [
                Icon(Icons.account_balance_wallet_outlined, color: color),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    text,
                    style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: color),
                  ),
                ),
                Icon(Icons.chevron_right_rounded, color: t.textMuted),
              ],
            ),
          ),
        ),
      ),
    );
  }

  TripSection _sectionOf(Trip t) => switch (tripStatus(t.startDate, t.endDate, _now).phase) {
    TripPhase.active => TripSection.now,
    TripPhase.upcoming => TripSection.upcoming,
    _ => TripSection.past,
  };

  Future<void> _trySample() async {
    final a = ref.read(authStateProvider);
    final id = await createSampleTrip(
      ref,
      userId: a.userId ?? '',
      userName: a.user?.displayName ?? a.userEmail?.split('@').first ?? 'You',
      currency: ref.read(defaultCurrencyPrefProvider) ?? 'INR',
    );
    if (mounted) unawaited(context.push('/trip/$id/ledger'));
  }

  /// The first time the Trips list is shown, a three-card tour (once per device, flag `enableFirstRunTour`).
  void _maybeTour() {
    final prefs = ref.read(sharedPreferencesProvider);
    if (prefs.getBool('tour.done') ?? false) return;
    // Only once the flag has actually resolved to ON: a loading flag must not count as permission.
    if (ref.watch(flagProvider(('enableFirstRunTour', null))).value != true) return;
    unawaited(prefs.setBool('tour.done', true));
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) unawaited(showFirstRunTour(context));
    });
  }

  /// Root back press: exit only on a second press inside the window.
  void _onRootBack() {
    final now = _now;
    if (isSecondBackPress(_lastBackPress, now)) {
      unawaited(SystemNavigator.pop());
      return;
    }
    _lastBackPress = now;
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          content: Text(context.l10n.backAgainToExit),
          duration: exitWindow,
          behavior: SnackBarBehavior.floating,
        ),
      );
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final tokens = context.tokens;
    _maybeTour();
    final lists = ref.watch(tripListsProvider);
    final syncing = ref.watch(tripsSyncingProvider).value ?? false;
    final auth = ref.watch(authStateProvider);
    final sort = ref.watch(tripSortProvider);
    final horizon = ref.watch(horizonNavProvider);
    final stackOn =
        ref.watch(flagProvider(('enableTripCardStack', null))).value ??
        (defaultFeatureFlags['enableTripCardStack'] ?? true);
    final cards = stackOn && ref.watch(tripsViewProvider) == TripsView.cards;
    _moneyOn = _flagOn('enableTripListMoney');
    final sectionsOn = _flagOn('enableTripListSections');
    final overviewOn = _flagOn('enableTripsOverview');
    final gridOn = _flagOn('enableTripGridTiles');
    final searchOn = _flagOn('enableGlobalSearch');
    _pendingIds = _flagOn('enablePendingDots') ? ref.watch(pendingTripIdsProvider) : const <String>{};
    final pinnedOn = _flagOn('enableTripPins');
    final pinnedIds = pinnedOn ? ref.watch(pinnedTripsProvider) : const <String>{};
    final query = ref.watch(tripSearchProvider);
    final grid = gridOn && ref.watch(tripsLayoutProvider) == TripsLayout.grid;
    if (_moneyOn || overviewOn || searchOn) {
      _membersByTrip = {};
      for (final m in ref.watch(allMembersProvider).value ?? const <Member>[]) {
        final id = m.tripId;
        if (id != null) (_membersByTrip[id] ??= []).add(m);
      }
      _expensesByTrip = {};
      for (final e in ref.watch(allActiveExpensesProvider).value ?? const <Expense>[]) {
        (_expensesByTrip[e.tripId] ??= []).add(e);
      }
      _groupsByTrip = {
        for (final id in _membersByTrip.keys) id: ref.watch(tripGroupsProvider(id)).value ?? const <Group>[],
      };
    }

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) _onRootBack();
      },
      child: wrapHomeBody(
        context,
        ref,
        HomeTab.trips,
        AppScaffold(
          // The card view paints its photo backdrop edge to edge, under the status bar, and insets its own header.
          safeTop: cards ? false : null,
          appBar: cards
              ? null
              : AppBar(
                  title: Text(l10n.tripsTitle),
                  actions: [
                    const SyncButton(),
                    if (!cards && gridOn)
                      IconButton(
                        key: const Key('trips-layout-toggle'),
                        tooltip: grid ? l10n.tripsLayoutList : l10n.tripsLayoutGrid,
                        icon: Icon(grid ? Icons.view_agenda_outlined : Icons.grid_view_rounded),
                        onPressed: () =>
                            ref.read(tripsLayoutProvider.notifier).set(grid ? TripsLayout.list : TripsLayout.grid),
                      ),
                    if (!cards)
                      IconButton(
                        key: const Key('trips-search-toggle'),
                        tooltip: l10n.tripsSearchHint,
                        icon: Icon(_searchOpen ? Icons.search_off_rounded : AppIcons.search),
                        onPressed: () => setState(() {
                          _searchOpen = !_searchOpen;
                          if (!_searchOpen) ref.read(tripSearchProvider.notifier).set('');
                        }),
                      ),
                    if (stackOn)
                      IconButton(
                        key: const Key('trips-view-toggle'),
                        tooltip: cards ? l10n.tripsViewList : l10n.tripsViewCards,
                        icon: Icon(cards ? Icons.view_list_rounded : Icons.view_carousel_rounded),
                        onPressed: () =>
                            ref.read(tripsViewProvider.notifier).set(cards ? TripsView.list : TripsView.cards),
                      ),
                    PopupMenuButton<TripSort>(
                      tooltip: l10n.tripsSortDate,
                      icon: const Icon(AppIcons.filter),
                      initialValue: sort,
                      onSelected: ref.read(tripSortProvider.notifier).set,
                      itemBuilder: (_) => [
                        PopupMenuItem(value: TripSort.date, child: Text(l10n.tripsSortDate)),
                        PopupMenuItem(value: TripSort.name, child: Text(l10n.tripsSortName)),
                      ],
                    ),
                    PopupMenuButton<String>(
                      tooltip: horizon ? l10n.tripsJoinWithCode : l10n.navSettings,
                      icon: Icon(horizon ? AppIcons.more : AppIcons.settings),
                      onSelected: (v) {
                        if (v == 'settings') context.push('/settings');
                        if (v == 'signout') ref.read(authRepositoryProvider).signOut();
                        if (v == 'join') showJoinCodeSheet(context);
                        if (v == 'delete') context.push('/delete-account');
                        if (v == 'smoke') context.push('/smoke-test');
                      },
                      // Horizon nav: Settings, sign-out and delete-account live under the Me tab.
                      itemBuilder: (_) => [
                        if (horizon)
                          PopupMenuItem(value: 'join', child: Text(l10n.tripsJoinWithCode))
                        else ...[
                          PopupMenuItem(
                            key: const Key('menu-settings'),
                            value: 'settings',
                            child: Text(l10n.navSettings),
                          ),
                          PopupMenuItem(value: 'signout', child: Text(l10n.actionSignOut)),
                          PopupMenuItem(value: 'delete', child: Text(l10n.authDeleteAccount)),
                        ],
                        if (!AppEnv.current.isProd) PopupMenuItem(value: 'smoke', child: Text(l10n.smokeTestTitle)),
                      ],
                    ),
                  ],
                ),
          body: Stack(
            children: [
              if (cards) Positioned.fill(child: TripBackdrop(trip: _stackTop)),
              SafeArea(
                top: cards,
                bottom: false,
                child: Column(
                  children: [
                    if (cards)
                      _JourneysHeader(
                        total: _phaseCounts(lists.value?.active ?? const []).all,
                        active: _phaseCounts(lists.value?.active ?? const []).active,
                        name: auth.user?.displayName ?? auth.user?.email ?? '',
                        searchOpen: _searchOpen,
                        onProfile: () => context.go('/settings'),
                        onSearch: () => setState(() {
                          _searchOpen = !_searchOpen;
                          if (!_searchOpen) ref.read(tripSearchProvider.notifier).set('');
                        }),
                        onList: () => ref.read(tripsViewProvider.notifier).set(TripsView.list),
                      ),
                    const OfflineBanner(),
                    const SyncChip(),
                    if (_searchOpen)
                      Padding(
                        padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
                        child: AppTextField(
                          hint: l10n.tripsSearchHint,
                          autofocus: !cards,
                          prefixIcon: const Icon(AppIcons.search),
                          onChanged: ref.read(tripSearchProvider.notifier).set,
                        ),
                      ),
                    if (cards)
                      _FilterPills(
                        selected: _filter,
                        counts: _phaseCounts(lists.value?.active ?? const []),
                        onSelect: (f) => setState(() => _filter = f),
                      )
                    else
                      SizedBox(
                        height: 56,
                        child: ListView(
                          key: const Key('trip-filters'),
                          scrollDirection: Axis.horizontal,
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                          children: [
                            for (final f in const [
                              ('all', 'All'),
                              ('active', 'Active'),
                              ('upcoming', 'Upcoming'),
                              ('past', 'Past'),
                            ])
                              Padding(
                                padding: const EdgeInsets.only(right: 8),
                                child: ChoiceChip(
                                  key: Key('trip-filter-${f.$1}'),
                                  materialTapTargetSize: MaterialTapTargetSize.padded,
                                  showCheckmark: false,
                                  shape: const StadiumBorder(),
                                  label: Text(f.$2),
                                  selected: _filter == f.$1,
                                  onSelected: (_) => setState(() => _filter = f.$1),
                                ),
                              ),
                          ],
                        ),
                      ),
                    Expanded(
                      child: AppPullToRefresh(
                        onRefresh: ref.read(refreshTripsProvider),
                        child: lists.when(
                          loading: () => ListView(
                            physics: const AlwaysScrollableScrollPhysics(),
                            padding: const EdgeInsets.all(16),
                            children: [
                              for (var i = 0; i < 3; i++)
                                Padding(
                                  padding: const EdgeInsets.only(bottom: 12),
                                  child: SkeletonLoader(
                                    child: Container(
                                      height: 96,
                                      decoration: BoxDecoration(
                                        color: tokens.bgSurface,
                                        borderRadius: BorderRadius.circular(tokens.radiusMd),
                                      ),
                                    ),
                                  ),
                                ),
                            ],
                          ),
                          error: (e, _) => ListView(
                            physics: const AlwaysScrollableScrollPhysics(),
                            children: [
                              EmptyState(
                                plain: true,
                                title: l10n.tripsLoadError,
                                subtitle: friendlyError(
                                  l10n,
                                  e,
                                  online: ref.watch(isOnlineProvider).value ?? true,
                                  clear: _flagOn('enableClearErrorStates'),
                                ).message,
                                action: AppButton(
                                  label: l10n.actionRetry,
                                  onPressed: () => ref.invalidate(tripsProvider),
                                ),
                              ),
                            ],
                          ),
                          data: (data) {
                            final unsorted = data.active
                                .where((t) => !_hidden.contains(t.id) && _matchesFilter(t))
                                .toList();
                            // Grouped view: Happening now, then Upcoming, then Past; the chosen sort holds inside each group.
                            final active = sectionsOn && _filter == 'all'
                                ? [
                                    for (final (_, t) in ([
                                      for (final (i, t) in unsorted.indexed) (_sectionOf(t).index * 100000 + i, t),
                                    ]..sort((a, b) => a.$1.compareTo(b.$1))))
                                      t,
                                  ]
                                : unsorted;
                            final archived = data.archived.where((t) => !_hidden.contains(t.id)).toList();
                            final hits = searchOn && query.trim().isNotEmpty
                                ? searchHits(
                                    query,
                                    ref.watch(allTripsProvider).value ?? const <Trip>[],
                                    [for (final list in _expensesByTrip.values) ...list],
                                    rich: true,
                                    memberNames: {
                                      for (final list in _membersByTrip.values)
                                        for (final m in list) m.id: m.name,
                                    },
                                  )
                                : const <SearchHit>[];
                            if (data.total == 0 && syncing) {
                              return ListView(
                                key: const Key('trips-syncing'),
                                physics: const AlwaysScrollableScrollPhysics(),
                                padding: const EdgeInsets.all(16),
                                children: [
                                  // ponytail: English-only until the ARB files are regenerated.
                                  Padding(
                                    padding: const EdgeInsets.only(bottom: 12),
                                    child: Text('Syncing your trips…', style: TextStyle(color: tokens.textSecondary)),
                                  ),
                                  for (var i = 0; i < 3; i++)
                                    Padding(
                                      padding: const EdgeInsets.only(bottom: 12),
                                      child: SkeletonLoader(
                                        child: Container(
                                          height: 96,
                                          decoration: BoxDecoration(
                                            color: tokens.bgSurface,
                                            borderRadius: BorderRadius.circular(tokens.radiusMd),
                                          ),
                                        ),
                                      ),
                                    ),
                                ],
                              );
                            }
                            if (data.total == 0) {
                              return ListView(
                                physics: const AlwaysScrollableScrollPhysics(),
                                children: [
                                  EmptyState(
                                    plain: true,
                                    title: l10n.emptyTripsTitle,
                                    subtitle: l10n.emptyTripsSubtitle,
                                    action: Column(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        AppButton(label: l10n.actionCreateTrip, onPressed: _create),
                                        const SizedBox(height: 8),
                                        AppButton(
                                          label: l10n.tripsJoinWithCode,
                                          variant: AppButtonVariant.secondary,
                                          onPressed: () => showJoinCodeSheet(context),
                                        ),
                                        if (_flagOn('enableFirstRunTour') && auth.isAuthenticated) ...[
                                          const SizedBox(height: 8),
                                          TextButton(
                                            key: const Key('try-sample-trip'),
                                            onPressed: _trySample,
                                            child: Text(l10n.trySampleTrip),
                                          ),
                                        ],
                                      ],
                                    ),
                                  ),
                                ],
                              );
                            }
                            if (active.isEmpty && archived.isEmpty && hits.isEmpty) {
                              return ListView(
                                physics: const AlwaysScrollableScrollPhysics(),
                                children: [
                                  Padding(
                                    padding: const EdgeInsets.all(32),
                                    child: Center(child: Text(l10n.tripsNoMatches)),
                                  ),
                                ],
                              );
                            }
                            bool owner(Trip t) => t.ownerId == auth.userId;
                            if (cards) {
                              // Every trip, any state: current ones first, archived ones at the back.
                              return TripCardStack(
                                key: const Key('trip-stack'),
                                trips: [...active, ...archived],
                                now: _now,
                                onOpen: _open,
                                onLongPress: (t) => _tripMenu(t, owner(t)),
                                onTopChanged: (t) => setState(() => _stackTop = t),
                                onAddExpense: _flagOn('enableTripCardQuickAdd')
                                    ? (t) => context.push('/trip/${t.id}/expenses/new')
                                    : null,
                              );
                            }
                            // The first trip happening today becomes the Night Sky hero.
                            final heroId = active
                                .where((t) => tripStatus(t.startDate, t.endDate, _now).phase == TripPhase.active)
                                .map((t) => t.id)
                                .firstOrNull;
                            final grouped = sectionsOn && _filter == 'all';
                            // Pinned trips lead the list (device-only); the rest keep their phase and sort order.
                            final pinnedTrips = [
                              for (final t in active)
                                if (pinnedIds.contains(t.id)) t,
                            ];
                            final unpinned = [
                              for (final t in active)
                                if (!pinnedIds.contains(t.id)) t,
                            ];
                            final sections = [
                              for (final sec in TripSection.values)
                                (
                                  sec,
                                  [
                                    for (final t in unpinned)
                                      if (_sectionOf(t) == sec) t,
                                  ],
                                ),
                            ];
                            var n = 0;
                            Widget rowFor(Trip t) => BentoEntrance(
                              index: n++,
                              child: _card(t, owner(t), featured: t.id == heroId),
                            );
                            Widget list(List<Trip> trips) {
                              if (!grid) {
                                return SliverPadding(
                                  padding: const EdgeInsets.symmetric(horizontal: 16),
                                  sliver: SliverList.builder(
                                    itemCount: trips.length,
                                    itemBuilder: (_, i) => rowFor(trips[i]),
                                  ),
                                );
                              }
                              // Photo tiles: the trip happening now is a wide hero, the rest a square grid.
                              final hero = trips.where((t) => t.id == heroId).firstOrNull;
                              final rest = [
                                for (final t in trips)
                                  if (t != hero) t,
                              ];
                              return SliverPadding(
                                padding: const EdgeInsets.symmetric(horizontal: 16),
                                sliver: SliverMainAxisGroup(
                                  slivers: [
                                    if (hero != null)
                                      SliverToBoxAdapter(child: _card(hero, owner(hero), featured: true)),
                                    SliverGrid.builder(
                                      gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
                                        maxCrossAxisExtent: 240,
                                        mainAxisSpacing: 10,
                                        crossAxisSpacing: 10,
                                      ),
                                      itemCount: rest.length,
                                      itemBuilder: (_, i) => _tile(rest[i], owner(rest[i])),
                                    ),
                                    const SliverToBoxAdapter(child: SizedBox(height: 10)),
                                  ],
                                ),
                              );
                            }

                            String label(TripSection sec) => switch (sec) {
                              TripSection.now => l10n.tripSectionNow,
                              TripSection.upcoming => l10n.tripSectionUpcoming,
                              TripSection.past => l10n.tripSectionPast,
                            };
                            final overview = overviewOn
                                ? _overviewLine(data.active.where((t) => !_hidden.contains(t.id)).toList())
                                : null;
                            return CustomScrollView(
                              physics: const AlwaysScrollableScrollPhysics(),
                              slivers: [
                                SliverPadding(
                                  padding: const EdgeInsets.fromLTRB(16, 4, 16, 0),
                                  sliver: SliverToBoxAdapter(
                                    child: Column(
                                      children: [
                                        const LastSyncedCaption(),
                                        ?overview,
                                        if (active.isNotEmpty)
                                          CoachHint(hintKey: 'trips-swipe', text: l10n.hintSwipeTrip),
                                      ],
                                    ),
                                  ),
                                ),
                                if (grouped) ...[
                                  if (pinnedTrips.isNotEmpty) ...[
                                    SliverPersistentHeader(
                                      pinned: true,
                                      delegate: _SectionHeaderDelegate(
                                        label: l10n.tripSectionPinned,
                                        count: pinnedTrips.length,
                                        folded: false,
                                        foldable: false,
                                        onTap: () {},
                                        background: tokens.bgPage,
                                      ),
                                    ),
                                    list(pinnedTrips),
                                  ],
                                  for (final (sec, trips) in sections)
                                    if (trips.isNotEmpty) ...[
                                      SliverPersistentHeader(
                                        pinned: true,
                                        delegate: _SectionHeaderDelegate(
                                          label: label(sec),
                                          count: trips.length,
                                          folded: sec == TripSection.past && _pastFolded,
                                          foldable: sec == TripSection.past,
                                          onTap: () => setState(() => _pastFolded = !_pastFolded),
                                          background: tokens.bgPage,
                                        ),
                                      ),
                                      if (!(sec == TripSection.past && _pastFolded)) list(trips),
                                    ],
                                ] else
                                  list([...pinnedTrips, ...unpinned]),
                                if (hits.isNotEmpty)
                                  SliverPadding(
                                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
                                    sliver: SliverList.list(
                                      key: const Key('search-hits'),
                                      children: [
                                        SectionLabel(l10n.searchHitsTitle(hits.length)),
                                        for (final h in hits)
                                          ListTile(
                                            key: Key('hit-${h.kind.name}-${h.tripId}-${h.title}'),
                                            contentPadding: EdgeInsets.zero,
                                            leading: Icon(
                                              h.kind == HitKind.expense
                                                  ? Icons.receipt_long_outlined
                                                  : Icons.sticky_note_2_outlined,
                                            ),
                                            title: Text(h.title, maxLines: 1, overflow: TextOverflow.ellipsis),
                                            subtitle: Text(
                                              [h.tripName, if (h.detail.isNotEmpty) h.detail].join(' · '),
                                              maxLines: 1,
                                              overflow: TextOverflow.ellipsis,
                                            ),
                                            trailing: h.amount == null
                                                ? null
                                                : Text(
                                                    formatMoney(context, h.amount!, h.currency ?? 'INR'),
                                                    style: const TextStyle(fontWeight: FontWeight.w700),
                                                  ),
                                            onTap: () => unawaited(
                                              context.push(
                                                '/trip/${h.tripId}/${h.kind == HitKind.expense ? 'expenses' : 'notes'}',
                                              ),
                                            ),
                                          ),
                                      ],
                                    ),
                                  ),
                                if (archived.isNotEmpty)
                                  SliverPadding(
                                    padding: const EdgeInsets.symmetric(horizontal: 16),
                                    sliver: SliverToBoxAdapter(
                                      child: ExpansionTile(
                                        tilePadding: EdgeInsets.zero,
                                        title: Text(
                                          l10n.tripsArchivedSection(archived.length),
                                          style: TextStyle(color: tokens.textSecondary),
                                        ),
                                        children: [for (final t in archived) _card(t, owner(t))],
                                      ),
                                    ),
                                  ),
                                const SliverToBoxAdapter(child: SizedBox(height: 96)),
                              ],
                            );
                          },
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              if (cards)
                Positioned(
                  left: 0,
                  right: 0,
                  bottom: 26,
                  child: Center(
                    child: RunwaySlider(
                      width: math.min(MediaQuery.sizeOf(context).width - 48, 340),
                      leftLabel: l10n.tripsJoinShort,
                      rightLabel: l10n.tripsNewTrip,
                      leftIcon: Icons.qr_code_2_rounded,
                      rightIcon: Icons.add_rounded,
                      onLeft: () => showJoinCodeSheet(context),
                      onRight: _create,
                    ),
                  ),
                ),
            ],
          ),
          // Card view carries its own floating "New Trip | Join" pill, so the dock and the button step aside.
          bottomNavigationBar: cards ? null : buildHomeDock(context, ref, HomeTab.trips),
          // The dock's centre button replaces the FAB on iOS / web; Material 3 keeps it.
          floatingActionButton: tokens.calm && !cards
              ? CalmAddButton(extended: true, label: l10n.tripsNewTrip, onTap: _create)
              : cards || (horizon && AppBottomNav.dockByDefault)
              ? null
              : FloatingActionButton.extended(
                  onPressed: _create,
                  icon: const Icon(AppIcons.add),
                  label: Text(l10n.tripsNewTrip),
                ),
        ),
      ),
    );
  }
}

/// "Journeys" header of the card view: profile avatar, serif title, search, and the stack / list switch.
class _JourneysHeader extends StatelessWidget {
  const _JourneysHeader({
    required this.total,
    required this.active,
    required this.name,
    required this.searchOpen,
    required this.onProfile,
    required this.onSearch,
    required this.onList,
  });

  final int total;
  final int active;
  final String name;
  final bool searchOpen;
  final VoidCallback onProfile;
  final VoidCallback onSearch;
  final VoidCallback onList;

  @override
  Widget build(BuildContext context) {
    final t = context.tokens;
    final l10n = context.l10n;
    return Padding(
      padding: const EdgeInsets.fromLTRB(14, 8, 14, 6),
      child: Row(
        children: [
          Semantics(
            button: true,
            label: l10n.navSettings,
            child: GestureDetector(
              key: const Key('journeys-avatar'),
              onTap: onProfile,
              child: AppAvatar(name: name.isEmpty ? '?' : name, size: 42),
            ),
          ),
          Expanded(
            // The right side (search + view switch) is wider than the avatar; the left padding evens that out so the
            // title sits near the screen's centre.
            child: Center(
              child: Padding(
                padding: const EdgeInsets.only(left: 64),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      l10n.tripsJourneys,
                      key: const Key('journeys-title'),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontFamily: AppTypography.fontSerif,
                        fontSize: 28,
                        fontWeight: FontWeight.w800,
                        height: 1.1,
                        color: t.textPrimary,
                      ),
                    ),
                    if (total > 0)
                      Text(
                        l10n.tripsHeaderCount(total, active).toUpperCase(),
                        key: const Key('journeys-count'),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontFamily: AppTypography.fontMono,
                          fontSize: 10.5,
                          fontWeight: FontWeight.w600,
                          letterSpacing: 1.1,
                          color: t.textSecondary,
                        ),
                      ),
                  ],
                ),
              ),
            ),
          ),
          _RoundIcon(
            key: const Key('journeys-search'),
            icon: searchOpen ? Icons.close_rounded : AppIcons.search,
            tooltip: l10n.tripsSearch,
            onTap: onSearch,
          ),
          const SizedBox(width: 8),
          // Stack (selected here) / list switch.
          Container(
            key: const Key('trips-view-toggle'),
            padding: const EdgeInsets.all(3),
            decoration: BoxDecoration(
              color: t.bgSurface.withValues(alpha: 0.75),
              borderRadius: BorderRadius.circular(99),
              border: Border.all(color: t.borderColor),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 38,
                  height: 36,
                  decoration: BoxDecoration(
                    color: t.textPrimary.withValues(alpha: 0.14),
                    borderRadius: BorderRadius.circular(99),
                  ),
                  child: Icon(Icons.layers_rounded, size: 19, color: t.textPrimary),
                ),
                Semantics(
                  button: true,
                  label: l10n.tripsViewList,
                  child: InkWell(
                    key: const Key('journeys-list'),
                    customBorder: const CircleBorder(),
                    onTap: onList,
                    child: SizedBox(
                      width: 38,
                      height: 36,
                      child: Icon(Icons.view_list_rounded, size: 19, color: t.textSecondary),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _RoundIcon extends StatelessWidget {
  const _RoundIcon({required this.icon, required this.tooltip, required this.onTap, super.key});

  final IconData icon;
  final String tooltip;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final t = context.tokens;
    return Tooltip(
      message: tooltip,
      child: Material(
        color: t.bgSurface.withValues(alpha: 0.75),
        shape: CircleBorder(side: BorderSide(color: t.borderColor)),
        child: InkWell(
          customBorder: const CircleBorder(),
          onTap: onTap,
          child: SizedBox(width: 42, height: 42, child: Icon(icon, size: 20, color: t.textPrimary)),
        ),
      ),
    );
  }
}

/// All / Active / Upcoming / Past pills with live counts; the selected one is solid.
class _FilterPills extends StatelessWidget {
  const _FilterPills({required this.selected, required this.counts, required this.onSelect});

  final String selected;
  final ({int all, int active, int upcoming, int past}) counts;
  final ValueChanged<String> onSelect;

  @override
  Widget build(BuildContext context) {
    final t = context.tokens;
    final items = [
      ('all', 'All', counts.all),
      ('active', 'Active', counts.active),
      ('upcoming', 'Upcoming', counts.upcoming),
      ('past', 'Past', counts.past),
    ];
    return SizedBox(
      key: const Key('trip-filters'),
      height: 52,
      // Centred when the four pills fit; scrolls sideways when they do not (large text, small phones).
      child: LayoutBuilder(
        builder: (context, box) => SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.symmetric(vertical: 8),
          child: ConstrainedBox(
            constraints: BoxConstraints(minWidth: box.maxWidth),
            child: Center(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 12),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    for (final (id, label, n) in items)
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 4),
                        child: Semantics(
                          button: true,
                          selected: selected == id,
                          child: GestureDetector(
                            key: Key('trip-filter-$id'),
                            onTap: () => onSelect(id),
                            child: AnimatedContainer(
                              duration: AppMotion.of(context, AppMotion.fast),
                              padding: const EdgeInsets.symmetric(horizontal: 16),
                              alignment: Alignment.center,
                              decoration: BoxDecoration(
                                color: selected == id ? t.textPrimary : t.bgSurface.withValues(alpha: 0.7),
                                borderRadius: BorderRadius.circular(99),
                                border: Border.all(color: selected == id ? t.textPrimary : t.borderColor),
                              ),
                              child: Row(
                                children: [
                                  Text(
                                    label,
                                    style: TextStyle(
                                      fontWeight: FontWeight.w700,
                                      fontSize: 14,
                                      color: selected == id ? t.bgSurface : t.textSecondary,
                                    ),
                                  ),
                                  if (n > 0) ...[
                                    const SizedBox(width: 7),
                                    Text(
                                      '$n',
                                      style: TextStyle(
                                        fontFamily: AppTypography.fontMono,
                                        fontSize: 12,
                                        fontWeight: FontWeight.w700,
                                        color: selected == id ? t.bgSurface.withValues(alpha: 0.7) : t.textMuted,
                                      ),
                                    ),
                                  ],
                                ],
                              ),
                            ),
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Pinned "HAPPENING NOW · 1" header of the grouped trip list. "Past" can be folded away.
class _SectionHeaderDelegate extends SliverPersistentHeaderDelegate {
  _SectionHeaderDelegate({
    required this.label,
    required this.count,
    required this.folded,
    required this.foldable,
    required this.onTap,
    required this.background,
  });

  final String label;
  final int count;
  final bool folded;
  final bool foldable;
  final VoidCallback onTap;
  final Color background;

  @override
  double get minExtent => 40;
  @override
  double get maxExtent => 40;

  @override
  Widget build(BuildContext context, double shrinkOffset, bool overlapsContent) {
    final t = context.tokens;
    return Material(
      color: background,
      child: InkWell(
        key: Key('trip-section-$label'),
        onTap: foldable ? onTap : null,
        child: SizedBox(
          height: 40,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Row(
              children: [
                Expanded(child: Text('${label.toUpperCase()} · $count', style: sectionLabelStyle(context))),
                if (foldable) Icon(folded ? Icons.expand_more_rounded : Icons.expand_less_rounded, color: t.textMuted),
              ],
            ),
          ),
        ),
      ),
    );
  }

  @override
  bool shouldRebuild(_SectionHeaderDelegate old) =>
      old.label != label || old.count != count || old.folded != folded || old.background != background;
}
