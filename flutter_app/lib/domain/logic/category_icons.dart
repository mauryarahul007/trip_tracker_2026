/// Which vector icon family a category belongs to (flag enableCategoryVectorIcons). Pure Dart so lib/domain stays
/// Flutter-free; lib/shared/theme/category_icons.dart turns a key into a Material IconData.
enum CategoryIconKey { food, stay, flight, transport, travel, shopping, activities, health, fees, misc }

/// Keyword rows; the first matching row wins, so specific words sit above broad ones.
const _rows = <(List<String>, CategoryIconKey)>[
  (['food', 'dining', 'drink', 'restaurant', 'meal', 'cafe', 'coffee', 'snack', 'grocer'], CategoryIconKey.food),
  (['stay', 'hotel', 'lodging', 'accommodation', 'hostel', 'airbnb'], CategoryIconKey.stay),
  (['flight', 'airfare', 'airline'], CategoryIconKey.flight),
  (['transport', 'taxi', 'uber', 'fuel', 'petrol', 'train', 'metro', 'parking', 'toll'], CategoryIconKey.transport),
  (['travel', 'trip', 'visa', 'tour'], CategoryIconKey.travel),
  (['shopping', 'shop', 'gift', 'souvenir', 'clothes'], CategoryIconKey.shopping),
  (['activit', 'entertain', 'ticket', 'sight', 'adventure', 'museum', 'movie'], CategoryIconKey.activities),
  (['health', 'medical', 'pharmacy', 'medicine', 'doctor'], CategoryIconKey.health),
  (['fees', 'tax', 'bank', 'insurance'], CategoryIconKey.fees),
  (['misc', 'other', 'general'], CategoryIconKey.misc),
];

/// Icon key for a known category name (or built-in id such as cat-food); null when nothing matches.
CategoryIconKey? categoryIconKeyFor({String? id, String? name}) {
  final raw = (name != null && name.trim().isNotEmpty ? name : (id ?? '')).toLowerCase();
  final k = raw.startsWith('cat-') ? raw.substring(4) : raw;
  if (k.isEmpty) return null;
  for (final (words, key) in _rows) {
    for (final w in words) {
      if (k.contains(w)) return key;
    }
  }
  return null;
}