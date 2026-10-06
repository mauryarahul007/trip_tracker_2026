import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../data/providers.dart';
import '../../../domain/logic/route_helper.dart';
import '../../../domain/models/trip.dart';
import '../places/place_suggest_service.dart';
import 'trip_map_hero.dart';

class TripRouteModal extends ConsumerStatefulWidget {
  final Trip trip;
  final VoidCallback? onClose;

  const TripRouteModal({super.key, required this.trip, this.onClose});

  @override
  ConsumerState<TripRouteModal> createState() => _TripRouteModalState();
}

class _TripRouteModalState extends ConsumerState<TripRouteModal> {
  late List<TripStop> _stops;
  final TextEditingController _addStopController = TextEditingController();
  List<PlaceSuggestion> _suggestions = [];
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    _stops = List.from(widget.trip.stops);
    _addStopController.addListener(_onQueryChanged);
  }

  @override
  void dispose() {
    _addStopController.removeListener(_onQueryChanged);
    _addStopController.dispose();
    super.dispose();
  }

  void _onQueryChanged() async {
    final query = _addStopController.text.trim();
    if (query.length < 2) {
      if (mounted) setState(() => _suggestions = []);
      return;
    }

    final results = await getPlaceSuggestions(query);
    if (mounted && _addStopController.text.trim() == query) {
      setState(() => _suggestions = results);
    }
  }

  void _addStop(String name) {
    final clean = name.trim();
    if (clean.isEmpty) {
      return;
    }

    final id = 'stop_${DateTime.now().millisecondsSinceEpoch}_${_stops.length}';
    setState(() {
      _stops.add(TripStop(id: id, name: clean));
      _addStopController.clear();
      _suggestions = [];
    });
  }

  void _removeStop(int index) {
    if (index >= 0 && index < _stops.length) {
      setState(() {
        _stops.removeAt(index);
      });
    }
  }

  void _moveStop(int from, int to) {
    if (from < 0 || from >= _stops.length || to < 0 || to >= _stops.length) {
      return;
    }
    setState(() {
      final item = _stops.removeAt(from);
      _stops.insert(to, item);
    });
  }

  Future<void> _saveRoute() async {
    setState(() => _isSaving = true);
    try {
      await ref.read(tripRepositoryProvider).setStops(widget.trip.id, _stops);
      if (mounted) {
        widget.onClose?.call();
        Navigator.of(context).maybePop();
      }
    } finally {
      if (mounted) {
        setState(() => _isSaving = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final previewTrip = Trip(
      id: widget.trip.id,
      name: widget.trip.name,
      startDate: widget.trip.startDate,
      endDate: widget.trip.endDate,
      baseCurrency: widget.trip.baseCurrency,
      ownerId: widget.trip.ownerId,
      joinCode: widget.trip.joinCode,
      destination: widget.trip.destination,
      stops: _stops,
      createdAt: widget.trip.createdAt,
      updatedAt: widget.trip.updatedAt,
    );

    final routeInfo = parseTripRoute(name: widget.trip.name, destination: widget.trip.destination, stops: _stops);

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Trip Route & Stops', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            Text(
              routeInfo.fullRoute,
              style: const TextStyle(fontSize: 11, color: Colors.blueGrey),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: _isSaving ? null : _saveRoute,
            child: _isSaving
                ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
                : const Text('Save', style: TextStyle(fontWeight: FontWeight.bold)),
          ),
        ],
      ),
      body: Column(
        children: [
          // Embedded Map Preview
          if (_stops.any((s) => s.lat != null && s.lng != null))
            SizedBox(
              height: 160,
              width: double.infinity,
              child: TripMapHero(trip: previewTrip, height: 160),
            ),

          // Add Stop Input with Autocomplete
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: TextField(
              controller: _addStopController,
              decoration: InputDecoration(
                hintText: 'Add stop or city...',
                prefixIcon: const Icon(Icons.add_location_alt_outlined),
                suffixIcon: _addStopController.text.isNotEmpty
                    ? IconButton(
                        tooltip: 'Clear',
                        icon: const Icon(Icons.clear, size: 16),
                        onPressed: () {
                          _addStopController.clear();
                          setState(() => _suggestions = []);
                        },
                      )
                    : null,
                filled: true,
                fillColor: const Color(0xFFF1F5F9),
                contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
              ),
              onSubmitted: _addStop,
            ),
          ),

          // Autocomplete suggestions dropdown
          if (_suggestions.isNotEmpty)
            Container(
              constraints: const Duration(milliseconds: 200) == Duration.zero
                  ? null
                  : const BoxConstraints(maxHeight: 180),
              margin: const EdgeInsets.symmetric(horizontal: 16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(8),
                boxShadow: [
                  BoxShadow(color: Colors.black.withValues(alpha: 0.1), blurRadius: 6, offset: const Offset(0, 3)),
                ],
              ),
              child: ListView.separated(
                shrinkWrap: true,
                itemCount: _suggestions.length,
                separatorBuilder: (_, index) => const Divider(height: 1),
                itemBuilder: (context, i) {
                  final s = _suggestions[i];
                  return ListTile(
                    dense: true,
                    leading: const Icon(Icons.place_outlined, size: 18, color: Colors.blueGrey),
                    title: Text(s.name, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                    subtitle: s.detail.isNotEmpty ? Text(s.detail, style: const TextStyle(fontSize: 11)) : null,
                    trailing: s.source == SuggestionSource.local
                        ? const Text('Offline', style: TextStyle(fontSize: 10, color: Colors.teal))
                        : null,
                    onTap: () => _addStop(s.name),
                  );
                },
              ),
            ),

          // Reorderable / Manageable Stops List
          Expanded(
            child: _stops.isEmpty
                ? Center(
                    child: Text(
                      'No route stops defined yet.\nAdd cities to plan your itinerary route.',
                      textAlign: TextAlign.center,
                      style: TextStyle(color: Colors.grey.shade500, fontSize: 13),
                    ),
                  )
                : ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    itemCount: _stops.length,
                    itemBuilder: (context, index) {
                      final stop = _stops[index];
                      final isOrigin = index == 0;
                      final isDest = index == _stops.length - 1 && _stops.length > 1;
                      final color = isOrigin
                          ? const Color(0xFF10B981)
                          : (isDest ? const Color(0xFFF43F5E) : const Color(0xFF3B82F6));

                      return Card(
                        margin: const EdgeInsets.symmetric(vertical: 4),
                        elevation: 1,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        child: ListTile(
                          leading: CircleAvatar(
                            radius: 14,
                            backgroundColor: color,
                            child: Text(
                              '${index + 1}',
                              style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold),
                            ),
                          ),
                          title: Text(stop.name, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                          subtitle: isOrigin
                              ? const Text(
                                  'Origin / Departure',
                                  style: TextStyle(fontSize: 11, color: Color(0xFF10B981)),
                                )
                              : (isDest
                                    ? const Text(
                                        'Final Destination',
                                        style: TextStyle(fontSize: 11, color: Color(0xFFF43F5E)),
                                      )
                                    : null),
                          trailing: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              if (index > 0)
                                IconButton(
                                  icon: const Icon(Icons.arrow_upward, size: 18),
                                  onPressed: () => _moveStop(index, index - 1),
                                  tooltip: 'Move Up',
                                ),
                              if (index < _stops.length - 1)
                                IconButton(
                                  icon: const Icon(Icons.arrow_downward, size: 18),
                                  onPressed: () => _moveStop(index, index + 1),
                                  tooltip: 'Move Down',
                                ),
                              IconButton(
                                icon: const Icon(Icons.delete_outline, size: 18, color: Colors.red),
                                onPressed: () => _removeStop(index),
                                tooltip: 'Remove Stop',
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }
}
