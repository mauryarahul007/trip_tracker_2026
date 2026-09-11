import type { Expense, Category, Member } from '../types';

export interface DuplicateMatchResult {
  isDuplicate: boolean;
  confidence: 'high' | 'medium';
  reason: string;
  matchedExpense: Expense;
  matchedPayerName?: string;
}

export interface CandidateExpense {
  amount: number;
  currency?: string;
  title: string;
  date: string;
  categoryId?: string | null;
  paidById?: string | null;
  id?: string; // Exclude self when editing an existing expense
}

/**
 * Tokenize and normalize a title string for semantic overlap checking
 */
function tokenizeTitle(text: string): Set<string> {
  const normalized = text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .trim();
  const tokens = normalized.split(/\s+/).filter((word) => word.length > 2);
  // Filter common generic stop words
  const stopWords = new Set(['the', 'and', 'for', 'with', 'from', 'paid']);
  return new Set(tokens.filter((t) => !stopWords.has(t)));
}

/**
 * Calculate Jaccard word token similarity between two titles (0.0 to 1.0)
 */
function titleSimilarity(titleA: string, titleB: string): number {
  const normA = titleA.trim().toLowerCase();
  const normB = titleB.trim().toLowerCase();
  if (normA === normB && normA.length > 0) return 1.0;

  const tokensA = tokenizeTitle(normA);
  const tokensB = tokenizeTitle(normB);
  if (tokensA.size === 0 || tokensB.size === 0) {
    return normA === normB ? 1.0 : 0.0;
  }

  let intersection = 0;
  for (const t of tokensA) {
    if (tokensB.has(t)) intersection++;
  }

  const union = new Set([...tokensA, ...tokensB]).size;
  return union > 0 ? intersection / union : 0.0;
}

/**
 * Inspects active trip expenses for potential accidental double-entries
 */
export function detectDuplicateExpense(
  candidate: CandidateExpense,
  existingExpenses: Expense[],
  categories: Category[] = [],
  members: Member[] = []
): DuplicateMatchResult | null {
  if (!candidate.amount || candidate.amount <= 0 || !candidate.date) {
    return null;
  }

  const candidateDate = new Date(candidate.date);
  if (Number.isNaN(candidateDate.getTime())) return null;

  const memberMap = new Map<string, string>();
  for (const m of members) {
    if (m.id && m.name) memberMap.set(m.id, m.name);
  }

  const categoryMap = new Map<string, string>();
  for (const c of categories) {
    if (c.id && c.name) categoryMap.set(c.id, c.name);
  }

  // Active (non-deleted, non-settlement) expenses, excluding self if editing
  const eligibleExpenses = existingExpenses.filter((e) => {
    if (e.deletedAt) return false;
    if (e.isSettlement) return false;
    if (candidate.id && e.id === candidate.id) return false;
    return true;
  });

  let bestMatch: DuplicateMatchResult | null = null;

  for (const existing of eligibleExpenses) {
    // 1. Amount match check: within 2% variance or within 1.0 unit (for minor tip/rounding differences)
    const amountDiff = Math.abs(existing.amount - candidate.amount);
    const amountTolerance = Math.max(1.0, candidate.amount * 0.02);
    const isAmountMatch = amountDiff <= amountTolerance;
    if (!isAmountMatch) continue;

    // 2. Date proximity check: same day or within 24 hours
    const existingDate = new Date(existing.date);
    if (Number.isNaN(existingDate.getTime())) continue;

    const isSameDay = existing.date === candidate.date;
    const diffHours = Math.abs(candidateDate.getTime() - existingDate.getTime()) / (1000 * 60 * 60);
    const isAdjacentDay = diffHours <= 28; // within ~1 day window

    if (!isSameDay && !isAdjacentDay) continue;

    // 3. Context Similarity (Title, Category, Payer)
    const sim = titleSimilarity(candidate.title, existing.title);
    const isCategoryMatch = Boolean(
      candidate.categoryId &&
      existing.category &&
      candidate.categoryId === existing.category
    );
    const isSamePayer = Boolean(
      candidate.paidById &&
      existing.paidBy &&
      candidate.paidById === existing.paidBy
    );

    const matchedPayerName = memberMap.get(existing.paidBy) || 'Someone';
    const catName = categoryMap.get(existing.category) || 'expense';

    // Case A: Identical or high title overlap on same day (High Confidence)
    if (isSameDay && sim >= 0.5) {
      return {
        isDuplicate: true,
        confidence: 'high',
        reason: `A matching "${existing.title}" (${existing.amount}) was already logged today by ${matchedPayerName}.`,
        matchedExpense: existing,
        matchedPayerName,
      };
    }

    // Case B: Same amount + same day + same payer (High Confidence)
    if (isSameDay && isSamePayer && (sim > 0 || isCategoryMatch)) {
      return {
        isDuplicate: true,
        confidence: 'high',
        reason: `${matchedPayerName} already logged an identical ${existing.amount} ${catName} today ("${existing.title}").`,
        matchedExpense: existing,
        matchedPayerName,
      };
    }

    // Case C: Shared bill collision - same amount + same day + same category, different payer (Medium Confidence)
    if (isSameDay && isCategoryMatch && !isSamePayer) {
      bestMatch = {
        isDuplicate: true,
        confidence: 'medium',
        reason: `${matchedPayerName} already logged a ${catName} expense for ${existing.amount} today ("${existing.title}"). Did you both pay, or is this a duplicate?`,
        matchedExpense: existing,
        matchedPayerName,
      };
      continue;
    }

    // Case D: Exact amount + adjacent day + title overlap (Medium Confidence)
    if (isAdjacentDay && sim >= 0.5 && !bestMatch) {
      bestMatch = {
        isDuplicate: true,
        confidence: 'medium',
        reason: `A similar "${existing.title}" (${existing.amount}) was logged on ${existing.date} by ${matchedPayerName}.`,
        matchedExpense: existing,
        matchedPayerName,
      };
    }
  }

  return bestMatch;
}
