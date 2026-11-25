import 'dart:async';

import '../../../../shared/widgets/cached_photo.dart';
import '../../../../shared/widgets/receipt_photo_viewer_dialog.dart';

import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
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
import '../../../../shared/theme/category_icons.dart';
import '../../../../shared/widgets/bento_tile.dart' show toneFor;
import '../../../../core/platform/external_launcher.dart';
import '../../../../shared/widgets/app_avatar.dart';
import '../../../../shared/widgets/app_button.dart';
import '../../../trip_details/application/trip_nav.dart';
import '../../../notifications/application/activity_focus.dart';
import '../../application/expenses_providers.dart';
import '../../application/money_providers.dart';
import 'expense_row.dart' show RefundChip;

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

  /// Horizon: what this expense means for me, as a tinted chip under the amount ("You owe ₹1,250 ↑").
  Widget? _horizonShareChip(BuildContext context, WidgetRef ref, Expense e, String base) {
    final me = ref.watch(myMemberIdProvider(tripId));
    if (me == null || !isActualExpense(e)) return null;
    final impact = rowImpact(e, me);
    if (!impact.involved || impact.net.abs() < 0.005) return null;
    final t = context.tokens;
    final l10n = context.l10n;
    final lent = impact.net > 0;
    final color = lent ? t.colorSuccess : t.colorDanger;
    final text = lent
        ? '${l10n.horizonRowYouLent(formatMoney(context, impact.net, base))} ↓'
        : '${l10n.horizonRowYouOwe(formatMoney(context, -impact.net, base))} ↑';
    return Padding(
      padding: const EdgeInsets.only(top: 6),
      child: Align(
        alignment: Alignment.centerLeft,
        child: Container(
          key: const Key('detail-share-chip'),
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
          decoration: BoxDecoration(color: color.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(999)),
          child: Text(
            text[0].toUpperCase() + text.substring(1),
            style: TextStyle(
              fontFamily: AppTypography.fontBody,
              fontSize: 12.5,
              fontWeight: FontWeight.w700,
              color: color,
            ),
          ),
        ),
      ),
    );
  }

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

  Widget _banner(Key key, String text, Color color) => Container(
    key: key,
    padding: const EdgeInsets.all(10),
    margin: const EdgeInsets.only(top: 10),
    decoration: BoxDecoration(color: color.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(10)),
    child: Text(
      text,
      style: TextStyle(color: color, fontWeight: FontWeight.w600),
    ),
  );

  Widget _moreRow(Key key, IconData icon, String label, VoidCallback onTap) => ListTile(
    key: key,
    contentPadding: EdgeInsets.zero,
    minTileHeight: 44,
    leading: Icon(icon, size: 20),
    title: Text(
      label,
      style: const TextStyle(fontFamily: AppTypography.fontBody, fontWeight: FontWeight.w600),
    ),
    onTap: onTap,
  );

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

    Future<void> recordRefund() async {
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
    }

    Future<void> flagDispute() async {
      final note = await _askNote(context);
      if (note == null || !context.mounted) return;
      await _run(
        context,
        () => repo.flagDispute(e.id, userId: uid!, note: note.isEmpty ? null : note, postChatCard: chatCards),
      );
    }

    void seeActivity() {
      ref.read(activityOnlyProvider.notifier).set(e.id);
      Navigator.pop(context);
      context.go('/trip/$tripId/activity');
    }

    if (tokens.horizon) {
      return _HorizonDetail(
        e: e,
        base: base,
        members: members,
        categoryName: cat?.name,
        payerNames: payerNames,
        shareChip: _horizonShareChip(context, ref, e, base),
        banners: [
          if (e.disputedAt != null)
            _banner(
              const Key('detail-dispute-banner'),
              (e.disputeNote ?? '').isEmpty ? l10n.detailDisputedNoNote : l10n.detailDisputedBy(e.disputeNote!),
              tokens.colorWarning,
            ),
          if (e.approvalStatus == 'pending_approval')
            _banner(const Key('detail-pending'), l10n.rowPendingApprovalTip, tokens.colorWarning),
          if (e.isSettlement && e.settlementConfirmedAt != null)
            _banner(const Key('detail-confirmed'), l10n.detailConfirmed, tokens.colorSuccess),
          if (refunds.isNotEmpty)
            _banner(
              const Key('detail-refunds'),
              'Refunded ${formatMoney(context, refunds.fold<double>(0, (s, r) => s + r.amount), e.currency)} to ${members[e.paidBy]?.name ?? l10n.rowRemovedMember}. Shares and balances already reflect it.',
              tokens.colorSuccess,
            ),
        ],
        primary: [
          if (canConfirm)
            AppButton(
              label: l10n.detailConfirm,
              isFullWidth: true,
              onPressed: () => _run(context, () => repo.confirmSettlement(e.id, userId: uid)),
            ),
          if (canApprove)
            AppButton(
              label: l10n.detailApprove,
              isFullWidth: true,
              onPressed: () => _run(context, () => repo.approve(e.id, userId: uid)),
            ),
        ],
        details: [
          kv(l10n.detailDate, e.date),
          kv(l10n.detailCategory, cat?.name ?? e.category),
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
        more: [
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
          if (_flag(ref, 'enableTripActivityLog', tripId))
            _moreRow(const Key('detail-see-activity'), Icons.history_rounded, 'See in Activity', seeActivity),
          if (refundsOn && canManage && !locked && refundable > 0.005)
            _moreRow(const Key('detail-refund'), Icons.undo_rounded, 'Record refund', recordRefund),
          if (disputes && uid != null && !isRefund(e))
            e.disputedAt == null
                ? _moreRow(const Key('detail-flag'), Icons.flag_outlined, l10n.detailFlag, flagDispute)
                : _moreRow(
                    const Key('detail-resolve'),
                    Icons.check_circle_outline_rounded,
                    l10n.detailResolve,
                    () => _run(context, () => repo.resolveDispute(e.id, userId: uid, postChatCard: chatCards)),
                  ),
        ],
        canEdit: canManage && !locked,
        canDelete: canManage,
        onEdit: onEdit,
        onDelete: onDelete,
      );
    }

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
                    if (isRefund(e)) const Padding(padding: EdgeInsets.only(top: 4), child: RefundChip()),
                    Text(
                      isRefund(e) ? '−${formatMoney(context, e.amount, base)}' : formatMoney(context, e.amount, base),
                      key: const Key('detail-amount'),
                      style: TextStyle(
                        fontFeatures: AppTypography.tabularFigures,
                        fontFamily: AppTypography.fontTitle,
                        fontSize: 32,
                        fontWeight: FontWeight.w800,
                        letterSpacing: -0.8,
                        color: isRefund(e) ? tokens.colorSuccess : tokens.textPrimary,
                      ),
                    ),
                    if (tokens.horizon) ?_horizonShareChip(context, ref, e, base),
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
                    style: TextStyle(
                      fontFeatures: AppTypography.tabularFigures,
                      color: tokens.textPrimary,
                      fontWeight: FontWeight.w600,
                    ),
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
          if (_flag(ref, 'enableTripActivityLog', tripId)) ...[
            AppButton(
              key: const Key('detail-see-activity'),
              label: 'See in Activity',
              variant: AppButtonVariant.secondary,
              isFullWidth: true,
              onPressed: seeActivity,
            ),
            const SizedBox(height: 8),
          ],
          if (refundsOn && canManage && !locked && refundable > 0.005) ...[
            AppButton(
              key: const Key('detail-refund'),
              label: 'Record refund',
              variant: AppButtonVariant.secondary,
              isFullWidth: true,
              onPressed: recordRefund,
            ),
            const SizedBox(height: 8),
          ],
          if (disputes && uid != null && !isRefund(e))
            e.disputedAt == null
                ? AppButton(
                    label: l10n.detailFlag,
                    variant: AppButtonVariant.secondary,
                    isFullWidth: true,
                    onPressed: flagDispute,
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

/// Horizon ("Expense detail" mockup): icon, title and date/place; big amount with what it means for me; a card with
/// "Asha paid" and the split (tap to see each share); receipt and map tiles; Edit / Delete. Everything else
/// (count in totals, activity, refund, dispute, the details table) sits under "More".
class _HorizonDetail extends ConsumerStatefulWidget {
  const _HorizonDetail({
    required this.e,
    required this.base,
    required this.members,
    required this.categoryName,
    required this.payerNames,
    required this.shareChip,
    required this.banners,
    required this.primary,
    required this.details,
    required this.more,
    required this.canEdit,
    required this.canDelete,
    required this.onEdit,
    required this.onDelete,
  });

  final Expense e;
  final String base;
  final Map<String, Member> members;
  final String? categoryName;
  final String payerNames;
  final Widget? shareChip;
  final List<Widget> banners;
  final List<Widget> primary;
  final List<Widget> details;
  final List<Widget> more;
  final bool canEdit;
  final bool canDelete;
  final VoidCallback onEdit;
  final VoidCallback onDelete;

  @override
  ConsumerState<_HorizonDetail> createState() => _HorizonDetailState();
}

class _HorizonDetailState extends ConsumerState<_HorizonDetail> {
  bool _shares = false;
  bool _more = false;

  @override
  Widget build(BuildContext context) {
    final t = context.tokens;
    final l10n = context.l10n;
    final e = widget.e;
    final tone = t.tones[toneFor(e.category)];
    final icon = categoryVectorIcon(id: e.category, name: widget.categoryName) ?? Icons.sell_outlined;
    final place = e.location?.placeName;
    final sub = [e.date, if ((place ?? '').isNotEmpty) place!].join(' · ');
    final n = e.splitMemberIds.length;
    final equal = e.splitMode == 'equal' || e.splitMode == 'equalUnit';
    final each = n == 0 ? 0.0 : e.amount / n;
    final receipt = ref.watch(receiptPreviewProvider((e.id, e.receiptPath))).value;
    final loc = e.location;
    final hasMap = loc != null && (loc.lat != 0 || loc.lng != 0);
    final money = TextStyle(
      fontFamily: AppTypography.fontMono,
      fontFeatures: AppTypography.tabularFigures,
      fontWeight: FontWeight.w700,
      color: t.textPrimary,
    );
    Widget label(String text, {double size = 15, FontWeight w = FontWeight.w700, Color? color}) => Text(
      text,
      overflow: TextOverflow.ellipsis,
      style: TextStyle(
        fontFamily: AppTypography.fontBody,
        fontSize: size,
        fontWeight: w,
        color: color ?? t.textPrimary,
      ),
    );

    Widget tile(Key key, BentoTint c, IconData i, VoidCallback onTap) => Expanded(
      child: Material(
        color: c.bg,
        borderRadius: BorderRadius.circular(16),
        child: InkWell(
          key: key,
          borderRadius: BorderRadius.circular(16),
          onTap: onTap,
          child: SizedBox(height: 64, child: Icon(i, color: c.accent)),
        ),
      ),
    );

    return SingleChildScrollView(
      key: const Key('horizon-detail'),
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(color: tone.bg, borderRadius: BorderRadius.circular(14)),
                child: Icon(icon, color: tone.accent),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      e.title,
                      key: const Key('detail-title'),
                      style: TextStyle(
                        fontFamily: AppTypography.fontTitle,
                        fontSize: 20,
                        fontWeight: FontWeight.w700,
                        color: t.textPrimary,
                      ),
                    ),
                    label(sub, size: 13, w: FontWeight.w400, color: t.textSecondary),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Expanded(
                child: FittedBox(
                  fit: BoxFit.scaleDown,
                  alignment: Alignment.centerLeft,
                  child: Text(
                    isRefund(e)
                        ? '−${formatMoney(context, e.amount, widget.base)}'
                        : formatMoney(context, e.amount, widget.base),
                    key: const Key('detail-amount'),
                    style: money.copyWith(
                      fontSize: 34,
                      fontWeight: FontWeight.w800,
                      color: isRefund(e) ? t.colorSuccess : t.textPrimary,
                    ),
                  ),
                ),
              ),
              ?widget.shareChip,
            ],
          ),
          if (isRefund(e)) const Padding(padding: EdgeInsets.only(top: 4), child: RefundChip()),
          if (e.currency != widget.base) label(e.currency, size: 12, w: FontWeight.w500, color: t.textMuted),
          ...widget.banners,
          const SizedBox(height: 14),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14),
            decoration: BoxDecoration(
              color: t.bgSurface,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: t.borderColor),
            ),
            child: Column(
              children: [
                Padding(
                  key: const Key('detail-paid-row'),
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  child: Row(
                    children: [
                      AppAvatar(name: widget.members[e.paidBy]?.name ?? '?', size: 30),
                      const SizedBox(width: 12),
                      Expanded(child: label(l10n.horizonNamePaid(widget.payerNames))),
                      Text(formatMoney(context, e.amount, widget.base), style: money.copyWith(fontSize: 15)),
                    ],
                  ),
                ),
                Divider(height: 1, color: t.borderColor),
                InkWell(
                  key: const Key('detail-split-row'),
                  onTap: () => setState(() => _shares = !_shares),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    child: Row(
                      children: [
                        SizedBox(
                          width: 30.0 + 18 * (e.splitMemberIds.take(4).length - 1).clamp(0, 3),
                          height: 30,
                          child: Stack(
                            children: [
                              for (final (i, id) in e.splitMemberIds.take(4).indexed)
                                Positioned(
                                  left: 18.0 * i,
                                  child: AppAvatar(name: widget.members[id]?.name ?? '?', size: 30),
                                ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              label(equal ? l10n.horizonSplitEqually : l10n.horizonSplitCustom),
                              label(
                                equal
                                    ? l10n.horizonPeopleEach(n, formatMoney(context, each, widget.base))
                                    : l10n.horizonPeople(n),
                                size: 13,
                                w: FontWeight.w400,
                                color: t.textSecondary,
                              ),
                            ],
                          ),
                        ),
                        Icon(_shares ? Icons.expand_less_rounded : Icons.expand_more_rounded, color: t.textMuted),
                      ],
                    ),
                  ),
                ),
                if (_shares)
                  for (final id in e.splitMemberIds)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 10),
                      child: Row(
                        children: [
                          const SizedBox(width: 42),
                          Expanded(
                            child: label(
                              widget.members[id]?.name ?? l10n.rowRemovedMember,
                              size: 14,
                              w: FontWeight.w500,
                              color: t.textSecondary,
                            ),
                          ),
                          Text(
                            formatMoney(context, e.resolvedShares[id] ?? 0, widget.base),
                            key: Key('share-$id'),
                            style: money.copyWith(fontSize: 14, fontWeight: FontWeight.w600),
                          ),
                        ],
                      ),
                    ),
              ],
            ),
          ),
          if (receipt != null || hasMap) ...[
            const SizedBox(height: 10),
            Row(
              children: [
                if (receipt != null)
                  tile(
                    const Key('detail-receipt-tile'),
                    t.tones.peach,
                    Icons.receipt_long_outlined,
                    () => showReceiptPhotoViewer(
                      context,
                      previewPath: receipt,
                      title: e.title,
                      subtitle: '${e.date} · ${formatMoney(context, e.amount, e.currency)}',
                    ),
                  ),
                if (receipt != null && hasMap) const SizedBox(width: 10),
                if (hasMap)
                  tile(
                    const Key('detail-map-tile'),
                    t.tones.mint,
                    Icons.location_on_outlined,
                    () => ref.read(externalLauncherProvider)(
                      Uri.parse(
                        'geo:${loc.lat},${loc.lng}?q=${loc.lat},${loc.lng}(${Uri.encodeComponent(place ?? e.title)})',
                      ),
                    ),
                  ),
              ],
            ),
          ],
          for (final b in widget.primary) ...[const SizedBox(height: 10), b],
          if (widget.canEdit || widget.canDelete) ...[
            const SizedBox(height: 10),
            Row(
              children: [
                if (widget.canEdit)
                  Expanded(
                    child: SizedBox(
                      height: 52,
                      child: OutlinedButton(
                        key: const Key('detail-edit'),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: t.textPrimary,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                          textStyle: const TextStyle(
                            fontFamily: AppTypography.fontBody,
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        onPressed: widget.onEdit,
                        child: Text(l10n.rowEdit),
                      ),
                    ),
                  ),
                if (widget.canEdit && widget.canDelete) const SizedBox(width: 10),
                if (widget.canDelete)
                  Expanded(
                    child: SizedBox(
                      height: 52,
                      child: FilledButton.icon(
                        key: const Key('detail-delete'),
                        style: FilledButton.styleFrom(
                          backgroundColor: t.colorDanger.withValues(alpha: 0.12),
                          foregroundColor: t.colorDanger,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                          textStyle: const TextStyle(
                            fontFamily: AppTypography.fontBody,
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        onPressed: widget.onDelete,
                        icon: const Icon(Icons.delete_outline_rounded, size: 18),
                        label: Text(l10n.rowDelete),
                      ),
                    ),
                  ),
              ],
            ),
          ],
          const SizedBox(height: 4),
          TextButton.icon(
            key: const Key('detail-more'),
            onPressed: () => setState(() => _more = !_more),
            icon: Icon(_more ? Icons.expand_less_rounded : Icons.expand_more_rounded, size: 18),
            label: Text(l10n.horizonMore),
          ),
          if (_more) ...[
            Container(
              padding: const EdgeInsets.fromLTRB(14, 8, 14, 8),
              decoration: BoxDecoration(
                color: t.bgSurface,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: t.borderColor),
              ),
              child: Column(children: widget.details),
            ),
            ...widget.more,
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
                      image: cachedPhotoSized(context, preview, logicalWidth: MediaQuery.sizeOf(context).width),
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
