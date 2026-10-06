import 'dart:async';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/format/money.dart';
import '../../../data/platform/receipt_picker.dart';
import '../../../data/providers.dart';
import '../../../domain/logic/category_color.dart';
import '../../../domain/logic/currency.dart';
import '../application/money_providers.dart';
import '../../../domain/logic/expense_form_logic.dart';
import '../../../domain/models/category.dart';
import '../../../domain/models/expense.dart';
import '../../../domain/models/group.dart';
import '../../../domain/models/trip.dart' show TripFxConfig;
import '../../../domain/models/member.dart';
import '../../../l10n/l10n_ext.dart';
import '../../../shared/theme/app_icons.dart';
import '../../../shared/theme/app_tokens.dart';
import '../../../shared/widgets/app_button.dart';
import '../../../shared/widgets/app_scaffold.dart';
import '../../../shared/widgets/app_sheet.dart';
import '../../../shared/widgets/app_text_field.dart';
import '../../trip_details/application/trip_nav.dart';
import '../../trips/presentation/widgets/create_trip_sheet.dart' show dateRangePickerProvider;
import '../application/expense_form_controller.dart';
import '../application/expenses_providers.dart';
import 'widgets/form_sheets.dart';

String _fmt(BuildContext c, double v, String code) => formatMoney(c, v, code);

/// Add / edit an expense. Waits for trip, members, expenses and flags so the
/// form never starts with the wrong controls.
class ExpenseFormScreen extends ConsumerWidget {
  const ExpenseFormScreen({required this.tripId, this.expenseId, super.key});
  final String tripId;
  final String? expenseId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final trip = ref.watch(tripProvider(tripId)).value;
    final expenses = ref.watch(tripExpensesProvider(tripId));
    final flags = ref.watch(formFlagsProvider(tripId));
    final membersReady = ref.watch(tripMembersProvider(tripId)).hasValue;
    final ready = trip != null && expenses.hasValue && flags.hasValue && membersReady;
    return AppScaffold(
      appBar: AppBar(
        title: Text(expenseId == null ? l10n.formTitleAdd : l10n.formTitleEdit),
        leading: IconButton(tooltip: l10n.actionClose, icon: const Icon(AppIcons.close), onPressed: () => context.pop()),
      ),
      body: ready ? _FormBody(args: ExpenseFormArgs(tripId, expenseId)) : const Center(child: CircularProgressIndicator()),
    );
  }
}

class _FormBody extends ConsumerStatefulWidget {
  const _FormBody({required this.args});
  final ExpenseFormArgs args;

  @override
  ConsumerState<_FormBody> createState() => _FormBodyState();
}

class _FormBodyState extends ConsumerState<_FormBody> {
  late final TextEditingController _title;
  late final TextEditingController _amount;
  final _quick = TextEditingController();
  bool _quickOpen = false;
  String? _quickError;
  late final Set<String> _initialExpenseIds;

  ExpenseFormArgs get args => widget.args;
  ExpenseFormController get _c => ref.read(expenseFormProvider(args).notifier);

  @override
  void initState() {
    super.initState();
    final s = ref.read(expenseFormProvider(args));
    _title = TextEditingController(text: s.title);
    _amount = TextEditingController(text: s.amount);
    // Duplicate detection only compares with what existed when the form opened.
    _initialExpenseIds = {for (final e in ref.read(tripExpensesProvider(args.tripId)).value ?? const <Expense>[]) e.id};
  }

  @override
  void dispose() {
    _title.dispose();
    _amount.dispose();
    _quick.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final outcome = await _c.submit();
    if (outcome.isOk && mounted) context.pop();
  }

  Future<void> _pickDate() async {
    final s = ref.read(expenseFormProvider(args));
    final d = DateTime.tryParse(s.date) ?? DateTime.now();
    final r = await ref.read(dateRangePickerProvider)(context, d, DateTimeRange(start: d, end: d));
    if (r != null) _c.setDate(todayDateString(r.start));
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final tokens = context.tokens;
    final id = args.tripId;
    final s = ref.watch(expenseFormProvider(args));
    final c = _c;
    final flags = c.flags;
    final trip = ref.watch(tripProvider(id)).value!;
    final members = ref.watch(visibleMembersProvider(id));
    final byId = {for (final m in members) m.id: m};
    final categories = ref.watch(tripCategoriesProvider(id));
    final groups = ref.watch(tripGroupsProvider(id)).value ?? const <Group>[];
    final base = trip.baseCurrency.isEmpty ? 'INR' : trip.baseCurrency;
    final foreign = s.currency != base;

    // Programmatic changes (clone, chips, quick fill, draft discard) must reach the text fields.
    ref.listen(expenseFormProvider(args), (prev, next) {
      if (next.title != _title.text) _title.value = TextEditingValue(text: next.title, selection: TextSelection.collapsed(offset: next.title.length));
      if (next.amount != _amount.text) _amount.value = TextEditingValue(text: next.amount, selection: TextSelection.collapsed(offset: next.amount.length));
    });

    final input = c.toInput();
    final preview = c.preview();
    final amountVal = c.evaluatedAmount;
    final status = splitConfigStatus(input);
    final dup = c.duplicate(_initialExpenseIds);
    final dupShown = dup != null && dup.matchedExpense.id != s.ignoredDuplicateId;
    final live = flags.currencyFx ? liveRatesOf(ref) : const <String, double>{};
    final customRates = ref.watch(tripProvider(id)).value?.fxConfig?.customRates;
    final conversion = flags.currencyFx && foreign && (amountVal ?? 0) > 0
        ? convertCurrency(amountVal!, s.currency, base, fxOverlay(live: live, custom: customRates))
        : null;
    final modes = <(String, String)>[
      ('equal', l10n.formModeEqual),
      if (flags.itemized || s.splitMode == 'itemized') ('itemized', l10n.formModeItemized),
      if (flags.advancedSplits || {'custom', 'exact', 'percentage'}.contains(s.splitMode)) ...[
        ('custom', l10n.formModeShares),
        ('exact', l10n.formModeExact),
        ('percentage', l10n.formModePercent),
      ],
    ];

    Widget section(String title, Widget child) => Padding(
          padding: const EdgeInsets.only(top: 18),
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            Text(title, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: tokens.textSecondary)),
            const SizedBox(height: 8),
            child,
          ]),
        );

    final receiptSection = flags.receiptUpload || s.receiptPath != null
        ? section(
            l10n.formReceipt,
            s.receiptPath != null
                ? Row(children: [
                    ClipRRect(
                      borderRadius: BorderRadius.circular(8),
                      child: Image.file(File(s.receiptPath!), key: const Key('receipt-preview'), width: 64, height: 64, fit: BoxFit.cover,
                          errorBuilder: (_, _, _) => const SizedBox(width: 64, height: 64, child: Icon(Icons.image_outlined))),
                    ),
                    const SizedBox(width: 12),
                    Expanded(child: Text(l10n.formReceiptAttached)),
                    TextButton(key: const Key('receipt-remove'), onPressed: c.removeReceipt, child: Text(l10n.formReceiptRemove)),
                  ])
                : Wrap(spacing: 8, children: [
                    OutlinedButton.icon(key: const Key('receipt-camera'), onPressed: () => c.pickReceipt(ReceiptSource.camera), icon: const Icon(AppIcons.camera), label: Text(l10n.formReceiptCamera)),
                    OutlinedButton.icon(key: const Key('receipt-gallery'), onPressed: () => c.pickReceipt(ReceiptSource.gallery), icon: const Icon(AppIcons.image), label: Text(l10n.formReceiptGallery)),
                  ]),
          )
        : const SizedBox.shrink();

    final moreDetails = flags.compactForm
        ? ExpansionTile(
            key: const Key('more-details'),
            tilePadding: EdgeInsets.zero,
            initiallyExpanded: s.receiptPath != null,
            title: Text(l10n.formMoreDetails),
            children: [receiptSection],
          )
        : receiptSection;

    return PopScope(
      canPop: true,
      child: Column(children: [
        Expanded(
          child: SingleChildScrollView(
            keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
            padding: EdgeInsets.fromLTRB(16, flags.compactForm ? 0 : 4, 16, flags.compactForm ? 16 : 24),
            child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              if (s.draftRestored)
                Container(
                  key: const Key('draft-banner'),
                  margin: const EdgeInsets.only(top: 8),
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(color: tokens.primaryAccent.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(10)),
                  child: Row(children: [
                    Expanded(child: Text(l10n.formDraftRestored)),
                    TextButton(key: const Key('draft-discard'), onPressed: c.discardDraft, child: Text(l10n.formDiscardDraft)),
                  ]),
                ),
              if (!c.editing)
                Wrap(spacing: 8, children: [
                  if (flags.cloneLast && c.lastExpense != null)
                    ActionChip(key: const Key('same-as-last'), avatar: const Icon(Icons.history_rounded, size: 16), label: Text(l10n.formSameAsLast), onPressed: c.applyLast),
                  ActionChip(key: const Key('quick-fill-toggle'), avatar: const Icon(Icons.bolt_rounded, size: 16), label: Text(l10n.formQuickFill), onPressed: () => setState(() => _quickOpen = !_quickOpen)),
                ]),
              if (_quickOpen && !c.editing)
                Padding(
                  padding: const EdgeInsets.only(top: 8),
                  child: Row(children: [
                    Expanded(child: AppTextField(key: const Key('quick-field'), controller: _quick, hint: l10n.formQuickFillHint, errorText: _quickError)),
                    const SizedBox(width: 8),
                    AppButton(
                      label: l10n.formQuickFillApply,
                      onPressed: () {
                        final ok = c.quickFill(_quick.text);
                        setState(() => _quickError = ok ? null : l10n.formQuickFillFailed);
                        if (ok) _quick.clear();
                      },
                    ),
                  ]),
                ),

              // Amount (+ currency)
              section(
                l10n.formAmount,
                Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                  Row(children: [
                    if (flags.currencyFx || foreign)
                      Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: OutlinedButton(
                          key: const Key('currency-chip'),
                          onPressed: () => AppSheet.show<void>(
                            context: context,
                            title: l10n.formCurrency,
                            builder: (_) => CurrencyPickerSheet(selected: s.currency, base: base, onPick: c.setCurrency),
                          ),
                          child: Text('${getCurrencySymbol(s.currency)} ${s.currency}'),
                        ),
                      ),
                    Expanded(
                      child: TextField(
                        key: const Key('amount-field'),
                        controller: _amount,
                        autofocus: !c.editing,
                        // Operators are typeable (12*3+4), so a plain text keyboard with a character whitelist.
                        keyboardType: const TextInputType.numberWithOptions(decimal: true, signed: true),
                        inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'[0-9+\-*/().,xX×÷\s]'))],
                        style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w700),
                        decoration: InputDecoration(hintText: l10n.formAmountHint),
                        onChanged: c.setAmount,
                      ),
                    ),
                  ]),
                  if (c.amountIsExpression && amountVal != null)
                    Padding(
                      padding: const EdgeInsets.only(top: 4),
                      child: Text(l10n.formAmountEquals(_fmt(context, amountVal, s.currency)), key: const Key('amount-eval'), style: TextStyle(color: tokens.primaryAccent, fontWeight: FontWeight.w600)),
                    ),
                  if (conversion != null)
                    Padding(
                      padding: const EdgeInsets.only(top: 4),
                      child: Row(children: [
                        Text(l10n.formConverted(_fmt(context, conversion.convertedAmount, base), conversion.rate.toString()), key: const Key('conversion'), style: TextStyle(color: tokens.textSecondary)),
                        TextButton(
                          key: const Key('fx-set'),
                          onPressed: () => AppSheet.show<void>(
                            context: context,
                            title: l10n.formFxTitle(s.currency, base),
                            builder: (_) => FxRateSheet(
                              code: s.currency,
                              base: base,
                              customRates: trip.fxConfig?.customRates ?? const {},
                              liveRates: live,
                              onSave: (rates) => ref.read(tripRepositoryProvider).setFxConfig(
                                    id,
                                    (trip.fxConfig ?? const TripFxConfigDefaults().value).copyWithRates(rates),
                                  ),
                            ),
                          ),
                          child: Text(l10n.formFxSet),
                        ),
                      ]),
                    ),
                ]),
              ),

              // Title + chips
              section(
                l10n.formWhat,
                Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                  TextField(key: const Key('title-field'), controller: _title, textCapitalization: TextCapitalization.sentences, decoration: InputDecoration(hintText: l10n.formWhatHint), onChanged: c.setTitle),
                  if (c.chips.isNotEmpty)
                    Padding(
                      padding: const EdgeInsets.only(top: 8),
                      child: Wrap(spacing: 8, runSpacing: 4, children: [
                        for (final chip in c.chips) ActionChip(key: Key('chip-${chip.id}'), label: Text('${chip.icon} ${chip.label}'), onPressed: () => c.applyChip(chip)),
                      ]),
                    ),
                ]),
              ),

              // Category
              section(
                l10n.formCategory,
                Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                  Wrap(spacing: 8, runSpacing: 4, children: [
                    for (final cat in (flags.categoryReorder ? categories : _unordered(categories)))
                      _CategoryChip(category: cat, selected: cat.id == s.category, onTap: () => c.setCategory(cat.id)),
                  ]),
                  if (s.autoCategoryName != null)
                    Padding(padding: const EdgeInsets.only(top: 4), child: Text(l10n.formAutoCategory(s.autoCategoryName!), key: const Key('auto-category'), style: TextStyle(fontSize: 12, color: tokens.textMuted))),
                ]),
              ),

              // Date
              section(
                l10n.formDate,
                OutlinedButton.icon(key: const Key('date-button'), onPressed: _pickDate, icon: const Icon(Icons.event_rounded), label: Text(s.date), style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(48), alignment: Alignment.centerLeft)),
              ),

              // Payer(s)
              section(
                l10n.formPaidBy,
                Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                  if (flags.multiPayer)
                    Align(
                      alignment: Alignment.centerLeft,
                      child: TextButton(
                        key: const Key('payer-mode'),
                        onPressed: () => c.setPayerMode(s.payerMode == PayerMode.multiple ? PayerMode.single : PayerMode.multiple),
                        child: Text(s.payerMode == PayerMode.multiple ? l10n.formOnePayer : l10n.formMultiplePayers),
                      ),
                    ),
                  if (s.payerMode == PayerMode.multiple && flags.multiPayer) ...[
                    for (final m in members)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 6),
                        child: Row(children: [
                          Expanded(child: Text(m.name)),
                          SizedBox(
                            width: 130,
                            child: TextFormField(
                              key: ValueKey('payer-amt-${m.id}-${s.epoch}'),
                              initialValue: s.multiPayerShares[m.id],
                              keyboardType: const TextInputType.numberWithOptions(decimal: true),
                              decoration: InputDecoration(hintText: l10n.formExactHint, isDense: true),
                              onChanged: (v) => c.setMultiPayerShare(m.id, v),
                            ),
                          ),
                        ]),
                      ),
                    Text(
                      l10n.formAllocated(
                        _fmt(context, s.multiPayerShares.values.fold<double>(0, (a, b) => a + (double.tryParse(b) ?? 0)), s.currency),
                        _fmt(context, amountVal ?? 0, s.currency),
                      ),
                      key: const Key('allocated'),
                      style: TextStyle(color: tokens.textSecondary),
                    ),
                  ] else
                    DropdownButtonFormField<String>(
                      key: const Key('payer-dropdown'),
                      initialValue: byId.containsKey(s.payer) ? s.payer : null,
                      isExpanded: true,
                      items: [for (final m in members) DropdownMenuItem(value: m.id, child: Text(m.name, overflow: TextOverflow.ellipsis))],
                      onChanged: (v) => v == null ? null : c.setPayer(v),
                    ),
                ]),
              ),

              // Split
              section(
                l10n.formSplitBetween,
                members.isEmpty
                    ? Text(l10n.formNoMembers)
                    : Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                        Wrap(spacing: 8, runSpacing: 4, children: [
                          ActionChip(key: const Key('preset-everyone'), label: Text(l10n.formEveryone), onPressed: c.presetEveryone),
                          ActionChip(key: const Key('preset-only-payer'), label: Text(l10n.formOnlyPayer), onPressed: c.presetOnlyPayer),
                          ActionChip(key: const Key('preset-exclude-payer'), label: Text(l10n.formExcludePayer), onPressed: c.presetExcludePayer),
                          if (flags.advancedSplits) ActionChip(key: const Key('preset-half'), label: Text(l10n.formPayerHalf), onPressed: c.presetPayerHalf),
                          for (final g in groups.where((g) => g.memberIds.length > 1))
                            FilterChip(
                              key: Key('group-${g.id}'),
                              label: Text(g.name),
                              selected: g.memberIds.every((m) => s.selected[m] == true),
                              onSelected: (on) => c.applyGroup(g.memberIds, checked: on),
                            ),
                        ]),
                        const SizedBox(height: 8),
                        SegmentedButton<String>(
                          key: const Key('split-modes'),
                          showSelectedIcon: false,
                          segments: [for (final m in modes) ButtonSegment(value: m.$1, label: Text(m.$2, key: Key('mode-${m.$1}')))],
                          selected: {s.splitMode},
                          onSelectionChanged: (v) => c.setSplitMode(v.first),
                        ),
                        const SizedBox(height: 8),
                        for (final m in members)
                          _MemberRow(
                            key: ValueKey('member-${m.id}'),
                            member: m,
                            selected: s.selected[m.id] == true,
                            mode: s.splitMode,
                            configText: s.splitConfig[m.id],
                            epoch: s.epoch,
                            onToggle: () => c.toggleMember(m.id),
                            onConfig: (v) => c.setSplitConfig(m.id, v),
                          ),
                        if (s.splitMode == 'percentage' || s.splitMode == 'exact')
                          Padding(
                            padding: const EdgeInsets.only(top: 4),
                            child: Text(
                              s.splitMode == 'percentage'
                                  ? l10n.formSumStatus('${status.sum.toStringAsFixed(1)}%', '100%')
                                  : l10n.formSumStatus(_fmt(context, status.sum, s.currency), _fmt(context, status.target ?? 0, s.currency)),
                              key: const Key('sum-status'),
                              style: TextStyle(fontWeight: FontWeight.w600, color: status.matches ? tokens.colorSuccess : tokens.colorDanger),
                            ),
                          ),
                        if (s.splitMode == 'custom') Text(l10n.formSharesWeights, style: TextStyle(fontSize: 12, color: tokens.textMuted)),
                        if (s.splitMode == 'itemized') _Itemized(state: s, controller: c, members: members, currency: s.currency),
                      ]),
              ),

              if (dupShown)
                Container(
                  key: const Key('duplicate-card'),
                  margin: const EdgeInsets.only(top: 16),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(color: tokens.colorWarning.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(12), border: Border.all(color: tokens.colorWarning.withValues(alpha: 0.4))),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(l10n.formDuplicateTitle, style: TextStyle(fontWeight: FontWeight.w700, color: tokens.colorWarning)),
                    const SizedBox(height: 4),
                    Text(dup.reason, key: const Key('duplicate-reason')),
                    if (s.showDuplicateDetails)
                      Padding(
                        padding: const EdgeInsets.only(top: 6),
                        child: Text('${dup.matchedExpense.title} · ${_fmt(context, dup.matchedExpense.amount, base)} · ${dup.matchedExpense.date}', style: TextStyle(color: tokens.textSecondary)),
                      ),
                    Wrap(children: [
                      TextButton(onPressed: c.toggleDuplicateDetails, child: Text(l10n.formDuplicateDetails)),
                      TextButton(key: const Key('duplicate-ignore'), onPressed: () => c.ignoreDuplicate(dup.matchedExpense.id), child: Text(l10n.formDuplicateIgnore)),
                    ]),
                  ]),
                ),

              if (preview.isNotEmpty)
                section(
                  l10n.formWhoOwes,
                  Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                    for (final e in preview.entries)
                      Padding(
                        padding: const EdgeInsets.symmetric(vertical: 2),
                        child: Row(children: [
                          Expanded(child: Text(byId[e.key]?.name ?? l10n.rowRemovedMember)),
                          Text(_fmt(context, e.value, s.currency), key: Key('preview-${e.key}'), style: const TextStyle(fontWeight: FontWeight.w600)),
                        ]),
                      ),
                    if (flags.explain)
                      Align(
                        alignment: Alignment.centerLeft,
                        child: TextButton.icon(
                          key: const Key('explain'),
                          icon: const Icon(Icons.help_outline_rounded, size: 18),
                          label: Text(l10n.formExplain),
                          onPressed: () => AppSheet.show<void>(
                            context: context,
                            title: l10n.formExplainTitle,
                            builder: (_) => ExplainSharesSheet(input: input, members: byId),
                          ),
                        ),
                      ),
                  ]),
                ),

              moreDetails,

              if (s.error != null)
                Container(
                  key: const Key('form-error'),
                  margin: const EdgeInsets.only(top: 16),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(color: tokens.colorDanger.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(12)),
                  child: Text(s.error!, style: TextStyle(color: tokens.colorDanger)),
                ),
            ]),
          ),
        ),
        SafeArea(
          top: false,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
            child: AppButton(
              key: const Key('save'),
              label: s.submitting ? l10n.formSaving : l10n.formSave,
              isLoading: s.submitting,
              isFullWidth: true,
              onPressed: s.submitting ? null : _save,
            ),
          ),
        ),
      ]),
    );
  }

  /// The web keeps the picker in the original category order unless reorder is enabled.
  List<Category> _unordered(List<Category> c) => c;
}

class _CategoryChip extends StatelessWidget {
  const _CategoryChip({required this.category, required this.selected, required this.onTap});
  final Category category;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final color = Color(categoryColorArgb(category.id));
    final icon = category.icon != null && !category.icon!.contains(':') ? '${category.icon} ' : '';
    return ChoiceChip(
      key: Key('cat-${category.id}'),
      label: Text('$icon${category.name}'),
      selected: selected,
      selectedColor: color.withValues(alpha: 0.2),
      side: BorderSide(color: selected ? color : Colors.transparent),
      onSelected: (_) => onTap(),
    );
  }
}

class _MemberRow extends StatelessWidget {
  const _MemberRow({
    required this.member,
    required this.selected,
    required this.mode,
    required this.configText,
    required this.epoch,
    required this.onToggle,
    required this.onConfig,
    super.key,
  });
  final Member member;
  final bool selected;
  final String mode;
  final String? configText;
  final int epoch;
  final VoidCallback onToggle;
  final ValueChanged<String> onConfig;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final needsInput = selected && (mode == 'custom' || mode == 'percentage' || mode == 'exact');
    final hint = mode == 'custom' ? l10n.formShareHint : mode == 'percentage' ? l10n.formPercentHint : l10n.formExactHint;
    return Row(children: [
      Expanded(
        child: CheckboxListTile(
          key: Key('split-${member.id}'),
          contentPadding: EdgeInsets.zero,
          controlAffinity: ListTileControlAffinity.leading,
          value: selected,
          onChanged: (_) => onToggle(),
          title: Text(member.name),
        ),
      ),
      if (needsInput)
        SizedBox(
          width: 110,
          child: TextFormField(
            key: ValueKey('cfg-${member.id}-$mode-$epoch'),
            initialValue: configText,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            decoration: InputDecoration(hintText: hint, isDense: true),
            onChanged: onConfig,
          ),
        ),
    ]);
  }
}

class _Itemized extends StatelessWidget {
  const _Itemized({required this.state, required this.controller, required this.members, required this.currency});
  final ExpenseFormState state;
  final ExpenseFormController controller;
  final List<Member> members;
  final String currency;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final tokens = context.tokens;
    final total = itemizedTotal(state.items, tax: state.tax, tip: state.tip, discount: state.discount);
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      for (final item in state.items)
        Card(
          key: Key('item-${item.id}'),
          margin: const EdgeInsets.only(top: 8),
          child: Padding(
            padding: const EdgeInsets.all(10),
            child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              Row(children: [
                Expanded(
                  child: TextFormField(
                    key: ValueKey('item-name-${item.id}-${state.epoch}'),
                    initialValue: item.name,
                    decoration: InputDecoration(labelText: l10n.formItemName, isDense: true),
                    onChanged: (v) => controller.updateItem(item.id, name: v),
                  ),
                ),
                const SizedBox(width: 8),
                SizedBox(
                  width: 100,
                  child: TextFormField(
                    key: ValueKey('item-amt-${item.id}-${state.epoch}'),
                    initialValue: item.amount == 0 ? '' : item.amount.toString(),
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    decoration: InputDecoration(labelText: l10n.formItemAmount, isDense: true),
                    onChanged: (v) => controller.updateItem(item.id, amount: double.tryParse(v) ?? 0),
                  ),
                ),
                IconButton(tooltip: l10n.rowDelete, icon: const Icon(AppIcons.delete), onPressed: () => controller.removeItem(item.id)),
              ]),
              Text(l10n.formItemSharedBy, style: TextStyle(fontSize: 12, color: tokens.textMuted)),
              Wrap(spacing: 6, children: [
                for (final m in members)
                  FilterChip(
                    key: Key('item-${item.id}-${m.id}'),
                    label: Text(m.name),
                    selected: item.assignedMemberIds.contains(m.id),
                    onSelected: (on) => controller.updateItem(item.id, assigned: [
                      for (final x in members)
                        if (x.id == m.id ? on : item.assignedMemberIds.contains(x.id)) x.id,
                    ]),
                  ),
              ]),
            ]),
          ),
        ),
      Align(alignment: Alignment.centerLeft, child: TextButton.icon(key: const Key('add-item'), onPressed: controller.addItem, icon: const Icon(AppIcons.add), label: Text(l10n.formAddItem))),
      Row(children: [
        for (final f in [(l10n.formTax, state.tax, controller.setTax, 'tax'), (l10n.formTip, state.tip, controller.setTip, 'tip'), (l10n.formDiscount, state.discount, controller.setDiscount, 'discount')])
          Expanded(
            child: Padding(
              padding: const EdgeInsets.only(right: 8),
              child: TextFormField(
                key: ValueKey('extra-${f.$4}-${state.epoch}'),
                initialValue: f.$2,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                decoration: InputDecoration(labelText: f.$1, isDense: true),
                onChanged: f.$3,
              ),
            ),
          ),
      ]),
      if (total > 0)
        Align(
          alignment: Alignment.centerLeft,
          child: TextButton(key: const Key('use-total'), onPressed: controller.syncItemizedTotal, child: Text(l10n.formUseTotal(formatMoney(context, total, currency)))),
        ),
    ]);
  }
}

/// Default trip FX config holder (const-constructible helper).
class TripFxConfigDefaults {
  const TripFxConfigDefaults();
  TripFxConfig get value => const TripFxConfig();
}

extension on TripFxConfig {
  TripFxConfig copyWithRates(Map<String, double> rates) => TripFxConfig(customRates: rates, markupPercent: markupPercent);
}
