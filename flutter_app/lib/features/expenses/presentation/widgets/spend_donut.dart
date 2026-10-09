import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../../../shared/theme/app_tokens.dart';
import '../../../../shared/theme/app_typography.dart';

/// Donut of [values] in [colors] with a caption and total in the middle. Arcs have a small gap and round caps.
class SpendDonut extends StatelessWidget {
  const SpendDonut({
    required this.values,
    required this.colors,
    required this.centerLabel,
    required this.centerValue,
    this.size = 190,
    super.key,
  });

  final List<double> values;
  final List<Color> colors;
  final String centerLabel;
  final String centerValue;
  final double size;

  @override
  Widget build(BuildContext context) {
    final t = context.tokens;
    return SizedBox(
      width: size,
      height: size,
      child: Stack(
        alignment: Alignment.center,
        children: [
          CustomPaint(size: Size(size, size), painter: _DonutPainter(values, colors, t.borderColor)),
          Padding(
            padding: EdgeInsets.all(size * 0.22),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  centerLabel,
                  textAlign: TextAlign.center,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: t.textSecondary),
                ),
                const SizedBox(height: 2),
                FittedBox(
                  fit: BoxFit.scaleDown,
                  child: Text(centerValue, style: AppTypography.moneyDisplay(fontSize: 22, color: t.textPrimary)),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _DonutPainter extends CustomPainter {
  const _DonutPainter(this.values, this.colors, this.track);

  final List<double> values;
  final List<Color> colors;
  final Color track;

  @override
  void paint(Canvas canvas, Size size) {
    final stroke = size.width * 0.13;
    final rect = Rect.fromLTWH(stroke / 2, stroke / 2, size.width - stroke, size.height - stroke);
    canvas.drawArc(
      rect,
      0,
      math.pi * 2,
      false,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = stroke
        ..color = track,
    );
    final sum = values.fold<double>(0, (s, v) => s + v);
    if (sum <= 0) return;
    var start = -math.pi / 2;
    const gap = 0.05;
    for (var i = 0; i < values.length; i++) {
      final sweep = values[i] / sum * math.pi * 2;
      canvas.drawArc(
        rect,
        start + gap / 2,
        math.max(0.001, sweep - gap),
        false,
        Paint()
          ..style = PaintingStyle.stroke
          ..strokeWidth = stroke
          ..strokeCap = StrokeCap.round
          ..color = colors[i % colors.length],
      );
      start += sweep;
    }
  }

  @override
  bool shouldRepaint(_DonutPainter old) => old.values != values || old.colors != colors || old.track != track;
}
