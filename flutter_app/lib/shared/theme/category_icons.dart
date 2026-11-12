import 'package:flutter/material.dart';

import '../../domain/logic/category_icons.dart';
import '../../domain/models/category.dart';

/// Material icon for a known category name or id; null when nothing matches.
IconData? categoryVectorIcon({String? id, String? name}) => switch (categoryIconKeyFor(id: id, name: name)) {
  CategoryIconKey.food => Icons.restaurant_rounded,
  CategoryIconKey.stay => Icons.hotel_rounded,
  CategoryIconKey.flight => Icons.flight_rounded,
  CategoryIconKey.transport => Icons.directions_car_rounded,
  CategoryIconKey.travel => Icons.flight_takeoff_rounded,
  CategoryIconKey.shopping => Icons.shopping_bag_rounded,
  CategoryIconKey.activities => Icons.local_activity_rounded,
  CategoryIconKey.health => Icons.medical_services_rounded,
  CategoryIconKey.fees => Icons.receipt_long_rounded,
  CategoryIconKey.misc => Icons.category_rounded,
  null => null,
};

bool _hasEmoji(String? icon) => icon != null && icon.isNotEmpty && !icon.contains(':');

/// Category tile glyph. With [vector] on, a known category gets a Material icon; otherwise (or when unknown)
/// the category's own emoji string, else a neutral tag icon. With [vector] off it is always emoji, else tag.
Widget categoryGlyph(Category? cat, double size, Color color, {bool vector = false}) {
  if (vector) {
    final icon = categoryVectorIcon(id: cat?.id, name: cat?.name);
    if (icon != null) return Icon(icon, size: size, color: color);
  }
  final emoji = cat?.icon;
  if (_hasEmoji(emoji)) return Text(emoji!, style: TextStyle(fontSize: size));
  return Icon(Icons.sell_outlined, size: size, color: color);
}