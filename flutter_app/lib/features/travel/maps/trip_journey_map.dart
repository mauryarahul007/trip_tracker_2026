import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/platform/map_gateway.dart';
import '../../../domain/logic/currency.dart';
import '../../../domain/models/category.dart';
import '../../../domain/models/expense.dart';

class TripJourneyMap extends ConsumerStatefulWidget {
  final List<Expense> expenses;
  final List<Category> categories;
  final String baseCurrency;
  final double height;

  const TripJourneyMap({
    super.key,
    required this.expenses,
    required this.categories,
    required this.baseCurrency,
    this.height = 360,
  });

  @override
  ConsumerState<TripJourneyMap> createState() => _TripJourneyMapState();
}

class _TripJourneyMapState extends ConsumerState<TripJourneyMap> {
  Expense? _selectedExpense;

  @override
  Widget build(BuildContext context) {
    final geotagged =
        widget.expenses
            .where((e) => e.deletedAt == null && e.location != null && e.location!.lat != 0.0 && e.location!.lng != 0.0)
            .toList()
          ..sort((a, b) {
            final dCmp = a.date.compareTo(b.date);
            if (dCmp != 0) return dCmp;
            return a.createdAt.compareTo(b.createdAt);
          });

    if (geotagged.isEmpty) {
      return Container(
        height: widget.height,
        color: const Color(0xFFF8FAFC),
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.map_outlined, size: 40, color: Colors.blueGrey.shade300),
              const SizedBox(height: 8),
              Text('No geotagged expenses yet', style: TextStyle(color: Colors.blueGrey.shade600, fontSize: 13)),
              const SizedBox(height: 4),
              Text(
                'Add locations to expenses to see your trip timeline map',
                style: TextStyle(color: Colors.blueGrey.shade400, fontSize: 11),
              ),
            ],
          ),
        ),
      );
    }

    final catMap = {for (final c in widget.categories) c.id: c};
    final currencySymbol = getCurrencySymbol(widget.baseCurrency);

    final markers = <MapMarker>[];
    final waypoints = <({double lat, double lng})>[];

    for (var idx = 0; idx < geotagged.length; idx++) {
      final exp = geotagged[idx];
      final loc = exp.location!;
      final cat = catMap[exp.category];
      final emoji = cat?.icon ?? '📍';
      waypoints.add((lat: loc.lat, lng: loc.lng));

      markers.add(
        MapMarker(
          id: exp.id,
          lat: loc.lat,
          lng: loc.lng,
          label: '#${idx + 1}',
          title: exp.title,
          subtitle: loc.placeName ?? exp.date,
          icon: emoji,
          color: const Color(0xFF2559E6),
          onTap: () {
            setState(() => _selectedExpense = exp);
          },
        ),
      );
    }

    final routes = <MapRouteLine>[
      if (waypoints.length >= 2)
        MapRouteLine(id: 'journey_path', coordinates: waypoints, color: const Color(0xFF2DD4E0), strokeWidth: 3.0),
    ];

    final firstLoc = geotagged.first.location!;
    final mapGateway = ref.watch(mapGatewayProvider);

    return SizedBox(
      height: widget.height,
      child: Stack(
        children: [
          mapGateway.buildMap(
            context: context,
            initialLat: firstLoc.lat,
            initialLng: firstLoc.lng,
            initialZoom: 12.0,
            markers: markers,
            routes: routes,
          ),
          if (_selectedExpense != null)
            Positioned(
              left: 16,
              right: 16,
              bottom: 16,
              child: Card(
                elevation: 4,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: const Color(0xFF2559E6).withValues(alpha: 0.1),
                          shape: BoxShape.circle,
                        ),
                        child: Text(
                          catMap[_selectedExpense!.category]?.icon ?? '📍',
                          style: const TextStyle(fontSize: 18),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              _selectedExpense!.title,
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            if (_selectedExpense!.location?.placeName != null)
                              Text(
                                _selectedExpense!.location!.placeName!,
                                style: const TextStyle(fontSize: 11, color: Colors.blueGrey),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                          ],
                        ),
                      ),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            '$currencySymbol${formatMoneyNumber(_selectedExpense!.amount)}',
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                          ),
                          Text(_selectedExpense!.date, style: const TextStyle(fontSize: 10, color: Colors.grey)),
                        ],
                      ),
                      IconButton(
                        tooltip: MaterialLocalizations.of(context).closeButtonTooltip,
                        icon: const Icon(Icons.close, size: 16),
                        onPressed: () => setState(() => _selectedExpense = null),
                      ),
                    ],
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
