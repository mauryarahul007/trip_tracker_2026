import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../domain/logic/expense_list_logic.dart';
import '../../../../domain/models/category.dart';
import '../../../../domain/models/expense.dart';
import '../../../../domain/models/member.dart';
import '../../../../l10n/l10n_ext.dart';
import '../../../../shared/widgets/app_button.dart';
import '../../../../shared/widgets/app_text_field.dart';
import '../../../trips/presentation/widgets/create_trip_sheet.dart' show dateRangePickerProvider;

String _ymd(DateTime d) => '${d.year.toString().padLeft(4, '0')}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

/// Filter drawer: traveler, category, dates, amount range, relation. The
/// button shows how many expenses the current choices would leave.
class ExpenseFilterSheet extends ConsumerStatefulWidget {
  const ExpenseFilterSheet({
    required this.initial,
    required this.all,
    required this.members,
    required this.categories,
    required this.myMemberId,
    required this.onApply,
    super.key,
  });

  final ExpenseFilters initial;
  final List<Expense> all;
  final List<Member> members;
  final List<Category> categories;
  final String? myMemberId;
  final ValueChanged<ExpenseFilters> onApply;

  @override
  ConsumerState<ExpenseFilterSheet> createState() => _ExpenseFilterSheetState();
}

class _ExpenseFilterSheetState extends ConsumerState<ExpenseFilterSheet> {
  late ExpenseFilters _f = widget.initial;
  late final _min = TextEditingController(text: widget.initial.amountMin);
  late final _max = TextEditingController(text: widget.initial.amountMax);

  @override
  void dispose() {
    _min.dispose();
    _max.dispose();
    super.dispose();
  }

  Future<void> _pickDates() async {
    final r = await ref.read(dateRangePickerProvider)(context, DateTime.now(), null);
    if (r != null) setState(() => _f = _f.copyWith(dateFrom: _ymd(r.start), dateTo: _ymd(r.end)));
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final count = filterExpenses(widget.all, _f, myMemberId: widget.myMemberId).length;
    final hasDates = _f.dateFrom.isNotEmpty || _f.dateTo.isNotEmpty;
    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(20, 4, 20, 20),
      child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        DropdownButtonFormField<String>(
          key: const Key('filter-member'),
          isExpanded: true,
          initialValue: _f.memberId,
          decoration: InputDecoration(labelText: l10n.filterTraveler),
          items: [
            DropdownMenuItem(value: '', child: Text(l10n.filterAny)),
            for (final m in widget.members) DropdownMenuItem(value: m.id, child: Text(m.name, overflow: TextOverflow.ellipsis)),
          ],
          onChanged: (v) => setState(() => _f = _f.copyWith(memberId: v ?? '')),
        ),
        const SizedBox(height: 12),
        DropdownButtonFormField<String>(
          key: const Key('filter-category'),
          isExpanded: true,
          initialValue: _f.categoryId,
          decoration: InputDecoration(labelText: l10n.filterCategory),
          items: [
            DropdownMenuItem(value: '', child: Text(l10n.filterAny)),
            for (final c in widget.categories) DropdownMenuItem(value: c.id, child: Text('${c.icon != null && !c.icon!.contains(':') ? '${c.icon} ' : ''}${c.name}', overflow: TextOverflow.ellipsis)),
          ],
          onChanged: (v) => setState(() => _f = _f.copyWith(categoryId: v ?? '')),
        ),
        const SizedBox(height: 12),
        OutlinedButton.icon(
          key: const Key('filter-dates'),
          onPressed: _pickDates,
          icon: const Icon(Icons.date_range_rounded),
          label: Text(hasDates ? '${_f.dateFrom} → ${_f.dateTo}' : '${l10n.filterFrom} / ${l10n.filterTo}'),
          style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(48)),
        ),
        const SizedBox(height: 12),
        Row(children: [
          Expanded(
            child: AppTextField(
              controller: _min,
              label: l10n.filterMin,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              onChanged: (v) => setState(() => _f = _f.copyWith(amountMin: v)),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: AppTextField(
              controller: _max,
              label: l10n.filterMax,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              onChanged: (v) => setState(() => _f = _f.copyWith(amountMax: v)),
            ),
          ),
        ]),
        if (widget.myMemberId != null) ...[
          const SizedBox(height: 12),
          Wrap(spacing: 8, children: [
            ChoiceChip(
              label: Text(l10n.expPaidByMe),
              selected: _f.relation == ExpenseRelation.paidByMe,
              onSelected: (s) => setState(() => _f = s ? _f.copyWith(relation: ExpenseRelation.paidByMe) : _f.copyWith(clearRelation: true)),
            ),
            ChoiceChip(
              label: Text(l10n.expInvolvesMe),
              selected: _f.relation == ExpenseRelation.involvesMe,
              onSelected: (s) => setState(() => _f = s ? _f.copyWith(relation: ExpenseRelation.involvesMe) : _f.copyWith(clearRelation: true)),
            ),
          ]),
        ],
        const SizedBox(height: 20),
        AppButton(
          label: l10n.filterResults(count),
          isFullWidth: true,
          onPressed: () {
            widget.onApply(_f);
            Navigator.of(context).pop();
          },
        ),
        TextButton(
          onPressed: () {
            widget.onApply(ExpenseFilters(query: _f.query));
            Navigator.of(context).pop();
          },
          child: Text(l10n.expClearFilters),
        ),
      ]),
    );
  }
}
