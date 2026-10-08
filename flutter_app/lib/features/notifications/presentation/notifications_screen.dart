import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/auth_state.dart';
import '../../../data/providers.dart';
import '../../../domain/logic/notifications.dart';
import '../../../domain/logic/trip_utilities.dart' show formatRelativeTime;
import '../../../domain/models/notification_item.dart';
import '../../../shared/theme/app_icons.dart';
import '../../../shared/theme/app_tokens.dart';
import '../../../shared/widgets/app_scaffold.dart';
import '../../../shared/widgets/confirm_dialog.dart';
import '../../../shared/widgets/empty_state.dart';
import '../../trips/application/trips_providers.dart';
import '../../trips/presentation/widgets/home_dock.dart';
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

  String? get _scope => _thisTrip ? widget.tripId : null;

  Future<void> _open(NotificationItem n) async {
    final repo = ref.read(notificationRepositoryProvider);
    if (!n.read) await repo.setRead(n.id, true);
    final type = n.data?['type'] as String?;
    final id = n.tripId;
    if (type == 'trip_deleted' || id == null || !mounted) return;
    final exists = (ref.read(tripsProvider).value ?? const []).any((t) => t.id == id);
    if (!exists) return;
    context.go('/trip/$id/${notificationTabFor(type)}');
  }

  Future<void> _clearAll() async {
    final ok = await ConfirmDialog.show(
      context: context,
      title: 'Clear notifications',
      message: _scope == null ? 'Clear all notifications?' : 'Clear all notifications for this trip?',
      confirmLabel: 'Clear',
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
    final all = ref.watch(notificationsProvider).value ?? const <NotificationItem>[];
    final groupingOn = ref.watch(flagProvider(('enableNotificationGrouping', null))).value ?? false;

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
                    ChoiceChip(
                      key: const Key('filter-this-trip'),
                      label: const Text('This trip'),
                      selected: _thisTrip,
                      onSelected: (_) => setState(() => _thisTrip = true),
                    ),
                    ChoiceChip(
                      key: const Key('filter-all-trips'),
                      label: const Text('All trips'),
                      selected: !_thisTrip,
                      onSelected: (_) => setState(() => _thisTrip = false),
                    ),
                  ],
                  if (groupingOn) ...[
                    ChoiceChip(
                      key: const Key('filter-kind-all'),
                      label: const Text('All'),
                      selected: !_moneyOnly,
                      onSelected: (_) => setState(() => _moneyOnly = false),
                    ),
                    ChoiceChip(
                      key: const Key('filter-kind-money'),
                      label: const Text('Money'),
                      selected: _moneyOnly,
                      onSelected: (_) => setState(() => _moneyOnly = true),
                    ),
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
                  : ListView.builder(
                      key: const Key('notifications-list'),
                      itemCount: groups.length,
                      itemBuilder: (context, i) {
                        final g = groups[i];
                        final lead = g.first;
                        final folded = g.length > 1 && !_expanded.contains(lead.id);
                        final rows = folded ? [lead] : g;
                        return Column(
                          children: [
                            for (final n in rows)
                              _Row(
                                key: ValueKey('notif-${n.id}'),
                                item: n,
                                tokens: tokens,
                                onTap: () => _open(n),
                                onToggleRead: () => repo.setRead(n.id, !n.read),
                                onDelete: () => repo.delete(n.id),
                              ),
                            if (g.length > 1)
                              TextButton(
                                key: Key('group-toggle-${lead.id}'),
                                onPressed: () =>
                                    setState(() => folded ? _expanded.add(lead.id) : _expanded.remove(lead.id)),
                                child: Text(folded ? 'Show ${g.length - 1} more' : 'Show less'),
                              ),
                          ],
                        );
                      },
                    ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Row extends StatelessWidget {
  const _Row({
    required this.item,
    required this.tokens,
    required this.onTap,
    required this.onToggleRead,
    required this.onDelete,
    super.key,
  });

  final NotificationItem item;
  final AppTokens tokens;
  final VoidCallback onTap;
  final VoidCallback onToggleRead;
  final VoidCallback onDelete;

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
        child: ListTile(
          onTap: onTap,
          leading: CircleAvatar(
            backgroundColor: meta.color.withValues(alpha: 0.15),
            child: Icon(meta.icon, size: 18, color: meta.color),
          ),
          title: Text(headline, style: TextStyle(fontWeight: item.read ? FontWeight.w500 : FontWeight.w800)),
          subtitle: Text(
            '${renderNotificationBody(item)}\n${formatRelativeTime(item.createdAt)}',
            maxLines: 3,
            overflow: TextOverflow.ellipsis,
          ),
          isThreeLine: true,
          trailing: IconButton(
            tooltip: item.read ? 'Mark as unread' : 'Mark as read',
            onPressed: onToggleRead,
            icon: Icon(item.read ? Icons.mark_email_unread_outlined : Icons.mark_email_read_outlined, size: 20),
          ),
        ),
      ),
    );
  }
}
