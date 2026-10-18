/// A starter kit for a new trip: extra expense categories and a first packing checklist. Everything can be edited or
/// deleted afterwards; picking none starts the trip empty, as before.
class TripTemplate {
  const TripTemplate({required this.id, required this.categories, required this.checklist});

  final String id;

  /// Extra category names (the trip's usual categories stay).
  final List<String> categories;

  /// (text, checklist category) pairs; categories are packing, prep, documents, medical or general.
  final List<(String, String)> checklist;
}

const tripTemplates = <TripTemplate>[
  TripTemplate(
    id: 'weekend',
    categories: ['Brunch', 'Nightlife'],
    checklist: [
      ('Charger and power bank', 'packing'),
      ('Toiletries', 'packing'),
      ('Change of clothes', 'packing'),
      ('Book stay and tickets', 'prep'),
      ('ID and payment cards', 'documents'),
    ],
  ),
  TripTemplate(
    id: 'roadtrip',
    categories: ['Fuel', 'Tolls', 'Parking'],
    checklist: [
      ('Driving licence and car papers', 'documents'),
      ('Check tyres and fuel', 'prep'),
      ('Offline maps downloaded', 'prep'),
      ('Snacks and water', 'packing'),
      ('First-aid kit', 'medical'),
      ('Phone charger for the car', 'packing'),
    ],
  ),
  TripTemplate(
    id: 'groupstay',
    categories: ['Groceries', 'Utilities', 'Cleaning'],
    checklist: [
      ('Agree who books the stay', 'prep'),
      ('Shared grocery list', 'prep'),
      ('Towels and toiletries', 'packing'),
      ('ID for everyone at check-in', 'documents'),
    ],
  ),
];

TripTemplate? tripTemplateById(String? id) {
  for (final t in tripTemplates) {
    if (t.id == id) return t;
  }
  return null;
}

/// Template categories not already in [existing] (case-insensitive), so applying one never duplicates a name.
List<String> newCategoryNames(TripTemplate t, Iterable<String> existing) {
  final have = {for (final e in existing) e.trim().toLowerCase()};
  return [
    for (final c in t.categories)
      if (!have.contains(c.trim().toLowerCase())) c,
  ];
}
