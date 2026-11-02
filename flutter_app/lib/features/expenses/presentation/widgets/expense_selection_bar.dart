import 'package:flutter/material.dart';

import '../../../../shared/theme/app_tokens.dart';

/// The bar that appears while several expenses are selected on the Spend tab (flag `enableExpenseMultiSelect`):
/// how many, Select all, and Delete / Personal / Category for all of them.
class ExpenseSelectionBar extends StatelessWidget {
  const ExpenseSelectionBar({
    required this.count,
    required this.onClose,
    required this.onSelectAll,
    required this.onDelete,
    this.onPersonal,
    this.personalLabel = 'Personal',
    this.onCategory,
    super.key,
  });

  final int count;
  final VoidCallback onClose;
  final VoidCallback onSelectAll;
  final VoidCallback onDelete;

  /// Null hides the button (e.g. only refunds are selected, which have no personal toggle).
  final VoidCallback? onPersonal;
  final String personalLabel;

  /// Null hides the button.
  final VoidCallback? onCategory;

  @override
  Widget build(BuildContext context) {
    final t = context.tokens;
    return Semantics(
      container: true,
      liveRegion: true,
      label: '$count selected',
      child: Material(
        key: const Key('selection-bar'),
        color: t.bgSurface,
        elevation: 8,
        shadowColor: t.shadowBase.withValues(alpha: 0.4),
        borderRadius: BorderRadius.circular(t.radiusMd),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(4, 6, 8, 6),
          // One flat Wrap: on a phone the count sits on the first line and the actions drop to a second one.
          child: Wrap(
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              IconButton(
                key: const Key('selection-close'),
                tooltip: 'Cancel selection',
                icon: const Icon(Icons.close_rounded),
                onPressed: onClose,
              ),
              Text('$count selected', style: const TextStyle(fontWeight: FontWeight.w800)),
              TextButton(key: const Key('selection-all'), onPressed: onSelectAll, child: const Text('All')),
              if (onPersonal != null)
                TextButton.icon(
                  key: const Key('selection-personal'),
                  onPressed: onPersonal,
                  icon: const Icon(Icons.person_outline_rounded, size: 18),
                  label: Text(personalLabel),
                ),
              if (onCategory != null)
                TextButton.icon(
                  key: const Key('selection-category'),
                  onPressed: onCategory,
                  icon: const Icon(Icons.category_outlined, size: 18),
                  label: const Text('Category'),
                ),
              TextButton.icon(
                key: const Key('selection-delete'),
                style: TextButton.styleFrom(foregroundColor: t.dangerColor),
                onPressed: onDelete,
                icon: const Icon(Icons.delete_outline_rounded, size: 18),
                label: const Text('Delete'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
