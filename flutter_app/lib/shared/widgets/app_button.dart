import 'package:flutter/material.dart';

import '../../core/platform/motion.dart';
import '../theme/app_tokens.dart';
import '../theme/app_colors.dart';

/// White or near-black, whichever reads better on [bg] (WCAG ratio). The dark theme's bright
/// teal made white labels 2.0:1; found by the Phase 12 accessibility test.
Color _readableOn(Color bg) {
  const light = Colors.white;
  const dark = AppColors.calmNightDeep;
  double ratio(Color a, Color b) {
    final l1 = a.computeLuminance(), l2 = b.computeLuminance();
    return (l1 > l2 ? l1 + 0.05 : l2 + 0.05) / (l1 > l2 ? l2 + 0.05 : l1 + 0.05);
  }

  return ratio(bg, light) >= ratio(bg, dark) ? light : dark;
}

enum AppButtonVariant { primary, secondary, danger, ghost }

class AppButton extends StatefulWidget {
  final String label;
  final VoidCallback? onPressed;
  final AppButtonVariant variant;
  final IconData? icon;

  /// Custom leading widget (e.g. a brand glyph); takes precedence over [icon].
  final Widget? leading;
  final bool isLoading;
  final bool isFullWidth;

  const AppButton({
    super.key,
    required this.label,
    this.onPressed,
    this.variant = AppButtonVariant.primary,
    this.icon,
    this.leading,
    this.isLoading = false,
    this.isFullWidth = false,
  });

  @override
  State<AppButton> createState() => _AppButtonState();
}

class _AppButtonState extends State<AppButton> {
  bool _pressed = false;

  void _setPressed(bool v) {
    if (!mounted || _pressed == v) return;
    setState(() => _pressed = v);
  }

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final label = widget.label;
    final onPressed = widget.onPressed;
    final variant = widget.variant;
    final icon = widget.icon;
    final leading = widget.leading;
    final isLoading = widget.isLoading;
    final isFullWidth = widget.isFullWidth;

    Color bg;
    Color fg;
    BorderSide border = BorderSide.none;

    switch (variant) {
      case AppButtonVariant.primary:
        // Bento: solid ink (cream in dark) with a contrasting label.
        bg = tokens.ctaBg;
        fg = tokens.ctaFg;
        break;
      case AppButtonVariant.secondary:
        bg = tokens.bgSurface;
        fg = tokens.textPrimary;
        border = BorderSide(color: tokens.textPrimary, width: 1.5);
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
    final gap = tokens.spaceSm;

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
          SizedBox(width: gap),
        ] else if (leading != null) ...[
          leading,
          SizedBox(width: gap),
        ] else if (icon != null) ...[
          Icon(icon, size: 18, color: fg),
          SizedBox(width: gap),
        ],
        // Flexible so long labels / 200% text scale wrap instead of overflowing.
        Flexible(
          child: Text(
            label,
            textAlign: TextAlign.center,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(color: fg, fontSize: 16, fontWeight: FontWeight.w700),
          ),
        ),
      ],
    );

    final button = FilledButton(
      onPressed: isEnabled ? onPressed : null,
      style: FilledButton.styleFrom(
        backgroundColor: bg,
        foregroundColor: fg,
        disabledBackgroundColor: bg.withValues(alpha: 0.5),
        disabledForegroundColor: fg.withValues(alpha: 0.5),
        shadowColor: Colors.transparent,
        shape: StadiumBorder(side: border),
        padding: EdgeInsets.symmetric(horizontal: 22, vertical: tokens.spaceMd),
        elevation: 0,
      ),
      child: content,
    );

    final animate = AppMotion.shouldAnimate(context) && isEnabled;
    final scaled = AnimatedScale(
      scale: animate && _pressed ? AppMotion.pressScale : 1,
      duration: AppMotion.of(context, AppMotion.fast),
      curve: AppMotion.standard,
      child: button,
    );

    return Semantics(
      button: true,
      enabled: isEnabled,
      label: label,
      child: ConstrainedBox(
        constraints: const BoxConstraints(minHeight: 48, minWidth: 48),
        child: SizedBox(
          width: isFullWidth ? double.infinity : null,
          child: Listener(
            onPointerDown: animate ? (_) => _setPressed(true) : null,
            onPointerUp: animate ? (_) => _setPressed(false) : null,
            onPointerCancel: animate ? (_) => _setPressed(false) : null,
            child: scaled,
          ),
        ),
      ),
    );
  }
}
