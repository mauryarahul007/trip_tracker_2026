import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../domain/logic/expense_list_logic.dart';
import '../../../../domain/models/member.dart';
import '../../application/expenses_providers.dart';

/// Removable chips for the filters set in the filter sheet (category, person, dates, amount, place, kind), shown
/// under the Spend header so a filtered list never looks like the whole trip. Compass spend only.
class CompassActiveFilters extends ConsumerWidget {
  const CompassActiveFilters({required this.tripId, super.key});

  final String tripId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final f = ref.watch(expenseFiltersProvider(tripId));
    final notifier = ref.read(expenseFiltersProvider(tripId).notifier);
    final cats = {for (final c in ref.watch(tripCategoriesProvider(tripId))) c.id: c.name};
    final members = {for (final m in ref.watch(tripMembersProvider(tripId)).value ?? const <Member>[]) m.id: m.name};
    final chips = <(String, String, ExpenseFilters)>[
      if (f.categoryId.isNotEmpty) ('category', cats[f.categoryId] ?? 'Category', f.copyWith(categoryId: '')),
      if (f.memberId.isNotEmpty) ('member', members[f.memberId] ?? 'Person', f.copyWith(memberId: '')),
      if (f.dateFrom.isNotEmpty || f.dateTo.isNotEmpty)
        (
          'dates',
          '${f.dateFrom.isEmpty ? '…' : f.dateFrom} to ${f.dateTo.isEmpty ? '…' : f.dateTo}',
          f.copyWith(dateFrom: '', dateTo: ''),
        ),
      if (f.amountMin.isNotEmpty || f.amountMax.isNotEmpty)
        (
          'amount',
          '${f.amountMin.isEmpty ? '' : '≥ ${f.amountMin}'} ${f.amountMax.isEmpty ? '' : '≤ ${f.amountMax}'}'.trim(),
          f.copyWith(amountMin: '', amountMax: ''),
        ),
      if (f.location.isNotEmpty) ('place', f.location, f.copyWith(location: '')),
      if (f.onlyPersonal) ('personal', 'Personal only', f.copyWith(onlyPersonal: false)),
    ];
    if (chips.isEmpty) return const SizedBox.shrink();
    return Padding(
      key: const Key('compass-active-filters'),
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
      child: Wrap(
        spacing: 8,
        runSpacing: 4,
        children: [
          for (final (key, label, next) in chips)
            InputChip(
              key: Key('active-filter-$key'),
              label: Text(label),
              onDeleted: () => notifier.set(next),
              deleteButtonTooltipMessage: 'Remove filter',
            ),
        ],
      ),
    );
  }
}
