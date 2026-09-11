import type { Category, Expense, Member } from '../types';
import { autoSuggestCategory } from './categoryHelper';

export interface ParsedQuickExpense {
  amount: number | null;
  currency?: string;
  title: string;
  categoryId: string | null;
  categoryName?: string;
  paidById?: string | null;
  paidByName?: string;
  splitMemberIds?: string[];
  date?: string;
  paymentMode?: string;
  rawInput: string;
  confidence: number;
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

const CURRENCY_WORDS_MAP: Record<string, string> = {
  rupees: 'INR',
  rupee: 'INR',
  rs: 'INR',
  inr: 'INR',
  bucks: 'USD',
  dollars: 'USD',
  dollar: 'USD',
  usd: 'USD',
  euros: 'EUR',
  euro: 'EUR',
  eur: 'EUR',
  pounds: 'GBP',
  pound: 'GBP',
  gbp: 'GBP',
  baht: 'THB',
  thb: 'THB',
  dirhams: 'AED',
  dirham: 'AED',
  aed: 'AED',
};

// Spoken number word replacement for speech recognition transcripts
function normalizeSpokenNumberWords(input: string): string {
  let text = input;

  // Speech-to-text homophone correction: convert "4 <word>" to "for <word>" when preceded by a number or verb
  // e.g. "Paid 200 4 cab", "200 4 lunch", "paid 4 dinner" -> "Paid 200 for cab"
  text = text.replace(/(?<=(?:\d+|paid|pay|spent|cost)\s+)(?:4)\s+([a-zA-Z]+)/gi, 'for $1');

  const wordNumberMap: [RegExp, string][] = [
    // Multi-thousands and composite hundreds
    [/\b(?:one|a|won)\s+thousand\s+(?:and\s+)?five\s+hundred\b/gi, '1500'],
    [/\b(?:one|a|won)\s+thousand\s+(?:and\s+)?two\s+hundred\b/gi, '1200'],
    [/\b(?:one|a|won)\s+thousand\b/gi, '1000'],
    [/\b(?:two|to|too)\s+thousand\b/gi, '2000'],
    [/\b(?:three|tree)\s+thousand\b/gi, '3000'],
    [/\b(?:four|for)\s+thousand\b/gi, '4000'],
    [/\b(?:five)\s+thousand\b/gi, '5000'],
    [/\b(?:ten)\s+thousand\b/gi, '10000'],
    // Indian numbering system (Lakh / Lakhs)
    [/\b(?:one|a|won)\s+lakh(?:s)?\b/gi, '100000'],
    [/\b(?:two|to|too)\s+lakh(?:s)?\b/gi, '200000'],
    [/\b(?:three|tree)\s+lakh(?:s)?\b/gi, '300000'],
    [/\b(?:five)\s+lakh(?:s)?\b/gi, '500000'],
    [/\b(?:ten)\s+lakh(?:s)?\b/gi, '1000000'],
    // Hundreds
    [/\btwenty\s+five\s+hundred\b/gi, '2500'],
    [/\btwenty\s+hundred\b/gi, '2000'],
    [/\bfifteen\s+hundred\b/gi, '1500'],
    [/\bfourteen\s+hundred\b/gi, '1400'],
    [/\bthirteen\s+hundred\b/gi, '1300'],
    [/\btwelve\s+hundred\b/gi, '1200'],
    [/\beleven\s+hundred\b/gi, '1100'],
    [/\bnine\s+hundred\b/gi, '900'],
    [/\b(?:eight|ate)\s+hundred\b/gi, '800'],
    [/\bseven\s+hundred\b/gi, '700'],
    [/\bsix\s+hundred\b/gi, '600'],
    [/\bfive\s+hundred\b/gi, '500'],
    [/\b(?:four|for)\s+hundred\s+(?:and\s+)?fifty\b/gi, '450'],
    [/\b(?:four|for)\s+hundred\b/gi, '400'],
    [/\b(?:three|tree)\s+hundred\s+(?:and\s+)?fifty\b/gi, '350'],
    [/\b(?:three|tree)\s+hundred\b/gi, '300'],
    [/\b(?:two|to|too)\s+hundred\s+(?:and\s+)?fifty\b/gi, '250'],
    [/\b(?:two|to|too)\s+hundred\b/gi, '200'],
    [/\b(?:one|a|won)\s+hundred\s+(?:and\s+)?fifty\b/gi, '150'],
    [/\b(?:one|a|won)\s+hundred\b/gi, '100'],
    [/\b(?:four|for)\s+fifty\b/gi, '450'],
    [/\b(?:three|tree)\s+fifty\b/gi, '350'],
    [/\b(?:two|to|too)\s+fifty\b/gi, '250'],
    [/\b(?:one|a|won)\s+fifty\b/gi, '150'],
  ];

  for (const [pattern, replacement] of wordNumberMap) {
    text = text.replace(pattern, replacement);
  }
  return text;
}

/**
 * Enhanced natural language & voice expense parser.
 * Examples:
 *   "Paid 200 for cab by upi by rahul"
 *   "Dinner 1450 food paid by Rahul split with Priya and Amit"
 *   "Uber to airport 420 yesterday"
 *   "₹1,200 Airbnb in Goa paid by Priya for everyone"
 *   "$45.50 museum pass with Alice"
 *   "Coffee 150 rupees today"
 *   "Dinner twelve hundred paid by Rahul"
 */
export function parseQuickExpense(
  rawInput: string,
  categories: Category[] = [],
  historicalExpenses: Expense[] = [],
  members: Member[] = []
): ParsedQuickExpense | null {
  const trimmed = rawInput.trim();
  if (!trimmed) return null;

  // Normalize speech filler words, spoken number words, and homophones
  let workingText = normalizeSpokenNumberWords(trimmed);

  let detectedAmount: number | null = null;
  let detectedCurrency: string | undefined = undefined;
  let detectedPaymentMode: string | undefined = undefined;
  let detectedPaidById: string | null = null;
  let detectedPaidByName: string | undefined = undefined;
  let detectedSplitMemberIds: string[] | undefined = undefined;
  let detectedDate: string | undefined = undefined;
  let confidence = 0.5;

  // 1. Detect Action Verb + Amount (e.g. "Paid 200", "Spent 1500", "Cost 800")
  const actionAmountRegex = /(?:^|\s)(?:paid|pay|spent|spend|cost|charged|total(?:\s+of)?)\s+([0-9]+(?:,[0-9]{3})*(?:\.[0-9]+)?|[0-9]+(?:\.[0-9]+)?)(?=\s|$)/i;
  const actionMatch = workingText.match(actionAmountRegex);
  if (actionMatch) {
    const numStr = actionMatch[1].replace(/,/g, '');
    const parsedNum = parseFloat(numStr);
    if (!Number.isNaN(parsedNum)) {
      detectedAmount = parsedNum;
      workingText = workingText.replace(actionMatch[0], ' ').trim();
    }
  }

  // Strip leading conversational and transaction filler verbs
  workingText = workingText
    .replace(/^(?:please\s+)?(?:add\s+expense|log\s+expense|add|log|spent|spend|paid|pay|bought|buy|gave|give|cost|charged)\s+/i, '')
    .trim();

  // 1. Detect Payment Method ("by upi", "via gpay", "on card", "in cash", "through phonepe", etc.)
  const paymentMethodRegex = /\b(?:paid\s+)?(?:by|via|through|on|in|with|using)\s+(upi|gpay|google\s*pay|phonepe|paytm|bhim|cash|card|credit\s*card|debit\s*card|net\s*banking|bank\s*transfer|apple\s*pay|paypal)\b/i;
  const paymentMatch = workingText.match(paymentMethodRegex);
  if (paymentMatch) {
    const rawMode = paymentMatch[1].toLowerCase().replace(/\s+/g, '');
    if (rawMode === 'upi' || rawMode === 'bhim') detectedPaymentMode = 'UPI';
    else if (rawMode === 'gpay' || rawMode === 'googlepay') detectedPaymentMode = 'GPay';
    else if (rawMode === 'phonepe') detectedPaymentMode = 'PhonePe';
    else if (rawMode === 'paytm') detectedPaymentMode = 'Paytm';
    else if (rawMode === 'cash') detectedPaymentMode = 'Cash';
    else if (rawMode.includes('card')) detectedPaymentMode = 'Card';
    else if (rawMode.includes('banking') || rawMode.includes('transfer')) detectedPaymentMode = 'Bank Transfer';
    else if (rawMode === 'applepay') detectedPaymentMode = 'Apple Pay';
    else if (rawMode === 'paypal') detectedPaymentMode = 'PayPal';
    else detectedPaymentMode = paymentMatch[1].toUpperCase();

    workingText = workingText.replace(paymentMatch[0], ' ').trim();
  }

  // 2. Detect Relative Date ("yesterday", "today", "tomorrow", "2 days ago")
  const today = new Date();
  const yesterdayRegex = /\b(yesterday)\b/i;
  const todayRegex = /\b(today)\b/i;
  if (yesterdayRegex.test(workingText)) {
    const yDate = new Date(today);
    yDate.setDate(yDate.getDate() - 1);
    detectedDate = yDate.toISOString().slice(0, 10);
    workingText = workingText.replace(yesterdayRegex, ' ').trim();
  } else if (todayRegex.test(workingText)) {
    detectedDate = today.toISOString().slice(0, 10);
    workingText = workingText.replace(todayRegex, ' ').trim();
  }

  // 2. Detect Payer ("paid by [Name]", "[Name] paid", "by [Name]")
  if (members.length > 0) {
    for (const member of members) {
      if (!member.name) continue;
      const memEsc = member.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const paidByRegex = new RegExp(`(?:paid\\s+by|by)\\s+${memEsc}\\b`, 'i');
      const memberPaidRegex = new RegExp(`\\b${memEsc}\\s+paid\\b`, 'i');

      if (paidByRegex.test(workingText)) {
        detectedPaidById = member.id;
        detectedPaidByName = member.name;
        workingText = workingText.replace(paidByRegex, ' ').trim();
        break;
      } else if (memberPaidRegex.test(workingText)) {
        detectedPaidById = member.id;
        detectedPaidByName = member.name;
        workingText = workingText.replace(memberPaidRegex, ' ').trim();
        break;
      }
    }
  }

  // 3. Detect Split Participants ("split with [A] and [B]", "with [A], [B]", "for everyone", "for all")
  if (members.length > 0) {
    const forAllRegex = /\b(?:for\s+all|for\s+everyone|split\s+all|split\s+everyone)\b/i;
    if (forAllRegex.test(workingText)) {
      detectedSplitMemberIds = members.map((m) => m.id);
      workingText = workingText.replace(forAllRegex, ' ').trim();
    } else {
      const withMatch = workingText.match(/\b(?:split\s+with|with)\s+([a-zA-Z0-9,\s&]+)(?:$|\s+(?:paid|yesterday|today))/i);
      if (withMatch) {
        const potentialNames = withMatch[1].split(/,|and|&|\s+/).map((n) => n.trim().toLowerCase()).filter(Boolean);
        const matchedIds: string[] = [];
        for (const pName of potentialNames) {
          const matchMem = members.find((m) => m.name.toLowerCase() === pName);
          if (matchMem && !matchedIds.includes(matchMem.id)) {
            matchedIds.push(matchMem.id);
          }
        }
        if (matchedIds.length > 0) {
          // If payer is known and not in split, include them too if desired or keep specific
          if (detectedPaidById && !matchedIds.includes(detectedPaidById)) {
            matchedIds.push(detectedPaidById);
          }
          detectedSplitMemberIds = matchedIds;
          workingText = workingText.replace(withMatch[0], ' ').trim();
        }
      }
    }
  }

  // 4. Detect Currency Symbol or Code prefix/suffix
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

  // If no symbol match yet, check for numbers with currency suffix or spoken currency words (e.g. 500rs, 500 rupees, 45 dollars, 20 bucks)
  if (detectedAmount === null) {
    const suffixRegex = /(?:^|\s)([0-9.,]+)\s*(rs\.?|rupees?|bucks?|dollars?|euros?|pounds?|inr|usd|eur|gbp|aed|thb|sgd)(?:\s|$)/i;
    const match = workingText.match(suffixRegex);
    if (match) {
      const numStr = match[1].replace(/,/g, '');
      const parsedNum = parseFloat(numStr);
      if (!Number.isNaN(parsedNum)) {
        detectedAmount = parsedNum;
        const curWord = match[2].toLowerCase().replace(/\./g, '');
        detectedCurrency = CURRENCY_WORDS_MAP[curWord] || curWord.toUpperCase();
        workingText = workingText.replace(match[0], ' ').trim();
      }
    }
  }

  // Check for currency word prefix (e.g. "rupees 500", "dollars 40")
  if (detectedAmount === null) {
    const prefixRegex = /(?:^|\s)(rs\.?|rupees?|bucks?|dollars?|inr|usd|eur|gbp)\s+([0-9.,]+)(?:\s|$)/i;
    const match = workingText.match(prefixRegex);
    if (match) {
      const numStr = match[2].replace(/,/g, '');
      const parsedNum = parseFloat(numStr);
      if (!Number.isNaN(parsedNum)) {
        detectedAmount = parsedNum;
        const curWord = match[1].toLowerCase().replace(/\./g, '');
        detectedCurrency = CURRENCY_WORDS_MAP[curWord] || curWord.toUpperCase();
        workingText = workingText.replace(match[0], ' ').trim();
      }
    }
  }

  // If still no amount, search for standalone numbers (e.g. "Dinner 1450" or "450 Coffee" or "Shack 42 1200")
  if (detectedAmount === null) {
    const numberRegex = /(?<=\s|^)([0-9]+(?:,[0-9]{3})*(?:\.[0-9]+)?|[0-9]+(?:\.[0-9]+)?)(?=\s|$)/g;
    const matches = Array.from(workingText.matchAll(numberRegex));
    if (matches.length > 0) {
      // Smartly choose the actual expense amount if multiple numbers exist:
      let chosenMatch = matches[matches.length - 1];

      if (matches.length > 1) {
        // 1. Check if any number is immediately preceded by "for", "paid", "spent", "cost"
        const precededByAction = matches.find((m) => {
          const idx = m.index ?? 0;
          const prefix = workingText.slice(0, idx).trim();
          return /(?:\b(?:for|paid|spent|cost|price|total|rs\.?|rupees?|inr|usd|\$|₹))\s*$/i.test(prefix);
        });

        // 2. Filter out numbers followed by quantity words (e.g. 2 in "2 people", 4 in "4 tickets")
        const nonQuantityMatches = matches.filter((m) => {
          const idx = (m.index ?? 0) + m[0].length;
          const suffix = workingText.slice(idx).trim();
          return !/^(?:people|persons?|pax|tickets?|beers?|coffees?|cabs?|seats?|items?|days?|nights?|hours?|mins?|minutes?)\b/i.test(suffix);
        });

        if (precededByAction) {
          chosenMatch = precededByAction;
        } else if (nonQuantityMatches.length === 1) {
          chosenMatch = nonQuantityMatches[0];
        } else if (nonQuantityMatches.length > 1) {
          // If multiple numbers remain, prefer the largest one as the expense total
          const sorted = [...nonQuantityMatches].sort((a, b) => {
            const valA = parseFloat(a[1].replace(/,/g, ''));
            const valB = parseFloat(b[1].replace(/,/g, ''));
            return valB - valA;
          });
          chosenMatch = sorted[0];
        }
      }

      const numStr = chosenMatch[1].replace(/,/g, '');
      const parsedNum = parseFloat(numStr);
      if (!Number.isNaN(parsedNum)) {
        detectedAmount = parsedNum;
        const startIdx = chosenMatch.index ?? 0;
        workingText = (workingText.slice(0, startIdx) + ' ' + workingText.slice(startIdx + chosenMatch[0].length)).trim();
      }
    }
  }

  // 5. Identify Category
  let detectedCategoryId: string | null = null;
  let detectedCategoryName: string | undefined = undefined;

  // Check if any category name was explicitly mentioned
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
      words.splice(i, 1);
      workingText = words.join(' ');
      break;
    }
  }

  // If no explicit category name matched, run autoSuggestCategory
  if (!detectedCategoryId) {
    const suggested = autoSuggestCategory(workingText, categories, historicalExpenses);
    if (suggested) {
      detectedCategoryId = suggested;
      const catObj = categories.find((c) => c.id === suggested);
      if (catObj) detectedCategoryName = catObj.name;
    }
  }

  // 6. Clean up the title
  // Strip leading prepositions or action remnants (e.g. "for cab" -> "cab", "on dinner" -> "dinner", "towards stay" -> "stay")
  workingText = workingText
    .replace(/^(?:for|on|towards|at|in)\s+/i, '')
    .trim();

  // Strip lingering verbs or prepositions
  workingText = workingText
    .replace(/\b(?:paid\s+for|paid|spent\s+on|spent|bought|gave|cost)\b/gi, ' ')
    .trim();

  // Strip trailing or leading prepositions or payment leftovers
  workingText = workingText
    .replace(/\s+(?:for|on|towards|by|via|at)$/i, '')
    .trim();
  workingText = workingText
    .replace(/^(?:for|on|towards|by|via)\s+/i, '')
    .trim();

  let finalTitle = workingText.replace(/\s+/g, ' ').trim();
  if (finalTitle.length > 0) {
    finalTitle = finalTitle.charAt(0).toUpperCase() + finalTitle.slice(1);
  } else if (detectedCategoryName) {
    finalTitle = detectedCategoryName;
  } else {
    finalTitle = 'Expense';
  }

  // Calculate confidence score
  let score = 0.3;
  if (detectedAmount !== null) score += 0.3;
  if (detectedCategoryId !== null) score += 0.2;
  if (detectedPaidById !== null) score += 0.1;
  if (detectedPaymentMode) score += 0.05;
  if (detectedSplitMemberIds && detectedSplitMemberIds.length > 0) score += 0.05;
  confidence = Math.min(1.0, score);

  return {
    amount: detectedAmount,
    currency: detectedCurrency,
    title: finalTitle,
    categoryId: detectedCategoryId,
    categoryName: detectedCategoryName,
    paidById: detectedPaidById,
    paidByName: detectedPaidByName,
    splitMemberIds: detectedSplitMemberIds,
    paymentMode: detectedPaymentMode,
    date: detectedDate,
    rawInput: trimmed,
    confidence,
  };
}
