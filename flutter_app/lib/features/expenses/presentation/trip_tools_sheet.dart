import 'dart:convert';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/auth_state.dart';
import '../../../core/clock.dart';
import '../../../core/platform/share_service.dart';
import '../../../data/providers.dart';
import '../../../domain/logic/csv_export.dart';
import '../../../domain/logic/expense_form_logic.dart';
import '../../../domain/logic/imports_and_exports.dart';
import '../../../l10n/l10n_ext.dart';
import '../../../shared/theme/app_tokens.dart';
import '../../../shared/widgets/app_button.dart';
import '../../trip_details/application/trip_nav.dart';
import '../application/expenses_providers.dart';

typedef TextFilePicker = Future<String?> Function({required List<String> extensions});

final textFilePickerProvider = Provider<TextFilePicker>((ref) => _pick);

Future<String?> _pick({required List<String> extensions}) async {
  final files = await FilePicker.pickFiles(type: FileType.custom, allowedExtensions: extensions);
  if (files.isEmpty) return null;
  return utf8.decode(await files.first.readAsBytes());
}

class TripToolsSheet extends ConsumerStatefulWidget {
  const TripToolsSheet({required this.tripId, super.key});
  final String tripId;

  @override
  ConsumerState<TripToolsSheet> createState() => _TripToolsSheetState();
}

class _TripToolsSheetState extends ConsumerState<TripToolsSheet> {
  String? _message;
  bool _busy = false;

  Future<void> _exportCsv() async {
    final trip = ref.read(tripProvider(widget.tripId)).value;
    if (trip == null) return;
    final members = ref.read(tripMembersProvider(widget.tripId)).value ?? const [];
    final expenses = ref.read(tripExpensesProvider(widget.tripId)).value ?? const [];
    final csv = exportTripLedgerCsv(trip: trip, members: members, expenses: expenses, generatedAt: ref.read(nowProvider)());
    await ref.read(shareServiceProvider).share(csv, subject: trip.name);
  }

  Future<void> _exportJson() async {
    final trip = ref.read(tripProvider(widget.tripId)).value;
    if (trip == null) return;
    final members = ref.read(tripMembersProvider(widget.tripId)).value ?? const [];
    final expenses = ref.read(tripExpensesProvider(widget.tripId)).value ?? const [];
    final json = exportTripBackupJson(trip: trip, members: members, expenses: expenses);
    await ref.read(shareServiceProvider).share(json, subject: trip.name);
  }

  Future<void> _importJson() async {
    final l10n = context.l10n;
    final text = await ref.read(textFilePickerProvider)(extensions: ['json']);
    if (text == null || !mounted) return;
    final summary = summarizeBackup(text);
    if (!summary.valid) {
      setState(() => _message = summary.error);
      return;
    }
    setState(() => _busy = true);
    var n = 0;
    final trip = ref.read(tripProvider(widget.tripId)).value;
    final mine = ref.read(myMemberIdProvider(widget.tripId));
    final members = ref.read(visibleMembersProvider(widget.tripId));
    if (trip == null || mine == null) return;
    for (final row in summary.expenses) {
      final amount = (row['amount'] as num?)?.toDouble() ?? 0;
      final title = (row['title'] as String?)?.trim() ?? '';
      if (amount <= 0 || title.isEmpty || title.startsWith('Settlement:')) continue;
      final r = await ref.read(expenseRepositoryProvider).submit(
            ExpenseSubmission(
              title: title,
              amount: amount,
              currency: (row['currency'] as String?) ?? trip.baseCurrency,
              category: (row['category'] as String?) ?? 'cat-misc',
              date: (row['date'] as String?) ?? todayDateString(ref.read(nowProvider)()),
              paidBy: mine,
              splitMode: 'equal',
              splitMemberIds: [for (final m in members) m.id],
            ),
            tripId: widget.tripId,
            userId: ref.read(authStateProvider).userId ?? '',
          );
      if (r.isOk) n++;
    }
    if (!mounted) return;
    setState(() {
      _busy = false;
      _message = l10n.importDone(n);
    });
  }

  Future<void> _importSplitwise() async {
    final l10n = context.l10n;
    final text = await ref.read(textFilePickerProvider)(extensions: ['csv', 'txt']);
    if (text == null || !mounted) return;
    final parsed = parseSplitwiseCsv(text);
    if (parsed.rows.isEmpty) {
      setState(() => _message = parsed.errors.isEmpty ? l10n.importNone : parsed.errors.first);
      return;
    }
    final members = ref.read(visibleMembersProvider(widget.tripId));
    final byName = {for (final m in members) m.name.toLowerCase(): m.id};
    final mine = ref.read(myMemberIdProvider(widget.tripId));
    final trip = ref.read(tripProvider(widget.tripId)).value;
    if (trip == null || mine == null) return;
    setState(() => _busy = true);
    var n = 0;
    for (final row in parsed.rows) {
      if (row.isPayment || row.cost <= 0) continue;
      String? payer;
      var best = 0.0;
      for (final e in row.nets.entries) {
        if (e.value > best) {
          best = e.value;
          payer = byName[e.key.toLowerCase()];
        }
      }
      final r = await ref.read(expenseRepositoryProvider).submit(
            ExpenseSubmission(
              title: row.description,
              amount: row.cost,
              currency: row.currency.isEmpty ? trip.baseCurrency : row.currency,
              category: 'cat-misc',
              date: row.date,
              paidBy: payer ?? mine,
              splitMode: 'equal',
              splitMemberIds: [for (final m in members) m.id],
            ),
            tripId: widget.tripId,
            userId: ref.read(authStateProvider).userId ?? '',
          );
      if (r.isOk) n++;
    }
    if (!mounted) return;
    setState(() {
      _busy = false;
      _message = l10n.importDone(n);
    });
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final splitwise = ref.watch(flagProvider(('enableSplitwiseImport', widget.tripId))).value ?? false;
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Text(l10n.toolsTitle, style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 12),
        AppButton(key: const Key('export-csv'), label: l10n.toolsExportCsv, onPressed: _busy ? null : _exportCsv),
        const SizedBox(height: 8),
        AppButton(key: const Key('export-json'), label: l10n.toolsExportJson, variant: AppButtonVariant.secondary, onPressed: _busy ? null : _exportJson),
        const SizedBox(height: 8),
        AppButton(key: const Key('import-json'), label: l10n.toolsImportJson, variant: AppButtonVariant.secondary, onPressed: _busy ? null : _importJson),
        if (splitwise) ...[
          const SizedBox(height: 8),
          AppButton(key: const Key('import-splitwise'), label: l10n.toolsSplitwise, variant: AppButtonVariant.secondary, onPressed: _busy ? null : _importSplitwise),
        ],
        if (_message != null)
          Padding(padding: const EdgeInsets.only(top: 12), child: Text(_message!, key: const Key('tools-message'), style: TextStyle(color: context.tokens.textSecondary))),
      ]),
    );
  }
}
