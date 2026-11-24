import 'package:flutter/material.dart';

import '../../../../shared/theme/app_tokens.dart';

/// Horizon Hub (flag `enableHorizonUi`): the mint route card at the top. A dashed route with two stops and a
/// small label; tapping shows or hides the trip map.
class HorizonRouteCard extends StatelessWidget {
  const HorizonRouteCard({super.key, required this.label, required this.onTap});
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final t = context.tokens;
    final tint = t.tones[BentoTone.mint];
    return Material(
      color: tint.bg,
      borderRadius: BorderRadius.circular(20),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: SizedBox(
          height: 132,
          child: Stack(
            children: [
              Positioned.fill(
                child: CustomPaint(
                  painter: _RoutePainter(line: tint.accent, start: t.accentOrange, end: t.primaryAccent),
                ),
              ),
              Positioned(
                left: 12,
                bottom: 12,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(color: t.bgSurface, borderRadius: BorderRadius.circular(10)),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.map_outlined, size: 16, color: t.textPrimary),
                      const SizedBox(width: 6),
                      Text(
                        label,
                        style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: t.textPrimary),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _RoutePainter extends CustomPainter {
  _RoutePainter({required this.line, required this.start, required this.end});
  final Color line;
  final Color start;
  final Color end;

  @override
  void paint(Canvas canvas, Size size) {
    final path = Path()
      ..moveTo(size.width * 0.06, size.height * 0.78)
      ..cubicTo(
        size.width * 0.30,
        size.height * 0.30,
        size.width * 0.50,
        size.height * 0.75,
        size.width * 0.62,
        size.height * 0.50,
      )
      ..cubicTo(
        size.width * 0.72,
        size.height * 0.20,
        size.width * 0.85,
        size.height * 0.22,
        size.width * 0.94,
        size.height * 0.24,
      );
    final paint = Paint()
      ..color = line
      ..style = PaintingStyle.stroke
      ..strokeWidth = 3
      ..strokeCap = StrokeCap.round;
    for (final m in path.computeMetrics()) {
      var d = 0.0;
      while (d < m.length) {
        canvas.drawPath(m.extractPath(d, d + 8), paint);
        d += 14;
      }
    }
    canvas.drawCircle(Offset(size.width * 0.62, size.height * 0.50), 7, Paint()..color = start);
    canvas.drawCircle(Offset(size.width * 0.94, size.height * 0.24), 7, Paint()..color = end);
  }

  @override
  bool shouldRepaint(_RoutePainter old) => old.line != line || old.start != start || old.end != end;
}

/// Horizon Hub tile: a tinted square with an icon, a title in the tone's ink and one fact under it. A null [tone]
/// is the neutral grey tile (Tools).
class HorizonHubTile extends StatelessWidget {
  const HorizonHubTile({
    super.key,
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.tone,
    required this.onTap,
  });
  final IconData icon;
  final String title;
  final String subtitle;
  final BentoTone? tone;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final t = context.tokens;
    final bg = tone == null ? t.bgSurfaceHover : t.tones[tone!].bg;
    final ink = tone == null ? t.textSecondary : t.tones[tone!].accent;
    return Semantics(
      button: true,
      label: '$title. $subtitle',
      excludeSemantics: true,
      child: Material(
        color: bg,
        borderRadius: BorderRadius.circular(18),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
          child: ConstrainedBox(
            constraints: const BoxConstraints(minHeight: 112),
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(icon, size: 24, color: ink),
                  const SizedBox(height: 14),
                  Text(
                    title,
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: ink),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(fontSize: 12.5, color: ink.withValues(alpha: 0.85)),
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
