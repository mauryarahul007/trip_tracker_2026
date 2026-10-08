import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../app/auth_state.dart';
import '../../../../core/format/money.dart';
import '../../../../data/providers.dart';
import '../../../../domain/logic/category_color.dart';
import '../../../../domain/logic/expense_list_logic.dart';
import '../../../../domain/models/expense.dart';
import '../../../../domain/models/expense_io.dart';
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
          _ReceiptPreview(expenseId: e.id, remotePath: e.receiptPath),
          if (e.currency != base) Text(e.currency, style: TextStyle(color: tokens.textMuted, fontSize: 12)),
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
                ],
              ),
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
          if (disputes && uid != null)
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
                if (!e.isSettlement)
                  Expanded(
                    child: AppButton(label: l10n.rowEdit, variant: AppButtonVariant.secondary, onPressed: onEdit),
                  ),
                if (!e.isSettlement) const SizedBox(width: 8),
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
  const _ReceiptPreview({required this.expenseId, required this.remotePath});
  final String expenseId;
  final String? remotePath;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final preview = ref.watch(receiptPreviewProvider((expenseId, remotePath))).value;
    if (preview == null) return const SizedBox.shrink();
    final net = preview.startsWith('http');
    return Padding(
      padding: const EdgeInsets.only(top: 12),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(12),
        child: net
            ? Image.network(
                preview,
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
      ),
    );
  }
}
