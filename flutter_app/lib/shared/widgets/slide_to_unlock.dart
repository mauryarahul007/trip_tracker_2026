import 'package:flutter/material.dart';

import '../../core/platform/haptics.dart';
import '../theme/app_icons.dart';
import '../theme/app_tokens.dart';

/// A slide-to-confirm action slider preventing accidental high-impact actions
/// such as debt settlements or locking trips.
class SlideToUnlock extends StatefulWidget {
  const SlideToUnlock({
    super.key,
    required this.label,
    required this.onConfirmed,
    this.height = 56.0,
    this.sliderColor,
    this.trackColor,
    this.isLoading = false,
  });

  final String label;
  final VoidCallback onConfirmed;
  final double height;
  final Color? sliderColor;
  final Color? trackColor;
  final bool isLoading;

  @override
  State<SlideToUnlock> createState() => _SlideToUnlockState();
}

class _SlideToUnlockState extends State<SlideToUnlock>
    with SingleTickerProviderStateMixin {
  double _dragPosition = 0.0;
  bool _isConfirmed = false;
  late AnimationController _springController;
  late Animation<double> _springAnimation;

  @override
  void initState() {
    super.initState();
    _springController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 300),
    );
  }

  @override
  void dispose() {
    _springController.dispose();
    super.dispose();
  }

  void _onPanUpdate(DragUpdateDetails details, double maxDrag) {
    if (_isConfirmed || widget.isLoading) return;
    setState(() {
      _dragPosition = (_dragPosition + details.delta.dx).clamp(0.0, maxDrag);
    });
  }

  void _onPanEnd(DragEndDetails details, double maxDrag) {
    if (_isConfirmed || widget.isLoading) return;

    if (_dragPosition >= maxDrag * 0.85) {
      setState(() {
        _dragPosition = maxDrag;
        _isConfirmed = true;
      });
      AppHaptics.success();
      widget.onConfirmed();
    } else {
      _springAnimation =
          Tween<double>(begin: _dragPosition, end: 0.0).animate(
            CurvedAnimation(
              parent: _springController,
              curve: Curves.easeOutCubic,
            ),
          )..addListener(() {
            setState(() {
              _dragPosition = _springAnimation.value;
            });
          });
      _springController.forward(from: 0.0);
      AppHaptics.light();
    }
  }

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final trackColor = widget.trackColor ?? tokens.bgSurface;
    final sliderColor = widget.sliderColor ?? tokens.primaryAccent;

    return LayoutBuilder(
      builder: (context, constraints) {
        final double trackWidth = constraints.maxWidth;
        final double thumbSize = widget.height - 8;
        final double maxDrag = (trackWidth - thumbSize - 8).clamp(
          0.0,
          trackWidth,
        );

        return Container(
          width: trackWidth,
          height: widget.height,
          decoration: BoxDecoration(
            color: trackColor,
            borderRadius: BorderRadius.circular(widget.height / 2),
            border: Border.all(color: tokens.borderColor),
          ),
          child: Stack(
            alignment: Alignment.centerLeft,
            children: [
              // Center Label
              Center(
                child: Opacity(
                  opacity:
                      (1.0 - (_dragPosition / (maxDrag > 0 ? maxDrag : 1.0)))
                          .clamp(0.0, 1.0),
                  child: Text(
                    widget.label,
                    style: TextStyle(
                      color: tokens.textSecondary,
                      fontWeight: FontWeight.w600,
                      fontSize: 14,
                      letterSpacing: 0.2,
                    ),
                  ),
                ),
              ),

              // Sliding Thumb
              Positioned(
                left: 4 + _dragPosition,
                child: GestureDetector(
                  onHorizontalDragUpdate: (details) =>
                      _onPanUpdate(details, maxDrag),
                  onHorizontalDragEnd: (details) => _onPanEnd(details, maxDrag),
                  child: Container(
                    width: thumbSize,
                    height: thumbSize,
                    decoration: BoxDecoration(
                      color: sliderColor,
                      shape: BoxShape.circle,
                      boxShadow: [
                        BoxShadow(
                          color: sliderColor.withValues(alpha: 0.35),
                          blurRadius: 8,
                          offset: const Offset(0, 3),
                        ),
                      ],
                    ),
                    child: widget.isLoading
                        ? const Center(
                            child: SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                valueColor: AlwaysStoppedAnimation<Color>(
                                  Colors.white,
                                ),
                              ),
                            ),
                          )
                        : Icon(
                            _isConfirmed
                                ? AppIcons.check
                                : AppIcons.chevronRight,
                            color: Colors.white,
                            size: 22,
                          ),
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}
