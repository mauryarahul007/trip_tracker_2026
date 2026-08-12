import type { Category } from '../types';

export interface ParsedCategoryIcon {
  color: string;
  iconName: string;
  isEmoji: boolean;
}

export const KEYWORD_MAP: Record<string, string[]> = {
  'cat-food': ['mcdonald', 'starbucks', 'kfc', 'burger', 'pizza', 'food', 'lunch', 'dinner', 'breakfast', 'restaurant', 'cafe', 'coffee', 'grocery', 'supermarket', 'subway', 'bar', 'drink', 'sushi', 'eats', 'swiggy', 'zomato', 'dining'],
  'cat-stay': ['hotel', 'stay', 'airbnb', 'hostel', 'resort', 'booking', 'motel', 'villa', 'lodge', 'accommodation', 'homestay'],
  'cat-travel': ['uber', 'taxi', 'flight', 'ticket', 'train', 'bus', 'metro', 'cab', 'airline', 'fuel', 'petrol', 'gas', 'toll', 'parking', 'transport', 'commute', 'rental', 'car', 'travel', 'ola', 'grab', 'bolt', 'lyft', 'aviation', 'diesel'],
  'cat-activities': ['museum', 'tour', 'activity', 'cinema', 'movie', 'sightseeing', 'safari', 'disney', 'entry', 'concert', 'show', 'theme park', 'park', 'attraction', 'guide', 'diving', 'trek'],
  'cat-shopping': ['shopping', 'mall', 'store', 'gift', 'souvenir', 'clothes', 'zara', 'h&m', 'amazon', 'target', 'walmart', 'ikea', 'boots', 'market', 'outlet', 'fashion'],
  'cat-misc': ['misc', 'other', 'fee', 'charge', 'tips', 'cash', 'atm', 'laundry', 'sim', 'data', 'insurance', 'medicine', 'pharmacy', 'hospital', 'telecom', 'topup']
};

export function parseCategoryIcon(iconString: string | undefined): ParsedCategoryIcon {
  if (!iconString) {
    return { color: 'var(--primary-accent)', iconName: 'Compass', isEmoji: false };
  }

  if (iconString.includes(':')) {
    const [color, iconName] = iconString.split(':');
    return {
      color: color || 'var(--primary-accent)',
      iconName: iconName || 'Compass',
      isEmoji: false
    };
  }

  const isEmoji = /[^\x00-\x7F]/.test(iconString);
  if (isEmoji) {
    return {
      color: 'var(--border-color)',
      iconName: iconString,
      isEmoji: true
    };
  }

  return {
    color: 'var(--primary-accent)',
    iconName: iconString,
    isEmoji: false
  };
}

export function serializeCategoryIcon(color: string, iconName: string): string {
  return `${color}:${iconName}`;
}

export function autoSuggestCategory(titleText: string, categories: Category[]): string | null {
  const cleanText = titleText.toLowerCase().trim();
  if (!cleanText) return null;

  // 1. Try matching custom category names first (highest priority)
  // This ensures custom categories like "Fuel & Oil" match "Fuel" instead of hitting "car" in travel keywords
  for (const c of categories) {
    if (c.isCustom) {
      const cleanName = c.name.toLowerCase().replace(/&/g, ' ').trim();
      const words = cleanName.split(/\s+/).filter((w) => w.length > 2);
      for (const word of words) {
        const regex = new RegExp(`\\b${word}\\b`, 'i');
        if (regex.test(cleanText)) {
          return c.id;
        }
      }
    }
  }

  // 2. Try keyword matching
  for (const [catId, keywords] of Object.entries(KEYWORD_MAP)) {
    if (categories.some((c) => c.id === catId)) {
      for (const kw of keywords) {
        const regex = new RegExp(`\\b${kw}\\b`, 'i');
        if (regex.test(cleanText)) {
          return catId;
        }
      }
    }
  }

  // 3. Try matching default category names
  for (const c of categories) {
    if (!c.isCustom) {
      const cleanName = c.name.toLowerCase().replace(/&/g, ' ').trim();
      const words = cleanName.split(/\s+/).filter((w) => w.length > 2);
      for (const word of words) {
        const regex = new RegExp(`\\b${word}\\b`, 'i');
        if (regex.test(cleanText)) {
          return c.id;
        }
      }
    }
  }

  return null;
}
