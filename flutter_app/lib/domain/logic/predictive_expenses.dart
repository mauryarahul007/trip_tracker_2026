import '../models/category.dart';
import '../models/expense.dart';

class PredictiveQuickChip {
  final String id;
  final String label;
  final String title;
  final String icon;
  final String? categoryId;
  final String categoryNameHint;

  const PredictiveQuickChip({
    required this.id,
    required this.label,
    required this.title,
    required this.icon,
    this.categoryId,
    required this.categoryNameHint,
  });

  Map<String, dynamic> toJson() => {
    'id': id,
    'label': label,
    'title': title,
    'icon': icon,
    'categoryNameHint': categoryNameHint,
    if (categoryId != null) 'categoryId': categoryId,
  };
}

class CategoryKeywordRule {
  final List<String> keywords;
  final List<String> categoryPatterns;

  const CategoryKeywordRule({required this.keywords, required this.categoryPatterns});
}

const List<CategoryKeywordRule> categoryRules = [
  CategoryKeywordRule(
    keywords: [
      'coffee',
      'tea',
      'cafe',
      'breakfast',
      'lunch',
      'dinner',
      'restaurant',
      'food',
      'snack',
      'bakery',
      'meal',
      'drinks',
      'bar',
      'beer',
      'wine',
      'cocktail',
      'juice',
      'brunch',
      'ice cream',
      'dessert',
    ],
    categoryPatterns: ['food', 'dining', 'drink', 'restaurant', 'meal', 'cafe'],
  ),
  CategoryKeywordRule(
    keywords: [
      'taxi',
      'cab',
      'uber',
      'ola',
      'grab',
      'metro',
      'bus',
      'train',
      'flight',
      'auto',
      'tuk tuk',
      'rickshaw',
      'gas',
      'fuel',
      'petrol',
      'diesel',
      'toll',
      'parking',
      'ferry',
      'rental',
      'car',
      'bike',
      'scooter',
    ],
    categoryPatterns: ['transport', 'transit', 'travel', 'commute'],
  ),
  CategoryKeywordRule(
    keywords: ['hotel', 'stay', 'resort', 'airbnb', 'hostel', 'villa', 'lodge', 'room', 'homestay'],
    categoryPatterns: ['stay', 'hotel', 'accommodation', 'lodging'],
  ),
  CategoryKeywordRule(
    keywords: [
      'ticket',
      'museum',
      'monument',
      'entry',
      'safari',
      'tour',
      'park',
      'movie',
      'cinema',
      'show',
      'concert',
      'activity',
      'surfing',
      'scuba',
      'trek',
      'guide',
      'diving',
    ],
    categoryPatterns: ['entertainment', 'activity', 'sightseeing', 'leisure', 'attraction', 'experience'],
  ),
  CategoryKeywordRule(
    keywords: ['shopping', 'clothes', 'souvenir', 'gift', 'market', 'mall', 'shoes', 'electronics'],
    categoryPatterns: ['shopping', 'souvenir', 'retail', 'market'],
  ),
  CategoryKeywordRule(
    keywords: ['groceries', 'supermarket', 'water', 'convenience', 'snacks', 'fruit', 'provisions'],
    categoryPatterns: ['grocer', 'supermarket', 'supplies', 'general'],
  ),
  CategoryKeywordRule(
    keywords: ['medicine', 'pharmacy', 'doctor', 'hospital', 'first aid', 'sunscreen'],
    categoryPatterns: ['health', 'medical', 'emergency'],
  ),
];

String? inferCategoryId(String title, List<Category> categories) {
  if (title.isEmpty || categories.isEmpty) return null;
  final lowerTitle = title.toLowerCase();

  for (final rule in categoryRules) {
    final matchesKeyword = rule.keywords.any((kw) => lowerTitle.contains(kw));
    if (matchesKeyword) {
      for (final cat in categories) {
        final catName = cat.name.toLowerCase();
        if (rule.categoryPatterns.any((pat) => catName.contains(pat))) {
          return cat.id;
        }
      }
    }
  }
  return null;
}

List<PredictiveQuickChip> getTimeOfDayChips([DateTime? now]) {
  final clock = now ?? DateTime.now();
  final hours = clock.hour + clock.minute / 60.0;

  if (hours >= 5.0 && hours < 11.5) {
    return const [
      PredictiveQuickChip(
        id: 'tod-morning-coffee',
        label: 'Coffee',
        title: 'Morning Coffee',
        icon: '☕',
        categoryNameHint: 'Food & Drinks',
      ),
      PredictiveQuickChip(
        id: 'tod-breakfast',
        label: 'Breakfast',
        title: 'Breakfast',
        icon: '🍳',
        categoryNameHint: 'Food & Drinks',
      ),
      PredictiveQuickChip(
        id: 'tod-cab',
        label: 'Cab / Taxi',
        title: 'Airport Taxi',
        icon: '🚕',
        categoryNameHint: 'Transport',
      ),
      PredictiveQuickChip(
        id: 'tod-metro',
        label: 'Metro / Bus',
        title: 'Metro Transit Card',
        icon: '🚇',
        categoryNameHint: 'Transport',
      ),
      PredictiveQuickChip(
        id: 'tod-water',
        label: 'Bottled Water',
        title: 'Bottled Water',
        icon: '💧',
        categoryNameHint: 'Groceries',
      ),
    ];
  }

  if (hours >= 11.5 && hours < 17.0) {
    return const [
      PredictiveQuickChip(
        id: 'tod-lunch',
        label: 'Lunch',
        title: 'Lunch',
        icon: '🥗',
        categoryNameHint: 'Food & Drinks',
      ),
      PredictiveQuickChip(
        id: 'tod-entry-ticket',
        label: 'Entry Ticket',
        title: 'Museum / Monument Ticket',
        icon: '🎟️',
        categoryNameHint: 'Entertainment',
      ),
      PredictiveQuickChip(
        id: 'tod-beverage',
        label: 'Cold Drink / Tea',
        title: 'Afternoon Refreshments',
        icon: '🧃',
        categoryNameHint: 'Food & Drinks',
      ),
      PredictiveQuickChip(
        id: 'tod-local-cab',
        label: 'City Cab',
        title: 'City Cab',
        icon: '🚖',
        categoryNameHint: 'Transport',
      ),
      PredictiveQuickChip(
        id: 'tod-snack',
        label: 'Snacks',
        title: 'Snacks',
        icon: '🥪',
        categoryNameHint: 'Food & Drinks',
      ),
    ];
  }

  return const [
    PredictiveQuickChip(
      id: 'tod-dinner',
      label: 'Dinner',
      title: 'Dinner',
      icon: '🍽️',
      categoryNameHint: 'Food & Drinks',
    ),
    PredictiveQuickChip(
      id: 'tod-drinks',
      label: 'Drinks',
      title: 'Drinks & Bar',
      icon: '🍹',
      categoryNameHint: 'Food & Drinks',
    ),
    PredictiveQuickChip(
      id: 'tod-dessert',
      label: 'Dessert',
      title: 'Dessert / Ice Cream',
      icon: '🍨',
      categoryNameHint: 'Food & Drinks',
    ),
    PredictiveQuickChip(
      id: 'tod-return-cab',
      label: 'Return Cab',
      title: 'Return Cab to Stay',
      icon: '🚕',
      categoryNameHint: 'Transport',
    ),
    PredictiveQuickChip(
      id: 'tod-night-snacks',
      label: 'Convenience',
      title: 'Convenience Store & Snacks',
      icon: '🛒',
      categoryNameHint: 'Groceries',
    ),
  ];
}

class _FreqData {
  int count;
  String categoryId;
  String icon;
  _FreqData({required this.count, required this.categoryId, required this.icon});
}

List<PredictiveQuickChip> getPredictiveQuickChips(
  List<Category> categories, [
  List<Expense> tripExpenses = const [],
  DateTime? now,
]) {
  final result = <PredictiveQuickChip>[];
  final seenTitles = <String>{};

  final frequencyMap = <String, _FreqData>{};
  for (final exp in tripExpenses) {
    if (exp.title.isEmpty || exp.title.startsWith('Settlement:')) continue;
    final cleanTitle = exp.title.trim();
    if (cleanTitle.length < 2) continue;

    final lower = cleanTitle.toLowerCase();
    final existing = frequencyMap[lower];
    if (existing != null) {
      existing.count += 1;
    } else {
      final cat = categories.where((c) => c.id == exp.category).firstOrNull;
      final catIcon = cat?.icon;
      frequencyMap[lower] = _FreqData(
        count: 1,
        categoryId: exp.category,
        icon: (catIcon != null && catIcon.isNotEmpty) ? catIcon : '🏷️',
      );
    }
  }

  final sortedFrequent = frequencyMap.entries.where((e) => e.value.count >= 2).toList()
    ..sort((a, b) => b.value.count.compareTo(a.value.count));

  for (final entry in sortedFrequent.take(2)) {
    final titleLower = entry.key;
    final formattedTitle = titleLower[0].toUpperCase() + titleLower.substring(1);
    result.add(
      PredictiveQuickChip(
        id: 'freq-$titleLower',
        label: formattedTitle,
        title: formattedTitle,
        icon: entry.value.icon,
        categoryId: entry.value.categoryId,
        categoryNameHint: 'Frequent',
      ),
    );
    seenTitles.add(titleLower);
  }

  final todChips = getTimeOfDayChips(now);
  for (final chip in todChips) {
    if (seenTitles.contains(chip.title.toLowerCase())) continue;
    final inferredId = inferCategoryId(chip.title, categories);
    result.add(
      PredictiveQuickChip(
        id: chip.id,
        label: chip.label,
        title: chip.title,
        icon: chip.icon,
        categoryId: inferredId,
        categoryNameHint: chip.categoryNameHint,
      ),
    );
    seenTitles.add(chip.title.toLowerCase());
  }

  return result.take(6).toList();
}
