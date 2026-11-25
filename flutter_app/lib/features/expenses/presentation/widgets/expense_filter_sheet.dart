import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../domain/logic/expense_list_logic.dart';
import '../../../../domain/models/category.dart';
import '../../../../domain/models/expense.dart';
import '../../../../domain/models/member.dart';
import '../../../../l10n/l10n_ext.dart';
import '../../../../shared/theme/app_tokens.dart';
import '../../../../shared/theme/app_typography.dart';
import '../../../../shared/theme/category_icons.dart';
import '../../../../shared/widgets/app_avatar.dart';
import '../../../../shared/widgets/bento_tile.dart' show toneFor;
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
    this.tripStart = '',
    this.tripEnd = '',
    super.key,
  });

  /// yyyy-MM-dd trip dates for the Horizon "This trip" date choice; empty hides it.
  final String tripStart;
  final String tripEnd;

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
  bool _custom = false; // Horizon: Custom picked, so the date fields show even while empty
  bool _moreOpen = false;

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

  /// Horizon ("Filter spend" mockup): category chips with icons, payer avatars, an Any / This trip / Today / Custom
  /// switch, "Only ones that involve me", and Clear / Show N. Type, Paid by me and the amount range sit under
  /// "More filters".
  Widget _horizon(BuildContext context, int count) {
    final l10n = context.l10n;
    final t = context.tokens;
    final today = _ymd(DateTime.now());
    final hasTrip = widget.tripStart.isNotEmpty && widget.tripEnd.isNotEmpty;
    final mode = _custom
        ? 'custom'
        : _f.dateFrom.isEmpty && _f.dateTo.isEmpty
        ? 'any'
        : hasTrip && _f.dateFrom == widget.tripStart && _f.dateTo == widget.tripEnd
        ? 'trip'
        : _f.dateFrom == today && _f.dateTo == today
        ? 'today'
        : 'custom';
    void setMode(String m) => setState(() {
      _custom = m == 'custom';
      _f = switch (m) {
        'any' => _f.copyWith(dateFrom: '', dateTo: ''),
        'trip' => _f.copyWith(dateFrom: widget.tripStart, dateTo: widget.tripEnd),
        'today' => _f.copyWith(dateFrom: today, dateTo: today),
        _ => _f,
      };
    });
    Widget seg(String id, String label) => Expanded(
      child: GestureDetector(
        key: Key('filter-dates-$id'),
        behavior: HitTestBehavior.opaque,
        onTap: () => setMode(id),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
            color: mode == id ? t.bgSurface : Colors.transparent,
            borderRadius: BorderRadius.circular(10),
          ),
          child: Text(
            label,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontFamily: AppTypography.fontBody,
              fontSize: 14,
              fontWeight: mode == id ? FontWeight.w700 : FontWeight.w500,
              color: mode == id ? t.textPrimary : t.textSecondary,
            ),
          ),
        ),
      ),
    );
    Widget catChip(Category c) {
      final on = _f.categoryId == c.id;
      final tone = t.tones[toneFor(c.id)];
      final icon = categoryVectorIcon(id: c.id, name: c.name);
      return InkWell(
        key: Key('filter-category-${c.id}'),
        borderRadius: BorderRadius.circular(10),
        onTap: () => setState(() => _f = _f.copyWith(categoryId: on ? '' : c.id)),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
          decoration: BoxDecoration(
            color: on ? tone.bg : t.bgSurfaceHover,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: on ? tone.accent : Colors.transparent),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (icon != null) ...[
                Icon(icon, size: 15, color: on ? tone.accent : t.textSecondary),
                const SizedBox(width: 6),
              ],
              Text(
                c.name.split(' ').first,
                style: TextStyle(
                  fontFamily: AppTypography.fontBody,
                  fontSize: 13.5,
                  fontWeight: FontWeight.w600,
                  color: on ? tone.accent : t.textPrimary,
                ),
              ),
            ],
          ),
        ),
      );
    }

    Widget payer(Member m) {
      final on = _f.memberId == m.id;
      final dim = _f.memberId.isNotEmpty && !on;
      return GestureDetector(
        key: Key('filter-member-${m.id}'),
        onTap: () => setState(() => _f = _f.copyWith(memberId: on ? '' : m.id)),
        child: Opacity(
          opacity: dim ? 0.45 : 1,
          child: Padding(
            padding: const EdgeInsets.only(right: 12),
            child: Column(
              children: [
                Container(
                  padding: const EdgeInsets.all(2),
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(color: on ? t.primaryAccent : Colors.transparent, width: 2),
                  ),
                  child: AppAvatar(name: m.name, avatarUrl: m.avatarUrl, size: 38),
                ),
                const SizedBox(height: 4),
                Text(
                  m.id == widget.myMemberId ? l10n.horizonYou : m.name,
                  style: TextStyle(
                    fontFamily: AppTypography.fontBody,
                    fontSize: 12,
                    fontWeight: on ? FontWeight.w700 : FontWeight.w500,
                    color: t.textSecondary,
                  ),
                ),
              ],
            ),
          ),
        ),
      );
    }

    ChoiceChip chip(Key key, String label, bool selected, ValueChanged<bool> onSelected) => ChoiceChip(
      key: key,
      showCheckmark: false,
      shape: const StadiumBorder(),
      label: Text(label),
      selected: selected,
      onSelected: onSelected,
    );

    return Column(
      key: const Key('horizon-filters'),
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 8, 8, 0),
          child: Row(
            children: [
              Expanded(
                child: Text(
                  l10n.horizonFilterSpend,
                  key: const Key('filters-title'),
                  style: TextStyle(
                    fontFamily: AppTypography.fontTitle,
                    fontSize: 22,
                    fontWeight: FontWeight.w700,
                    color: t.textPrimary,
                  ),
                ),
              ),
              IconButton(
                key: const Key('filters-close'),
                tooltip: MaterialLocalizations.of(context).closeButtonTooltip,
                icon: Icon(Icons.close_rounded, color: t.textSecondary),
                onPressed: () => Navigator.of(context).pop(),
              ),
            ],
          ),
        ),
        Expanded(
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                _label(l10n.filterCategory),
                const SizedBox(height: 8),
                Wrap(spacing: 8, runSpacing: 8, children: [for (final c in widget.categories) catChip(c)]),
                const SizedBox(height: 18),
                _label('Paid by'),
                const SizedBox(height: 8),
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(children: [for (final m in widget.members) payer(m)]),
                ),
                const SizedBox(height: 18),
                _label(l10n.horizonDates),
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.all(4),
                  decoration: BoxDecoration(color: t.bgSurfaceHover, borderRadius: BorderRadius.circular(14)),
                  child: Row(
                    children: [
                      seg('any', l10n.filterAny),
                      if (hasTrip) seg('trip', l10n.horizonThisTrip),
                      seg('today', l10n.horizonToday),
                      seg('custom', l10n.horizonCustom),
                    ],
                  ),
                ),
                if (mode == 'custom') ...[
                  const SizedBox(height: 10),
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
                ],
                if (widget.myMemberId != null) ...[
                  const SizedBox(height: 14),
                  Material(
                    color: t.bgSurface,
                    clipBehavior: Clip.antiAlias,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                      side: BorderSide(color: t.borderColor),
                    ),
                    child: SwitchListTile(
                      key: const Key('filter-involves-me'),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 14),
                      title: Text(
                        l10n.horizonInvolvesMe,
                        style: const TextStyle(
                          fontFamily: AppTypography.fontBody,
                          fontSize: 15,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      value: _f.relation == ExpenseRelation.involvesMe,
                      onChanged: (on) => setState(
                        () => _f = on
                            ? _f.copyWith(relation: ExpenseRelation.involvesMe)
                            : _f.copyWith(clearRelation: true),
                      ),
                    ),
                  ),
                ],
                const SizedBox(height: 6),
                Align(
                  alignment: Alignment.centerLeft,
                  child: TextButton.icon(
                    key: const Key('filter-more'),
                    onPressed: () => setState(() => _moreOpen = !_moreOpen),
                    icon: Icon(_moreOpen ? Icons.expand_less_rounded : Icons.expand_more_rounded, size: 18),
                    label: Text(l10n.horizonMoreFilters),
                  ),
                ),
                if (_moreOpen) ...[
                  Wrap(
                    spacing: 8,
                    runSpacing: 6,
                    children: [
                      if (widget.myMemberId != null)
                        chip(
                          const Key('filter-paid-by-me'),
                          l10n.expPaidByMe,
                          _f.relation == ExpenseRelation.paidByMe,
                          (s) => setState(
                            () => _f = s
                                ? _f.copyWith(relation: ExpenseRelation.paidByMe)
                                : _f.copyWith(clearRelation: true),
                          ),
                        ),
                      chip(
                        const Key('filter-type-expense'),
                        'Expenses',
                        _f.entryKind == EntryKind.expense,
                        (s) => setState(
                          () => _f = s ? _f.copyWith(entryKind: EntryKind.expense) : _f.copyWith(clearEntryKind: true),
                        ),
                      ),
                      chip(
                        const Key('filter-type-refund'),
                        'Refunds',
                        _f.entryKind == EntryKind.refund,
                        (s) => setState(
                          () => _f = s ? _f.copyWith(entryKind: EntryKind.refund) : _f.copyWith(clearEntryKind: true),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
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
              ],
            ),
          ),
        ),
        SafeArea(
          top: false,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 12),
            child: Row(
              children: [
                Expanded(
                  child: SizedBox(
                    height: 52,
                    child: OutlinedButton(
                      key: const Key('filter-clear-all'),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: t.textPrimary,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                        textStyle: const TextStyle(
                          fontFamily: AppTypography.fontBody,
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      onPressed: () {
                        widget.onApply(ExpenseFilters(query: _f.query));
                        Navigator.of(context).pop();
                      },
                      child: Text(l10n.horizonClear),
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: SizedBox(
                    height: 52,
                    child: FilledButton(
                      key: const Key('filter-show'),
                      style: FilledButton.styleFrom(
                        backgroundColor: t.primaryAccent,
                        foregroundColor: t.ctaFg,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                        textStyle: const TextStyle(
                          fontFamily: AppTypography.fontBody,
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      onPressed: () {
                        widget.onApply(_f);
                        Navigator.of(context).pop();
                      },
                      child: Text(l10n.horizonShowN(count)),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final t = context.tokens;
    final count = filterExpenses(widget.all, _f, myMemberId: widget.myMemberId).length;
    if (t.horizon) return _horizon(context, count);
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
        // Horizon: a plain sheet title on the surface, like every other sheet, not a blue band.
        Container(
          color: t.horizon ? null : t.primaryAccent,
          padding: const EdgeInsets.fromLTRB(20, 8, 8, 8),
          child: Row(
            children: [
              Expanded(
                child: Text(
                  l10n.expFilters,
                  key: const Key('filters-title'),
                  style: TextStyle(
                    fontFamily: AppTypography.fontTitle,
                    fontSize: t.horizon ? 20 : 22,
                    fontWeight: t.horizon ? FontWeight.w700 : FontWeight.w800,
                    color: t.horizon ? t.textPrimary : t.ctaFg,
                  ),
                ),
              ),
              IconButton(
                key: const Key('filters-close'),
                tooltip: MaterialLocalizations.of(context).closeButtonTooltip,
                icon: Icon(Icons.close_rounded, color: t.horizon ? t.textSecondary : t.ctaFg),
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
                      () => _f = s ? _f.copyWith(entryKind: EntryKind.expense) : _f.copyWith(clearEntryKind: true),
                    ),
                  ),
                  chip(
                    key: const Key('filter-type-refund'),
                    label: 'Refunds',
                    selected: _f.entryKind == EntryKind.refund,
                    onSelected: (s) => setState(
                      () => _f = s ? _f.copyWith(entryKind: EntryKind.refund) : _f.copyWith(clearEntryKind: true),
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
        // Horizon: a flat footer on a hairline instead of a raised bar.
        Material(
          color: t.bgSurface,
          elevation: t.horizon ? 0 : 6,
          shape: t.horizon ? Border(top: BorderSide(color: t.borderColor)) : null,
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
