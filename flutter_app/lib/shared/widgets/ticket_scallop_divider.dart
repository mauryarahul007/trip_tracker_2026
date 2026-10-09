import 'package:flutter/material.dart';

import '../theme/app_tokens.dart';

/// A boarding-pass perforated scallop divider.
///
/// Features circular cutout notches on the left and right edges, with a series
/// of evenly-spaced punch-out perforation dots or dashes across the center.
class TicketScallopDivider extends StatelessWidget {
  const TicketScallopDivider({
    this.notchRadius = 10.0,
    this.holeRadius = 2.5,
    this.cardColor,
    this.cutoutColor,
    this.perforationColor,
    this.spacing = 10.0,
    this.useDashes = true,
    super.key,
  });

  /// The radius of the left and right ticket bite notches.
  final double notchRadius;

  /// The radius of the small perforation holes along the line (if not using dashes).
  final double holeRadius;

  /// The background fill of the ticket card.
  final Color? cardColor;

  /// The background color of the surrounding page/sheet, drawn in the cutout holes.
  final Color? cutoutColor;

  /// The color of the dashed line or perforation holes.
  final Color? perforationColor;

  /// Distance between dashed segments or holes.
  final double spacing;

  /// If true, draws dashed line. If false, draws punch-out circular perforation dots.
  final bool useDashes;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final bg = cardColor ?? tokens.bgSurface;
    final cutout = cutoutColor ?? tokens.bgPage;
    final perf = perforationColor ?? tokens.textPrimary.withValues(alpha: 0.22);

    return SizedBox(
      height: notchRadius * 2,
      width: double.infinity,
      child: CustomPaint(
        painter: _TicketDividerPainter(
          notchRadius: notchRadius,
          holeRadius: holeRadius,
          cardColor: bg,
          cutoutColor: cutout,
          perforationColor: perf,
          spacing: spacing,
          useDashes: useDashes,
        ),
      ),
    );
  }
}

class _TicketDividerPainter extends CustomPainter {
  _TicketDividerPainter({
    required this.notchRadius,
    required this.holeRadius,
    required this.cardColor,
    required this.cutoutColor,
    required this.perforationColor,
    required this.spacing,
    required this.useDashes,
  });

  final double notchRadius;
  final double holeRadius;
  final Color cardColor;
  final Color cutoutColor;
  final Color perforationColor;
  final double spacing;
  final bool useDashes;

  @override
  void paint(Canvas canvas, Size size) {
    final centerY = size.height / 2;

    // 1. Paint card background strip
    final cardPaint = Paint()..color = cardColor;
    canvas.drawRect(Rect.fromLTWH(0, 0, size.width, size.height), cardPaint);

    // 2. Paint left and right bite notches
    final cutoutPaint = Paint()
      ..color = cutoutColor
      ..style = PaintingStyle.fill;

    // Left notch
    canvas.drawCircle(Offset(0, centerY), notchRadius, cutoutPaint);
    // Right notch
    canvas.drawCircle(Offset(size.width, centerY), notchRadius, cutoutPaint);

    // 3. Perforations across the center
    final startX = notchRadius + 8.0;
    final endX = size.width - notchRadius - 8.0;
    if (endX <= startX) return;

    if (useDashes) {
      final dashPaint = Paint()
        ..color = perforationColor
        ..strokeWidth = 1.5
        ..strokeCap = StrokeCap.round;

      const dashLength = 5.0;
      final step = dashLength + spacing;
      var curX = startX;
      while (curX < endX) {
        final x2 = (curX + dashLength).clamp(startX, endX);
        canvas.drawLine(Offset(curX, centerY), Offset(x2, centerY), dashPaint);
        curX += step;
      }
    } else {
      final dotPaint = Paint()
        ..color = perforationColor
        ..style = PaintingStyle.fill;

      var curX = startX;
      while (curX < endX) {
        canvas.drawCircle(Offset(curX, centerY), holeRadius, dotPaint);
        curX += spacing;
      }
    }
  }

  @override
  bool shouldRepaint(_TicketDividerPainter old) =>
      old.notchRadius != notchRadius ||
      old.holeRadius != holeRadius ||
      old.cardColor != cardColor ||
      old.cutoutColor != cutoutColor ||
      old.perforationColor != perforationColor ||
      old.spacing != spacing ||
      old.useDashes != useDashes;
}
