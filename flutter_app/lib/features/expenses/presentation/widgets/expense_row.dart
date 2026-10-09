import 'package:flutter/material.dart';

import '../../../../core/format/money.dart';
import '../../../../domain/logic/category_color.dart';
import '../../../../domain/logic/currency.dart';
import '../../../../domain/logic/expense_list_logic.dart';
import '../../../../domain/models/category.dart';
import '../../../../domain/models/expense.dart';
import '../../../../domain/models/member.dart';
import '../../../../domain/models/trip.dart';
import '../../../../l10n/app_localizations.dart';
import '../../../../l10n/l10n_ext.dart';
import '../../../../shared/theme/app_tokens.dart';
import '../../../../shared/theme/app_typography.dart';
import '../../../../shared/widgets/app_avatar.dart';
import '../../../../shared/widgets/receipt_card.dart';
import 'settle_ticket.dart' show TicketBarcode;

/// One expense line, same information as the web row: category tile, title with
/// state badges, amount (tap the currency chip to flip foreign/base), payer ->
/// split avatars, "your share", and the "needs review" warning.
class ExpenseRow extends StatefulWidget {
  const ExpenseRow({
    required this.expense,
    required this.trip,
    required this.members,
    required this.categories,
    required this.myMemberId,
    required this.onTap,
    this.compact = false,
    this.colorRings = false,
    this.isDirty = false,
    this.isConflict = false,
    super.key,
  });

  final Expense expense;
  final Trip trip;
  final Map<String, Member> members;
  final List<Category> categories;
  final String? myMemberId;
  final VoidCallback onTap;
  final bool compact;
  final bool colorRings;
  final bool isDirty;
  final bool isConflict;

  @override
  State<ExpenseRow> createState() => _ExpenseRowState();
}

class _ExpenseRowState extends State<ExpenseRow> {
  bool _showForeign = false;

  Widget _badge(IconData icon, Color color, String label) => Tooltip(
    message: label,
    child: Semantics(
      label: label,
      child: Icon(icon, size: 14, color: color),
    ),
  );

  /// Boarding-receipt layout (non-compact): glow category icon, "Paid by X · Split with N", amount,
  /// then a perforated footer with the personal-share pill and a micro barcode.
  Widget _receipt(
    BuildContext context,
    ExpenseReview review,
    Color accent,
    Category? cat,
    double shownAmount,
    String shownCode,
    bool isForeign,
    bool showingForeign,
    double? myShare,
    List<String>? payers,
    Member? payer,
  ) {
    final l10n = context.l10n;
    final tokens = context.tokens;
    final e = widget.expense;
    final base = widget.trip.baseCurrency;
    final teal = tokens.primaryAccent;
    final iAmPayer = widget.myMemberId != null && payers == null && e.paidBy == widget.myMemberId;
    final getBack = iAmPayer && e.splitMemberIds.any((id) => id != widget.myMemberId)
        ? e.amount - (e.resolvedShares[widget.myMemberId] ?? 0)
        : null;
    final shareText = myShare != null ? l10n.rowYourShare(formatMoney(context, myShare, base)) : null;
    final backText = getBack != null && getBack > 0.01 ? l10n.rowGetBack(formatMoney(context, getBack, base)) : null;
    final pill = (shareText != null && backText != null) ? '$shareText · $backText' : (backText ?? shareText);
    final who = payers != null ? l10n.rowPayers(payers.length) : l10n.rowPaidBy(payer?.name ?? l10n.rowRemovedMember);
    final sub = e.splitMemberIds.length > 1 ? '$who · ${l10n.rowSplitWith(e.splitMemberIds.length)}' : who;
    final glow = review.needsReview ? tokens.colorWarning : accent;
    return Semantics(
      container: true,
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: widget.onTap,
          child: ReceiptCard(
            body: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  children: [
                    Container(
                      width: 42,
                      height: 42,
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        color: glow.withValues(alpha: 0.14),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: glow.withValues(alpha: 0.7), width: widget.colorRings ? 2 : 1.2),
                        boxShadow: [BoxShadow(color: glow.withValues(alpha: 0.35), blurRadius: 10)],
                      ),
                      child: Text(
                        cat?.icon?.isNotEmpty == true && !cat!.icon!.contains(':') ? cat.icon! : '🏷️',
                        style: const TextStyle(fontSize: 20),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Flexible(
                                child: Text(
                                  e.title,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: TextStyle(
                                    fontSize: 15,
                                    fontWeight: FontWeight.w700,
                                    color: tokens.textPrimary,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 5),
                              ..._badges(l10n, tokens, e),
                            ],
                          ),
                          const SizedBox(height: 2),
                          Text(
                            sub,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(fontSize: 12, color: tokens.textSecondary),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          formatMoney(context, shownAmount, shownCode),
                          key: const Key('row-amount'),
                          style: AppTypography.moneyDisplay(
                            fontSize: 17,
                            color: tokens.textPrimary,
                          ).copyWith(fontWeight: FontWeight.w800, letterSpacing: -0.3),
                        ),
                        if (isForeign) _currencyToggle(tokens, l10n, e, base, showingForeign),
                      ],
                    ),
                  ],
                ),
                if (review.needsReview) ...[
                  const SizedBox(height: 6),
                  Text(
                    review.message!,
                    key: const Key('row-review'),
                    style: TextStyle(fontSize: 12, color: tokens.colorWarning, height: 1.3),
                  ),
                ],
              ],
            ),
            footer: pill == null
                ? null
                : Row(
                    children: [
                      Expanded(
                        child: Text(
                          pill,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: teal),
                        ),
                      ),
                      if (backText == null) SizedBox(width: 72, child: TicketBarcode(seed: e.id, height: 18)),
                    ],
                  ),
          ),
        ),
      ),
    );
  }

  List<Widget> _badges(AppLocalizations l10n, AppTokens tokens, Expense e) => [
    if (e.receiptPath != null || e.receiptImage != null)
      _badge(Icons.photo_camera_outlined, tokens.textMuted, l10n.rowReceipt),
    if (e.disputedAt != null)
      _badge(
        Icons.flag_outlined,
        tokens.colorWarning,
        e.disputeNote?.isNotEmpty == true ? l10n.detailDisputedBy(e.disputeNote!) : l10n.rowDisputed,
      ),
    if (e.approvalStatus == 'pending_approval')
      _badge(Icons.schedule_rounded, tokens.colorWarning, l10n.rowPendingApprovalTip),
    if (widget.isConflict)
      _badge(Icons.error_outline_rounded, tokens.colorDanger, l10n.rowConflict)
    else if (widget.isDirty)
      _badge(Icons.sync_rounded, tokens.textMuted, l10n.rowSyncPending),
  ];

  Widget _currencyToggle(AppTokens tokens, AppLocalizations l10n, Expense e, String base, bool showingForeign) =>
      Padding(
        padding: const EdgeInsets.only(left: 4),
        child: Semantics(
          button: true,
          label: l10n.rowSwitchCurrency(base, e.currency),
          child: InkWell(
            key: const Key('row-currency-toggle'),
            borderRadius: BorderRadius.circular(8),
            onTap: () => setState(() => _showForeign = !_showForeign),
            child: Container(
              constraints: const BoxConstraints(minHeight: 28, minWidth: 28),
              alignment: Alignment.center,
              padding: const EdgeInsets.symmetric(horizontal: 6),
              decoration: BoxDecoration(
                color: showingForeign ? tokens.primaryAccent : Colors.transparent,
                border: Border.all(color: tokens.borderColor),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                showingForeign ? e.currency : '⇄ ${e.currency}',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  color: showingForeign ? Colors.white : tokens.textMuted,
                ),
              ),
            ),
          ),
        ),
      );

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final tokens = context.tokens;
    final e = widget.expense;
    final trip = widget.trip;
    final review = reviewExpense(trip, e);
    final cat = widget.categories.where((c) => c.id == e.category).firstOrNull;
    final accent = review.needsReview ? tokens.colorWarning : Color(categoryColorArgb(e.category));
    final base = trip.baseCurrency;
    final isForeign =
        e.currency.isNotEmpty && base.isNotEmpty && e.currency.trim().toUpperCase() != base.trim().toUpperCase();
    final showingForeign = isForeign && _showForeign;
    final shownAmount = showingForeign ? convertCurrency(e.amount, base, e.currency).convertedAmount : e.amount;
    final shownCode = showingForeign ? e.currency : base;
    final myShare = myShareToShow(e, widget.myMemberId);

    final payers = e.paidByShares != null && e.paidByShares!.length > 1 ? e.paidByShares!.keys.toList() : null;
    final payer = widget.members[e.paidBy];
    final split = e.splitMemberIds;
    final visibleSplit = split.take(4).toList();
    final overflow = split.length - visibleSplit.length;

    Widget avatar(String? id, {double size = 22}) {
      final m = id == null ? null : widget.members[id];
      return Opacity(
        opacity: m == null ? 0.45 : 1,
        child: AppAvatar(name: m?.name ?? '?', size: size),
      );
    }

    if (!widget.compact) {
      return _receipt(
        context,
        review,
        accent,
        cat,
        shownAmount,
        shownCode,
        isForeign,
        showingForeign,
        myShare,
        payers,
        payer,
      );
    }

    final vPad = widget.compact ? 7.0 : 12.0;

    return Semantics(
      container: true,
      child: Material(
        color: review.needsReview ? tokens.colorWarning.withValues(alpha: 0.07) : Colors.transparent,
        child: InkWell(
          onTap: widget.onTap,
          child: Container(
            constraints: BoxConstraints(minHeight: widget.compact ? 48 : 64),
            padding: EdgeInsets.fromLTRB(12, vPad, 14, vPad),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  children: [
                    Container(
                      width: widget.compact ? 28 : 42,
                      height: widget.compact ? 28 : 42,
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        color: accent.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(widget.compact ? 10 : 14),
                        border: widget.colorRings ? Border.all(color: accent, width: 2) : null,
                      ),
                      child: Text(
                        cat?.icon?.isNotEmpty == true && !cat!.icon!.contains(':') ? cat.icon! : '🏷️',
                        style: TextStyle(fontSize: widget.compact ? 13 : 20),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Row(
                        children: [
                          Flexible(
                            child: Text(
                              e.title,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: tokens.textPrimary),
                            ),
                          ),
                          const SizedBox(width: 5),
                          if (e.receiptPath != null || e.receiptImage != null)
                            _badge(Icons.photo_camera_outlined, tokens.textMuted, l10n.rowReceipt),
                          if (e.disputedAt != null)
                            _badge(
                              Icons.flag_outlined,
                              tokens.colorWarning,
                              e.disputeNote?.isNotEmpty == true
                                  ? l10n.detailDisputedBy(e.disputeNote!)
                                  : l10n.rowDisputed,
                            ),
                          if (e.approvalStatus == 'pending_approval')
                            _badge(Icons.schedule_rounded, tokens.colorWarning, l10n.rowPendingApprovalTip),
                          if (widget.isConflict)
                            _badge(Icons.error_outline_rounded, tokens.colorDanger, l10n.rowConflict)
                          else if (widget.isDirty)
                            _badge(Icons.sync_rounded, tokens.textMuted, l10n.rowSyncPending),
                        ],
                      ),
                    ),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              formatMoney(context, shownAmount, shownCode),
                              key: const Key('row-amount'),
                              style: AppTypography.moneyDisplay(
                                fontSize: 16,
                                color: tokens.textPrimary,
                              ).copyWith(fontWeight: FontWeight.w700, letterSpacing: -0.3),
                            ),
                            if (isForeign)
                              Padding(
                                padding: const EdgeInsets.only(left: 4),
                                child: Semantics(
                                  button: true,
                                  label: l10n.rowSwitchCurrency(base, e.currency),
                                  child: InkWell(
                                    key: const Key('row-currency-toggle'),
                                    borderRadius: BorderRadius.circular(8),
                                    onTap: () => setState(() => _showForeign = !_showForeign),
                                    child: Container(
                                      constraints: const BoxConstraints(minHeight: 28, minWidth: 28),
                                      alignment: Alignment.center,
                                      padding: const EdgeInsets.symmetric(horizontal: 6),
                                      decoration: BoxDecoration(
                                        color: showingForeign ? tokens.primaryAccent : Colors.transparent,
                                        border: Border.all(color: tokens.borderColor),
                                        borderRadius: BorderRadius.circular(8),
                                      ),
                                      child: Text(
                                        showingForeign ? e.currency : '⇄ ${e.currency}',
                                        style: TextStyle(
                                          fontSize: 11,
                                          fontWeight: FontWeight.w700,
                                          color: showingForeign ? Colors.white : tokens.textMuted,
                                        ),
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                          ],
                        ),
                        if (myShare != null)
                          Text(
                            l10n.rowYourShare(formatMoney(context, myShare, base)),
                            style: TextStyle(fontSize: 11, color: tokens.textMuted),
                          ),
                      ],
                    ),
                  ],
                ),
                if (!widget.compact) ...[
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      if (payers != null) ...[
                        for (var i = 0; i < payers.take(2).length; i++)
                          Padding(
                            padding: EdgeInsets.only(left: i == 0 ? 0 : 0),
                            child: avatar(payers[i]),
                          ),
                        const SizedBox(width: 5),
                        Text(
                          l10n.rowPayers(payers.length),
                          style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: tokens.textSecondary),
                        ),
                      ] else
                        Tooltip(message: l10n.rowPaidBy(payer?.name ?? l10n.rowRemovedMember), child: avatar(e.paidBy)),
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 6),
                        child: Text('→', style: TextStyle(fontSize: 12, color: tokens.textMuted)),
                      ),
                      for (final id in visibleSplit)
                        Padding(padding: const EdgeInsets.only(right: 2), child: avatar(id)),
                      if (overflow > 0) Text('+$overflow', style: TextStyle(fontSize: 11, color: tokens.textMuted)),
                    ],
                  ),
                ],
                if (review.needsReview) ...[
                  const SizedBox(height: 6),
                  Text(
                    review.message!,
                    key: const Key('row-review'),
                    style: TextStyle(fontSize: 12, color: tokens.colorWarning, height: 1.3),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}
