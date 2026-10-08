import 'package:flutter/material.dart';

import '../theme/app_tokens.dart';

/// Horizon app mark: cobalt gradient squircle with a plane. [size] is the outer edge.
class BrandMark extends StatelessWidget {
  const BrandMark({this.size = 72, super.key});

  final double size;

  @override
  Widget build(BuildContext context) {
    final t = context.tokens;
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        gradient: AppTokens.ctaGradient,
        borderRadius: BorderRadius.circular(size * 0.3),
        boxShadow: [
          BoxShadow(
            color: t.primaryAccent.withValues(alpha: 0.4),
            blurRadius: size * 0.4,
            offset: Offset(0, size * 0.14),
          ),
        ],
      ),
      child: Icon(Icons.flight_takeoff_rounded, size: size * 0.5, color: Colors.white),
    );
  }
}
