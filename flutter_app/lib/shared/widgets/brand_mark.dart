import 'package:flutter/material.dart';

import '../theme/app_tokens.dart';

/// App mark: an ink squircle (cream in dark mode) with a plane. [size] is the outer edge.
class BrandMark extends StatelessWidget {
  const BrandMark({this.size = 72, super.key});

  final double size;

  @override
  Widget build(BuildContext context) {
    final t = context.tokens;
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(color: t.ctaBg, borderRadius: BorderRadius.circular(size * 0.3)),
      child: Icon(Icons.flight_takeoff_rounded, size: size * 0.5, color: t.ctaFg),
    );
  }
}
