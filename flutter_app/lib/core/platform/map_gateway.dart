import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:latlong2/latlong.dart';

import '../../shared/theme/app_colors.dart';

class MapMarker {
  final String id;
  final double lat;
  final double lng;
  final String? label;
  final String? title;
  final String? subtitle;
  final Color? color;
  final String? icon;
  final VoidCallback? onTap;

  const MapMarker({
    required this.id,
    required this.lat,
    required this.lng,
    this.label,
    this.title,
    this.subtitle,
    this.color,
    this.icon,
    this.onTap,
  });
}

class MapRouteLine {
  final String id;
  final List<({double lat, double lng})> coordinates;
  final Color color;
  final double strokeWidth;
  final bool glow;

  const MapRouteLine({
    required this.id,
    required this.coordinates,
    required this.color,
    this.strokeWidth = 3.5,
    this.glow = false,
  });
}

abstract class MapGateway {
  Widget buildMap({
    required BuildContext context,
    required double initialLat,
    required double initialLng,
    double initialZoom = 10.0,
    List<MapMarker> markers = const [],
    List<MapRouteLine> routes = const [],
    EdgeInsets padding = EdgeInsets.zero,
    VoidCallback? onMapReady,
    Key? key,
  });
}

/// Live interactive vector and raster tile map engine backed by OpenStreetMap.
/// 100% pure Dart, 0 native C++ dependencies, keyless, and cross-platform.
class DefaultMapGateway implements MapGateway {
  const DefaultMapGateway();

  @override
  Widget buildMap({
    required BuildContext context,
    required double initialLat,
    required double initialLng,
    double initialZoom = 10.0,
    List<MapMarker> markers = const [],
    List<MapRouteLine> routes = const [],
    EdgeInsets padding = EdgeInsets.zero,
    VoidCallback? onMapReady,
    Key? key,
  }) {
    return _LiveFlutterMap(
      key: key,
      initialLat: initialLat,
      initialLng: initialLng,
      initialZoom: initialZoom,
      markers: markers,
      routes: routes,
      padding: padding,
      onMapReady: onMapReady,
    );
  }
}

class _LiveFlutterMap extends StatefulWidget {
  final double initialLat;
  final double initialLng;
  final double initialZoom;
  final List<MapMarker> markers;
  final List<MapRouteLine> routes;
  final EdgeInsets padding;
  final VoidCallback? onMapReady;

  const _LiveFlutterMap({
    super.key,
    required this.initialLat,
    required this.initialLng,
    required this.initialZoom,
    required this.markers,
    required this.routes,
    required this.padding,
    this.onMapReady,
  });

  @override
  State<_LiveFlutterMap> createState() => _LiveFlutterMapState();
}

class _LiveFlutterMapState extends State<_LiveFlutterMap> {
  late final MapController _mapController;

  @override
  void initState() {
    super.initState();
    _mapController = MapController();
  }

  @override
  void dispose() {
    _mapController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final points = <LatLng>[];
    for (final m in widget.markers) {
      points.add(LatLng(m.lat, m.lng));
    }
    for (final r in widget.routes) {
      for (final c in r.coordinates) {
        points.add(LatLng(c.lat, c.lng));
      }
    }

    final initialCenter = LatLng(widget.initialLat, widget.initialLng);

    CameraFit? cameraFit;
    if (points.length >= 2) {
      cameraFit = CameraFit.bounds(
        bounds: LatLngBounds.fromPoints(points),
        padding: widget.padding == EdgeInsets.zero
            ? const EdgeInsets.symmetric(horizontal: 32, vertical: 48)
            : widget.padding,
      );
    }

    return FlutterMap(
      mapController: _mapController,
      options: MapOptions(
        initialCenter: initialCenter,
        initialZoom: widget.initialZoom,
        initialCameraFit: cameraFit,
        interactionOptions: const InteractionOptions(flags: InteractiveFlag.all & ~InteractiveFlag.rotate),
        onMapReady: () {
          widget.onMapReady?.call();
        },
      ),
      children: [
        // OpenStreetMap raster tile layer (Free, keyless, global)
        TileLayer(
          urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
          userAgentPackageName: 'com.triptracker.app',
          maxZoom: 19,
        ),

        // Route polyline layer (road-following OSRM or straight-line fallback)
        if (widget.routes.isNotEmpty)
          PolylineLayer(
            polylines: [
              for (final route in widget.routes)
                Polyline(
                  points: route.coordinates.map((c) => LatLng(c.lat, c.lng)).toList(),
                  strokeWidth: route.strokeWidth,
                  color: route.color,
                  strokeCap: StrokeCap.round,
                  strokeJoin: StrokeJoin.round,
                ),
            ],
          ),

        // Stop and destination markers
        if (widget.markers.isNotEmpty)
          MarkerLayer(
            markers: [
              for (final m in widget.markers)
                Marker(
                  key: Key('map_marker_${m.id}'),
                  point: LatLng(m.lat, m.lng),
                  width: 38,
                  height: 38,
                  child: GestureDetector(
                    onTap: m.onTap,
                    child: Container(
                      decoration: BoxDecoration(
                        color: m.color ?? AppColors.calmTeal,
                        shape: BoxShape.circle,
                        border: Border.all(color: Colors.white, width: 2),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.35),
                            blurRadius: 6,
                            offset: const Offset(0, 2),
                          ),
                        ],
                      ),
                      alignment: Alignment.center,
                      child: Text(
                        m.icon ?? m.label ?? '📍',
                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white),
                      ),
                    ),
                  ),
                ),
            ],
          ),
      ],
    );
  }
}

/// Fake map gateway for headless test suites and widget tests.
class FakeMapGateway implements MapGateway {
  final bool callOnReadyImmediately;

  const FakeMapGateway({this.callOnReadyImmediately = true});

  @override
  Widget buildMap({
    required BuildContext context,
    required double initialLat,
    required double initialLng,
    double initialZoom = 10.0,
    List<MapMarker> markers = const [],
    List<MapRouteLine> routes = const [],
    EdgeInsets padding = EdgeInsets.zero,
    VoidCallback? onMapReady,
    Key? key,
  }) {
    if (callOnReadyImmediately && onMapReady != null) {
      WidgetsBinding.instance.addPostFrameCallback((_) => onMapReady());
    }

    return Container(
      key: key ?? const Key('fake_map_canvas'),
      color: AppColors.calmLine,
      child: Stack(
        children: [
          Center(
            child: Text(
              'FakeMap [${initialLat.toStringAsFixed(2)}, ${initialLng.toStringAsFixed(2)}] @ ${initialZoom}x',
              style: const TextStyle(fontSize: 10, color: AppColors.calmMute),
            ),
          ),
          for (final route in routes) SizedBox(key: Key('map_route_${route.id}')),
          for (final marker in markers)
            Positioned(
              left: 20,
              top: 20,
              child: GestureDetector(
                key: Key('map_marker_${marker.id}'),
                onTap: marker.onTap,
                child: Container(
                  padding: const EdgeInsets.all(4),
                  decoration: BoxDecoration(color: marker.color ?? AppColors.calmTeal, shape: BoxShape.circle),
                  child: Text(
                    marker.icon ?? marker.label ?? '📍',
                    style: const TextStyle(fontSize: 12, color: Colors.white),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

final mapGatewayProvider = Provider<MapGateway>((ref) {
  return const DefaultMapGateway();
});
