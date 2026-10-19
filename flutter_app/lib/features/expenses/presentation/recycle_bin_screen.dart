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

/// Deleted expenses, restorable for 24 h (server purges them after that).
class RecycleBinScreen extends ConsumerWidget {
  const RecycleBinScreen({required this.tripId, super.key});
  final String tripId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final tokens = context.tokens;
    final items = ref.watch(recycledExpensesProvider(tripId)).value ?? const <Expense>[];
    final trip = ref.watch(tripProvider(tripId)).value;
    final repo = ref.read(expenseRepositoryProvider);
    final isAdmin = ref.watch(isTripAdminProvider(tripId));
    final uid = ref.watch(authStateProvider).userId;
    final base = trip?.baseCurrency ?? '';

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
                                  label: l10n.binRestore,
                                  variant: AppButtonVariant.secondary,
                                  onPressed: () => repo.restore(e.id),
                                ),
                              ),
                              if (canManageExpense(e, isAdmin: isAdmin, userId: uid)) ...[
                                const SizedBox(width: 8),
                                Expanded(
                                  child: AppButton(
                                    label: l10n.binDeleteForever,
                                    variant: AppButtonVariant.danger,
                                    onPressed: () async {
                                      final ok = await ConfirmDialog.show(
                                        context: context,
                                        title: l10n.binDeleteForever,
                                        message: l10n.binDeleteConfirm(e.title),
                                        confirmLabel: l10n.binDeleteForever,
                                        cancelLabel: l10n.actionCancel,
                                        isDestructive: true,
                                      );
                                      if (ok) await repo.permanentlyDelete(e.id);
                                    },
                                  ),
                                ),
                              ],
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
              ],
            ),
    );
  }
}
