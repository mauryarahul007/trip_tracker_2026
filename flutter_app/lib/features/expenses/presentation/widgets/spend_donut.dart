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
    this.selectedIndex,
    this.onSegmentTap,
    super.key,
  });

  final List<double> values;
  final List<Color> colors;
  final String centerLabel;
  final String centerValue;
  final double size;

  /// The highlighted segment (drawn thicker, the others dimmed), or null for none.
  final int? selectedIndex;

  /// Called with the tapped segment, or null when the middle is tapped. Null disables tapping altogether.
  final ValueChanged<int?>? onSegmentTap;

  /// The segment under [p] (a point inside the donut's box), or null for the middle or outside the ring.
  static int? segmentAt(Offset p, double size, List<double> values) {
    final sum = values.fold<double>(0, (s, v) => s + v);
    if (sum <= 0) return null;
    final centre = Offset(size / 2, size / 2);
    final d = (p - centre).distance;
    if (d > size / 2 || d < size * 0.22) return null;
    var a = math.atan2(p.dy - centre.dy, p.dx - centre.dx) + math.pi / 2;
    a = a % (math.pi * 2);
    var start = 0.0;
    for (var i = 0; i < values.length; i++) {
      final sweep = values[i] / sum * math.pi * 2;
      if (a < start + sweep) return i;
      start += sweep;
    }
    return values.length - 1;
  }

  @override
  Widget build(BuildContext context) {
    final t = context.tokens;
    final tap = onSegmentTap;
    return SizedBox(
      width: size,
      height: size,
      child: Stack(
        alignment: Alignment.center,
        children: [
          GestureDetector(
            behavior: HitTestBehavior.opaque,
            onTapUp: tap == null ? null : (d) => tap(segmentAt(d.localPosition, size, values)),
            child: CustomPaint(
              size: Size(size, size),
              painter: _DonutPainter(values, colors, t.borderColor, selectedIndex),
            ),
          ),
          IgnorePointer(
            child: Padding(
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
          ),
        ],
      ),
    );
  }
}

class _DonutPainter extends CustomPainter {
  const _DonutPainter(this.values, this.colors, this.track, this.selected);

  final List<double> values;
  final List<Color> colors;
  final Color track;
  final int? selected;

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
      final arc = start + gap / 2;
      final dim = selected != null && selected != i;
      final seg = colors[i % colors.length].withValues(alpha: dim ? 0.3 : 1.0);
      final width = selected == i ? stroke * 1.25 : stroke;
      final cap = dim ? StrokeCap.butt : StrokeCap.round; // faded round caps would stack into dark dots at the joins
      if (!dim) {
        // Neon halo under each segment.
        canvas.drawArc(
          rect,
          arc,
          math.max(0.001, sweep - gap),
          false,
          Paint()
            ..style = PaintingStyle.stroke
            ..strokeWidth = width
            ..strokeCap = cap
            ..color = seg.withValues(alpha: 0.45)
            ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 8),
        );
      }
      canvas.drawArc(
        rect,
        arc,
        math.max(0.001, sweep - gap),
        false,
        Paint()
          ..style = PaintingStyle.stroke
          ..strokeWidth = width
          ..strokeCap = cap
          ..color = seg,
      );
      start += sweep;
    }
  }

  @override
  bool shouldRepaint(_DonutPainter old) =>
      old.values != values || old.colors != colors || old.track != track || old.selected != selected;
}

/// Pill badge "Dining 20%" tinted with its segment colour, shown around the donut.
class DonutLegendBadge extends StatelessWidget {
  const DonutLegendBadge({required this.label, required this.color, this.selected = false, this.onTap, super.key});

  final String label;
  final Color color;
  final bool selected;

  /// When set the badge is a button (tap to highlight its segment); at least 48dp tall for a comfortable target.
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final badge = Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: selected ? 0.34 : 0.18),
        borderRadius: BorderRadius.circular(99),
        border: Border.all(
          color: color.withValues(alpha: selected ? 1.0 : 0.5),
          width: selected ? 1.5 : 1.0,
        ),
      ),
      child: Text(
        label,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: context.tokens.textPrimary),
      ),
    );
    if (onTap == null) return badge;
    return Semantics(
      button: true,
      selected: selected,
      label: label,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(99),
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: 48),
          child: Center(widthFactor: 1, child: ExcludeSemantics(child: badge)),
        ),
      ),
    );
  }
}
