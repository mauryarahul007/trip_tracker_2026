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
import '../../../domain/logic/flag_defaults.g.dart';
import '../../../domain/logic/ics_export_service.dart';
import '../../../domain/logic/imports_and_exports.dart';
import '../../../l10n/l10n_ext.dart';
import '../../../shared/theme/app_tokens.dart';
import '../../travel/presentation/achievement_badge_modal.dart';
import '../../travel/presentation/traveler_passport_modal.dart';
import '../../travel/presentation/trip_wrapped_modal.dart';
import '../../trip_details/application/trip_nav.dart';
import '../application/expenses_providers.dart';
import 'offline_snapshot_modal.dart';
import '../../../shared/widgets/app_surface.dart' show AppCard;
import '../../settings/presentation/settings_widgets.dart' show SettingsSection, SettingsTile;
import 'widgets/import_preview_sheet.dart';

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
    final csv = exportTripLedgerCsv(
      trip: trip,
      members: members,
      expenses: expenses,
      generatedAt: ref.read(nowProvider)(),
    );
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

  Future<void> _exportIcs() async {
    final trip = ref.read(tripProvider(widget.tripId)).value;
    if (trip == null) return;
    await shareTripIcs(trip: trip, shareService: ref.read(shareServiceProvider), now: ref.read(nowProvider)());
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
    final previewTrip = ref.read(tripProvider(widget.tripId)).value;
    if (previewTrip == null) return;
    final previewRows = <ImportPreviewRow>[];
    for (final row in summary.expenses) {
      final amount = (row['amount'] as num?)?.toDouble() ?? 0;
      final title = (row['title'] as String?)?.trim() ?? '';
      if (amount <= 0 || title.isEmpty || title.startsWith('Settlement:')) continue;
      previewRows.add(ImportPreviewRow(date: (row['date'] as String?) ?? '', title: title, amount: amount));
    }
    final confirmed = await showImportPreview(
      context,
      preview: ImportPreview(source: 'backup', rows: previewRows),
      currency: previewTrip.baseCurrency,
    );
    if (!confirmed || !mounted) return;
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
      final r = await ref
          .read(expenseRepositoryProvider)
          .submit(
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
    final usable = [
      for (final r in parsed.rows)
        if (!r.isPayment && r.cost > 0) r,
    ];
    final unmatched = {
      for (final r in usable)
        for (final name in r.nets.keys)
          if (!byName.containsKey(name.toLowerCase())) name,
    };
    final confirmed = await showImportPreview(
      context,
      preview: ImportPreview(
        source: 'Splitwise CSV',
        rows: [for (final r in usable) ImportPreviewRow(date: r.date, title: r.description, amount: r.cost)],
        note: unmatched.isEmpty
            ? null
            : 'Not in this trip, so counted as paid by you: ${unmatched.take(3).join(', ')}${unmatched.length > 3 ? '…' : ''}',
      ),
      currency: trip.baseCurrency,
    );
    if (!confirmed || !mounted) return;
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
      final r = await ref
          .read(expenseRepositoryProvider)
          .submit(
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
    ref.watch(tripProvider(widget.tripId));
    ref.watch(tripMembersProvider(widget.tripId));
    ref.watch(tripExpensesProvider(widget.tripId));
    final splitwise = ref.watch(flagProvider(('enableSplitwiseImport', widget.tripId))).value ?? false;
    final wrapped =
        ref.watch(flagProvider(('enableTripWrapped', widget.tripId))).value ??
        (defaultFeatureFlags['enableTripWrapped'] ?? true);
    final icsExport =
        ref.watch(flagProvider(('enableIcsExport', widget.tripId))).value ??
        (defaultFeatureFlags['enableIcsExport'] ?? true);
    final achievements =
        ref.watch(flagProvider(('enableAchievements', widget.tripId))).value ??
        (defaultFeatureFlags['enableAchievements'] ?? false);
    final passport =
        ref.watch(flagProvider(('enableTravelerPassport', widget.tripId))).value ??
        (defaultFeatureFlags['enableTravelerPassport'] ?? true);

    final tiles = <Widget>[
      if (wrapped)
        _ToolTile(
          key: const Key('trip-wrapped'),
          label: 'Trip Wrapped',
          caption: 'Your trip in 5 cards',
          icon: Icons.auto_awesome_rounded,
          gradient: AppTokens.duskGradient,
          onTap: _busy ? null : () => TripWrappedModal.show(context, tripId: widget.tripId),
        ),
      if (passport)
        _ToolTile(
          key: const Key('traveler-passport'),
          label: 'Traveler Passport',
          caption: 'Your stamps',
          icon: Icons.menu_book_rounded,
          gradient: AppTokens.nightSkyGradient,
          onTap: _busy ? null : () => TravelerPassportModal.show(context),
        ),
      if (achievements)
        _ToolTile(
          key: const Key('trip-achievements'),
          label: 'Achievements',
          caption: 'Badges and pins',
          icon: Icons.emoji_events_outlined,
          gradient: AppTokens.emberGradient,
          onTap: _busy ? null : () => AchievementBadgeModal.show(context, tripId: widget.tripId),
        ),
      if (icsExport)
        _ToolTile(
          key: const Key('export-ics'),
          label: 'Add to calendar',
          caption: '.ics file',
          icon: Icons.calendar_month_rounded,
          gradient: AppTokens.slateGradient,
          onTap: _busy ? null : _exportIcs,
        ),
    ];

    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 16),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(l10n.toolsTitle, style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 12),
          if (tiles.isNotEmpty)
            LayoutBuilder(
              builder: (context, c) {
                // 4 or 2 tiles -> 2 columns, 3 -> one row of 3, 1 -> full width.
                final cols = tiles.length == 3 ? 3 : (tiles.length == 1 ? 1 : 2);
                final w = (c.maxWidth - 10 * (cols - 1)) / cols;
                return Wrap(
                  spacing: 10,
                  runSpacing: 10,
                  children: [for (final t in tiles) SizedBox(width: w, child: t)],
                );
              },
            ),
          const SizedBox(height: 4),
          SettingsSection(
            title: 'Export and import',
            children: [
              SettingsTile(
                key: const Key('export-csv'),
                icon: Icons.download_rounded,
                iconColor: const Color(0xFF16A34A),
                title: l10n.toolsExportCsv,
                subtitle: 'Spreadsheet of all expenses',
                onTap: _busy ? null : _exportCsv,
              ),
              SettingsTile(
                key: const Key('export-json'),
                icon: Icons.inventory_2_outlined,
                iconColor: const Color(0xFF2F6BFF),
                title: l10n.toolsExportJson,
                subtitle: 'Full trip as JSON',
                onTap: _busy ? null : _exportJson,
              ),
              SettingsTile(
                key: const Key('offline-snapshot'),
                icon: Icons.cloud_off_rounded,
                iconColor: const Color(0xFF0EA5C6),
                title: 'Offline Snapshot (.triptracker)',
                subtitle: 'A copy for no-signal days',
                onTap: _busy ? null : () => OfflineSnapshotModal.show(context, tripId: widget.tripId),
              ),
              SettingsTile(
                key: const Key('import-json'),
                icon: Icons.upload_rounded,
                iconColor: const Color(0xFFE8890C),
                title: l10n.toolsImportJson,
                subtitle: 'Merges into this trip',
                onTap: _busy ? null : _importJson,
              ),
              if (splitwise)
                SettingsTile(
                  key: const Key('import-splitwise'),
                  icon: Icons.swap_horiz_rounded,
                  iconColor: const Color(0xFF8B3CF7),
                  title: l10n.toolsSplitwise,
                  subtitle: 'Bring an existing group across',
                  onTap: _busy ? null : _importSplitwise,
                ),
            ],
          ),
          if (_message != null)
            Padding(
              padding: const EdgeInsets.only(top: 12),
              child: AppCard(
                child: Row(
                  children: [
                    Icon(Icons.check_circle_outline_rounded, color: context.tokens.successColor),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        _message!,
                        key: const Key('tools-message'),
                        style: TextStyle(color: context.tokens.textSecondary),
                      ),
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}

/// Mini context-surface tile that opens one of the delight screens (board 10 #1).
class _ToolTile extends StatelessWidget {
  const _ToolTile({
    required this.label,
    required this.caption,
    required this.icon,
    required this.gradient,
    required this.onTap,
    super.key,
  });

  final String label;
  final String caption;
  final IconData icon;
  final Gradient gradient;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: Ink(
        decoration: BoxDecoration(gradient: gradient, borderRadius: BorderRadius.circular(context.tokens.radiusMd)),
        child: InkWell(
          borderRadius: BorderRadius.circular(context.tokens.radiusMd),
          onTap: onTap,
          child: Container(
            constraints: const BoxConstraints(minHeight: 112),
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(icon, color: Colors.white),
                const SizedBox(height: 24),
                Text(
                  label,
                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 14.5),
                ),
                Text(caption, style: const TextStyle(color: Colors.white70, fontSize: 11.5)),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
