import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/format/money.dart';
import '../../../../data/providers.dart' show flagProvider;
import '../../application/reminder_log.dart';
import '../../../../domain/logic/settlement.dart';
import '../../../../domain/models/member.dart';
import '../../../../l10n/l10n_ext.dart';
import '../../../../shared/theme/app_tokens.dart';
import '../../../../shared/theme/app_typography.dart';
import '../../../../shared/widgets/app_avatar.dart';

/// Payments to me first, then mine, then everyone else's: the order the Horizon settle plan and sheet read in.
List<Transfer> horizonSettleOrder(List<Transfer> transfers, String? me) {
  int rank(Transfer t) => me != null && t.toMemberId == me
      ? 0
      : me != null && t.fromMemberId == me
      ? 1
      : 2;
  return [...transfers]..sort((a, b) => rank(a).compareTo(rank(b)));
}

/// "UPI ready" when the person being paid has a UPI id saved, so the payment can go straight to a UPI app.
bool horizonUpiReady(Transfer t, Map<String, Member> members) => (members[t.toMemberId]?.upiId ?? '').isNotEmpty;

/// Horizon (flag `enableHorizonUi`) Settle up sheet body: "N payments clear the whole trip", then one card per
/// payment. Payments that involve me get Remind (money coming to me) and Mark paid; the rest are listed dimmed
/// and open the same record sheet on tap.
class HorizonSettleList extends ConsumerWidget {
  const HorizonSettleList({
    required this.transfers,
    required this.members,
    required this.me,
    required this.currency,
    required this.onMarkPaid,
    required this.onRemind,
    super.key,
  });

  final List<Transfer> transfers;
  final Map<String, Member> members;
  final String? me;
  final String currency;
  final ValueChanged<Transfer> onMarkPaid;

  /// Null hides Remind (e.g. no share service).
  final ValueChanged<Transfer>? onRemind;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = context.tokens;
    final l10n = context.l10n;
    final rows = horizonSettleOrder(transfers, me);
    final statusOn = ref.watch(flagProvider(('enableReminderStatus', null))).value ?? false;
    final log = statusOn ? ref.watch(reminderLogProvider) : const <String, int>{};
    String name(String id, String label) => id == me ? l10n.horizonYou : (members[id]?.name ?? label);
    return Padding(
      key: const Key('horizon-settle-list'),
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 20),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            l10n.horizonSettleClears(rows.length),
            style: TextStyle(fontFamily: AppTypography.fontBody, fontSize: 14, color: t.textSecondary),
          ),
          const SizedBox(height: 12),
          for (final (i, tr) in rows.indexed) ...[
            if (i > 0) const SizedBox(height: 10),
            _card(context, ref, i, tr, name, log),
          ],
        ],
      ),
    );
  }

  Widget _card(
    BuildContext context,
    WidgetRef ref,
    int i,
    Transfer tr,
    String Function(String, String) name,
    Map<String, int> log,
  ) {
    final payer = members[tr.fromMemberId]?.name ?? tr.fromLabel;
    final t = context.tokens;
    final l10n = context.l10n;
    final toMe = me != null && tr.toMemberId == me;
    final fromMe = me != null && tr.fromMemberId == me;
    final mine = toMe || fromMe;
    final title = toMe
        ? l10n.horizonPaysYou(name(tr.fromMemberId, tr.fromLabel))
        : fromMe
        ? l10n.horizonYouPayName(name(tr.toMemberId, tr.toLabel))
        : l10n.horizonPaysName(name(tr.fromMemberId, tr.fromLabel), name(tr.toMemberId, tr.toLabel));
    final upi = members[tr.toMemberId]?.upiId;
    final color = toMe
        ? t.colorSuccess
        : fromMe
        ? t.colorDanger
        : t.textSecondary;
    final card = Container(
      key: Key('settle-card-$i'),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: t.bgSurface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: t.borderColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              AppAvatar(name: members[tr.fromMemberId]?.name ?? tr.fromLabel, size: 34),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 4),
                child: Icon(Icons.arrow_forward_rounded, size: 16, color: t.textMuted),
              ),
              AppAvatar(name: members[tr.toMemberId]?.name ?? tr.toLabel, size: 34),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      key: Key('settle-card-title-$i'),
                      style: TextStyle(
                        fontFamily: AppTypography.fontBody,
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                        color: t.textPrimary,
                      ),
                    ),
                    if (toMe && remindedLabel(log, payer) != null)
                      Text(
                        remindedLabel(log, payer)!,
                        key: Key('settle-reminded-$i'),
                        style: TextStyle(fontFamily: AppTypography.fontBody, fontSize: 12, color: t.textMuted),
                      ),
                    if (mine && (upi ?? '').isNotEmpty)
                      Text(
                        upi!,
                        style: TextStyle(fontFamily: AppTypography.fontBody, fontSize: 12, color: t.textSecondary),
                      ),
                  ],
                ),
              ),
              Text(
                formatMoney(context, tr.amount, currency),
                style: TextStyle(
                  fontFamily: AppTypography.fontMono,
                  fontFeatures: AppTypography.tabularFigures,
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  color: color,
                ),
              ),
            ],
          ),
          if (mine) ...[
            const SizedBox(height: 12),
            Row(
              children: [
                if (toMe && onRemind != null) ...[
                  Expanded(
                    child: _button(
                      context,
                      Key('settle-remind-$i'),
                      Icons.notifications_none_rounded,
                      l10n.horizonRemind,
                      () {
                        onRemind!(tr);
                        ref.read(reminderLogProvider.notifier).record([payer]);
                      },
                      primary: false,
                    ),
                  ),
                  const SizedBox(width: 10),
                ],
                Expanded(
                  child: _button(
                    context,
                    Key('settle-paid-$i'),
                    fromMe ? Icons.currency_rupee_rounded : Icons.check_rounded,
                    fromMe ? l10n.horizonPayNow : l10n.horizonMarkPaid,
                    () => onMarkPaid(tr),
                    primary: true,
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
    if (mine) return card;
    return Opacity(
      opacity: 0.75,
      child: InkWell(borderRadius: BorderRadius.circular(16), onTap: () => onMarkPaid(tr), child: card),
    );
  }

  Widget _button(
    BuildContext context,
    Key key,
    IconData icon,
    String label,
    VoidCallback onTap, {
    required bool primary,
  }) {
    final t = context.tokens;
    final style = FilledButton.styleFrom(
      backgroundColor: primary ? t.primaryAccent : t.primaryAccentLight,
      foregroundColor: primary ? t.ctaFg : t.primaryAccent,
      minimumSize: const Size(0, 42),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      textStyle: const TextStyle(fontFamily: AppTypography.fontBody, fontSize: 14, fontWeight: FontWeight.w700),
    );
    return FilledButton.icon(key: key, style: style, onPressed: onTap, icon: Icon(icon, size: 16), label: Text(label));
  }
}
