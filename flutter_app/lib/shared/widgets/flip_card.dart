import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../core/platform/motion.dart';

/// A card that turns over on tap. The front sets the size; the back is laid out to the same size, so the page
/// never jumps. With reduce-motion on the faces swap without the turn.
class FlipCard extends StatelessWidget {
  const FlipCard({
    required this.front,
    required this.back,
    required this.flipped,
    required this.onTap,
    required this.label,
    super.key,
  });

  final Widget front;
  final Widget back;
  final bool flipped;
  final VoidCallback onTap;

  /// Screen-reader name of the flip action.
  final String label;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: label,
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: onTap,
        child: TweenAnimationBuilder<double>(
          tween: Tween(end: flipped ? 1.0 : 0.0),
          duration: AppMotion.of(context, const Duration(milliseconds: 450)),
          curve: Curves.easeInOutCubic,
          builder: (_, v, _) {
            final showFront = v < 0.5;
            Matrix4 turn(double a) => Matrix4.identity()
              ..setEntry(3, 2, 0.001)
              ..rotateY(a);
            return Stack(
              children: [
                Visibility(
                  visible: showFront,
                  maintainSize: true,
                  maintainAnimation: true,
                  maintainState: true,
                  child: Transform(alignment: Alignment.center, transform: turn(v * math.pi), child: front),
                ),
                if (!showFront)
                  Positioned.fill(
                    child: Transform(alignment: Alignment.center, transform: turn((v - 1) * math.pi), child: back),
                  ),
              ],
            );
          },
        ),
      ),
    );
  }
}
