import 'package:flutter/material.dart';

import '../../../../core/platform/haptics.dart';
import '../../../../l10n/l10n_ext.dart';
import '../../../../shared/theme/app_tokens.dart';

/// Swipe left to delete. Swipe right toggles Personal (out of / back in the trip totals) when [onTogglePersonal] is
/// given, else edits (settlements can't be edited). Right swipes spring back; delete removes the row (caller hides it).
class ExpenseSwipe extends StatelessWidget {
  const ExpenseSwipe({
    required this.itemKey,
    required this.child,
    required this.onDelete,
    this.onEdit,
    this.onTogglePersonal,
    this.isPersonal = false,
    super.key,
  });

  final Key itemKey;
  final Widget child;
  final VoidCallback onDelete;
  final VoidCallback? onEdit;
  final VoidCallback? onTogglePersonal;
  final bool isPersonal;

  Widget _bg(BuildContext context, Color color, IconData icon, String label, Alignment align) => Container(
    alignment: align,
    padding: const EdgeInsets.symmetric(horizontal: 20),
    color: color,
    child: Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, color: Colors.white, size: 20),
        const SizedBox(width: 8),
        Text(
          label,
          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600),
        ),
      ],
    ),
  );

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final tokens = context.tokens;
    return Stack(
      children: [
        Dismissible(
          key: itemKey,
          direction: (onEdit ?? onTogglePersonal) == null ? DismissDirection.endToStart : DismissDirection.horizontal,
          background: onTogglePersonal != null
              ? _bg(
                  context,
                  tokens.secondaryAccent,
                  isPersonal ? Icons.groups_outlined : Icons.person_outline_rounded,
                  isPersonal ? l10n.swipeCountAgain : l10n.swipeMakePersonal,
                  Alignment.centerLeft,
                )
              : _bg(context, tokens.primaryAccent, Icons.edit_outlined, l10n.rowEdit, Alignment.centerLeft),
          secondaryBackground: _bg(
            context,
            tokens.colorDanger,
            Icons.delete_outline_rounded,
            l10n.rowDelete,
            Alignment.centerRight,
          ),
          confirmDismiss: (dir) async {
            await AppHaptics.warning();
            if (dir == DismissDirection.startToEnd) {
              (onTogglePersonal ?? onEdit)?.call();
              return false;
            }
            return true;
          },
          onDismissed: (_) => onDelete(),
          child: child,
        ),
        // 28px edges: horizontal drags here change tabs (web EDGE_ZONE_PX).
        // An opaque tap target wins the hit test so the row's dismiss gesture
        // does not compete; the drag itself still reaches the trip PageView.
        const Positioned(left: 0, top: 0, bottom: 0, width: 28, child: _EdgeZone()),
        const Positioned(right: 0, top: 0, bottom: 0, width: 28, child: _EdgeZone()),
      ],
    );
  }
}

class _EdgeZone extends StatelessWidget {
  const _EdgeZone();

  @override
  Widget build(BuildContext context) {
    return GestureDetector(behavior: HitTestBehavior.opaque, onTap: _noop);
  }
}

void _noop() {}
