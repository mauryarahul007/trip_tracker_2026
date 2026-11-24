import 'package:flutter/material.dart';

import '../../../../shared/theme/app_tokens.dart';
import '../../../../shared/theme/app_typography.dart';

/// Horizon trip Balances hero (flag `enableHorizonUi`): "Your position" in the biggest type on a night-navy card,
/// green with a plus when owed, red with a minus when you owe, then You paid / Your share / Trip total.
/// Same numbers as the Calm boarding pass; only the layout changes.
class HorizonPositionHero extends StatelessWidget {
  const HorizonPositionHero({
    super.key,
    required this.eyebrow,
    required this.amount,
    required this.caption,
    required this.tone,
    required this.stats,
    this.onTap,
  });

  /// e.g. "YOUR POSITION" or "STILL TO SETTLE".
  final String eyebrow;
  final String amount;
  final String caption;

  /// > 0 owed (green), < 0 owe (red), 0 neutral (white).
  final int tone;

  /// Up to three (label, value) cells under the amount.
  final List<(String, String)> stats;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final t = context.tokens;
    final color = tone > 0 ? t.owedOnDark : (tone < 0 ? t.oweOnDark : Colors.white);
    return Padding(
      key: const Key('horizon-position'),
      padding: const EdgeInsets.only(bottom: 16),
      child: Material(
        color: t.heroMid,
        borderRadius: BorderRadius.circular(20),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
          child: Ink(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [t.heroDeep, t.heroMid],
              ),
            ),
            child: Stack(
              children: [
                Positioned(
                  right: -50,
                  top: -60,
                  child: Container(
                    width: 190,
                    height: 190,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      gradient: RadialGradient(
                        colors: [t.accentOrange.withValues(alpha: 0.4), t.accentOrange.withValues(alpha: 0)],
                      ),
                    ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(18, 16, 18, 18),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        eyebrow.toUpperCase(),
                        style: TextStyle(
                          fontFamily: AppTypography.fontMono,
                          fontSize: 11,
                          letterSpacing: 1.6,
                          fontWeight: FontWeight.w600,
                          color: t.mutedOnDark,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Wrap(
                        crossAxisAlignment: WrapCrossAlignment.end,
                        spacing: 8,
                        children: [
                          Text(
                            amount,
                            key: const Key('horizon-position-amount'),
                            style: TextStyle(
                              fontFamily: AppTypography.fontMono,
                              fontFeatures: AppTypography.tabularFigures,
                              fontSize: 38,
                              fontWeight: FontWeight.w700,
                              letterSpacing: -0.8,
                              color: color,
                            ),
                          ),
                          if (caption.isNotEmpty)
                            Padding(
                              padding: const EdgeInsets.only(bottom: 8),
                              child: Text(caption, style: TextStyle(fontSize: 13, color: t.mutedOnDark)),
                            ),
                        ],
                      ),
                      if (stats.isNotEmpty) ...[
                        const SizedBox(height: 14),
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            for (final (label, value) in stats)
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      label,
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: TextStyle(fontSize: 12, color: t.mutedOnDark),
                                    ),
                                    const SizedBox(height: 2),
                                    FittedBox(
                                      fit: BoxFit.scaleDown,
                                      alignment: Alignment.centerLeft,
                                      child: Text(
                                        value,
                                        style: const TextStyle(
                                          fontFamily: AppTypography.fontMono,
                                          fontFeatures: AppTypography.tabularFigures,
                                          fontSize: 15,
                                          fontWeight: FontWeight.w700,
                                          color: Colors.white,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                          ],
                        ),
                      ],
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
