import 'package:flutter/material.dart';

import '../theme/app_tokens.dart';

class CategoryChip extends StatelessWidget {
  final String label;
  final String? icon;
  final bool isSelected;
  final VoidCallback? onTap;

  const CategoryChip({super.key, required this.label, this.icon, this.isSelected = false, this.onTap});

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;

    // Horizon (enableHorizonUi): filled 8px chips, the selected one takes the blue tint; no outline.
    final h = tokens.horizon;
    final bg = isSelected
        ? (h ? tokens.primaryAccentLight : tokens.primaryAccent.withValues(alpha: 0.1))
        : (h ? tokens.bgSurfaceHover : tokens.bgSurface);
    final border = h ? bg : (isSelected ? tokens.primaryAccent : tokens.borderColor);
    final textColor = isSelected ? tokens.actionInk : (h ? tokens.textSecondary : tokens.textPrimary);
    final radius = h ? 8.0 : tokens.radiusFull;

    final Widget chipContent = Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(radius),
        border: Border.all(color: border, width: isSelected && !h ? 1.5 : 1.0),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null && icon!.isNotEmpty) ...[
            Text(icon!, style: const TextStyle(fontSize: 14)),
            const SizedBox(width: 6),
          ],
          Text(
            label,
            style: TextStyle(
              fontSize: 13,
              fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
              color: textColor,
            ),
          ),
        ],
      ),
    );

    if (onTap == null) return chipContent;

    return Semantics(
      button: true,
      selected: isSelected,
      label: label,
      child: InkWell(onTap: onTap, borderRadius: BorderRadius.circular(radius), child: chipContent),
    );
  }
}
