import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/platform/motion.dart';
import '../../data/providers.dart';
import '../theme/app_tokens.dart';

/// A pulsing skeleton placeholder for content loading states.
class SkeletonLoader extends StatefulWidget {
  const SkeletonLoader({super.key, required this.child, this.enabled = true});

  final Widget child;
  final bool enabled;

  @override
  State<SkeletonLoader> createState() => _SkeletonLoaderState();
}

class _SkeletonLoaderState extends State<SkeletonLoader> with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _animation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(vsync: this, duration: const Duration(milliseconds: 1200))..repeat(reverse: true);
    _animation = Tween<double>(
      begin: 0.35,
      end: 0.85,
    ).animate(CurvedAnimation(parent: _controller, curve: Curves.easeInOut));
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (!widget.enabled || AppMotion.reduce || MediaQuery.disableAnimationsOf(context)) return widget.child;

    return AnimatedBuilder(
      animation: _animation,
      builder: (context, child) {
        return Opacity(opacity: _animation.value, child: widget.child);
      },
    );
  }
}

/// A convenient rounded box placeholder.
class SkeletonBox extends StatelessWidget {
  const SkeletonBox({super.key, this.width, this.height = 16, this.borderRadius});

  final double? width;
  final double height;
  final BorderRadius? borderRadius;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    return Container(
      width: width,
      height: height,
      decoration: BoxDecoration(
        color: tokens.borderColor.withValues(alpha: 0.6),
        borderRadius: borderRadius ?? BorderRadius.circular(tokens.radiusSm),
      ),
    );
  }
}

/// A circular skeleton placeholder (e.g. for avatars).
class SkeletonCircle extends StatelessWidget {
  const SkeletonCircle({super.key, this.size = 40});

  final double size;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(color: tokens.borderColor.withValues(alpha: 0.6), shape: BoxShape.circle),
    );
  }
}

/// A whole page of soft placeholder blocks (a summary card and a few rows) shown while a tab loads. With
/// `enableSkeletonLoaders` off it is the plain spinner.
class SkeletonPage extends ConsumerWidget {
  const SkeletonPage({super.key, this.rows = 5});
  final int rows;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (!(ref.watch(flagProvider(('enableSkeletonLoaders', null))).value ?? true)) {
      return const Center(child: CircularProgressIndicator());
    }
    final t = context.tokens;
    Widget block(double h) => Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Container(
        height: h,
        decoration: BoxDecoration(color: t.bgSurface, borderRadius: BorderRadius.circular(t.radiusMd)),
      ),
    );
    return SkeletonLoader(
      child: ListView(
        key: const Key('skeleton-page'),
        physics: const NeverScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        children: [block(120), for (var i = 0; i < rows; i++) block(64)],
      ),
    );
  }
}
