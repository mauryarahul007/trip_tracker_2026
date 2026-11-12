import 'dart:async';

import 'package:flutter/material.dart';

import '../../../../l10n/l10n_ext.dart';
import '../../../../shared/theme/app_tokens.dart';
import '../../../../shared/theme/app_typography.dart';
import '../../../../shared/widgets/app_sheet.dart';
import '../../../../core/platform/haptics.dart';

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
  const AmountKeypad({required this.initial, required this.onChanged, this.onDone, this.docked = false, super.key});

  final String initial;
  final ValueChanged<String> onChanged;

  /// Done: closes the sheet by default; the docked keypad (flag `enableDockedKeypad`) passes its own.
  final VoidCallback? onDone;

  /// Docked under the add-expense form: no big display (the amount field above shows it) and shorter keys.
  final bool docked;

  @override
  State<AmountKeypad> createState() => _AmountKeypadState();
}

class _AmountKeypadState extends State<AmountKeypad> {
  late String _text = widget.initial;

  @override
  void didUpdateWidget(AmountKeypad old) {
    super.didUpdateWidget(old);
    // A quick-amount chip or "repeat last" changed the amount from outside: type on from there.
    if (widget.initial != _text) _text = widget.initial;
  }

  void _set(String v) {
    setState(() => _text = v);
    widget.onChanged(v);
    unawaited(AppHaptics.selection());
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
    final keyHeight = widget.docked ? 48.0 : 56.0;
    return Padding(
      key: Key(widget.docked ? 'docked-keypad' : 'amount-keypad'),
      padding: EdgeInsets.fromLTRB(16, widget.docked ? 8 : 0, 16, widget.docked ? 8 : 16),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (!widget.docked)
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
                          height: keyHeight,
                          child: _KeypadKey(
                            key: Key('key-$k'),
                            label: k,
                            // Operators and delete read as secondary to the digits.
                            isDigit: !'÷×-+⌫'.contains(k),
                            onTap: () => _key(k),
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            ),
          const SizedBox(height: 4),
          _KeypadDone(
            key: const Key('keypad-done'),
            label: context.l10n.keypadDone,
            onTap: widget.onDone ?? () => Navigator.pop(context),
          ),
        ],
      ),
    );
  }
}

/// Token-styled key: bgSurface fill, borderColor outline, 48dp+ target (replaces the stock tonal FilledButton).
class _KeypadKey extends StatelessWidget {
  const _KeypadKey({required this.label, required this.isDigit, required this.onTap, super.key});

  final String label;
  final bool isDigit;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final t = context.tokens;
    final radius = BorderRadius.circular(t.radiusMd);
    return Semantics(
      button: true,
      label: label,
      excludeSemantics: true,
      onTap: onTap,
      child: Material(
        color: isDigit ? t.bgSurface : t.bgSurfaceHover,
        shape: RoundedRectangleBorder(
          borderRadius: radius,
          side: BorderSide(color: t.borderColor),
        ),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
          child: Center(
            child: Text(
              label,
              style: TextStyle(
                fontFamily: AppTypography.fontTitle,
                fontSize: 22,
                fontWeight: FontWeight.w700,
                color: t.textPrimary,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Done: primaryAccent fill with whichever of white / textPrimary reads better on it.
class _KeypadDone extends StatelessWidget {
  const _KeypadDone({required this.label, required this.onTap, super.key});

  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final t = context.tokens;
    final bg = t.primaryAccent;
    // Pick the label colour with the higher WCAG contrast against the accent.
    double ratio(Color a, Color b) {
      final l1 = a.computeLuminance(), l2 = b.computeLuminance();
      return (l1 > l2 ? l1 + 0.05 : l2 + 0.05) / (l1 > l2 ? l2 + 0.05 : l1 + 0.05);
    }

    final fg = ratio(bg, Colors.white) >= ratio(bg, t.textPrimary) ? Colors.white : t.textPrimary;
    return Semantics(
      button: true,
      label: label,
      excludeSemantics: true,
      onTap: onTap,
      child: ConstrainedBox(
        constraints: const BoxConstraints(minHeight: 48),
        child: Material(
          color: bg,
          shape: const StadiumBorder(),
          clipBehavior: Clip.antiAlias,
          child: InkWell(
            onTap: onTap,
            child: SizedBox(
              width: double.infinity,
              height: 52,
              child: Center(
                child: Text(
                  label,
                  style: TextStyle(color: fg, fontSize: 16, fontWeight: FontWeight.w700),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
