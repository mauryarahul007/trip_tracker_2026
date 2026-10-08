import 'package:flutter/material.dart';

import '../theme/app_tokens.dart';
import '../theme/app_typography.dart';

class EmptyState extends StatelessWidget {
  final IconData? icon;
  final String? emoji;
  final String title;
  final String subtitle;
  final Widget? action;

  const EmptyState({super.key, this.icon, this.emoji, required this.title, required this.subtitle, this.action});

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;

    return CustomPaint(
      painter: _DotsPainter(tokens.textMuted.withValues(alpha: 0.22)),
      child: Center(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 40),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (emoji != null)
                Text(emoji!, style: const TextStyle(fontSize: 48))
              else if (icon != null)
                Container(
                  width: 88,
                  height: 88,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [tokens.primaryAccentLight, tokens.primaryAccent],
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: tokens.primaryAccent.withValues(alpha: 0.35),
                        blurRadius: 24,
                        offset: const Offset(0, 10),
                      ),
                    ],
                  ),
                  child: Icon(icon, size: 40, color: Colors.white),
                ),
              const SizedBox(height: 16),
              Text(
                title,
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontFamily: AppTypography.fontTitle,
                  fontSize: 22,
                  fontWeight: FontWeight.w800,
                  letterSpacing: -0.4,
                  color: tokens.textPrimary,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                subtitle,
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 14, color: tokens.textSecondary, height: 1.4),
              ),
              if (action != null) ...[const SizedBox(height: 24), action!],
            ],
          ),
        ),
      ),
    );
  }
}

/// Helpful-empty-space dot grid that fades out over the top 60% of the area.
class _DotsPainter extends CustomPainter {
  const _DotsPainter(this.color);
  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    const gap = 14.0;
    final fadeEnd = size.height * 0.6;
    for (var y = gap; y < fadeEnd; y += gap) {
      final paint = Paint()..color = color.withValues(alpha: color.a * (1 - y / fadeEnd));
      for (var x = gap; x < size.width; x += gap) {
        canvas.drawCircle(Offset(x, y), 1.1, paint);
      }
    }
  }

  @override
  bool shouldRepaint(_DotsPainter old) => old.color != color;
}
