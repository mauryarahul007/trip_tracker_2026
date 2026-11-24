import 'package:flutter/material.dart';

import '../../../core/platform/motion.dart';
import '../../../l10n/l10n_ext.dart';
import '../../../shared/theme/app_typography.dart';
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
    if (t.horizon) return const _HorizonSplash();
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

/// Horizon splash: night-navy hero with a sunset glow, the blue app tile, name, tagline and a quiet sync line.
class _HorizonSplash extends StatelessWidget {
  const _HorizonSplash();

  @override
  Widget build(BuildContext context) {
    final t = context.tokens;
    final l10n = context.l10n;
    return AppScaffold(
      backgroundColor: t.heroDeep,
      body: Semantics(
        container: true,
        liveRegion: true,
        label: 'Loading your session',
        child: ExcludeSemantics(
          child: DecoratedBox(
            key: const Key('horizon-splash'),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [t.heroDeep, t.heroMid],
              ),
            ),
            child: Stack(
              children: [
                Positioned(
                  left: -80,
                  right: -80,
                  bottom: -120,
                  child: AspectRatio(
                    aspectRatio: 1,
                    child: DecoratedBox(
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        gradient: RadialGradient(
                          colors: [t.accentOrange.withValues(alpha: 0.42), t.accentOrange.withValues(alpha: 0)],
                        ),
                      ),
                    ),
                  ),
                ),
                Center(
                  child: TweenAnimationBuilder<double>(
                    tween: Tween(begin: 0, end: 1),
                    duration: AppMotion.of(context, AppMotion.slow),
                    curve: AppMotion.enter,
                    builder: (context, v, child) => Opacity(opacity: v, child: child),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(
                          width: 88,
                          height: 88,
                          decoration: BoxDecoration(
                            color: t.primaryAccent,
                            borderRadius: BorderRadius.circular(24),
                            boxShadow: [BoxShadow(color: t.primaryAccent.withValues(alpha: 0.5), blurRadius: 32)],
                          ),
                          child: const Icon(Icons.explore_outlined, size: 44, color: Colors.white),
                        ),
                        const SizedBox(height: 24),
                        Text(
                          l10n.appTitle,
                          style: const TextStyle(
                            fontFamily: AppTypography.fontTitle,
                            fontSize: 30,
                            fontWeight: FontWeight.w800,
                            letterSpacing: -0.6,
                            color: Colors.white,
                          ),
                        ),
                        const SizedBox(height: 12),
                        Text(
                          l10n.horizonSplashTagline.toUpperCase(),
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 12,
                            letterSpacing: 3,
                            fontWeight: FontWeight.w600,
                            color: t.mutedOnDark,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                Positioned(
                  left: 0,
                  right: 0,
                  bottom: 48,
                  child: SafeArea(
                    top: false,
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        SizedBox(
                          width: 14,
                          height: 14,
                          child: CircularProgressIndicator(strokeWidth: 2, color: t.mutedOnDark),
                        ),
                        const SizedBox(width: 10),
                        Flexible(
                          child: Text(
                            l10n.horizonSplashSyncing,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(fontSize: 13, color: t.mutedOnDark),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
