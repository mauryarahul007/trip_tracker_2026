import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/auth_state.dart';
import '../../../core/env/app_env.dart';
import '../../../core/clock.dart';
import '../../../core/errors/tab_error_boundary.dart';
import '../../../core/platform/haptics.dart';
import '../../../core/flags/compass_flags.dart';
import '../../../data/providers.dart';
import '../../expenses/presentation/widgets/add_expense_fab.dart' show startAddExpense;
import '../../../data/realtime/realtime_manager.dart';
import '../../../domain/logic/tab_trail.dart';
import '../../../domain/logic/trip_status.dart';
import '../../../domain/logic/trip_utilities.dart' show formatDateRange;
import '../../../domain/models/trip.dart';
import '../../../l10n/l10n_ext.dart';
import '../../../shared/theme/app_icons.dart';
import '../../../shared/theme/app_tokens.dart';
import '../../../shared/widgets/app_bottom_nav.dart';
import '../../../shared/widgets/app_scaffold.dart';
import '../../../shared/widgets/offline_banner.dart';
import '../../../shared/widgets/app_sheet.dart';
import '../../chat/application/chat_providers.dart';
import '../../expenses/application/expenses_providers.dart';
import '../../expenses/presentation/widgets/settle_nudge_banner.dart';
import '../../travel/maps/deferred_trip_map_hero.dart';
import 'widgets/trip_content_sheet.dart';
import 'widgets/trip_dashboard_header.dart';
import '../../travel/presentation/live_location_share_modal.dart';
import '../../trips/presentation/widgets/share_trip_sheet.dart';
import 'widgets/edit_trip_sheet.dart';
import 'widgets/trip_header_actions.dart';
import 'widgets/trip_actions_sheet.dart';
import '../../trips/presentation/widgets/trip_card.dart' show tripHeadline;
import '../../expenses/application/money_providers.dart' show allTripsProvider;
import '../../trips/application/trips_providers.dart';
import '../application/trip_nav.dart';
import 'widgets/compass_balances_rail.dart';
import '../domain/trip_tabs.dart';
import '../../../core/platform/motion.dart';

/// Branch order == [TripNavTab] order (chat, expenses, ledger, members, notes).
String tripTabLabel(BuildContext context, TripNavTab tab) {
  final l10n = context.l10n;
  return switch (tab) {
    TripNavTab.chat => l10n.navChat,
    TripNavTab.expenses => l10n.navExpenses,
    TripNavTab.ledger => l10n.navSummary,
    TripNavTab.members => l10n.navMembers,
    TripNavTab.notes => l10n.navNotes,
    TripNavTab.hub => 'Trip',
    TripNavTab.activity => 'Activity',
  };
}

/// Compass dock wording (flag `enableCompassNav`): the money tabs are named for what you do there.
String compassTabLabel(BuildContext context, TripNavTab tab) => switch (tab) {
  TripNavTab.expenses => 'Spend',
  TripNavTab.ledger => 'Balances',
  _ => tripTabLabel(context, tab),
};

/// Calm Passport dock wording (flag `enableCalmPassportUi`).
String calmTabLabel(BuildContext context, TripNavTab tab) => switch (tab) {
  TripNavTab.expenses => 'Spend',
  TripNavTab.ledger => 'Balances',
  TripNavTab.activity => 'Activity',
  TripNavTab.notes => 'Plans',
  TripNavTab.hub => 'Hub',
  _ => tripTabLabel(context, tab),
};

IconData calmTabIcon(TripNavTab tab) => switch (tab) {
  TripNavTab.expenses => Icons.receipt_long_outlined,
  TripNavTab.ledger => Icons.swap_horiz_rounded,
  TripNavTab.activity => Icons.notifications_none_rounded,
  TripNavTab.chat => Icons.chat_bubble_outline_rounded,
  TripNavTab.notes => Icons.confirmation_number_outlined,
  TripNavTab.hub => Icons.grid_view_rounded,
  _ => tripTabIcon(tab),
};

IconData tripTabIcon(TripNavTab tab) => switch (tab) {
  TripNavTab.chat => AppIcons.chat,
  TripNavTab.expenses => AppIcons.expenses,
  TripNavTab.ledger => Icons.space_dashboard_rounded,
  TripNavTab.members => AppIcons.members,
  TripNavTab.notes => AppIcons.notes,
  TripNavTab.hub => Icons.explore_outlined,
  TripNavTab.activity => Icons.notifications_none_rounded,
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

  RealtimeManager? _realtime;
  final _sheetKey = GlobalKey<TripContentSheetState>();
  final _sheetProgressNotifier = ValueNotifier<double>(0.0);

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
    _sheetProgressNotifier.dispose();
    unawaited(_realtime?.closeTrip());
    tripShellClosed.add(null);
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
        ref.read(tripMapOpenProvider(widget.tripId).notifier).toggle();
        _sheetKey.currentState?.toggle();
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
    if (_sheetProgressNotifier.value > 0.8) {
      _sheetKey.currentState?.collapseToPeek();
      return;
    }
    final popped = popTab(_trail);
    if (popped.tab != null) {
      _trail = popped.trail;
      _current = popped.tab!;
      widget.navigationShell.goBranch(popped.tab!);
    } else {
      _leave();
    }
  }

  void _openTripActions() {
    final l10n = context.l10n;
    final switchOn = ref.watch(flagProvider(('enableTripSwitcher', widget.tripId))).value ?? true;
    final now = ref.read(nowProvider)();
    final others = switchOn
        ? sortTripModels([
            for (final x in ref.watch(allTripsProvider).value ?? const <Trip>[])
              if (!x.archived) x,
          ], ref.watch(tripSortProvider))
        : const <Trip>[];

    TripActionsSheet.show(
      context,
      tripId: widget.tripId,
      onSwitch: others.length > 1
          ? () {
              AppSheet.show<void>(
                context: context,
                title: l10n.tripSwitchTitle,
                builder: (sheetCtx) => Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    for (final x in others)
                      ListTile(
                        key: Key('switch-to-${x.id}'),
                        selected: x.id == widget.tripId,
                        leading: Icon(x.id == widget.tripId ? Icons.check_circle_rounded : Icons.luggage_outlined),
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
                          if (x.id != widget.tripId) openTripFresh(context, x.id, name: x.name);
                        },
                      ),
                  ],
                ),
              );
            }
          : null,
    );
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
    final calm = ref.watch(compassFlagProvider((calmPassportFlag, widget.tripId)));
    final compass = !calm && ref.watch(compassFlagProvider((compassNavFlag, widget.tripId)));
    ref.listen(tripMapOpenProvider(widget.tripId), (_, open) {
      if (open) {
        _sheetKey.currentState?.collapseToPeek();
      } else {
        _sheetKey.currentState?.expandFull();
      }
    });
    final dial = ref.watch(flagProvider(('enableQuickAddSpeedDial', widget.tripId))).value ?? true;
    final dock = ref.watch(dockTabsProvider(widget.tripId));
    final dockActive = dock.indexOf(
      calm
          ? calmDockTabFor(currentTab)
          : compass
          ? compassDockTabFor(currentTab)
          : currentTab,
    );
    // Compass web: a third pane with Settle up beside the expense table on very wide windows.
    final compassWebRail =
        ref.watch(compassFlagProvider((compassWebFlag, widget.tripId))) && MediaQuery.sizeOf(context).width >= 1280;
    final navItems = [
      for (final t in dock)
        AppNavItem(
          icon: calm ? calmTabIcon(t) : tripTabIcon(t),
          label: calm
              ? calmTabLabel(context, t)
              : compass
              ? compassTabLabel(context, t)
              : tripTabLabel(context, t),
          badge: t == TripNavTab.chat && ref.watch(chatUnreadProvider(widget.tripId)),
          badgeKey: const Key('chat-tab-unread'),
        ),
    ];

    final headerActions = tripHeaderActions(
      context,
      ref,
      tripId: widget.tripId,
      variant: compass || calm
          ? TripHeaderVariant.compass
          : cleanBar
          ? TripHeaderVariant.clean
          : TripHeaderVariant.legacy,
      onMenu: _onMenu,
    );

    final screenHeight = MediaQuery.sizeOf(context).height;
    final backdropHeight = screenHeight * 0.55;

    final dashboardStack = Stack(
      fit: StackFit.expand,
      children: [
        // 0. Continuous Backdrop Photo / Map Hero in upper 55% of viewport
        if (trip != null)
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            height: backdropHeight,
            child: DeferredTripMapHero(
              trip: trip,
              height: backdropHeight,
            ),
          ),

        // 1. Draggable Content Sheet (snaps 50% peek <-> 100% full screen)
        Positioned.fill(
          child: TripContentSheet(
            key: _sheetKey,
            progressNotifier: _sheetProgressNotifier,
            headerHeight: 52.0,
            collapsedFraction: 0.50,
            child: Column(
              children: [
                const OfflineBanner(),
                SettleNudgeBanner(tripId: widget.tripId),
                Expanded(child: widget.body),
              ],
            ),
          ),
        ),

        // 2. Floating Squeezable Header
        Positioned(
          top: 0,
          left: 0,
          right: 0,
          child: TripDashboardHeader(
            trip: trip,
            progressNotifier: _sheetProgressNotifier,
            onBack: _onBack,
            actions: headerActions,
            tab: currentTab.name,
            onTitleTap: _openTripActions,
          ),
        ),
      ],
    );

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) _onBack();
      },
      child: AppScaffold(
        maxContentWidth: null,
        safeTop: false,
        body: Row(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (wide)
              AppSideNav(
                items: navItems,
                currentIndex: dockActive < 0 ? 0 : dockActive,
                onTap: (i) => _goTab(dock[i].index),
                extended: MediaQuery.sizeOf(context).width >= kSideNavExtendedBreakpoint,
              ),
            Expanded(
              child: Align(
                alignment: Alignment.topCenter,
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 1040),
                  child: dashboardStack,
                ),
              ),
            ),
            if (compassWebRail && currentTab == TripNavTab.expenses) CompassBalancesRail(tripId: widget.tripId),
          ],
        ),
        // Calm Passport: one floating Add expense button over the content, Balances and Spend only —
        // other tabs have their own primary action (Add person on Members, Plans' own add per pane).
        floatingActionButton: calm && (currentTab == TripNavTab.ledger || currentTab == TripNavTab.expenses)
            ? CalmAddButton(
                label: l10n.expAdd,
                onTap: () => unawaited(startAddExpense(context, ref, widget.tripId, dial: dial)),
              )
            : null,
        bottomNavigationBar: dock.length < 2 || wide
            ? null
            : AppBottomNav(
                compass: compass,
                currentIndex: dockActive < 0 ? 0 : dockActive,
                onTap: (i) => _goTab(dock[i].index),
                items: navItems,
                centerAction: compass
                    ? () => unawaited(startAddExpense(context, ref, widget.tripId, dial: dial))
                    : null,
                centerLabel: l10n.expAdd,
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
          .animateToPage(target, duration: AppMotion.base, curve: Curves.easeOutCubic)
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
    // The tab list can change under us (flags finish loading, Compass nav is switched): keep the page on the
    // tab the router is showing instead of the same page number of the new list.
    ref.listen(visibleTabsProvider(widget.tripId), (_, _) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        final c = _controller;
        if (mounted && c != null && c.hasClients && (c.page ?? 0).round() != _page) c.jumpToPage(_page);
      });
    });
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
      children: [for (final t in tabs) _KeepAlive(child: TabErrorBoundary(child: widget.branches[t.index]))],
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