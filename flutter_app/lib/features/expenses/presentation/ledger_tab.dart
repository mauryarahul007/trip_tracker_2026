import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/auth_state.dart';
import '../../../core/clock.dart';
import '../../../core/format/money.dart';
import '../../../core/storage/prefs.dart';
import '../../../core/platform/external_launcher.dart';
import '../../../core/platform/share_service.dart';
import '../../../data/providers.dart';
import '../../../data/sync/conflict_store.dart';
import '../../../domain/logic/cross_trip_balances.dart';
import '../../../domain/logic/currency.dart';
import '../../../domain/logic/expense_form_logic.dart';
import '../../../domain/logic/settle_up.dart';
import '../../../domain/logic/settlement.dart';
import '../../../domain/logic/settlement_share_card.dart';
import '../../../domain/logic/trip_utilities.dart';
import '../../../domain/models/expense.dart';
import '../../../domain/models/member.dart';
import '../../../l10n/l10n_ext.dart';
import '../../../shared/theme/app_tokens.dart';
import '../../../shared/theme/app_typography.dart';
import '../../../shared/widgets/app_avatar.dart';
import '../../../shared/widgets/app_button.dart';
import '../../../shared/widgets/app_sheet.dart';
import '../../../shared/widgets/app_surface.dart';
import '../../../shared/widgets/bento_tile.dart';
import '../../../shared/widgets/app_text_field.dart';
import '../../../shared/widgets/empty_state.dart';
import '../../trip_details/application/trip_nav.dart';
import '../application/expenses_providers.dart';
import '../application/money_providers.dart';
import 'conflict_sheet.dart';
import 'widgets/expense_detail_sheet.dart';
import 'widgets/settlement_card.dart';

bool _flag(WidgetRef ref, String key, String tripId) => ref.watch(flagProvider((key, tripId))).value ?? false;

Map<String, List<Member>> _byTrip(List<Member> members) {
  final out = <String, List<Member>>{};
  for (final m in members) {
    final tripId = m.tripId;
    if (tripId == null) continue;
    (out[tripId] ??= []).add(m);
  }
  return out;
}

Map<String, List<Expense>> _expensesByTrip(List<Expense> expenses) {
  final out = <String, List<Expense>>{};
  for (final e in expenses) {
    (out[e.tripId] ??= []).add(e);
  }
  return out;
}

/// Balances tab: who is owed what, who pays whom, settle up, settlement history.
class LedgerTab extends ConsumerStatefulWidget {
  const LedgerTab({required this.tripId, super.key});
  final String tripId;

  @override
  ConsumerState<LedgerTab> createState() => _LedgerTabState();
}

class _LedgerTabState extends ConsumerState<LedgerTab> {
  final _open = <String>{'balances', 'transfers', 'history', 'cross'};

  Future<void> _settle(BuildContext context, Transfer t) async {
    final trip = ref.read(tripProvider(widget.tripId)).value;
    if (trip == null) return;
    await AppSheet.show<void>(
      context: context,
      builder: (_) => _SettleSheet(tripId: widget.tripId, transfer: t, currency: trip.baseCurrency),
    );
  }

  void _toggle(String id) => setState(() => _open.contains(id) ? _open.remove(id) : _open.add(id));

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final tokens = context.tokens;
    final id = widget.tripId;
    final trip = ref.watch(tripProvider(id)).value;
    final result = ref.watch(tripSettlementProvider(id));
    if (trip == null || result == null) return const Center(child: CircularProgressIndicator());
    final cur = trip.baseCurrency;
    final isAdmin = ref.watch(isTripAdminProvider(id));
    final canToggle = isAdmin && _flag(ref, 'enableSimplifyDebtsToggle', id);
    final history = _flag(ref, 'enableSettlementHistory', id);
    final compact = _flag(ref, 'enableCompactLedgerView', id);
    final pad = compact ? 8.0 : 16.0;
    final settlements = [
      for (final e in ref.watch(tripExpensesProvider(id)).value ?? const <Expense>[])
        if (e.isSettlement && e.deletedAt == null) e,
    ]..sort((a, b) => b.date.compareTo(a.date));
    final allEven = result.transfers.isEmpty;
    final conflicts = ref.watch(conflictStoreProvider)[id] ?? const [];
    final mine = ref.watch(myMemberIdProvider(id));
    final myBalance = mine == null ? null : result.balances.where((b) => b.memberId == mine).firstOrNull;
    final trips = ref.watch(allTripsProvider).value ?? const [];
    final cross = trips.length < 2
        ? const <CrossTripNet>[]
        : crossTripNets(
            userId: ref.watch(authStateProvider).userId,
            trips: trips,
            membersByTrip: _byTrip(ref.watch(allMembersProvider).value ?? const []),
            expensesByTrip: _expensesByTrip(ref.watch(allActiveExpensesProvider).value ?? const []),
          );

    Widget section(String key, String title, List<Widget> children) {
      final open = _open.contains(key);
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          InkWell(
            key: Key('section-$key'),
            onTap: () => _toggle(key),
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 8),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      title,
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
                    ),
                  ),
                  Icon(open ? Icons.expand_less : Icons.expand_more, color: tokens.textMuted),
                ],
              ),
            ),
          ),
          if (open)
            AppCard(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
              child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: children),
            ),
          const SizedBox(height: 12),
        ],
      );
    }

    return Column(
      children: [
        if (myBalance != null)
          Padding(
            key: const Key('sticky-balance'),
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
            child: BentoTile(
              // Mint when you are owed, peach when you owe, sky when even.
              tone: myBalance.balance.abs() < 0.01
                  ? BentoTone.sky
                  : (myBalance.balance > 0 ? BentoTone.mint : BentoTone.peach),
              padding: EdgeInsets.all(compact ? 14 : 20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  BentoTile.eyebrow(
                    context,
                    myBalance.balance.abs() < 0.01
                        ? BentoTone.sky
                        : (myBalance.balance > 0 ? BentoTone.mint : BentoTone.peach),
                    l10n.ledYou,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    myBalance.balance.abs() < 0.01
                        ? l10n.ledEven
                        : myBalance.balance > 0
                        ? l10n.ledOwed(formatMoney(context, myBalance.balance, cur))
                        : l10n.ledOwes(formatMoney(context, -myBalance.balance, cur)),
                    style: AppTypography.moneyDisplay(fontSize: compact ? 26 : 34, color: tokens.textPrimary),
                  ),
                ],
              ),
            ),
          ),
        Expanded(
          child: ListView(
            key: const Key('ledger-list'),
            padding: EdgeInsets.all(pad),
            children: [
              if (conflicts.isNotEmpty)
                AppButton(
                  key: const Key('open-conflicts'),
                  label: l10n.conflictTitle,
                  variant: AppButtonVariant.secondary,
                  onPressed: () => AppSheet.show<void>(
                    context: context,
                    builder: (_) => ConflictSheet(tripId: id),
                  ),
                ),
              section('balances', l10n.ledBalances, [
                for (final b in result.balances)
                  ListTile(
                    key: Key('balance-${b.memberId}'),
                    contentPadding: EdgeInsets.zero,
                    dense: compact,
                    title: Text(b.name),
                    // Member bars (board 05): length shows how big each balance is relative to the largest.
                    subtitle: b.balance.abs() < 0.01
                        ? null
                        : _BalanceBar(
                            fraction: b.balance.abs() / result.balances.map((x) => x.balance.abs()).reduce(math.max),
                            color: b.balance > 0 ? tokens.colorSuccess : tokens.colorDanger,
                            track: tokens.borderColor,
                          ),
                    // Bounded so a long amount wraps instead of consuming the tile (200% text, wide fonts).
                    trailing: ConstrainedBox(
                      constraints: const BoxConstraints(maxWidth: 150),
                      child: Text(
                        b.balance.abs() < 0.01
                            ? l10n.ledEven
                            : b.balance > 0
                            ? l10n.ledOwed(formatMoney(context, b.balance, cur))
                            : l10n.ledOwes(formatMoney(context, -b.balance, cur)),
                        textAlign: TextAlign.end,
                        style: TextStyle(
                          color: b.balance.abs() < 0.01
                              ? tokens.textSecondary
                              : (b.balance > 0 ? tokens.colorSuccess : tokens.colorDanger),
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ),
                if (canToggle)
                  SwitchListTile(
                    key: const Key('simplify-toggle'),
                    contentPadding: EdgeInsets.zero,
                    title: Text(l10n.ledSimplify),
                    subtitle: Text(l10n.ledSimplifyHint),
                    value: trip.simplifyDebts,
                    onChanged: (v) => ref.read(tripRepositoryProvider).setSimplifyDebts(id, v),
                  ),
              ]),
              section('transfers', l10n.ledWhoPays, [
                if (allEven)
                  EmptyState(
                    key: const Key('all-settled'),
                    icon: Icons.check_circle_outline,
                    title: l10n.ledAllSettled,
                    subtitle: l10n.ledAllSettledHint,
                  )
                else
                  for (final (i, t) in result.transfers.indexed)
                    ListTile(
                      key: Key('transfer-$i'),
                      contentPadding: EdgeInsets.zero,
                      dense: compact,
                      title: Text(l10n.ledTransfer(t.fromLabel, t.toLabel)),
                      subtitle: Text(formatMoney(context, t.amount, cur)),
                      trailing: ConstrainedBox(
                        constraints: const BoxConstraints(maxWidth: 130),
                        child: AppButton(
                          key: Key('settle-$i'),
                          label: l10n.ledSettle,
                          onPressed: () => _settle(context, t),
                        ),
                      ),
                    ),
              ]),
              if (history)
                section('history', l10n.ledHistory, [
                  if (settlements.isEmpty)
                    Text(
                      l10n.ledNoHistory,
                      key: const Key('history-empty'),
                      style: TextStyle(color: tokens.textSecondary),
                    ),
                  for (final e in settlements)
                    ListTile(
                      key: Key('history-${e.id}'),
                      contentPadding: EdgeInsets.zero,
                      title: Text(e.title.replaceFirst('Settlement: ', '')),
                      subtitle: Text('${e.date} · ${formatMoney(context, e.amount, e.currency)}'),
                      trailing: Text(
                        e.settlementConfirmedAt != null ? l10n.ledConfirmed : l10n.ledAwaiting,
                        style: TextStyle(
                          color: e.settlementConfirmedAt != null ? tokens.colorSuccess : tokens.textSecondary,
                        ),
                      ),
                      onTap: () => AppSheet.show<void>(
                        context: context,
                        builder: (sheetCtx) => ExpenseDetailSheet(
                          tripId: id,
                          expenseId: e.id,
                          onEdit: () => Navigator.of(sheetCtx).pop(),
                          onDelete: () => Navigator.of(sheetCtx).pop(),
                        ),
                      ),
                    ),
                ]),
              if (cross.isNotEmpty)
                section('cross', l10n.ledAcrossTrips, [
                  for (final n in cross)
                    ListTile(
                      key: Key('cross-${n.currency}'),
                      contentPadding: EdgeInsets.zero,
                      title: Text(l10n.ledAcrossLine(n.currency, formatMoney(context, n.net.abs(), n.currency))),
                      trailing: Text(n.net > 0 ? l10n.ledOwed('') : l10n.ledOwes('')),
                    ),
                ]),
            ],
          ),
        ),
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
  late final _upi = TextEditingController(
    text: ref.read(sharedPreferencesProvider).getString('member_upi:${widget.transfer.toMemberId}') ?? '',
  );
  late String _date = todayDateString(ref.read(nowProvider)());
  String? _error;
  bool _busy = false;

  @override
  void dispose() {
    _amount.dispose();
    _note.dispose();
    _upi.dispose();
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
    final r = await ref
        .read(expenseRepositoryProvider)
        .submit(plan.submission, tripId: widget.tripId, userId: ref.read(authStateProvider).userId ?? '');
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
    final d = await showDatePicker(
      context: context,
      initialDate: DateTime.tryParse(_date) ?? now,
      firstDate: DateTime(2000),
      lastDate: DateTime(now.year + 2),
    );
    if (d != null) setState(() => _date = todayDateString(d));
  }

  Future<void> _share() async {
    final trip = ref.read(tripProvider(widget.tripId)).value;
    final amount = _value ?? widget.transfer.amount;
    final symbol = getCurrencySymbol(widget.currency);
    final layout = settlementShareCardLayout(
      SettlementShareCardInput(
        tripName: trip?.name ?? '',
        fromLabel: widget.transfer.fromLabel,
        toLabel: widget.transfer.toLabel,
        amount: amount,
        currencySymbol: symbol,
        upiId: _upi.text.trim().isEmpty ? null : _upi.text.trim(),
      ),
    );
    final bytes = await renderSettlementPng(layout);
    if (!mounted) return;
    await ref.read(shareServiceProvider).sharePng(bytes, fileName: layout.fileName, text: layout.caption);
  }

  Future<void> _payUpi() async {
    final l10n = context.l10n;
    final id = _upi.text.trim();
    if (!isValidUpiId(id)) {
      setState(() => _error = l10n.upiInvalid);
      return;
    }
    await saveUpiId(ref, widget.transfer.toMemberId, id);
    final amount = _value ?? widget.transfer.amount;
    final uri = Uri.parse(
      generateUpiUri({
        'payeeUpiId': id,
        'payeeName': widget.transfer.toLabel,
        'amount': amount,
        'note': 'Trip Settlement',
      }),
    );
    final opened = await ref.read(externalLauncherProvider)(uri);
    if (!mounted) return;
    if (!opened) {
      await Clipboard.setData(ClipboardData(text: id));
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(l10n.upiUnavailable)));
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final t = widget.transfer;
    final v = _value;
    final partial = v != null && v > 0 && v < t.amount - 0.01;
    final dateNote = ref.watch(flagProvider(('enableSettlementDateNote', widget.tripId))).value ?? false;
    final upiOn = ref.watch(flagProvider(('enableUpiPayments', widget.tripId))).value ?? false;
    final shareOn = ref.watch(flagProvider(('enableWhatsAppSettlementShare', widget.tripId))).value ?? false;
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              AppAvatar(name: t.fromLabel, size: 44),
              const SizedBox(width: 12),
              Icon(Icons.arrow_forward_rounded, color: context.tokens.textMuted),
              const SizedBox(width: 12),
              AppAvatar(name: t.toLabel, size: 44),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            partial ? l10n.ledSettlePartialTitle : l10n.ledSettleTitle,
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 4),
          Text(l10n.ledTransfer(t.fromLabel, t.toLabel), textAlign: TextAlign.center),
          Text(partial ? l10n.ledSettlePartialBody : l10n.ledSettleBody, key: const Key('settle-body')),
          const SizedBox(height: 12),
          AppTextField(
            key: const Key('settle-amount'),
            controller: _amount,
            label: l10n.ledAmount,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            onChanged: (_) => setState(() => _error = null),
          ),
          if (partial)
            Padding(
              padding: const EdgeInsets.only(top: 4),
              child: Text(
                l10n.ledRemaining(formatMoney(context, t.amount - v, widget.currency)),
                key: const Key('settle-remaining'),
              ),
            ),
          if (dateNote) ...[
            const SizedBox(height: 8),
            OutlinedButton(key: const Key('settle-date'), onPressed: _pickDate, child: Text('${l10n.ledDate}: $_date')),
            const SizedBox(height: 8),
            AppTextField(key: const Key('settle-note'), controller: _note, label: l10n.ledNote),
          ],
          if (upiOn) ...[
            const SizedBox(height: 8),
            AppTextField(
              key: const Key('settle-upi'),
              controller: _upi,
              label: l10n.upiHint,
              onChanged: (_) => setState(() => _error = null),
            ),
            const SizedBox(height: 8),
            AppButton(
              key: const Key('settle-upi-pay'),
              label: l10n.upiPay,
              variant: AppButtonVariant.secondary,
              onPressed: _payUpi,
            ),
          ],
          if (shareOn) ...[
            const SizedBox(height: 8),
            AppButton(
              key: const Key('settle-share'),
              label: l10n.shareCard,
              variant: AppButtonVariant.secondary,
              onPressed: _share,
            ),
          ],
          if (_error != null)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Text(
                _error!,
                key: const Key('settle-error'),
                style: TextStyle(color: context.tokens.colorDanger),
              ),
            ),
          const SizedBox(height: 12),
          AppButton(
            key: const Key('settle-confirm'),
            label: partial ? l10n.ledMarkPartial : l10n.ledMarkSettled,
            isLoading: _busy,
            onPressed: _busy ? null : _submit,
          ),
        ],
      ),
    );
  }
}

class _BalanceBar extends StatelessWidget {
  const _BalanceBar({required this.fraction, required this.color, required this.track});

  final double fraction;
  final Color color;
  final Color track;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(top: 4),
    child: ClipRRect(
      borderRadius: BorderRadius.circular(99),
      child: LinearProgressIndicator(
        value: fraction.clamp(0.04, 1.0),
        minHeight: 6,
        backgroundColor: track,
        color: color,
      ),
    ),
  );
}
