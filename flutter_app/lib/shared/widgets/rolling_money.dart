import 'package:flutter/material.dart';

import '../../core/platform/motion.dart';
import '../theme/app_typography.dart';

/// A money figure whose digits roll like an odometer when the value changes: up when it grows, down when it shrinks.
///
/// [memoryKey] remembers the last shown text (per trip, for example) so that coming back to the screen after an
/// expense was added or settled still rolls from the old figure to the new one instead of just appearing.
class RollingMoneyText extends StatefulWidget {
  const RollingMoneyText({
    required this.whole,
    required this.decimals,
    required this.fontSize,
    required this.color,
    this.memoryKey,
    super.key,
  });

  final String whole;
  final String decimals;
  final double fontSize;
  final Color color;
  final String? memoryKey;

  String get text => '$whole$decimals';

  static final _memory = <String, String>{};

  @override
  State<RollingMoneyText> createState() => _RollingMoneyTextState();
}

double _numeric(String s) => double.tryParse(s.replaceAll(RegExp(r'[^0-9.]'), '')) ?? 0;

class _RollingMoneyTextState extends State<RollingMoneyText> {
  late String _shown;
  bool _up = true;

  @override
  void initState() {
    super.initState();
    final last = widget.memoryKey == null ? null : RollingMoneyText._memory[widget.memoryKey];
    _shown = last ?? widget.text;
    if (last != null && last != widget.text) {
      _up = _numeric(widget.text) >= _numeric(last);
      // Roll on the first frame after the screen appears.
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) setState(() => _shown = widget.text);
      });
    }
    _remember();
  }

  @override
  void didUpdateWidget(RollingMoneyText old) {
    super.didUpdateWidget(old);
    if (widget.text != _shown) {
      _up = _numeric(widget.text) >= _numeric(_shown);
      _shown = widget.text;
    }
    _remember();
  }

  void _remember() {
    final k = widget.memoryKey;
    if (k != null) RollingMoneyText._memory[k] = widget.text;
  }

  @override
  Widget build(BuildContext context) {
    final base = AppTypography.moneyDisplay(fontSize: widget.fontSize, color: widget.color);
    final dim = base.copyWith(color: widget.color.withValues(alpha: 0.45));
    final chars = _shown.characters.toList();
    final decimalCount = widget.decimals.length;
    final duration = AppMotion.of(context, const Duration(milliseconds: 420));
    return Semantics(
      label: widget.text,
      excludeSemantics: true,
      // Large text sizes shrink the figure to the card instead of overflowing it.
      child: FittedBox(
        fit: BoxFit.scaleDown,
        child: Row(
          key: const Key('rolling-money'),
          mainAxisSize: MainAxisSize.min,
          children: [
            for (final (i, ch) in chars.indexed)
              _Slot(
                char: ch,
                fromRight: chars.length - 1 - i,
                up: _up,
                style: chars.length - 1 - i < decimalCount ? dim : base,
                duration: duration,
              ),
          ],
        ),
      ),
    );
  }
}

class _Slot extends StatelessWidget {
  const _Slot({
    required this.char,
    required this.fromRight,
    required this.up,
    required this.style,
    required this.duration,
  });

  final String char;
  final int fromRight;
  final bool up;
  final TextStyle style;
  final Duration duration;

  @override
  Widget build(BuildContext context) {
    final current = ValueKey('$fromRight$char');
    return ClipRect(
      child: AnimatedSwitcher(
        duration: duration,
        switchInCurve: Curves.easeOutCubic,
        switchOutCurve: Curves.easeInCubic,
        transitionBuilder: (child, anim) {
          final incoming = child.key == current;
          // Both digits travel the same way: the old one leaves upward and the new one arrives from below (or reversed).
          final from = incoming ? Offset(0, up ? 1 : -1) : Offset(0, up ? -1 : 1);
          return SlideTransition(
            position: Tween(begin: from, end: Offset.zero).animate(anim),
            child: FadeTransition(opacity: anim, child: child),
          );
        },
        child: Text(char, key: current, style: style),
      ),
    );
  }
}
