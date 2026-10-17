import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../data/providers.dart';
import '../../../../l10n/l10n_ext.dart';
import '../../../../shared/theme/app_icons.dart';
import '../../../../shared/widgets/app_sheet.dart';
import '../quick_add_sheet.dart';

/// The "Add expense" button shown on both the Summary and the Expenses tab. No hero tag: both tabs stay mounted
/// in the trip pager at once, and two heroes with one tag would clash.
///
/// With `enableQuickAddSpeedDial` it offers Quick add (type a sentence or speak) and the full form; without it the
/// button opens the full form straight away.
class AddExpenseFab extends ConsumerWidget {
  const AddExpenseFab({required this.tripId, super.key});

  final String tripId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dial = ref.watch(flagProvider(('enableQuickAddSpeedDial', tripId))).value ?? true;
    return Positioned(
      right: 16,
      bottom: 16,
      child: FloatingActionButton.extended(
        key: Key('add-expense-fab-$tripId'),
        heroTag: null,
        onPressed: () => dial ? _choose(context) : context.push('/trip/$tripId/expenses/new'),
        icon: const Icon(AppIcons.add),
        label: Text(context.l10n.expAdd),
      ),
    );
  }

  Future<void> _choose(BuildContext context) async {
    final l10n = context.l10n;
    final pick = await AppSheet.show<String>(
      context: context,
      title: l10n.expAdd,
      builder: (ctx) => Padding(
        padding: const EdgeInsets.fromLTRB(8, 0, 8, 16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              key: const Key('fab-quick'),
              leading: const Icon(Icons.bolt_rounded),
              title: Text(l10n.toolsQuickAdd),
              subtitle: Text(l10n.expQuickAddHint),
              onTap: () => Navigator.pop(ctx, 'quick'),
            ),
            ListTile(
              key: const Key('fab-full'),
              leading: const Icon(Icons.edit_note_rounded),
              title: Text(l10n.expFullForm),
              subtitle: Text(l10n.expFullFormHint),
              onTap: () => Navigator.pop(ctx, 'full'),
            ),
          ],
        ),
      ),
    );
    if (!context.mounted || pick == null) return;
    if (pick == 'full') {
      await context.push('/trip/$tripId/expenses/new');
    } else {
      await AppSheet.show<void>(
        context: context,
        builder: (_) => QuickAddSheet(tripId: tripId),
      );
    }
  }
}
