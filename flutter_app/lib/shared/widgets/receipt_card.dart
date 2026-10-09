import 'package:flutter/material.dart';

import '../theme/app_tokens.dart';
import 'ticket_scallop_divider.dart';

/// Boarding-receipt card: dotted stitch border, and (with a [footer]) a perforated tear line with
/// side notches between the body and the footer. Notches are painted in the page colour.
class ReceiptCard extends StatelessWidget {
  const ReceiptCard({
    required this.body,
    this.footer,
    this.padding = const EdgeInsets.fromLTRB(14, 12, 14, 12),
    super.key,
  });

  final Widget body;
  final Widget? footer;
  final EdgeInsets padding;

  static const _radius = 16.0;
  static const _notch = 6.0;

  @override
  Widget build(BuildContext context) {
    final t = context.tokens;
    return CustomPaint(
      foregroundPainter: DottedRRectPainter(color: t.textPrimary.withValues(alpha: 0.22), radius: _radius),
      child: Container(
        decoration: BoxDecoration(color: t.bgSurface, borderRadius: BorderRadius.circular(_radius)),
        clipBehavior: Clip.antiAlias,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(padding: padding, child: body),
            if (footer != null) ...[
              TicketScallopDivider(
                notchRadius: _notch,
                cardColor: t.bgSurface,
                cutoutColor: t.bgPage,
                perforationColor: t.textPrimary.withValues(alpha: 0.2),
                spacing: 7,
              ),
              Padding(padding: EdgeInsets.fromLTRB(padding.left, 2, padding.right, padding.bottom), child: footer),
            ],
          ],
        ),
      ),
    );
  }
}

/// Fine dotted rounded-rect outline (the "stitch" border).
class DottedRRectPainter extends CustomPainter {
  const DottedRRectPainter({required this.color, required this.radius});

  final Color color;
  final double radius;

  @override
  void paint(Canvas canvas, Size size) {
    final path = Path()
      ..addRRect(
        RRect.fromRectAndRadius(Rect.fromLTWH(0.5, 0.5, size.width - 1, size.height - 1), Radius.circular(radius)),
      );
    final paint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1
      ..color = color;
    for (final m in path.computeMetrics()) {
      for (var d = 0.0; d < m.length; d += 6) {
        canvas.drawPath(m.extractPath(d, d + 3), paint);
      }
    }
  }

  @override
  bool shouldRepaint(DottedRRectPainter old) => old.color != color || old.radius != radius;
}
