import 'dart:async';
import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:uuid/uuid.dart';

import '../../../app/auth_state.dart';
import '../../../core/clock.dart';
import '../../../core/storage/prefs.dart';
import '../../../data/platform/receipt_picker.dart';
import '../../../data/providers.dart';
import '../../../domain/logic/category_helper.dart' show autoSuggestCategory;
import '../../../domain/logic/default_split.dart';
import '../../../domain/logic/duplicate_expense_detector.dart';
import '../../../domain/logic/expense_draft.dart';
import '../../../domain/logic/expense_form_logic.dart';
import '../../../domain/logic/expense_quick_parser.dart';
import '../../../domain/logic/flag_defaults.g.dart';
import '../../../domain/logic/last_expense.dart';
import '../../../domain/logic/math_expression.dart';
import '../../../domain/logic/predictive_expenses.dart';
import '../../../domain/models/category.dart';
import '../../../domain/models/expense.dart';
import '../../../domain/models/expense_io.dart';
import '../../../domain/models/member.dart';
import '../../../domain/models/trip.dart';
import '../../trip_details/application/trip_nav.dart';
import 'expenses_providers.dart';

/// Which screen is being edited: a new expense in [tripId], or [editingId].
class ExpenseFormArgs {
  const ExpenseFormArgs(this.tripId, [this.editingId]);
  final String tripId;
  final String? editingId;

  @override
  bool operator ==(Object other) => other is ExpenseFormArgs && other.tripId == tripId && other.editingId == editingId;
  @override
  int get hashCode => Object.hash(tripId, editingId);
}

/// Ops Deck flags the form reads (per-trip overrides apply).
class FormFlags {
  const FormFlags(this._on);
  final Map<String, bool> _on;
  bool _f(String k) => _on[k] ?? false;

  bool get multiPayer => _f('enableMultiPayerExpenses');
  bool get itemized => _f('enableItemizedSplit');
  bool get advancedSplits => _f('enableAdvancedSplits');
  bool get currencyFx => _f('enableCurrencyFx');
  bool get receiptUpload => _f('enableReceiptUpload');
  bool get predictiveChips => _f('enablePredictiveChips');
  bool get duplicateDetector => _f('enableDuplicateDetector');
  bool get cloneLast => _f('enableCloneLastExpense');
  bool get rememberSplit => _f('enableRememberDefaultSplit');
  bool get persistentDraft => _f('enablePersistentExpenseDraft');
  bool get exclusionDefaults => _f('enableSplitExclusionDefaults');
  bool get dateRangeMembership => _f('enableDateRangeMembership');
  bool get categoryReorder => _f('enableCategoryReorder');
  bool get compactForm => _f('enableCompactExpenseForm');
  bool get explain => _f('enableExplainThisNumber');
  bool get approvalThreshold => _f('enableExpenseApprovalThreshold');
  bool get chatCards => _f('enableInChatEventCards') && _f('enableTripChat');

  static const keys = [
    'enableMultiPayerExpenses', 'enableItemizedSplit', 'enableAdvancedSplits', 'enableCurrencyFx', 'enableReceiptUpload',
    'enablePredictiveChips', 'enableDuplicateDetector', 'enableCloneLastExpense', 'enableRememberDefaultSplit',
    'enablePersistentExpenseDraft', 'enableSplitExclusionDefaults', 'enableDateRangeMembership', 'enableCategoryReorder',
    'enableCompactExpenseForm', 'enableExplainThisNumber', 'enableExpenseApprovalThreshold', 'enableInChatEventCards', 'enableTripChat',
  ];
}

/// Resolved once every flag has emitted (so the form never flashes the wrong controls).
final formFlagsProvider = Provider.family<AsyncValue<FormFlags>, String>((ref, tripId) {
  final values = <String, bool>{};
  for (final k in FormFlags.keys) {
    final v = ref.watch(flagProvider((k, tripId)));
    if (!v.hasValue) return const AsyncLoading();
    values[k] = v.value ?? (defaultFeatureFlags[k] ?? false);
  }
  return AsyncData(FormFlags(values));
});

class _PrefsStore implements KeyValueStore {
  _PrefsStore(this._p);
  final SharedPreferences _p;
  @override
  String? getString(String key) => _p.getString(key);
  @override
  Future<void> setString(String key, String value) => _p.setString(key, value);
  @override
  Future<void> remove(String key) => _p.remove(key);
}

class MemoryKeyValueStore implements KeyValueStore {
  final _m = <String, String>{};
  @override
  String? getString(String key) => _m[key];
  @override
  Future<void> setString(String key, String value) async => _m[key] = value;
  @override
  Future<void> remove(String key) async => _m.remove(key);
}

/// Session-only drafts (flag OFF): survive leaving the screen, not an app restart.
final sessionDraftStoreProvider = Provider<MemoryKeyValueStore>((ref) => MemoryKeyValueStore());

class ExpenseFormState {
  const ExpenseFormState({
    required this.title,
    required this.amount,
    required this.category,
    required this.date,
    required this.payer,
    required this.currency,
    required this.splitMode,
    required this.selected,
    this.payerMode = PayerMode.single,
    this.multiPayerShares = const {},
    this.splitConfig = const {},
    this.items = const [],
    this.tax = '',
    this.tip = '',
    this.discount = '',
    this.receiptPath,
    this.error,
    this.submitting = false,
    this.draftRestored = false,
    this.autoCategoryName,
    this.ignoredDuplicateId,
    this.showDuplicateDetails = false,
    this.newExpenseId = '',
    this.epoch = 0,
  });

  final String title;
  final String amount;
  final String category;
  final String date;
  final String payer;
  final String currency;
  final String splitMode;
  final Map<String, bool> selected;
  final PayerMode payerMode;
  final Map<String, String> multiPayerShares;
  final Map<String, String> splitConfig;
  final List<ReceiptItem> items;
  final String tax;
  final String tip;
  final String discount;

  /// A freshly picked photo (temp file), staged only on save.
  final String? receiptPath;
  final String? error;
  final bool submitting;
  final bool draftRestored;
  final String? autoCategoryName;
  final String? ignoredDuplicateId;
  final bool showDuplicateDetails;

  /// Id the new expense will get (a staged receipt is named after it).
  final String newExpenseId;

  /// Bumped when the form is changed programmatically (presets, clone, draft), so
  /// text fields rebuild with the new values instead of keeping stale text.
  final int epoch;

  List<String> get selectedIds => [for (final e in selected.entries) if (e.value) e.key];

  ExpenseFormState copyWith({
    String? title,
    String? amount,
    String? category,
    String? date,
    String? payer,
    String? currency,
    String? splitMode,
    Map<String, bool>? selected,
    PayerMode? payerMode,
    Map<String, String>? multiPayerShares,
    Map<String, String>? splitConfig,
    List<ReceiptItem>? items,
    String? tax,
    String? tip,
    String? discount,
    String? receiptPath,
    bool clearReceipt = false,
    String? error,
    bool clearError = false,
    bool? submitting,
    bool? draftRestored,
    String? autoCategoryName,
    bool clearAutoCategory = false,
    String? ignoredDuplicateId,
    bool? showDuplicateDetails,
    bool bump = false,
  }) =>
      ExpenseFormState(
        title: title ?? this.title,
        amount: amount ?? this.amount,
        category: category ?? this.category,
        date: date ?? this.date,
        payer: payer ?? this.payer,
        currency: currency ?? this.currency,
        splitMode: splitMode ?? this.splitMode,
        selected: selected ?? this.selected,
        payerMode: payerMode ?? this.payerMode,
        multiPayerShares: multiPayerShares ?? this.multiPayerShares,
        splitConfig: splitConfig ?? this.splitConfig,
        items: items ?? this.items,
        tax: tax ?? this.tax,
        tip: tip ?? this.tip,
        discount: discount ?? this.discount,
        receiptPath: clearReceipt ? null : (receiptPath ?? this.receiptPath),
        error: clearError ? null : (error ?? this.error),
        submitting: submitting ?? this.submitting,
        draftRestored: draftRestored ?? this.draftRestored,
        autoCategoryName: clearAutoCategory ? null : (autoCategoryName ?? this.autoCategoryName),
        ignoredDuplicateId: ignoredDuplicateId ?? this.ignoredDuplicateId,
        showDuplicateDetails: showDuplicateDetails ?? this.showDuplicateDetails,
        newExpenseId: newExpenseId,
        epoch: bump ? epoch + 1 : epoch,
      );

  /// Whether anything worth confirming on "close" has been entered.
  bool get isEmpty => title.trim().isEmpty && amount.isEmpty && receiptPath == null && splitConfig.isEmpty;
}

String _draftKey(String tripId) => 'tt_draft_expense_$tripId';
String _defaultSplitKey(String tripId) => 'tt-default-split:v1:$tripId';

class ExpenseFormController extends Notifier<ExpenseFormState> {
  ExpenseFormController(this.args);
  final ExpenseFormArgs args;

  Timer? _draftTimer;
  Future<void> Function()? _pendingWrite;
  bool _saved = false;

  String get tripId => args.tripId;
  bool get editing => args.editingId != null;

  FormFlags get flags => ref.read(formFlagsProvider(tripId)).value ?? const FormFlags({});
  Trip get _trip => ref.read(tripProvider(tripId)).value!;
  List<Member> get _members => ref.read(visibleMembersProvider(tripId));
  List<Category> get _categories => ref.read(tripCategoriesProvider(tripId));
  List<Expense> get _expenses => ref.read(tripExpensesProvider(tripId)).value ?? const [];
  String? get _myMemberId => ref.read(myMemberIdProvider(tripId));
  DateTime get _now => ref.read(nowProvider)();
  KeyValueStore get _draftStore =>
      flags.persistentDraft ? _PrefsStore(ref.read(sharedPreferencesProvider)) : ref.read(sessionDraftStoreProvider);

  @override
  ExpenseFormState build() {
    ref.onDispose(() {
      // state/ref are off-limits here: flush the write queued by the last edit.
      final pending = _pendingWrite;
      _draftTimer?.cancel();
      if (!_saved && !editing && pending != null) unawaited(pending());
    });
    return _initial();
  }

  ExpenseFormState _initial() {
    final trip = _trip;
    final members = _members;
    final base = trip.baseCurrency.isEmpty ? 'INR' : trip.baseCurrency;
    final today = todayDateString(_now);
    final defaultCategory = _categories.any((c) => c.id == 'cat-food') ? 'cat-food' : (_categories.isEmpty ? '' : _categories.first.id);
    final newId = ref.read(expenseIdProvider)();

    if (editing) {
      final e = _expenses.where((x) => x.id == args.editingId).firstOrNull;
      if (e != null) {
        return ExpenseFormState(
          title: e.title,
          amount: _numText(e.amount),
          category: e.category,
          date: e.date,
          payer: e.paidBy,
          currency: e.currency.isEmpty ? base : e.currency,
          splitMode: e.splitMode,
          selected: {for (final id in e.splitMemberIds) id: true},
          payerMode: e.paidByShares != null && e.paidByShares!.length > 1 ? PayerMode.multiple : PayerMode.single,
          multiPayerShares: {for (final p in (e.paidByShares ?? const <String, double>{}).entries) p.key: _numText(p.value)},
          splitConfig: {for (final c in (e.splitConfig ?? const <String, double>{}).entries) c.key: _numText(c.value)},
          items: e.itemizedConfig?.items ?? const [],
          tax: e.itemizedConfig?.tax == null ? '' : _numText(e.itemizedConfig!.tax!),
          tip: e.itemizedConfig?.tip == null ? '' : _numText(e.itemizedConfig!.tip!),
          discount: e.itemizedConfig?.discount == null ? '' : _numText(e.itemizedConfig!.discount!),
          newExpenseId: e.id,
        );
      }
    }

    final payer = resolveDefaultExpensePayerId(members, currentMemberId: _myMemberId, fallbackToFirstMember: true) ?? '';
    // New expenses start with everyone in, minus date-range absentees and the category's default exclusions.
    final excluded = flags.exclusionDefaults ? (trip.splitExclusionDefaults[defaultCategory] ?? const <String>[]) : const <String>[];
    final selected = {
      for (final m in members)
        m.id: (flags.dateRangeMembership ? isMemberPresentOnDate(m, today) : true) && !excluded.contains(m.id),
    };
    final base0Init = ExpenseFormState(
      title: '',
      amount: '',
      category: defaultCategory,
      date: today,
      payer: payer,
      currency: base,
      splitMode: 'equal',
      selected: selected,
      newExpenseId: newId,
    );

    var base0 = base0Init;
    final draft = _readDraftSync();
    if (draft != null) {
      final cats = _categories.map((c) => c.id).toSet();
      final memberIds = members.map((m) => m.id).toSet();
      final sel = draft['selectedSplitMembers'];
      return base0.copyWith(
        title: draft['title'] as String? ?? '',
        amount: draft['amount'] as String? ?? '',
        category: cats.contains(draft['category']) ? draft['category'] as String : null,
        date: draft['date'] as String?,
        payer: memberIds.contains(draft['payer']) ? draft['payer'] as String : null,
        splitMode: draft['splitMode'] as String?,
        selected: sel is Map ? {for (final e in sel.entries) '${e.key}': e.value == true} : null,
        splitConfig: _strMap(draft['splitConfig']),
        payerMode: draft['payerMode'] == 'multiple' ? PayerMode.multiple : null,
        multiPayerShares: draft['multiPayerShares'] == null ? null : _strMap(draft['multiPayerShares']),
        currency: draft['selectedCurrency'] as String?,
        items: draft['receiptItems'] is List
            ? [for (final i in draft['receiptItems'] as List) ReceiptItem.fromJson(Map<String, dynamic>.from(i as Map))]
            : null,
        tax: draft['receiptTax'] as String?,
        tip: draft['receiptTip'] as String?,
        discount: draft['receiptDiscount'] as String?,
        draftRestored: true,
      );
    }

    if (flags.rememberSplit) {
      final stored = _loadDefaultSplit();
      if (stored != null) {
        final allowed = members.map((m) => m.id).toSet();
        final ids = stored.splitMemberIds.where(allowed.contains).toList();
        if (ids.isNotEmpty) {
          base0 = base0.copyWith(
            selected: {for (final m in members) m.id: ids.contains(m.id)},
            splitMode: stored.splitMode,
            splitConfig: {for (final c in (stored.splitConfig ?? const <String, double>{}).entries) if (allowed.contains(c.key)) c.key: _numText(c.value)},
          );
        }
      }
    }
    return base0;
  }

  static String _numText(double v) => v == v.roundToDouble() ? v.toInt().toString() : v.toString();
  static Map<String, String> _strMap(Object? m) => m is Map ? {for (final e in m.entries) '${e.key}': '${e.value}'} : const {};

  Map<String, dynamic>? _readDraftSync() {
    if (editing) return null;
    try {
      final raw = _draftStore.getString(_draftKey(tripId));
      if (raw == null) return null;
      final parsed = jsonDecode(raw);
      if (parsed is! Map) return null;
      final savedAt = parsed['savedAt'];
      final data = parsed['data'];
      if (savedAt is! num || data is! Map) return null;
      if (_now.millisecondsSinceEpoch - savedAt > draftTtl.inMilliseconds) return null;
      return Map<String, dynamic>.from(data);
    } catch (_) {
      return null;
    }
  }

  RememberedDefaultSplit? _loadDefaultSplit() {
    try {
      final raw = ref.read(sharedPreferencesProvider).getString(_defaultSplitKey(tripId));
      return raw == null ? null : RememberedDefaultSplit.fromJson(jsonDecode(raw) as Map<String, dynamic>);
    } catch (_) {
      return null;
    }
  }

  // ---- draft -------------------------------------------------------------------

  void _touch() {
    if (editing) return;
    _draftTimer?.cancel();
    final s = state;
    final store = _draftStore;
    final now = _now;
    final persistent = flags.persistentDraft;
    _pendingWrite = () => _writeDraft(s, store, now, persistent);
    _draftTimer = Timer(const Duration(milliseconds: 350), () {
      final w = _pendingWrite;
      _pendingWrite = null;
      if (w != null) unawaited(w());
    });
  }

  Future<void> _writeDraft(ExpenseFormState s, KeyValueStore store, DateTime now, bool persistent) async {
    if (s.title.trim().isEmpty && s.amount.trim().isEmpty) return;
    final data = <String, dynamic>{
      'title': s.title,
      'amount': s.amount,
      'category': s.category,
      'date': s.date,
      'payer': s.payer,
      'splitMode': s.splitMode,
      'selectedSplitMembers': s.selected,
      'splitConfig': s.splitConfig,
      if (persistent) ...{
        'payerMode': s.payerMode == PayerMode.multiple ? 'multiple' : 'single',
        'multiPayerShares': s.multiPayerShares,
        'selectedCurrency': s.currency,
        'receiptItems': [for (final i in s.items) i.toJson()],
        'receiptTax': s.tax,
        'receiptTip': s.tip,
        'receiptDiscount': s.discount,
      },
    };
    await saveDraft(store, _draftKey(tripId), data, now);
  }

  Future<void> _removeDraft() {
    _draftTimer?.cancel();
    _pendingWrite = null;
    return _draftStore.remove(_draftKey(tripId));
  }

  Future<void> discardDraft() async {
    await _removeDraft();
    state = _freshState(epoch: state.epoch + 1);
  }

  ExpenseFormState _freshState({int epoch = 0}) {
    final trip = _trip;
    final members = _members;
    final base = trip.baseCurrency.isEmpty ? 'INR' : trip.baseCurrency;
    final today = todayDateString(_now);
    return ExpenseFormState(
      title: '',
      amount: '',
      category: _categories.any((c) => c.id == 'cat-food') ? 'cat-food' : (_categories.isEmpty ? '' : _categories.first.id),
      date: today,
      payer: resolveDefaultExpensePayerId(members, currentMemberId: _myMemberId, fallbackToFirstMember: true) ?? '',
      currency: base,
      splitMode: 'equal',
      selected: {for (final m in members) m.id: true},
      newExpenseId: state.newExpenseId,
      epoch: epoch,
    );
  }

  // ---- field updates -------------------------------------------------------------

  void _set(ExpenseFormState s) {
    state = s;
    _touch();
  }

  void setTitle(String v) {
    var next = state.copyWith(title: v, clearError: true);
    // Category follows the title until the user picks one (web "smart category").
    if (!editing && v.trim().isNotEmpty && _autoPicking) {
      final suggested = autoSuggestCategory(v, _categories, _expenses);
      if (suggested != null && suggested != state.category) {
        final name = _categories.where((c) => c.id == suggested).firstOrNull?.name;
        next = next.copyWith(category: suggested, autoCategoryName: name);
      }
    }
    _set(next);
  }

  /// Auto category only runs until the user chooses a category themselves.
  bool _autoPicking = true;

  void setAmount(String v) => _set(state.copyWith(amount: v, clearError: true));

  void setCategory(String id, {bool byUser = true}) {
    if (byUser) _autoPicking = false;
    var next = state.copyWith(category: id, clearAutoCategory: byUser, clearError: true);
    // Changing category re-applies that category's default exclusions to a still-pristine split.
    if (flags.exclusionDefaults && !editing && state.splitConfig.isEmpty) {
      final excluded = _trip.splitExclusionDefaults[id] ?? const <String>[];
      next = next.copyWith(selected: {for (final m in _members) m.id: (state.selected[m.id] ?? true) && !excluded.contains(m.id)});
    }
    _set(next);
  }

  void setDate(String v) => _set(state.copyWith(date: v));
  void setPayer(String id) => _set(state.copyWith(payer: id, clearError: true));
  void setPayerMode(PayerMode m) {
    var next = state.copyWith(payerMode: m, clearError: true);
    if (m == PayerMode.multiple && state.multiPayerShares.isEmpty && state.payer.isNotEmpty && state.amount.isNotEmpty) {
      next = next.copyWith(multiPayerShares: {state.payer: state.amount});
    }
    _set(next);
  }

  void setMultiPayerShare(String memberId, String v) =>
      _set(state.copyWith(multiPayerShares: {...state.multiPayerShares, memberId: v}, clearError: true));

  void setCurrency(String code) => _set(state.copyWith(currency: code));

  void setSplitMode(String mode) => _set(state.copyWith(splitMode: mode, clearError: true));

  void toggleMember(String id) {
    final on = !(state.selected[id] ?? false);
    final cfg = {...state.splitConfig};
    if (!on) cfg.remove(id);
    _set(state.copyWith(selected: {...state.selected, id: on}, splitConfig: cfg, clearError: true));
  }

  void setSplitConfig(String memberId, String v) =>
      _set(state.copyWith(splitConfig: {...state.splitConfig, memberId: v}, clearError: true));

  // Presets (web: Equal for all / payer 50% / only payer / everyone but payer)
  void presetEveryone() => _set(state.copyWith(selected: {for (final m in _members) m.id: true}, splitConfig: const {}, splitMode: 'equal', bump: true));

  void presetOnlyPayer() {
    if (state.payer.isEmpty) return;
    _set(state.copyWith(selected: {state.payer: true}, splitConfig: const {}, splitMode: 'equal', bump: true));
  }

  void presetExcludePayer() {
    if (state.payer.isEmpty) return;
    _set(state.copyWith(selected: {for (final m in _members) m.id: m.id != state.payer}, splitConfig: const {}, splitMode: 'equal', bump: true));
  }

  void presetPayerHalf() {
    if (state.payer.isEmpty) return;
    final others = _members.where((m) => m.id != state.payer).toList();
    final cfg = {state.payer: '50', for (final m in others) m.id: (50 / others.length).toStringAsFixed(1)};
    _set(state.copyWith(selected: {for (final m in _members) m.id: true}, splitConfig: cfg, splitMode: 'percentage', bump: true));
  }

  /// Group shortcut: select exactly this group's members (web `handleApplyGroupToSplitLocal`).
  void applyGroup(List<String> memberIds, {required bool checked}) {
    final cfg = {...state.splitConfig};
    final sel = {...state.selected};
    if (checked) {
      for (final m in _members) {
        final inGroup = memberIds.contains(m.id);
        sel[m.id] = inGroup;
        if (!inGroup) cfg.remove(m.id);
      }
    } else {
      for (final id in memberIds) {
        sel[id] = false;
        cfg.remove(id);
      }
    }
    _set(state.copyWith(selected: sel, splitConfig: cfg, bump: true));
  }

  // Itemized receipt
  void addItem() {
    final n = state.items.length + 1;
    _set(state.copyWith(items: [
      ...state.items,
      ReceiptItem(id: 'item-${_now.microsecondsSinceEpoch}-$n', name: 'Item $n', amount: 0, assignedMemberIds: [for (final m in _members) m.id]),
    ]));
  }

  void updateItem(String id, {String? name, double? amount, List<String>? assigned}) => _set(state.copyWith(items: [
        for (final i in state.items)
          i.id == id ? ReceiptItem(id: i.id, name: name ?? i.name, amount: amount ?? i.amount, assignedMemberIds: assigned ?? i.assignedMemberIds) : i,
      ]));

  void removeItem(String id) => _set(state.copyWith(items: [for (final i in state.items) if (i.id != id) i]));
  void setTax(String v) => _set(state.copyWith(tax: v));
  void setTip(String v) => _set(state.copyWith(tip: v));
  void setDiscount(String v) => _set(state.copyWith(discount: v));

  /// "Use receipt total as the amount".
  void syncItemizedTotal() {
    final t = itemizedTotal(state.items, tax: state.tax, tip: state.tip, discount: state.discount);
    if (t > 0) _set(state.copyWith(amount: t.toStringAsFixed(2)));
  }

  // Duplicate warning
  void ignoreDuplicate(String id) => state = state.copyWith(ignoredDuplicateId: id);
  void toggleDuplicateDetails() => state = state.copyWith(showDuplicateDetails: !state.showDuplicateDetails);

  /// Matches against what existed when the form opened, never the row being created.
  DuplicateMatchResult? duplicate(Set<String> initialIds) {
    if (!flags.duplicateDetector || editing || state.submitting) return null;
    final amount = double.tryParse(state.amount) ?? 0; // web: parseFloat(amount)
    if (amount <= 0) return null;
    return detectDuplicateExpense(
      CandidateExpense(
        amount: amount,
        currency: state.currency,
        title: state.title.trim(),
        date: state.date,
        categoryId: state.category,
        paidById: state.payer,
      ),
      _expenses.where((e) => initialIds.contains(e.id)).toList(),
      _categories,
      _members,
    );
  }

  // Shortcuts
  List<PredictiveQuickChip> get chips => flags.predictiveChips ? getPredictiveQuickChips(_categories, _expenses, _now) : const [];

  void applyChip(PredictiveQuickChip c) {
    _autoPicking = false;
    _set(state.copyWith(title: c.title, category: c.categoryId, clearAutoCategory: true, bump: true));
  }

  Expense? get lastExpense => latestNonSettlementExpense(_expenses, tripId: tripId);

  /// "Same as last time": copies title, amount, category, payer and split; date becomes today.
  void applyLast() {
    final e = lastExpense;
    if (e == null) return;
    final memberIds = _members.map((m) => m.id).toSet();
    _autoPicking = false;
    _set(state.copyWith(
      title: e.title,
      amount: _numText(e.amount),
      category: _categories.any((c) => c.id == e.category) ? e.category : null,
      date: todayDateString(_now),
      payer: memberIds.contains(e.paidBy) ? e.paidBy : null,
      splitMode: e.splitMode,
      selected: {for (final m in _members) m.id: e.splitMemberIds.contains(m.id)},
      splitConfig: {for (final c in (e.splitConfig ?? const <String, double>{}).entries) c.key: _numText(c.value)},
      clearError: true,
      bump: true,
    ));
  }

  /// Quick fill from free text ("Coffee 4.50 Alice yesterday"). Returns false if nothing was understood.
  bool quickFill(String text) {
    final p = parseQuickExpense(text, _categories, _expenses, _members, _myMemberId);
    if (p == null) return false;
    _autoPicking = p.categoryId == null;
    final memberIds = _members.map((m) => m.id).toSet();
    _set(state.copyWith(
      amount: p.amount != null && p.amount! > 0 ? _numText(p.amount!) : null,
      currency: p.currency != null && defaultRateCurrencies.contains(p.currency) ? p.currency : null,
      title: p.title.isNotEmpty ? p.title : null,
      category: p.categoryId,
      autoCategoryName: p.categoryId == null ? null : p.categoryName,
      payer: p.paidById != null && memberIds.contains(p.paidById) ? p.paidById : null,
      date: p.date,
      selected: p.splitMemberIds == null || p.splitMemberIds!.isEmpty ? null : {for (final m in _members) m.id: p.splitMemberIds!.contains(m.id)},
      clearError: true,
      bump: true,
    ));
    return true;
  }

  // Receipt
  Future<void> pickReceipt(ReceiptSource source) async {
    final path = await ref.read(receiptPickerProvider).pick(source);
    if (path != null) _set(state.copyWith(receiptPath: path));
  }

  void removeReceipt() => _set(state.copyWith(clearReceipt: true));

  // ---- submit ------------------------------------------------------------------------

  ExpenseFormInput toInput() {
    final trip = _trip;
    return ExpenseFormInput(
      title: state.title,
      amountText: state.amount,
      currency: state.currency,
      baseCurrency: trip.baseCurrency.isEmpty ? 'INR' : trip.baseCurrency,
      category: state.category,
      date: state.date,
      paidBy: state.payer,
      splitMode: state.splitMode,
      splitSelectedIds: [for (final m in _members) if (state.selected[m.id] == true) m.id],
      splitConfig: state.splitConfig,
      payerMode: state.payerMode,
      multiPayerShares: state.multiPayerShares,
      multiPayerEnabled: flags.multiPayer,
      currencyFxEnabled: flags.currencyFx,
      customRates: trip.fxConfig?.customRates,
      receiptItems: state.items,
      receiptTax: state.tax,
      receiptTip: state.tip,
      receiptDiscount: state.discount,
    );
  }

  /// Validates, stages the receipt, saves. Returns the outcome (error text is also in state).
  Future<SaveOutcome> submit() async {
    if (state.submitting) return const SaveOutcome.failed('Already saving.');
    final built = buildExpenseSubmission(toInput());
    if (!built.isOk) {
      state = state.copyWith(error: built.error);
      return SaveOutcome.failed(built.error!);
    }
    state = state.copyWith(submitting: true, clearError: true);
    try {
      StagedReceipt? staged;
      final id = editing ? args.editingId! : state.newExpenseId;
      if (state.receiptPath != null) staged = await ref.read(receiptStoreProvider).stage(id, state.receiptPath!);
      final uid = ref.read(authStateProvider).userId ?? '';
      final outcome = await ref.read(expenseRepositoryProvider).submit(
            built.submission!,
            tripId: tripId,
            userId: uid,
            editingId: args.editingId,
            expenseId: editing ? null : id,
            receipt: staged,
            approvalThresholdEnabled: flags.approvalThreshold,
            postChatCard: flags.chatCards,
          );
      if (!outcome.isOk) {
        state = state.copyWith(submitting: false, error: outcome.error);
        return outcome;
      }
      _saved = true;
      _draftTimer?.cancel();
      await _removeDraft();
      if (!editing && flags.rememberSplit) await _rememberSplit(built.submission!);
      state = state.copyWith(submitting: false);
      return outcome;
    } catch (e) {
      state = state.copyWith(submitting: false, error: '$e');
      return SaveOutcome.failed('$e');
    }
  }

  Future<void> _rememberSplit(ExpenseSubmission s) async {
    final cfg = s.splitConfig;
    final value = RememberedDefaultSplit(
      splitMode: s.splitMode,
      splitMemberIds: s.splitMemberIds,
      splitConfig: (s.splitMode == 'percentage' || s.splitMode == 'exact') && cfg != null && cfg.isNotEmpty ? cfg : null,
    );
    await ref.read(sharedPreferencesProvider).setString(_defaultSplitKey(tripId), jsonEncode(value.toJson()));
  }

  /// Live preview of what each person will owe (entry currency).
  Map<String, double> preview() => previewShares(toInput());

  /// The amount as the form will evaluate it (math expressions included), or null.
  double? get evaluatedAmount {
    final v = resolveAmountText(state.amount);
    return v.isNaN ? null : v;
  }

  /// True when the amount text is an expression rather than a plain number.
  bool get amountIsExpression => state.amount.trim().isNotEmpty && evaluateMathExpression(state.amount) != null && double.tryParse(state.amount.trim()) == null;
}

/// Currencies the quick parser may switch to (the web's `POPULAR_CURRENCIES`).
const defaultRateCurrencies = ['USD', 'INR', 'EUR', 'GBP', 'AED', 'THB', 'JPY', 'SGD', 'AUD', 'CAD', 'CHF', 'MYR', 'VND', 'IDR'];

/// New-expense ids; overridable so tests (and staged receipt names) are predictable.
final expenseIdProvider = Provider<String Function()>((ref) => () => _uuid.v4());
const _uuid = Uuid();

final expenseFormProvider = NotifierProvider.autoDispose.family<ExpenseFormController, ExpenseFormState, ExpenseFormArgs>(ExpenseFormController.new);
