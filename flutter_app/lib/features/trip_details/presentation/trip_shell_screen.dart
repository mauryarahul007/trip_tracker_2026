import '../../../shared/widgets/cached_photo.dart';

import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/auth_state.dart';
import '../../../core/env/app_env.dart';
import '../../../core/clock.dart';
import '../../../core/network/connectivity_provider.dart';
import '../../../core/platform/haptics.dart';
import '../../../data/providers.dart';
import '../../../data/realtime/realtime_manager.dart';
import '../../../data/sync/outbox_store.dart';
import '../../../data/sync/outbox_types.dart';
import '../../../domain/logic/tab_trail.dart';
import '../../../domain/logic/trip_status.dart';
import '../../../domain/logic/trip_utilities.dart' show formatDateRange;
import '../../../domain/models/trip.dart';
import '../../../l10n/l10n_ext.dart';
import '../../../shared/theme/app_icons.dart';
import '../../../shared/theme/app_tokens.dart';
import '../../../shared/theme/app_typography.dart';
import '../../../shared/widgets/app_bottom_nav.dart';
import '../../../shared/widgets/app_scaffold.dart';
import '../../../shared/widgets/offline_banner.dart';
import '../../../shared/widgets/app_sheet.dart';
import '../../chat/application/chat_providers.dart';
import '../../../domain/logic/expense_list_logic.dart' show isActualExpense;
import '../../../domain/models/expense.dart';
import '../../expenses/application/expenses_providers.dart';
import '../../notifications/presentation/notification_bell.dart';
import '../../travel/maps/trip_route_panel.dart';
import '../../travel/maps/trip_route_modal.dart';
import '../../travel/presentation/live_location_share_modal.dart';
import '../../trips/presentation/widgets/share_trip_sheet.dart';
import 'widgets/edit_trip_sheet.dart';
import 'widgets/trip_actions_sheet.dart';
import '../../trips/presentation/widgets/trip_card.dart' show TripStatusPill, tripHeadline;
import '../../expenses/application/money_providers.dart' show allTripsProvider;
import '../../trips/application/trip_accent.dart';
import '../../trips/application/trips_providers.dart';
import '../application/trip_nav.dart';
import '../domain/trip_tabs.dart';

/// Branch order == [TripNavTab] order (chat, expenses, ledger, members, notes).
String tripTabLabel(BuildContext context, TripNavTab tab) {
  final l10n = context.l10n;
  return switch (tab) {
    TripNavTab.chat => l10n.navChat,
    TripNavTab.expenses => l10n.navExpenses,
    TripNavTab.ledger => l10n.navSummary,
    TripNavTab.members => l10n.navMembers,
    TripNavTab.notes => l10n.navNotes,
  };
}

IconData tripTabIcon(TripNavTab tab) => switch (tab) {
  TripNavTab.chat => AppIcons.chat,
  TripNavTab.expenses => AppIcons.expenses,
  TripNavTab.ledger => Icons.space_dashboard_rounded,
  TripNavTab.members => AppIcons.members,
  TripNavTab.notes => AppIcons.notes,
};

/// Header + bottom nav + swipeable tab pager. Per-tab state is kept by the
/// [StatefulNavigationShell]; Back walks a short tab trail before leaving.
class TripShellScreen extends ConsumerStatefulWidget {
  const TripShellScreen({required this.tripId, required this.body, required this.navigationShell, super.key});

  final String tripId;
  final Widget body;
  final StatefulNavigationShell navigationShell;

  @override
  ConsumerState<TripShellScreen> createState() => _TripShellScreenState();
}

class _TripShellScreenState extends ConsumerState<TripShellScreen> {
  var _trail = <int>[];
  late int _current;
  bool _mapExpanded = false;

  RealtimeManager? _realtime;

  @override
  void initState() {
    super.initState();
    // Eager: a lazy `late` initialiser would first run after the first tab change.
    _current = widget.navigationShell.currentIndex;
    _openRealtime();
  }

  /// Live updates for this trip (chat, checklist, notes, passes…). Without this nothing a teammate adds shows up
  /// until the next manual sync. Guests, demo and no-backend builds stay local.
  void _openRealtime() {
    final a = ref.read(authStateProvider);
    if (!(AppEnv.current.hasBackend && a.isAuthenticated && !a.isLocalOnly)) return;
    _realtime = ref.read(realtimeManagerProvider);
    unawaited(_realtime!.openTrip(widget.tripId));
  }

  @override
  void dispose() {
    unawaited(_realtime?.closeTrip());
    super.dispose();
  }

  @override
  void didUpdateWidget(TripShellScreen old) {
    super.didUpdateWidget(old);
    if (old.tripId != widget.tripId) _openRealtime(); // openTrip closes the previous trip's channels
    final next = widget.navigationShell.currentIndex;
    if (next != _current) {
      _trail = pushTab(_trail, _current, next);
      _current = next;
    }
  }

  void _onMenu(String v) {
    switch (v) {
      case 'share':
        AppSheet.show<void>(
          context: context,
          title: context.l10n.inviteSheetTitle,
          builder: (_) => ShareTripSheet(tripId: widget.tripId),
        );
      case 'map':
        setState(() => _mapExpanded = !_mapExpanded);
      case 'edit-trip':
        AppSheet.show<bool>(
          context: context,
          title: 'Edit Trip',
          builder: (_) => EditTripSheet(tripId: widget.tripId),
        );
      case 'trip-settings':
        context.push('/trip/${widget.tripId}/settings');
      case 'app-settings':
        context.push('/settings');
      default:
        final user = ref.read(authStateProvider).user;
        final myMember = ref.read(myMemberIdProvider(widget.tripId));
        LiveLocationShareModal.show(context, tripId: widget.tripId, memberId: myMember ?? '', userId: user?.id ?? '');
    }
  }

  void _goTab(int branch) {
    unawaited(AppHaptics.selection());
    widget.navigationShell.goBranch(branch);
  }

  /// Leave the trip: back to the page we came from, or Trips when the trip was the first page.
  void _leave() => context.canPop() ? context.pop() : context.go('/');

  /// Back: previous tab from the trail, else leave the trip.
  void _onBack() {
    final popped = popTab(_trail);
    if (popped.tab != null) {
      _trail = popped.trail;
      _current = popped.tab!;
      widget.navigationShell.goBranch(popped.tab!);
    } else {
      _leave();
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final tabs = ref.watch(visibleTabsProvider(widget.tripId));
    final trip = ref.watch(tripProvider(widget.tripId)).value;
    final currentTab = TripNavTab.values[widget.navigationShell.currentIndex];
    final activeIndex = tabs.indexOf(currentTab);

    // A tab hidden by flags (e.g. chat when chat-first is off) must not be
    // left showing: fall back to the first visible tab.
    if (activeIndex < 0 && tabs.isNotEmpty) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) widget.navigationShell.goBranch(tabs.first.index);
      });
    }

    final cleanBar = ref.watch(flagProvider(('enableCleanTopBar', widget.tripId))).value ?? true;
    final wide = MediaQuery.sizeOf(context).width >= kSideNavBreakpoint && tabs.length >= 2;
    final navItems = [
      for (final t in tabs)
        AppNavItem(
          icon: tripTabIcon(t),
          label: tripTabLabel(context, t),
          badge: t == TripNavTab.chat && ref.watch(chatUnreadProvider(widget.tripId)),
          badgeKey: const Key('chat-tab-unread'),
        ),
    ];

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) _onBack();
      },
      child: AppScaffold(
        maxContentWidth: null,
        appBar: AppBar(
          // Bento: the app bar sits on the ground colour with an ink title; the theme supplies both.
          leading: IconButton(tooltip: l10n.actionBack, icon: const Icon(AppIcons.back, size: 20), onPressed: _leave),
          title: _TripTitle(tripId: widget.tripId, tab: currentTab.name),
          actions: cleanBar
              ? [
                  _SyncAction(tripId: widget.tripId),
                  NotificationBell(tripId: widget.tripId),
                  PopupMenuButton<String>(
                    key: const Key('action-trip-more'),
                    icon: const Icon(Icons.more_vert_rounded),
                    tooltip: l10n.tripMoreMenu,
                    onSelected: _onMenu,
                    itemBuilder: (_) => [
                      PopupMenuItem(
                        key: const Key('action-share'),
                        value: 'share',
                        child: ListTile(leading: const Icon(AppIcons.share), title: Text(l10n.shareTripTitle)),
                      ),
                      if (trip != null)
                        PopupMenuItem(
                          key: const Key('action-trip-map'),
                          value: 'map',
                          child: ListTile(
                            leading: Icon(_mapExpanded ? Icons.map : Icons.map_outlined),
                            title: Text(l10n.tripRouteMap),
                          ),
                        ),
                      if (trip != null &&
                          (ref.watch(flagProvider(('enableTripHeaderActions', widget.tripId))).value ?? true))
                        PopupMenuItem(
                          key: const Key('action-edit-trip'),
                          value: 'edit-trip',
                          enabled: ref.watch(canEditTripRulesProvider(widget.tripId)),
                          child: const ListTile(leading: Icon(Icons.edit_outlined), title: Text('Edit trip details')),
                        ),
                      PopupMenuItem(
                        key: const Key('action-trip-settings'),
                        value: 'trip-settings',
                        child: ListTile(leading: const Icon(AppIcons.settings), title: Text(l10n.tripSettingsMenu)),
                      ),
                      const PopupMenuDivider(),
                      PopupMenuItem(
                        key: const Key('action-app-settings'),
                        value: 'app-settings',
                        child: ListTile(leading: const Icon(Icons.tune_rounded), title: Text(l10n.tripAppSettings)),
                      ),
                      const PopupMenuItem(
                        key: Key('action-live-location'),
                        value: 'location',
                        child: ListTile(leading: Icon(AppIcons.location), title: Text('Live Location Share')),
                      ),
                    ],
                  ),
                ]
              : [
                  if (trip != null)
                    IconButton(
                      key: const Key('action-trip-map'),
                      icon: Icon(_mapExpanded ? Icons.map : Icons.map_outlined),
                      tooltip: 'Route Map',
                      onPressed: () => setState(() => _mapExpanded = !_mapExpanded),
                    ),
                  IconButton(
                    icon: const Icon(AppIcons.share),
                    tooltip: l10n.shareTripTitle,
                    onPressed: () => AppSheet.show<void>(
                      context: context,
                      title: l10n.inviteSheetTitle,
                      builder: (_) => ShareTripSheet(tripId: widget.tripId),
                    ),
                  ),
                  // Live location and app-level settings live in a menu so the bell and the trip gear always fit.
                  PopupMenuButton<String>(
                    key: const Key('action-trip-more'),
                    icon: const Icon(Icons.more_vert_rounded),
                    onSelected: (v) {
                      if (v == 'app-settings') {
                        context.push('/settings');
                      } else {
                        final user = ref.read(authStateProvider).user;
                        final myMember = ref.read(myMemberIdProvider(widget.tripId));
                        LiveLocationShareModal.show(
                          context,
                          tripId: widget.tripId,
                          memberId: myMember ?? '',
                          userId: user?.id ?? '',
                        );
                      }
                    },
                    itemBuilder: (_) => [
                      const PopupMenuItem(
                        key: Key('action-app-settings'),
                        value: 'app-settings',
                        child: ListTile(leading: Icon(AppIcons.settings), title: Text('App settings')),
                      ),
                      const PopupMenuItem(
                        key: Key('action-live-location'),
                        value: 'location',
                        child: ListTile(leading: Icon(AppIcons.location), title: Text('Live Location Share')),
                      ),
                    ],
                  ),
                  NotificationBell(tripId: widget.tripId),
                  IconButton(
                    icon: const Icon(AppIcons.settings),
                    tooltip: l10n.navSettings,
                    onPressed: () => context.push('/trip/${widget.tripId}/settings'),
                  ),
                ],
        ),
        body: Row(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (wide)
              AppSideNav(
                items: navItems,
                currentIndex: activeIndex < 0 ? 0 : activeIndex,
                onTap: (i) => _goTab(tabs[i].index),
                extended: MediaQuery.sizeOf(context).width >= kSideNavExtendedBreakpoint,
              ),
            Expanded(
              child: Align(
                alignment: Alignment.topCenter,
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 1040),
                  child: Column(
                    children: [
                      const OfflineBanner(),
                      if (trip != null) _TripStrip(tripId: widget.tripId, tab: currentTab.name),
                      AnimatedSize(
                        duration: const Duration(milliseconds: 220),
                        curve: Curves.easeOutCubic,
                        alignment: Alignment.topCenter,
                        child: _mapExpanded && trip != null
                            ? TripRoutePanel(
                                trip: trip,
                                showStops:
                                    ref.watch(flagProvider(('enableTripHeaderActions', widget.tripId))).value ?? true,
                                onOpen: () => showModalBottomSheet<void>(
                                  context: context,
                                  isScrollControlled: true,
                                  showDragHandle: true, // same grab handle as every AppSheet
                                  useSafeArea: true,
                                  builder: (_) => TripRouteModal(trip: trip),
                                ),
                              )
                            : const SizedBox(width: double.infinity),
                      ),
                      Expanded(child: widget.body),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
        bottomNavigationBar: tabs.length < 2 || wide
            ? null
            : AppBottomNav(
                currentIndex: activeIndex < 0 ? 0 : activeIndex,
                onTap: (i) => _goTab(tabs[i].index),
                items: navItems,
              ),
      ),
    );
  }
}

/// Horizontally swipeable container for the tab navigators. Pages are the
/// *visible* tabs only; swiping calls `goBranch`, and external tab changes
/// (bottom bar, back) animate the pager. Navigators are kept alive so each
/// tab keeps its scroll/state.
class TripTabPager extends ConsumerStatefulWidget {
  const TripTabPager({required this.tripId, required this.navigationShell, required this.branches, super.key});

  final String tripId;
  final StatefulNavigationShell navigationShell;
  final List<Widget> branches;

  @override
  ConsumerState<TripTabPager> createState() => _TripTabPagerState();
}

class _TripTabPagerState extends ConsumerState<TripTabPager> {
  PageController? _controller;
  bool _programmatic = false;

  List<TripNavTab> get _tabs => ref.read(visibleTabsProvider(widget.tripId));

  int get _page {
    final i = _tabs.indexOf(TripNavTab.values[widget.navigationShell.currentIndex]);
    return i < 0 ? 0 : i;
  }

  @override
  void initState() {
    super.initState();
    _controller = PageController(initialPage: _page);
  }

  @override
  void didUpdateWidget(TripTabPager old) {
    super.didUpdateWidget(old);
    final c = _controller;
    if (c == null || !c.hasClients) return;
    final target = _page;
    if ((c.page ?? target.toDouble()).round() != target) {
      _programmatic = true;
      c
          .animateToPage(target, duration: const Duration(milliseconds: 260), curve: Curves.easeOutCubic)
          .whenComplete(() => _programmatic = false);
    }
  }

  @override
  void dispose() {
    _controller?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final tabs = ref.watch(visibleTabsProvider(widget.tripId));
    return PageView(
      controller: _controller,
      onPageChanged: (page) {
        if (_programmatic || page >= tabs.length) return;
        final branch = tabs[page].index;
        if (branch != widget.navigationShell.currentIndex) {
          unawaited(AppHaptics.selection());
          widget.navigationShell.goBranch(branch);
        }
      },
      children: [for (final t in tabs) _KeepAlive(child: widget.branches[t.index])],
    );
  }
}

class _KeepAlive extends StatefulWidget {
  const _KeepAlive({required this.child});
  final Widget child;

  @override
  State<_KeepAlive> createState() => _KeepAliveState();
}

class _KeepAliveState extends State<_KeepAlive> with AutomaticKeepAliveClientMixin {
  @override
  bool get wantKeepAlive => true;

  @override
  Widget build(BuildContext context) {
    super.build(context);
    return widget.child;
  }
}

/// Stand-in kept for a tab that has no screen yet. Trip tabs no longer use it.
class TripTabPlaceholder extends StatelessWidget {
  const TripTabPlaceholder({required this.tab, super.key});
  final TripNavTab tab;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    return Center(
      key: Key('tab-${tab.name}'),
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(tripTabIcon(tab), size: 40, color: tokens.primaryAccent),
            const SizedBox(height: 16),
            Text(
              tripTabLabel(context, tab),
              style: TextStyle(fontSize: 19, fontWeight: FontWeight.w700, color: tokens.textPrimary),
            ),
          ],
        ),
      ),
    );
  }
}

/// Slim strip under the top bar on every tab: status and dates (flag `enableTripHeaderStrip`). With
/// `enableTripCoverHeader` it becomes a cover photo band, and `enableSyncLine` adds a saved / syncing line.
/// (members, expenses) shown in the header chip: active members, and real expenses (not settlements or bin items).
(int, int) _tripCounts(WidgetRef ref, String tripId) => (
  ref.watch(visibleMembersProvider(tripId)).length,
  [
    for (final e in ref.watch(tripExpensesProvider(tripId)).value ?? const <Expense>[])
      if (isActualExpense(e) && e.deletedAt == null) e,
  ].length,
);

class _TripStrip extends ConsumerWidget {
  const _TripStrip({required this.tripId, required this.tab});
  final String tripId;

  /// The tab the traveller is on; switching trips keeps it.
  final String tab;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // With header actions on, the meta line sits under the trip name and this strip is not shown.
    final actionsOn = ref.watch(flagProvider(('enableTripHeaderActions', tripId))).value ?? true;
    final on = !actionsOn && (ref.watch(flagProvider(('enableTripHeaderStrip', tripId))).value ?? false);
    final trip = ref.watch(tripProvider(tripId)).value;
    if (!on || trip == null) return const SizedBox.shrink();
    final t = context.tokens;
    final status = tripStatus(trip.startDate, trip.endDate, ref.read(nowProvider)());
    final headline = tripHeadline(context, status);
    final dates = trip.startDate.isEmpty ? '' : formatDateRange(trip.startDate, trip.endDate);
    final coverOn = ref.watch(flagProvider(('enableTripCoverHeader', tripId))).value ?? true;
    final cover = coverOn ? ref.watch(tripCoverProvider(tripCoverKey(trip))).value : null;
    final syncOn = ref.watch(flagProvider(('enableSyncLine', tripId))).value ?? true;
    final accentOn = ref.watch(flagProvider(('enableTripAccent', tripId))).value ?? true;
    final accent = accentOn ? ref.watch(tripAccentProvider(tripId)).value : null;
    final hasCover = cover != null && cover.isNotEmpty;

    final row = Row(
      children: [
        // Status and dates take whatever room the trailing controls leave; dates shorten first.
        Expanded(
          child: Row(
            children: [
              if (headline.isNotEmpty) ...[
                Flexible(flex: 2, child: TripStatusPill(headline, color: accent)),
                const SizedBox(width: 10),
              ],
              if (dates.isNotEmpty)
                Flexible(
                  child: Text(
                    dates,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: hasCover ? Colors.white : t.textSecondary,
                    ),
                  ),
                ),
            ],
          ),
        ),
        if (syncOn) Flexible(child: _SyncLine(onDark: hasCover)),
      ],
    );
    if (!hasCover) {
      return Padding(key: const Key('trip-strip'), padding: const EdgeInsets.fromLTRB(16, 0, 16, 8), child: row);
    }
    return Padding(
      key: const Key('trip-strip'),
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 10),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(t.radiusMd),
        child: SizedBox(
          height: 92,
          child: Stack(
            fit: StackFit.expand,
            children: [
              const DecoratedBox(
                decoration: BoxDecoration(gradient: LinearGradient(colors: [Color(0xFF123A57), Color(0xFF1F6F78)])),
              ),
              Hero(
                tag: 'trip-photo-$tripId',
                child: Image(
                  image: CachedPhotoProvider(cover),
                  key: const Key('trip-cover'),
                  fit: BoxFit.cover,
                  errorBuilder: (_, _, _) => const SizedBox.shrink(),
                ),
              ),
              DecoratedBox(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [Colors.black.withValues(alpha: 0.15), Colors.black.withValues(alpha: 0.7)],
                  ),
                ),
              ),
              Positioned(left: 12, right: 12, bottom: 10, child: row),
            ],
          ),
        ),
      ),
    );
  }
}

/// "All saved" / "Syncing 3 changes" / "Offline - 2 waiting" / "Sync issue - Retry": local-first trust at a glance.
class _SyncLine extends ConsumerWidget {
  const _SyncLine({required this.onDark});
  final bool onDark;

  /// Icon only unless something is wrong (room is tight next to the trip arrows); problems still say it in words.

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final t = context.tokens;
    final online = ref.watch(isOnlineProvider).value ?? true;
    final status = ref.watch(syncStatusProvider).value ?? const SyncStatus();
    final (String text, IconData icon, Color color) = status.issues > 0
        ? (l10n.syncLineIssue, Icons.sync_problem_rounded, onDark ? Colors.white : t.colorDanger)
        : !online
        ? (
            status.pending > 0 ? l10n.syncLineOfflineWaiting(status.pending) : l10n.syncLineOffline,
            Icons.cloud_off_rounded,
            onDark ? Colors.white : t.textSecondary,
          )
        : status.pending > 0
        ? (l10n.syncLineSyncing(status.pending), Icons.sync_rounded, onDark ? Colors.white : t.textSecondary)
        : (l10n.syncLineSaved, Icons.check_circle_outline_rounded, onDark ? Colors.white70 : t.textMuted);
    final line = Row(
      key: const Key('sync-line'),
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 14, color: color),
        const SizedBox(width: 4),
        Flexible(
          child: Text(
            text,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: color),
          ),
        ),
      ],
    );
    if (status.issues == 0) return line;
    return InkWell(
      key: const Key('sync-line-retry'),
      onTap: () async {
        final store = ref.read(outboxStoreProvider);
        for (final i in ref.read(syncItemsProvider).value ?? const <OutboxItem>[]) {
          if (i.status == OutboxStatus.poison) await store.retry(i.id);
        }
      },
      child: Padding(padding: const EdgeInsets.symmetric(vertical: 6), child: line),
    );
  }
}

/// The trip name in the top bar. With more than one trip it is a button: a small arrow opens a list of your other
/// trips (in the Trips list order) and picking one opens it on the tab you are on (flag `enableTripSwitcher`).
class _TripTitle extends ConsumerWidget {
  const _TripTitle({required this.tripId, required this.tab});
  final String tripId;
  final String tab;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final tokens = context.tokens;
    final trip = ref.watch(tripProvider(tripId)).value;
    final switchOn = ref.watch(flagProvider(('enableTripSwitcher', tripId))).value ?? true;
    final now = ref.read(nowProvider)();
    final others = switchOn
        ? sortTripModels([
            for (final x in ref.watch(allTripsProvider).value ?? const <Trip>[])
              if (!x.archived) x,
          ], ref.watch(tripSortProvider))
        : const <Trip>[];
    final canSwitch = others.length > 1 && others.any((x) => x.id == tripId);
    final name = Text(
      trip?.name ?? '',
      maxLines: 1,
      overflow: TextOverflow.ellipsis,
      style: TextStyle(
        fontFamily: AppTypography.fontTitle,
        fontWeight: FontWeight.w800,
        fontSize: 22,
        letterSpacing: -0.5,
        color: tokens.textPrimary,
      ),
    );
    final title = Hero(
      tag: 'trip-title-$tripId',
      child: Material(type: MaterialType.transparency, child: name),
    );
    final actionsOn = ref.watch(flagProvider(('enableTripHeaderActions', tripId))).value ?? true;
    void openSwitcher() => AppSheet.show<void>(
      context: context,
      title: l10n.tripSwitchTitle,
      builder: (sheetCtx) => Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          for (final x in others)
            ListTile(
              key: Key('switch-to-${x.id}'),
              selected: x.id == tripId,
              leading: Icon(x.id == tripId ? Icons.check_circle_rounded : Icons.luggage_outlined),
              title: Text(x.name, maxLines: 1, overflow: TextOverflow.ellipsis),
              subtitle: Text(
                [
                  tripHeadline(sheetCtx, tripStatus(x.startDate, x.endDate, now)),
                  if (x.startDate.isNotEmpty) formatDateRange(x.startDate, x.endDate),
                ].where((e) => e.isNotEmpty).join(' · '),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
              onTap: () {
                unawaited(AppHaptics.selection());
                Navigator.of(sheetCtx).pop();
                if (x.id != tripId) context.go('/trip/${x.id}/$tab');
              },
            ),
        ],
      ),
    );

    if (actionsOn && trip != null) {
      final counts = _tripCounts(ref, tripId);
      final status = tripStatus(trip.startDate, trip.endDate, now);
      final dot = switch (status.phase) {
        TripPhase.active => tokens.colorSuccess,
        TripPhase.upcoming => tokens.primaryAccent,
        _ => tokens.textMuted,
      };
      final meta = [
        if (trip.startDate.isNotEmpty) formatDateRange(trip.startDate, trip.endDate),
        '${counts.$1} member${counts.$1 == 1 ? '' : 's'}',
        '${counts.$2} expense${counts.$2 == 1 ? '' : 's'}',
      ].join(' · ');
      return KeyedSubtree(
        key: const Key('trip-title'),
        child: Semantics(
          button: true,
          label: '${trip.name}. $meta. Trip actions',
          excludeSemantics: true,
          child: InkWell(
            key: const Key('trip-title-actions'),
            borderRadius: BorderRadius.circular(tokens.radiusMd),
            onTap: () => TripActionsSheet.show(context, tripId: tripId, onSwitch: canSwitch ? openSwitcher : null),
            child: ConstrainedBox(
              constraints: const BoxConstraints(minHeight: 48),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Flexible(
                        child: Hero(
                          tag: 'trip-title-$tripId',
                          child: Material(
                            type: MaterialType.transparency,
                            child: Text(
                              trip.name,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                fontFamily: AppTypography.fontTitle,
                                fontWeight: FontWeight.w800,
                                fontSize: 19,
                                height: 1.15,
                                letterSpacing: -0.3,
                                color: tokens.textPrimary,
                              ),
                            ),
                          ),
                        ),
                      ),
                      Icon(Icons.expand_more_rounded, size: 20, color: tokens.textSecondary),
                    ],
                  ),
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        key: const Key('trip-status-dot'),
                        width: 7,
                        height: 7,
                        decoration: BoxDecoration(color: dot, shape: BoxShape.circle),
                      ),
                      const SizedBox(width: 6),
                      Flexible(
                        child: Text(
                          meta,
                          key: const Key('trip-meta'),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(fontSize: 12, height: 1.2, color: tokens.textSecondary),
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
    if (!canSwitch) {
      return KeyedSubtree(key: const Key('trip-title'), child: title);
    }
    return KeyedSubtree(
      key: const Key('trip-title'),
      child: Semantics(
        button: true,
        label: '${trip?.name ?? ''}. ${l10n.tripSwitchTitle}',
        excludeSemantics: true,
        child: InkWell(
          key: const Key('trip-switcher'),
          borderRadius: BorderRadius.circular(tokens.radiusMd),
          onTap: openSwitcher,
          child: ConstrainedBox(
            constraints: const BoxConstraints(minHeight: 48),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Flexible(child: title),
                Icon(Icons.expand_more_rounded, color: tokens.textSecondary),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// The sync state as one icon in the top bar, shown only when something needs attention (offline, syncing,
/// stuck). When everything is saved it takes no room. A stuck sync retries on tap (flag `enableSyncLine`).
class _SyncAction extends ConsumerWidget {
  const _SyncAction({required this.tripId});
  final String tripId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (!(ref.watch(flagProvider(('enableSyncLine', tripId))).value ?? true)) return const SizedBox.shrink();
    final l10n = context.l10n;
    final t = context.tokens;
    final online = ref.watch(isOnlineProvider).value ?? true;
    final status = ref.watch(syncStatusProvider).value ?? const SyncStatus();
    final (String text, IconData icon, Color color)? state = status.issues > 0
        ? (l10n.syncLineIssue, Icons.sync_problem_rounded, t.colorDanger)
        : !online
        ? (
            status.pending > 0 ? l10n.syncLineOfflineWaiting(status.pending) : l10n.syncLineOffline,
            Icons.cloud_off_rounded,
            t.textSecondary,
          )
        : status.pending > 0
        ? (l10n.syncLineSyncing(status.pending), Icons.sync_rounded, t.textSecondary)
        : null;
    if (state == null) return const SizedBox.shrink();
    return IconButton(
      key: const Key('sync-action'),
      tooltip: state.$1,
      icon: Icon(state.$2, color: state.$3),
      onPressed: status.issues == 0
          ? null
          : () async {
              final store = ref.read(outboxStoreProvider);
              for (final i in ref.read(syncItemsProvider).value ?? const <OutboxItem>[]) {
                if (i.status == OutboxStatus.poison) await store.retry(i.id);
              }
            },
    );
  }
}
