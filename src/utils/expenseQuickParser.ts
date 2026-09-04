import type { Category, Expense } from '../types';
import { autoSuggestCategory } from './categoryHelper';

export interface ParsedQuickExpense {
  amount: number | null;
  currency?: string;
  title: string;
  categoryId: string | null;
  categoryName?: string;
  rawInput: string;
}

const CURRENCY_SYMBOLS_MAP: Record<string, string> = {
  '₹': 'INR',
  '$': 'USD',
  '€': 'EUR',
  '£': 'GBP',
  '¥': 'JPY',
  '₩': 'KRW',
  '฿': 'THB',
  'AED': 'AED',
  'SGD': 'SGD',
  'AUD': 'AUD',
  'CAD': 'CAD',
  'CHF': 'CHF',
};

/**
 * Parses single-line natural language text entered by a traveler into structured expense attributes.
 * Examples:
 *   "Dinner 1450 food" -> { title: "Dinner", amount: 1450, categoryId: "cat-food" }
 *   "Uber to airport 420" -> { title: "Uber to airport", amount: 420, categoryId: "cat-travel" }
 *   "₹1,200 Airbnb in Goa" -> { title: "Airbnb in Goa", amount: 1200, categoryId: "cat-stay" }
 *   "$45.50 museum pass" -> { title: "museum pass", amount: 45.5, categoryId: "cat-activities" }
 */
export function parseQuickExpense(
  rawInput: string,
  categories: Category[] = [],
  historicalExpenses: Expense[] = []
): ParsedQuickExpense | null {
  const trimmed = rawInput.trim();
  if (!trimmed) return null;

  let workingText = trimmed;
  let detectedAmount: number | null = null;
  let detectedCurrency: string | undefined = undefined;

  // 1. Detect Currency Symbol or Code prefix/suffix
  for (const [symbol, code] of Object.entries(CURRENCY_SYMBOLS_MAP)) {
    const symbolRegex = new RegExp(`(^|\\s)${symbol.replace('$', '\\$')}\\s*([0-9.,]+)`, 'i');
    const match = workingText.match(symbolRegex);
    if (match) {
      detectedCurrency = code;
      const numStr = match[2].replace(/,/g, '');
      const parsedNum = parseFloat(numStr);
      if (!Number.isNaN(parsedNum)) {
        detectedAmount = parsedNum;
        workingText = workingText.replace(match[0], ' ').trim();
        break;
      }
    }
  }

  // If no symbol match yet, check for numbers with currency suffix (e.g. 500rs, 500 inr, 45 usd)
  if (detectedAmount === null) {
    const suffixRegex = /(?:^|\s)([0-9.,]+)\s*(rs\.?|inr|usd|eur|gbp|aed|thb|sgd)(?:\s|$)/i;
    const match = workingText.match(suffixRegex);
    if (match) {
      const numStr = match[1].replace(/,/g, '');
      const parsedNum = parseFloat(numStr);
      if (!Number.isNaN(parsedNum)) {
        detectedAmount = parsedNum;
        const cur = match[2].toUpperCase().replace(/\./g, '');
        detectedCurrency = cur === 'RS' ? 'INR' : cur;
        workingText = workingText.replace(match[0], ' ').trim();
      }
    }
  }

  // If still no amount, search for standalone numbers (e.g. "Dinner 1450" or "450 Coffee" or "Shack 42 1200")
  if (detectedAmount === null) {
    const numberRegex = /(?<=\s|^)([0-9]+(?:,[0-9]{3})*(?:\.[0-9]+)?|[0-9]+(?:\.[0-9]+)?)(?=\s|$)/g;
    const matches = Array.from(workingText.matchAll(numberRegex));
    if (matches.length > 0) {
      // Prefer the last number if multiple exist (e.g. "Shack 42 1200" or "Room 204 3500")
      const chosenMatch = matches[matches.length - 1];
      const numStr = chosenMatch[1].replace(/,/g, '');
      const parsedNum = parseFloat(numStr);
      if (!Number.isNaN(parsedNum)) {
        detectedAmount = parsedNum;
        const startIdx = chosenMatch.index ?? 0;
        workingText = (workingText.slice(0, startIdx) + ' ' + workingText.slice(startIdx + chosenMatch[0].length)).trim();
      }
    }
  }

  // 2. Identify Category
  let detectedCategoryId: string | null = null;
  let detectedCategoryName: string | undefined = undefined;

  // First check if any category name was explicitly mentioned at the end or as a word token
  const words = workingText.split(/\s+/).filter(Boolean);
  for (let i = words.length - 1; i >= 0; i--) {
    const word = words[i].toLowerCase();
    const matchedCategory = categories.find((c) => {
      const catLower = c.name.toLowerCase();
      return catLower === word || catLower.split('&')[0].trim().toLowerCase() === word;
    });

    if (matchedCategory) {
      detectedCategoryId = matchedCategory.id;
      detectedCategoryName = matchedCategory.name;
      // Remove this category word from workingText to avoid cluttering the title
      words.splice(i, 1);
      workingText = words.join(' ');
      break;
    }
  }

  // If no explicit category name matched, run autoSuggestCategory on the text and history
  if (!detectedCategoryId) {
    const suggested = autoSuggestCategory(workingText, categories, historicalExpenses);
    if (suggested) {
      detectedCategoryId = suggested;
      const catObj = categories.find((c) => c.id === suggested);
      if (catObj) detectedCategoryName = catObj.name;
    }
  }

  // 3. Clean up the title
  let finalTitle = workingText.trim();
  // Capitalize first letter if present
  if (finalTitle.length > 0) {
    finalTitle = finalTitle.charAt(0).toUpperCase() + finalTitle.slice(1);
  } else if (detectedCategoryName) {
    // If user only typed "1450 food", fallback title to category name
    finalTitle = detectedCategoryName;
  } else {
    finalTitle = 'Expense';
  }

  return {
    amount: detectedAmount,
    currency: detectedCurrency,
    title: finalTitle,
    categoryId: detectedCategoryId,
    categoryName: detectedCategoryName,
    rawInput: trimmed,
  };
}
