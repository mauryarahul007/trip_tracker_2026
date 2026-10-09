import 'package:flutter/material.dart';

import '../theme/app_tokens.dart';
import '../theme/app_typography.dart';

/// An airline runway progress indicator tracking settled amounts against total trip liability.
///
/// Features a dark runway track, neon accent progress line, a sliding miniature airplane
/// marker positioned along the route, and airport clearance badges.
class FlightProgressRunway extends StatelessWidget {
  const FlightProgressRunway({
    required this.settledAmount,
    required this.totalAmount,
    required this.settledLabel,
    required this.totalLabel,
    this.progress = 0.0,
    this.remainingTransfers = 0,
    this.remainingLabel,
    this.clearedLabel,
    this.tone = BentoTone.mint,
    super.key,
  });

  final String settledAmount;
  final String totalAmount;
  final String settledLabel;
  final String totalLabel;
  final double progress;
  final int remainingTransfers;
  final String? remainingLabel;
  final String? clearedLabel;
  final BentoTone tone;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final accent = tokens.tones[tone].accent;
    final safeProgress = progress.clamp(0.0, 1.0);
    final isDone = remainingTransfers == 0 || safeProgress >= 0.999;

    return Container(
      decoration: BoxDecoration(
        color: tokens.bgSurface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: tokens.borderColor.withValues(alpha: 0.6), width: 1),
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Header: Runway title and Cleared badge
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(color: accent.withValues(alpha: 0.12), shape: BoxShape.circle),
                child: Icon(Icons.flight_takeoff_rounded, size: 14, color: accent),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  'RUNWAY PROGRESS',
                  style: TextStyle(
                    fontFamily: 'monospace',
                    fontSize: 11,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 1.2,
                    color: tokens.textSecondary,
                  ),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: isDone ? tokens.colorSuccess.withValues(alpha: 0.15) : accent.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(99),
                  border: Border.all(
                    color: isDone ? tokens.colorSuccess.withValues(alpha: 0.4) : accent.withValues(alpha: 0.4),
                    width: 1,
                  ),
                ),
                child: Text(
                  clearedLabel ?? (isDone ? '100% SQUARED' : '${(safeProgress * 100).round()}% CLEARED'),
                  style: TextStyle(
                    fontSize: 10.5,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 0.5,
                    color: isDone ? tokens.colorSuccess : accent,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),

          // Amounts row
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            crossAxisAlignment: CrossAxisAlignment.baseline,
            textBaseline: TextBaseline.alphabetic,
            children: [
              Flexible(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      settledLabel.toUpperCase(),
                      style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: tokens.textSecondary),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      settledAmount,
                      style: TextStyle(
                        fontFamily: AppTypography.fontTitle,
                        fontSize: 18,
                        fontWeight: FontWeight.w800,
                        color: tokens.textPrimary,
                      ),
                    ),
                  ],
                ),
              ),
              Flexible(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      totalLabel.toUpperCase(),
                      style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: tokens.textSecondary),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      totalAmount,
                      style: TextStyle(
                        fontFamily: AppTypography.fontTitle,
                        fontSize: 18,
                        fontWeight: FontWeight.w800,
                        color: tokens.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Runway track with dynamic aircraft marker
          LayoutBuilder(
            builder: (context, constraints) {
              return SizedBox(
                height: 24,
                child: Stack(
                  alignment: Alignment.centerLeft,
                  children: [
                    // Runway base asphalt line
                    Container(
                      height: 8,
                      width: constraints.maxWidth,
                      decoration: BoxDecoration(
                        color: tokens.borderColor.withValues(alpha: 0.4),
                        borderRadius: BorderRadius.circular(99),
                      ),
                    ),
                    // Runway markings (center dashes)
                    Positioned.fill(
                      child: Center(
                        child: CustomPaint(
                          size: Size(constraints.maxWidth, 2),
                          painter: _RunwayDashPainter(tokens.textPrimary.withValues(alpha: 0.15)),
                        ),
                      ),
                    ),
                    // Active filled portion
                    FractionallySizedBox(
                      widthFactor: safeProgress > 0 ? safeProgress : 0.001,
                      child: Container(
                        height: 8,
                        decoration: BoxDecoration(
                          gradient: LinearGradient(colors: [accent.withValues(alpha: 0.6), accent]),
                          borderRadius: BorderRadius.circular(99),
                          boxShadow: [BoxShadow(color: accent.withValues(alpha: 0.35), blurRadius: 6, spreadRadius: 0)],
                        ),
                      ),
                    ),
                    // Airplane marker at progress position
                    Align(
                      alignment: Alignment(-1.0 + (2.0 * safeProgress), 0.0),
                      child: Container(
                        width: 22,
                        height: 22,
                        decoration: BoxDecoration(
                          color: accent,
                          shape: BoxShape.circle,
                          boxShadow: [BoxShadow(color: accent.withValues(alpha: 0.5), blurRadius: 8, spreadRadius: 1)],
                        ),
                        child: const Icon(Icons.flight_takeoff_rounded, size: 13, color: Colors.black),
                      ),
                    ),
                  ],
                ),
              );
            },
          ),
          if (remainingLabel != null && !isDone) ...[
            const SizedBox(height: 8),
            Row(
              children: [
                Icon(Icons.info_outline_rounded, size: 14, color: tokens.textSecondary),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    remainingLabel!,
                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: tokens.textSecondary),
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

class _RunwayDashPainter extends CustomPainter {
  _RunwayDashPainter(this.color);
  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final p = Paint()
      ..color = color
      ..strokeWidth = 1.5;
    const dash = 6.0;
    const gap = 4.0;
    var x = 0.0;
    while (x < size.width) {
      canvas.drawLine(Offset(x, size.height / 2), Offset((x + dash).clamp(0, size.width), size.height / 2), p);
      x += dash + gap;
    }
  }

  @override
  bool shouldRepaint(_RunwayDashPainter old) => old.color != color;
}
