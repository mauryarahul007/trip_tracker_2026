import '../../../../shared/widgets/cached_photo.dart';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../domain/logic/trip_status.dart';
import '../../../../domain/logic/trip_utilities.dart' show formatDateRange;
import '../../../../domain/models/trip.dart';
import '../../../../l10n/l10n_ext.dart';
import '../../../../shared/theme/app_tokens.dart';
import '../../../../shared/theme/app_typography.dart';
import '../../../../shared/widgets/app_avatar.dart';
import '../../application/trips_providers.dart';
import 'trip_card.dart' show tripHeadline, tripTone;

String _subtitle(Trip trip) {
  final dest = (trip.destination ?? '').trim();
  final dates = trip.startDate.isNotEmpty ? formatDateRange(trip.startDate, trip.endDate) : '';
  return [dest, dates].where((p) => p.isNotEmpty).join(' · ');
}

/// Overlapping member avatars (decorative: the names are on the trip itself).
class _Avatars extends StatelessWidget {
  const _Avatars(this.names, {required this.size, required this.ring});
  final List<String> names;
  final double size;
  final Color ring;

  @override
  Widget build(BuildContext context) {
    if (names.isEmpty) return const SizedBox.shrink();
    final shown = names.take(4).toList();
    final step = size * 0.65;
    return ExcludeSemantics(
      child: Row(
        key: const Key('trip-avatars'),
        mainAxisSize: MainAxisSize.min,
        children: [
          SizedBox(
            height: size,
            width: size + step * (shown.length - 1),
            child: Stack(
              children: [
                for (final (i, n) in shown.indexed)
                  Positioned(
                    left: step * i,
                    child: DecoratedBox(
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        border: Border.all(color: ring, width: 2),
                      ),
                      child: AppAvatar(name: n, size: size),
                    ),
                  ),
              ],
            ),
          ),
          if (names.length > 4)
            Padding(
              padding: const EdgeInsets.only(left: 6),
              child: Text(
                '+${names.length - 4}',
                style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: context.tokens.textSecondary),
              ),
            ),
        ],
      ),
    );
  }
}

/// A compact trip row: cover thumbnail, name, place and dates, a status pill and your money position.
/// The colour says what state the trip is in (accent edge and progress while it is happening, muted when over).
class TripRow extends ConsumerWidget {
  const TripRow({
    required this.trip,
    required this.now,
    required this.onTap,
    this.onLongPress,
    this.avatarNames = const [],
    this.moneyText,
    this.moneyColor,
    this.pending = false,
    super.key,
  });

  final Trip trip;
  final DateTime now;
  final VoidCallback onTap;
  final VoidCallback? onLongPress;
  final List<String> avatarNames;
  final String? moneyText;
  final Color? moneyColor;

  /// Changes in this trip are still waiting to sync (flag `enablePendingDots`).
  final bool pending;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final t = context.tokens;
    final status = tripStatus(trip.startDate, trip.endDate, now);
    final headline = tripHeadline(context, status);
    final active = status.phase == TripPhase.active;
    final over = trip.archived || status.phase == TripPhase.ended;
    final cover = ref.watch(tripCoverProvider(tripCoverKey(trip))).value;
    final tone = t.tones[tripTone(trip.id)];
    final sub = _subtitle(trip);
    final progress = status.totalDays <= 0 ? 0.0 : (status.dayNumber / status.totalDays).clamp(0.0, 1.0);

    final thumb = ClipRRect(
      borderRadius: BorderRadius.circular(14),
      child: SizedBox(
        width: 64,
        height: 64,
        child: cover != null && cover.isNotEmpty
            ? Image(
                image: CachedPhotoProvider(cover),
                key: Key('trip-thumb-${trip.id}'),
                fit: BoxFit.cover,
                errorBuilder: (_, _, _) => _initial(tone.bg, t.textPrimary),
              )
            : _initial(tone.bg, t.textPrimary),
      ),
    );

    return Semantics(
      button: true,
      label: '${trip.name}. $headline${moneyText == null ? '' : '. $moneyText'}',
      child: Opacity(
        opacity: over ? 0.8 : 1,
        child: Material(
          color: t.bgSurface,
          clipBehavior: Clip.antiAlias,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(t.radiusMd),
            side: BorderSide(color: t.borderColor),
          ),
          child: InkWell(
            key: Key('trip-row-${trip.id}'),
            onTap: onTap,
            onLongPress: onLongPress,
            child: IntrinsicHeight(
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  if (active) Container(key: const Key('trip-active-edge'), width: 4, color: t.primaryAccent),
                  Expanded(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(12, 12, 8, 12),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              thumb,
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    if ((trip.destination ?? '').trim().isNotEmpty)
                                      Text(
                                        (trip.destination ?? '').trim().toUpperCase(),
                                        key: Key('trip-eyebrow-${trip.id}'),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: TextStyle(
                                          fontFamily: AppTypography.fontMono,
                                          fontSize: 11,
                                          fontWeight: FontWeight.w600,
                                          letterSpacing: 0.8,
                                          color: t.textMuted,
                                        ),
                                      ),
                                    Hero(
                                      tag: 'trip-title-${trip.id}',
                                      child: Material(
                                        type: MaterialType.transparency,
                                        child: Text(
                                          trip.name,
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                          style: TextStyle(
                                            fontFamily: AppTypography.fontTitle,
                                            fontSize: 18,
                                            fontWeight: FontWeight.w800,
                                            letterSpacing: -0.3,
                                            color: t.textPrimary,
                                          ),
                                        ),
                                      ),
                                    ),
                                    if (sub.isNotEmpty)
                                      Padding(
                                        padding: const EdgeInsets.only(top: 2),
                                        child: Text(
                                          sub,
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                          style: TextStyle(fontSize: 13, color: t.textSecondary),
                                        ),
                                      ),
                                    const SizedBox(height: 6),
                                    Wrap(
                                      spacing: 6,
                                      runSpacing: 4,
                                      crossAxisAlignment: WrapCrossAlignment.center,
                                      children: [
                                        if (headline.isNotEmpty) _StatusPill(headline, phase: status.phase),
                                        if (trip.archived) _MutedTag(l10n.tripBadgeArchived),
                                        if (trip.closed) _MutedTag(l10n.tripBadgeClosed),
                                        if (pending) const _PendingDot(),
                                      ],
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(width: 8),
                              _Stamp(
                                letter: trip.name.trim().isEmpty
                                    ? '?'
                                    : trip.name.trim().characters.first.toUpperCase(),
                              ),
                              if (moneyText != null)
                                ConstrainedBox(
                                  constraints: const BoxConstraints(maxWidth: 110),
                                  child: Text(
                                    moneyText!,
                                    key: const Key('trip-money'),
                                    textAlign: TextAlign.end,
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
                                    style: TextStyle(
                                      fontFamily: AppTypography.fontMono,
                                      fontFeatures: AppTypography.tabularFigures,
                                      fontSize: 13,
                                      fontWeight: FontWeight.w700,
                                      color: moneyColor ?? t.textSecondary,
                                    ),
                                  ),
                                ),
                              Icon(Icons.chevron_right_rounded, color: t.textMuted),
                            ],
                          ),
                          if (avatarNames.isNotEmpty || trip.expenseCount > 0) ...[
                            const SizedBox(height: 10),
                            _Dash(color: t.borderColor),
                            const SizedBox(height: 8),
                            Row(
                              children: [
                                _Avatars(avatarNames, size: 22, ring: t.bgSurface),
                                const Spacer(),
                                Text(
                                  l10n.tripExpenseCount(trip.expenseCount),
                                  style: TextStyle(fontSize: 12, color: t.textMuted),
                                ),
                              ],
                            ),
                          ],
                          if (active) ...[
                            const SizedBox(height: 10),
                            ClipRRect(
                              borderRadius: BorderRadius.circular(99),
                              child: LinearProgressIndicator(
                                key: const Key('trip-progress'),
                                value: progress,
                                minHeight: 4,
                                backgroundColor: t.borderColor,
                                color: t.primaryAccent,
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _initial(Color bg, Color ink) => ColoredBox(
    color: bg,
    child: Center(
      child: Text(
        trip.name.trim().isEmpty ? '?' : trip.name.trim().characters.first.toUpperCase(),
        style: TextStyle(fontFamily: AppTypography.fontTitle, fontSize: 26, fontWeight: FontWeight.w800, color: ink),
      ),
    ),
  );
}

class _Stamp extends StatelessWidget {
  const _Stamp({required this.letter});
  final String letter;

  @override
  Widget build(BuildContext context) {
    final t = context.tokens;
    return Container(
      width: 28,
      height: 28,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        border: Border.all(color: t.primaryAccent, width: 1.5),
      ),
      child: Text(
        letter,
        style: TextStyle(
          fontFamily: AppTypography.fontMono,
          fontSize: 11,
          fontWeight: FontWeight.w700,
          color: t.primaryAccent,
        ),
      ),
    );
  }
}

class _Dash extends StatelessWidget {
  const _Dash({required this.color});
  final Color color;

  @override
  Widget build(BuildContext context) {
    // A painter, not a LayoutBuilder: the row sits in IntrinsicHeight so a swipe can measure it.
    return SizedBox(
      height: 2,
      width: double.infinity,
      child: CustomPaint(painter: _DashPainter(color)),
    );
  }
}

class _DashPainter extends CustomPainter {
  const _DashPainter(this.color);
  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..strokeWidth = 1.5;
    const dash = 4.0;
    const gap = 4.0;
    var x = 0.0;
    final y = size.height / 2;
    while (x < size.width) {
      canvas.drawLine(Offset(x, y), Offset((x + dash).clamp(0, size.width), y), paint);
      x += dash + gap;
    }
  }

  @override
  bool shouldRepaint(_DashPainter old) => old.color != color;
}

class _StatusPill extends StatelessWidget {
  const _StatusPill(this.text, {required this.phase});
  final String text;
  final TripPhase phase;

  @override
  Widget build(BuildContext context) {
    final t = context.tokens;
    final active = phase == TripPhase.active;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 3),
      decoration: BoxDecoration(
        color: active ? t.ctaBg : t.textPrimary.withValues(alpha: 0.07),
        borderRadius: BorderRadius.circular(99),
      ),
      child: Text(
        text,
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w700,
          color: active ? t.ctaFg : (phase == TripPhase.ended ? t.textSecondary : t.textPrimary),
        ),
      ),
    );
  }
}

class _MutedTag extends StatelessWidget {
  const _MutedTag(this.text);
  final String text;

  @override
  Widget build(BuildContext context) => Text(
    text,
    style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: context.tokens.textMuted),
  );
}

/// The trip happening today: a larger card with its photo, day progress and your position.
class TripHeroCard extends ConsumerWidget {
  const TripHeroCard({
    required this.trip,
    required this.now,
    required this.onTap,
    this.onLongPress,
    this.avatarNames = const [],
    this.moneyText,
    super.key,
  });

  final Trip trip;
  final DateTime now;
  final VoidCallback onTap;
  final VoidCallback? onLongPress;
  final List<String> avatarNames;
  final String? moneyText;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = context.tokens;
    final status = tripStatus(trip.startDate, trip.endDate, now);
    final headline = tripHeadline(context, status);
    final cover = ref.watch(tripCoverProvider(tripCoverKey(trip))).value;
    final sub = _subtitle(trip);
    final progress = status.totalDays <= 0 ? 0.0 : (status.dayNumber / status.totalDays).clamp(0.0, 1.0);

    return Semantics(
      button: true,
      label: '${trip.name}. $headline${moneyText == null ? '' : '. $moneyText'}',
      child: Material(
        color: const Color(0xFF0B1F33),
        clipBehavior: Clip.antiAlias,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(t.radiusLg)),
        child: InkWell(
          key: Key('trip-row-${trip.id}'),
          onTap: onTap,
          onLongPress: onLongPress,
          child: Stack(
            children: [
              const Positioned.fill(
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [Color(0xFF0B1F33), Color(0xFF123A57), Color(0xFF1F6F78)],
                    ),
                  ),
                ),
              ),
              if (cover != null && cover.isNotEmpty)
                Positioned.fill(
                  child: Image(
                    image: CachedPhotoProvider(cover),
                    key: Key('trip-thumb-${trip.id}'),
                    fit: BoxFit.cover,
                    errorBuilder: (_, _, _) => const SizedBox.shrink(),
                  ),
                ),
              // A dark wash keeps the white text readable on any photo.
              Positioned.fill(
                child: ColoredBox(color: Colors.black.withValues(alpha: cover == null ? 0.0 : 0.55)),
              ),
              Padding(
                padding: const EdgeInsets.all(18),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.18),
                            borderRadius: BorderRadius.circular(99),
                          ),
                          child: Text(
                            headline,
                            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: Colors.white),
                          ),
                        ),
                        const Spacer(),
                        if (moneyText != null)
                          Flexible(
                            child: Text(
                              moneyText!,
                              key: const Key('trip-money'),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: Colors.white),
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 22),
                    Hero(
                      tag: 'trip-title-${trip.id}',
                      child: Material(
                        type: MaterialType.transparency,
                        child: Text(
                          trip.name,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontFamily: AppTypography.fontTitle,
                            fontSize: 28,
                            fontWeight: FontWeight.w800,
                            letterSpacing: -0.6,
                            height: 1.05,
                            color: Colors.white,
                          ),
                        ),
                      ),
                    ),
                    if (sub.isNotEmpty)
                      Padding(
                        padding: const EdgeInsets.only(top: 4),
                        child: Text(
                          sub,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: Colors.white70),
                        ),
                      ),
                    const SizedBox(height: 14),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(99),
                      child: LinearProgressIndicator(
                        key: const Key('trip-progress'),
                        value: progress,
                        minHeight: 5,
                        backgroundColor: Colors.white24,
                        color: Colors.white,
                      ),
                    ),
                    if (avatarNames.isNotEmpty) ...[
                      const SizedBox(height: 12),
                      Align(
                        alignment: Alignment.centerLeft,
                        child: _Avatars(avatarNames, size: 26, ring: const Color(0xFF123A57)),
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

/// A square photo tile for the Trips grid: the destination photo under a dark wash, status on top-left, your
/// money on top-right, name and dates at the bottom, like a card of the stack. Falls back to a gradient with the
/// trip's initial when there is no photo.
class TripTile extends ConsumerWidget {
  const TripTile({
    required this.trip,
    required this.now,
    required this.onTap,
    this.onLongPress,
    this.avatarNames = const [],
    this.moneyText,
    this.moneyColor,
    this.pending = false,
    super.key,
  });

  final Trip trip;
  final DateTime now;
  final VoidCallback onTap;
  final VoidCallback? onLongPress;
  final List<String> avatarNames;
  final String? moneyText;
  final Color? moneyColor;

  /// Changes in this trip are still waiting to sync (flag `enablePendingDots`).
  final bool pending;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = context.tokens;
    final status = tripStatus(trip.startDate, trip.endDate, now);
    final headline = trip.archived ? context.l10n.tripBadgeArchived : tripHeadline(context, status);
    final cover = ref.watch(tripCoverProvider(tripCoverKey(trip))).value;
    final dates = trip.startDate.isNotEmpty ? formatDateRange(trip.startDate, trip.endDate) : '';
    final over = trip.archived || status.phase == TripPhase.ended;

    return Semantics(
      button: true,
      label: '${trip.name}. $headline${moneyText == null ? '' : '. $moneyText'}',
      child: Material(
        color: const Color(0xFF0B1F33),
        clipBehavior: Clip.antiAlias,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(t.radiusLg)),
        child: InkWell(
          key: Key('trip-row-${trip.id}'),
          onTap: onTap,
          onLongPress: onLongPress,
          // A fixed-shape tile cannot grow with the text size: cap it here (the trip itself scales fully).
          child: MediaQuery.withClampedTextScaling(
            maxScaleFactor: 1.25,
            child: Stack(
              fit: StackFit.expand,
              children: [
                const DecoratedBox(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [Color(0xFF123A57), Color(0xFF1F6F78)],
                    ),
                  ),
                ),
                if (cover == null || cover.isEmpty)
                  Center(
                    child: Text(
                      trip.name.trim().isEmpty ? '?' : trip.name.trim().characters.first.toUpperCase(),
                      style: const TextStyle(
                        fontFamily: AppTypography.fontTitle,
                        fontSize: 54,
                        fontWeight: FontWeight.w800,
                        color: Colors.white24,
                      ),
                    ),
                  )
                else
                  Hero(
                    tag: 'trip-photo-${trip.id}',
                    child: Image(
                      image: CachedPhotoProvider(cover),
                      key: Key('trip-thumb-${trip.id}'),
                      fit: BoxFit.cover,
                      errorBuilder: (_, _, _) => const SizedBox.shrink(),
                    ),
                  ),
                // Light at the top for the chips, heavy at the bottom for the name: readable on any photo.
                DecoratedBox(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [
                        Colors.black.withValues(alpha: 0.25),
                        Colors.black.withValues(alpha: 0.05),
                        Colors.black.withValues(alpha: 0.78),
                      ],
                      stops: const [0, 0.4, 1],
                    ),
                  ),
                ),
                if (over) ColoredBox(color: Colors.black.withValues(alpha: 0.18)),
                Padding(
                  padding: const EdgeInsets.all(12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          if (headline.isNotEmpty)
                            Flexible(
                              child: _TilePill(
                                headline,
                                key: const Key('trip-tile-status'),
                                dot: status.phase == TripPhase.active ? t.colorSuccess : null,
                              ),
                            ),
                          if (pending) ...[const SizedBox(width: 6), const _PendingDot(onDark: true)],
                          const Spacer(),
                          if (moneyText != null)
                            Flexible(
                              child: _TilePill(moneyText!, key: const Key('trip-money'), dot: moneyColor),
                            ),
                        ],
                      ),
                      const Spacer(),
                      Hero(
                        tag: 'trip-title-${trip.id}',
                        child: Material(
                          type: MaterialType.transparency,
                          child: Text(
                            trip.name,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              fontFamily: AppTypography.fontTitle,
                              fontSize: 19,
                              fontWeight: FontWeight.w800,
                              letterSpacing: -0.4,
                              height: 1.05,
                              color: Colors.white,
                              shadows: [Shadow(color: Color(0x66000000), blurRadius: 8)],
                            ),
                          ),
                        ),
                      ),
                      if (dates.isNotEmpty)
                        Padding(
                          padding: const EdgeInsets.only(top: 2),
                          child: Text(
                            dates,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Colors.white70),
                          ),
                        ),
                      if (avatarNames.isNotEmpty)
                        Padding(
                          padding: const EdgeInsets.only(top: 8),
                          child: _Avatars(avatarNames, size: 20, ring: const Color(0xFF123A57)),
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

class _TilePill extends StatelessWidget {
  const _TilePill(this.text, {this.dot, super.key});
  final String text;
  final Color? dot;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
    decoration: BoxDecoration(color: Colors.black.withValues(alpha: 0.55), borderRadius: BorderRadius.circular(99)),
    child: Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        if (dot != null) ...[
          Container(
            width: 7,
            height: 7,
            decoration: BoxDecoration(color: dot, shape: BoxShape.circle),
          ),
          const SizedBox(width: 5),
        ],
        Flexible(
          child: Text(
            text,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Colors.white),
          ),
        ),
      ],
    ),
  );
}

/// A small "waiting to sync" marker: an amber dot with a cloud, readable by a screen reader.
class _PendingDot extends StatelessWidget {
  const _PendingDot({this.onDark = false});
  final bool onDark;

  @override
  Widget build(BuildContext context) => Semantics(
    label: context.l10n.pendingDotLabel,
    child: Tooltip(
      message: context.l10n.pendingDotLabel,
      child: Container(
        key: const Key('trip-pending-dot'),
        padding: const EdgeInsets.all(4),
        decoration: BoxDecoration(
          color: onDark ? Colors.black.withValues(alpha: 0.55) : const Color(0xFFE8890C).withValues(alpha: 0.18),
          shape: BoxShape.circle,
        ),
        child: const Icon(Icons.cloud_upload_outlined, size: 12, color: Color(0xFFE8890C)),
      ),
    ),
  );
}
