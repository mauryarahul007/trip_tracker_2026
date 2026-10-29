import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../domain/logic/resolve_trip_stops.dart';
import '../../../domain/models/trip.dart';
import 'trip_map_hero.dart';
import 'trip_photo_hero.dart';

class DeferredTripMapHero extends ConsumerStatefulWidget {
  final Trip trip;
  final ValueChanged<String>? onToneChange;
  final double height;

  const DeferredTripMapHero({super.key, required this.trip, this.onToneChange, this.height = 220});

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
    if (oldWidget.trip.id != widget.trip.id ||
        oldWidget.trip.destination != widget.trip.destination ||
        oldWidget.trip.stops != widget.trip.stops) {
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

    // 1. Minimum photo presentation timer: user sees the destination image for 1.8s
    _minPhotoTimer = Timer(_minPhotoDuration, () {
      if (!mounted) return;
      _photoMinElapsed = true;
      if (_mapSignalsReady) {
        setState(() => _mapDrawn = true);
      }
    });

    // 2. Defer map mount by 250ms so tab swipe and navigation animations settle cleanly
    _idleTimer = Timer(const Duration(milliseconds: 250), () {
      if (mounted) {
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
          if (_mapReady && hasValidStops)
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
            isHidden: _mapDrawn,
          ),
        ],
      ),
    );
  }
}
