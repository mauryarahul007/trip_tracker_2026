import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/auth_state.dart';
import '../../../core/clock.dart';
import '../../../core/format/money.dart';
import '../../../data/providers.dart';
import '../../../domain/logic/expense_form_logic.dart';
import '../../../domain/logic/settle_up.dart';
import '../../../domain/logic/settlement.dart';
import '../../../domain/models/expense.dart';
import '../../../l10n/l10n_ext.dart';
import '../../../shared/theme/app_tokens.dart';
import '../../../shared/widgets/app_button.dart';
import '../../../shared/widgets/app_sheet.dart';
import '../../../shared/widgets/app_text_field.dart';
import '../../../shared/widgets/empty_state.dart';
import '../../trip_details/application/trip_nav.dart';
import '../application/expenses_providers.dart';
import 'widgets/expense_detail_sheet.dart';

bool _flag(WidgetRef ref, String key, String tripId) => ref.watch(flagProvider((key, tripId))).value ?? false;

/// Balances tab: who is owed what, who pays whom, settle up, settlement history.
class LedgerTab extends ConsumerWidget {
  const LedgerTab({required this.tripId, super.key});
  final String tripId;

  Future<void> _settle(BuildContext context, WidgetRef ref, Transfer t) async {
    final trip = ref.read(tripProvider(tripId)).value;
    if (trip == null) return;
    await AppSheet.show<void>(
      context: context,
      builder: (_) => _SettleSheet(tripId: tripId, transfer: t, currency: trip.baseCurrency),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final tokens = context.tokens;
    final trip = ref.watch(tripProvider(tripId)).value;
    final result = ref.watch(tripSettlementProvider(tripId));
    if (trip == null || result == null) return const Center(child: CircularProgressIndicator());
    final cur = trip.baseCurrency;
    final isAdmin = ref.watch(isTripAdminProvider(tripId));
    final canToggle = isAdmin && _flag(ref, 'enableSimplifyDebtsToggle', tripId);
    final history = _flag(ref, 'enableSettlementHistory', tripId);
    final settlements = [
      for (final e in ref.watch(tripExpensesProvider(tripId)).value ?? const <Expense>[])
        if (e.isSettlement && e.deletedAt == null) e,
    ]..sort((a, b) => b.date.compareTo(a.date));
    final allEven = result.transfers.isEmpty;

    return ListView(
      key: const Key('ledger-list'),
      padding: const EdgeInsets.all(16),
      children: [
        Text(l10n.ledBalances, style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
        const SizedBox(height: 8),
        for (final b in result.balances)
          ListTile(
            key: Key('balance-${b.memberId}'),
            contentPadding: EdgeInsets.zero,
            title: Text(b.name),
            trailing: Text(
              b.balance.abs() < 0.01
                  ? l10n.ledEven
                  : b.balance > 0
                      ? l10n.ledOwed(formatMoney(context, b.balance, cur))
                      : l10n.ledOwes(formatMoney(context, -b.balance, cur)),
              style: TextStyle(color: b.balance.abs() < 0.01 ? tokens.textSecondary : (b.balance > 0 ? tokens.colorSuccess : tokens.colorDanger), fontWeight: FontWeight.w600),
            ),
          ),
        if (canToggle)
          SwitchListTile(
            key: const Key('simplify-toggle'),
            contentPadding: EdgeInsets.zero,
            title: Text(l10n.ledSimplify),
            subtitle: Text(l10n.ledSimplifyHint),
            value: trip.simplifyDebts,
            onChanged: (v) => ref.read(tripRepositoryProvider).setSimplifyDebts(tripId, v),
          ),
        const SizedBox(height: 16),
        Text(l10n.ledWhoPays, style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
        const SizedBox(height: 8),
        if (allEven)
          EmptyState(key: const Key('all-settled'), icon: Icons.check_circle_outline, title: l10n.ledAllSettled, subtitle: l10n.ledAllSettledHint)
        else
          for (final (i, t) in result.transfers.indexed)
            ListTile(
              key: Key('transfer-$i'),
              contentPadding: EdgeInsets.zero,
              title: Text(l10n.ledTransfer(t.fromLabel, t.toLabel)),
              subtitle: Text(formatMoney(context, t.amount, cur)),
              trailing: AppButton(key: Key('settle-$i'), label: l10n.ledSettle, onPressed: () => _settle(context, ref, t)),
            ),
        if (history) ...[
          const SizedBox(height: 16),
          Text(l10n.ledHistory, style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
          const SizedBox(height: 8),
          if (settlements.isEmpty) Text(l10n.ledNoHistory, key: const Key('history-empty'), style: TextStyle(color: tokens.textSecondary)),
          for (final e in settlements)
            ListTile(
              key: Key('history-${e.id}'),
              contentPadding: EdgeInsets.zero,
              title: Text(e.title.replaceFirst('Settlement: ', '')),
              subtitle: Text('${e.date} · ${formatMoney(context, e.amount, e.currency)}'),
              trailing: Text(e.settlementConfirmedAt != null ? l10n.ledConfirmed : l10n.ledAwaiting,
                  style: TextStyle(color: e.settlementConfirmedAt != null ? tokens.colorSuccess : tokens.textSecondary)),
              onTap: () => AppSheet.show<void>(
                context: context,
                builder: (sheetCtx) => ExpenseDetailSheet(
                  tripId: tripId,
                  expenseId: e.id,
                  onEdit: () => Navigator.of(sheetCtx).pop(),
                  onDelete: () => Navigator.of(sheetCtx).pop(),
                ),
              ),
            ),
        ],
      ],
    );
  }
}

class _SettleSheet extends ConsumerStatefulWidget {
  const _SettleSheet({required this.tripId, required this.transfer, required this.currency});
  final String tripId;
  final Transfer transfer;
  final String currency;

  @override
  ConsumerState<_SettleSheet> createState() => _SettleSheetState();
}

class _SettleSheetState extends ConsumerState<_SettleSheet> {
  late final _amount = TextEditingController(text: widget.transfer.amount.toStringAsFixed(2));
  final _note = TextEditingController();
  late String _date = todayDateString(ref.read(nowProvider)());
  String? _error;
  bool _busy = false;

  @override
  void dispose() {
    _amount.dispose();
    _note.dispose();
    super.dispose();
  }

  double? get _value => jsParseFloat(_amount.text);

  Future<void> _submit() async {
    final l10n = context.l10n;
    final dateNote = ref.read(flagProvider(('enableSettlementDateNote', widget.tripId))).value ?? false;
    final plan = planSettlement(
      widget.transfer,
      amount: _value ?? 0,
      currency: widget.currency,
      date: dateNote ? _date : todayDateString(ref.read(nowProvider)()),
      note: dateNote ? _note.text : '',
    );
    if (plan == null) {
      setState(() => _error = l10n.ledAmountInvalid);
      return;
    }
    setState(() => _busy = true);
    final nav = Navigator.of(context);
    final messenger = ScaffoldMessenger.of(context);
    final r = await ref.read(expenseRepositoryProvider).submit(plan.submission, tripId: widget.tripId, userId: ref.read(authStateProvider).userId ?? '');
    if (!mounted) return;
    if (r.isOk) {
      nav.pop();
      messenger.showSnackBar(SnackBar(content: Text(l10n.ledSettledToast)));
    } else {
      setState(() {
        _busy = false;
        _error = r.error;
      });
    }
  }

  Future<void> _pickDate() async {
    final now = ref.read(nowProvider)();
    final d = await showDatePicker(context: context, initialDate: DateTime.tryParse(_date) ?? now, firstDate: DateTime(2000), lastDate: DateTime(now.year + 2));
    if (d != null) setState(() => _date = todayDateString(d));
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final t = widget.transfer;
    final v = _value;
    final partial = v != null && v > 0 && v < t.amount - 0.01;
    final dateNote = ref.watch(flagProvider(('enableSettlementDateNote', widget.tripId))).value ?? false;
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Text(partial ? l10n.ledSettlePartialTitle : l10n.ledSettleTitle, style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 4),
        Text(l10n.ledTransfer(t.fromLabel, t.toLabel)),
        Text(partial ? l10n.ledSettlePartialBody : l10n.ledSettleBody, key: const Key('settle-body')),
        const SizedBox(height: 12),
        AppTextField(
          key: const Key('settle-amount'),
          controller: _amount,
          label: l10n.ledAmount,
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
          onChanged: (_) => setState(() => _error = null),
        ),
        if (partial) Padding(padding: const EdgeInsets.only(top: 4), child: Text(l10n.ledRemaining(formatMoney(context, t.amount - v, widget.currency)), key: const Key('settle-remaining'))),
        if (dateNote) ...[
          const SizedBox(height: 8),
          OutlinedButton(key: const Key('settle-date'), onPressed: _pickDate, child: Text('${l10n.ledDate}: $_date')),
          const SizedBox(height: 8),
          AppTextField(key: const Key('settle-note'), controller: _note, label: l10n.ledNote),
        ],
        if (_error != null) Padding(padding: const EdgeInsets.only(top: 8), child: Text(_error!, key: const Key('settle-error'), style: TextStyle(color: context.tokens.colorDanger))),
        const SizedBox(height: 12),
        AppButton(key: const Key('settle-confirm'), label: partial ? l10n.ledMarkPartial : l10n.ledMarkSettled, isLoading: _busy, onPressed: _busy ? null : _submit),
      ]),
    );
  }
}
