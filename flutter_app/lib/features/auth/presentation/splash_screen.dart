import 'package:flutter/material.dart';

import '../../../core/platform/motion.dart';
import '../../../shared/theme/app_tokens.dart';
import '../../../shared/widgets/app_scaffold.dart';
import '../../../shared/widgets/brand_mark.dart';

/// Shown only while the stored session is being restored, so a returning
/// user never sees a flash of the login screen.
class SplashScreen extends StatelessWidget {
  const SplashScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final t = context.tokens;
    // AppScaffold already paints bgPage; no second DecoratedBox needed.
    return AppScaffold(
      backgroundColor: t.bgPage,
      body: Center(
        child: Semantics(
          container: true,
          liveRegion: true,
          label: 'Loading your session',
          child: ExcludeSemantics(
            // Subtle brand fade-in; Duration.zero (reduce motion) lands on the final frame immediately.
            child: TweenAnimationBuilder<double>(
              tween: Tween(begin: 0, end: 1),
              duration: AppMotion.of(context, AppMotion.slow),
              curve: AppMotion.enter,
              builder: (context, v, child) => Opacity(opacity: v, child: child),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const BrandMark(size: 88),
                  const SizedBox(height: 32),
                  SizedBox(
                    width: 22,
                    height: 22,
                    child: CircularProgressIndicator(strokeWidth: 2.5, color: t.textPrimary),
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
