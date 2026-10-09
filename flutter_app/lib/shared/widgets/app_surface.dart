import 'package:flutter/material.dart';

import '../theme/app_tokens.dart';
import '../theme/app_typography.dart';

/// Which Horizon context surface a [HeroSurface] paints.
enum SurfaceKind { night, ember, slate, dusk }

/// Dark gradient hero card (Night Sky = travel, Ember = money, Slate = insights, Dusk = Wrapped).
/// Children render in white; wrap text colours explicitly if you need something else.
class HeroSurface extends StatelessWidget {
  const HeroSurface({
    required this.child,
    this.kind = SurfaceKind.night,
    this.padding = const EdgeInsets.all(20),
    this.radius,
    super.key,
  });

  final Widget child;
  final SurfaceKind kind;
  final EdgeInsetsGeometry padding;
  final double? radius;

  LinearGradient _gradient() => switch (kind) {
    SurfaceKind.night => AppTokens.nightSkyGradient,
    SurfaceKind.ember => AppTokens.emberGradient,
    SurfaceKind.slate => AppTokens.slateGradient,
    SurfaceKind.dusk => AppTokens.duskGradient,
  };

  @override
  Widget build(BuildContext context) {
    final t = context.tokens;
    final r = BorderRadius.circular(radius ?? t.radiusLg);
    return DecoratedBox(
      decoration: BoxDecoration(gradient: _gradient(), borderRadius: r, boxShadow: t.shadowLg),
      child: Padding(
        padding: padding,
        child: DefaultTextStyle.merge(
          style: const TextStyle(color: Colors.white),
          child: IconTheme.merge(
            data: const IconThemeData(color: Colors.white),
            child: child,
          ),
        ),
      ),
    );
  }
}

/// Soft white card: surface colour, large radius, resting shadow, no border (Horizon `.card`).
class AppCard extends StatelessWidget {
  const AppCard({required this.child, this.padding = const EdgeInsets.all(16), this.onTap, this.color, super.key});

  final Widget child;
  final EdgeInsetsGeometry padding;
  final VoidCallback? onTap;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final t = context.tokens;
    final r = BorderRadius.circular(t.radiusMd);
    final body = Padding(padding: padding, child: child);
    // Material (not a coloured DecoratedBox) so ListTile/InkWell children paint ink on the card.
    return DecoratedBox(
      decoration: BoxDecoration(borderRadius: r, boxShadow: t.shadowSm),
      child: Material(
        color: color ?? t.bgSurface,
        borderRadius: r,
        clipBehavior: Clip.antiAlias,
        child: onTap == null ? body : InkWell(onTap: onTap, child: body),
      ),
    );
  }
}

/// Tracked, uppercase section label; pass a tile accent colour to tint it (Bento eyebrow).
class Eyebrow extends StatelessWidget {
  const Eyebrow(this.text, {this.color, super.key});

  final String text;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    return Text(
      text.toUpperCase(),
      style: TextStyle(
        fontFamily: AppTypography.fontBody,
        fontSize: 12,
        fontWeight: FontWeight.w700,
        letterSpacing: 0.8,
        color: color ?? context.tokens.textMuted,
      ),
    );
  }
}

/// Big money figure with the decimals dimmed: "₹84,320" + ".00".
class MoneyText extends StatelessWidget {
  const MoneyText({
    required this.whole,
    this.decimals = '.00',
    this.fontSize = 44,
    this.color,
    this.glow = false,
    super.key,
  });

  final String whole;
  final String? decimals;
  final double fontSize;
  final Color? color;

  /// Neon halo behind the digits (boarding-pass hero).
  final bool glow;

  @override
  Widget build(BuildContext context) {
    final c = color ?? context.tokens.textPrimary;
    var base = AppTypography.moneyDisplay(fontSize: fontSize, color: c);
    if (glow) base = base.copyWith(shadows: [Shadow(color: c.withValues(alpha: 0.55), blurRadius: 18)]);
    return Text.rich(
      TextSpan(
        text: whole,
        style: base,
        children: [
          if (decimals != null)
            TextSpan(
              text: decimals,
              style: base.copyWith(color: c.withValues(alpha: 0.45)),
            ),
        ],
      ),
    );
  }
}
