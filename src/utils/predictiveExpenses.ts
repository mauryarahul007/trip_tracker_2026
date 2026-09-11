import type { Category, Expense } from '../types';

export interface PredictiveQuickChip {
  id: string;
  label: string;
  title: string;
  icon: string;
  categoryId?: string;
  categoryNameHint: string;
}

interface CategoryKeywordRule {
  keywords: string[];
  categoryPatterns: string[];
}

const CATEGORY_RULES: CategoryKeywordRule[] = [
  {
    keywords: ['coffee', 'tea', 'cafe', 'breakfast', 'lunch', 'dinner', 'restaurant', 'food', 'snack', 'bakery', 'meal', 'drinks', 'bar', 'beer', 'wine', 'cocktail', 'juice', 'brunch', 'ice cream', 'dessert'],
    categoryPatterns: ['food', 'dining', 'drink', 'restaurant', 'meal', 'cafe'],
  },
  {
    keywords: ['taxi', 'cab', 'uber', 'ola', 'grab', 'metro', 'bus', 'train', 'flight', 'auto', 'tuk tuk', 'rickshaw', 'gas', 'fuel', 'petrol', 'diesel', 'toll', 'parking', 'ferry', 'rental', 'car', 'bike', 'scooter'],
    categoryPatterns: ['transport', 'transit', 'travel', 'commute'],
  },
  {
    keywords: ['hotel', 'stay', 'resort', 'airbnb', 'hostel', 'villa', 'lodge', 'room', 'homestay'],
    categoryPatterns: ['stay', 'hotel', 'accommodation', 'lodging'],
  },
  {
    keywords: ['ticket', 'museum', 'monument', 'entry', 'safari', 'tour', 'park', 'movie', 'cinema', 'show', 'concert', 'activity', 'surfing', 'scuba', 'trek', 'guide', 'diving'],
    categoryPatterns: ['entertainment', 'activity', 'sightseeing', 'leisure', 'attraction', 'experience'],
  },
  {
    keywords: ['shopping', 'clothes', 'souvenir', 'gift', 'market', 'mall', 'shoes', 'electronics'],
    categoryPatterns: ['shopping', 'souvenir', 'retail', 'market'],
  },
  {
    keywords: ['groceries', 'supermarket', 'water', 'convenience', 'snacks', 'fruit', 'provisions'],
    categoryPatterns: ['grocer', 'supermarket', 'supplies', 'general'],
  },
  {
    keywords: ['medicine', 'pharmacy', 'doctor', 'hospital', 'first aid', 'sunscreen'],
    categoryPatterns: ['health', 'medical', 'emergency'],
  },
];

export function inferCategoryId(title: string, categories: Category[]): string | undefined {
  if (!title || !categories || categories.length === 0) return undefined;
  const lowerTitle = title.toLowerCase();

  for (const rule of CATEGORY_RULES) {
    const matchesKeyword = rule.keywords.some((kw) => lowerTitle.includes(kw));
    if (matchesKeyword) {
      // Find category matching rule patterns
      const matched = categories.find((cat) => {
        const catName = cat.name.toLowerCase();
        return rule.categoryPatterns.some((pat) => catName.includes(pat));
      });
      if (matched) return matched.id;
    }
  }

  return undefined;
}

export function getTimeOfDayChips(now: Date = new Date()): Omit<PredictiveQuickChip, 'categoryId'>[] {
  const hours = now.getHours();

  if (hours >= 5 && hours < 11.5) {
    // Morning (5:00 AM - 11:30 AM)
    return [
      { id: 'tod-morning-coffee', label: 'Coffee', title: 'Morning Coffee', icon: '☕', categoryNameHint: 'Food & Drinks' },
      { id: 'tod-breakfast', label: 'Breakfast', title: 'Breakfast', icon: '🍳', categoryNameHint: 'Food & Drinks' },
      { id: 'tod-cab', label: 'Cab / Taxi', title: 'Airport Taxi', icon: '🚕', categoryNameHint: 'Transport' },
      { id: 'tod-metro', label: 'Metro / Bus', title: 'Metro Transit Card', icon: '🚇', categoryNameHint: 'Transport' },
      { id: 'tod-water', label: 'Bottled Water', title: 'Bottled Water', icon: '💧', categoryNameHint: 'Groceries' },
    ];
  }

  if (hours >= 11.5 && hours < 17) {
    // Afternoon (11:30 AM - 5:00 PM)
    return [
      { id: 'tod-lunch', label: 'Lunch', title: 'Lunch', icon: '🥗', categoryNameHint: 'Food & Drinks' },
      { id: 'tod-entry-ticket', label: 'Entry Ticket', title: 'Museum / Monument Ticket', icon: '🎟️', categoryNameHint: 'Entertainment' },
      { id: 'tod-beverage', label: 'Cold Drink / Tea', title: 'Afternoon Refreshments', icon: '🧃', categoryNameHint: 'Food & Drinks' },
      { id: 'tod-local-cab', label: 'City Cab', title: 'City Cab', icon: '🚖', categoryNameHint: 'Transport' },
      { id: 'tod-snack', label: 'Snacks', title: 'Snacks', icon: '🥪', categoryNameHint: 'Food & Drinks' },
    ];
  }

  // Evening & Night (5:00 PM - 4:59 AM)
  return [
    { id: 'tod-dinner', label: 'Dinner', title: 'Dinner', icon: '🍽️', categoryNameHint: 'Food & Drinks' },
    { id: 'tod-drinks', label: 'Drinks', title: 'Drinks & Bar', icon: '🍹', categoryNameHint: 'Food & Drinks' },
    { id: 'tod-dessert', label: 'Dessert', title: 'Dessert / Ice Cream', icon: '🍨', categoryNameHint: 'Food & Drinks' },
    { id: 'tod-return-cab', label: 'Return Cab', title: 'Return Cab to Stay', icon: '🚕', categoryNameHint: 'Transport' },
    { id: 'tod-night-snacks', label: 'Convenience', title: 'Convenience Store & Snacks', icon: '🛒', categoryNameHint: 'Groceries' },
  ];
}

/**
 * Returns contextual predictive quick-chips for the Expense Form:
 * Combines time-of-day suggestions with frequently logged trip items.
 */
export function getPredictiveQuickChips(
  categories: Category[],
  tripExpenses: Expense[] = [],
  now: Date = new Date()
): PredictiveQuickChip[] {
  const result: PredictiveQuickChip[] = [];
  const seenTitles = new Set<string>();

  // 1. Learn from frequent trip expenses (logged >= 2 times)
  const frequencyMap = new Map<string, { count: number; categoryId: string; icon: string }>();
  for (const exp of tripExpenses) {
    if (!exp.title || exp.title.startsWith('Settlement:')) continue;
    const cleanTitle = exp.title.trim();
    if (cleanTitle.length < 2) continue;

    const existing = frequencyMap.get(cleanTitle.toLowerCase());
    if (existing) {
      existing.count += 1;
    } else {
      const cat = categories.find((c) => c.id === exp.category);
      frequencyMap.set(cleanTitle.toLowerCase(), {
        count: 1,
        categoryId: exp.category,
        icon: cat?.icon || '🏷️',
      });
    }
  }

  // Pick top 2 most repeated items from this trip
  const sortedFrequent = Array.from(frequencyMap.entries())
    .filter(([, data]) => data.count >= 2)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 2);

  for (const [titleLower, data] of sortedFrequent) {
    const formattedTitle = titleLower.charAt(0).toUpperCase() + titleLower.slice(1);
    result.push({
      id: `freq-${titleLower}`,
      label: formattedTitle,
      title: formattedTitle,
      icon: data.icon,
      categoryId: data.categoryId,
      categoryNameHint: 'Frequent',
    });
    seenTitles.add(titleLower);
  }

  // 2. Add time-of-day contextual chips
  const todChips = getTimeOfDayChips(now);
  for (const chip of todChips) {
    if (seenTitles.has(chip.title.toLowerCase())) continue;
    const inferredId = inferCategoryId(chip.title, categories);
    result.push({
      ...chip,
      categoryId: inferredId,
    });
    seenTitles.add(chip.title.toLowerCase());
  }

  return result.slice(0, 6);
}
