import 'package:flutter/material.dart';

import '../../../../core/platform/haptics.dart';
import '../../../../l10n/l10n_ext.dart';
import '../../../../shared/theme/app_tokens.dart';

/// Swipe right to edit (settlements can't be edited), left to delete. Edit
/// springs back (it opens a screen); delete removes the row (caller hides it).
class ExpenseSwipe extends StatelessWidget {
  const ExpenseSwipe({required this.itemKey, required this.child, required this.onDelete, this.onEdit, super.key});

  final Key itemKey;
  final Widget child;
  final VoidCallback onDelete;
  final VoidCallback? onEdit;

  Widget _bg(BuildContext context, Color color, IconData icon, String label, Alignment align) => Container(
        alignment: align,
        padding: const EdgeInsets.symmetric(horizontal: 20),
        color: color,
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          Icon(icon, color: Colors.white, size: 20),
          const SizedBox(width: 8),
          Text(label, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
        ]),
      );

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final tokens = context.tokens;
    return Dismissible(
      key: itemKey,
      direction: onEdit == null ? DismissDirection.endToStart : DismissDirection.horizontal,
      background: _bg(context, tokens.primaryAccent, Icons.edit_outlined, l10n.rowEdit, Alignment.centerLeft),
      secondaryBackground: _bg(context, tokens.colorDanger, Icons.delete_outline_rounded, l10n.rowDelete, Alignment.centerRight),
      confirmDismiss: (dir) async {
        await AppHaptics.warning();
        if (dir == DismissDirection.startToEnd) {
          onEdit?.call();
          return false;
        }
        return true;
      },
      onDismissed: (_) => onDelete(),
      child: child,
    );
  }
}
