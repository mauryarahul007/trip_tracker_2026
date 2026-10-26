import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/flags/compass_flags.dart';
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
    // Compass nav has its own orange Add button in the trip dock.
    // Calm Passport has the same Add button above its dock.
    if (ref.watch(compassFlagProvider((calmPassportFlag, tripId)))) return const SizedBox.shrink();
    if (ref.watch(compassFlagProvider((compassNavFlag, tripId)))) return const SizedBox.shrink();
    return Positioned(
      right: 16,
      bottom: 16,
      child: FloatingActionButton.extended(
        key: Key('add-expense-fab-$tripId'),
        heroTag: null,
        onPressed: () => startAddExpense(context, ref, tripId, dial: dial),
        icon: const Icon(AppIcons.add),
        label: Text(context.l10n.expAdd),
      ),
    );
  }
}

/// Add expense: the Quick add / full form chooser when `enableQuickAddSpeedDial` is on, else the full form.
/// Shared by the legacy floating button and the Compass dock's centre button.
Future<void> startAddExpense(BuildContext context, WidgetRef ref, String tripId, {bool? dial}) async {
  final useDial = dial ?? ref.read(flagProvider(('enableQuickAddSpeedDial', tripId))).value ?? true;
  if (!useDial) {
    await context.push('/trip/$tripId/expenses/new');
    return;
  }
  await _chooseAdd(context, tripId);
}

Future<void> _chooseAdd(BuildContext context, String tripId) async {
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
