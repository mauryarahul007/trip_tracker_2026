import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:trip_tracker/domain/logic/category_color.dart';
import 'package:trip_tracker/domain/logic/default_categories.g.dart';

void main() {
  final fx = jsonDecode(
    File('../docs/flutter-migration/fixtures/category_colors.json').readAsStringSync(),
  ) as Map<String, dynamic>;

  test('category colour matches the web for built-ins, custom ids, emoji and empty ids', () {
    for (final c in fx['cases'] as List) {
      expect(categoryColorCss(c['id'] as String), c['color'], reason: 'id "${c['id']}"');
    }
  });

  test('ARGB conversion: hex passes through, hsl converts to a sensible opaque colour', () {
    expect(categoryColorArgb('cat-food'), 0xFF6366F1);
    final c = categoryColorArgb('a'); // hsl(97, 65%, 55%) ~ a green
    expect(c >> 24, 0xFF);
    final r = (c >> 16) & 0xFF, g = (c >> 8) & 0xFF, b = c & 0xFF;
    expect(g, greaterThan(r));
    expect(g, greaterThan(b));
  });

  test('generated default categories equal the web list (ids, names, icons, built-in flag)', () {
    final want = fx['defaults'] as List;
    expect(defaultCategories.length, want.length);
    for (var i = 0; i < want.length; i++) {
      expect(defaultCategories[i].id, want[i]['id']);
      expect(defaultCategories[i].name, want[i]['name']);
      expect(defaultCategories[i].icon, want[i]['icon']);
      expect(defaultCategories[i].isCustom, want[i]['isCustom']);
    }
  });
}
