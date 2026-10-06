import 'package:flutter/material.dart';

import '../../core/platform/haptics.dart';
import '../theme/app_tokens.dart';

/// Styled pull-to-refresh container matching the app design system tokens and haptics.
class AppPullToRefresh extends StatelessWidget {
  const AppPullToRefresh({
    super.key,
    required this.onRefresh,
    required this.child,
  });

  final Future<void> Function() onRefresh;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;

    return RefreshIndicator(
      color: tokens.primaryAccent,
      backgroundColor: tokens.bgSurface,
      displacement: 40,
      edgeOffset: 0,
      strokeWidth: 2.5,
      onRefresh: () async {
        await AppHaptics.light();
        await onRefresh();
        await AppHaptics.selection();
      },
      child: child,
    );
  }
}
