import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../domain/logic/trip_status.dart';
import '../../../../domain/logic/trip_utilities.dart' show formatDateRange;
import '../../../../domain/models/trip.dart';
import '../../../../l10n/l10n_ext.dart';
import '../../../../shared/theme/app_icons.dart';
import '../../../../shared/theme/app_tokens.dart';
import '../../../../shared/theme/app_typography.dart';
import '../../../../shared/widgets/ticket_scallop_divider.dart';
import '../../application/trips_providers.dart';
import 'trip_card.dart';

/// Trips as a deck of tall boarding-pass cards, every trip in any state.
///
/// Swipe the top card right (or tap it, or press Open) to open the trip; swipe left (or press Skip) to send it to
/// the back of the deck; long-press for the trip menu. The next two cards peek out behind it.
class TripCardStack extends StatefulWidget {
  const TripCardStack({
    required this.trips,
    required this.now,
    required this.onOpen,
    required this.onLongPress,
    this.onTopChanged,
    super.key,
  });

  final List<Trip> trips;
  final DateTime now;
  final ValueChanged<Trip> onOpen;
  final ValueChanged<Trip> onLongPress;

  /// Called (after the frame) whenever a different trip becomes the top card, so the screen can tint its background.
  final ValueChanged<Trip>? onTopChanged;

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

  /// Right = open the trip (the card returns afterwards); left = to the back of the deck.
  Future<void> _commit({required bool open, required double width}) async {
    final trips = _ordered;
    if (trips.isEmpty || _flying) return;
    final top = trips.first;
    if (!open && trips.length < 2) return _snapBack(); // nothing to skip to
    await _fly(Offset((open ? 1 : -1) * width * 1.6, _drag.dy));
    if (!mounted) return;
    setState(() {
      _drag = Offset.zero;
      if (!open) _order = [..._order.skip(1), _order.first];
    });
    if (open) widget.onOpen(top);
  }

  Future<void> _snapBack() async {
    if (_flying) return;
    await _fly(Offset.zero);
    if (mounted) setState(() => _drag = Offset.zero);
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final t = context.tokens;
    final trips = _ordered;
    if (trips.isEmpty) return const SizedBox.shrink();
    if (_reportedTop != trips.first.id) {
      _reportedTop = trips.first.id;
      final top = trips.first;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) widget.onTopChanged?.call(top);
      });
    }
    return LayoutBuilder(
      builder: (context, box) {
        final cardW = math.min(box.maxWidth - 32, 440.0);
        final cardH = (box.maxHeight - 108).clamp(280.0, 640.0);
        final progress = (_drag.dx.abs() / (cardW * 0.4)).clamp(0.0, 1.0);
        final behind = math.min(2, trips.length - 1);
        return Column(
          children: [
            Expanded(
              child: Center(
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
                              _commit(open: _drag.dx > 0, width: cardW);
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
                                child: _StackCard(trip: trips.first, now: widget.now, swipe: _drag.dx / (cardW * 0.4)),
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
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  _RoundButton(
                    key: const Key('stack-skip'),
                    icon: AppIcons.close,
                    label: l10n.tripsStackSkip,
                    onPressed: trips.length < 2 ? null : () => _commit(open: false, width: cardW),
                  ),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 22),
                    child: Text(
                      l10n.tripsStackPosition(
                        (widget.trips.indexWhere((x) => x.id == trips.first.id) + 1),
                        widget.trips.length,
                      ),
                      key: const Key('stack-position'),
                      style: TextStyle(fontFamily: AppTypography.fontMono, fontSize: 12.5, color: t.textSecondary),
                    ),
                  ),
                  _RoundButton(
                    key: const Key('stack-open'),
                    icon: Icons.arrow_forward_rounded,
                    label: l10n.tripsStackOpen,
                    filled: true,
                    onPressed: () => _commit(open: true, width: cardW),
                  ),
                ],
              ),
            ),
          ],
        );
      },
    );
  }
}

class _RoundButton extends StatelessWidget {
  const _RoundButton({
    required this.icon,
    required this.label,
    required this.onPressed,
    this.filled = false,
    super.key,
  });

  final IconData icon;
  final String label;
  final VoidCallback? onPressed;
  final bool filled;

  @override
  Widget build(BuildContext context) {
    final t = context.tokens;
    return Semantics(
      button: true,
      label: label,
      child: Material(
        color: filled ? t.ctaBg : t.bgSurface,
        shape: CircleBorder(side: BorderSide(color: t.borderColor)),
        child: InkWell(
          customBorder: const CircleBorder(),
          onTap: onPressed,
          child: SizedBox(
            width: 56,
            height: 56,
            child: Icon(icon, color: filled ? t.ctaFg : (onPressed == null ? t.textMuted : t.textPrimary)),
          ),
        ),
      ),
    );
  }
}

/// One trip as a tall boarding pass: cover (or tinted gradient) above a perforation, details in the stub below.
class _StackCard extends ConsumerWidget {
  const _StackCard({required this.trip, required this.now, this.dim = false, this.swipe = 0});

  final Trip trip;
  final DateTime now;
  final bool dim;

  /// -1 (left, skip) .. 1 (right, open): drives the hint label on the top card.
  final double swipe;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final t = context.tokens;
    final status = tripStatus(trip.startDate, trip.endDate, now);
    final headline = tripHeadline(context, status);
    final tone = tripTone(trip.id);
    final dest = (trip.destination ?? '').trim();
    final dates = trip.startDate.isNotEmpty ? formatDateRange(trip.startDate, trip.endDate) : '';
    final cover = ref.watch(tripCoverProvider(tripCoverKey(trip))).value; // own cover, else the destination's photo
    final ended = trip.archived || status.phase == TripPhase.ended;
    return Semantics(
      container: true,
      label: '${trip.name}. $headline',
      child: Opacity(
        opacity: dim ? 0.92 : (ended ? 0.9 : 1),
        child: Container(
          decoration: BoxDecoration(
            color: t.bgSurface,
            borderRadius: BorderRadius.circular(26),
            border: Border.all(color: t.borderColor.withValues(alpha: 0.6)),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: dim ? 0.10 : 0.22),
                blurRadius: 22,
                offset: const Offset(0, 8),
              ),
            ],
          ),
          clipBehavior: Clip.antiAlias,
          child: Column(
            children: [
              Expanded(
                flex: 11,
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    DecoratedBox(
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                          colors: [t.tones[tone].bg, t.tones[tone].accent.withValues(alpha: 0.75)],
                        ),
                      ),
                    ),
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
                    // Darkens the top and bottom of the photo so the pill and the place name stay readable.
                    const DecoratedBox(
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.topCenter,
                          end: Alignment.bottomCenter,
                          stops: [0, 0.3, 0.6, 1],
                          colors: [Color(0x66000000), Color(0x00000000), Color(0x00000000), Color(0x99000000)],
                        ),
                      ),
                    ),
                    if (dest.isNotEmpty)
                      Positioned(
                        left: 16,
                        right: 16,
                        bottom: 14,
                        child: Row(
                          children: [
                            const Icon(Icons.place_rounded, size: 18, color: Colors.white),
                            const SizedBox(width: 4),
                            Expanded(
                              child: Text(
                                dest,
                                key: const Key('stack-place'),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 16,
                                  fontWeight: FontWeight.w800,
                                  shadows: [Shadow(color: Color(0x99000000), blurRadius: 8)],
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    Positioned(
                      top: 14,
                      left: 14,
                      right: 14,
                      child: Row(
                        children: [
                          if (headline.isNotEmpty) TripStatusPill(headline),
                          const Spacer(),
                          if (trip.archived) TripChip(l10n.tripBadgeArchived),
                        ],
                      ),
                    ),
                    if (swipe.abs() > 0.15)
                      Positioned(
                        top: 56,
                        left: swipe > 0 ? 18 : null,
                        right: swipe < 0 ? 18 : null,
                        child: Opacity(
                          opacity: swipe.abs().clamp(0.0, 1.0),
                          child: Transform.rotate(
                            angle: swipe > 0 ? -0.2 : 0.2,
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                              decoration: BoxDecoration(
                                border: Border.all(color: swipe > 0 ? t.colorSuccess : t.textPrimary, width: 3),
                                borderRadius: BorderRadius.circular(10),
                                color: Colors.black.withValues(alpha: 0.18),
                              ),
                              child: Text(
                                (swipe > 0 ? l10n.tripsStackOpen : l10n.tripsStackSkip).toUpperCase(),
                                style: TextStyle(
                                  fontFamily: AppTypography.fontMono,
                                  fontWeight: FontWeight.w900,
                                  letterSpacing: 1.4,
                                  color: swipe > 0 ? t.colorSuccess : t.textPrimary,
                                ),
                              ),
                            ),
                          ),
                        ),
                      ),
                  ],
                ),
              ),
              TicketScallopDivider(
                notchRadius: 12,
                cardColor: t.bgSurface,
                cutoutColor: t.bgPage,
                perforationColor: t.textPrimary.withValues(alpha: 0.2),
              ),
              Expanded(
                flex: 8,
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 4, 20, 16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        trip.name,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontFamily: AppTypography.fontTitle,
                          fontSize: 28,
                          fontWeight: FontWeight.w800,
                          letterSpacing: -0.8,
                          height: 1.05,
                          color: t.textPrimary,
                        ),
                      ),
                      if (dates.isNotEmpty) ...[
                        const SizedBox(height: 4),
                        Text(
                          dates,
                          style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: t.tones[tone].accent),
                        ),
                      ],
                      const Spacer(),
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: [
                          TripChip(l10n.tripTravelers(trip.memberIds.length)),
                          TripChip(l10n.tripExpenseCount(trip.expenseCount)),
                          if (trip.closed) TripChip(l10n.tripBadgeClosed),
                          if (trip.frozen) TripChip(l10n.tripBadgeFrozen),
                        ],
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
