import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/format/money.dart';
import '../../../data/providers.dart';
import '../../../data/sync/conflict_store.dart';
import '../../../domain/logic/sync_merge.dart';
import '../../../l10n/l10n_ext.dart';
import '../../../shared/theme/app_tokens.dart';
import '../../../shared/widgets/app_button.dart';

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
          Text(l10n.conflictTitle, style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 4),
          Text(l10n.conflictBody, style: TextStyle(color: tokens.textSecondary)),
          const SizedBox(height: 12),
          for (final c in conflicts) _row(context, ref, c),
        ],
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
          Text('${l10n.conflictLocal}: ${formatMoney(context, c.local.amount, cur)} · ${c.local.date}'),
          Text('${l10n.conflictServer}: ${formatMoney(context, c.server.amount, cur)} · ${c.server.date}'),
          const SizedBox(height: 8),
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
