import 'package:flutter/material.dart';

import '../../../../core/format/money.dart';
import '../../../../domain/logic/cross_trip_balances.dart';
import '../../../../l10n/l10n_ext.dart';
import '../../../../shared/theme/app_tokens.dart';
import '../../../../shared/theme/app_typography.dart';

/// Horizon Trips home greeting for the app bar: a small time-of-day line over the person's first name.
class HorizonGreeting extends StatelessWidget {
  const HorizonGreeting({super.key, required this.name, required this.now});
  final String name;
  final DateTime now;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final t = context.tokens;
    final hello = now.hour < 12
        ? l10n.horizonGreetingMorning
        : now.hour < 17
        ? l10n.horizonGreetingAfternoon
        : l10n.horizonGreetingEvening;
    final first = name.trim().split(RegExp(r'[\s@]')).first;
    return Column(
      key: const Key('horizon-greeting'),
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          hello,
          style: TextStyle(fontSize: 13, fontWeight: FontWeight.w500, color: t.textSecondary),
        ),
        if (first.isNotEmpty)
          Text(
            first,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              fontFamily: AppTypography.fontTitle,
              fontSize: 22,
              fontWeight: FontWeight.w800,
              color: t.textPrimary,
            ),
          ),
      ],
    );
  }
}

/// Horizon Trips home balance hero: "Across N trips", the net position in big mono digits, owed in green, owe in
/// red. More than one currency shows a count instead of blending them. Tapping opens All balances.
class HorizonBalanceHero extends StatelessWidget {
  const HorizonBalanceHero({super.key, required this.nets, required this.tripCount, required this.onTap});
  final List<CrossTripNet> nets;
  final int tripCount;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final t = context.tokens;
    final String amount;
    final String caption;
    final Color color;
    if (nets.isEmpty) {
      amount = l10n.horizonAllSquare;
      caption = '';
      color = Colors.white;
    } else if (nets.length > 1) {
      amount = l10n.horizonCurrencies(nets.length);
      caption = '';
      color = Colors.white;
    } else if (nets.first.net > 0) {
      amount = '+${formatMoney(context, nets.first.net, nets.first.currency)}';
      caption = l10n.horizonOwedToYou;
      color = t.owedOnDark;
    } else {
      amount = '−${formatMoney(context, -nets.first.net, nets.first.currency)}';
      caption = l10n.horizonYouOwe;
      color = t.oweOnDark;
    }
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Material(
        borderRadius: BorderRadius.circular(20),
        clipBehavior: Clip.antiAlias,
        color: t.heroMid,
        child: InkWell(
          key: const Key('horizon-balance-hero'),
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
                    width: 180,
                    height: 180,
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
                        l10n.horizonAcrossTrips(tripCount).toUpperCase(),
                        style: TextStyle(
                          fontFamily: AppTypography.fontMono,
                          fontSize: 11,
                          letterSpacing: 1.6,
                          fontWeight: FontWeight.w600,
                          color: t.mutedOnDark,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Wrap(
                        crossAxisAlignment: WrapCrossAlignment.end,
                        spacing: 8,
                        children: [
                          Text(
                            amount,
                            key: const Key('horizon-hero-amount'),
                            style: TextStyle(
                              fontFamily: AppTypography.fontMono,
                              fontSize: 32,
                              fontWeight: FontWeight.w700,
                              letterSpacing: -0.5,
                              color: color,
                            ),
                          ),
                          if (caption.isNotEmpty)
                            Padding(
                              padding: const EdgeInsets.only(bottom: 6),
                              child: Text(caption, style: TextStyle(fontSize: 13, color: t.mutedOnDark)),
                            ),
                        ],
                      ),
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

/// One Horizon quick action: a tinted rounded square with an icon, and a label under it.
class HorizonQuickAction {
  const HorizonQuickAction(this.key, this.tone, this.icon, this.label, this.onTap);
  final String key;
  final BentoTone tone;
  final IconData icon;
  final String label;
  final VoidCallback onTap;
}

/// Horizon Trips home quick actions: New trip, Join code, Quick add, Settle.
class HorizonQuickActions extends StatelessWidget {
  const HorizonQuickActions({super.key, required this.actions});
  final List<HorizonQuickAction> actions;

  @override
  Widget build(BuildContext context) {
    final t = context.tokens;
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        key: const Key('horizon-quick-actions'),
        children: [
          for (final a in actions)
            Expanded(
              child: Semantics(
                button: true,
                label: a.label,
                excludeSemantics: true,
                child: InkWell(
                  key: Key('horizon-action-${a.key}'),
                  borderRadius: BorderRadius.circular(16),
                  onTap: a.onTap,
                  child: Padding(
                    padding: const EdgeInsets.symmetric(vertical: 6),
                    child: Column(
                      children: [
                        Container(
                          width: 56,
                          height: 56,
                          decoration: BoxDecoration(color: t.tones[a.tone].bg, borderRadius: BorderRadius.circular(16)),
                          child: Icon(a.icon, size: 24, color: t.tones[a.tone].accent),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          a.label,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: t.textPrimary),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
