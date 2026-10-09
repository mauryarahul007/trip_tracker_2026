import 'package:flutter/material.dart';

import '../theme/app_tokens.dart';
import '../theme/app_typography.dart';
import 'app_avatar.dart';
import 'app_button.dart';
import 'ticket_scallop_divider.dart';

/// A luggage-tag style settlement stub representing a peer-to-peer debt transfer.
///
/// Features route avatars (From ➔ To), a perforated tear notch, big readable amount,
/// airline baggage serial ID, and an amber Settle action button.
class LuggageStubTile extends StatelessWidget {
  const LuggageStubTile({
    required this.fromName,
    required this.toName,
    required this.fromLabel,
    required this.toLabel,
    required this.caption,
    required this.amountText,
    this.tone = BentoTone.mint,
    this.onSettle,
    this.settleLabel = 'Settle',
    this.settleKey,
    this.luggageTagId,
    super.key,
  });

  final String fromName;
  final String toName;
  final String fromLabel;
  final String toLabel;
  final String caption;
  final String amountText;
  final BentoTone tone;
  final VoidCallback? onSettle;
  final String settleLabel;
  final Key? settleKey;
  final String? luggageTagId;

  Widget _passengerBadge(BuildContext context, String label, String name, {required bool alignEnd}) {
    final tokens = context.tokens;
    final accent = tokens.tones[tone].accent;

    final info = Column(
      crossAxisAlignment: alignEnd ? CrossAxisAlignment.end : CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          label.toUpperCase(),
          style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, letterSpacing: 0.8, color: accent),
        ),
        const SizedBox(height: 2),
        Text(
          name,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: TextStyle(
            fontFamily: AppTypography.fontTitle,
            fontSize: 16,
            fontWeight: FontWeight.w800,
            color: tokens.textPrimary,
          ),
        ),
      ],
    );

    final avatar = AppAvatar(name: name, size: 34);

    return Row(
      mainAxisSize: MainAxisSize.min,
      mainAxisAlignment: alignEnd ? MainAxisAlignment.end : MainAxisAlignment.start,
      children: alignEnd
          ? [Flexible(child: info), const SizedBox(width: 8), avatar]
          : [avatar, const SizedBox(width: 8), Flexible(child: info)],
    );
  }

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final cardBg = tokens.bgSurface;
    final pageBg = tokens.bgPage;

    final tag = luggageTagId ?? 'CLAIM #${(fromName.hashCode ^ toName.hashCode).abs() % 9000 + 1000}';

    return Semantics(
      container: true,
      label: '$caption, $amountText',
      child: Container(
        decoration: BoxDecoration(
          color: cardBg,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: tokens.borderColor.withValues(alpha: 0.5), width: 1),
          boxShadow: [
            BoxShadow(color: Colors.black.withValues(alpha: 0.18), blurRadius: 10, offset: const Offset(0, 3)),
          ],
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Top Section: Tag ID & Passengers
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Flexible(
                        child: Row(
                          children: [
                            Icon(Icons.confirmation_number_outlined, size: 13, color: tokens.textSecondary),
                            const SizedBox(width: 5),
                            Flexible(
                              child: Text(
                                tag,
                                overflow: TextOverflow.ellipsis,
                                maxLines: 1,
                                style: TextStyle(
                                  fontFamily: 'monospace',
                                  fontSize: 10.5,
                                  fontWeight: FontWeight.w700,
                                  letterSpacing: 1.0,
                                  color: tokens.textSecondary,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: tokens.tones[tone].accent.withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          'SETTLEMENT',
                          style: TextStyle(
                            fontFamily: 'monospace',
                            fontSize: 9.5,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 0.8,
                            color: tokens.tones[tone].accent,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  // Transfer Passengers Route
                  Row(
                    children: [
                      Expanded(child: _passengerBadge(context, fromLabel, fromName, alignEnd: false)),
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 8),
                        child: Container(
                          padding: const EdgeInsets.all(6),
                          decoration: BoxDecoration(
                            color: tokens.tones[tone].accent.withValues(alpha: 0.15),
                            shape: BoxShape.circle,
                          ),
                          child: Icon(Icons.flight_takeoff_rounded, size: 16, color: tokens.tones[tone].accent),
                        ),
                      ),
                      Expanded(child: _passengerBadge(context, toLabel, toName, alignEnd: true)),
                    ],
                  ),
                ],
              ),
            ),

            // Perforated Divider
            TicketScallopDivider(
              notchRadius: 9,
              cardColor: cardBg,
              cutoutColor: pageBg,
              perforationColor: tokens.textPrimary.withValues(alpha: 0.18),
            ),

            // Bottom Stub: Caption, Amount & Amber Settle Button
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 10, 16, 12),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          caption,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: tokens.textSecondary),
                        ),
                        const SizedBox(height: 1),
                        Text(amountText, style: AppTypography.moneyDisplay(fontSize: 24, color: tokens.textPrimary)),
                      ],
                    ),
                  ),
                  if (onSettle != null)
                    ConstrainedBox(
                      constraints: const BoxConstraints(minWidth: 100, maxWidth: 130),
                      child: Container(
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(12),
                          boxShadow: [
                            BoxShadow(
                              color: const Color(0xFFF59E0B).withValues(alpha: 0.3),
                              blurRadius: 8,
                              offset: const Offset(0, 2),
                            ),
                          ],
                        ),
                        child: AppButton(key: settleKey, label: settleLabel, onPressed: onSettle),
                      ),
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
