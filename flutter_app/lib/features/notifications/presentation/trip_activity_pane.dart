import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/auth_state.dart';
import '../../../core/clock.dart';
import '../../../data/providers.dart';
import '../../../domain/logic/notification_actions.dart';
import '../../../domain/logic/notifications.dart';
import '../../../domain/logic/flag_defaults.g.dart';
import '../../../domain/logic/summary_features.dart';
import '../../../domain/logic/trip_activity_log.dart';
import '../../../domain/logic/trip_utilities.dart' show formatRelativeTime;
import '../../../domain/models/expense.dart';
import '../../../domain/models/member.dart';
import '../../../domain/models/notification_item.dart';
import '../../../shared/theme/app_icons.dart';
import '../../../shared/theme/app_tokens.dart';
import '../../../shared/widgets/confirm_dialog.dart';
import '../../../shared/widgets/empty_state.dart';
import '../../chat/application/chat_providers.dart';
import '../../expenses/application/expenses_providers.dart';
import '../application/activity_focus.dart';
import '../application/notification_providers.dart';
import 'notification_style.dart';
import '../../../l10n/l10n_ext.dart';
import '../../../shared/widgets/app_button.dart';

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
  bool _selectMode = false;
  final Set<String> _selectedIds = {};
  final Set<String> _dismissedLogIds = {};

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
    if (!n.read && !n.id.startsWith('log-')) await ref.read(notificationRepositoryProvider).setRead(n.id, true);
    final type = n.data?['type'] as String?;
    if (type == 'trip_deleted' || !mounted) return;
    final t = activityTargetOf(
      n,
      ref.read(tripExpensesProvider(widget.tripId)).value ?? const <Expense>[],
      ref.read(tripMessagesProvider(widget.tripId)).value ?? const [],
    );
    final base = '/trip/${widget.tripId}';
    if (t?.kind == 'bin') {
      unawaited(context.push('$base/recycle-bin'));
      return;
    }
    if (t != null) ref.read(activityFocusProvider.notifier).set(t);
    context.go('$base/${t == null ? notificationTabFor(type) : (t.kind == 'message' ? 'chat' : 'expenses')}');
  }

  Future<void> _confirm(NotificationItem n, Expense e) async {
    final userId = ref.read(authStateProvider).userId;
    if (userId == null) return;
    final messenger = ScaffoldMessenger.of(context);
    final l10n = context.l10n;
    try {
      await ref.read(expenseRepositoryProvider).confirmSettlement(e.id, userId: userId);
      await ref.read(notificationRepositoryProvider).setRead(n.id, true);
      messenger.showSnackBar(SnackBar(content: Text(l10n.notifPaymentConfirmed)));
    } catch (_) {
      messenger.showSnackBar(SnackBar(content: Text(l10n.notifConfirmFailed)));
    }
  }

  Future<void> _deleteAll(int count, Iterable<String> logIds) async {
    final userId = ref.read(authStateProvider).userId;
    if (userId == null) return;
    final ok = await ConfirmDialog.show(
      context: context,
      title: context.l10n.activityDeleteAllTitle,
      message: context.l10n.activityDeleteAllBody(count),
      confirmLabel: context.l10n.activityDeleteAllConfirm,
      isDestructive: true,
    );
    if (!ok) return;
    setState(() {
      _dismissedLogIds.addAll(logIds);
      _selectedIds.clear();
      _selectMode = false;
    });
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
    final logOn =
        ref.watch(flagProvider(('enableTripActivityLog', widget.tripId))).value ??
        (defaultFeatureFlags['enableTripActivityLog'] ?? false);
    final log = logOn
        ? buildTripActivityLog(
            tripId: widget.tripId,
            expenses: ref.watch(tripExpensesProvider(widget.tripId)).value ?? const <Expense>[],
            recycled: ref.watch(recycledExpensesProvider(widget.tripId)).value ?? const <Expense>[],
            messages: ref.watch(tripMessagesProvider(widget.tripId)).value ?? const [],
            members: ref.watch(tripMembersProvider(widget.tripId)).value ?? const <Member>[],
            notifications: all,
          )
        : const <NotificationItem>[];
    final unread = all.where((n) => !n.read).length;
    final only = ref.watch(activityOnlyProvider);
    final tripExpenses = ref.watch(tripExpensesProvider(widget.tripId)).value ?? const <Expense>[];
    final shown =
        [...all, ...log]
            .where((n) => !_dismissedLogIds.contains(n.id))
            .where((n) => matchesActivityFilter(n, _filter))
            .where((n) => only == null || activityTargetOf(n, tripExpenses, const [])?.id == only)
            .toList()
          ..sort((a, b) => b.createdAt.compareTo(a.createdAt));
    final now = ref.read(nowProvider)();
    final empty = _emptyText[_filter]!;
    final coach = ref.watch(flagProvider(('enableCoachEmptyStates', widget.tripId))).value ?? true;
    final allExpenses = ref.watch(allActiveExpensesProvider).value ?? const <Expense>[];
    final allMembers = ref.watch(allMembersProvider).value ?? const <Member>[];

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
          child: !_selectMode
              ? Row(
                  children: [
                    Expanded(
                      child: Text(
                        unread == 0 ? 'Activity' : 'Activity · $unread new',
                        style: Theme.of(context).textTheme.titleLarge,
                      ),
                    ),
                    if (shown.isNotEmpty)
                      IconButton(
                        key: const Key('activity-select-mode'),
                        tooltip: 'Select items',
                        onPressed: () => setState(() => _selectMode = true),
                        icon: const Icon(Icons.checklist_rounded),
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
                      onPressed: shown.isEmpty
                          ? null
                          : () => unawaited(
                              _deleteAll(shown.length, shown.where((n) => n.id.startsWith('log-')).map((n) => n.id)),
                            ),
                      icon: const Icon(AppIcons.delete),
                    ),
                  ],
                )
              : Row(
                  children: [
                    Expanded(
                      child: Text(
                        '${_selectedIds.length} of ${shown.length} selected',
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
                      ),
                    ),
                    TextButton(
                      key: const Key('activity-select-all'),
                      onPressed: () {
                        setState(() {
                          if (_selectedIds.length == shown.length) {
                            _selectedIds.clear();
                          } else {
                            _selectedIds.addAll(shown.map((n) => n.id));
                          }
                        });
                      },
                      child: Text(_selectedIds.length == shown.length ? 'Deselect all' : 'Select all'),
                    ),
                    IconButton(
                      key: const Key('activity-delete-selected'),
                      tooltip: 'Delete selected',
                      onPressed: _selectedIds.isEmpty
                          ? null
                          : () async {
                              final idsToDelete = Set<String>.from(_selectedIds);
                              final logIds = idsToDelete.where((id) => id.startsWith('log-')).toSet();
                              final realIds = idsToDelete.where((id) => !id.startsWith('log-')).toList();
                              setState(() {
                                _dismissedLogIds.addAll(logIds);
                                _selectedIds.clear();
                                _selectMode = false;
                              });
                              if (realIds.isNotEmpty) {
                                await repo.deleteBatch(realIds);
                              }
                            },
                      icon: Icon(AppIcons.delete, color: _selectedIds.isEmpty ? t.textMuted : t.dangerColor),
                    ),
                    IconButton(
                      key: const Key('activity-cancel-select'),
                      tooltip: 'Done',
                      onPressed: () => setState(() {
                        _selectedIds.clear();
                        _selectMode = false;
                      }),
                      icon: const Icon(Icons.close_rounded),
                    ),
                  ],
                ),
        ),
        if (only != null)
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Align(
              alignment: Alignment.centerLeft,
              child: InputChip(
                key: const Key('activity-only-chip'),
                label: const Text('Showing this item only'),
                onDeleted: () => ref.read(activityOnlyProvider.notifier).set(null),
              ),
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
                        final c = [...all, ...log].where((n) => matchesActivityFilter(n, f)).length;
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
              ? EmptyState(
                  icon: AppIcons.bell,
                  title: empty.$1,
                  subtitle: empty.$2,
                  // One clear next step: activity starts with the first expense.
                  action: _filter == ActivityFilter.all && coach
                      ? AppButton(
                          key: const Key('activity-empty-add'),
                          label: context.l10n.expAdd,
                          onPressed: () => context.push('/trip/${widget.tripId}/expenses/new'),
                        )
                      : null,
                )
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
                          selectMode: _selectMode,
                          selected: _selectedIds.contains(n.id),
                          onToggleSelect: () {
                            setState(() {
                              if (_selectedIds.contains(n.id)) {
                                _selectedIds.remove(n.id);
                              } else {
                                _selectedIds.add(n.id);
                              }
                            });
                          },
                          onTap: () => unawaited(_open(n)),
                          onDelete: () => unawaited(repo.delete(n.id)),
                          confirmable: n.data?['type'] == 'settlement_confirmation_requested'
                              ? settlementToConfirm(
                                  tripId: n.tripId,
                                  expenseTitle: n.data?['expenseTitle'] as String?,
                                  userId: userId,
                                  expenses: allExpenses,
                                  members: allMembers,
                                )
                              : null,
                          onConfirm: _confirm,
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
  const _ActivityRow({
    required this.item,
    required this.onTap,
    required this.onDelete,
    required this.onConfirm,
    this.confirmable,
    this.selectMode = false,
    this.selected = false,
    this.onToggleSelect,
    super.key,
  });

  final NotificationItem item;
  final Expense? confirmable;
  final Future<void> Function(NotificationItem, Expense) onConfirm;
  final VoidCallback onTap;
  final VoidCallback onDelete;
  final bool selectMode;
  final bool selected;
  final VoidCallback? onToggleSelect;

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
        direction: (selectMode || item.id.startsWith('log-')) ? DismissDirection.none : DismissDirection.endToStart,
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
            color: selected ? t.primaryAccent.withValues(alpha: 0.08) : t.bgSurface,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(20),
              side: BorderSide(
                color: selected ? t.primaryAccent : (item.read ? t.borderColor : meta.color.withValues(alpha: 0.6)),
                width: selected ? 1.5 : 1.0,
              ),
            ),
            clipBehavior: Clip.antiAlias,
            child: InkWell(
              onTap: selectMode ? onToggleSelect : onTap,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(12, 12, 14, 12),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (selectMode)
                      Padding(
                        padding: const EdgeInsets.only(right: 12, top: 9),
                        child: Container(
                          width: 22,
                          height: 22,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: selected ? t.primaryAccent : Colors.transparent,
                            border: Border.all(color: selected ? t.primaryAccent : t.borderColor, width: 2),
                          ),
                          child: selected ? const Icon(Icons.check, size: 14, color: Colors.white) : null,
                        ),
                      ),
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
                          if (confirmable != null)
                            Padding(
                              padding: const EdgeInsets.only(top: 8),
                              child: FilledButton.tonal(
                                key: Key('activity-confirm-${item.id}'),
                                style: FilledButton.styleFrom(minimumSize: const Size(0, 44)),
                                onPressed: () => unawaited(onConfirm(item, confirmable!)),
                                child: const Text('Confirm received'),
                              ),
                            ),
                          if (type == 'chat_message')
                            Padding(
                              padding: const EdgeInsets.only(top: 4),
                              child: TextButton(
                                key: Key('activity-reply-${item.id}'),
                                style: TextButton.styleFrom(minimumSize: const Size(0, 44), padding: EdgeInsets.zero),
                                onPressed: onTap,
                                child: const Text('Reply'),
                              ),
                            ),
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
