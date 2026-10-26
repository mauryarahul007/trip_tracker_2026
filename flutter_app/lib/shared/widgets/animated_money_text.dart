import 'package:flutter/material.dart';

import '../../core/platform/motion.dart';

/// A money figure that counts to its new value (about 0.4 s) when [value] changes, such as a balance after an
/// expense is added. The first build shows the figure as it is, with no animation. [format] turns each step into the
/// text (currency, grouping), so the figure reads the same as everywhere else. Reduce motion jumps straight to it.
class AnimatedMoneyText extends StatelessWidget {
  const AnimatedMoneyText({required this.value, required this.format, this.style, this.textAlign, super.key});

  final double value;
  final String Function(double value) format;
  final TextStyle? style;
  final TextAlign? textAlign;

  @override
  Widget build(BuildContext context) => TweenAnimationBuilder<double>(
    tween: Tween<double>(end: value),
    duration: AppMotion.of(context, const Duration(milliseconds: 400)),
    curve: Curves.easeOutCubic,
    builder: (_, v, _) => Text(format(v), style: style, textAlign: textAlign),
  );
}
