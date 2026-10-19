import 'package:flutter/material.dart';

import '../../../../core/format/money.dart';
import '../../../../domain/logic/currency.dart';
import '../../../../domain/logic/expense_form_logic.dart';
import '../../../../domain/models/member.dart';
import '../../../../l10n/l10n_ext.dart';
import '../../../../shared/theme/app_tokens.dart';
import '../../../../shared/widgets/app_button.dart';
import '../../../../shared/widgets/app_text_field.dart';
import '../../application/expense_form_controller.dart' show defaultRateCurrencies;

/// Currency list: the web's popular currencies plus the trip's own.
class CurrencyPickerSheet extends StatelessWidget {
  const CurrencyPickerSheet({required this.selected, required this.base, required this.onPick, super.key});
  final String selected;
  final String base;
  final ValueChanged<String> onPick;

  @override
  Widget build(BuildContext context) {
    final codes = {base, ...defaultRateCurrencies, selected}.toList();
    return ConstrainedBox(
      constraints: BoxConstraints(maxHeight: MediaQuery.sizeOf(context).height * 0.6),
      child: Material(
        type: MaterialType.transparency,
        child: ListView(
          shrinkWrap: true,
          children: [
            for (final c in codes)
              ListTile(
                key: Key('currency-$c'),
                title: Text('$c  ${getCurrencySymbol(c) == c ? '' : getCurrencySymbol(c)}'),
                trailing: c == selected ? const Icon(Icons.check_rounded) : null,
                onTap: () {
                  onPick(c);
                  Navigator.of(context).pop();
                },
              ),
          ],
        ),
      ),
    );
  }
}

/// Per-trip custom rate for [code] → [base] (stored in the trip's FX config).
class FxRateSheet extends StatefulWidget {
  const FxRateSheet({
    required this.code,
    required this.base,
    required this.customRates,
    this.liveRates = const {},
    required this.onSave,
    super.key,
  });
  final String code;
  final String base;
  final Map<String, double> customRates;
  final Map<String, double> liveRates;

  /// Receives the new full map of custom rates.
  final ValueChanged<Map<String, double>> onSave;

  @override
  State<FxRateSheet> createState() => _FxRateSheetState();
}

class _FxRateSheetState extends State<FxRateSheet> {
  late final _c = TextEditingController(text: _current == null ? '' : _current.toString());

  /// 1 [code] in [base] under the rates in force (custom rates win).
  double? get _current {
    final r = convertCurrency(
      1,
      widget.code,
      widget.base,
      fxOverlay(live: widget.liveRates, custom: widget.customRates),
    );
    return r.rate;
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  // Custom rates are stored per currency against USD (the web's table), so a direct
  // code→base rate is converted to the code's USD rate.
  void _save() {
    final v = jsParseFloat(_c.text);
    if (v.isNaN || v <= 0) return;
    final rates = {...defaultExchangeRates, ...widget.liveRates, ...widget.customRates};
    final baseRate = rates[widget.base] ?? 1.0;
    // 1 code = v base  =>  codeRate(per USD) = baseRate / v
    final next = {...widget.customRates, widget.code: baseRate / v};
    widget.onSave(next);
    Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final tokens = context.tokens;
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 4, 20, 20),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(l10n.formFxCurrent((_current ?? 0).toString()), style: TextStyle(color: tokens.textSecondary)),
          const SizedBox(height: 12),
          AppTextField(
            controller: _c,
            label: l10n.formFxLabel(widget.code, widget.base),
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            autofocus: true,
          ),
          const SizedBox(height: 16),
          AppButton(label: l10n.formSave, isFullWidth: true, onPressed: _save),
          if (widget.customRates.containsKey(widget.code))
            TextButton(
              onPressed: () {
                widget.onSave({...widget.customRates}..remove(widget.code));
                Navigator.of(context).pop();
              },
              child: Text(l10n.formFxDefault),
            ),
        ],
      ),
    );
  }
}

/// "How each share is worked out": the resolver's numbers with their working.
class ExplainSharesSheet extends StatelessWidget {
  const ExplainSharesSheet({required this.input, required this.members, super.key});
  final ExpenseFormInput input;
  final Map<String, Member> members;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final tokens = context.tokens;
    final lines = explainShares(input);
    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          for (final e in lines)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 6),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          members[e.memberId]?.name ?? l10n.rowRemovedMember,
                          style: TextStyle(fontWeight: FontWeight.w600, color: tokens.textPrimary),
                        ),
                        Text(
                          e.formula,
                          key: Key('explain-${e.memberId}'),
                          style: TextStyle(fontSize: 12, color: tokens.textMuted),
                        ),
                      ],
                    ),
                  ),
                  Text(
                    formatMoney(context, e.amount, input.currency),
                    style: TextStyle(fontWeight: FontWeight.w700, color: tokens.textPrimary),
                  ),
                ],
              ),
            ),
          const SizedBox(height: 8),
          Text(l10n.formExplainRounding, style: TextStyle(fontSize: 12, color: tokens.textMuted, height: 1.4)),
        ],
      ),
    );
  }
}
