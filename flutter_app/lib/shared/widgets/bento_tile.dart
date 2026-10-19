import 'package:flutter/material.dart';

import '../theme/app_tokens.dart';
import 'app_surface.dart';

/// A stable tone for any string key (category id, trip id…), so the same thing keeps its colour.
BentoTone toneFor(String key) =>
    BentoTone.values[key.codeUnits.fold<int>(0, (a, b) => a + b) % BentoTone.values.length];

/// A Bento tile: a large-radius block on one of the five pastel tones (or the plain white surface when
/// [tone] is null). Text on it stays ink; small labels take the tone's accent via [BentoTile.eyebrow].
class BentoTile extends StatelessWidget {
  const BentoTile({
    required this.child,
    this.tone,
    this.padding = const EdgeInsets.all(16),
    this.radius,
    this.onTap,
    this.semanticLabel,
    super.key,
  });

  final Widget child;
  final BentoTone? tone;
  final EdgeInsetsGeometry padding;
  final double? radius;
  final VoidCallback? onTap;
  final String? semanticLabel;

  /// Tinted eyebrow label for text placed on a tile of [tone].
  static Widget eyebrow(BuildContext context, BentoTone tone, String text) =>
      Eyebrow(text, color: context.tokens.tones[tone].accent);

  @override
  Widget build(BuildContext context) {
    final t = context.tokens;
    final r = BorderRadius.circular(radius ?? t.radiusLg);
    final bg = tone == null ? t.bgSurface : t.tones[tone!].bg;
    final body = Padding(padding: padding, child: child);
    final tile = Material(
      color: bg,
      borderRadius: r,
      clipBehavior: Clip.antiAlias,
      child: onTap == null ? body : InkWell(onTap: onTap, child: body),
    );
    return DefaultTextStyle.merge(
      style: TextStyle(color: t.textPrimary),
      child: IconTheme.merge(
        data: IconThemeData(color: t.textPrimary),
        child: semanticLabel == null ? tile : Semantics(container: true, label: semanticLabel, child: tile),
      ),
    );
  }
}

/// Staggered entrance for a list of tiles: each fades and rises a little after the one before it.
/// Skipped entirely when the system asks for reduced motion.
class BentoEntrance extends StatelessWidget {
  const BentoEntrance({required this.index, required this.child, super.key});

  final int index;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    if (MediaQuery.disableAnimationsOf(context)) return child;
    final begin = (index * 0.12).clamp(0.0, 0.6);
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0, end: 1),
      duration: const Duration(milliseconds: 650),
      curve: Interval(begin, 1, curve: Curves.easeOutCubic),
      builder: (context, v, child) => Opacity(
        opacity: v.clamp(0.0, 1.0),
        child: Transform.translate(offset: Offset(0, (1 - v) * 18), child: child),
      ),
      child: child,
    );
  }
}
