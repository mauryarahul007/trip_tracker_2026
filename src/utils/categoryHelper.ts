import type { Category, Expense } from '../types';
import {
  TOP_50_BRANDS,
  TOP_50_ITEMS,
  DEFAULT_EXTENDED_KEYWORDS,
} from './categoryKeywords';

export interface ParsedCategoryIcon {
  color: string;
  iconName: string;
  isEmoji: boolean;
}

export function parseCategoryIcon(iconString: string | undefined): ParsedCategoryIcon {
  if (!iconString) {
    return { color: 'var(--primary-accent)', iconName: 'Compass', isEmoji: false };
  }

  if (iconString.includes(':')) {
    const [color, iconName] = iconString.split(':');
    return {
      color: color || 'var(--primary-accent)',
      iconName: iconName || 'Compass',
      isEmoji: false,
    };
  }

  const isEmoji = /[^\x00-\x7F]/.test(iconString);
  if (isEmoji) {
    return {
      color: 'var(--border-color)',
      iconName: iconString,
      isEmoji: true,
    };
  }

  return {
    color: 'var(--primary-accent)',
    iconName: iconString,
    isEmoji: false,
  };
}

export function serializeCategoryIcon(color: string, iconName: string): string {
  return `${color}:${iconName}`;
}

/**
 * Returns the effective list of keywords for a given category.
 * If the category has custom keywords configured, returns those;
 * otherwise falls back to default extended keywords dataset.
 */
export function getCategoryKeywords(category: Category): { brands: string[]; items: string[] } {
  if (category.keywords && category.keywords.length > 0) {
    // If the category has custom keyword list stored
    return {
      brands: [],
      items: category.keywords,
    };
  }

  const defaultDataset = DEFAULT_EXTENDED_KEYWORDS[category.id];
  if (defaultDataset) {
    return defaultDataset;
  }

  return {
    brands: [],
    items: [],
  };
}

/**
 * Escapes regex special characters in a keyword string.
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Helper to test if a keyword matches whole word boundaries in a text string.
 */
function keywordMatchesText(keyword: string, text: string): boolean {
  if (!keyword || !text) return false;
  const escaped = escapeRegExp(keyword.trim());
  // Word boundary regex that handles both alphanumeric and punctuation-trimmed words
  const regex = new RegExp(`(^|\\s|[.,!?;:()/'"\\[\\]])${escaped}($|\\s|[.,!?;:()/'"\\[\\]])`, 'i');
  return regex.test(text);
}

/**
 * Smart Title-to-Category Auto-Tagging
 *
 * Matching Priority Order:
 * 0. Trip History Memory (Matches previous identical or similar expenses in this trip)
 * 1. Brand Match (Top 50 Brands & Category Brands)
 * 2. Item Match (Top 50 Items & Category Items / Custom Keywords)
 * 3. Custom Category Name Match
 * 4. Default Category Name Match
 */
export function autoSuggestCategory(
  titleText: string,
  categories: Category[],
  historicalExpenses?: Expense[]
): string | null {
  const cleanText = titleText.trim();
  if (!cleanText) return null;

  const activeCategoryIds = new Set(categories.map((c) => c.id));

  // -------------------------------------------------------------------------
  // Priority 0: Historical Trip Memory
  // -------------------------------------------------------------------------
  if (historicalExpenses && historicalExpenses.length > 0) {
    const lowerClean = cleanText.toLowerCase();
    for (const exp of historicalExpenses) {
      if (exp.category && activeCategoryIds.has(exp.category)) {
        const expTitle = exp.title.trim().toLowerCase();
        if (
          expTitle === lowerClean ||
          (lowerClean.length >= 3 && expTitle.includes(lowerClean)) ||
          (expTitle.length >= 3 && lowerClean.includes(expTitle))
        ) {
          return exp.category;
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  // Priority 1: Brand Match (Top 50 Brands & Extended Category Brands)
  // -------------------------------------------------------------------------
  // 1a. Check Top 50 Hardcoded Core Brands
  for (const [catId, brands] of Object.entries(TOP_50_BRANDS)) {
    if (activeCategoryIds.has(catId)) {
      for (const brand of brands) {
        if (keywordMatchesText(brand, cleanText)) {
          return catId;
        }
      }
    }
  }

  // 1b. Check Extended Brands
  for (const [catId, dataset] of Object.entries(DEFAULT_EXTENDED_KEYWORDS)) {
    if (activeCategoryIds.has(catId)) {
      for (const brand of dataset.brands) {
        if (keywordMatchesText(brand, cleanText)) {
          return catId;
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  // Priority 2: Item Match (Top 50 Items, Extended Items & Category Keywords)
  // -------------------------------------------------------------------------
  // 2a. Check custom category-specific keywords first if defined
  for (const cat of categories) {
    if (cat.keywords && cat.keywords.length > 0) {
      for (const kw of cat.keywords) {
        if (keywordMatchesText(kw, cleanText)) {
          return cat.id;
        }
      }
    }
  }

  // 2b. Check Top 50 Hardcoded Core Items
  for (const [catId, items] of Object.entries(TOP_50_ITEMS)) {
    if (activeCategoryIds.has(catId)) {
      for (const item of items) {
        if (keywordMatchesText(item, cleanText)) {
          return catId;
        }
      }
    }
  }

  // 2c. Check Extended Items
  for (const [catId, dataset] of Object.entries(DEFAULT_EXTENDED_KEYWORDS)) {
    if (activeCategoryIds.has(catId)) {
      for (const item of dataset.items) {
        if (keywordMatchesText(item, cleanText)) {
          return catId;
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  // Priority 3: Custom Category Name Match
  // -------------------------------------------------------------------------
  for (const c of categories) {
    if (c.isCustom) {
      const cleanName = c.name.toLowerCase().replace(/&/g, ' ').trim();
      const words = cleanName.split(/\s+/).filter((w) => w.length > 2);
      for (const word of words) {
        if (keywordMatchesText(word, cleanText)) {
          return c.id;
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  // Priority 4: Default Category Name Match
  // -------------------------------------------------------------------------
  for (const c of categories) {
    if (!c.isCustom) {
      const cleanName = c.name.toLowerCase().replace(/&/g, ' ').trim();
      const words = cleanName.split(/\s+/).filter((w) => w.length > 2);
      for (const word of words) {
        if (keywordMatchesText(word, cleanText)) {
          return c.id;
        }
      }
    }
  }

  return null;
}
