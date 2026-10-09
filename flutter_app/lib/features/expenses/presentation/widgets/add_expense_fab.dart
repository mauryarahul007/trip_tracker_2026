import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../l10n/l10n_ext.dart';
import '../../../../shared/theme/app_icons.dart';

/// The "Add expense" button shown on both the Summary and the Expenses tab. No hero tag: both tabs stay mounted
/// in the trip pager at once, and two heroes with one tag would clash.
class AddExpenseFab extends StatelessWidget {
  const AddExpenseFab({required this.tripId, super.key});

  final String tripId;

  @override
  Widget build(BuildContext context) {
    return Positioned(
      right: 16,
      bottom: 16,
      child: FloatingActionButton.extended(
        key: Key('add-expense-fab-$tripId'),
        heroTag: null,
        onPressed: () => context.push('/trip/$tripId/expenses/new'),
        icon: const Icon(AppIcons.add),
        label: Text(context.l10n.expAdd),
      ),
    );
  }
}
