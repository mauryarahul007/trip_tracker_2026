import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/auth_state.dart';
import '../../../core/clock.dart';
import '../../../domain/logic/notifications.dart';
import '../../../domain/logic/summary_features.dart';
import '../../../domain/logic/trip_utilities.dart' show formatRelativeTime;
import '../../../domain/models/notification_item.dart';
import '../../../shared/theme/app_icons.dart';
import '../../../shared/theme/app_tokens.dart';
import '../../../shared/widgets/confirm_dialog.dart';
import '../../../shared/widgets/empty_state.dart';
import '../application/notification_providers.dart';
import 'notification_style.dart';

/// The Activity tab of a trip (Compass nav): this trip's updates only, with filter chips, mark all read and
/// Delete all. Money covers expenses and settlements, People joins, Chat messages.
class TripActivityPane extends ConsumerStatefulWidget {
  const TripActivityPane({required this.tripId, super.key});

  final String tripId;

  @override
  ConsumerState<TripActivityPane> createState() => _TripActivityPaneState();
}

class _TripActivityPaneState extends ConsumerState<TripActivityPane> {
  ActivityFilter _filter = ActivityFilter.all;

  static const _labels = {
    ActivityFilter.all: 'All',
    ActivityFilter.unread: 'Unread',
    ActivityFilter.money: 'Money',
    ActivityFilter.people: 'People',
    ActivityFilter.chat: 'Chat',
  };

  static const _emptyText = {
    ActivityFilter.all: ('No activity yet', 'Expenses, settlements, new travelers and messages show up here.'),
    ActivityFilter.unread: ('All caught up', 'You have read everything on this trip.'),
    ActivityFilter.money: ('No money updates yet', 'Added, edited and settled expenses show up here.'),
    ActivityFilter.people: ('No new travelers yet', 'When someone joins the trip, you will see it here.'),
    ActivityFilter.chat: ('No messages yet', 'New trip chat messages show up here.'),
  };

  Future<void> _open(NotificationItem n) async {
    if (!n.read) await ref.read(notificationRepositoryProvider).setRead(n.id, true);
    final type = n.data?['type'] as String?;
    if (type == 'trip_deleted' || !mounted) return;
    context.go('/trip/${widget.tripId}/${notificationTabFor(type)}');
  }

  Future<void> _deleteAll(int count) async {
    final userId = ref.read(authStateProvider).userId;
    if (userId == null) return;
    final ok = await ConfirmDialog.show(
      context: context,
      title: 'Delete all activity?',
      message:
          'This removes all $count update${count == 1 ? '' : 's'} for this trip from your list. Expenses and balances are not touched.',
      confirmLabel: 'Delete all',
      isDestructive: true,
    );
    if (!ok) return;
    await ref.read(notificationRepositoryProvider).deleteAll(userId, tripId: widget.tripId);
  }

  @override
  Widget build(BuildContext context) {
    final t = context.tokens;
    final repo = ref.watch(notificationRepositoryProvider);
    final userId = ref.watch(authStateProvider.select((a) => a.userId));
    final all = [
      for (final n in ref.watch(notificationsProvider).value ?? const <NotificationItem>[])
        if (n.tripId == widget.tripId) n,
    ];
    final unread = all.where((n) => !n.read).length;
    final shown = all.where((n) => matchesActivityFilter(n, _filter)).toList();
    final now = ref.read(nowProvider)();
    final empty = _emptyText[_filter]!;

    String dayLabel(NotificationItem n) {
      final b = dayBucket(n.createdAt, now);
      return switch (b.bucket) {
        DayBucket.today => 'Today',
        DayBucket.yesterday => 'Yesterday',
        DayBucket.older => b.day == null ? 'Earlier' : _fmtDay(b.day!),
      };
    }

    return Column(
      key: const Key('trip-activity'),
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 4, 8, 0),
          child: Row(
            children: [
              Expanded(
                child: Text(
                  unread == 0 ? 'Activity' : 'Activity · $unread new',
                  style: Theme.of(context).textTheme.titleLarge,
                ),
              ),
              IconButton(
                key: const Key('activity-mark-all'),
                tooltip: 'Mark all as read',
                onPressed: unread == 0 || userId == null
                    ? null
                    : () => unawaited(repo.markAllRead(userId, tripId: widget.tripId)),
                icon: const Icon(Icons.done_all_rounded),
              ),
              IconButton(
                key: const Key('activity-delete-all'),
                tooltip: 'Delete all activity',
                onPressed: all.isEmpty ? null : () => unawaited(_deleteAll(all.length)),
                icon: const Icon(AppIcons.delete),
              ),
            ],
          ),
        ),
        SizedBox(
          height: 52,
          child: SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
            child: Row(
              children: [
                for (final f in ActivityFilter.values)
                  Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: ChoiceChip(
                      key: Key('activity-filter-${f.name}'),
                      label: Text(() {
                        final c = all.where((n) => matchesActivityFilter(n, f)).length;
                        return f == ActivityFilter.all || c == 0 ? _labels[f]! : '${_labels[f]} $c';
                      }()),
                      selected: _filter == f,
                      onSelected: (_) => setState(() => _filter = f),
                    ),
                  ),
              ],
            ),
          ),
        ),
        Expanded(
          child: shown.isEmpty
              ? EmptyState(icon: AppIcons.bell, title: empty.$1, subtitle: empty.$2)
              : ListView.builder(
                  key: const Key('activity-list'),
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 120),
                  itemCount: shown.length,
                  itemBuilder: (context, i) {
                    final n = shown[i];
                    final label = dayLabel(n);
                    final first = i == 0 || dayLabel(shown[i - 1]) != label;
                    return Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        if (first)
                          Padding(
                            key: Key('activity-day-$label'),
                            padding: const EdgeInsets.fromLTRB(4, 14, 4, 6),
                            child: Text(
                              label,
                              style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: t.textPrimary),
                            ),
                          ),
                        _ActivityRow(
                          key: ValueKey('activity-${n.id}'),
                          item: n,
                          onTap: () => unawaited(_open(n)),
                          onDelete: () => unawaited(repo.delete(n.id)),
                        ),
                      ],
                    );
                  },
                ),
        ),
      ],
    );
  }
}

String _fmtDay(DateTime d) {
  const m = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return '${d.day} ${m[d.month - 1]}';
}

class _ActivityRow extends StatelessWidget {
  const _ActivityRow({required this.item, required this.onTap, required this.onDelete, super.key});

  final NotificationItem item;
  final VoidCallback onTap;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    final t = context.tokens;
    final type = item.data?['type'] as String?;
    final meta = notificationMeta(type);
    final headline = getNotificationHeadline(type);
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Dismissible(
        key: ValueKey('dismiss-${item.id}'),
        direction: DismissDirection.endToStart,
        onDismissed: (_) => onDelete(),
        background: Container(
          decoration: BoxDecoration(color: t.dangerColor, borderRadius: BorderRadius.circular(20)),
          alignment: Alignment.centerRight,
          padding: const EdgeInsets.only(right: 20),
          child: const Icon(AppIcons.delete, color: Colors.white),
        ),
        child: Semantics(
          label: '${item.read ? 'Read' : 'Unread'}: $headline',
          child: Material(
            color: t.bgSurface,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(20),
              side: BorderSide(color: item.read ? t.borderColor : meta.color.withValues(alpha: 0.6)),
            ),
            clipBehavior: Clip.antiAlias,
            child: InkWell(
              onTap: onTap,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(12, 12, 14, 12),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        color: meta.color.withValues(alpha: 0.14),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Icon(meta.icon, size: 20, color: meta.color),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            headline,
                            style: TextStyle(
                              fontSize: 15,
                              fontWeight: item.read ? FontWeight.w600 : FontWeight.w800,
                              color: t.textPrimary,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            renderNotificationBody(item),
                            maxLines: 3,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(fontSize: 13, color: t.textSecondary),
                          ),
                          const SizedBox(height: 4),
                          Text(formatRelativeTime(item.createdAt), style: TextStyle(fontSize: 12, color: t.textMuted)),
                        ],
                      ),
                    ),
                    if (!item.read)
                      Padding(
                        padding: const EdgeInsets.only(left: 8, top: 4),
                        child: Container(
                          key: const Key('activity-unread-dot'),
                          width: 8,
                          height: 8,
                          decoration: BoxDecoration(color: meta.color, shape: BoxShape.circle),
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
