import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

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

/// Fallback interactive vector canvas implementation for environments without native C++ MapLibre binaries.
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
    return _InteractiveCanvasMap(
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
      color: const Color(0xFFE2E8F0),
      child: Stack(
        children: [
          Center(
            child: Text(
              'FakeMap [${initialLat.toStringAsFixed(2)}, ${initialLng.toStringAsFixed(2)}] @ ${initialZoom}x',
              style: const TextStyle(fontSize: 10, color: Colors.blueGrey),
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
                  decoration: BoxDecoration(color: marker.color ?? Colors.blue, shape: BoxShape.circle),
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

class _InteractiveCanvasMap extends StatefulWidget {
  final double initialLat;
  final double initialLng;
  final double initialZoom;
  final List<MapMarker> markers;
  final List<MapRouteLine> routes;
  final EdgeInsets padding;
  final VoidCallback? onMapReady;

  const _InteractiveCanvasMap({
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
  State<_InteractiveCanvasMap> createState() => _InteractiveCanvasMapState();
}

class _InteractiveCanvasMapState extends State<_InteractiveCanvasMap> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      widget.onMapReady?.call();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      color: const Color(0xFFF1F5F9),
      child: CustomPaint(
        painter: _MapCanvasPainter(markers: widget.markers, routes: widget.routes),
        child: Stack(
          children: [
            for (final marker in widget.markers)
              Positioned(
                key: Key('map_marker_${marker.id}'),
                left: 30,
                top: 30,
                child: GestureDetector(
                  onTap: marker.onTap,
                  child: Container(
                    decoration: BoxDecoration(color: marker.color ?? Colors.teal, shape: BoxShape.circle),
                    padding: const EdgeInsets.all(4),
                    child: Text(marker.icon ?? '📍'),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _MapCanvasPainter extends CustomPainter {
  final List<MapMarker> markers;
  final List<MapRouteLine> routes;

  _MapCanvasPainter({required this.markers, required this.routes});

  @override
  void paint(Canvas canvas, Size size) {
    final bgPaint = Paint()..color = const Color(0xFFE8EEF5);
    canvas.drawRect(Offset.zero & size, bgPaint);

    for (final route in routes) {
      if (route.coordinates.length < 2) continue;
      final paint = Paint()
        ..color = route.color
        ..strokeWidth = route.strokeWidth
        ..style = PaintingStyle.stroke
        ..strokeCap = StrokeCap.round;

      final path = Path();
      // Draw simulated subtle curve across the viewport
      path.moveTo(size.width * 0.15, size.height * 0.35);
      path.quadraticBezierTo(size.width * 0.5, size.height * 0.7, size.width * 0.85, size.height * 0.4);
      canvas.drawPath(path, paint);
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => true;
}

final mapGatewayProvider = Provider<MapGateway>((ref) {
  return const DefaultMapGateway();
});
