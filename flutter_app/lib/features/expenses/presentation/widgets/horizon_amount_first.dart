import 'package:flutter/material.dart';

import '../../../../core/platform/haptics.dart';
import '../../../../l10n/l10n_ext.dart';
import '../../../../shared/theme/app_tokens.dart';
import '../../../../shared/theme/app_typography.dart';

/// One chip under "What for?" on the Horizon amount-first form: Food, You paid, Equal · 5, Receipt.
class HorizonFormChip {
  const HorizonFormChip(this.key, this.icon, this.label, this.onTap, {this.tone});
  final String key;
  final Widget icon;
  final String label;
  final VoidCallback? onTap;

  /// Tinted like the category (Food) when set; otherwise the blue tint.
  final BentoTone? tone;
}

/// Horizon add expense (flag `enableHorizonUi`): opens on the amount. Big amount, "What for?", chips that open
/// the payer / category / split choices, a number pad and one sticky "Save · ₹480 each" button.
class HorizonAmountFirst extends StatelessWidget {
  const HorizonAmountFirst({
    super.key,
    required this.amountText,
    required this.symbol,
    required this.titleController,
    required this.onTitleChanged,
    required this.chips,
    required this.onKey,
    required this.saveLabel,
    required this.onSave,
    required this.onMore,
    this.subLine,
    this.error,
    this.hint = '0',
  });

  /// What was typed so far ("2400"), empty for none.
  final String amountText;
  final String symbol;

  /// "≈ €26.80 · INR", or the evaluated sum; null hides it.
  final String? subLine;
  final String? error;
  final String hint;
  final TextEditingController titleController;
  final ValueChanged<String> onTitleChanged;
  final List<HorizonFormChip> chips;

  /// A digit, "." or "back".
  final ValueChanged<String> onKey;
  final String saveLabel;
  final VoidCallback? onSave;

  /// Opens every other field (date, split modes, notes).
  final VoidCallback onMore;

  static String _group(String raw) {
    if (raw.isEmpty) return raw;
    final parts = raw.split('.');
    final whole = parts.first;
    final b = StringBuffer();
    // Indian grouping (12,34,567) like the rest of the app's rupee amounts.
    if (whole.length > 3) {
      final last3 = whole.substring(whole.length - 3);
      var rest = whole.substring(0, whole.length - 3);
      final chunks = <String>[];
      while (rest.length > 2) {
        chunks.insert(0, rest.substring(rest.length - 2));
        rest = rest.substring(0, rest.length - 2);
      }
      if (rest.isNotEmpty) chunks.insert(0, rest);
      b
        ..write(chunks.join(','))
        ..write(',')
        ..write(last3);
    } else {
      b.write(whole);
    }
    if (parts.length > 1) b.write('.${parts[1]}');
    return b.toString();
  }

  @override
  Widget build(BuildContext context) {
    final t = context.tokens;
    final l10n = context.l10n;
    final shown = amountText.isEmpty ? hint : _group(amountText);
    Widget key(String k, {Widget? child}) => Expanded(
      child: Padding(
        padding: const EdgeInsets.all(5),
        child: Material(
          color: t.bgSurface,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
            side: BorderSide(color: t.borderColor),
          ),
          child: InkWell(
            key: Key('pad-$k'),
            borderRadius: BorderRadius.circular(14),
            onTap: () {
              AppHaptics.selection();
              onKey(k);
            },
            child: SizedBox(
              height: 54,
              child: Center(
                child:
                    child ??
                    Text(
                      k,
                      style: TextStyle(
                        fontFamily: AppTypography.fontBody,
                        fontSize: 24,
                        fontWeight: FontWeight.w600,
                        color: t.textPrimary,
                      ),
                    ),
              ),
            ),
          ),
        ),
      ),
    );
    return Column(
      key: const Key('horizon-amount-first'),
      children: [
        // The keypad sits right under the chips, as in the mockup; spare height falls below it, above Save.
        Expanded(
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  l10n.formAmount.toUpperCase(),
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontFamily: AppTypography.fontMono,
                    fontSize: 12,
                    letterSpacing: 1.4,
                    fontWeight: FontWeight.w600,
                    color: t.textMuted,
                  ),
                ),
                const SizedBox(height: 6),
                FittedBox(
                  fit: BoxFit.scaleDown,
                  child: Text(
                    '$symbol$shown',
                    key: const Key('horizon-amount'),
                    style: TextStyle(
                      fontFamily: AppTypography.fontMono,
                      fontSize: 52,
                      fontWeight: FontWeight.w700,
                      letterSpacing: -1,
                      color: amountText.isEmpty ? t.textMuted : t.textPrimary,
                    ),
                  ),
                ),
                if (subLine != null)
                  Text(
                    subLine!,
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 13, color: t.textSecondary),
                  ),
                if (error != null)
                  Padding(
                    padding: const EdgeInsets.only(top: 6),
                    child: Text(
                      error!,
                      key: const Key('horizon-form-error'),
                      textAlign: TextAlign.center,
                      style: TextStyle(fontSize: 13, color: t.colorDanger),
                    ),
                  ),
                const SizedBox(height: 16),
                TextField(
                  key: const Key('title-field'),
                  controller: titleController,
                  textCapitalization: TextCapitalization.sentences,
                  decoration: InputDecoration(
                    labelText: l10n.horizonWhatFor,
                    hintText: l10n.formWhatHint,
                    floatingLabelBehavior: FloatingLabelBehavior.always,
                  ),
                  onChanged: onTitleChanged,
                ),
                const SizedBox(height: 12),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    for (final c in chips)
                      ActionChip(
                        key: Key(c.key),
                        avatar: c.icon,
                        label: Text(c.label),
                        backgroundColor: c.tone == null ? t.primaryAccentLight : t.tones[c.tone!].bg,
                        side: BorderSide.none,
                        labelStyle: TextStyle(
                          fontFamily: AppTypography.fontBody,
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: c.tone == null ? t.primaryAccent : t.tones[c.tone!].accent,
                        ),
                        onPressed: c.onTap,
                      ),
                  ],
                ),
                Align(
                  alignment: Alignment.centerLeft,
                  child: TextButton(
                    key: const Key('horizon-more-details'),
                    onPressed: onMore,
                    child: Text(l10n.formMoreDetails),
                  ),
                ),
                Padding(
                  padding: EdgeInsets.zero,
                  child: Column(
                    children: [
                      for (final row in const [
                        ['1', '2', '3'],
                        ['4', '5', '6'],
                        ['7', '8', '9'],
                      ])
                        Row(children: [for (final k in row) key(k)]),
                      Row(
                        children: [
                          key('.'),
                          key('0'),
                          key('back', child: Icon(Icons.backspace_outlined, color: t.textPrimary)),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
        SafeArea(
          top: false,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 10, 16, 12),
            child: SizedBox(
              width: double.infinity,
              height: 54,
              child: FilledButton(
                key: const Key('save'),
                style: FilledButton.styleFrom(
                  backgroundColor: t.primaryAccent,
                  foregroundColor: t.ctaFg,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  textStyle: const TextStyle(
                    fontFamily: AppTypography.fontBody,
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                onPressed: onSave,
                child: Text(saveLabel),
              ),
            ),
          ),
        ),
      ],
    );
  }
}
