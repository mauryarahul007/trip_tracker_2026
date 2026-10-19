import '../models/category.dart';
import '../models/expense.dart';

class ParsedCategoryIcon {
  final String color;
  final String iconName;
  final bool isEmoji;

  const ParsedCategoryIcon({required this.color, required this.iconName, required this.isEmoji});

  Map<String, dynamic> toJson() => {'color': color, 'iconName': iconName, 'isEmoji': isEmoji};
}

ParsedCategoryIcon parseCategoryIcon(String? iconString) {
  if (iconString == null || iconString.isEmpty) {
    return const ParsedCategoryIcon(color: 'var(--primary-accent)', iconName: 'Compass', isEmoji: false);
  }

  if (iconString.contains(':')) {
    final parts = iconString.split(':');
    return ParsedCategoryIcon(
      color: parts[0].isNotEmpty ? parts[0] : 'var(--primary-accent)',
      iconName: parts.length > 1 && parts[1].isNotEmpty ? parts[1] : 'Compass',
      isEmoji: false,
    );
  }

  final isEmoji = !RegExp(r'^[\x20-\x7E]+$').hasMatch(iconString);
  if (isEmoji) {
    return ParsedCategoryIcon(color: 'var(--border-color)', iconName: iconString, isEmoji: true);
  }

  return ParsedCategoryIcon(color: 'var(--primary-accent)', iconName: iconString, isEmoji: false);
}

String serializeCategoryIcon(String color, [String? iconName]) {
  if (iconName == null) {
    return '[object Object]:undefined';
  }
  return '$color:$iconName';
}

const Map<String, List<String>> top50Brands = {
  'cat-food': [
    'swiggy',
    'zomato',
    'starbucks',
    'mcdonald',
    'mcdonalds',
    'kfc',
    'burger king',
    'dominos',
    'pizza hut',
    'subway',
    'blinkit',
    'zepto',
    'instamart',
    'dunkin',
    'chai point',
    'blue tokai',
  ],
  'cat-travel': [
    'uber',
    'ola',
    'rapido',
    'indigo',
    'air india',
    'spicejet',
    'makemytrip',
    'irctc',
    'redbus',
    'shell',
    'hpcl',
    'bpcl',
    'indianoil',
    'fastag',
    'grab',
    'lyft',
  ],
  'cat-stay': ['airbnb', 'booking.com', 'agoda', 'oyo', 'marriott', 'hilton', 'hyatt', 'taj', 'zostel', 'hostelworld'],
  'cat-activities': ['bookmyshow', 'klook', 'getyourguide', 'disney', 'universal studios', 'imax', 'pvr'],
  'cat-shopping': ['zara', 'h&m', 'uniqlo', 'decathlon', 'amazon', 'flipkart', 'duty free'],
  'cat-misc': ['apollo pharmacy', 'medplus', 'airtel', 'jio', 'google pay', 'forex'],
};

const Map<String, List<String>> top50Items = {
  'cat-food': [
    'milk',
    'maggi',
    'maggie',
    'bread',
    'eggs',
    'butter',
    'coffee',
    'chai',
    'tea',
    'beer',
    'wine',
    'whiskey',
    'pizza',
    'burger',
    'biryani',
    'breakfast',
    'lunch',
    'dinner',
    'snacks',
    'chips',
    'water',
    'groceries',
    'ice cream',
  ],
  'cat-travel': [
    'petrol',
    'diesel',
    'fuel',
    'toll',
    'parking',
    'flight',
    'train',
    'bus',
    'metro',
    'cab',
    'taxi',
    'auto',
    'rickshaw',
    'scooter rental',
    'car rental',
    'driver tip',
  ],
  'cat-stay': [
    'hotel',
    'hostel',
    'resort',
    'homestay',
    'villa',
    'room service',
    'late checkout',
    'city tax',
    'lodge',
    'dorm',
  ],
  'cat-activities': [
    'museum',
    'tickets',
    'safari',
    'scuba',
    'diving',
    'trek',
    'tour guide',
    'cinema',
    'movie',
    'theme park',
    'monument',
  ],
  'cat-shopping': ['shopping', 'souvenir', 'gifts', 'clothes', 'shoes', 'jacket', 'sunglasses', 'sunscreen'],
  'cat-misc': [
    'medicine',
    'pharmacy',
    'bandaid',
    'sim card',
    'esim',
    'laundry',
    'tips',
    'atm fee',
    'currency exchange',
  ],
};

bool _keywordMatchesText(String keyword, String text) {
  if (keyword.isEmpty || text.isEmpty) return false;
  final escaped = RegExp.escape(keyword.trim());
  final pattern = RegExp('(^|\\s|[.,!?;:()/\'"\\[\\]])$escaped(\$|\\s|[.,!?;:()/\'"\\[\\]])', caseSensitive: false);
  return pattern.hasMatch(text);
}

String? autoSuggestCategory(String titleText, List<Category> categories, [List<Expense>? historicalExpenses]) {
  final cleanText = titleText.trim();
  if (cleanText.isEmpty) return null;

  final activeCategoryIds = categories.map((c) => c.id).toSet();

  // Priority 0: Historical Trip Memory
  if (historicalExpenses != null && historicalExpenses.isNotEmpty) {
    final lowerClean = cleanText.toLowerCase();
    for (final exp in historicalExpenses) {
      if (activeCategoryIds.contains(exp.category)) {
        final expTitle = exp.title.trim().toLowerCase();
        if (expTitle == lowerClean ||
            (lowerClean.length >= 3 && expTitle.contains(lowerClean)) ||
            (expTitle.length >= 3 && lowerClean.contains(expTitle))) {
          return exp.category;
        }
      }
    }
  }

  // Priority 1: Brand Match (Top 50 Brands)
  for (final entry in top50Brands.entries) {
    if (activeCategoryIds.contains(entry.key)) {
      for (final brand in entry.value) {
        if (_keywordMatchesText(brand, cleanText)) {
          return entry.key;
        }
      }
    }
  }

  // Priority 2: Item Match
  // 2a. Custom category keywords
  for (final cat in categories) {
    if (cat.keywords.isNotEmpty) {
      for (final kw in cat.keywords) {
        if (_keywordMatchesText(kw, cleanText)) {
          return cat.id;
        }
      }
    }
  }

  // 2b. Top 50 Items
  for (final entry in top50Items.entries) {
    if (activeCategoryIds.contains(entry.key)) {
      for (final item in entry.value) {
        if (_keywordMatchesText(item, cleanText)) {
          return entry.key;
        }
      }
    }
  }

  // Priority 3: Custom Category Name Match
  for (final c in categories) {
    if (c.isCustom == true) {
      final cleanName = c.name.toLowerCase().replaceAll('&', ' ').trim();
      final words = cleanName.split(RegExp(r'\s+')).where((w) => w.length > 2);
      for (final word in words) {
        if (_keywordMatchesText(word, cleanText)) {
          return c.id;
        }
      }
    }
  }

  // Priority 4: Default Category Name Match
  for (final c in categories) {
    if (c.isCustom != true) {
      final cleanName = c.name.toLowerCase().replaceAll('&', ' ').trim();
      final words = cleanName.split(RegExp(r'\s+')).where((w) => w.length > 2);
      for (final word in words) {
        if (_keywordMatchesText(word, cleanText)) {
          return c.id;
        }
      }
    }
  }

  return null;
}
