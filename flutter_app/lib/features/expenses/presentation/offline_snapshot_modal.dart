import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/auth_state.dart';
import '../../../core/clock.dart';
import '../../../core/platform/haptics.dart';
import '../../../core/platform/share_service.dart';
import '../../../data/providers.dart';
import '../../../domain/logic/expense_form_logic.dart';
import '../../../domain/logic/offline_snapshot_service.dart';
import '../../../shared/theme/app_icons.dart';
import '../../../shared/theme/app_tokens.dart';
import '../../../shared/widgets/app_button.dart';
import '../../../shared/widgets/app_text_field.dart';
import '../../trip_details/application/trip_nav.dart';
import '../application/expenses_providers.dart';
import 'trip_tools_sheet.dart';

/// Offline Snapshot (.triptracker) Modal for full offline backups and device transfers.
/// Parity with web `OfflineSnapshotModal.tsx`.
class OfflineSnapshotModal extends ConsumerStatefulWidget {
  final String tripId;

  const OfflineSnapshotModal({required this.tripId, super.key});

  static Future<void> show(BuildContext context, {required String tripId}) {
    return showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => OfflineSnapshotModal(tripId: tripId),
    );
  }

  @override
  ConsumerState<OfflineSnapshotModal> createState() => _OfflineSnapshotModalState();
}

class _OfflineSnapshotModalState extends ConsumerState<OfflineSnapshotModal> {
  final _pasteController = TextEditingController();
  SnapshotValidationResult? _previewResult;
  String? _errorMessage;
  String? _successMessage;
  bool _isProcessing = false;

  @override
  void dispose() {
    _pasteController.dispose();
    super.dispose();
  }

  Future<void> _handleExport() async {
    final trip = ref.read(tripProvider(widget.tripId)).value;
    if (trip == null) return;

    final members = ref.read(tripMembersProvider(widget.tripId)).value ?? const [];
    final expenses = ref.read(tripExpensesProvider(widget.tripId)).value ?? const [];
    final categories = ref.read(tripCategoriesProvider(widget.tripId));

    unawaited(AppHaptics.selection());
    final bundleJson = exportOfflineSnapshot(
      trip: trip,
      members: members,
      expenses: expenses,
      categories: categories,
    );

    final filename = getSnapshotFilename(trip.name);
    await ref.read(shareServiceProvider).share(bundleJson, subject: filename);
    unawaited(AppHaptics.success());
    if (mounted) {
      setState(() => _successMessage = 'Snapshot exported: $filename');
    }
  }

  Future<void> _handlePickFile() async {
    unawaited(AppHaptics.selection());
    setState(() {
      _errorMessage = null;
      _successMessage = null;
    });

    try {
      final picker = ref.read(textFilePickerProvider);
      final content = await picker(extensions: ['triptracker', 'json']);
      if (content == null || content.trim().isEmpty) return;

      _processSnapshotText(content);
    } catch (_) {
      setState(() => _errorMessage = 'Failed to read selected file.');
    }
  }

  void _handleParsePastedText() {
    final text = _pasteController.text.trim();
    if (text.isEmpty) {
      setState(() => _errorMessage = 'Please paste a snapshot JSON to parse.');
      return;
    }
    _processSnapshotText(text);
  }

  void _processSnapshotText(String jsonString) {
    final result = validateOfflineSnapshot(jsonString);
    if (!result.valid) {
      unawaited(AppHaptics.warning());
      setState(() {
        _errorMessage = result.error ?? 'Invalid snapshot file.';
        _previewResult = null;
      });
      return;
    }

    unawaited(AppHaptics.success());
    setState(() {
      _previewResult = result;
      _errorMessage = null;
      _successMessage = null;
    });
  }

  Future<void> _handleConfirmImport() async {
    final preview = _previewResult;
    if (preview == null || preview.sanitizedData == null) return;

    final trip = ref.read(tripProvider(widget.tripId)).value;
    final mine = ref.read(myMemberIdProvider(widget.tripId));
    final members = ref.read(visibleMembersProvider(widget.tripId));
    if (trip == null || mine == null) return;

    setState(() => _isProcessing = true);
    int importedCount = 0;

    final expenses = preview.sanitizedData!['expenses'];
    if (expenses is List) {
      for (final row in expenses) {
        if (row is! Map) continue;
        final amount = (row['amount'] as num?)?.toDouble() ?? 0.0;
        final title = (row['title'] as String?)?.trim() ?? '';
        if (amount <= 0 || title.isEmpty || title.startsWith('Settlement:')) continue;

        final res = await ref.read(expenseRepositoryProvider).submit(
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
        if (res.isOk) importedCount++;
      }
    }

    if (!mounted) return;
    unawaited(AppHaptics.success());
    setState(() {
      _isProcessing = false;
      _previewResult = null;
      _pasteController.clear();
      _successMessage = 'Successfully imported $importedCount expenses from snapshot!';
    });
  }

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final preview = _previewResult;

    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 32),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: tokens.primaryAccent.withValues(alpha: 0.12),
                  shape: BoxShape.circle,
                ),
                child: Icon(AppIcons.sync, size: 20, color: tokens.primaryAccent),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Offline Snapshot (.triptracker)',
                      style: TextStyle(
                        fontSize: 17,
                        fontWeight: FontWeight.w700,
                        color: tokens.textPrimary,
                      ),
                    ),
                    Text(
                      'Export & import offline .triptracker files',
                      style: TextStyle(fontSize: 12, color: tokens.textSecondary),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          if (_errorMessage != null) ...[
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: tokens.colorDanger.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: tokens.colorDanger.withValues(alpha: 0.3)),
              ),
              child: Row(
                children: [
                  Icon(AppIcons.alert, size: 16, color: tokens.colorDanger),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      _errorMessage!,
                      style: TextStyle(fontSize: 12.5, color: tokens.colorDanger),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
          ],
          if (_successMessage != null) ...[
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: tokens.colorSuccess.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: tokens.colorSuccess.withValues(alpha: 0.3)),
              ),
              child: Row(
                children: [
                  Icon(AppIcons.check, size: 16, color: tokens.colorSuccess),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      _successMessage!,
                      style: TextStyle(fontSize: 12.5, color: tokens.colorSuccess),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
          ],

          // Export section
          Text('EXPORT', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: tokens.textMuted)),
          const SizedBox(height: 6),
          AppButton(
            key: const Key('btn_export_snapshot'),
            label: 'Share / Download .triptracker',
            variant: AppButtonVariant.primary,
            icon: AppIcons.share,
            onPressed: _handleExport,
          ),
          const SizedBox(height: 20),

          // Import section
          Text('IMPORT', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: tokens.textMuted)),
          const SizedBox(height: 6),
          AppButton(
            key: const Key('btn_choose_snapshot_file'),
            label: 'Choose .triptracker / .json File',
            variant: AppButtonVariant.secondary,
            icon: AppIcons.search,
            onPressed: _handlePickFile,
          ),
          const SizedBox(height: 12),

          AppTextField(
            key: const Key('snapshot_paste_input'),
            controller: _pasteController,
            label: 'Or paste raw snapshot JSON',
            hintText: '{\n  "manifest": { ... },\n  "trips": [ ... ]\n}',
            maxLines: 3,
          ),
          const SizedBox(height: 8),
          AppButton(
            key: const Key('btn_parse_pasted_snapshot'),
            label: 'Inspect Pasted JSON',
            variant: AppButtonVariant.secondary,
            onPressed: _handleParsePastedText,
          ),

          if (preview != null) ...[
            const SizedBox(height: 16),
            Container(
              key: const Key('snapshot_preview_card'),
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: tokens.bgSurfaceHover,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: tokens.borderColor),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    preview.primaryTripName ?? 'Validated Trip',
                    style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: tokens.textPrimary),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '${preview.expenseCount} expenses · Total: ${preview.totalSpend.toStringAsFixed(2)}',
                    style: TextStyle(fontSize: 12, color: tokens.textSecondary),
                  ),
                  if (preview.manifest != null)
                    Padding(
                      padding: const EdgeInsets.only(top: 4),
                      child: Text(
                        'Format: ${preview.manifest!.type} · v${preview.manifest!.version}',
                        style: TextStyle(fontSize: 11, color: tokens.textMuted),
                      ),
                    ),
                  const SizedBox(height: 12),
                  AppButton(
                    key: const Key('btn_confirm_import_snapshot'),
                    label: 'Confirm Import (${preview.expenseCount} Expenses)',
                    variant: AppButtonVariant.primary,
                    icon: AppIcons.check,
                    isLoading: _isProcessing,
                    onPressed: _isProcessing ? null : _handleConfirmImport,
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}
