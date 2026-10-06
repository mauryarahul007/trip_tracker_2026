import 'dart:async';

import 'package:flutter/material.dart';

import '../../../domain/models/trip.dart';
import 'trip_map_hero.dart';
import 'trip_photo_hero.dart';

class DeferredTripMapHero extends StatefulWidget {
  final Trip trip;
  final ValueChanged<String>? onToneChange;
  final double height;

  const DeferredTripMapHero({super.key, required this.trip, this.onToneChange, this.height = 220});

  @override
  State<DeferredTripMapHero> createState() => _DeferredTripMapHeroState();
}

class _DeferredTripMapHeroState extends State<DeferredTripMapHero> {
  bool _mapReady = false;
  bool _mapDrawn = false;
  Timer? _idleTimer;

  @override
  void initState() {
    super.initState();
    _scheduleMapMount();
  }

  @override
  void didUpdateWidget(covariant DeferredTripMapHero oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.trip.id != widget.trip.id) {
      _mapReady = false;
      _mapDrawn = false;
      _scheduleMapMount();
    }
  }

  @override
  void dispose() {
    _idleTimer?.cancel();
    super.dispose();
  }

  void _scheduleMapMount() {
    _idleTimer?.cancel();
    final hasStops = widget.trip.stops.any((s) => s.lat != null && s.lng != null);
    if (!hasStops && widget.trip.destination == null) {
      return;
    }

    // Defer map mount by 300ms so tab swipe and navigation animations settle cleanly
    _idleTimer = Timer(const Duration(milliseconds: 300), () {
      if (mounted) {
        setState(() => _mapReady = true);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final hasValidStops = widget.trip.stops.any((s) => s.lat != null && s.lng != null);

    return SizedBox(
      height: widget.height,
      width: double.infinity,
      child: Stack(
        fit: StackFit.expand,
        children: [
          if (_mapReady && hasValidStops)
            TripMapHero(
              trip: widget.trip,
              height: widget.height,
              onToneChange: widget.onToneChange,
              onReady: () {
                if (mounted) {
                  setState(() => _mapDrawn = true);
                }
              },
            ),
          TripPhotoHero(
            destination: widget.trip.destination,
            coverImageUrl: widget.trip.coverImageUrl,
            height: widget.height,
            isHidden: _mapDrawn,
          ),
        ],
      ),
    );
  }
}
