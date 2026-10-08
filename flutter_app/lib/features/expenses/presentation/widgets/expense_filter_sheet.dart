import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../domain/logic/expense_list_logic.dart';
import '../../../../domain/models/category.dart';
import '../../../../domain/models/expense.dart';
import '../../../../domain/models/member.dart';
import '../../../../l10n/l10n_ext.dart';
import '../../../../shared/theme/app_tokens.dart';
import '../../../../shared/theme/app_typography.dart';
import '../../../../shared/widgets/app_avatar.dart';
import '../../../../shared/widgets/app_button.dart';
import '../../../../shared/widgets/app_text_field.dart';
import '../../../trips/presentation/widgets/create_trip_sheet.dart' show dateRangePickerProvider;

String _ymd(DateTime d) =>
    '${d.year.toString().padLeft(4, '0')}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

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

  Widget _label(String text) => Text(
    text.toUpperCase(),
    style: TextStyle(
      fontFamily: AppTypography.fontMono,
      fontSize: 10.5,
      fontWeight: FontWeight.w600,
      letterSpacing: 1.1,
      color: context.tokens.textMuted,
    ),
  );

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final count = filterExpenses(widget.all, _f, myMemberId: widget.myMemberId).length;
    final hasDates = _f.dateFrom.isNotEmpty || _f.dateTo.isNotEmpty;
    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(20, 4, 20, 20),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _label(l10n.filterTraveler),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 4,
            children: [
              for (final m in widget.members)
                ChoiceChip(
                  key: Key('filter-member-${m.id}'),
                  showCheckmark: false,
                  shape: const StadiumBorder(),
                  avatar: AppAvatar(name: m.name, size: 22),
                  label: Text(m.name, overflow: TextOverflow.ellipsis),
                  selected: _f.memberId == m.id,
                  onSelected: (on) => setState(() => _f = _f.copyWith(memberId: on ? m.id : '')),
                ),
            ],
          ),
          const SizedBox(height: 16),
          _label(l10n.filterCategory),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 4,
            children: [
              for (final c in widget.categories)
                ChoiceChip(
                  key: Key('filter-category-${c.id}'),
                  showCheckmark: false,
                  shape: const StadiumBorder(),
                  label: Text('${c.icon != null && !c.icon!.contains(':') ? '${c.icon} ' : ''}${c.name}'),
                  selected: _f.categoryId == c.id,
                  onSelected: (on) => setState(() => _f = _f.copyWith(categoryId: on ? c.id : '')),
                ),
            ],
          ),
          const SizedBox(height: 16),
          OutlinedButton.icon(
            key: const Key('filter-dates'),
            onPressed: _pickDates,
            icon: const Icon(Icons.date_range_rounded),
            label: Text(hasDates ? '${_f.dateFrom} → ${_f.dateTo}' : '${l10n.filterFrom} / ${l10n.filterTo}'),
            style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(48)),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
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
            ],
          ),
          if (widget.myMemberId != null) ...[
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              children: [
                ChoiceChip(
                  showCheckmark: false,
                  shape: const StadiumBorder(),
                  label: Text(l10n.expPaidByMe),
                  selected: _f.relation == ExpenseRelation.paidByMe,
                  onSelected: (s) => setState(
                    () => _f = s ? _f.copyWith(relation: ExpenseRelation.paidByMe) : _f.copyWith(clearRelation: true),
                  ),
                ),
                ChoiceChip(
                  showCheckmark: false,
                  shape: const StadiumBorder(),
                  label: Text(l10n.expInvolvesMe),
                  selected: _f.relation == ExpenseRelation.involvesMe,
                  onSelected: (s) => setState(
                    () => _f = s ? _f.copyWith(relation: ExpenseRelation.involvesMe) : _f.copyWith(clearRelation: true),
                  ),
                ),
              ],
            ),
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
        ],
      ),
    );
  }
}
