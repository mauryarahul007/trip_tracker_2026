import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/auth_state.dart';
import '../../../core/format/money.dart';
import '../../../data/providers.dart';
import '../../../domain/logic/category_color.dart';
import '../../../domain/models/expense.dart';
import '../../../domain/logic/expense_list_logic.dart';
import '../../../l10n/l10n_ext.dart';
import '../../../shared/theme/app_icons.dart';
import '../../../shared/theme/app_tokens.dart';
import '../../../shared/widgets/app_button.dart';
import '../../../shared/widgets/app_surface.dart';
import '../../../shared/widgets/app_scaffold.dart';
import '../../../shared/widgets/confirm_dialog.dart';
import '../../../shared/widgets/empty_state.dart';
import '../../trip_details/application/trip_nav.dart';
import '../application/expenses_providers.dart';

/// How long a deleted expense stays restorable (server purges it after that).
const recycleBinWindow = Duration(hours: 24);

/// "Expires in 5h 12m" for a soft-deleted expense, or null when its delete time is unknown.
@visibleForTesting
String? recycleBinExpiryLabel(int? deletedAtMs, DateTime now) {
  if (deletedAtMs == null) return null;
  final left = DateTime.fromMillisecondsSinceEpoch(deletedAtMs).add(recycleBinWindow).difference(now);
  if (left.inMinutes < 1) return 'Expiring soon';
  if (left.inHours >= 1) {
    final m = left.inMinutes % 60;
    return m == 0 ? 'Expires in ${left.inHours}h' : 'Expires in ${left.inHours}h ${m}m';
  }
  return 'Expires in ${left.inMinutes}m';
}

/// Deleted expenses, restorable for 24 h (server purges them after that).
class RecycleBinScreen extends ConsumerStatefulWidget {
  const RecycleBinScreen({required this.tripId, super.key});
  final String tripId;

  @override
  ConsumerState<RecycleBinScreen> createState() => _RecycleBinScreenState();
}

class _RecycleBinScreenState extends ConsumerState<RecycleBinScreen> {
  /// Rows restored by swipe: a dismissed Dismissible must leave the tree at once, before the stream catches up.
  final _restoring = <String>{};

  String get tripId => widget.tripId;

  Future<void> _restore(Expense e) async {
    final repo = ref.read(expenseRepositoryProvider);
    final messenger = ScaffoldMessenger.of(context);
    final l10n = context.l10n;
    setState(() => _restoring.add(e.id));
    try {
      await repo.restore(e.id);
    } catch (_) {
      if (mounted) setState(() => _restoring.remove(e.id));
      return;
    }
    messenger.hideCurrentSnackBar();
    messenger.showSnackBar(SnackBar(content: Text(l10n.binRestored(e.title))));
  }

  Future<void> _deleteForever(Expense e) async {
    final l10n = context.l10n;
    final repo = ref.read(expenseRepositoryProvider);
    final ok = await ConfirmDialog.show(
      context: context,
      title: l10n.binDeleteForever,
      message: l10n.binDeleteConfirm(e.title),
      confirmLabel: l10n.binDeleteForever,
      cancelLabel: l10n.actionCancel,
      isDestructive: true,
    );
    if (ok) await repo.permanentlyDelete(e.id);
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final tokens = context.tokens;
    final items = [
      for (final e in ref.watch(recycledExpensesProvider(tripId)).value ?? const <Expense>[])
        if (!_restoring.contains(e.id)) e,
    ];
    final trip = ref.watch(tripProvider(tripId)).value;
    final repo = ref.read(expenseRepositoryProvider);
    final isAdmin = ref.watch(isTripAdminProvider(tripId));
    final uid = ref.watch(authStateProvider).userId;
    final base = trip?.baseCurrency ?? '';
    final now = DateTime.now();

    return AppScaffold(
      appBar: AppBar(
        title: Text(l10n.binTitle),
        leading: IconButton(
          tooltip: l10n.actionBack,
          icon: const Icon(AppIcons.back, size: 20),
          onPressed: () => context.pop(),
        ),
        actions: [
          if (items.isNotEmpty && isAdmin)
            TextButton(
              onPressed: () async {
                final ok = await ConfirmDialog.show(
                  context: context,
                  title: l10n.binEmptyAll,
                  message: l10n.binEmptyConfirm(items.length),
                  confirmLabel: l10n.binDeleteForever,
                  cancelLabel: l10n.actionCancel,
                  isDestructive: true,
                );
                if (ok) await repo.emptyRecycleBin(tripId);
              },
              child: Text(l10n.binEmptyAll),
            ),
        ],
      ),
      body: items.isEmpty
          ? EmptyState(icon: AppIcons.delete, title: l10n.binEmpty, subtitle: l10n.binBody)
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                DecoratedBox(
                  decoration: BoxDecoration(
                    color: tokens.colorWarning.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(tokens.radiusMd),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(14),
                    child: Row(
                      children: [
                        Icon(Icons.schedule_rounded, size: 20, color: tokens.colorWarning),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(l10n.binBody, style: TextStyle(color: tokens.textPrimary)),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                for (final e in items)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: Dismissible(
                      key: ValueKey('bin-dismiss-${e.id}'),
                      direction: DismissDirection.startToEnd,
                      background: Container(
                        alignment: Alignment.centerLeft,
                        padding: const EdgeInsets.symmetric(horizontal: 20),
                        decoration: BoxDecoration(
                          color: tokens.colorSuccess,
                          borderRadius: BorderRadius.circular(tokens.radiusMd),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.restore_from_trash_rounded, color: Colors.white, size: 22),
                            const SizedBox(width: 8),
                            Text(
                              l10n.binRestore,
                              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700),
                            ),
                          ],
                        ),
                      ),
                      onDismissed: (_) => unawaited(_restore(e)),
                      child: AppCard(
                      key: Key('bin-${e.id}'),
                      padding: const EdgeInsets.all(14),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Row(
                            children: [
                              Container(
                                width: 42,
                                height: 42,
                                alignment: Alignment.center,
                                decoration: BoxDecoration(
                                  color: Color(categoryColorArgb(e.category)).withValues(alpha: 0.12),
                                  borderRadius: BorderRadius.circular(14),
                                ),
                                child: Icon(AppIcons.delete, size: 20, color: Color(categoryColorArgb(e.category))),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      e.title,
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: const TextStyle(fontWeight: FontWeight.w700),
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      '${formatMoney(context, e.amount, base)} · ${e.date}',
                                      style: TextStyle(fontSize: 12.5, color: tokens.textSecondary),
                                    ),
                                    if (recycleBinExpiryLabel(e.deletedAt, now) case final expiry?)
                                      Padding(
                                        padding: const EdgeInsets.only(top: 2),
                                        child: Text(
                                          expiry,
                                          key: Key('bin-expiry-${e.id}'),
                                          style: TextStyle(
                                            fontSize: 12,
                                            fontWeight: FontWeight.w600,
                                            color: tokens.colorWarning,
                                          ),
                                        ),
                                      ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 10),
                          Row(
                            children: [
                              Expanded(
                                child: AppButton(
                                  key: Key('bin-restore-${e.id}'),
                                  label: l10n.binRestore,
                                  icon: Icons.restore_from_trash_rounded,
                                  onPressed: () => unawaited(_restore(e)),
                                ),
                              ),
                              if (canManageExpense(e, isAdmin: isAdmin, userId: uid)) ...[
                                const SizedBox(width: 4),
                                PopupMenuButton<String>(
                                  key: Key('bin-more-${e.id}'),
                                  tooltip: l10n.binMoreActions,
                                  icon: Icon(Icons.more_vert_rounded, color: tokens.textSecondary),
                                  onSelected: (v) {
                                    if (v == 'delete') unawaited(_deleteForever(e));
                                  },
                                  itemBuilder: (_) => [
                                    PopupMenuItem<String>(
                                      key: Key('bin-delete-${e.id}'),
                                      value: 'delete',
                                      child: Text(
                                        l10n.binDeleteForever,
                                        style: TextStyle(color: tokens.colorDanger, fontWeight: FontWeight.w600),
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ],
                          ),
                        ],
                      ),
                    ),
                    ),
                  ),
              ],
            ),
    );
  }
}
