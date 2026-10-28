import 'dart:ui' show lerpDouble;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../../shared/theme/app_tokens.dart';

/// Draggable bottom content sheet over the continuous photo/map backdrop.
/// Parity with web `TripContentSheet` in `src/components/TripContentSheet.tsx`.
/// Default snap is half-screen (50vh) peeking the destination photo/route map;
/// swiping up expands to full screen, squeezing the header.
class TripContentSheet extends StatefulWidget {
  final Widget child;
  final ValueNotifier<double> progressNotifier;
  final double headerHeight;
  final double collapsedFraction;
  final ValueChanged<bool>? onFullChange;

  const TripContentSheet({
    super.key,
    required this.child,
    required this.progressNotifier,
    this.headerHeight = 56.0,
    this.collapsedFraction = 0.50,
    this.onFullChange,
  });

  @override
  State<TripContentSheet> createState() => TripContentSheetState();
}

class TripContentSheetState extends State<TripContentSheet> with SingleTickerProviderStateMixin {
  late AnimationController _animController;
  Animation<double>? _springAnim;

  // topFraction: 0.0 means full screen (top of sheet is right below header);
  // 1.0 means collapsed (top of sheet is at collapsedFraction of screen height).
  double _fraction = 1.0;

  double _dragStartY = 0.0;
  double _dragStartFraction = 1.0;
  DateTime _lastMoveTime = DateTime.now();
  double _lastMoveFraction = 1.0;
  double _velocity = 0.0;

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 350),
    )..addListener(() {
        if (_springAnim != null) {
          _updateFraction(_springAnim!.value);
        }
      });
  }

  @override
  void dispose() {
    _animController.dispose();
    super.dispose();
  }

  void _updateFraction(double val) {
    setState(() {
      _fraction = val.clamp(0.0, 1.0);
    });
    // Progress: 0.0 at collapsed (_fraction == 1.0), 1.0 at full (_fraction == 0.0)
    final progress = (1.0 - _fraction).clamp(0.0, 1.0);
    widget.progressNotifier.value = progress;
    widget.onFullChange?.call(progress >= 0.95);
  }

  /// Toggle between collapsed peek and full screen
  void toggle() {
    final target = _fraction > 0.5 ? 0.0 : 1.0;
    animateTo(target);
  }

  /// Expand to full screen
  void expandFull() {
    animateTo(0.0);
  }

  /// Collapse to peek map
  void collapseToPeek() {
    animateTo(1.0);
  }

  void animateTo(double targetFraction) {
    HapticFeedback.lightImpact();
    _springAnim = Tween<double>(begin: _fraction, end: targetFraction).animate(
      CurvedAnimation(parent: _animController, curve: Curves.easeOutCubic),
    );
    _animController.forward(from: 0.0);
  }

  void _onVerticalDragStart(DragStartDetails details) {
    _animController.stop();
    _dragStartY = details.globalPosition.dy;
    _dragStartFraction = _fraction;
    _lastMoveTime = DateTime.now();
    _lastMoveFraction = _fraction;
    _velocity = 0.0;
  }

  void _onVerticalDragUpdate(DragUpdateDetails details, double totalUsableHeight) {
    if (totalUsableHeight <= 0) return;
    final dy = details.globalPosition.dy - _dragStartY;
    final deltaFraction = dy / totalUsableHeight;
    var next = _dragStartFraction + deltaFraction;

    // Soft rubber-band resistance beyond [0.0, 1.0]
    if (next < 0.0) {
      next = next * 0.35;
    } else if (next > 1.0) {
      next = 1.0 + (next - 1.0) * 0.35;
    }

    final now = DateTime.now();
    final dt = now.difference(_lastMoveTime).inMilliseconds;
    if (dt > 0) {
      _velocity = (next - _lastMoveFraction) / dt;
    }
    _lastMoveTime = now;
    _lastMoveFraction = next;

    _updateFraction(next);
  }

  void _onVerticalDragEnd(DragEndDetails details) {
    final v = details.primaryVelocity ?? 0.0;
    double target;

    // Fast or gentle flick in a direction (80 px/s is a light thumb flick)
    if (v < -80 || _velocity < -0.0005) {
      target = 0.0; // Swiped/flicked UP -> Expand to full
    } else if (v > 80 || _velocity > 0.0005) {
      target = 1.0; // Swiped/flicked DOWN -> Collapse to peek
    } else {
      // Position-based snapping
      if (_dragStartFraction > 0.8) {
        // Started from collapsed: even a small move upward (e.g. 20px / 8%) means the user intended to open it
        target = _fraction < 0.92 ? 0.0 : 1.0;
      } else if (_dragStartFraction < 0.2) {
        // Started from full screen: even a small move downward means the user intended to close it
        target = _fraction > 0.08 ? 1.0 : 0.0;
      } else {
        // From intermediate position: 50% threshold
        target = _fraction < 0.5 ? 0.0 : 1.0;
      }
    }
    animateTo(target);
  }

  @override
  Widget build(BuildContext context) {
    final t = context.tokens;
    final totalHeight = MediaQuery.sizeOf(context).height;
    final safeTop = MediaQuery.paddingOf(context).top;

    final fullTop = safeTop + widget.headerHeight;
    final peekTop = totalHeight * widget.collapsedFraction;
    final usableRange = (peekTop - fullTop).clamp(1.0, totalHeight);

    // Current top offset of the sheet in pixels
    final currentTop = lerpDouble(fullTop, peekTop, _fraction)!;
    final progress = (1.0 - _fraction).clamp(0.0, 1.0);
    final cornerRadius = lerpDouble(24.0, 0.0, progress)!;

    return Stack(
      fit: StackFit.expand,
      children: [
        // Darkening scrim over the map as the sheet pulls up
        if (progress > 0.01)
          Positioned.fill(
            child: IgnorePointer(
              ignoring: progress < 0.8,
              child: Container(
                color: Colors.black.withValues(alpha: progress * 0.45),
              ),
            ),
          ),

        // Draggable sheet card
        Positioned(
          top: currentTop,
          left: 0,
          right: 0,
          bottom: 0,
          child: ClipRRect(
            borderRadius: BorderRadius.vertical(top: Radius.circular(cornerRadius)),
            child: DecoratedBox(
              decoration: BoxDecoration(
                color: t.bgPage,
                borderRadius: BorderRadius.vertical(top: Radius.circular(cornerRadius)),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.18),
                    blurRadius: 18,
                    offset: const Offset(0, -4),
                  ),
                ],
              ),
              child: Column(
                children: [
                  // Drag Handle Bar with generous hit target across the full width
                  GestureDetector(
                    behavior: HitTestBehavior.opaque,
                    onTap: toggle,
                    onVerticalDragStart: _onVerticalDragStart,
                    onVerticalDragUpdate: (d) => _onVerticalDragUpdate(d, usableRange),
                    onVerticalDragEnd: _onVerticalDragEnd,
                    child: Container(
                      width: double.infinity,
                      padding: const EdgeInsets.fromLTRB(0, 12, 0, 14),
                      alignment: Alignment.center,
                      child: Container(
                        width: 44,
                        height: 5.0,
                        decoration: BoxDecoration(
                          color: t.textSecondary.withValues(alpha: 0.45),
                          borderRadius: BorderRadius.circular(99),
                        ),
                      ),
                    ),
                  ),

                  // Main tab body with scroll gesture detection when collapsed
                  Expanded(
                    child: NotificationListener<ScrollNotification>(
                      onNotification: (notification) {
                        if (notification.depth != 0) return false;
                        if (notification is ScrollStartNotification) {
                          if (_fraction > 0.05) {
                            _animController.stop();
                            _dragStartFraction = _fraction;
                          }
                        } else if (notification is ScrollUpdateNotification) {
                          if (_fraction > 0.02) {
                            final delta = notification.scrollDelta ?? 0.0;
                            if (delta > 0 && usableRange > 0) {
                              final deltaFraction = delta / usableRange;
                              _updateFraction((_fraction - deltaFraction).clamp(0.0, 1.0));
                            }
                          }
                        } else if (notification is ScrollEndNotification) {
                          if (_fraction > 0.01 && _fraction < 0.95) {
                            animateTo(0.0);
                          }
                        }
                        return false;
                      },
                      child: widget.child,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }
}
