import 'package:flutter/material.dart';

import '../../../../domain/models/member.dart';
import '../../../../l10n/l10n_ext.dart';
import '../../../../shared/theme/app_tokens.dart';
import '../../../../shared/theme/app_typography.dart';
import '../../../../shared/widgets/app_avatar.dart';

/// Horizon (flag `enableHorizonUi`) split page for a new expense: "Split ₹2,400", an Equal / Shares / Exact / %
/// switch, one row per person with a tick and an amount box, a "left to assign" bar and Reset / Done.
/// It only reads and writes the expense form's own split state, so what it saves is what the full form saves.
class HorizonSplitView extends StatelessWidget {
  const HorizonSplitView({
    required this.title,
    required this.modes,
    required this.mode,
    required this.onMode,
    required this.members,
    required this.selected,
    required this.config,
    required this.epoch,
    required this.symbol,
    required this.shareLabel,
    required this.meMemberId,
    required this.onToggle,
    required this.onConfig,
    required this.warning,
    required this.canFinish,
    required this.finishLabel,
    required this.onReset,
    this.coversNote,
    this.onApplyCovers,
    required this.onFinish,
    required this.onBack,
    super.key,
  });

  /// "Split ₹2,400".
  final String title;

  /// (mode id, label) pairs the trip allows, e.g. equal, custom (shares), exact, percentage.
  final List<(String, String)> modes;
  final String mode;
  final ValueChanged<String> onMode;
  final List<Member> members;
  final Map<String, bool> selected;
  final Map<String, String> config;

  /// Bumps when the form resets its inputs, so the amount boxes pick up new text.
  final int epoch;
  final String symbol;

  /// What a ticked person pays in Equal mode ("₹800.00"), or null.
  final String? Function(String memberId) shareLabel;
  final String? meMemberId;
  final ValueChanged<String> onToggle;
  final void Function(String memberId, String value) onConfig;

  /// "₹300 left to assign" while Exact or % doesn't add up; null when it does.
  final String? warning;
  final bool canFinish;
  final String finishLabel;
  final VoidCallback onReset;

  /// Couples count as 2: "Rahul pays for Anita" when the split still charges a covered member; null hides it.
  final String? coversNote;
  final VoidCallback? onApplyCovers;
  final VoidCallback onFinish;
  final VoidCallback onBack;

  @override
  Widget build(BuildContext context) {
    final t = context.tokens;
    final l10n = context.l10n;
    final needsInput = mode == 'custom' || mode == 'exact' || mode == 'percentage';
    return Scaffold(
      key: const Key('horizon-split'),
      backgroundColor: t.bgPage,
      appBar: AppBar(
        backgroundColor: t.bgPage,
        surfaceTintColor: Colors.transparent,
        leading: IconButton(
          key: const Key('horizon-split-back'),
          tooltip: MaterialLocalizations.of(context).backButtonTooltip,
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: onBack,
        ),
        title: Text(
          title,
          key: const Key('horizon-split-title'),
          style: TextStyle(
            fontFamily: AppTypography.fontTitle,
            fontSize: 20,
            fontWeight: FontWeight.w700,
            color: t.textPrimary,
          ),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 4, 16, 16),
        children: [
          if (modes.length > 1)
            Container(
              padding: const EdgeInsets.all(4),
              decoration: BoxDecoration(color: t.bgSurfaceHover, borderRadius: BorderRadius.circular(14)),
              child: Row(
                children: [
                  for (final m in modes)
                    Expanded(
                      child: GestureDetector(
                        key: Key('split-mode-${m.$1}'),
                        behavior: HitTestBehavior.opaque,
                        onTap: () => onMode(m.$1),
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 150),
                          padding: const EdgeInsets.symmetric(vertical: 10),
                          decoration: BoxDecoration(
                            color: m.$1 == mode ? t.bgSurface : Colors.transparent,
                            borderRadius: BorderRadius.circular(10),
                            boxShadow: m.$1 == mode
                                ? [
                                    BoxShadow(
                                      color: t.shadowBase.withValues(alpha: 0.08),
                                      blurRadius: 6,
                                      offset: const Offset(0, 1),
                                    ),
                                  ]
                                : null,
                          ),
                          child: Text(
                            m.$1 == 'percentage' ? '%' : m.$2,
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              fontFamily: AppTypography.fontBody,
                              fontSize: 14,
                              fontWeight: m.$1 == mode ? FontWeight.w700 : FontWeight.w500,
                              color: m.$1 == mode ? t.textPrimary : t.textSecondary,
                            ),
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            ),
          if (coversNote != null)
            Padding(
              padding: const EdgeInsets.only(top: 12),
              child: Material(
                color: t.primaryAccent.withValues(alpha: 0.10),
                borderRadius: BorderRadius.circular(12),
                child: InkWell(
                  key: const Key('horizon-apply-covers'),
                  borderRadius: BorderRadius.circular(12),
                  onTap: onApplyCovers,
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                    child: Row(
                      children: [
                        Icon(Icons.favorite_border_rounded, size: 18, color: t.primaryAccent),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            coversNote!,
                            style: TextStyle(fontFamily: AppTypography.fontBody, fontSize: 14, color: t.textPrimary),
                          ),
                        ),
                        Text(
                          'Apply',
                          style: TextStyle(
                            fontFamily: AppTypography.fontBody,
                            fontSize: 14,
                            fontWeight: FontWeight.w700,
                            color: t.primaryAccent,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          if (warning != null)
            Container(
              key: const Key('horizon-left-to-assign'),
              margin: const EdgeInsets.only(top: 12),
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              decoration: BoxDecoration(
                color: t.colorWarning.withValues(alpha: 0.14),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                children: [
                  Icon(Icons.warning_amber_rounded, size: 18, color: t.colorWarning),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      warning!,
                      style: TextStyle(
                        fontFamily: AppTypography.fontBody,
                        fontWeight: FontWeight.w600,
                        color: t.colorWarning,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          const SizedBox(height: 12),
          Container(
            decoration: BoxDecoration(
              color: t.bgSurface,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: t.borderColor),
            ),
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
            child: Column(
              children: [
                for (var i = 0; i < members.length; i++) ...[
                  if (i > 0) Divider(height: 1, color: t.borderColor),
                  _row(context, members[i], needsInput),
                ],
              ],
            ),
          ),
          if (mode == 'custom')
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Text(l10n.formSharesWeights, style: TextStyle(fontSize: 12, color: t.textMuted)),
            ),
        ],
      ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
          child: Row(
            children: [
              SizedBox(
                height: 54,
                child: OutlinedButton(
                  key: const Key('horizon-split-reset'),
                  style: OutlinedButton.styleFrom(
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    textStyle: const TextStyle(
                      fontFamily: AppTypography.fontBody,
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  onPressed: onReset,
                  child: Text(l10n.horizonSplitReset),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: SizedBox(
                  height: 54,
                  child: FilledButton(
                    key: const Key('horizon-split-done'),
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
                    onPressed: canFinish ? onFinish : null,
                    child: Text(finishLabel),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _row(BuildContext context, Member m, bool needsInput) {
    final t = context.tokens;
    final l10n = context.l10n;
    final on = selected[m.id] == true;
    final share = on ? shareLabel(m.id) : null;
    return InkWell(
      key: Key('split-${m.id}'),
      onTap: () => onToggle(m.id),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 8),
        child: Row(
          children: [
            Checkbox(value: on, onChanged: (_) => onToggle(m.id)),
            AppAvatar(name: m.name, avatarUrl: m.avatarUrl, size: 32),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                m.id == meMemberId ? l10n.horizonYou : m.name,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontFamily: AppTypography.fontBody,
                  fontSize: 15,
                  fontWeight: FontWeight.w600,
                  color: on ? t.textPrimary : t.textMuted,
                ),
              ),
            ),
            if (on && needsInput)
              SizedBox(
                width: 104,
                child: TextFormField(
                  key: ValueKey('cfg-${m.id}-$mode-$epoch'),
                  initialValue: config[m.id],
                  textAlign: TextAlign.right,
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  style: TextStyle(
                    fontFamily: AppTypography.fontMono,
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                    color: t.textPrimary,
                  ),
                  decoration: InputDecoration(
                    isDense: true,
                    prefixText: mode == 'exact' ? symbol : null,
                    suffixText: mode == 'percentage' ? '%' : (mode == 'custom' ? '×' : null),
                    hintText: '0',
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(999)),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  ),
                  onChanged: (v) => onConfig(m.id, v),
                ),
              )
            else
              Text(
                share ?? '—',
                key: Key('split-share-${m.id}'),
                style: TextStyle(
                  fontFamily: AppTypography.fontMono,
                  fontSize: 15,
                  fontWeight: FontWeight.w600,
                  color: on ? t.textPrimary : t.textMuted,
                ),
              ),
          ],
        ),
      ),
    );
  }
}
