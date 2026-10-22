import 'dart:async';

import '../../../../shared/widgets/cached_photo.dart';
import '../../../../shared/widgets/receipt_photo_viewer_dialog.dart';

import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';

import '../../../../app/auth_state.dart';
import '../../../../core/platform/haptics.dart';
import '../../../../core/format/money.dart';
import '../../../../data/providers.dart';
import '../../../../domain/logic/category_color.dart';
import '../../../../domain/logic/expense_list_logic.dart';
import '../../../../domain/logic/refunds.dart';
import '../../../../domain/models/expense.dart';
import '../../../../domain/models/expense_io.dart';
import '../../../../domain/logic/summary_features.dart';
import '../../../../domain/logic/trip_utilities.dart' show formatRelativeTime;
import '../../../../domain/models/member.dart';
import '../../../../l10n/l10n_ext.dart';
import '../../../../shared/theme/app_tokens.dart';
import '../../../../shared/theme/app_typography.dart';
import '../../../../shared/widgets/app_avatar.dart';
import '../../../../shared/widgets/app_button.dart';
import '../../../trip_details/application/trip_nav.dart';
import '../../application/expenses_providers.dart';
import '../../application/money_providers.dart';

final expenseProvider = StreamProvider.family<Expense?, String>(
  (ref, id) => ref.watch(expenseRepositoryProvider).watchExpense(id),
);

bool _flag(WidgetRef ref, String key, String tripId) => ref.watch(flagProvider((key, tripId))).value ?? false;

/// Read-only breakdown of one expense plus the actions the web offers there
/// (edit, delete, dispute, approve, confirm settlement).
class ExpenseDetailSheet extends ConsumerWidget {
  const ExpenseDetailSheet({
    required this.tripId,
    required this.expenseId,
    required this.onEdit,
    required this.onDelete,
    super.key,
  });
  final String tripId;
  final String expenseId;
  final VoidCallback onEdit;
  final VoidCallback onDelete;

  Future<void> _run(BuildContext context, Future<void> Function() action) async {
    final l10n = context.l10n;
    final messenger = ScaffoldMessenger.of(context);
    try {
      await action();
    } on ExpenseActionException catch (e) {
      messenger.showSnackBar(
        SnackBar(content: Text(e.offline ? l10n.detailOfflineAction : l10n.detailActionFailed(e.message))),
      );
    }
  }

  Future<String?> _askNote(BuildContext context) {
    final l10n = context.l10n;
    final c = TextEditingController();
    return showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(l10n.detailDisputeTitle),
        content: TextField(
          controller: c,
          autofocus: true,
          maxLength: 200,
          decoration: InputDecoration(hintText: l10n.detailDisputeHint),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: Text(l10n.actionCancel)),
          TextButton(onPressed: () => Navigator.pop(ctx, c.text.trim()), child: Text(l10n.detailDisputeSend)),
        ],
      ),
    );
  }

  /// Amount returned to the payer, at most what is still refundable; null when cancelled.
  Future<double?> _askRefund(BuildContext context, double max, String payer) {
    final c = TextEditingController();
    return showDialog<double>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setState) {
          final v = double.tryParse(c.text.trim());
          final ok = v != null && v > 0 && v <= max + 0.001;
          return AlertDialog(
            title: const Text('Record refund'),
            content: TextField(
              key: const Key('refund-amount'),
              controller: c,
              autofocus: true,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              onChanged: (_) => setState(() {}),
              decoration: InputDecoration(
                labelText: 'Amount refunded to $payer',
                helperText: 'Up to ${max.toStringAsFixed(2)}. Shared back across the original split.',
              ),
            ),
            actions: [
              TextButton(onPressed: () => Navigator.pop(ctx), child: Text(context.l10n.actionCancel)),
              TextButton(
                key: const Key('refund-save'),
                onPressed: ok ? () => Navigator.pop(ctx, v) : null,
                child: const Text('Save'),
              ),
            ],
          );
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final tokens = context.tokens;
    final e = ref.watch(expenseProvider(expenseId)).value;
    final trip = ref.watch(tripProvider(tripId)).value;
    if (e == null || trip == null) {
      return const SizedBox(height: 120, child: Center(child: CircularProgressIndicator()));
    }

    final members = {for (final m in ref.watch(tripMembersProvider(tripId)).value ?? const <Member>[]) m.id: m};
    final categories = ref.watch(tripCategoriesProvider(tripId));
    final cat = categories.where((c) => c.id == e.category).firstOrNull;
    final uid = ref.watch(authStateProvider).userId;
    final isAdmin = ref.watch(isTripAdminProvider(tripId));
    final canManage = canManageExpense(e, isAdmin: isAdmin, userId: uid);
    final repo = ref.read(expenseRepositoryProvider);
    final locked = e.isSettlement || isRefund(e);
    final refundsOn = _flag(ref, 'enableExpenseRefunds', tripId);
    final allExpenses = ref.watch(tripExpensesProvider(tripId)).value ?? const <Expense>[];
    final refunds = refundsOn ? refundsFor(e.id, allExpenses) : const <Expense>[];
    final refundable = refundableRemaining(e, allExpenses);

    final disputes = _flag(ref, 'enableExpenseDisputes', tripId);
    final chatCards = _flag(ref, 'enableInChatEventCards', tripId) && _flag(ref, 'enableTripChat', tripId);
    final confirmOn = _flag(ref, 'enableSettlementConfirmation', tripId);
    final approvalOn = _flag(ref, 'enableExpenseApprovalThreshold', tripId);

    final recipientUserId = e.isSettlement && e.splitMemberIds.isNotEmpty
        ? members[e.splitMemberIds.first]?.linkedUserId
        : null;
    final canConfirm =
        confirmOn && e.isSettlement && e.settlementConfirmedAt == null && uid != null && recipientUserId == uid;
    final canApprove = approvalOn && e.approvalStatus == 'pending_approval' && uid != null && e.createdByUserId != uid;
    final base = trip.baseCurrency;

    final historyOn = _flag(ref, 'enableExpenseHistory', tripId);
    final history = expenseHistory(
      createdByUserId: e.createdByUserId,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
      members: [for (final m in members.values) (linkedUserId: m.linkedUserId, name: m.name)],
    );

    Widget kv(String k, String v) => Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 110,
            child: Text(k, style: TextStyle(color: tokens.textMuted, fontSize: 13)),
          ),
          Expanded(
            child: Text(v, style: TextStyle(color: tokens.textPrimary, fontSize: 14)),
          ),
        ],
      ),
    );

    final payerNames = e.paidByShares != null && e.paidByShares!.length > 1
        ? e.paidByShares!.entries
              .map((p) => '${members[p.key]?.name ?? l10n.rowRemovedMember} ${formatMoney(context, p.value, base)}')
              .join(', ')
        : members[e.paidBy]?.name ?? l10n.rowRemovedMember;

    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Container(
                width: 52,
                height: 52,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: Color(categoryColorArgb(e.category)).withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(18),
                ),
                child: Text(
                  cat?.icon?.isNotEmpty == true && !cat!.icon!.contains(':') ? cat.icon! : '🏷️',
                  style: const TextStyle(fontSize: 24),
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      e.title,
                      key: const Key('detail-title'),
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: tokens.textPrimary),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      formatMoney(context, e.amount, base),
                      key: const Key('detail-amount'),
                      style: TextStyle(
                        fontFamily: AppTypography.fontTitle,
                        fontSize: 32,
                        fontWeight: FontWeight.w800,
                        letterSpacing: -0.8,
                        color: tokens.textPrimary,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          _ReceiptPreview(
            expenseId: e.id,
            remotePath: e.receiptPath,
            title: e.title,
            subtitle: '${e.date} · ${formatMoney(context, e.amount, e.currency)}',
          ),
          if (e.currency != base) Text(e.currency, style: TextStyle(color: tokens.textMuted, fontSize: 12)),
          if (refunds.isNotEmpty)
            Container(
              key: const Key('detail-refunds'),
              padding: const EdgeInsets.all(10),
              margin: const EdgeInsets.only(top: 8),
              decoration: BoxDecoration(
                color: tokens.colorSuccess.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Refunded ${formatMoney(context, refunds.fold<double>(0, (s, r) => s + r.amount), e.currency)} to ${members[e.paidBy]?.name ?? l10n.rowRemovedMember}. Shares and balances already reflect it.',
                    style: TextStyle(color: tokens.textPrimary, fontWeight: FontWeight.w600),
                  ),
                  for (final r in refunds)
                    Text(
                      '${r.date}: ${formatMoney(context, r.amount, r.currency)}',
                      style: TextStyle(color: tokens.textMuted, fontSize: 13),
                    ),
                ],
              ),
            ),
          const SizedBox(height: 12),
          if (e.disputedAt != null)
            Container(
              key: const Key('detail-dispute-banner'),
              padding: const EdgeInsets.all(10),
              margin: const EdgeInsets.only(bottom: 10),
              decoration: BoxDecoration(
                color: tokens.colorWarning.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Text(
                (e.disputeNote ?? '').isEmpty ? l10n.detailDisputedNoNote : l10n.detailDisputedBy(e.disputeNote!),
                style: TextStyle(color: tokens.colorWarning),
              ),
            ),
          if (e.approvalStatus == 'pending_approval')
            Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: Text(l10n.rowPendingApprovalTip, style: TextStyle(color: tokens.colorWarning, fontSize: 13)),
            ),
          if (e.isSettlement && e.settlementConfirmedAt != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: Text(
                l10n.detailConfirmed,
                key: const Key('detail-confirmed'),
                style: TextStyle(color: tokens.colorSuccess),
              ),
            ),
          DecoratedBox(
            decoration: BoxDecoration(
              color: tokens.bgSurface,
              borderRadius: BorderRadius.circular(tokens.radiusMd),
              border: Border.all(color: tokens.borderColor.withValues(alpha: 0.7)),
            ),
            child: Padding(
              padding: const EdgeInsets.fromLTRB(14, 8, 14, 8),
              child: Column(
                children: [
                  kv(l10n.detailDate, e.date),
                  kv(
                    l10n.detailCategory,
                    cat == null
                        ? e.category
                        : '${cat.icon != null && !cat.icon!.contains(':') ? '${cat.icon} ' : ''}${cat.name}',
                  ),
                  kv(l10n.detailPaidBy, payerNames),
                  if (historyOn) ...[
                    kv(
                      l10n.historyAdded,
                      history.addedBy == null
                          ? formatRelativeTime(history.addedAt)
                          : l10n.historyAddedBy(history.addedBy!, formatRelativeTime(history.addedAt)),
                    ),
                    if (history.edited) kv(l10n.historyEdited, formatRelativeTime(history.editedAt)),
                  ],
                ],
              ),
            ),
          ),
          if (_flag(ref, 'enableExpenseExclusion', tripId) && canManage && !locked)
            Material(
              type: MaterialType.transparency,
              child: SwitchListTile(
                key: const Key('detail-count-switch'),
                contentPadding: EdgeInsets.zero,
                value: !e.excludeFromTotals,
                onChanged: (counted) {
                  unawaited(AppHaptics.selection());
                  unawaited(repo.update(e.copyWith(excludeFromTotals: !counted)));
                },
                title: Text(l10n.detailCountTitle),
                subtitle: Text(l10n.detailCountSub),
              ),
            ),
          const SizedBox(height: 16),
          Text(
            l10n.detailShares,
            style: TextStyle(
              fontFamily: AppTypography.fontMono,
              fontSize: 11,
              fontWeight: FontWeight.w600,
              letterSpacing: 1.1,
              color: tokens.textMuted,
            ),
          ),
          const SizedBox(height: 6),
          for (final id in e.splitMemberIds)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 4),
              child: Row(
                children: [
                  AppAvatar(name: members[id]?.name ?? '?', size: 28),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      members[id]?.name ?? l10n.rowRemovedMember,
                      style: TextStyle(color: tokens.textSecondary),
                    ),
                  ),
                  Text(
                    formatMoney(context, e.resolvedShares[id] ?? 0, base),
                    key: Key('share-$id'),
                    style: TextStyle(color: tokens.textPrimary, fontWeight: FontWeight.w600),
                  ),
                ],
              ),
            ),
          const SizedBox(height: 16),
          if (canConfirm) ...[
            AppButton(
              label: l10n.detailConfirm,
              isFullWidth: true,
              onPressed: () => _run(context, () => repo.confirmSettlement(e.id, userId: uid)),
            ),
            const SizedBox(height: 8),
          ],
          if (canApprove) ...[
            AppButton(
              label: l10n.detailApprove,
              isFullWidth: true,
              onPressed: () => _run(context, () => repo.approve(e.id, userId: uid)),
            ),
            const SizedBox(height: 8),
          ],
          if (refundsOn && canManage && !locked && refundable > 0.005) ...[
            AppButton(
              key: const Key('detail-refund'),
              label: 'Record refund',
              variant: AppButtonVariant.secondary,
              isFullWidth: true,
              onPressed: () async {
                final amount = await _askRefund(context, refundable, members[e.paidBy]?.name ?? l10n.rowRemovedMember);
                if (amount == null || !context.mounted) return;
                unawaited(AppHaptics.selection());
                await repo.add(
                  Expense(
                    id: const Uuid().v4(),
                    tripId: tripId,
                    title: 'Refund: ${e.title}',
                    amount: amount,
                    currency: e.currency,
                    category: e.category,
                    date: DateTime.now().toIso8601String().substring(0, 10),
                    paidBy: e.paidBy,
                    splitMode: 'exact',
                    splitMemberIds: [e.paidBy],
                    splitConfig: {e.paidBy: amount},
                    resolvedShares: {e.paidBy: amount},
                    refundOfExpenseId: e.id,
                    createdByUserId: uid,
                    createdAt: 0,
                    updatedAt: 0,
                  ),
                );
              },
            ),
            const SizedBox(height: 8),
          ],
          if (disputes && uid != null && !isRefund(e))
            e.disputedAt == null
                ? AppButton(
                    label: l10n.detailFlag,
                    variant: AppButtonVariant.secondary,
                    isFullWidth: true,
                    onPressed: () async {
                      final note = await _askNote(context);
                      if (note == null || !context.mounted) return;
                      await _run(
                        context,
                        () => repo.flagDispute(
                          e.id,
                          userId: uid,
                          note: note.isEmpty ? null : note,
                          postChatCard: chatCards,
                        ),
                      );
                    },
                  )
                : AppButton(
                    label: l10n.detailResolve,
                    variant: AppButtonVariant.secondary,
                    isFullWidth: true,
                    onPressed: () =>
                        _run(context, () => repo.resolveDispute(e.id, userId: uid, postChatCard: chatCards)),
                  ),
          if (canManage) ...[
            const SizedBox(height: 8),
            Row(
              children: [
                if (!locked)
                  Expanded(
                    child: AppButton(label: l10n.rowEdit, variant: AppButtonVariant.secondary, onPressed: onEdit),
                  ),
                if (!locked) const SizedBox(width: 8),
                Expanded(
                  child: AppButton(label: l10n.rowDelete, variant: AppButtonVariant.danger, onPressed: onDelete),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

class _ReceiptPreview extends ConsumerWidget {
  const _ReceiptPreview({required this.expenseId, required this.remotePath, this.title, this.subtitle});

  final String expenseId;
  final String? remotePath;
  final String? title;
  final String? subtitle;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final preview = ref.watch(receiptPreviewProvider((expenseId, remotePath))).value;
    if (preview == null) return const SizedBox.shrink();
    final net = preview.startsWith('http');
    return Padding(
      padding: const EdgeInsets.only(top: 12),
      child: InkWell(
        key: const Key('detail-receipt-tap'),
        borderRadius: BorderRadius.circular(12),
        onTap: () => showReceiptPhotoViewer(context, previewPath: preview, title: title, subtitle: subtitle),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(12),
          child: Stack(
            children: [
              net
                  ? Image(
                      image: CachedPhotoProvider(preview),
                      key: const Key('detail-receipt'),
                      height: 160,
                      width: double.infinity,
                      fit: BoxFit.cover,
                    )
                  : Image.file(
                      File(preview),
                      key: const Key('detail-receipt'),
                      height: 160,
                      width: double.infinity,
                      fit: BoxFit.cover,
                    ),
              Positioned(
                bottom: 8,
                right: 8,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(color: Colors.black54, borderRadius: BorderRadius.circular(16)),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.zoom_in_rounded, size: 14, color: Colors.white),
                      SizedBox(width: 4),
                      Text(
                        'Tap to view',
                        style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w600),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
