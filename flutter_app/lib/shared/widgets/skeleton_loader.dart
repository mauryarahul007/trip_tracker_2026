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

/// What the loading page should look like, so the skeleton matches the screen that replaces it.
enum SkeletonShape { list, balances, spend, people }

/// A whole page of soft placeholder blocks shown while a tab loads. With `enableShapedSkeletons` on, [shape] draws
/// the real layout (Balances hero and people, Spend summary and day rows, People rows); off, a summary card and
/// plain rows. With `enableSkeletonLoaders` off it is the plain spinner.
class SkeletonPage extends ConsumerWidget {
  const SkeletonPage({super.key, this.rows = 5, this.shape = SkeletonShape.list});
  final int rows;
  final SkeletonShape shape;

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
    final shaped = ref.watch(flagProvider(('enableShapedSkeletons', null))).value ?? true;
    final children = !shaped || shape == SkeletonShape.list
        ? [block(120), for (var i = 0; i < rows; i++) block(64)]
        : _shaped(t);
    return SkeletonLoader(
      child: ListView(
        key: const Key('skeleton-page'),
        physics: const NeverScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        children: [
          if (shaped && shape != SkeletonShape.list) SizedBox.shrink(key: Key('skeleton-${shape.name}')),
          ...children,
        ],
      ),
    );
  }

  List<Widget> _shaped(AppTokens t) {
    final fill = t.bgSurface;
    Widget bar(double w, double h) => Container(
      width: w,
      height: h,
      decoration: BoxDecoration(color: t.borderColor, borderRadius: BorderRadius.circular(h / 2)),
    );
    Widget row({required bool round, bool amount = true}) => Container(
      height: 64,
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 14),
      decoration: BoxDecoration(color: fill, borderRadius: BorderRadius.circular(t.radiusMd)),
      child: Row(
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: t.borderColor,
              borderRadius: BorderRadius.circular(round ? 18 : t.radiusSm),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [bar(140, 12), const SizedBox(height: 8), bar(90, 10)],
            ),
          ),
          if (amount) bar(56, 14),
        ],
      ),
    );
    Widget hero(double h) => Container(
      height: h,
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(color: fill, borderRadius: BorderRadius.circular(t.radiusLg)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [bar(80, 10), const SizedBox(height: 12), bar(160, 28), const SizedBox(height: 12), bar(120, 10)],
      ),
    );
    return switch (shape) {
      SkeletonShape.balances => [hero(150), for (var i = 0; i < rows; i++) row(round: true)],
      SkeletonShape.spend => [
        hero(110),
        Padding(
          padding: const EdgeInsets.only(bottom: 10, left: 4),
          child: Align(alignment: Alignment.centerLeft, child: bar(70, 10)),
        ),
        for (var i = 0; i < rows; i++) row(round: false),
      ],
      SkeletonShape.people => [for (var i = 0; i < rows + 1; i++) row(round: true, amount: false)],
      SkeletonShape.list => const [],
    };
  }
}
