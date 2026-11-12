import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../app/auth_state.dart';
import '../../../../core/clock.dart';
import '../../../../core/flags/compass_flags.dart';
import '../../../../core/format/money.dart';
import '../../../../core/platform/external_launcher.dart';
import '../../../../core/platform/feedback.dart';
import '../../../../core/platform/haptics.dart';
import '../../../../core/platform/share_service.dart';
import '../../../../core/storage/prefs.dart';
import '../../../../data/providers.dart';
import '../../../../domain/logic/currency.dart';
import '../../../../domain/logic/expense_form_logic.dart';
import '../../../../domain/logic/settle_up.dart';
import '../../../../domain/logic/settlement.dart';
import '../../../../domain/logic/settlement_share_card.dart';
import '../../../../domain/logic/summary_features.dart';
import '../../../../domain/logic/trip_utilities.dart';
import '../../../../l10n/l10n_ext.dart';
import '../../../../shared/theme/app_tokens.dart';
import '../../../../shared/theme/app_typography.dart';
import '../../../../shared/widgets/app_avatar.dart';
import '../../../../shared/widgets/app_button.dart';
import '../../../../shared/widgets/app_sheet.dart';
import '../../../../shared/widgets/app_text_field.dart';
import '../../../trip_details/application/trip_nav.dart' show tripProvider;
import '../../application/money_providers.dart' show saveUpiId;
import '../../application/expenses_providers.dart';
import 'settlement_card.dart' show renderSettlementPng;
import 'upi_payment_sheet.dart';

/// Shows a snackbar after recording a settlement, with an optional undo action.
void showSettleSnack(ScaffoldMessengerState messenger, String message, VoidCallback? onUndo) {
  messenger.hideCurrentSnackBar();
  messenger.showSnackBar(
    SnackBar(
      content: Text(message),
      persist: false,
      duration: const Duration(seconds: 6),
      action: onUndo == null
          ? null
          : SnackBarAction(
              label: 'UNDO',
              onPressed: () {
                AppFeedback.tap();
                onUndo();
              },
            ),
    ),
  );
}

/// Avatar & caption block for who pays whom on [SettleSheet].
class SettlePerson extends StatelessWidget {
  const SettlePerson({required this.name, required this.caption, super.key});

  final String name;
  final String caption;

  @override
  Widget build(BuildContext context) {
    final t = context.tokens;
    return SizedBox(
      width: 110,
      child: Column(
        children: [
          AppAvatar(name: name, size: 52),
          const SizedBox(height: 6),
          Text(
            name,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontFamily: AppTypography.fontTitle,
              fontSize: 16,
              fontWeight: FontWeight.w700,
              color: t.textPrimary,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            caption,
            style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: t.textSecondary),
          ),
        ],
      ),
    );
  }
}

/// The bottom sheet to record a settlement transfer between two members.
class SettleSheet extends ConsumerStatefulWidget {
  const SettleSheet({
    required this.tripId,
    required this.transfer,
    required this.currency,
    this.focusAmount = false,
    super.key,
  });

  /// Open with the amount selected for typing (the Custom amount action).
  final bool focusAmount;
  final String tripId;
  final Transfer transfer;
  final String currency;

  @override
  ConsumerState<SettleSheet> createState() => SettleSheetState();
}

class SettleSheetState extends ConsumerState<SettleSheet> {
  late final _amount = TextEditingController(text: widget.transfer.amount.toStringAsFixed(2))
    ..selection = widget.focusAmount
        ? TextSelection(baseOffset: 0, extentOffset: widget.transfer.amount.toStringAsFixed(2).length)
        : const TextSelection.collapsed(offset: -1);
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
      recorderMemberId: ref.read(myMemberIdProvider(widget.tripId)),
      groups: ref.read(tripGroupsProvider(widget.tripId)).value ?? const [],
    );
    if (plan == null) {
      setState(() => _error = l10n.ledAmountInvalid);
      return;
    }
    setState(() => _busy = true);
    final nav = Navigator.of(context);
    final messenger = ScaffoldMessenger.of(context);
    final repo = ref.read(expenseRepositoryProvider);
    final userId = ref.read(authStateProvider).userId ?? '';
    final undoOn = ref.read(flagProvider(('enableUndoSettlement', widget.tripId))).value ?? false;
    final r = await repo.submit(plan.submission, tripId: widget.tripId, userId: userId);
    if (!mounted) return;
    if (r.isOk) {
      AppFeedback.success();
      nav.pop();
      showSettleSnack(
        messenger,
        l10n.ledSettledToast,
        undoOn ? () => unawaited(repo.delete(r.expenseId!, userId: userId)) : null,
      );
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

  void _openUpiSheet() {
    final trip = ref.read(tripProvider(widget.tripId)).value;
    final amount = _value ?? widget.transfer.amount;
    UpiPaymentSheet.show(
      context,
      fromName: widget.transfer.fromLabel,
      toName: widget.transfer.toLabel,
      toMemberId: widget.transfer.toMemberId,
      initialUpiId: _upi.text.trim(),
      amount: amount,
      currency: widget.currency,
      tripName: trip?.name,
      onConfirmSettled: () async {
        await _submit();
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final t = widget.transfer;
    final v = _value;
    final partial = v != null && v > 0 && v < t.amount - 0.01;
    final dateNote = ref.watch(flagProvider(('enableSettlementDateNote', widget.tripId))).value ?? false;
    ref.watch(flagProvider(('enableUndoSettlement', widget.tripId))); // loaded before Confirm reads it
    final upiOn = ref.watch(flagProvider(('enableUpiPayments', widget.tripId))).value ?? false;
    final shareOn = ref.watch(flagProvider(('enableWhatsAppSettlementShare', widget.tripId))).value ?? false;
    final roundingOn = ref.watch(flagProvider(('enableSettleRounding', widget.tripId))).value ?? true;
    final compactSummaryOn = ref.watch(flagProvider(('enableCompactSummary', widget.tripId))).value ?? true;
    final round = roundDownToClean(t.amount);
    final calm = ref.watch(compassFlagProvider((compassTripPagesFlag, widget.tripId)));
    final foldSecondary = calm || compactSummaryOn;
    final tk = context.tokens;
    // One big, centred amount in both layouts. Non-calm already prints "Remaining" below, so its helper
    // stays quiet while a partial amount is typed.
    final helper = partial
        ? (calm ? l10n.ledRemaining(formatMoney(context, t.amount - v, widget.currency)) : null)
        : l10n.settleEditToPayPart;
    final amountField = KeyedSubtree(
      key: const Key('settle-amount'),
      child: Semantics(
        label: l10n.ledAmount,
        child: TextField(
          controller: _amount,
          autofocus: widget.focusAmount,
          textAlign: TextAlign.center,
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
          style: AppTypography.moneyDisplay(fontSize: 40, color: tk.textPrimary).copyWith(
            fontWeight: FontWeight.w800,
            fontFeatures: AppTypography.tabularFigures,
            fontFamily: AppTypography.fontMono,
          ),
          decoration: InputDecoration(
            prefixText: '${getCurrencySymbol(widget.currency)} ',
            border: InputBorder.none,
            helperText: helper,
            helperStyle: TextStyle(color: tk.textSecondary),
          ),
          onChanged: (_) => setState(() => _error = null),
        ),
      ),
    );
    return PopScope(
      // Recording a settlement is in flight: swallow back / barrier / drag dismiss until it finishes.
      canPop: !_busy,
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (calm) ...[
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  SettlePerson(name: t.fromLabel, caption: 'Pays'),
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
                    child: Icon(Icons.arrow_forward_rounded, color: tk.textMuted),
                  ),
                  SettlePerson(name: t.toLabel, caption: 'Receives'),
                ],
              ),
              const SizedBox(height: 20),
              amountField,
            ] else ...[
              // Always keep payer→payee mapping visible (avatars + arrow); never replace with a list picker.
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  SettlePerson(name: t.fromLabel, caption: 'Pays'),
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
                    child: Icon(Icons.arrow_forward_rounded, color: context.tokens.textMuted),
                  ),
                  SettlePerson(name: t.toLabel, caption: 'Receives'),
                ],
              ),
              const SizedBox(height: 12),
              Text(
                partial ? l10n.ledSettlePartialTitle : l10n.ledSettleTitle,
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.titleMedium,
              ),
              const SizedBox(height: 4),
              Text(partial ? l10n.ledSettlePartialBody : l10n.ledSettleBody, key: const Key('settle-body')),
              const SizedBox(height: 12),
              amountField,
            ],
            if (roundingOn && round != null && !(v != null && (v - round).abs() < 0.005))
              Align(
                alignment: Alignment.centerLeft,
                child: TextButton(
                  key: const Key('settle-round'),
                  onPressed: () => setState(() {
                    _amount.text = round == round.roundToDouble() ? round.toInt().toString() : round.toString();
                    _error = null;
                  }),
                  child: Text(l10n.settleRound(formatMoney(context, round, widget.currency))),
                ),
              ),
            if (partial && !calm)
              Padding(
                padding: const EdgeInsets.only(top: 4),
                child: Text(
                  l10n.ledRemaining(formatMoney(context, t.amount - v, widget.currency)),
                  key: const Key('settle-remaining'),
                ),
              ),
            if (foldSecondary) ...[
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
              if (dateNote || upiOn || shareOn)
                Theme(
                  data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
                  child: ExpansionTile(
                    key: const Key('settle-more'),
                    tilePadding: EdgeInsets.zero,
                    title: const Text('More options'),
                    children: [
                      if (dateNote) ...[
                        const SizedBox(height: 8),
                        OutlinedButton(
                          key: const Key('settle-date'),
                          onPressed: _pickDate,
                          child: Text('${l10n.ledDate}: $_date'),
                        ),
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
                        Row(
                          children: [
                            Expanded(
                              child: AppButton(
                                key: const Key('settle-upi-pay'),
                                label: l10n.upiPay,
                                variant: AppButtonVariant.secondary,
                                onPressed: _payUpi,
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: AppButton(
                                key: const Key('settle-upi-apps'),
                                label: 'Apps & QR',
                                icon: Icons.qr_code_2_rounded,
                                variant: AppButtonVariant.secondary,
                                onPressed: _openUpiSheet,
                              ),
                            ),
                          ],
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
                    ],
                  ),
                ),
            ] else ...[
              if (dateNote) ...[
                const SizedBox(height: 8),
                OutlinedButton(
                  key: const Key('settle-date'),
                  onPressed: _pickDate,
                  child: Text('${l10n.ledDate}: $_date'),
                ),
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
                Row(
                  children: [
                    Expanded(
                      child: AppButton(
                        key: const Key('settle-upi-pay'),
                        label: l10n.upiPay,
                        variant: AppButtonVariant.secondary,
                        onPressed: _payUpi,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: AppButton(
                        key: const Key('settle-upi-apps'),
                        label: 'Apps & QR',
                        icon: Icons.qr_code_2_rounded,
                        variant: AppButtonVariant.secondary,
                        onPressed: _openUpiSheet,
                      ),
                    ),
                  ],
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
          ],
        ),
      ),
    );
  }
}

/// Helper to show [SettleSheet] inside an [AppSheet].
Future<void> showSettleSheet({
  required BuildContext context,
  required String tripId,
  required Transfer transfer,
  required String currency,
  bool focusAmount = false,
}) async {
  await AppSheet.show<void>(
    context: context,
    builder: (_) => SettleSheet(tripId: tripId, transfer: transfer, currency: currency, focusAmount: focusAmount),
  );
}

/// Main entry point for recording settlements anywhere in the app (e.g. from FAB).
/// If there is 1 debt, directly opens [SettleSheet].
/// If there are multiple debts, opens a chooser sheet so the user can pick which debt to record.
/// If there are 0 debts, notifies the user and offers a link to the Balances tab.
Future<void> showSettlementChooserOrSheet({
  required BuildContext context,
  required WidgetRef ref,
  required String tripId,
}) async {
  final trip = ref.read(tripProvider(tripId)).value;
  final settlementResult = ref.read(tripSettlementProvider(tripId));
  final cur = trip?.baseCurrency ?? 'USD';
  final transfers = settlementResult?.transfers ?? const <Transfer>[];

  if (transfers.isEmpty) {
    if (context.mounted) {
      await AppHaptics.selection();
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('All caught up! No open balances on this trip.'),
          duration: const Duration(seconds: 4),
          action: SnackBarAction(label: 'Balances', onPressed: () => context.go('/trip/$tripId/ledger')),
        ),
      );
    }
    return;
  }

  if (transfers.length == 1) {
    await showSettleSheet(context: context, tripId: tripId, transfer: transfers.first, currency: cur);
    return;
  }

  // Multiple debts: open chooser
  final myId = ref.read(myMemberIdProvider(tripId));
  if (!context.mounted) return;
  final chosen = await AppSheet.show<Transfer>(
    context: context,
    title: 'Record a settlement',
    builder: (ctx) => _OpenDebtsList(tripId: tripId, transfers: transfers, myMemberId: myId, currency: cur),
  );

  if (chosen != null && context.mounted) {
    await showSettleSheet(context: context, tripId: tripId, transfer: chosen, currency: cur);
  }
}

class _OpenDebtsList extends StatelessWidget {
  const _OpenDebtsList({
    required this.tripId,
    required this.transfers,
    required this.myMemberId,
    required this.currency,
  });

  final String tripId;
  final List<Transfer> transfers;
  final String? myMemberId;
  final String currency;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    bool isMyPayment(Transfer t) => myMemberId != null && t.fromMemberId == myMemberId;
    bool isMyReceipt(Transfer t) => myMemberId != null && t.toMemberId == myMemberId;
    int rank(Transfer t) => isMyPayment(t) ? 0 : (isMyReceipt(t) ? 1 : 2);

    final sorted = [...transfers]..sort((a, b) => rank(a).compareTo(rank(b)));

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            'Choose an open balance to record payment:',
            style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: tokens.textSecondary),
          ),
          const SizedBox(height: 12),
          ConstrainedBox(
            constraints: BoxConstraints(maxHeight: MediaQuery.sizeOf(context).height * 0.45),
            child: ListView.separated(
              shrinkWrap: true,
              itemCount: sorted.length,
              separatorBuilder: (context, index) => const SizedBox(height: 8),
              itemBuilder: (ctx, index) {
                final t = sorted[index];
                final myPay = isMyPayment(t);
                final myRec = isMyReceipt(t);
                final tone = myPay ? BentoTone.peach : (myRec ? BentoTone.mint : BentoTone.butter);

                return Material(
                  color: tokens.tones[tone].bg,
                  borderRadius: BorderRadius.circular(16),
                  child: InkWell(
                    borderRadius: BorderRadius.circular(16),
                    onTap: () {
                      AppHaptics.selection();
                      Navigator.pop(ctx, t);
                    },
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                      child: Row(
                        children: [
                          AppAvatar(name: t.fromLabel, size: 36),
                          Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 6),
                            child: Icon(Icons.arrow_forward_rounded, size: 16, color: tokens.textMuted),
                          ),
                          AppAvatar(name: t.toLabel, size: 36),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  '${t.fromLabel} ➔ ${t.toLabel}',
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: TextStyle(
                                    fontWeight: FontWeight.w700,
                                    fontSize: 14,
                                    color: tokens.textPrimary,
                                  ),
                                ),
                                if (myPay)
                                  Text(
                                    'You owe this',
                                    style: TextStyle(
                                      fontSize: 11,
                                      fontWeight: FontWeight.w800,
                                      color: tokens.colorDanger,
                                    ),
                                  )
                                else if (myRec)
                                  Text(
                                    'Owed to you',
                                    style: TextStyle(
                                      fontSize: 11,
                                      fontWeight: FontWeight.w800,
                                      color: tokens.colorSuccess,
                                    ),
                                  ),
                              ],
                            ),
                          ),
                          Text(
                            formatMoney(context, t.amount, currency),
                            style: AppTypography.moneyDisplay(
                              fontSize: 16,
                              color: tokens.textPrimary,
                            ).copyWith(fontWeight: FontWeight.w800),
                          ),
                        ],
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
          const SizedBox(height: 14),
          OutlinedButton.icon(
            key: const Key('open-balances-from-settle-chooser'),
            icon: const Icon(Icons.account_balance_wallet_outlined, size: 18),
            label: const Text('View Full Balances Tab'),
            style: OutlinedButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: 12),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
            onPressed: () {
              AppHaptics.selection();
              Navigator.pop(context);
              context.go('/trip/$tripId/ledger');
            },
          ),
        ],
      ),
    );
  }
}
