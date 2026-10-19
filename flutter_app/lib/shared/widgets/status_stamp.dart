import 'package:flutter/material.dart';

import '../theme/app_tokens.dart';

/// A vintage rubberized passport-style stamp.
///
/// Features angled tilt, distressed double-border styling, ink text, and icon.
/// Stamped "SETTLED" when debts are clear, or "NOT SETTLED" when money is owed.
class StatusStamp extends StatelessWidget {
  const StatusStamp({required this.settled, required this.text, this.tone, this.angle = -0.12, super.key});

  final bool settled;
  final String text;
  final BentoTone? tone;
  final double angle;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    // Settled gets vibrant emerald / mint tone; Not Settled gets urgent vermilion / red.
    final stampColor = settled
        ? (tone != null ? tokens.tones[tone!].accent : tokens.colorSuccess)
        : const Color(0xFFEF4444);

    return Semantics(
      label: text,
      child: ExcludeSemantics(
        child: Transform.rotate(
          angle: angle,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
            decoration: BoxDecoration(
              color: stampColor.withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(6),
              border: Border.all(color: stampColor.withValues(alpha: 0.85), width: 2.2),
              boxShadow: [BoxShadow(color: stampColor.withValues(alpha: 0.15), blurRadius: 8, spreadRadius: 0)],
            ),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(3),
                border: Border.all(color: stampColor.withValues(alpha: 0.4), width: 1.0),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(settled ? Icons.check_circle_rounded : Icons.hourglass_top_rounded, size: 15, color: stampColor),
                  const SizedBox(width: 5),
                  Text(
                    text.toUpperCase(),
                    style: TextStyle(
                      fontFamily: 'monospace',
                      fontSize: 11.5,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 1.4,
                      color: stampColor,
                      shadows: [Shadow(color: stampColor.withValues(alpha: 0.3), blurRadius: 1)],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
