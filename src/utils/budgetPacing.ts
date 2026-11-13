import type { Expense, Trip } from '../types';

export interface BudgetPacing {
  hasBudget: boolean;
  totalBudget: number;
  totalSpent: number;
  remainingBudget: number;
  budgetUsedPercent: number; // e.g. 45 (%)

  // Trip duration metrics
  totalTripDays: number;
  elapsedDays: number;
  remainingDays: number;
  isUpcoming: boolean;
  isCompleted: boolean;
  isOngoing: boolean;

  // Daily pacing
  plannedDailyBudget: number; // totalBudget / totalTripDays
  adjustedDailyAllowance: number; // remainingBudget / remainingDays (0 if over budget)
  todaySpent: number;
  todayBurnRatio: number; // todaySpent / adjustedDailyAllowance (1.0 = exact, >1.0 = over target)

  // Velocity & Forecast
  averageDailyBurn: number;
  projectedTotalSpend: number;
  projectedVariance: number; // positive = finish under budget, negative = finish over budget

  // Status
  status: 'on_track' | 'warning' | 'over_budget' | 'no_budget';
  statusMessage: string;
}

/**
 * Normalizes a date or date-string to YYYY-MM-DD in local time
 */
export function toLocalDateString(d: Date | string | number): string {
  const date = typeof d === 'string' || typeof d === 'number' ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Calculates calendar day difference (inclusive)
 */
export function getCalendarDayDiff(startIso: string, endIso: string): number {
  const s = new Date(startIso);
  const e = new Date(endIso);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return 1;
  const sUtc = Date.UTC(s.getFullYear(), s.getMonth(), s.getDate());
  const eUtc = Date.UTC(e.getFullYear(), e.getMonth(), e.getDate());
  const diffMs = eUtc - sUtc;
  const days = Math.round(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(1, days + 1);
}

export interface BudgetPacingOptions {
  today?: Date | string; // override for testing or simulated dates
  currencySymbol?: string;
}

/**
 * Calculates daily budget pacing, today's burn rate, and velocity projections for a trip
 */
export function calculateBudgetPacing(
  trip: Trip | undefined | null,
  expenses: Expense[] = [],
  options: BudgetPacingOptions = {}
): BudgetPacing {
  const currencySymbol = options.currencySymbol ?? (trip?.baseCurrency || '₹');
  const tripBudget = trip?.budget ?? (trip as unknown as { budget?: number })?.budget;
  const hasBudget = typeof tripBudget === 'number' && tripBudget > 0;
  const totalBudget = hasBudget ? tripBudget : 0;

  // Calculate net total spend (excluding excluded/settlement expenses)
  const activeExpenses = expenses.filter(
    (e) => !e.deletedAt && !e.isSettlement && !e.excludeFromTotals
  );

  const totalSpent = activeExpenses.reduce((sum, e) => {
    // If it's a refund row, it nets out
    if ((e as unknown as { isRefund?: boolean }).isRefund) {
      return sum - (e.amount || 0);
    }
    return sum + (e.amount || 0);
  }, 0);

  const remainingBudget = Math.max(0, totalBudget - totalSpent);
  const budgetUsedPercent = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

  // Date calculation
  const todayDateStr = toLocalDateString(options.today ?? new Date());
  const startStr = trip?.startDate ? toLocalDateString(trip.startDate) : todayDateStr;
  const endStr = trip?.endDate ? toLocalDateString(trip.endDate) : todayDateStr;

  const totalTripDays = trip?.startDate && trip?.endDate ? getCalendarDayDiff(startStr, endStr) : 1;

  let isUpcoming = false;
  let isCompleted = false;
  let isOngoing = false;
  let elapsedDays = 1;
  let remainingDays = 1;

  if (todayDateStr < startStr) {
    isUpcoming = true;
    elapsedDays = 0;
    remainingDays = totalTripDays;
  } else if (todayDateStr > endStr) {
    isCompleted = true;
    elapsedDays = totalTripDays;
    remainingDays = 0;
  } else {
    isOngoing = true;
    elapsedDays = getCalendarDayDiff(startStr, todayDateStr);
    remainingDays = Math.max(1, totalTripDays - elapsedDays + 1);
  }

  // Calculate Today's Spend
  const todayExpenses = activeExpenses.filter((e) => {
    const expenseDate = toLocalDateString(e.date || e.createdAt);
    return expenseDate === todayDateStr;
  });

  const todaySpent = todayExpenses.reduce((sum, e) => {
    if ((e as unknown as { isRefund?: boolean }).isRefund) {
      return sum - (e.amount || 0);
    }
    return sum + (e.amount || 0);
  }, 0);

  // Daily Allowance Target (based on budget remaining entering today across remaining days)
  const plannedDailyBudget = totalBudget > 0 ? totalBudget / totalTripDays : 0;
  const effectiveRemainingDays = isCompleted ? 1 : Math.max(1, remainingDays);
  
  // Budget available entering today for the remaining duration
  const budgetForRemainingDays = Math.max(0, remainingBudget + todaySpent);
  const adjustedDailyAllowance = totalBudget > 0 ? budgetForRemainingDays / effectiveRemainingDays : 0;

  const todayBurnRatio = adjustedDailyAllowance > 0 ? todaySpent / adjustedDailyAllowance : todaySpent > 0 ? 2.0 : 0;

  // Velocity & Forecast
  const effectiveElapsed = Math.max(1, elapsedDays);
  const averageDailyBurn = totalSpent / effectiveElapsed;
  const projectedTotalSpend = isCompleted
    ? totalSpent
    : isUpcoming
    ? totalSpent
    : totalSpent + averageDailyBurn * Math.max(0, remainingDays - 1);
  const projectedVariance = totalBudget > 0 ? totalBudget - projectedTotalSpend : 0;

  // Status determination
  let status: BudgetPacing['status'] = 'no_budget';
  let statusMessage = '';

  if (!hasBudget) {
    status = 'no_budget';
    statusMessage = 'Set a trip budget to track daily burn pace';
  } else if (totalSpent > totalBudget) {
    status = 'over_budget';
    const over = Math.round(totalSpent - totalBudget);
    statusMessage = `${currencySymbol}${over.toLocaleString()} over total budget`;
  } else if (todayBurnRatio > 1.25 && isOngoing) {
    status = 'warning';
    const multiplier = todayBurnRatio.toFixed(1);
    const diff = Math.round(todaySpent - adjustedDailyAllowance);
    statusMessage = `${multiplier}x daily burn • ${currencySymbol}${diff.toLocaleString()} over today's target`;
  } else if (budgetUsedPercent >= 85) {
    status = 'warning';
    statusMessage = `${budgetUsedPercent}% of trip budget used (${remainingDays} days left)`;
  } else {
    status = 'on_track';
    if (isUpcoming) {
      statusMessage = `Planned budget: ${currencySymbol}${Math.round(plannedDailyBudget).toLocaleString()}/day`;
    } else if (isCompleted) {
      statusMessage = `Trip finished with ${currencySymbol}${Math.round(remainingBudget).toLocaleString()} unspent`;
    } else {
      statusMessage = `On track: ${currencySymbol}${Math.round(adjustedDailyAllowance).toLocaleString()}/day remaining`;
    }
  }

  return {
    hasBudget,
    totalBudget,
    totalSpent,
    remainingBudget,
    budgetUsedPercent,
    totalTripDays,
    elapsedDays,
    remainingDays,
    isUpcoming,
    isCompleted,
    isOngoing,
    plannedDailyBudget,
    adjustedDailyAllowance,
    todaySpent,
    todayBurnRatio,
    averageDailyBurn,
    projectedTotalSpend,
    projectedVariance,
    status,
    statusMessage,
  };
}
