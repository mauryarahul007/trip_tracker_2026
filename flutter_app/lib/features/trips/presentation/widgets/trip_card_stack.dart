import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/semantics.dart' show CustomSemanticsAction;
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/format/money.dart';
import '../../../../domain/logic/trip_status.dart';
import '../../../../domain/logic/trip_utilities.dart' show formatDateRange;
import '../../../../domain/models/trip.dart';
import '../../../../l10n/l10n_ext.dart';
import '../../../../shared/theme/app_tokens.dart';
import '../../../../shared/theme/app_typography.dart';
import '../../../../shared/widgets/app_avatar.dart';
import '../../../expenses/application/expenses_providers.dart' show tripMembersProvider;
import '../../application/trips_providers.dart';
import 'trip_card.dart' show tripHeadline;

/// Trips as a deck of full-bleed photo cards, every trip in any state.
///
/// Tap the top card to open the trip; swipe left or right to flip through the deck;
/// long-press for the trip menu. The next two cards peek out behind it. Screen readers get the same actions as
/// "Open" and "Skip" custom actions on the top card.
class TripCardStack extends StatefulWidget {
  const TripCardStack({
    required this.trips,
    required this.now,
    required this.onOpen,
    required this.onLongPress,
    this.onTopChanged,
    this.bottomInset = 80,
    super.key,
  });

  final List<Trip> trips;
  final DateTime now;
  final ValueChanged<Trip> onOpen;
  final ValueChanged<Trip> onLongPress;

  /// Called (after the frame) whenever a different trip becomes the top card, so the screen can tint its background.
  final ValueChanged<Trip>? onTopChanged;

  /// Space kept free under the card for the floating runway slider (about 90 high) and the page dots.
  final double bottomInset;

  @override
  State<TripCardStack> createState() => _TripCardStackState();
}

class _TripCardStackState extends State<TripCardStack> with SingleTickerProviderStateMixin {
  late final _anim = AnimationController(vsync: this, duration: const Duration(milliseconds: 220));
  late List<String> _order = [for (final t in widget.trips) t.id];
  Offset _drag = Offset.zero;
  Offset _from = Offset.zero;
  Offset _to = Offset.zero;
  bool _flying = false;
  String? _reportedTop;

  @override
  void initState() {
    super.initState();
    _anim.addListener(() {
      if (_flying) setState(() => _drag = Offset.lerp(_from, _to, Curves.easeOut.transform(_anim.value))!);
    });
  }

  @override
  void didUpdateWidget(TripCardStack old) {
    super.didUpdateWidget(old);
    // Keep the user's order; drop trips that vanished and put new ones at the back.
    final ids = {for (final t in widget.trips) t.id};
    _order = [
      for (final id in _order)
        if (ids.contains(id)) id,
      for (final t in widget.trips)
        if (!_order.contains(t.id)) t.id,
    ];
  }

  @override
  void dispose() {
    _anim.dispose();
    super.dispose();
  }

  List<Trip> get _ordered {
    final byId = {for (final t in widget.trips) t.id: t};
    return [for (final id in _order) ?byId[id]];
  }

  Future<void> _fly(Offset to) async {
    _from = _drag;
    _to = to;
    _flying = true;
    await _anim.forward(from: 0);
    _flying = false;
  }

  /// Left = top card to the back of the deck (next); right = the last card back to the front (previous). Opening a trip
  /// is a tap, never a swipe.
  Future<void> _commit({required bool next, required double width}) async {
    final trips = _ordered;
    if (trips.length < 2 || _flying) return _snapBack(); // nothing to move to
    await _fly(Offset((next ? -1 : 1) * width * 1.6, _drag.dy));
    if (!mounted) return;
    setState(() {
      _drag = Offset.zero;
      _order = next ? [..._order.skip(1), _order.first] : [_order.last, ..._order.take(_order.length - 1)];
    });
  }

  Future<void> _snapBack() async {
    if (_flying) return;
    await _fly(Offset.zero);
    if (mounted) setState(() => _drag = Offset.zero);
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final trips = _ordered;
    if (trips.isEmpty) return const SizedBox.shrink();
    if (_reportedTop != trips.first.id) {
      _reportedTop = trips.first.id;
      final top = trips.first;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) widget.onTopChanged?.call(top);
      });
    }
    final position = widget.trips.indexWhere((x) => x.id == trips.first.id);
    return LayoutBuilder(
      builder: (context, box) {
        final cardW = math.min(box.maxWidth - 24, 460.0);
        final cardH = (box.maxHeight - 28 - widget.bottomInset).clamp(300.0, 900.0);
        final progress = (_drag.dx.abs() / (cardW * 0.4)).clamp(0.0, 1.0);
        final behind = math.min(2, trips.length - 1);
        return Column(
          children: [
            Expanded(
              child: Align(
                alignment: Alignment.topCenter,
                child: SizedBox(
                  width: cardW,
                  height: cardH + 28,
                  child: Stack(
                    alignment: Alignment.topCenter,
                    clipBehavior: Clip.none,
                    children: [
                      for (var k = behind; k >= 1; k--)
                        Positioned(
                          top: 14.0 * k - 14 * progress,
                          child: Transform.scale(
                            scale: 1 - 0.06 * k + 0.06 * progress,
                            alignment: Alignment.topCenter,
                            child: SizedBox(
                              width: cardW,
                              height: cardH,
                              child: IgnorePointer(
                                child: _StackCard(trip: trips[k], now: widget.now, dim: true),
                              ),
                            ),
                          ),
                        ),
                      Positioned(
                        top: 0,
                        child: Semantics(
                          customSemanticsActions: {
                            CustomSemanticsAction(label: l10n.tripsStackOpen): () => widget.onOpen(trips.first),
                            if (trips.length > 1)
                              CustomSemanticsAction(label: l10n.tripsStackSkip): () =>
                                  _commit(next: true, width: cardW),
                          },
                          child: GestureDetector(
                            key: const Key('stack-top'),
                            behavior: HitTestBehavior.opaque,
                            onTap: () => widget.onOpen(trips.first),
                            onLongPress: () => widget.onLongPress(trips.first),
                            onPanUpdate: (d) {
                              if (!_flying) setState(() => _drag += d.delta);
                            },
                            onPanEnd: (d) {
                              final vx = d.velocity.pixelsPerSecond.dx;
                              final far = _drag.dx.abs() > cardW * 0.28;
                              final flung = vx.abs() > 800 && vx.sign == _drag.dx.sign;
                              if (far || flung) {
                                _commit(next: _drag.dx < 0, width: cardW);
                              } else {
                                _snapBack();
                              }
                            },
                            child: Transform.translate(
                              offset: _drag,
                              child: Transform.rotate(
                                angle: _drag.dx / cardW * 0.25,
                                child: SizedBox(
                                  width: cardW,
                                  height: cardH,
                                  child: _StackCard(
                                    trip: trips.first,
                                    now: widget.now,
                                    swipe: _drag.dx / (cardW * 0.4),
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
            _PageDots(
              key: const Key('stack-dots'),
              count: widget.trips.length,
              index: position < 0 ? 0 : position,
              label: l10n.tripsStackPosition(position + 1, widget.trips.length),
            ),
          ],
        );
      },
    );
  }
}

/// Up to seven dots; the active one is a longer pill. Falls back to the first/last seven for big decks.
class _PageDots extends StatelessWidget {
  const _PageDots({required this.count, required this.index, required this.label, super.key});

  final int count;
  final int index;
  final String label;

  @override
  Widget build(BuildContext context) {
    final t = context.tokens;
    const max = 7;
    final shown = math.min(count, max);
    // Window of dots that always contains the active one.
    final start = count <= max ? 0 : (index - max ~/ 2).clamp(0, count - max);
    return Semantics(
      label: label,
      excludeSemantics: true,
      child: Padding(
        padding: const EdgeInsets.only(top: 10),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            for (var i = 0; i < shown; i++)
              AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                margin: const EdgeInsets.symmetric(horizontal: 3),
                width: start + i == index ? 18 : 6,
                height: 6,
                decoration: BoxDecoration(
                  color: start + i == index ? t.textPrimary : t.textPrimary.withValues(alpha: 0.28),
                  borderRadius: BorderRadius.circular(99),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

/// One trip, full bleed: the photo with a dark wash, status + route chips on top, name, dates, crew and spend below.
class _StackCard extends ConsumerWidget {
  const _StackCard({required this.trip, required this.now, this.dim = false, this.swipe = 0});

  final Trip trip;
  final DateTime now;
  final bool dim;

  /// -1 (left, skip) .. 1 (right, open): drives the hint label on the top card.
  final double swipe;

  static const _ink = Colors.white;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final t = context.tokens;
    final status = tripStatus(trip.startDate, trip.endDate, now);
    final headline = trip.archived ? l10n.tripBadgeArchived : tripHeadline(context, status);
    final cover = ref.watch(tripCoverProvider(tripCoverKey(trip))).value; // own cover, else the destination's photo
    final route = _routeText(trip);
    final weather = route.isEmpty ? null : ref.watch(tripWeatherProvider(trip.destination ?? route)).value;
    final dates = trip.startDate.isNotEmpty ? formatDateRange(trip.startDate, trip.endDate) : '';
    final spent = ref.watch(tripSpentProvider(trip.id));
    final progress = switch (status.phase) {
      TripPhase.ended => 1.0,
      TripPhase.active => status.totalDays <= 0 ? 0.0 : (status.dayNumber / status.totalDays).clamp(0.0, 1.0),
      _ => 0.0,
    };
    final dotColor = switch (status.phase) {
      TripPhase.active => t.colorSuccess,
      TripPhase.upcoming => t.colorWarning,
      _ => const Color(0xFF8EA2FF),
    };
    return Semantics(
      container: true,
      label: '${trip.name}. $headline',
      child: Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(30),
          border: Border.all(color: Colors.white.withValues(alpha: 0.14)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: dim ? 0.18 : 0.38),
              blurRadius: 28,
              offset: const Offset(0, 12),
            ),
          ],
          gradient: const LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xFF14304A), Color(0xFF0A1827)],
          ),
        ),
        clipBehavior: Clip.antiAlias,
        child: Stack(
          fit: StackFit.expand,
          children: [
            if (cover != null && cover.isNotEmpty)
              Image.network(
                cover,
                key: Key('stack-photo-${trip.id}'),
                fit: BoxFit.cover,
                frameBuilder: (_, child, frame, sync) => AnimatedOpacity(
                  opacity: frame == null && !sync ? 0 : 1,
                  duration: const Duration(milliseconds: 350),
                  child: child,
                ),
                errorBuilder: (_, _, _) => const SizedBox.shrink(),
              ),
            // Lightens nothing: a clear top for the sky, a deep navy wash from the lower half for the text.
            const DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  stops: [0, 0.25, 0.55, 1],
                  colors: [Color(0x66050B14), Color(0x00050B14), Color(0x99050B14), Color(0xF2050B14)],
                ),
              ),
            ),
            Positioned(
              top: 16,
              left: 16,
              right: 16,
              // A Wrap, so a long route chip drops to its own line on a narrow phone or at large text sizes.
              child: Wrap(
                spacing: 8,
                runSpacing: 8,
                crossAxisAlignment: WrapCrossAlignment.center,
                children: [
                  _Chip(
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(
                          width: 7,
                          height: 7,
                          decoration: BoxDecoration(color: dotColor, shape: BoxShape.circle),
                        ),
                        const SizedBox(width: 7),
                        Text(
                          headline.toUpperCase(),
                          key: const Key('stack-status'),
                          style: const TextStyle(
                            fontFamily: AppTypography.fontMono,
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            letterSpacing: 1,
                            color: _ink,
                          ),
                        ),
                      ],
                    ),
                  ),
                  if (route.isNotEmpty)
                    _Chip(
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Flexible(
                            child: Text(
                              route,
                              key: const Key('stack-place'),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: _ink),
                            ),
                          ),
                          if (weather != null) ...[
                            const SizedBox(width: 8),
                            Text(
                              '${weather.weatherEmoji} ${weather.tempC}°C',
                              key: const Key('stack-weather'),
                              style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: _ink),
                            ),
                          ],
                        ],
                      ),
                    ),
                ],
              ),
            ),
            if (swipe.abs() > 0.15)
              Positioned(
                top: 72,
                left: swipe > 0 ? 22 : null,
                right: swipe < 0 ? 22 : null,
                child: Opacity(
                  opacity: swipe.abs().clamp(0.0, 1.0),
                  child: Transform.rotate(
                    angle: swipe > 0 ? -0.2 : 0.2,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        border: Border.all(color: swipe > 0 ? t.colorSuccess : Colors.white, width: 3),
                        borderRadius: BorderRadius.circular(10),
                        color: Colors.black.withValues(alpha: 0.22),
                      ),
                      child: Text(
                        (swipe > 0 ? l10n.tripsStackOpen : l10n.tripsStackSkip).toUpperCase(),
                        style: TextStyle(
                          fontFamily: AppTypography.fontMono,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 1.4,
                          color: swipe > 0 ? t.colorSuccess : Colors.white,
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            Positioned(
              left: 22,
              right: 22,
              bottom: 22,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    trip.name,
                    key: const Key('stack-title'),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontFamily: AppTypography.fontSerif,
                      fontSize: 38,
                      fontWeight: FontWeight.w800,
                      height: 1.05,
                      color: _ink,
                      shadows: [Shadow(color: Color(0x66000000), blurRadius: 12)],
                    ),
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          dates.toUpperCase(),
                          style: const TextStyle(
                            fontFamily: AppTypography.fontMono,
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            letterSpacing: 0.8,
                            color: Colors.white70,
                          ),
                        ),
                      ),
                      if (status.totalDays > 0)
                        Text(
                          l10n.tripDaysCount(status.totalDays),
                          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Colors.white70),
                        ),
                    ],
                  ),
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: 14),
                    child: Divider(height: 1, color: Colors.white24),
                  ),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      _Crew(tripId: trip.id, fallbackCount: trip.memberIds.length),
                      const SizedBox(width: 12),
                      Flexible(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            FittedBox(
                              fit: BoxFit.scaleDown,
                              alignment: Alignment.centerRight,
                              child: Text(
                                l10n.tripSpentLabel(formatMoney(context, spent, trip.baseCurrency)),
                                key: const Key('stack-spent'),
                                style: const TextStyle(
                                  fontFamily: AppTypography.fontMono,
                                  fontSize: 15,
                                  fontWeight: FontWeight.w700,
                                  color: _ink,
                                ),
                              ),
                            ),
                            const SizedBox(height: 8),
                            ClipRRect(
                              borderRadius: BorderRadius.circular(99),
                              child: SizedBox(
                                width: 120,
                                height: 4,
                                child: LinearProgressIndicator(
                                  key: const Key('stack-progress'),
                                  value: progress,
                                  color: Colors.white,
                                  backgroundColor: Colors.white24,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
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

/// "Manali → Shimla → Cha…": the destination as typed, else the saved stops.
String _routeText(Trip trip) {
  final dest = (trip.destination ?? '').trim();
  if (dest.isNotEmpty) return dest.replaceAll('->', '→');
  return trip.stops.map((s) => s.name).where((n) => n.trim().isNotEmpty).join(' → ');
}

class _Chip extends StatelessWidget {
  const _Chip({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
    decoration: BoxDecoration(
      color: const Color(0xFF0B1B2E).withValues(alpha: 0.62),
      borderRadius: BorderRadius.circular(99),
      border: Border.all(color: Colors.white.withValues(alpha: 0.16)),
    ),
    child: child,
  );
}

/// Overlapping avatars of the people on the trip (up to three, then "+N").
class _Crew extends ConsumerWidget {
  const _Crew({required this.tripId, required this.fallbackCount});

  final String tripId;
  final int fallbackCount;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final members = ref.watch(tripMembersProvider(tripId)).value ?? const [];
    final names = [for (final m in members) m.name];
    final total = names.isEmpty ? fallbackCount : names.length;
    final shown = names.take(3).toList();
    return SizedBox(
      height: 38,
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          for (var i = 0; i < shown.length; i++)
            Align(
              widthFactor: i == 0 ? 1 : 0.68,
              child: Container(
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(color: const Color(0xFF0A1827), width: 2),
                ),
                child: AppAvatar(name: shown[i], size: 34),
              ),
            ),
          if (total > shown.length)
            Padding(
              padding: const EdgeInsets.only(left: 8),
              child: Text(
                '+${total - shown.length}',
                style: const TextStyle(fontWeight: FontWeight.w700, color: Colors.white70),
              ),
            ),
        ],
      ),
    );
  }
}
