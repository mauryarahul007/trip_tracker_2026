import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../../shared/theme/app_colors.dart';
import '../../../shared/theme/app_tokens.dart';

/// Which onboarding slide the drawing is for.
enum OnboardingArtKind { stamp, route, receipt }

/// Flat Calm Passport line drawings for the intro slides (flag `enableOnboardingArt`), in place of emoji that
/// look different on every phone. Ink lines, one teal action colour, the orange accent used once.
class OnboardingArt extends StatelessWidget {
  const OnboardingArt(this.kind, {this.size = 148, super.key});

  final OnboardingArtKind kind;
  final double size;

  @override
  Widget build(BuildContext context) {
    final t = context.tokens;
    return ExcludeSemantics(
      child: SizedBox.square(
        key: Key('onboarding-art-${kind.name}'),
        dimension: size,
        child: CustomPaint(
          painter: _ArtPainter(
            kind,
            ink: t.textPrimary,
            action: t.primaryAccent,
            accent: AppColors.calmRunway,
            paper: t.bgSurface,
          ),
        ),
      ),
    );
  }
}

class _ArtPainter extends CustomPainter {
  _ArtPainter(this.kind, {required this.ink, required this.action, required this.accent, required this.paper});

  final OnboardingArtKind kind;
  final Color ink, action, accent, paper;

  Paint _line(Color c, double w) => Paint()
    ..color = c
    ..style = PaintingStyle.stroke
    ..strokeWidth = w
    ..strokeCap = StrokeCap.round
    ..strokeJoin = StrokeJoin.round;

  @override
  void paint(Canvas canvas, Size size) {
    final s = size.width;
    final c = Offset(s / 2, s / 2);
    switch (kind) {
      case OnboardingArtKind.stamp:
        // A passport entry stamp: double ring, dashed inner ring, a plane in the middle, tilted like it was pressed.
        canvas.save();
        canvas.translate(c.dx, c.dy);
        canvas.rotate(-0.18);
        canvas.drawCircle(Offset.zero, s * 0.40, Paint()..color = paper);
        canvas.drawCircle(Offset.zero, s * 0.40, _line(action, s * 0.03));
        for (var i = 0; i < 24; i++) {
          final a = i * 2 * math.pi / 24;
          final p1 = Offset(math.cos(a), math.sin(a)) * (s * 0.31);
          final p2 = Offset(math.cos(a + 0.12), math.sin(a + 0.12)) * (s * 0.31);
          canvas.drawLine(p1, p2, _line(action, s * 0.018));
        }
        final plane = Path()
          ..moveTo(-s * 0.16, s * 0.02)
          ..lineTo(s * 0.16, -s * 0.06)
          ..lineTo(s * 0.02, s * 0.03)
          ..lineTo(-s * 0.02, s * 0.14)
          ..lineTo(-s * 0.05, s * 0.04)
          ..close();
        canvas.drawPath(plane, Paint()..color = accent);
        canvas.restore();
      case OnboardingArtKind.route:
        // Two pins joined by a dotted route.
        final a = Offset(s * 0.26, s * 0.70);
        final b = Offset(s * 0.74, s * 0.32);
        final route = Path()
          ..moveTo(a.dx, a.dy)
          ..cubicTo(s * 0.20, s * 0.36, s * 0.62, s * 0.66, b.dx, b.dy);
        for (final m in route.computeMetrics()) {
          for (double d = 0; d < m.length; d += s * 0.07) {
            final p = m.getTangentForOffset(d)?.position;
            if (p != null) canvas.drawCircle(p, s * 0.014, Paint()..color = ink.withValues(alpha: 0.55));
          }
        }
        void pin(Offset at, Color color) {
          final head = at.translate(0, -s * 0.10);
          final body = Path()
            ..moveTo(at.dx, at.dy)
            ..quadraticBezierTo(at.dx - s * 0.09, head.dy + s * 0.02, head.dx - s * 0.08, head.dy)
            ..arcToPoint(Offset(head.dx + s * 0.08, head.dy), radius: Radius.circular(s * 0.08))
            ..quadraticBezierTo(at.dx + s * 0.09, head.dy + s * 0.02, at.dx, at.dy)
            ..close();
          canvas.drawPath(body, Paint()..color = color);
          canvas.drawCircle(head, s * 0.032, Paint()..color = paper);
        }
        pin(a, action);
        pin(b, accent);
      case OnboardingArtKind.receipt:
        // A receipt with a torn edge, three lines, and a split arrow out of its total.
        final r = Rect.fromLTWH(s * 0.24, s * 0.16, s * 0.40, s * 0.62);
        final tear = Path()
          ..moveTo(r.left, r.top)
          ..lineTo(r.right, r.top)
          ..lineTo(r.right, r.bottom);
        const teeth = 5;
        for (var i = 1; i <= teeth * 2; i++) {
          final x = r.right - r.width * i / (teeth * 2);
          tear.lineTo(x, i.isOdd ? r.bottom - s * 0.04 : r.bottom);
        }
        tear.close();
        canvas.drawPath(tear, Paint()..color = paper);
        canvas.drawPath(tear, _line(ink, s * 0.022));
        for (var i = 0; i < 3; i++) {
          final y = r.top + s * (0.12 + i * 0.09);
          canvas.drawLine(
            Offset(r.left + s * 0.06, y),
            Offset(r.right - s * (i == 2 ? 0.16 : 0.06), y),
            _line(ink.withValues(alpha: 0.45), s * 0.02),
          );
        }
        final total = Offset(r.right - s * 0.08, r.top + s * 0.42);
        canvas.drawCircle(total, s * 0.035, Paint()..color = action);
        final arrow = _line(action, s * 0.026);
        for (final dy in [-0.14, 0.0, 0.14]) {
          final end = Offset(s * 0.84, total.dy + s * dy);
          canvas.drawLine(total, end, arrow);
          canvas.drawCircle(end, s * 0.03, Paint()..color = dy == 0 ? accent : action);
        }
    }
  }

  @override
  bool shouldRepaint(_ArtPainter old) =>
      old.kind != kind || old.ink != ink || old.action != action || old.accent != accent || old.paper != paper;
}
