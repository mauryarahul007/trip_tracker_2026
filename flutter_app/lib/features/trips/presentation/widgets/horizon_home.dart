import 'package:flutter/material.dart';

import '../../../../shared/theme/app_tokens.dart';
import '../../../../shared/theme/app_typography.dart';
import '../../../../shared/widgets/app_avatar.dart';

/// Section title on the Horizon Trips home ("Live now", "Upcoming", "Past trips"), with an optional action on the
/// right ("See all").
class HorizonSectionTitle extends StatelessWidget {
  const HorizonSectionTitle(this.title, {super.key, this.action, this.onAction});
  final String title;
  final String? action;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    final t = context.tokens;
    return Padding(
      padding: const EdgeInsets.fromLTRB(0, 8, 0, 8),
      child: Row(
        children: [
          Expanded(
            child: Text(
              title,
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: t.textPrimary),
            ),
          ),
          if (action != null)
            TextButton(
              key: Key('section-action-$title'),
              style: TextButton.styleFrom(minimumSize: const Size(48, 48)),
              onPressed: onAction,
              child: Text(
                action!,
                style: TextStyle(fontWeight: FontWeight.w700, color: t.primaryAccent),
              ),
            ),
        ],
      ),
    );
  }
}

/// The trip happening now on the Horizon Trips home: a coloured band with the name and "Day 4/7", then what was
/// spent (of the budget when one is set), your position, a progress bar and the crew.
class HorizonLiveTripCard extends StatelessWidget {
  const HorizonLiveTripCard({
    super.key,
    required this.tripId,
    required this.name,
    required this.dayLabel,
    required this.spentLabel,
    required this.progress,
    required this.tone,
    required this.onTap,
    this.onLongPress,
    this.moneyText,
    this.moneyColor,
    this.names = const [],
    this.footer,
  });

  final String tripId;
  final String name;
  final String dayLabel;

  /// "₹48,620 of ₹60,000" with a budget, "₹48,620 spent" without.
  final String spentLabel;

  /// 0..1: share of the budget used, or of the trip's days when there is no budget.
  final double progress;
  final BentoTone tone;
  final VoidCallback onTap;
  final VoidCallback? onLongPress;
  final String? moneyText;
  final Color? moneyColor;
  final List<String> names;
  final String? footer;

  @override
  Widget build(BuildContext context) {
    final t = context.tokens;
    final accent = t.tones[tone].accent;
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Material(
        color: t.bgSurface,
        clipBehavior: Clip.antiAlias,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
          side: BorderSide(color: t.borderColor),
        ),
        child: InkWell(
          key: Key('trip-row-$tripId'),
          onTap: onTap,
          onLongPress: onLongPress,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Container(
                key: const Key('horizon-live-trip'),
                padding: const EdgeInsets.fromLTRB(16, 26, 12, 14),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [Color.lerp(accent, t.heroDeep, 0.25)!, Color.lerp(accent, t.primaryAccent, 0.45)!],
                  ),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Expanded(
                      child: Text(
                        name,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontFamily: AppTypography.fontTitle,
                          fontSize: 19,
                          fontWeight: FontWeight.w800,
                          color: Colors.white,
                        ),
                      ),
                    ),
                    if (dayLabel.isNotEmpty)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.22),
                          borderRadius: BorderRadius.circular(99),
                        ),
                        child: Text(
                          dayLabel,
                          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Colors.white),
                        ),
                      ),
                  ],
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            spentLabel,
                            key: const Key('horizon-live-spent'),
                            style: TextStyle(
                              fontFamily: AppTypography.fontMono,
                              fontFeatures: AppTypography.tabularFigures,
                              fontSize: 13,
                              color: t.textSecondary,
                            ),
                          ),
                        ),
                        if (moneyText != null)
                          Text(
                            moneyText!,
                            key: const Key('trip-money'),
                            style: TextStyle(
                              fontFamily: AppTypography.fontMono,
                              fontFeatures: AppTypography.tabularFigures,
                              fontSize: 13,
                              fontWeight: FontWeight.w700,
                              color: moneyColor ?? t.textSecondary,
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(99),
                      child: LinearProgressIndicator(
                        key: const Key('trip-progress'),
                        value: progress.clamp(0.0, 1.0),
                        minHeight: 7,
                        backgroundColor: t.tones[BentoTone.sky].bg,
                        color: t.primaryAccent,
                      ),
                    ),
                    if (names.isNotEmpty || footer != null) ...[
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          if (names.isNotEmpty) HorizonAvatarRow(names: names),
                          const Spacer(),
                          if (footer != null) Text(footer!, style: TextStyle(fontSize: 12, color: t.textMuted)),
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
    );
  }
}

/// Up to five overlapping avatars and a "+N" for the rest.
class HorizonAvatarRow extends StatelessWidget {
  const HorizonAvatarRow({super.key, required this.names, this.size = 30});
  final List<String> names;
  final double size;

  @override
  Widget build(BuildContext context) {
    final t = context.tokens;
    final shown = names.take(5).toList();
    final extra = names.length - shown.length;
    final step = size * 0.72;
    final width = step * (shown.length - 1) + size + (extra > 0 ? step : 0);
    return SizedBox(
      key: const Key('trip-avatars'),
      width: width,
      height: size,
      child: Stack(
        children: [
          for (final (i, n) in shown.indexed)
            Positioned(
              left: i * step,
              child: Container(
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(color: t.bgSurface, width: 2),
                ),
                child: AppAvatar(name: n, size: size - 4),
              ),
            ),
          if (extra > 0)
            Positioned(
              left: shown.length * step,
              child: Container(
                width: size,
                height: size,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: t.bgPage,
                  border: Border.all(color: t.bgSurface, width: 2),
                ),
                child: Text(
                  '+$extra',
                  style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: t.textSecondary),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

/// A compact trip row on the Horizon Trips home (upcoming and past trips): tinted icon tile, name, one fact line,
/// the trip total on the right and a small status pill under it.
class HorizonTripListRow extends StatelessWidget {
  const HorizonTripListRow({
    super.key,
    required this.tripId,
    required this.name,
    required this.subtitle,
    required this.tone,
    required this.onTap,
    this.onLongPress,
    this.total,
    this.pill,
    this.pillColor,
  });

  final String tripId;
  final String name;
  final String subtitle;
  final BentoTone tone;
  final VoidCallback onTap;
  final VoidCallback? onLongPress;
  final String? total;
  final String? pill;
  final Color? pillColor;

  @override
  Widget build(BuildContext context) {
    final t = context.tokens;
    final tint = t.tones[tone];
    final pc = pillColor ?? t.colorSuccess;
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Material(
        color: t.bgSurface,
        clipBehavior: Clip.antiAlias,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(18),
          side: BorderSide(color: t.borderColor),
        ),
        child: InkWell(
          key: Key('trip-row-$tripId'),
          onTap: onTap,
          onLongPress: onLongPress,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
            child: Row(
              children: [
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(color: tint.bg, borderRadius: BorderRadius.circular(14)),
                  child: Icon(Icons.near_me_outlined, color: tint.accent, size: 22),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        name,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: t.textPrimary),
                      ),
                      if (subtitle.isNotEmpty)
                        Text(
                          subtitle,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(fontSize: 12, color: t.textSecondary),
                        ),
                    ],
                  ),
                ),
                if (total != null || pill != null) ...[
                  const SizedBox(width: 8),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      if (total != null)
                        Text(
                          total!,
                          style: TextStyle(
                            fontFamily: AppTypography.fontMono,
                            fontFeatures: AppTypography.tabularFigures,
                            fontSize: 14,
                            fontWeight: FontWeight.w700,
                            color: t.textPrimary,
                          ),
                        ),
                      if (pill != null)
                        Container(
                          key: const Key('trip-money'),
                          margin: const EdgeInsets.only(top: 3),
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(
                            color: pc.withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(99),
                          ),
                          child: Text(
                            pill!,
                            style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: pc),
                          ),
                        ),
                    ],
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
