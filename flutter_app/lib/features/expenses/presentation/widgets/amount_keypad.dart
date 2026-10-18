import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../../l10n/l10n_ext.dart';
import '../../../../shared/theme/app_tokens.dart';
import '../../../../shared/theme/app_typography.dart';
import '../../../../shared/widgets/app_button.dart';
import '../../../../shared/widgets/app_sheet.dart';

/// Big number keys for the amount: digits, a decimal point, the calculator signs and delete, so a total can be typed
/// with one thumb. [onChanged] runs on every key so the form behind it updates live; Done closes the sheet.
Future<void> showAmountKeypad(
  BuildContext context, {
  required String initial,
  required ValueChanged<String> onChanged,
}) => AppSheet.show<void>(
  context: context,
  title: context.l10n.keypadTitle,
  builder: (_) => AmountKeypad(initial: initial, onChanged: onChanged),
);

class AmountKeypad extends StatefulWidget {
  const AmountKeypad({required this.initial, required this.onChanged, super.key});

  final String initial;
  final ValueChanged<String> onChanged;

  @override
  State<AmountKeypad> createState() => _AmountKeypadState();
}

class _AmountKeypadState extends State<AmountKeypad> {
  late String _text = widget.initial;

  void _set(String v) {
    setState(() => _text = v);
    widget.onChanged(v);
    HapticFeedback.selectionClick();
  }

  /// What a key types: the calculator reads * and /, the key faces show × and ÷.
  static String _char(String k) => switch (k) {
    '×' => '*',
    '÷' => '/',
    _ => k,
  };

  static const _ops = '+-*/';

  void _key(String label) {
    final k = _char(label);
    if (k == '⌫') return _set(_text.isEmpty ? '' : _text.substring(0, _text.length - 1));
    // One decimal point per number: look at what follows the last operator.
    if (k == '.') {
      final tail = _text.split(RegExp(r'[+\-*/]')).last;
      if (tail.contains('.')) return;
      return _set(tail.isEmpty ? '${_text}0.' : '$_text.');
    }
    // No two signs in a row: a new sign replaces the last one.
    if (_ops.contains(k) && _text.isNotEmpty && _ops.contains(_text[_text.length - 1])) {
      return _set('${_text.substring(0, _text.length - 1)}$k');
    }
    if (_ops.contains(k) && _text.isEmpty) return;
    _set('$_text$k');
  }

  @override
  Widget build(BuildContext context) {
    final t = context.tokens;
    const rows = [
      ['7', '8', '9', '÷'],
      ['4', '5', '6', '×'],
      ['1', '2', '3', '-'],
      ['.', '0', '⌫', '+'],
    ];
    return Padding(
      key: const Key('amount-keypad'),
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(vertical: 10),
            alignment: Alignment.center,
            child: FittedBox(
              fit: BoxFit.scaleDown,
              child: Text(
                _text.isEmpty ? '0' : _text.replaceAll('*', '×').replaceAll('/', '÷'),
                key: const Key('keypad-display'),
                style: AppTypography.moneyDisplay(fontSize: 40, color: _text.isEmpty ? t.textMuted : t.textPrimary),
              ),
            ),
          ),
          for (final row in rows)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Row(
                children: [
                  for (final k in row)
                    Expanded(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 4),
                        child: SizedBox(
                          height: 56,
                          child: FilledButton.tonal(
                            key: Key('key-$k'),
                            onPressed: () => _key(k),
                            child: Text(k, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w700)),
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            ),
          const SizedBox(height: 4),
          AppButton(
            key: const Key('keypad-done'),
            label: context.l10n.keypadDone,
            onPressed: () => Navigator.pop(context),
          ),
        ],
      ),
    );
  }
}
