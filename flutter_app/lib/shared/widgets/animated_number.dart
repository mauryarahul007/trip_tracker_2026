import 'package:flutter/material.dart';

import '../theme/app_typography.dart';

/// Smoothly animates numeric transitions for currency values, counters, and statistics.
class AnimatedNumber extends StatelessWidget {
  const AnimatedNumber({
    super.key,
    required this.value,
    this.prefix = '',
    this.suffix = '',
    this.decimalPlaces = 2,
    this.duration = const Duration(milliseconds: 600),
    this.curve = Curves.easeOutCubic,
    this.style,
  });

  final double value;
  final String prefix;
  final String suffix;
  final int decimalPlaces;
  final Duration duration;
  final Curve curve;
  final TextStyle? style;

  @override
  Widget build(BuildContext context) {
    final effectiveStyle = (style ?? Theme.of(context).textTheme.titleLarge)?.copyWith(
      fontFeatures: AppTypography.tabularFigures,
    );

    return TweenAnimationBuilder<double>(
      tween: Tween<double>(begin: 0.0, end: value),
      duration: duration,
      curve: curve,
      builder: (context, val, _) {
        final formatted = val.toStringAsFixed(decimalPlaces);
        return Text('$prefix$formatted$suffix', style: effectiveStyle);
      },
    );
  }
}
