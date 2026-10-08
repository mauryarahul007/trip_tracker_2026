import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/format/money.dart';
import '../../../data/providers.dart';
import '../../../data/sync/conflict_store.dart';
import '../../../domain/logic/sync_merge.dart';
import '../../../l10n/l10n_ext.dart';
import '../../../shared/theme/app_tokens.dart';
import '../../../shared/widgets/app_button.dart';
import '../../../shared/widgets/app_surface.dart' show Eyebrow;

class ConflictSheet extends ConsumerWidget {
  const ConflictSheet({required this.tripId, super.key});
  final String tripId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final tokens = context.tokens;
    final conflicts = ref.watch(conflictStoreProvider)[tripId] ?? const <ExpenseConflict>[];
    if (conflicts.isEmpty) {
      return Padding(padding: const EdgeInsets.all(24), child: Text(l10n.conflictEmpty));
    }
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Icon(Icons.sync_problem_rounded, color: tokens.colorWarning),
              const SizedBox(width: 10),
              Text(l10n.conflictTitle, style: Theme.of(context).textTheme.titleLarge),
            ],
          ),
          const SizedBox(height: 4),
          Text(l10n.conflictBody, style: TextStyle(color: tokens.textSecondary)),
          const SizedBox(height: 12),
          for (final c in conflicts) _row(context, ref, c),
        ],
      ),
    );
  }

  /// One side of the comparison; the local ("mine") side carries the primary outline.
  Widget _version(BuildContext context, String label, String amount, String date, bool mine) {
    final tokens = context.tokens;
    return DecoratedBox(
      decoration: BoxDecoration(
        color: mine ? tokens.primaryAccent.withValues(alpha: 0.08) : tokens.bgSurface,
        borderRadius: BorderRadius.circular(tokens.radiusMd),
        border: Border.all(color: mine ? tokens.primaryAccent : tokens.borderColor, width: mine ? 1.5 : 1),
      ),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Eyebrow(label),
            const SizedBox(height: 6),
            Text(amount, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
            const SizedBox(height: 2),
            Text(date, style: TextStyle(fontSize: 12.5, color: tokens.textSecondary)),
          ],
        ),
      ),
    );
  }

  Widget _row(BuildContext context, WidgetRef ref, ExpenseConflict c) {
    final l10n = context.l10n;
    final cur = c.local.currency;
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(c.local.title, style: const TextStyle(fontWeight: FontWeight.w700)),
          const SizedBox(height: 8),
          IntrinsicHeight(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Expanded(
                  child: _version(
                    context,
                    l10n.conflictLocal,
                    formatMoney(context, c.local.amount, cur),
                    c.local.date,
                    true,
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: _version(
                    context,
                    l10n.conflictServer,
                    formatMoney(context, c.server.amount, cur),
                    c.server.date,
                    false,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: AppButton(
                  key: Key('conflict-mine-${c.expenseId}'),
                  label: l10n.conflictKeepMine,
                  variant: AppButtonVariant.secondary,
                  onPressed: () => ref.read(conflictStoreProvider.notifier).dismiss(tripId, c.expenseId),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: AppButton(
                  key: Key('conflict-theirs-${c.expenseId}'),
                  label: l10n.conflictKeepTheirs,
                  onPressed: () async {
                    await ref.read(expenseRepositoryProvider).adoptServerCopy(c.server);
                    ref.read(conflictStoreProvider.notifier).dismiss(tripId, c.expenseId);
                  },
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
