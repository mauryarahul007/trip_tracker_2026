import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/platform/map_gateway.dart';
import '../../../domain/models/trip.dart';
import 'road_route_service.dart';

class TripMapHero extends ConsumerStatefulWidget {
  final Trip trip;
  final VoidCallback? onReady;
  final ValueChanged<String>? onToneChange;
  final double height;

  const TripMapHero({super.key, required this.trip, this.onReady, this.onToneChange, this.height = 220});

  @override
  ConsumerState<TripMapHero> createState() => _TripMapHeroState();
}

class _TripMapHeroState extends ConsumerState<TripMapHero> {
  List<({double lat, double lng})>? _roadCoordinates;
  bool _fetchingRoute = false;

  @override
  void initState() {
    super.initState();
    widget.onToneChange?.call('dark');
    _loadRoadRoute();
  }

  @override
  void didUpdateWidget(covariant TripMapHero oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.trip.stops != widget.trip.stops) {
      _loadRoadRoute();
    }
  }

  List<TripStop> get _validStops {
    return widget.trip.stops.where((s) => s.lat != null && s.lng != null).toList();
  }

  Future<void> _loadRoadRoute() async {
    final valid = _validStops;
    if (valid.length < 2) return;

    setState(() => _fetchingRoute = true);
    final coords = valid.map((s) => (lat: s.lat!, lng: s.lng!)).toList();
    final road = await fetchRoadRoute(coords);
    if (mounted) {
      setState(() {
        _roadCoordinates = road;
        _fetchingRoute = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final valid = _validStops;
    final center = valid.isNotEmpty
        ? (lat: valid.first.lat!, lng: valid.first.lng!)
        : const (lat: 20.5937, lng: 78.9629);

    final markers = <MapMarker>[];
    for (var i = 0; i < valid.length; i++) {
      final s = valid[i];
      final isFirst = i == 0;
      final isLast = i == valid.length - 1;
      final color = isFirst ? const Color(0xFF10B981) : (isLast ? const Color(0xFFF43F5E) : const Color(0xFF3B82F6));

      markers.add(MapMarker(id: s.id, lat: s.lat!, lng: s.lng!, label: '${i + 1}', title: s.name, color: color));
    }

    final routes = <MapRouteLine>[];
    if (valid.length >= 2) {
      final points = _roadCoordinates ?? valid.map((s) => (lat: s.lat!, lng: s.lng!)).toList();

      routes.add(
        MapRouteLine(
          id: 'route_glow',
          coordinates: points,
          color: const Color(0xFF2559E6).withValues(alpha: 0.6),
          strokeWidth: 6.0,
          glow: true,
        ),
      );
      routes.add(MapRouteLine(id: 'route_main', coordinates: points, color: const Color(0xFF2DD4E0), strokeWidth: 3.5));
    }

    final mapGateway = ref.watch(mapGatewayProvider);

    return SizedBox(
      height: widget.height,
      width: double.infinity,
      child: Stack(
        children: [
          mapGateway.buildMap(
            context: context,
            initialLat: center.lat,
            initialLng: center.lng,
            initialZoom: valid.length > 1 ? 9.0 : 12.0,
            markers: markers,
            routes: routes,
            padding: const EdgeInsets.only(top: 80, bottom: 20, left: 30, right: 30),
            onMapReady: widget.onReady,
          ),
          if (_fetchingRoute)
            Positioned(
              bottom: 8,
              right: 8,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: Colors.black.withValues(alpha: 0.6),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: const Text('Routing...', style: TextStyle(color: Colors.white70, fontSize: 10)),
              ),
            ),
        ],
      ),
    );
  }
}
