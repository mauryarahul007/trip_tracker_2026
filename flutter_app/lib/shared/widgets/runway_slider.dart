import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/semantics.dart' show CustomSemanticsAction;
import 'package:flutter/services.dart';

/// An airport-style two-way slider: a plane on a runway.
///
/// Slide the plane to the right end to take off ([onRight], e.g. "New Trip"), to the left end to go to the gate
/// ([onLeft], e.g. "Join"). Letting go early rolls the plane back to the middle. Tapping a label does the same as
/// sliding to it, and screen readers get both as custom actions, so nobody is forced to drag.
class RunwaySlider extends StatefulWidget {
  const RunwaySlider({
    required this.leftLabel,
    required this.rightLabel,
    required this.leftIcon,
    required this.rightIcon,
    required this.onLeft,
    required this.onRight,
    this.width = 330,
    super.key,
  });

  final String leftLabel;
  final String rightLabel;
  final IconData leftIcon;
  final IconData rightIcon;
  final VoidCallback onLeft;
  final VoidCallback onRight;
  final double width;

  static const double height = 64;
  static const double _thumb = 52;

  @override
  State<RunwaySlider> createState() => _RunwaySliderState();
}

class _RunwaySliderState extends State<RunwaySlider> with SingleTickerProviderStateMixin {
  late final _roll = AnimationController(vsync: this, duration: const Duration(milliseconds: 220));
  double _dx = 0; // -1 .. 1 across the runway
  double _from = 0;
  bool _armed = false; // passed the point of no return: release will trigger

  @override
  void initState() {
    super.initState();
    _roll.addListener(() => setState(() => _dx = _from * (1 - Curves.easeOut.transform(_roll.value))));
  }

  @override
  void dispose() {
    _roll.dispose();
    super.dispose();
  }

  double get _range => (widget.width - RunwaySlider._thumb - 12) / 2;

  void _release({required bool trigger, required bool right}) {
    if (trigger) {
      HapticFeedback.mediumImpact();
      (right ? widget.onRight : widget.onLeft)();
    }
    _from = _dx;
    _armed = false;
    _roll.forward(from: 0);
  }

  @override
  Widget build(BuildContext context) {
    final range = _range;
    final progress = _dx.abs();
    // The label the plane is heading away from fades; the one it is heading to brightens.
    double fade(bool rightSide) => 1 - (rightSide == (_dx > 0) ? 0 : progress.clamp(0.0, 1.0)) * 0.9;
    return Semantics(
      container: true,
      customSemanticsActions: {
        CustomSemanticsAction(label: widget.rightLabel): widget.onRight,
        CustomSemanticsAction(label: widget.leftLabel): widget.onLeft,
      },
      child: Container(
        key: const Key('stack-actions'),
        width: widget.width,
        height: RunwaySlider.height,
        decoration: BoxDecoration(
          color: const Color(0xFF0B1B2E).withValues(alpha: 0.9),
          borderRadius: BorderRadius.circular(99),
          border: Border.all(color: Colors.white.withValues(alpha: 0.16)),
          boxShadow: [
            BoxShadow(color: Colors.black.withValues(alpha: 0.4), blurRadius: 22, offset: const Offset(0, 10)),
          ],
        ),
        child: Stack(
          alignment: Alignment.center,
          children: [
            // Runway centre-line.
            Positioned.fill(child: CustomPaint(painter: _RunwayPainter())),
            Positioned(
              left: 18,
              child: _EndLabel(
                key: const Key('stack-join'),
                icon: widget.leftIcon,
                label: widget.leftLabel,
                opacity: fade(false),
                onTap: widget.onLeft,
              ),
            ),
            Positioned(
              right: 18,
              child: _EndLabel(
                key: const Key('stack-new-trip'),
                icon: widget.rightIcon,
                label: widget.rightLabel,
                opacity: fade(true),
                onTap: widget.onRight,
                trailingIcon: true,
              ),
            ),
            Transform.translate(
              offset: Offset(_dx * range, 0),
              child: GestureDetector(
                key: const Key('runway-thumb'),
                onHorizontalDragUpdate: (d) {
                  if (_roll.isAnimating) _roll.stop();
                  setState(() => _dx = (_dx + d.delta.dx / range).clamp(-1.0, 1.0));
                  final armed = _dx.abs() > 0.92;
                  if (armed && !_armed) HapticFeedback.selectionClick();
                  _armed = armed;
                },
                onHorizontalDragEnd: (_) => _release(trigger: _dx.abs() > 0.92, right: _dx > 0),
                onHorizontalDragCancel: () => _release(trigger: false, right: _dx > 0),
                child: Container(
                  width: RunwaySlider._thumb,
                  height: RunwaySlider._thumb,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: const LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [Colors.white, Color(0xFFD9E4F2)],
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: (_armed ? const Color(0xFFFFC857) : const Color(0xFF29D9C2)).withValues(alpha: 0.55),
                        blurRadius: 16,
                      ),
                    ],
                  ),
                  child: Transform.rotate(
                    // Nose points the way it is going; straight up while it waits on the centre line.
                    angle: _dx.abs() < 0.05 ? 0 : (_dx > 0 ? math.pi / 2 : -math.pi / 2),
                    child: const Icon(Icons.flight_rounded, color: Color(0xFF0B1B2E), size: 28),
                  ),
                ),
              ),
            ),
            const Positioned(bottom: 5, child: IgnorePointer(child: _Chevrons())),
          ],
        ),
      ),
    );
  }
}

class _EndLabel extends StatelessWidget {
  const _EndLabel({
    required this.icon,
    required this.label,
    required this.opacity,
    required this.onTap,
    this.trailingIcon = false,
    super.key,
  });

  final IconData icon;
  final String label;
  final double opacity;
  final VoidCallback onTap;
  final bool trailingIcon;

  @override
  Widget build(BuildContext context) {
    const ink = Colors.white;
    final text = Flexible(
      child: Text(
        label,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: const TextStyle(color: ink, fontWeight: FontWeight.w800, fontSize: 14),
      ),
    );
    final glyph = Icon(icon, color: ink, size: 18);
    return Opacity(
      opacity: opacity.clamp(0.0, 1.0),
      child: InkWell(
        borderRadius: BorderRadius.circular(99),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 10),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: trailingIcon ? [text, const SizedBox(width: 6), glyph] : [glyph, const SizedBox(width: 6), text],
          ),
        ),
      ),
    );
  }
}

/// "‹ ‹   ›  ›" under the plane: the hint that it slides both ways.
class _Chevrons extends StatelessWidget {
  const _Chevrons();

  @override
  Widget build(BuildContext context) => const Row(
    mainAxisSize: MainAxisSize.min,
    children: [
      Icon(Icons.chevron_left_rounded, size: 13, color: Colors.white38),
      SizedBox(width: 22),
      Icon(Icons.chevron_right_rounded, size: 13, color: Colors.white38),
    ],
  );
}

/// Dashed white centre-line of a runway behind the plane.
class _RunwayPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.white.withValues(alpha: 0.13)
      ..strokeWidth = 2
      ..strokeCap = StrokeCap.round;
    final y = size.height / 2;
    for (var x = 60.0; x < size.width - 60; x += 14) {
      canvas.drawLine(Offset(x, y), Offset(x + 7, y), paint);
    }
  }

  @override
  bool shouldRepaint(_RunwayPainter old) => false;
}
