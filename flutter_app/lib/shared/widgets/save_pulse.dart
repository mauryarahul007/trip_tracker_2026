import 'package:flutter/material.dart';

import '../../core/platform/motion.dart';
import '../theme/app_tokens.dart';

/// A one-time accent wash over a row that was just added, so the eye finds it. Fades out, then calls [onDone].
/// With reduce motion it skips straight to [onDone].
class SavePulse extends StatefulWidget {
  const SavePulse({required this.child, required this.onDone, super.key});

  final Widget child;
  final VoidCallback onDone;

  @override
  State<SavePulse> createState() => _SavePulseState();
}

class _SavePulseState extends State<SavePulse> {
  @override
  Widget build(BuildContext context) {
    final t = context.tokens;
    final d = AppMotion.of(context, AppMotion.slow * 3);
    if (d == Duration.zero) {
      WidgetsBinding.instance.addPostFrameCallback((_) => widget.onDone());
      return widget.child;
    }
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 1, end: 0),
      duration: d,
      curve: AppMotion.exit,
      onEnd: widget.onDone,
      child: widget.child,
      builder: (context, v, child) => DecoratedBox(
        key: const Key('save-pulse'),
        position: DecorationPosition.foreground,
        decoration: BoxDecoration(
          color: t.primaryAccent.withValues(alpha: 0.16 * v),
          borderRadius: BorderRadius.circular(t.radiusMd),
        ),
        child: child,
      ),
    );
  }
}
