import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:trip_tracker/domain/logic/category_icons.dart';
import 'package:trip_tracker/domain/models/category.dart';
import 'package:trip_tracker/shared/theme/category_icons.dart';

void main() {
  test('common names and built-in ids resolve to an icon key', () {
    expect(categoryIconKeyFor(name: 'Food'), CategoryIconKey.food);
    expect(categoryIconKeyFor(id: 'cat-stay', name: ''), CategoryIconKey.stay);
    expect(categoryIconKeyFor(name: 'Transport'), CategoryIconKey.transport);
    expect(categoryIconKeyFor(name: 'Travel'), CategoryIconKey.travel);
    expect(categoryIconKeyFor(name: 'Shopping'), CategoryIconKey.shopping);
    expect(categoryIconKeyFor(name: 'Quokka care'), isNull);
  });

  test('glyph: vector for known names, else emoji, else tag icon; flag off is emoji / tag only', () {
    const food = Category(id: 'cat-food', name: 'Food', icon: '🍔');
    const odd = Category(id: 'c1', name: 'Quokka care', icon: '🦘');
    const bare = Category(id: 'c2', name: 'Quokka care');

    Icon? iconOf(Widget w) => w is Icon ? w : null;
    expect(iconOf(categoryGlyph(food, 20, Colors.black, vector: true))?.icon, Icons.restaurant_rounded);
    expect(categoryGlyph(food, 20, Colors.black), isA<Text>()); // flag off: the emoji stays
    expect(categoryGlyph(odd, 20, Colors.black, vector: true), isA<Text>()); // unknown name: emoji fallback
    expect(iconOf(categoryGlyph(bare, 20, Colors.black, vector: true))?.icon, Icons.sell_outlined);
    expect(iconOf(categoryGlyph(null, 20, Colors.black))?.icon, Icons.sell_outlined);
  });
}
