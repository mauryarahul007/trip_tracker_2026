import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../domain/logic/expense_list_logic.dart';
import '../../../../domain/models/category.dart';
import '../../../../domain/models/expense.dart';
import '../../../../domain/models/member.dart';
import '../../../../l10n/l10n_ext.dart';
import '../../../../shared/theme/app_tokens.dart';
import '../../../../shared/theme/app_typography.dart';
import '../../../../shared/widgets/app_button.dart';
import '../../../../shared/widgets/app_text_field.dart';

String _ymd(DateTime d) =>
    '${d.year.toString().padLeft(4, '0')}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

/// Full-height filters page (web parity): my expenses, category, paid by, date range, amount range. The
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

  Future<void> _pickDate({required bool from}) async {
    final current = DateTime.tryParse(from ? _f.dateFrom : _f.dateTo);
    final now = DateTime.now();
    final d = await showDatePicker(
      context: context,
      initialDate: current ?? now,
      firstDate: DateTime(now.year - 5),
      lastDate: DateTime(now.year + 5),
    );
    if (d == null) return;
    setState(() => _f = from ? _f.copyWith(dateFrom: _ymd(d)) : _f.copyWith(dateTo: _ymd(d)));
  }

  Widget _dateField(Key key, String value, String hint, {required bool from}) {
    final t = context.tokens;
    return InkWell(
      key: key,
      borderRadius: BorderRadius.circular(14),
      onTap: () => _pickDate(from: from),
      child: Container(
        constraints: const BoxConstraints(minHeight: 52),
        padding: const EdgeInsets.symmetric(horizontal: 14),
        decoration: BoxDecoration(
          border: Border.all(color: t.borderColor),
          borderRadius: BorderRadius.circular(14),
        ),
        child: Row(
          children: [
            Expanded(
              child: Text(
                value.isEmpty ? hint : value,
                style: TextStyle(color: value.isEmpty ? t.textMuted : t.textPrimary, fontSize: 15),
              ),
            ),
            Icon(Icons.calendar_today_outlined, size: 18, color: t.textSecondary),
          ],
        ),
      ),
    );
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
    final t = context.tokens;
    final count = filterExpenses(widget.all, _f, myMemberId: widget.myMemberId).length;
    Widget chips(List<Widget> children) => Wrap(spacing: 8, runSpacing: 6, children: children);
    ChoiceChip chip({
      Key? key,
      required String label,
      required bool selected,
      required ValueChanged<bool> onSelected,
    }) => ChoiceChip(
      key: key,
      showCheckmark: false,
      shape: const StadiumBorder(),
      label: Text(label, overflow: TextOverflow.ellipsis),
      selected: selected,
      onSelected: onSelected,
    );
    return Column(
      children: [
        // Branded header with a close button, like the web filters page.
        Container(
          color: t.primaryAccent,
          padding: const EdgeInsets.fromLTRB(20, 8, 8, 8),
          child: Row(
            children: [
              Expanded(
                child: Text(
                  l10n.expFilters,
                  key: const Key('filters-title'),
                  style: TextStyle(
                    fontFamily: AppTypography.fontTitle,
                    fontSize: 22,
                    fontWeight: FontWeight.w800,
                    color: t.ctaFg,
                  ),
                ),
              ),
              IconButton(
                key: const Key('filters-close'),
                tooltip: MaterialLocalizations.of(context).closeButtonTooltip,
                icon: Icon(Icons.close_rounded, color: t.ctaFg),
                onPressed: () => Navigator.of(context).pop(),
              ),
            ],
          ),
        ),
        Expanded(
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (widget.myMemberId != null) ...[
                  _label('My expenses'),
                  const SizedBox(height: 8),
                  chips([
                    chip(
                      key: const Key('filter-paid-by-me'),
                      label: l10n.expPaidByMe,
                      selected: _f.relation == ExpenseRelation.paidByMe,
                      onSelected: (s) => setState(
                        () =>
                            _f = s ? _f.copyWith(relation: ExpenseRelation.paidByMe) : _f.copyWith(clearRelation: true),
                      ),
                    ),
                    chip(
                      key: const Key('filter-included'),
                      label: "I'm included in",
                      selected: _f.relation == ExpenseRelation.involvesMe,
                      onSelected: (s) => setState(
                        () => _f = s
                            ? _f.copyWith(relation: ExpenseRelation.involvesMe)
                            : _f.copyWith(clearRelation: true),
                      ),
                    ),
                  ]),
                  const SizedBox(height: 20),
                ],
                _label('Type'),
                const SizedBox(height: 8),
                chips([
                  chip(
                    key: const Key('filter-type-expense'),
                    label: 'Expenses',
                    selected: _f.entryKind == EntryKind.expense,
                    onSelected: (s) => setState(
                      () => _f = s
                          ? _f.copyWith(entryKind: EntryKind.expense)
                          : _f.copyWith(clearEntryKind: true),
                    ),
                  ),
                  chip(
                    key: const Key('filter-type-refund'),
                    label: 'Refunds',
                    selected: _f.entryKind == EntryKind.refund,
                    onSelected: (s) => setState(
                      () => _f = s
                          ? _f.copyWith(entryKind: EntryKind.refund)
                          : _f.copyWith(clearEntryKind: true),
                    ),
                  ),
                ]),
                const SizedBox(height: 20),
                _label(l10n.filterCategory),
                const SizedBox(height: 8),
                chips([
                  for (final c in widget.categories)
                    chip(
                      key: Key('filter-category-${c.id}'),
                      label: '${c.icon != null && !c.icon!.contains(':') ? '${c.icon} ' : ''}${c.name}',
                      selected: _f.categoryId == c.id,
                      onSelected: (on) => setState(() => _f = _f.copyWith(categoryId: on ? c.id : '')),
                    ),
                ]),
                const SizedBox(height: 20),
                _label('Paid by'),
                const SizedBox(height: 8),
                chips([
                  for (final m in widget.members)
                    chip(
                      key: Key('filter-member-${m.id}'),
                      label: m.name,
                      selected: _f.memberId == m.id,
                      onSelected: (on) => setState(() => _f = _f.copyWith(memberId: on ? m.id : '')),
                    ),
                ]),
                const SizedBox(height: 20),
                _label('Date range'),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(child: _dateField(const Key('filter-date-from'), _f.dateFrom, 'dd/mm/yyyy', from: true)),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 8),
                      child: Text('to', style: TextStyle(color: t.textMuted)),
                    ),
                    Expanded(child: _dateField(const Key('filter-date-to'), _f.dateTo, 'dd/mm/yyyy', from: false)),
                  ],
                ),
                const SizedBox(height: 20),
                _label('Amount range'),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      child: AppTextField(
                        controller: _min,
                        hint: 'Min',
                        keyboardType: const TextInputType.numberWithOptions(decimal: true),
                        onChanged: (v) => setState(() => _f = _f.copyWith(amountMin: v)),
                      ),
                    ),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 8),
                      child: Text('to', style: TextStyle(color: t.textMuted)),
                    ),
                    Expanded(
                      child: AppTextField(
                        controller: _max,
                        hint: 'Max',
                        keyboardType: const TextInputType.numberWithOptions(decimal: true),
                        onChanged: (v) => setState(() => _f = _f.copyWith(amountMax: v)),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
        // Pinned footer: Clear all beside the live result count.
        Material(
          color: t.bgSurface,
          elevation: 6,
          child: SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 12, 20, 12),
              child: Row(
                children: [
                  OutlinedButton(
                    key: const Key('filter-clear-all'),
                    style: OutlinedButton.styleFrom(minimumSize: const Size(96, 52)),
                    onPressed: () {
                      widget.onApply(ExpenseFilters(query: _f.query));
                      Navigator.of(context).pop();
                    },
                    child: const Text('Clear all'),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: AppButton(
                      label: l10n.filterResults(count),
                      isFullWidth: true,
                      onPressed: () {
                        widget.onApply(_f);
                        Navigator.of(context).pop();
                      },
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }
}
