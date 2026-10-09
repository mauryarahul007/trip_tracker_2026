import 'package:flutter/material.dart';

import '../../../domain/models/trip.dart';
import '../../../l10n/l10n_ext.dart';
import '../../../shared/theme/app_tokens.dart';
import '../../../shared/widgets/app_button.dart';
import '../../../shared/widgets/bento_tile.dart';
import 'deferred_trip_map_hero.dart';

/// The route panel under the trip header (the map button toggles it). With stops it is the map, tap to open the
/// full route editor; without stops it says so plainly and offers to add them, instead of an empty dark band.
class TripRoutePanel extends StatelessWidget {
  const TripRoutePanel({required this.trip, required this.onOpen, super.key});

  final Trip trip;
  final VoidCallback onOpen;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final t = context.tokens;
    final hasStops = trip.stops.any((s) => s.lat != null && s.lng != null);
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 8),
      child: ClipRRect(
        key: const Key('route-panel'),
        borderRadius: BorderRadius.circular(t.radiusMd),
        child: hasStops
            ? SizedBox(
                height: 168,
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    DeferredTripMapHero(trip: trip, height: 168),
                    Positioned.fill(
                      child: Material(
                        type: MaterialType.transparency,
                        child: InkWell(onTap: onOpen),
                      ),
                    ),
                    Positioned(
                      right: 10,
                      bottom: 10,
                      child: IgnorePointer(
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                          decoration: BoxDecoration(color: t.ctaBg, borderRadius: BorderRadius.circular(99)),
                          child: Text(
                            l10n.mapOpenRoute,
                            style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: t.ctaFg),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              )
            : BentoTile(
                tone: BentoTone.sky,
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    const Icon(Icons.map_outlined, size: 36),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(l10n.mapNoRoute, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800)),
                          const SizedBox(height: 2),
                          Text(l10n.mapNoRouteHint, style: TextStyle(fontSize: 13, color: t.textSecondary)),
                        ],
                      ),
                    ),
                    const SizedBox(width: 10),
                    ConstrainedBox(
                      constraints: const BoxConstraints(maxWidth: 120),
                      child: AppButton(key: const Key('route-add-stops'), label: l10n.mapAddStops, onPressed: onOpen),
                    ),
                  ],
                ),
              ),
      ),
    );
  }
}
