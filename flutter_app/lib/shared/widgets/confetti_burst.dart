import 'dart:math' as math;

import 'package:flutter/material.dart';

/// A lightweight confetti particle burst for celebrating settlements and achievements.
class ConfettiBurst extends StatefulWidget {
  const ConfettiBurst({super.key, required this.child, this.playOnStart = true});

  final Widget child;
  final bool playOnStart;

  @override
  State<ConfettiBurst> createState() => ConfettiBurstState();
}

class ConfettiBurstState extends State<ConfettiBurst> with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  final List<_ConfettiParticle> _particles = [];
  final math.Random _random = math.Random();

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(vsync: this, duration: const Duration(milliseconds: 1400));

    if (widget.playOnStart) {
      _initParticles();
      _controller.forward();
    }
  }

  void play() {
    _initParticles();
    _controller.forward(from: 0.0);
  }

  void _initParticles() {
    _particles.clear();
    const colors = [
      Color(0xFF3B82F6),
      Color(0xFF10B981),
      Color(0xFFF59E0B),
      Color(0xFFEC4899),
      Color(0xFF8B5CF6),
      Color(0xFF06B6D4),
    ];

    for (int i = 0; i < 40; i++) {
      final angle = _random.nextDouble() * 2 * math.pi;
      final speed = 80.0 + _random.nextDouble() * 140.0;
      final size = 4.0 + _random.nextDouble() * 6.0;
      final color = colors[_random.nextInt(colors.length)];
      _particles.add(_ConfettiParticle(angle: angle, speed: speed, size: size, color: color));
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      clipBehavior: Clip.none,
      children: [
        widget.child,
        Positioned.fill(
          child: IgnorePointer(
            child: AnimatedBuilder(
              animation: _controller,
              builder: (context, _) {
                if (_controller.value == 0.0 || _controller.value == 1.0) {
                  return const SizedBox.shrink();
                }
                return CustomPaint(
                  painter: _ConfettiPainter(progress: _controller.value, particles: _particles),
                );
              },
            ),
          ),
        ),
      ],
    );
  }
}

class _ConfettiParticle {
  _ConfettiParticle({required this.angle, required this.speed, required this.size, required this.color});

  final double angle;
  final double speed;
  final double size;
  final Color color;
}

class _ConfettiPainter extends CustomPainter {
  _ConfettiPainter({required this.progress, required this.particles});

  final double progress;
  final List<_ConfettiParticle> particles;

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final opacity = (1.0 - progress).clamp(0.0, 1.0);

    for (final p in particles) {
      final distance = p.speed * progress;
      final x = center.dx + math.cos(p.angle) * distance;
      final y = center.dy + math.sin(p.angle) * distance + (progress * progress * 60.0);

      final paint = Paint()
        ..color = p.color.withValues(alpha: opacity)
        ..style = PaintingStyle.fill;

      canvas.save();
      canvas.translate(x, y);
      canvas.rotate(p.angle + (progress * math.pi * 2));
      canvas.drawRect(Rect.fromCenter(center: Offset.zero, width: p.size, height: p.size * 0.6), paint);
      canvas.restore();
    }
  }

  @override
  bool shouldRepaint(covariant _ConfettiPainter oldDelegate) => true;
}
