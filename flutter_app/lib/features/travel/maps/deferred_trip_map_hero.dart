import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../domain/logic/resolve_trip_stops.dart';
import '../../../domain/models/trip.dart';
import 'trip_map_hero.dart';
import 'trip_photo_hero.dart';

/// Reactive provider for resolved trip stops with valid coordinates.
final resolvedTripStopsProvider = FutureProvider.family<List<TripStop>, Trip>((ref, trip) async {
  return resolveTripStops(trip);
});

class DeferredTripMapHero extends ConsumerStatefulWidget {
  final Trip trip;
  final ValueChanged<String>? onToneChange;
  final double height;

  /// When false (collapsed sheet / map closed), keep the static cover only — never mount the map engine.
  final bool mountMap;

  const DeferredTripMapHero({
    super.key,
    required this.trip,
    this.onToneChange,
    this.height = 220,
    this.mountMap = true,
  });

  @override
  ConsumerState<DeferredTripMapHero> createState() => _DeferredTripMapHeroState();
}

class _DeferredTripMapHeroState extends ConsumerState<DeferredTripMapHero> {
  bool _mapReady = false;
  bool _mapDrawn = false;
  bool _mapSignalsReady = false;
  bool _photoMinElapsed = false;
  Timer? _idleTimer;
  Timer? _minPhotoTimer;

  static const Duration _minPhotoDuration = Duration(milliseconds: 1800);

  @override
  void initState() {
    super.initState();
    _startPresentationCycle();
  }

  @override
  void didUpdateWidget(covariant DeferredTripMapHero oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (!widget.mountMap) {
      _idleTimer?.cancel();
      _minPhotoTimer?.cancel();
      if (_mapReady || _mapDrawn) {
        setState(() {
          _mapReady = false;
          _mapDrawn = false;
          _mapSignalsReady = false;
        });
      }
      return;
    }
    if (oldWidget.trip.id != widget.trip.id ||
        oldWidget.trip.destination != widget.trip.destination ||
        oldWidget.trip.stops != widget.trip.stops ||
        (!oldWidget.mountMap && widget.mountMap)) {
      _mapReady = false;
      _mapDrawn = false;
      _mapSignalsReady = false;
      _photoMinElapsed = false;
      _startPresentationCycle();
    }
  }

  @override
  void dispose() {
    _idleTimer?.cancel();
    _minPhotoTimer?.cancel();
    super.dispose();
  }

  void _startPresentationCycle() {
    _idleTimer?.cancel();
    _minPhotoTimer?.cancel();
    if (!widget.mountMap) return;

    // 1. Minimum photo presentation timer: user sees the destination image for 1.8s
    _minPhotoTimer = Timer(_minPhotoDuration, () {
      if (!mounted || !widget.mountMap) return;
      _photoMinElapsed = true;
      if (_mapSignalsReady) {
        setState(() => _mapDrawn = true);
      }
    });

    // 2. Defer map mount by 250ms so tab swipe and navigation animations settle cleanly
    _idleTimer = Timer(const Duration(milliseconds: 250), () {
      if (mounted && widget.mountMap) {
        setState(() => _mapReady = true);
      }
    });
  }

  void _onMapReady() {
    if (!mounted) return;
    _mapSignalsReady = true;
    if (_photoMinElapsed) {
      setState(() => _mapDrawn = true);
    }
  }

  @override
  Widget build(BuildContext context) {
    // Resolve stops: either existing stops or parsed destination geocodes
    final resolvedStopsAsync = ref.watch(resolvedTripStopsProvider(widget.trip));
    final resolvedStops =
        resolvedStopsAsync.value ?? widget.trip.stops.where((s) => s.lat != null && s.lng != null).toList();
    final hasValidStops = resolvedStops.isNotEmpty;

    return SizedBox(
      height: widget.height,
      width: double.infinity,
      child: Stack(
        fit: StackFit.expand,
        children: [
          if (widget.mountMap && _mapReady && hasValidStops)
            TripMapHero(
              trip: widget.trip,
              stops: resolvedStops,
              height: widget.height,
              onToneChange: widget.onToneChange,
              onReady: _onMapReady,
            ),
          TripPhotoHero(
            destination: widget.trip.destination?.isNotEmpty == true ? widget.trip.destination : widget.trip.name,
            tripName: widget.trip.name,
            coverImageUrl: widget.trip.coverImageUrl,
            height: widget.height,
            isHidden: widget.mountMap && _mapDrawn,
          ),
        ],
      ),
    );
  }
}
