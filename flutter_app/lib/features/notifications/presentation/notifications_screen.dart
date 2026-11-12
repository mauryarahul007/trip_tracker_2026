import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../app/auth_state.dart';
import '../../../data/providers.dart';
import '../../../domain/logic/flag_defaults.g.dart' show defaultFeatureFlags;
import '../../../domain/logic/notification_actions.dart';
import '../../../domain/logic/notifications.dart';
import '../../../domain/logic/summary_features.dart';
import '../../../core/clock.dart';
import '../../../domain/logic/trip_utilities.dart' show formatRelativeTime;
import '../../../domain/models/expense.dart';
import '../../../domain/models/member.dart';
import '../../../domain/models/notification_item.dart';
import '../../../l10n/l10n_ext.dart';
import '../../../shared/theme/app_icons.dart';
import '../../../shared/theme/app_tokens.dart';
import '../../../shared/widgets/app_scaffold.dart';
import '../../../shared/widgets/confirm_dialog.dart';
import '../../../shared/widgets/empty_state.dart';
import '../../expenses/application/expenses_providers.dart';
import '../../trips/application/trips_providers.dart';
import '../../trips/presentation/widgets/home_dock.dart';
import '../../trip_details/application/trip_nav.dart' show openTripFresh;
import '../application/delete_with_undo.dart';
import '../application/notification_providers.dart';
import 'notification_style.dart';

/// Notifications list. [tripId] scopes the first view to one trip ("This trip" vs "All trips").
class NotificationsScreen extends ConsumerStatefulWidget {
  const NotificationsScreen({this.tripId, super.key});

  final String? tripId;

  @override
  ConsumerState<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends ConsumerState<NotificationsScreen> {
  late bool _thisTrip = widget.tripId != null;
  bool _moneyOnly = false;
  final _expanded = <String>{};
  final _pendingDelete = <String>{}; // rows swiped away that are still inside their Undo window

  String? get _scope => _thisTrip ? widget.tripId : null;

  Future<void> _open(NotificationItem n) async {
    final repo = ref.read(notificationRepositoryProvider);
    if (!n.read) await repo.setRead(n.id, true);
    final type = n.data?['type'] as String?;
    final id = n.tripId;
    if (type == 'trip_deleted' || id == null || !mounted) return;
    final exists = (ref.read(tripsProvider).value ?? const []).any((t) => t.id == id);
    if (!exists) return;
    final target = '/trip/$id/${notificationTabFor(type)}';
    // A second trip shell on top of an open one breaks the trip page, so with a trip already open we switch to the
    // row's trip in place (back then leaves to the page before it). With none open (Activity tab, banner on Trips)
    // the trip is pushed, so back returns to this list.
    final open = _openTripId(context);
    if (open == null) {
      unawaited(context.push(target));
    } else if (open == id) {
      context.go(target); // same trip: just change tab, back walks the tab trail
    } else {
      openTripFresh(context, id, tab: notificationTabFor(type)); // another trip: leave this one completely
    }
  }

  /// The id of the trip screen somewhere in the navigation stack, or null when none is open.
  static String? _openTripId(BuildContext context) {
    String? found;
    void visit(RouteMatchBase m) {
      final hit = RegExp(r'^/trip/([^/]+)').firstMatch(m.matchedLocation);
      if (hit != null) found ??= hit.group(1);
      if (m is ShellRouteMatch) m.matches.forEach(visit);
      if (m is ImperativeRouteMatch) m.matches.matches.forEach(visit);
    }

    GoRouter.of(context).routerDelegate.currentConfiguration.matches.forEach(visit);
    return found;
  }

  Future<void> _confirm(NotificationItem n, Expense e) async {
    final userId = ref.read(authStateProvider).userId;
    if (userId == null) return;
    final messenger = ScaffoldMessenger.of(context);
    final l10n = context.l10n;
    try {
      await ref.read(expenseRepositoryProvider).confirmSettlement(e.id, userId: userId);
      await ref.read(notificationRepositoryProvider).setRead(n.id, true);
      messenger.showSnackBar(SnackBar(content: Text(l10n.notifConfirmed)));
    } catch (_) {
      messenger.showSnackBar(SnackBar(content: Text(l10n.notifConfirmFailed)));
    }
  }

  Future<void> _clearAll() async {
    final ok = await ConfirmDialog.show(
      context: context,
      title: context.l10n.notifClearTitle,
      message: _scope == null ? context.l10n.notifClearAllBody : context.l10n.notifClearTripBody,
      confirmLabel: context.l10n.notifClearConfirm,
      isDestructive: true,
    );
    final userId = ref.read(authStateProvider).userId;
    if (!ok || userId == null) return;
    await ref.read(notificationRepositoryProvider).deleteAll(userId, tripId: _scope);
  }

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final repo = ref.watch(notificationRepositoryProvider);
    final userId = ref.watch(authStateProvider.select((a) => a.userId));
    final all = [
      for (final n in ref.watch(notificationsProvider).value ?? const <NotificationItem>[])
        if (!_pendingDelete.contains(n.id)) n,
    ];
    final groupingOn = ref.watch(flagProvider(('enableNotificationGrouping', null))).value ?? false;
    final polish =
        ref.watch(flagProvider(('enableNotificationInboxPolish', null))).value ??
        defaultFeatureFlags['enableNotificationInboxPolish'] ??
        true;
    Widget chip(Key key, String label, bool selected, VoidCallback onTap) => polish
        ? _QuietChip(key: key, label: label, selected: selected, onTap: onTap)
        : ChoiceChip(key: key, label: Text(label), selected: selected, onSelected: (_) => onTap());
    final dayGroups = ref.watch(flagProvider(('enableNotificationDayGroups', null))).value ?? true;
    final nowDt = ref.read(nowProvider)();
    final actionsOn =
        (ref.watch(flagProvider(('enableNotificationActions', null))).value ?? true) &&
        (ref.watch(flagProvider(('enableSettlementConfirmation', null))).value ?? false);
    final allExpenses = actionsOn
        ? (ref.watch(allActiveExpensesProvider).value ?? const <Expense>[])
        : const <Expense>[];
    final allMembers = actionsOn ? (ref.watch(allMembersProvider).value ?? const <Member>[]) : const <Member>[];
    String? dayLabel(NotificationItem n) {
      final b = dayBucket(n.createdAt, nowDt);
      return switch (b.bucket) {
        DayBucket.today => context.l10n.notifToday,
        DayBucket.yesterday => context.l10n.notifYesterday,
        DayBucket.older => b.day == null ? context.l10n.notifEarlier : DateFormat.MMMd().format(b.day!),
      };
    }

    final scoped = _scope == null ? all : all.where((n) => n.tripId == _scope).toList();
    final shown = groupingOn && _moneyOnly ? scoped.where((n) => isMoneyNotification(n.toJson())).toList() : scoped;
    final unread = scoped.where((n) => !n.read).length;
    final byId = {for (final n in shown) n.id: n};
    final groups = groupingOn
        ? groupNotificationBursts([for (final n in shown) n.toJson()])
              .map((g) => [for (final m in g) byId[m['id']]!])
              .toList()
        : [
            for (final n in shown) [n],
          ];

    return wrapHomeBody(
      context,
      ref,
      HomeTab.activity,
      enabled: widget.tripId == null, // the per-trip list is a pushed screen: no rail, normal back
      AppScaffold(
        // Per-trip view (opened from inside a trip) keeps its back arrow and no dock.
        bottomNavigationBar: widget.tripId == null ? buildHomeDock(context, ref, HomeTab.activity) : null,
        appBar: AppBar(
          title: const Text('Notifications'),
          actions: [
            IconButton(
              key: const Key('notifications-mark-all'),
              tooltip: 'Mark all as read',
              onPressed: unread == 0 || userId == null ? null : () => repo.markAllRead(userId, tripId: _scope),
              icon: const Icon(Icons.done_all_rounded),
            ),
            IconButton(
              key: const Key('notifications-clear'),
              tooltip: 'Clear notifications',
              onPressed: scoped.isEmpty ? null : _clearAll,
              icon: const Icon(AppIcons.delete),
            ),
          ],
        ),
        body: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
              child: Wrap(
                spacing: 8,
                children: [
                  if (widget.tripId != null) ...[
                    chip(const Key('filter-this-trip'), 'This trip', _thisTrip, () => setState(() => _thisTrip = true)),
                    chip(const Key('filter-all-trips'), 'All trips', !_thisTrip, () => setState(() => _thisTrip = false)),
                  ],
                  if (groupingOn) ...[
                    chip(const Key('filter-kind-all'), 'All', !_moneyOnly, () => setState(() => _moneyOnly = false)),
                    chip(const Key('filter-kind-money'), 'Money', _moneyOnly, () => setState(() => _moneyOnly = true)),
                  ],
                ],
              ),
            ),
            Expanded(
              child: groups.isEmpty
                  ? EmptyState(
                      icon: AppIcons.bell,
                      title: groupingOn && _moneyOnly && scoped.isNotEmpty ? 'No money updates' : 'No notifications',
                      subtitle: groupingOn && _moneyOnly && scoped.isNotEmpty
                          ? 'Switch back to All to see everything.'
                          : 'Updates from your trips will show up here.',
                    )
                  : _NotificationsScroll(
                      groups: groups,
                      dayGroups: dayGroups,
                      dayLabel: dayLabel,
                      dense: dayGroups,
                      polish: polish,
                      expanded: _expanded,
                      onToggleGroup: (id, fold) => setState(() => fold ? _expanded.add(id) : _expanded.remove(id)),
                      tokens: tokens,
                      actionsOn: actionsOn,
                      userId: userId,
                      allExpenses: allExpenses,
                      allMembers: allMembers,
                      onConfirm: _confirm,
                      onOpen: _open,
                      onToggleRead: (n) => repo.setRead(n.id, !n.read),
                      onDelete: (n) => deleteNotificationWithUndo(
                        context,
                        repo: repo,
                        id: n.id,
                        undoOn: ref.read(flagProvider(('enableExtendedUndo', widget.tripId))).value ?? true,
                        hide: () => setState(() => _pendingDelete.add(n.id)),
                        show: () => setState(() => _pendingDelete.remove(n.id)),
                      ),
                    ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Sticky day sections + denser rows when `enableNotificationDayGroups` is on.
class _NotificationsScroll extends StatelessWidget {
  const _NotificationsScroll({
    required this.groups,
    required this.dayGroups,
    required this.dayLabel,
    required this.dense,
    required this.polish,
    required this.expanded,
    required this.onToggleGroup,
    required this.tokens,
    required this.actionsOn,
    required this.userId,
    required this.allExpenses,
    required this.allMembers,
    required this.onConfirm,
    required this.onOpen,
    required this.onToggleRead,
    required this.onDelete,
  });

  final List<List<NotificationItem>> groups;
  final bool dayGroups;
  final String? Function(NotificationItem) dayLabel;
  final bool dense;
  final bool polish;
  final Set<String> expanded;
  final void Function(String id, bool foldOpen) onToggleGroup;
  final AppTokens tokens;
  final bool actionsOn;
  final String? userId;
  final List<Expense> allExpenses;
  final List<Member> allMembers;
  final void Function(NotificationItem, Expense) onConfirm;
  final void Function(NotificationItem) onOpen;
  final void Function(NotificationItem) onToggleRead;
  final void Function(NotificationItem) onDelete;

  @override
  Widget build(BuildContext context) {
    final slivers = <Widget>[];
    String? lastLabel;
    for (final g in groups) {
      final lead = g.first;
      final label = dayGroups ? dayLabel(lead) : null;
      if (label != null && label != lastLabel) {
        lastLabel = label;
        slivers.add(
          SliverPersistentHeader(
            pinned: true,
            delegate: _DayStickyHeader(
              label: label,
              background: tokens.bgPage,
              foreground: tokens.textMuted,
            ),
          ),
        );
      }
      final folded = g.length > 1 && !expanded.contains(lead.id);
      final rows = folded ? [lead] : g;
      slivers.add(
        SliverList(
          delegate: SliverChildBuilderDelegate(
            (context, i) {
              if (i < rows.length) {
                final n = rows[i];
                return _Row(
                  key: ValueKey('notif-${n.id}'),
                  item: n,
                  tokens: tokens,
                  dense: dense,
                  polish: polish,
                  confirmable: actionsOn && n.data?['type'] == 'settlement_confirmation_requested'
                      ? settlementToConfirm(
                          tripId: n.tripId,
                          expenseTitle: n.data?['expenseTitle'] as String?,
                          userId: userId,
                          expenses: allExpenses,
                          members: allMembers,
                        )
                      : null,
                  onConfirm: (e) => onConfirm(n, e),
                  onTap: () => onOpen(n),
                  onToggleRead: () => onToggleRead(n),
                  onDelete: () => onDelete(n),
                );
              }
              return TextButton(
                key: Key('group-toggle-${lead.id}'),
                onPressed: () => onToggleGroup(lead.id, folded),
                child: Text(folded ? 'Show ${g.length - 1} more' : 'Show less'),
              );
            },
            childCount: rows.length + (g.length > 1 ? 1 : 0),
          ),
        ),
      );
    }
    return CustomScrollView(key: const Key('notifications-list'), slivers: slivers);
  }
}

class _DayStickyHeader extends SliverPersistentHeaderDelegate {
  _DayStickyHeader({required this.label, required this.background, required this.foreground});

  final String label;
  final Color background;
  final Color foreground;

  @override
  double get minExtent => 28;
  @override
  double get maxExtent => 28;

  @override
  Widget build(BuildContext context, double shrinkOffset, bool overlapsContent) {
    return Material(
      color: background,
      child: Align(
        key: Key('notif-day-$label'),
        alignment: Alignment.centerLeft,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 6, 16, 2),
          child: Text(
            label.toUpperCase(),
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w800,
              letterSpacing: 0.6,
              color: foreground,
            ),
          ),
        ),
      ),
    );
  }

  @override
  bool shouldRebuild(covariant _DayStickyHeader old) =>
      old.label != label || old.background != background || old.foreground != foreground;
}

class _Row extends StatelessWidget {
  const _Row({
    required this.item,
    required this.tokens,
    required this.onTap,
    required this.onToggleRead,
    required this.onDelete,
    required this.confirmable,
    required this.onConfirm,
    this.dense = false,
    this.polish = false,
    super.key,
  });

  /// Custom row (unread pip, type icon tile, quiet read toggle) instead of the stock ListTile
  /// (flag `enableNotificationInboxPolish`).
  final bool polish;

  /// The settlement this notification asks you to confirm (null: no button).
  final Expense? confirmable;
  final void Function(Expense) onConfirm;
  final NotificationItem item;
  final AppTokens tokens;
  final VoidCallback onTap;
  final VoidCallback onToggleRead;
  final VoidCallback onDelete;
  final bool dense;

  @override
  Widget build(BuildContext context) {
    final type = item.data?['type'] as String?;
    final meta = notificationMeta(type);
    final headline = getNotificationHeadline(type);
    return Dismissible(
      key: ValueKey('dismiss-${item.id}'),
      direction: DismissDirection.endToStart,
      background: Container(
        color: tokens.dangerColor,
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: 20),
        child: const Icon(AppIcons.delete, color: Colors.white),
      ),
      onDismissed: (_) => onDelete(),
      child: Semantics(
        label: '${item.read ? 'Read' : 'Unread'} notification: $headline',
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (polish)
              _PolishedBody(
                item: item,
                meta: meta,
                headline: headline,
                tokens: tokens,
                onTap: onTap,
                onToggleRead: onToggleRead,
              )
            else
            ListTile(
              dense: dense,
              visualDensity: dense ? VisualDensity.compact : VisualDensity.standard,
              contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: dense ? 0 : 4),
              onTap: onTap,
              leading: CircleAvatar(
                radius: dense ? 16 : 20,
                backgroundColor: meta.color.withValues(alpha: 0.15),
                child: Icon(meta.icon, size: dense ? 16 : 18, color: meta.color),
              ),
              title: Text(headline, style: TextStyle(fontWeight: item.read ? FontWeight.w500 : FontWeight.w800)),
              subtitle: Text(
                dense
                    ? '${renderNotificationBody(item)} · ${formatRelativeTime(item.createdAt)}'
                    : '${renderNotificationBody(item)}\n${formatRelativeTime(item.createdAt)}',
                maxLines: dense ? 2 : 3,
                overflow: TextOverflow.ellipsis,
              ),
              isThreeLine: !dense,
              trailing: IconButton(
                tooltip: item.read ? 'Mark as unread' : 'Mark as read',
                onPressed: onToggleRead,
                icon: Icon(item.read ? Icons.mark_email_unread_outlined : Icons.mark_email_read_outlined, size: 20),
              ),
            ),
            if (confirmable != null)
              Padding(
                padding: EdgeInsets.fromLTRB(polish ? 62 : (dense ? 56 : 72), 0, 16, dense ? 4 : 8),
                child: Align(
                  alignment: Alignment.centerLeft,
                  child: FilledButton.tonal(
                    key: Key('notif-confirm-${item.id}'),
                    onPressed: () => onConfirm(confirmable!),
                    child: Text(context.l10n.notifConfirm),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

/// Quiet filter chip: text only, a soft tint when selected, no outline (flag enableNotificationInboxPolish).
class _QuietChip extends StatelessWidget {
  const _QuietChip({required this.label, required this.selected, required this.onTap, super.key});

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final t = context.tokens;
    return Semantics(
      button: true,
      selected: selected,
      child: InkWell(
        borderRadius: BorderRadius.circular(99),
        onTap: onTap,
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: 48, minWidth: 48),
          child: Container(
            alignment: Alignment.center,
            padding: const EdgeInsets.symmetric(horizontal: 12),
            decoration: BoxDecoration(
              color: selected ? t.primaryAccent.withValues(alpha: 0.12) : Colors.transparent,
              borderRadius: BorderRadius.circular(99),
            ),
            child: Text(
              label,
              style: TextStyle(
                fontSize: 13,
                fontWeight: selected ? FontWeight.w800 : FontWeight.w600,
                color: selected ? t.textPrimary : t.textMuted,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Inbox row: unread pip, type icon tile, headline + body + time, quiet read toggle.
class _PolishedBody extends StatelessWidget {
  const _PolishedBody({
    required this.item,
    required this.meta,
    required this.headline,
    required this.tokens,
    required this.onTap,
    required this.onToggleRead,
  });

  final NotificationItem item;
  final ({IconData icon, Color color}) meta;
  final String headline;
  final AppTokens tokens;
  final VoidCallback onTap;
  final VoidCallback onToggleRead;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(8, 10, 4, 10),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SizedBox(
              width: 14,
              height: 36,
              child: Center(
                child: item.read
                    ? null
                    : Container(
                        key: Key('notif-pip-${item.id}'),
                        width: 8,
                        height: 8,
                        decoration: BoxDecoration(color: tokens.primaryAccent, shape: BoxShape.circle),
                      ),
              ),
            ),
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: meta.color.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(meta.icon, size: 18, color: meta.color),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    headline,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 14.5,
                      fontWeight: item.read ? FontWeight.w500 : FontWeight.w800,
                      color: tokens.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    renderNotificationBody(item),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(fontSize: 13, height: 1.3, color: tokens.textSecondary),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    formatRelativeTime(item.createdAt),
                    style: TextStyle(fontSize: 11.5, color: tokens.textMuted),
                  ),
                ],
              ),
            ),
            IconButton(
              tooltip: item.read ? 'Mark as unread' : 'Mark as read',
              visualDensity: VisualDensity.compact,
              onPressed: onToggleRead,
              icon: Icon(
                item.read ? Icons.mark_email_unread_outlined : Icons.mark_email_read_outlined,
                size: 20,
                color: tokens.textMuted,
              ),
            ),
          ],
        ),
      ),
    );
  }
}