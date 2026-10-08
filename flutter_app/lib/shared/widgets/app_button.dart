import 'package:flutter/material.dart';

import '../theme/app_tokens.dart';

/// White or near-black, whichever reads better on [bg] (WCAG ratio). The dark theme's bright
/// teal made white labels 2.0:1; found by the Phase 12 accessibility test.
Color _readableOn(Color bg) {
  const light = Colors.white;
  const dark = Color(0xFF0D0E10);
  double ratio(Color a, Color b) {
    final l1 = a.computeLuminance(), l2 = b.computeLuminance();
    return (l1 > l2 ? l1 + 0.05 : l2 + 0.05) / (l1 > l2 ? l2 + 0.05 : l1 + 0.05);
  }

  return ratio(bg, light) >= ratio(bg, dark) ? light : dark;
}

enum AppButtonVariant { primary, secondary, danger, ghost }

class AppButton extends StatelessWidget {
  final String label;
  final VoidCallback? onPressed;
  final AppButtonVariant variant;
  final IconData? icon;
  final bool isLoading;
  final bool isFullWidth;

  const AppButton({
    super.key,
    required this.label,
    this.onPressed,
    this.variant = AppButtonVariant.primary,
    this.icon,
    this.isLoading = false,
    this.isFullWidth = false,
  });

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;

    Color bg;
    Color fg;
    BorderSide border = BorderSide.none;

    switch (variant) {
      case AppButtonVariant.primary:
        // Horizon cobalt gradient (AppTokens.ctaGradient); white label is >= 5:1 on every stop.
        bg = AppTokens.ctaGradient.colors.last;
        fg = Colors.white;
        break;
      case AppButtonVariant.secondary:
        bg = tokens.bgSurface;
        fg = tokens.textPrimary;
        border = BorderSide(color: tokens.borderColor);
        break;
      case AppButtonVariant.danger:
        bg = tokens.colorDanger;
        fg = _readableOn(bg);
        break;
      case AppButtonVariant.ghost:
        bg = Colors.transparent;
        fg = tokens.textSecondary;
        break;
    }

    final isEnabled = onPressed != null && !isLoading;

    final Widget content = Row(
      mainAxisSize: isFullWidth ? MainAxisSize.max : MainAxisSize.min,
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        if (isLoading) ...[
          SizedBox(
            width: 18,
            height: 18,
            child: CircularProgressIndicator(strokeWidth: 2, valueColor: AlwaysStoppedAnimation<Color>(fg)),
          ),
          const SizedBox(width: 8),
        ] else if (icon != null) ...[
          Icon(icon, size: 18, color: fg),
          const SizedBox(width: 8),
        ],
        // Flexible so long labels / 200% text scale wrap instead of overflowing.
        Flexible(
          child: Text(
            label,
            textAlign: TextAlign.center,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(color: fg, fontSize: 15, fontWeight: FontWeight.w600),
          ),
        ),
      ],
    );

    final isPrimary = variant == AppButtonVariant.primary;

    Widget button = FilledButton(
      onPressed: isEnabled ? onPressed : null,
      style: FilledButton.styleFrom(
        backgroundColor: isPrimary ? Colors.transparent : bg,
        foregroundColor: fg,
        disabledBackgroundColor: isPrimary ? Colors.transparent : bg.withValues(alpha: 0.5),
        disabledForegroundColor: fg.withValues(alpha: 0.5),
        shadowColor: Colors.transparent,
        shape: StadiumBorder(side: border),
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
        elevation: 0,
      ),
      child: content,
    );

    if (isPrimary) {
      button = Opacity(
        opacity: isEnabled ? 1 : 0.5,
        child: DecoratedBox(
          decoration: BoxDecoration(
            gradient: AppTokens.ctaGradient,
            borderRadius: BorderRadius.circular(tokens.radiusFull),
            boxShadow: isEnabled
                ? [BoxShadow(color: bg.withValues(alpha: 0.28), blurRadius: 16, offset: const Offset(0, 6))]
                : null,
          ),
          child: button,
        ),
      );
    }

    return Semantics(
      button: true,
      enabled: isEnabled,
      label: label,
      child: ConstrainedBox(
        constraints: const BoxConstraints(minHeight: 48, minWidth: 48),
        child: SizedBox(width: isFullWidth ? double.infinity : null, child: button),
      ),
    );
  }
}
