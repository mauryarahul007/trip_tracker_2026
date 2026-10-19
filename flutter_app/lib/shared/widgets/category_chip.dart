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

    final bg = isSelected ? tokens.primaryAccent.withValues(alpha: 0.1) : tokens.bgSurface;
    final border = isSelected ? tokens.primaryAccent : tokens.borderColor;
    final textColor = isSelected ? tokens.primaryAccent : tokens.textPrimary;

    final Widget chipContent = Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(tokens.radiusFull),
        border: Border.all(color: border, width: isSelected ? 1.5 : 1.0),
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
      child: InkWell(onTap: onTap, borderRadius: BorderRadius.circular(tokens.radiusFull), child: chipContent),
    );
  }
}
