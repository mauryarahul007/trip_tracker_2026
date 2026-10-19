import 'package:flutter_test/flutter_test.dart';
import 'package:trip_tracker/domain/logic/trip_templates.dart';

void main() {
  test('three templates, each with starter categories and a checklist in known categories', () {
    expect(tripTemplates.map((t) => t.id), ['weekend', 'roadtrip', 'groupstay']);
    const known = {'packing', 'prep', 'documents', 'medical', 'general'};
    for (final t in tripTemplates) {
      expect(t.categories, isNotEmpty);
      expect(t.checklist, isNotEmpty);
      expect(t.checklist.map((c) => c.$2).toSet().difference(known), isEmpty, reason: t.id);
    }
  });

  test('lookup by id, and an unknown or empty id means no template', () {
    expect(tripTemplateById('roadtrip')?.categories, contains('Fuel'));
    expect(tripTemplateById(null), isNull);
    expect(tripTemplateById('nope'), isNull);
  });

  test('applying never duplicates a category the trip already has, ignoring case', () {
    final road = tripTemplateById('roadtrip')!;
    expect(newCategoryNames(road, ['Food', 'fuel', ' TOLLS ']), ['Parking']);
    expect(newCategoryNames(road, const []), ['Fuel', 'Tolls', 'Parking']);
  });
}
