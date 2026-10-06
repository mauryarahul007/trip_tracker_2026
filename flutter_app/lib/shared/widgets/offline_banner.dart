import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/network/connectivity_provider.dart';
import '../theme/app_icons.dart';
import '../theme/app_tokens.dart';

/// An animated banner that automatically appears when network connectivity is lost.
class OfflineBanner extends ConsumerWidget {
  const OfflineBanner({super.key, this.customMessage});

  final String? customMessage;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final onlineAsync = ref.watch(isOnlineProvider);
    final isOnline = onlineAsync.asData?.value ?? true;
    final tokens = context.tokens;

    return AnimatedSwitcher(
      duration: tokens.durationNormal,
      transitionBuilder: (child, animation) {
        return SizeTransition(
          sizeFactor: animation,
          alignment: Alignment.topCenter,
          child: child,
        );
      },
      child: isOnline
          ? const SizedBox.shrink(key: ValueKey('online'))
          : Container(
              key: const ValueKey('offline_banner'),
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              decoration: BoxDecoration(
                color: tokens.warningColor.withValues(alpha: 0.15),
                border: Border(
                  bottom: BorderSide(
                    color: tokens.warningColor.withValues(alpha: 0.4),
                    width: 1,
                  ),
                ),
              ),
              child: SafeArea(
                top: false,
                bottom: false,
                child: Row(
                  children: [
                    Icon(
                      AppIcons.offline,
                      size: 16,
                      color: tokens.warningColor,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        customMessage ?? 'You are offline. Changes will sync when reconnected.',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                          color: tokens.warningColor,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
    );
  }
}
