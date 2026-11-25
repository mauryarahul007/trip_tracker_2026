import 'dart:async';
import 'dart:io';

import 'package:flutter/material.dart';

import '../../../shared/widgets/cached_photo.dart';
import '../../../shared/widgets/receipt_photo_viewer_dialog.dart';
import '../../../core/platform/feedback.dart';

import '../../notifications/presentation/push_prompt.dart';
import 'widgets/amount_keypad.dart';
import 'widgets/horizon_amount_first.dart';
import 'widgets/horizon_split_view.dart';
import '../../../shared/theme/category_icons.dart' show categoryGlyph;
import '../../../shared/widgets/app_avatar.dart';

import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/platform/haptics.dart';
import '../../../core/format/money.dart';
import '../../../data/platform/receipt_picker.dart';
import '../../../core/network/connectivity_provider.dart';
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
import '../../../shared/theme/app_typography.dart';
import '../../../shared/widgets/app_button.dart';
import '../../../shared/widgets/app_scaffold.dart';
import '../../../shared/widgets/bento_tile.dart';
import '../../../shared/widgets/app_sheet.dart';
import '../../../shared/widgets/app_text_field.dart';
import '../../../shared/widgets/skeleton_loader.dart';
import '../../trip_details/application/trip_nav.dart';
import '../../trips/presentation/widgets/create_trip_sheet.dart' show dateRangePickerProvider;
import '../application/expense_form_controller.dart';
import '../application/expenses_providers.dart';
import '../application/just_saved.dart';
import '../../../app/auth_state.dart';
import '../../../shared/widgets/undo_snackbar.dart';
import 'receipt_ocr_modal.dart';
import 'widgets/form_sheets.dart';

String _fmt(BuildContext c, double v, String code) => formatMoney(c, v, code);

/// Money without ".00" on whole amounts ("₹2,400"), for titles.
String _fmtWhole(BuildContext c, double v, String code) {
  final s = formatMoney(c, v, code);
  return v % 1 == 0 && s.endsWith('.00') ? s.substring(0, s.length - 3) : s;
}

/// Add / edit an expense. Waits for trip, members, expenses and flags so the
/// form never starts with the wrong controls.
class ExpenseFormScreen extends ConsumerWidget {
  const ExpenseFormScreen({
    required this.tripId,
    this.expenseId,
    this.cloneLast = false,
    this.mealTitle,
    this.quickText,
    this.then,
    super.key,
  });
  final String tripId;
  final String? expenseId;

  /// Open a new expense with the trip's last expense already copied in (the Add dial's "Clone last").
  final bool cloneLast;

  /// From the Spend meal nudge: open a new expense titled with this meal ("Breakfast", "Lunch", "Dinner").
  final String? mealTitle;

  /// From Quick add (Horizon): open a new expense already filled from this "lunch 2400 asha" text.
  final String? quickText;

  /// From Quick add (Horizon): what to open next, 'split' (the split page) or 'scan' (the receipt camera).
  final String? then;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final trip = ref.watch(tripProvider(tripId)).value;
    final expenses = ref.watch(tripExpensesProvider(tripId));
    final flags = ref.watch(formFlagsProvider(tripId));
    final membersReady = ref.watch(tripMembersProvider(tripId)).hasValue;
    final ready = trip != null && expenses.hasValue && flags.hasValue && membersReady;
    // Desktop (board 08): the form floats as a centred card instead of a stretched page.
    final wide = MediaQuery.sizeOf(context).width >= 900;
    final horizon = context.tokens.horizon;
    final form = ready
        ? _FormBody(
            args: ExpenseFormArgs(tripId, expenseId),
            cloneLast: cloneLast,
            mealTitle: mealTitle,
            quickText: quickText,
            then: then,
          )
        : const SkeletonPage(shape: SkeletonShape.form, rows: 3);
    return AppScaffold(
      maxContentWidth: wide ? 760 : 960,
      appBar: AppBar(
        title: horizon && expenseId == null && trip != null
            // Horizon: the trip name under the title, so you always see where the expense goes.
            ? Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(l10n.horizonNewExpense),
                  Text(
                    l10n.horizonAddingTo(trip.name),
                    key: const Key('form-trip-name'),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontFamily: AppTypography.fontBody,
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                      color: context.tokens.textSecondary,
                    ),
                  ),
                ],
              )
            : Text(expenseId == null ? (horizon ? l10n.horizonNewExpense : l10n.formTitleAdd) : l10n.formTitleEdit),
        leading: IconButton(
          tooltip: l10n.actionClose,
          icon: const Icon(AppIcons.close),
          onPressed: () => context.pop(),
        ),
        actions: [
          // Horizon: "Repeat last" copies the trip's last expense in one tap (mockup: Add expense, amount).
          if (horizon && expenseId == null && ready && flags.value?.cloneLast == true)
            TextButton.icon(
              key: const Key('horizon-repeat-last'),
              icon: const Icon(Icons.copy_rounded, size: 16),
              label: Text(l10n.horizonRepeatLast),
              onPressed: () => ref.read(expenseFormProvider(ExpenseFormArgs(tripId, expenseId)).notifier).applyLast(),
            ),
        ],
      ),
      body: wide
          ? Padding(
              padding: const EdgeInsets.symmetric(vertical: 16),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(context.tokens.radiusLg),
                child: ColoredBox(color: context.tokens.bgSurface, child: form),
              ),
            )
          : form,
    );
  }
}

class _FormBody extends ConsumerStatefulWidget {
  const _FormBody({required this.args, this.cloneLast = false, this.mealTitle, this.quickText, this.then});
  final ExpenseFormArgs args;
  final bool cloneLast;
  final String? mealTitle;
  final String? quickText;
  final String? then;

  @override
  ConsumerState<_FormBody> createState() => _FormBodyState();
}

class _FormBodyState extends ConsumerState<_FormBody> {
  late final TextEditingController _title;
  late final TextEditingController _amount;
  final _quick = TextEditingController();
  // Docked keypad (flag `enableDockedKeypad`): number keys under the form instead of the phone keyboard.
  bool _docked = false;
  bool _dockInit = false;
  bool _quickOpen = false;
  // Horizon: a new expense opens amount-first; "More details" or the split chip opens the full form.
  bool _horizonDetails = false;
  final _splitMoreCtl = ExpansibleController();
  bool _splitTileShown = false; // controller is only attached while the tile is in the tree
  String? _quickError;
  late final Set<String> _initialExpenseIds;
  final _amountFocus = FocusNode();
  String? _notice; // inline "Saved" line above the buttons; a snackbar there would cover them
  Timer? _noticeTimer;

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
    if (widget.cloneLast && args.editingId == null) {
      // Provider state can't change while the tree builds; the form's own listener then fills the text fields.
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted && _c.flags.cloneLast) _c.applyLast();
      });
    }
    final meal = widget.mealTitle;
    if (meal != null && meal.isNotEmpty && args.editingId == null) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) _c.applyMeal(meal);
      });
    }
    final quick = widget.quickText;
    if (quick != null && quick.trim().isNotEmpty && args.editingId == null) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        _c.quickFill(quick);
        if (widget.then == 'split') {
          unawaited(_openHorizonSplit());
        } else if (widget.then == 'scan') {
          unawaited(_c.pickReceipt(ReceiptSource.camera));
        }
      });
    }
  }

  @override
  void dispose() {
    _title.dispose();
    _amount.dispose();
    _amountFocus.dispose();
    _noticeTimer?.cancel();
    _quick.dispose();
    super.dispose();
  }

  Future<void> _save({bool addAnother = false}) async {
    if (addAnother && _amount.text.trim().isEmpty && _title.text.trim().isEmpty) {
      _c.showError(context.l10n.formAddFirst);
      return;
    }
    final savedId = ref.read(expenseFormProvider(args)).newExpenseId;
    final outcome = await _c.submit();
    if (!outcome.isOk || !mounted) return;
    AppFeedback.saved();
    final offline = !(ref.read(isOnlineProvider).value ?? true);
    if (offline && ref.read(flagProvider(('enableSavedOfflineToast', args.tripId))).value == true) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(context.l10n.expSavedOffline)));
    }
    if (addAnother) {
      // The next entry's duplicate check should see the expense just saved.
      _initialExpenseIds.add(savedId);
      _c.resetForNext();
      setState(() => _notice = context.l10n.formSavedAddNext);
      _noticeTimer?.cancel();
      _noticeTimer = Timer(const Duration(seconds: 3), () {
        if (mounted) setState(() => _notice = null);
      });
      if (_c.flags.dockedKeypad) {
        setState(() => _docked = true);
      } else {
        _amountFocus.requestFocus();
      }
      return;
    }
    if (args.editingId == null && ref.read(flagProvider(('enableSaveConfirmation', args.tripId))).value != false) {
      _confirmAdded(outcome.expenseId ?? savedId);
    }
    await maybeAskForPush(context, ref); // first meaningful action: the one moment we ask
    if (mounted) context.pop();
  }

  /// "Added Dinner · Undo" on the screen behind, and a one-time flash on the new row in Spend.
  void _confirmAdded(String id) {
    final l10n = context.l10n;
    final title = _title.text.trim();
    final repo = ref.read(expenseRepositoryProvider);
    final uid = ref.read(authStateProvider).userId ?? '';
    ref.read(justSavedExpenseProvider.notifier).set(id);
    UndoSnackbar.show(
      context: context,
      message: title.isEmpty ? l10n.expAdded : l10n.expAddedNamed(title),
      onUndo: () => unawaited(repo.delete(id, userId: uid)),
    );
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
    if (!_dockInit) {
      _dockInit = true;
      _docked = flags.dockedKeypad && !c.editing; // a new expense opens on the keys; an edit opens on the form
    }
    final trip = ref.watch(tripProvider(id)).value!;
    final members = ref.watch(visibleMembersProvider(id));
    final byId = {for (final m in members) m.id: m};
    final categories = ref.watch(tripCategoriesProvider(id));
    final groups = ref.watch(tripGroupsProvider(id)).value ?? const <Group>[];
    final base = trip.baseCurrency.isEmpty ? 'INR' : trip.baseCurrency;
    final foreign = s.currency != base;

    // Programmatic changes (clone, chips, quick fill, draft discard) must reach the text fields.
    ref.listen(expenseFormProvider(args), (prev, next) {
      // A mode set from outside the fold (clone last, quick fill, draft) must not hide its own inputs' controls.
      if (next.splitMode != 'equal' && prev?.splitMode != next.splitMode) {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (mounted && _splitTileShown && !_splitMoreCtl.isExpanded) _splitMoreCtl.expand();
        });
      }
      if (next.title != _title.text) {
        _title.value = TextEditingValue(
          text: next.title,
          selection: TextSelection.collapsed(offset: next.title.length),
        );
      }
      if (next.amount != _amount.text) {
        _amount.value = TextEditingValue(
          text: next.amount,
          selection: TextSelection.collapsed(offset: next.amount.length),
        );
      }
    });

    final input = c.toInput();
    final preview = c.preview();
    final amountVal = c.evaluatedAmount;
    final selectedSplitCount = s.selected.values.where((v) => v).length;
    final equalShareAmount = s.splitMode == 'equal' && amountVal != null && selectedSplitCount > 0
        ? amountVal / selectedSplitCount
        : null;
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

    if (tokens.horizon && !c.editing && !_horizonDetails) {
      return _horizonAmountFirst(
        s: s,
        members: members,
        categories: categories,
        base: base,
        equalShare: equalShareAmount,
        splitCount: selectedSplitCount,
        converted: conversion == null ? null : '≈ ${_fmt(context, conversion.convertedAmount, base)}',
      );
    }

    Widget section(String title, Widget child) => Padding(
      padding: const EdgeInsets.only(top: 18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            title,
            style: TextStyle(
              fontFamily: AppTypography.fontMono,
              fontSize: 11,
              fontWeight: FontWeight.w600,
              letterSpacing: 1.0,
              color: tokens.textMuted,
            ),
          ),
          const SizedBox(height: 8),
          child,
        ],
      ),
    );

    final showReceiptOcr = flags.receiptOcr || flags.receiptUpload;
    final receiptSection = flags.receiptUpload || flags.receiptOcr || s.receiptPath != null
        ? section(
            l10n.formReceipt,
            s.receiptPath != null
                ? Row(
                    children: [
                      _FormReceiptThumbnail(editingId: args.editingId, receiptPath: s.receiptPath!, title: s.title),
                      const SizedBox(width: 12),
                      Expanded(child: Text(l10n.formReceiptAttached)),
                      TextButton(
                        key: const Key('receipt-remove'),
                        onPressed: c.removeReceipt,
                        child: Text(l10n.formReceiptRemove),
                      ),
                    ],
                  )
                : Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      if (flags.receiptUpload) ...[
                        OutlinedButton.icon(
                          key: const Key('receipt-camera'),
                          onPressed: () => c.pickReceipt(ReceiptSource.camera),
                          icon: const Icon(AppIcons.camera),
                          label: Text(l10n.formReceiptCamera),
                        ),
                        OutlinedButton.icon(
                          key: const Key('receipt-gallery'),
                          onPressed: () => c.pickReceipt(ReceiptSource.gallery),
                          icon: const Icon(AppIcons.image),
                          label: Text(l10n.formReceiptGallery),
                        ),
                      ],
                      if (showReceiptOcr)
                        OutlinedButton.icon(
                          key: const Key('receipt-scan-ocr'),
                          onPressed: () => ReceiptOcrModal.show(
                            context,
                            tripId: args.tripId,
                            onApplyReceipt: c.applyReceiptOcr,
                            defaultMemberIds: s.selected.entries.where((e) => e.value).map((e) => e.key).toList(),
                          ),
                          icon: const Icon(AppIcons.receipt),
                          label: Text(l10n.formScanItemize),
                        ),
                    ],
                  ),
          )
        : const SizedBox.shrink();

    // Split controls. Compact form keeps Everyone / Only payer / Everyone-but-payer and the member rows in
    // view (Equal path); mode switch, payer-half preset and group chips fold under "More split options".
    final basicPresets = <Widget>[
      ActionChip(key: const Key('preset-everyone'), label: Text(l10n.formEveryone), onPressed: c.presetEveryone),
      ActionChip(key: const Key('preset-only-payer'), label: Text(l10n.formOnlyPayer), onPressed: c.presetOnlyPayer),
      ActionChip(
        key: const Key('preset-exclude-payer'),
        label: Text(l10n.formExcludePayer),
        onPressed: c.presetExcludePayer,
      ),
    ];
    final advancedPresets = <Widget>[
      if (flags.advancedSplits)
        ActionChip(key: const Key('preset-half'), label: Text(l10n.formPayerHalf), onPressed: c.presetPayerHalf),
      for (final g in groups.where((g) => g.memberIds.length > 1))
        FilterChip(
          key: Key('group-${g.id}'),
          label: Text(g.name),
          selected: g.memberIds.every((m) => s.selected[m] == true),
          onSelected: (on) => c.applyGroup(g.memberIds, checked: on),
        ),
    ];
    final modeButton = SegmentedButton<String>(
      key: const Key('split-modes'),
      showSelectedIcon: false,
      segments: [
        for (final m in modes)
          ButtonSegment(
            value: m.$1,
            label: Text(m.$2, key: Key('mode-${m.$1}')),
          ),
      ],
      selected: {s.splitMode},
      onSelectionChanged: (v) => c.setSplitMode(v.first),
    );
    final itemizedEditor = _Itemized(state: s, controller: c, members: members, currency: s.currency);
    // Nothing beyond Equal to fold away (no advanced modes, no groups): keep the plain layout.
    final foldSplitExtras = flags.compactForm && (modes.length > 1 || advancedPresets.isNotEmpty);
    _splitTileShown = foldSplitExtras;

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
      child: Column(
        children: [
          Expanded(
            child: SingleChildScrollView(
              keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
              padding: EdgeInsets.fromLTRB(16, flags.compactForm ? 0 : 4, 16, flags.compactForm ? 16 : 24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  if (s.draftRestored)
                    Container(
                      key: const Key('draft-banner'),
                      margin: const EdgeInsets.only(top: 8),
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: tokens.primaryAccent.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Row(
                        children: [
                          Expanded(child: Text(l10n.formDraftRestored)),
                          TextButton(
                            key: const Key('draft-discard'),
                            onPressed: c.discardDraft,
                            child: Text(l10n.formDiscardDraft),
                          ),
                        ],
                      ),
                    ),
                  if (!c.editing)
                    Wrap(
                      spacing: 8,
                      children: [
                        // Horizon has "Repeat last" in the top bar instead.
                        if (flags.cloneLast && c.lastExpense != null && !tokens.horizon)
                          ActionChip(
                            key: const Key('same-as-last'),
                            avatar: const Icon(Icons.history_rounded, size: 16),
                            label: Text(l10n.formSameAsLast),
                            onPressed: c.applyLast,
                          ),
                        ActionChip(
                          key: const Key('quick-fill-toggle'),
                          avatar: const Icon(Icons.bolt_rounded, size: 16),
                          label: Text(l10n.formQuickFill),
                          onPressed: () => setState(() => _quickOpen = !_quickOpen),
                        ),
                      ],
                    ),
                  if (_quickOpen && !c.editing)
                    Padding(
                      padding: const EdgeInsets.only(top: 8),
                      child: Row(
                        children: [
                          Expanded(
                            child: AppTextField(
                              key: const Key('quick-field'),
                              controller: _quick,
                              hint: l10n.formQuickFillHint,
                              errorText: _quickError,
                            ),
                          ),
                          const SizedBox(width: 8),
                          AppButton(
                            label: l10n.formQuickFillApply,
                            onPressed: () {
                              final ok = c.quickFill(_quick.text);
                              setState(() => _quickError = ok ? null : l10n.formQuickFillFailed);
                              if (ok) _quick.clear();
                            },
                          ),
                        ],
                      ),
                    ),

                  // Amount (+ currency)
                  section(
                    l10n.formAmount,
                    BentoTile(
                      tone: BentoTone.butter,
                      padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Row(
                            children: [
                              if (flags.currencyFx || foreign)
                                Padding(
                                  padding: const EdgeInsets.only(right: 8),
                                  child: OutlinedButton(
                                    key: const Key('currency-chip'),
                                    style: OutlinedButton.styleFrom(shape: const StadiumBorder()),
                                    onPressed: () => AppSheet.show<void>(
                                      context: context,
                                      title: l10n.formCurrency,
                                      builder: (_) =>
                                          CurrencyPickerSheet(selected: s.currency, base: base, onPick: c.setCurrency),
                                    ),
                                    child: Text('${getCurrencySymbol(s.currency)} ${s.currency}'),
                                  ),
                                ),
                              Expanded(
                                child: TextField(
                                  key: const Key('amount-field'),
                                  controller: _amount,
                                  focusNode: _amountFocus,
                                  autofocus: !c.editing && !flags.dockedKeypad,
                                  readOnly: flags.dockedKeypad,
                                  showCursor: flags.dockedKeypad ? _docked : null,
                                  onTap: flags.dockedKeypad ? () => setState(() => _docked = true) : null,
                                  // Operators are typeable (12*3+4), so a plain text keyboard with a character whitelist.
                                  keyboardType: const TextInputType.numberWithOptions(decimal: true, signed: true),
                                  inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'[0-9+\-*/().,xX×÷\s]'))],
                                  textAlign: TextAlign.center,
                                  style: TextStyle(
                                    fontFamily: AppTypography.fontTitle,
                                    fontSize: 44,
                                    fontWeight: FontWeight.w800,
                                    letterSpacing: -1,
                                    color: tokens.textPrimary,
                                  ),
                                  decoration: InputDecoration(
                                    hintText: l10n.formAmountHint,
                                    filled: false,
                                    border: InputBorder.none,
                                    enabledBorder: InputBorder.none,
                                    focusedBorder: InputBorder.none,
                                  ),
                                  onChanged: c.setAmount,
                                ),
                              ),
                              if (flags.amountKeypad && !flags.dockedKeypad)
                                IconButton(
                                  key: const Key('amount-keypad-button'),
                                  tooltip: l10n.keypadTitle,
                                  icon: const Icon(Icons.dialpad_rounded),
                                  onPressed: () {
                                    FocusScope.of(context).unfocus();
                                    unawaited(
                                      showAmountKeypad(
                                        context,
                                        initial: _amount.text,
                                        onChanged: (v) {
                                          _amount.value = TextEditingValue(
                                            text: v,
                                            selection: TextSelection.collapsed(offset: v.length),
                                          );
                                          c.setAmount(v);
                                        },
                                      ),
                                    );
                                  },
                                ),
                            ],
                          ),
                          if (flags.quickAmounts && s.amount.trim().isEmpty && c.recentAmounts.isNotEmpty)
                            Padding(
                              padding: const EdgeInsets.only(top: 6),
                              child: Wrap(
                                alignment: WrapAlignment.center,
                                spacing: 8,
                                children: [
                                  for (final a in c.recentAmounts)
                                    ActionChip(
                                      key: Key('quick-amount-${a.toString()}'),
                                      label: Text(a == a.roundToDouble() ? a.round().toString() : a.toStringAsFixed(2)),
                                      materialTapTargetSize: MaterialTapTargetSize.padded,
                                      onPressed: () {
                                        unawaited(AppHaptics.selection());
                                        final text = a == a.roundToDouble()
                                            ? a.round().toString()
                                            : a.toStringAsFixed(2);
                                        _amount.value = TextEditingValue(
                                          text: text,
                                          selection: TextSelection.collapsed(offset: text.length),
                                        );
                                        c.setAmount(text);
                                      },
                                    ),
                                ],
                              ),
                            ),
                          if (c.amountIsExpression && amountVal != null)
                            Padding(
                              padding: const EdgeInsets.only(top: 4),
                              child: Text(
                                l10n.formAmountEquals(_fmt(context, amountVal, s.currency)),
                                key: const Key('amount-eval'),
                                style: TextStyle(color: tokens.primaryAccent, fontWeight: FontWeight.w600),
                              ),
                            ),
                          if (conversion != null)
                            Padding(
                              padding: const EdgeInsets.only(top: 4),
                              child: Row(
                                children: [
                                  Flexible(
                                    child: Text(
                                      l10n.formConverted(
                                        _fmt(context, conversion.convertedAmount, base),
                                        conversion.rate.toString(),
                                      ),
                                      key: const Key('conversion'),
                                      overflow: TextOverflow.ellipsis,
                                      style: TextStyle(color: tokens.textSecondary),
                                    ),
                                  ),
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
                                        onSave: (rates) => ref
                                            .read(tripRepositoryProvider)
                                            .setFxConfig(
                                              id,
                                              (trip.fxConfig ?? const TripFxConfigDefaults().value).copyWithRates(
                                                rates,
                                              ),
                                            ),
                                      ),
                                    ),
                                    child: Text(l10n.formFxSet),
                                  ),
                                ],
                              ),
                            ),
                        ],
                      ),
                    ),
                  ),

                  // Title + chips
                  section(
                    l10n.formWhat,
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        TextField(
                          key: const Key('title-field'),
                          controller: _title,
                          onTap: _docked ? () => setState(() => _docked = false) : null,
                          textCapitalization: TextCapitalization.sentences,
                          decoration: InputDecoration(hintText: l10n.formWhatHint),
                          onChanged: c.setTitle,
                        ),
                        if (c.chips.isNotEmpty)
                          Padding(
                            padding: const EdgeInsets.only(top: 8),
                            child: Wrap(
                              spacing: 8,
                              runSpacing: 4,
                              children: [
                                for (final chip in c.chips)
                                  ActionChip(
                                    key: Key('chip-${chip.id}'),
                                    label: Text('${chip.icon} ${chip.label}'),
                                    onPressed: () => c.applyChip(chip),
                                  ),
                              ],
                            ),
                          ),
                      ],
                    ),
                  ),

                  // Category
                  section(
                    l10n.formCategory,
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Wrap(
                          spacing: 8,
                          runSpacing: 4,
                          children: [
                            for (final cat in (flags.categoryReorder ? categories : _unordered(categories)))
                              _CategoryChip(
                                category: cat,
                                selected: cat.id == s.category,
                                onTap: () => c.setCategory(cat.id),
                              ),
                          ],
                        ),
                        if (s.autoCategoryName != null)
                          Padding(
                            padding: const EdgeInsets.only(top: 4),
                            child: Text(
                              l10n.formAutoCategory(s.autoCategoryName!),
                              key: const Key('auto-category'),
                              style: TextStyle(fontSize: 12, color: tokens.textMuted),
                            ),
                          ),
                      ],
                    ),
                  ),

                  // Date
                  section(
                    l10n.formDate,
                    OutlinedButton.icon(
                      key: const Key('date-button'),
                      onPressed: _pickDate,
                      icon: const Icon(Icons.event_rounded),
                      label: Text(s.date),
                      style: OutlinedButton.styleFrom(
                        minimumSize: const Size.fromHeight(48),
                        alignment: Alignment.centerLeft,
                      ),
                    ),
                  ),

                  // Payer(s)
                  section(
                    l10n.formPaidBy,
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        if (flags.multiPayer)
                          Align(
                            alignment: Alignment.centerLeft,
                            child: TextButton(
                              key: const Key('payer-mode'),
                              onPressed: () => c.setPayerMode(
                                s.payerMode == PayerMode.multiple ? PayerMode.single : PayerMode.multiple,
                              ),
                              child: Text(
                                s.payerMode == PayerMode.multiple ? l10n.formOnePayer : l10n.formMultiplePayers,
                              ),
                            ),
                          ),
                        if (s.payerMode == PayerMode.multiple && flags.multiPayer) ...[
                          for (final m in members)
                            Padding(
                              padding: const EdgeInsets.only(bottom: 6),
                              child: Row(
                                children: [
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
                                ],
                              ),
                            ),
                          Text(
                            l10n.formAllocated(
                              _fmt(
                                context,
                                s.multiPayerShares.values.fold<double>(0, (a, b) => a + (double.tryParse(b) ?? 0)),
                                s.currency,
                              ),
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
                            items: [
                              for (final m in members)
                                DropdownMenuItem(
                                  value: m.id,
                                  child: Text(m.name, overflow: TextOverflow.ellipsis),
                                ),
                            ],
                            onChanged: (v) => v == null ? null : c.setPayer(v),
                          ),
                      ],
                    ),
                  ),

                  // Personal: paid by one person, split to them alone, out of trip totals and settlement.
                  if (flags.personalExpense && s.payerMode == PayerMode.single)
                    SwitchListTile(
                      key: const Key('personal-switch'),
                      contentPadding: EdgeInsets.zero,
                      value: s.excludeFromTotals,
                      onChanged: (v) {
                        unawaited(AppHaptics.selection());
                        c.setPersonal(v);
                      },
                      title: Text(l10n.formPersonalTitle),
                      subtitle: Text(l10n.formPersonalSub),
                    ),

                  // Split
                  if (!(flags.personalExpense && c.personalOnly))
                    section(
                      l10n.formSplitBetween,
                      members.isEmpty
                          ? Text(l10n.formNoMembers)
                          : Column(
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: [
                                if (foldSplitExtras) ...[
                                  Wrap(spacing: 8, runSpacing: 4, children: basicPresets),
                                  ExpansionTile(
                                    key: const Key('more-split-options'),
                                    controller: _splitMoreCtl,
                                    tilePadding: EdgeInsets.zero,
                                    childrenPadding: const EdgeInsets.only(bottom: 8),
                                    initiallyExpanded: s.splitMode != 'equal',
                                    title: Text(l10n.formMoreSplitOptions),
                                    children: [
                                      if (advancedPresets.isNotEmpty)
                                        Padding(
                                          padding: const EdgeInsets.only(bottom: 8),
                                          child: Wrap(spacing: 8, runSpacing: 4, children: advancedPresets),
                                        ),
                                      modeButton,
                                      if (s.splitMode == 'itemized') itemizedEditor,
                                    ],
                                  ),
                                ] else ...[
                                  Wrap(spacing: 8, runSpacing: 4, children: [...basicPresets, ...advancedPresets]),
                                  const SizedBox(height: 8),
                                  modeButton,
                                ],
                                if (c.pendingCovers != null)
                                  Padding(
                                    padding: const EdgeInsets.only(top: 8),
                                    child: ActionChip(
                                      key: const Key('apply-covers'),
                                      avatar: const Icon(Icons.favorite_border_rounded, size: 16),
                                      label: Text('${c.coversLabel(_nameIn(members))} · Apply'),
                                      onPressed: c.applyMemberCovers,
                                    ),
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
                                    equalShareLabel: equalShareAmount != null && s.selected[m.id] == true
                                        ? '= ${_fmt(context, equalShareAmount, s.currency)}'
                                        : null,
                                    onToggle: () => c.toggleMember(m.id),
                                    onConfig: (v) => c.setSplitConfig(m.id, v),
                                  ),
                                if (tokens.horizon && s.splitMode == 'exact' && !status.matches)
                                  Container(
                                    key: const Key('horizon-left-to-assign'),
                                    margin: const EdgeInsets.only(top: 8),
                                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                                    decoration: BoxDecoration(
                                      color: tokens.colorWarning.withValues(alpha: 0.14),
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                    child: Row(
                                      children: [
                                        Icon(Icons.warning_amber_rounded, size: 18, color: tokens.colorWarning),
                                        const SizedBox(width: 8),
                                        Expanded(
                                          child: Text(
                                            (status.target ?? 0) >= status.sum
                                                ? l10n.horizonLeftToAssign(
                                                    _fmt(context, (status.target ?? 0) - status.sum, s.currency),
                                                  )
                                                : l10n.horizonOverAssigned(
                                                    _fmt(context, status.sum - (status.target ?? 0), s.currency),
                                                  ),
                                            style: TextStyle(
                                              fontFamily: AppTypography.fontBody,
                                              fontWeight: FontWeight.w600,
                                              color: tokens.colorWarning,
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                if (s.splitMode == 'percentage' || s.splitMode == 'exact')
                                  Padding(
                                    padding: const EdgeInsets.only(top: 4),
                                    child: Text(
                                      s.splitMode == 'percentage'
                                          ? l10n.formSumStatus('${status.sum.toStringAsFixed(1)}%', '100%')
                                          : l10n.formSumStatus(
                                              _fmt(context, status.sum, s.currency),
                                              _fmt(context, status.target ?? 0, s.currency),
                                            ),
                                      key: const Key('sum-status'),
                                      style: TextStyle(
                                        fontWeight: FontWeight.w600,
                                        color: status.matches ? tokens.colorSuccess : tokens.colorDanger,
                                      ),
                                    ),
                                  ),
                                if (s.splitMode == 'custom')
                                  Text(l10n.formSharesWeights, style: TextStyle(fontSize: 12, color: tokens.textMuted)),
                                if (s.splitMode == 'itemized' && !foldSplitExtras) itemizedEditor,
                              ],
                            ),
                    ),

                  if (dupShown)
                    Container(
                      key: const Key('duplicate-card'),
                      margin: const EdgeInsets.only(top: 16),
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: tokens.colorWarning.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: tokens.colorWarning.withValues(alpha: 0.4)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            l10n.formDuplicateTitle,
                            style: TextStyle(fontWeight: FontWeight.w700, color: tokens.colorWarning),
                          ),
                          const SizedBox(height: 4),
                          Text(dup.reason, key: const Key('duplicate-reason')),
                          if (s.showDuplicateDetails)
                            Padding(
                              padding: const EdgeInsets.only(top: 6),
                              child: Text(
                                '${dup.matchedExpense.title} · ${_fmt(context, dup.matchedExpense.amount, base)} · ${dup.matchedExpense.date}',
                                style: TextStyle(color: tokens.textSecondary),
                              ),
                            ),
                          Wrap(
                            children: [
                              TextButton(onPressed: c.toggleDuplicateDetails, child: Text(l10n.formDuplicateDetails)),
                              TextButton(
                                key: const Key('duplicate-ignore'),
                                onPressed: () => c.ignoreDuplicate(dup.matchedExpense.id),
                                child: Text(l10n.formDuplicateIgnore),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),

                  if (preview.isNotEmpty)
                    section(
                      l10n.formWhoOwes,
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          for (final e in preview.entries)
                            Padding(
                              padding: const EdgeInsets.symmetric(vertical: 2),
                              child: Row(
                                children: [
                                  Expanded(child: Text(byId[e.key]?.name ?? l10n.rowRemovedMember)),
                                  Text(
                                    _fmt(context, e.value, s.currency),
                                    key: Key('preview-${e.key}'),
                                    style: const TextStyle(fontWeight: FontWeight.w600),
                                  ),
                                ],
                              ),
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
                        ],
                      ),
                    ),

                  moreDetails,
                ],
              ),
            ),
          ),
          SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (s.error != null)
                    Container(
                      key: const Key('form-error'),
                      width: double.infinity,
                      margin: const EdgeInsets.only(bottom: 8),
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: tokens.colorDanger.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(s.error!, style: TextStyle(color: tokens.colorDanger)),
                    )
                  else if (_notice != null)
                    Semantics(
                      liveRegion: true,
                      child: Container(
                        key: const Key('form-saved-notice'),
                        width: double.infinity,
                        margin: const EdgeInsets.only(bottom: 8),
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: tokens.colorSuccess.withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(
                          _notice!,
                          style: TextStyle(color: tokens.colorSuccess, fontWeight: FontWeight.w700),
                        ),
                      ),
                    ),
                  AppButton(
                    key: const Key('save'),
                    label: s.submitting ? l10n.formSaving : l10n.formSave,
                    isLoading: s.submitting,
                    isFullWidth: true,
                    onPressed: s.submitting ? null : () => _save(),
                  ),
                  if (flags.saveAndAddAnother && !c.editing) ...[
                    const SizedBox(height: 8),
                    AppButton(
                      key: const Key('save-and-add'),
                      label: l10n.formSaveAndAdd,
                      variant: AppButtonVariant.secondary,
                      isFullWidth: true,
                      onPressed: s.submitting ? null : () => _save(addAnother: true),
                    ),
                  ],
                ],
              ),
            ),
          ),
          if (_docked)
            Material(
              color: tokens.bgSurface,
              elevation: 8,
              child: SafeArea(
                top: false,
                child: AmountKeypad(
                  docked: true,
                  initial: _amount.text,
                  onChanged: (v) {
                    _amount.value = TextEditingValue(
                      text: v,
                      selection: TextSelection.collapsed(offset: v.length),
                    );
                    c.setAmount(v);
                  },
                  onDone: () => setState(() => _docked = false),
                ),
              ),
            ),
        ],
      ),
    );
  }

  /// Leaves the amount pad for the full form, which opens on its fields rather than the docked keys.
  void _openHorizonDetails() => setState(() {
    _horizonDetails = true;
    _docked = false;
  });

  /// Horizon: the split chip opens its own page (Equal / Shares / Exact / %) over the amount pad. The page reads and
  /// writes this form's split state, so saving from the pad stores exactly what the full form would.
  Future<void> _openHorizonSplit() => Navigator.of(context).push<void>(
    MaterialPageRoute(
      builder: (_) => Consumer(
        builder: (ctx, ref, _) {
          final l10n = ctx.l10n;
          final s = ref.watch(expenseFormProvider(args));
          final c = _c;
          final flags = c.flags;
          final members = ref.watch(visibleMembersProvider(args.tripId));
          final input = c.toInput();
          final status = splitConfigStatus(input);
          final amountVal = c.evaluatedAmount;
          final count = s.selected.values.where((v) => v).length;
          final equalShare = s.splitMode == 'equal' && amountVal != null && count > 0 ? amountVal / count : null;
          final modes = <(String, String)>[
            ('equal', l10n.formModeEqual),
            if (flags.advancedSplits || {'custom', 'exact', 'percentage'}.contains(s.splitMode)) ...[
              ('custom', l10n.formModeShares),
              ('exact', l10n.formModeExact),
              ('percentage', l10n.formModePercent),
            ],
          ];
          final off = (s.splitMode == 'exact' || s.splitMode == 'percentage') && !status.matches;
          String? warning;
          if (off) {
            final target = status.target ?? 0;
            final gap = (target - status.sum).abs();
            final gapText = s.splitMode == 'percentage'
                ? '${gap.toStringAsFixed(gap % 1 == 0 ? 0 : 1)}%'
                : _fmt(ctx, gap, s.currency);
            warning = target >= status.sum ? l10n.horizonLeftToAssign(gapText) : l10n.horizonOverAssigned(gapText);
          }
          final amountShown = (amountVal ?? 0) > 0 ? _fmtWhole(ctx, amountVal!, s.currency) : '';
          return HorizonSplitView(
            title: amountShown.isEmpty ? l10n.formSplitBetween : l10n.horizonSplitTitle(amountShown),
            modes: modes,
            mode: s.splitMode,
            onMode: c.setSplitMode,
            members: members,
            selected: s.selected,
            config: s.splitConfig,
            epoch: s.epoch,
            symbol: getCurrencySymbol(s.currency),
            shareLabel: (_) => equalShare == null ? null : _fmt(ctx, equalShare, s.currency),
            meMemberId: ref.watch(myMemberIdProvider(args.tripId)),
            onToggle: c.toggleMember,
            onConfig: c.setSplitConfig,
            warning: warning,
            canFinish: count > 0 && !off,
            finishLabel: l10n.horizonSplitDone,
            onReset: c.presetEveryone,
            coversNote: c.pendingCovers == null ? null : c.coversLabel(_nameIn(members)),
            onApplyCovers: c.applyMemberCovers,
            onFinish: () => Navigator.of(ctx).pop(),
            onBack: () => Navigator.of(ctx).maybePop(),
          );
        },
      ),
    ),
  );

  /// Horizon number pad: digits, one ".", two decimals at most, and backspace.
  void _horizonKey(String k) {
    var v = _amount.text;
    if (k == 'back') {
      if (v.isEmpty) return;
      v = v.substring(0, v.length - 1);
    } else if (k == '.') {
      if (v.contains('.')) return;
      v = v.isEmpty ? '0.' : '$v.';
    } else {
      if (v.contains('.') && v.split('.').last.length >= 2) return;
      v = v == '0' ? k : '$v$k';
    }
    _amount.value = TextEditingValue(
      text: v,
      selection: TextSelection.collapsed(offset: v.length),
    );
    _c.setAmount(v);
  }

  Widget _horizonAmountFirst({
    required ExpenseFormState s,
    required List<Member> members,
    required List<Category> categories,
    required String base,
    required double? equalShare,
    required int splitCount,
    String? converted,
  }) {
    final l10n = context.l10n;
    final c = _c;
    final uid = ref.read(authStateProvider).userId;
    final cat = categories.where((x) => x.id == s.category).firstOrNull;
    final payer = members.where((m) => m.id == s.payer).firstOrNull;
    final payerIsMe = payer != null && uid != null && payer.linkedUserId == uid;
    final tone = cat == null ? null : toneFor(cat.id);
    final accent = tone == null ? context.tokens.primaryAccent : context.tokens.tones[tone].accent;
    final multi = s.payerMode == PayerMode.multiple;
    final chips = [
      HorizonFormChip(
        'horizon-chip-category',
        categoryGlyph(cat, 16, accent, vector: true),
        cat?.name ?? l10n.horizonPickCategory,
        () => _horizonPickCategory(categories),
        tone: tone,
      ),
      HorizonFormChip(
        'horizon-chip-payer',
        const Icon(Icons.person_outline_rounded, size: 16),
        multi
            ? l10n.formMultiplePayers
            : payer == null
            ? l10n.horizonWhoPaid
            : payerIsMe
            ? l10n.horizonYouPaid
            : l10n.horizonNamePaid(payer.name),
        multi ? _openHorizonDetails : () => _horizonPickPayer(members, uid),
      ),
      HorizonFormChip(
        'horizon-chip-split',
        const Icon(Icons.call_split_rounded, size: 16),
        s.splitMode == 'equal'
            ? l10n.horizonEqualCount(splitCount)
            : s.splitMode == 'custom'
            ? l10n.horizonSplitChip(l10n.formModeShares, splitCount)
            : s.splitMode == 'exact'
            ? l10n.horizonSplitChip(l10n.formModeExact, splitCount)
            : s.splitMode == 'percentage'
            ? l10n.horizonSplitChip('%', splitCount)
            : l10n.formSplitBetween,
        s.splitMode == 'itemized' ? _openHorizonDetails : _openHorizonSplit,
      ),
      if (c.pendingCovers != null)
        HorizonFormChip(
          'horizon-chip-covers',
          const Icon(Icons.favorite_border_rounded, size: 16),
          '${c.coversLabel(_nameIn(members))} · Apply',
          c.applyMemberCovers,
        ),
      if (c.flags.receiptUpload)
        HorizonFormChip(
          'horizon-chip-receipt',
          Icon(s.receiptPath != null ? Icons.check_rounded : Icons.photo_camera_outlined, size: 16),
          s.receiptPath != null ? l10n.formReceiptAttached : l10n.formReceipt,
          () => c.pickReceipt(ReceiptSource.camera),
        ),
    ];
    return HorizonAmountFirst(
      amountText: s.amount,
      symbol: getCurrencySymbol(s.currency),
      subLine: converted,
      error: s.error,
      titleController: _title,
      onTitleChanged: c.setTitle,
      chips: chips,
      onKey: _horizonKey,
      saveLabel: s.submitting
          ? l10n.formSaving
          : equalShare != null && splitCount > 1
          ? l10n.horizonSaveEach(_fmt(context, equalShare, s.currency))
          : l10n.formSave,
      onSave: s.submitting ? null : () => _save(),
      onMore: _openHorizonDetails,
    );
  }

  Future<void> _horizonPickCategory(List<Category> categories) => AppSheet.show<void>(
    context: context,
    title: context.l10n.horizonPickCategory,
    builder: (ctx) => Padding(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
      child: Wrap(
        spacing: 8,
        runSpacing: 8,
        children: [
          for (final cat in categories)
            _CategoryChip(
              category: cat,
              selected: cat.id == ref.read(expenseFormProvider(args)).category,
              onTap: () {
                _c.setCategory(cat.id);
                Navigator.of(ctx).pop();
              },
            ),
        ],
      ),
    ),
  );

  Future<void> _horizonPickPayer(List<Member> members, String? uid) => AppSheet.show<void>(
    context: context,
    title: context.l10n.horizonWhoPaid,
    builder: (ctx) => Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        for (final m in members)
          ListTile(
            key: Key('horizon-payer-${m.id}'),
            leading: AppAvatar(name: m.name, avatarUrl: m.avatarUrl, size: 32),
            title: Text(uid != null && m.linkedUserId == uid ? context.l10n.horizonYou : m.name),
            trailing: m.id == ref.read(expenseFormProvider(args)).payer ? const Icon(Icons.check_rounded) : null,
            onTap: () {
              _c.setPayer(m.id);
              Navigator.of(ctx).pop();
            },
          ),
      ],
    ),
  );

  /// Member id -> name for the "pays for" Apply chip.
  String Function(String id) _nameIn(List<Member> members) =>
      (id) => members.where((m) => m.id == id).firstOrNull?.name ?? id;

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
      showCheckmark: false,
      shape: const StadiumBorder(),
      selectedColor: color.withValues(alpha: 0.16),
      // Ink label in every state: the chip theme flips a selected label to the page colour, which vanishes on this tint.
      labelStyle: TextStyle(color: context.tokens.textPrimary, fontSize: 14, fontWeight: FontWeight.w600),
      side: BorderSide(color: selected ? color : Colors.transparent, width: 1.5),
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
    this.equalShareLabel,
    super.key,
  });
  final Member member;
  final bool selected;
  final String mode;
  final String? configText;
  final int epoch;
  final VoidCallback onToggle;
  final ValueChanged<String> onConfig;
  final String? equalShareLabel;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final tokens = context.tokens;
    final needsInput = selected && (mode == 'custom' || mode == 'percentage' || mode == 'exact');
    final hint = mode == 'custom'
        ? l10n.formShareHint
        : mode == 'percentage'
        ? l10n.formPercentHint
        : l10n.formExactHint;
    return Row(
      children: [
        Expanded(
          child: CheckboxListTile(
            key: Key('split-${member.id}'),
            contentPadding: EdgeInsets.zero,
            controlAffinity: ListTileControlAffinity.leading,
            value: selected,
            onChanged: (_) => onToggle(),
            title: Text(member.name),
            subtitle: equalShareLabel == null
                ? null
                : Text(
                    equalShareLabel!,
                    key: Key('equal-share-${member.id}'),
                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: tokens.primaryAccent),
                  ),
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
      ],
    );
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
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (final item in state.items)
          Card(
            key: Key('item-${item.id}'),
            margin: const EdgeInsets.only(top: 8),
            child: Padding(
              padding: const EdgeInsets.all(10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    children: [
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
                      IconButton(
                        tooltip: l10n.rowDelete,
                        icon: const Icon(AppIcons.delete),
                        onPressed: () => controller.removeItem(item.id),
                      ),
                    ],
                  ),
                  Row(
                    children: [
                      Text(l10n.formItemSharedBy, style: TextStyle(fontSize: 12, color: tokens.textMuted)),
                      const SizedBox(width: 8),
                      InkWell(
                        onTap: () => controller.updateItem(item.id, assigned: [for (final m in members) m.id]),
                        child: Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                          child: Text(
                            'All',
                            style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: tokens.primaryAccent),
                          ),
                        ),
                      ),
                      const SizedBox(width: 4),
                      InkWell(
                        onTap: () => controller.updateItem(item.id, assigned: const []),
                        child: Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                          child: Text('Clear', style: TextStyle(fontSize: 11, color: tokens.textMuted)),
                        ),
                      ),
                      const Spacer(),
                      if (item.assignedMemberIds.length > 1 && item.amount > 0)
                        Flexible(
                          child: Text(
                            '${formatMoney(context, item.amount / item.assignedMemberIds.length, currency)} ea',
                            style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: tokens.primaryAccent),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                    ],
                  ),
                  Wrap(
                    spacing: 6,
                    children: [
                      for (final m in members)
                        FilterChip(
                          key: Key('item-${item.id}-${m.id}'),
                          label: Text(m.name),
                          selected: item.assignedMemberIds.contains(m.id),
                          onSelected: (on) => controller.updateItem(
                            item.id,
                            assigned: [
                              for (final x in members)
                                if (x.id == m.id ? on : item.assignedMemberIds.contains(x.id)) x.id,
                            ],
                          ),
                        ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        Align(
          alignment: Alignment.centerLeft,
          child: TextButton.icon(
            key: const Key('add-item'),
            onPressed: controller.addItem,
            icon: const Icon(AppIcons.add),
            label: Text(l10n.formAddItem),
          ),
        ),
        Row(
          children: [
            for (final f in [
              (l10n.formTax, state.tax, controller.setTax, 'tax'),
              (l10n.formTip, state.tip, controller.setTip, 'tip'),
              (l10n.formDiscount, state.discount, controller.setDiscount, 'discount'),
            ])
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
          ],
        ),
        if (total > 0)
          Align(
            alignment: Alignment.centerLeft,
            child: TextButton(
              key: const Key('use-total'),
              onPressed: controller.syncItemizedTotal,
              child: Text(l10n.formUseTotal(formatMoney(context, total, currency))),
            ),
          ),
        if (total > 0 && state.items.isNotEmpty)
          Builder(
            builder: (context) {
              final shares = controller.preview();
              if (shares.isEmpty) return const SizedBox.shrink();
              return Container(
                margin: const EdgeInsets.only(top: 8, bottom: 4),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: tokens.primaryAccent.withValues(alpha: 0.07),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: tokens.primaryAccent.withValues(alpha: 0.2)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Text(
                            'Member Shares (incl. tax/tip)',
                            style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: tokens.textPrimary),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          formatMoney(context, total, currency),
                          style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: tokens.primaryAccent),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      runSpacing: 6,
                      children: [
                        for (final m in members)
                          if (shares.containsKey(m.id) && (shares[m.id] ?? 0) > 0)
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: tokens.bgSurface,
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(color: tokens.primaryAccent.withValues(alpha: 0.3)),
                              ),
                              child: Text(
                                '${m.name}: ${formatMoney(context, shares[m.id]!, currency)}',
                                style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: tokens.textPrimary),
                              ),
                            ),
                      ],
                    ),
                  ],
                ),
              );
            },
          ),
      ],
    );
  }
}

/// Default trip FX config holder (const-constructible helper).
class TripFxConfigDefaults {
  const TripFxConfigDefaults();
  TripFxConfig get value => const TripFxConfig();
}

extension on TripFxConfig {
  TripFxConfig copyWithRates(Map<String, double> rates) =>
      TripFxConfig(customRates: rates, markupPercent: markupPercent);
}

class _FormReceiptThumbnail extends ConsumerWidget {
  const _FormReceiptThumbnail({required this.editingId, required this.receiptPath, required this.title});

  final String? editingId;
  final String receiptPath;
  final String title;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final clean = receiptPath.replaceFirst('file://', '');
    final localExists = File(clean).existsSync();
    final preview = localExists ? clean : ref.watch(receiptPreviewProvider((editingId ?? '', receiptPath))).value;

    final resolved = preview ?? (clean.startsWith('http') ? clean : null);

    Widget imageWidget;
    if (resolved != null && (resolved.startsWith('http://') || resolved.startsWith('https://'))) {
      imageWidget = Image(
        image: cachedPhotoSized(context, resolved, logicalWidth: 64),
        key: const Key('receipt-preview'),
        width: 64,
        height: 64,
        fit: BoxFit.cover,
        errorBuilder: (_, _, _) => const SizedBox(width: 64, height: 64, child: Icon(Icons.image_outlined)),
      );
    } else if (resolved != null && File(resolved.replaceFirst('file://', '')).existsSync()) {
      imageWidget = Image.file(
        File(resolved.replaceFirst('file://', '')),
        key: const Key('receipt-preview'),
        width: 64,
        height: 64,
        fit: BoxFit.cover,
        errorBuilder: (_, _, _) => const SizedBox(width: 64, height: 64, child: Icon(Icons.image_outlined)),
      );
    } else {
      imageWidget = const SizedBox(
        width: 64,
        height: 64,
        child: Center(child: SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))),
      );
    }

    return InkWell(
      key: const Key('receipt-preview-tap'),
      borderRadius: BorderRadius.circular(8),
      onTap: resolved != null
          ? () => showReceiptPhotoViewer(context, previewPath: resolved, title: title.isEmpty ? 'Receipt' : title)
          : null,
      child: Stack(
        children: [
          ClipRRect(borderRadius: BorderRadius.circular(8), child: imageWidget),
          Positioned(
            bottom: 2,
            right: 2,
            child: Container(
              padding: const EdgeInsets.all(2),
              decoration: const BoxDecoration(color: Colors.black54, shape: BoxShape.circle),
              child: const Icon(Icons.zoom_in_rounded, size: 14, color: Colors.white),
            ),
          ),
        ],
      ),
    );
  }
}
