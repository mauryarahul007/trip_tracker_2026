import 'package:flutter/material.dart';

import '../../core/platform/haptics.dart';
import '../theme/app_icons.dart';
import '../theme/app_tokens.dart';

/// A row with slide-to-reveal or swipe-to-delete action capabilities.
class SwipeableRow extends StatelessWidget {
  const SwipeableRow({
    super.key,
    required this.itemKey,
    required this.child,
    required this.onDismissed,
    this.confirmDismiss,
    this.actionIcon = AppIcons.delete,
    this.actionLabel = 'Delete',
    this.backgroundColor,
  });

  final Key itemKey;
  final Widget child;
  final VoidCallback onDismissed;
  final Future<bool> Function()? confirmDismiss;
  final IconData actionIcon;
  final String actionLabel;
  final Color? backgroundColor;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final actionBg = backgroundColor ?? tokens.dangerColor;

    return Dismissible(
      key: itemKey,
      direction: DismissDirection.endToStart,
      confirmDismiss: (direction) async {
        await AppHaptics.warning();
        if (confirmDismiss != null) {
          return await confirmDismiss!();
        }
        return true;
      },
      onDismissed: (_) {
        onDismissed();
      },
      background: Container(
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.symmetric(horizontal: 24),
        decoration: BoxDecoration(color: actionBg, borderRadius: BorderRadius.circular(tokens.radiusMd)),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(actionIcon, color: Colors.white, size: 20),
            const SizedBox(width: 8),
            Text(
              actionLabel,
              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 14),
            ),
          ],
        ),
      ),
      child: child,
    );
  }
}
