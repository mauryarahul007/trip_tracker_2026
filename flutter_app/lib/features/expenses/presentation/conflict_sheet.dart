import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/format/money.dart';
import '../../../data/providers.dart';
import '../../../data/sync/conflict_store.dart';
import '../../../domain/logic/sync_merge.dart';
import '../../../domain/models/expense.dart';
import '../../../domain/models/member.dart';
import '../../../l10n/app_localizations.dart';
import '../../../l10n/l10n_ext.dart';
import '../../../shared/theme/app_tokens.dart';
import '../../../shared/widgets/app_button.dart';
import '../../../shared/widgets/app_surface.dart' show Eyebrow;
import '../application/expenses_providers.dart';

class ConflictSheet extends ConsumerWidget {
  const ConflictSheet({required this.tripId, super.key});
  final String tripId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final tokens = context.tokens;
    final conflicts = ref.watch(conflictStoreProvider)[tripId] ?? const <ExpenseConflict>[];
    final members = {for (final m in ref.watch(tripMembersProvider(tripId)).value ?? const <Member>[]) m.id: m};
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
          for (final c in conflicts) _row(context, ref, c, members),
        ],
      ),
    );
  }

  /// One comparison row; a differing value is bold on a warning tint so it reads without comparing by eye.
  Widget _fieldRow(BuildContext context, String label, String local, String server, bool differs) {
    final tokens = context.tokens;
    final style = TextStyle(fontSize: 13.5, fontWeight: differs ? FontWeight.w800 : FontWeight.w400);
    return DecoratedBox(
      decoration: BoxDecoration(
        color: differs ? tokens.colorWarning.withValues(alpha: 0.12) : null,
        borderRadius: BorderRadius.circular(tokens.radiusSm),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              flex: 3,
              child: Text(label, style: TextStyle(fontSize: 12.5, color: tokens.textSecondary)),
            ),
            Expanded(flex: 4, child: Text(local, style: style)),
            Expanded(flex: 4, child: Text(server, style: style)),
          ],
        ),
      ),
    );
  }

  String _label(AppLocalizations l10n, ConflictFieldKey k) => switch (k) {
    ConflictFieldKey.amount => l10n.conflictFieldAmount,
    ConflictFieldKey.date => l10n.conflictFieldDate,
    ConflictFieldKey.title => l10n.conflictFieldTitle,
    ConflictFieldKey.category => l10n.conflictFieldCategory,
    ConflictFieldKey.paidBy => l10n.conflictFieldPaidBy,
    ConflictFieldKey.split => l10n.conflictFieldSplit,
  };

  Widget _row(BuildContext context, WidgetRef ref, ExpenseConflict c, Map<String, Member> members) {
    final l10n = context.l10n;
    final fields = conflictFields(
      c.local,
      c.server,
      money: (v, cur) => formatMoney(context, v, cur),
      nameOf: (id) => members[id]?.name ?? id,
    );
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(c.local.title, style: const TextStyle(fontWeight: FontWeight.w700)),
          const SizedBox(height: 8),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 8),
            child: Row(
              children: [
                const Expanded(flex: 3, child: SizedBox.shrink()),
                Expanded(flex: 4, child: Eyebrow(l10n.conflictLocal)),
                Expanded(flex: 4, child: Eyebrow(l10n.conflictServer)),
              ],
            ),
          ),
          for (final f in fields.where((f) => f.differs))
            _fieldRow(context, _label(l10n, f.key), f.local, f.server, true),
          if (fields.any((f) => !f.differs))
            Padding(
              padding: const EdgeInsets.fromLTRB(8, 6, 8, 0),
              child: Text(
                l10n.conflictSameFields(fields.where((f) => !f.differs).length),
                style: TextStyle(fontSize: 12.5, color: context.tokens.textSecondary),
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
                  variant: AppButtonVariant.secondary,
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

enum ConflictFieldKey { amount, date, title, category, paidBy, split }

class ConflictField {
  const ConflictField(this.key, this.local, this.server);
  final ConflictFieldKey key;
  final String local;
  final String server;
  bool get differs => local != server;
}

/// The user-visible fields of two copies of an expense, as display strings, so "differs" matches what is shown.
List<ConflictField> conflictFields(
  Expense local,
  Expense server, {
  required String Function(double amount, String currency) money,
  required String Function(String memberId) nameOf,
}) {
  String split(Expense e) => '${e.splitMode} · ${e.splitMemberIds.length}';
  ConflictField f(ConflictFieldKey k, String Function(Expense) get) => ConflictField(k, get(local), get(server));
  return [
    f(ConflictFieldKey.amount, (e) => money(e.amount, e.currency)),
    f(ConflictFieldKey.date, (e) => e.date),
    f(ConflictFieldKey.title, (e) => e.title),
    f(ConflictFieldKey.category, (e) => e.category),
    f(ConflictFieldKey.paidBy, (e) => nameOf(e.paidBy)),
    f(ConflictFieldKey.split, split),
  ];
}
