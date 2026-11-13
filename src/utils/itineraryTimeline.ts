import type { Expense, ItineraryItem, TravelPass } from '../types';
import { tripDayNumber } from './dateRange';

export type ItineraryTimelineItem =
  | {
      kind: 'activity';
      id: string;
      date: string;
      time: string;
      title: string;
      category?: string;
      location?: string;
      notes?: string;
      completed: boolean;
      data: ItineraryItem;
    }
  | {
      kind: 'pass';
      id: string;
      date: string;
      time: string;
      title: string;
      category?: string;
      location?: string;
      data: TravelPass;
    }
  | {
      kind: 'expense';
      id: string;
      date: string;
      time: string;
      title: string;
      amount: number;
      currency?: string;
      category?: string;
      data: Expense;
    };

export interface DayItineraryGroup {
  date: string; // YYYY-MM-DD
  dayNumber: number | null; // e.g. 1, 2
  dateLabel: string; // e.g. "Sat, Oct 12"
  isToday: boolean;
  totalSpend: number;
  activities: ItineraryItem[];
  passes: TravelPass[];
  expenses: Expense[];
  items: ItineraryTimelineItem[];
  completedActivitiesCount: number;
  totalActivitiesCount: number;
}

export function formatIsoDateLabel(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function toLocalDateString(d: Date): string {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function extractPassDateAndTime(pass: TravelPass): { date: string; time: string } {
  if (pass.startDateTime) {
    const raw = pass.startDateTime;
    if (raw.includes('T')) {
      const [d, t] = raw.split('T');
      return { date: d, time: t.slice(0, 5) };
    }
    return { date: raw.slice(0, 10), time: '09:00' };
  }
  return { date: '', time: '' };
}

export function formatTimeDisplay(timeStr?: string): string {
  if (!timeStr) return '';
  const parts = timeStr.trim().split(':');
  if (parts.length < 2) return timeStr;
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  if (isNaN(hours) || isNaN(minutes)) return timeStr;

  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 === 0 ? 12 : hours % 12;
  const displayMinutes = minutes.toString().padStart(2, '0');
  return `${displayHours}:${displayMinutes} ${period}`;
}

export function getDirectionsUrl(location: string): string {
  const clean = location.trim();
  if (!clean) return '';
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(clean)}`;
}

export interface BuildItineraryParams {
  tripStartDate?: string;
  tripEndDate?: string;
  activities?: ItineraryItem[];
  passes?: TravelPass[];
  expenses?: Expense[];
  sortOrder?: 'asc' | 'desc';
  todayIso?: string;
}

/**
 * Builds a chronological day-by-day itinerary merging scheduled activities,
 * travel passes/transit, and actual expenses for each day of a trip.
 */
export function buildItineraryTimeline({
  tripStartDate,
  tripEndDate,
  activities = [],
  passes = [],
  expenses = [],
  sortOrder = 'asc',
  todayIso = toLocalDateString(new Date()),
}: BuildItineraryParams): DayItineraryGroup[] {
  const dateMap = new Map<
    string,
    {
      activities: ItineraryItem[];
      passes: TravelPass[];
      expenses: Expense[];
    }
  >();

  const ensureDate = (date: string) => {
    if (!dateMap.has(date)) {
      dateMap.set(date, { activities: [], passes: [], expenses: [] });
    }
  };

  // 1. Populate full date range from trip start to end dates
  if (tripStartDate) {
    const s = new Date(`${tripStartDate}T00:00:00`);
    const e = tripEndDate ? new Date(`${tripEndDate}T00:00:00`) : s;
    if (!Number.isNaN(s.getTime()) && !Number.isNaN(e.getTime())) {
      const cur = new Date(s);
      let count = 0;
      // Cap at 60 days to prevent excessive loops for long trips
      while (cur <= e && count < 60) {
        const iso = toLocalDateString(cur);
        ensureDate(iso);
        cur.setDate(cur.getDate() + 1);
        count++;
      }
    }
  }

  // 2. Add dates from planned activities
  activities.forEach((act) => {
    if (!act.date) return;
    ensureDate(act.date);
    dateMap.get(act.date)!.activities.push(act);
  });

  // 3. Add dates from travel passes
  passes.forEach((pass) => {
    const { date } = extractPassDateAndTime(pass);
    if (!date) return;
    ensureDate(date);
    dateMap.get(date)!.passes.push(pass);
  });

  // 4. Add dates from expenses (excluding settlements or deleted)
  expenses.forEach((exp) => {
    if (!exp.date || exp.deletedAt || exp.isSettlement) return;
    ensureDate(exp.date);
    dateMap.get(exp.date)!.expenses.push(exp);
  });

  // Sort dates
  const sortedDates = Array.from(dateMap.keys()).sort((a, b) =>
    sortOrder === 'asc' ? a.localeCompare(b) : b.localeCompare(a)
  );

  return sortedDates.map((date) => {
    const groupData = dateMap.get(date)!;
    const dayNumber = tripStartDate ? tripDayNumber(tripStartDate, date) : null;
    const dateLabel = formatIsoDateLabel(date);
    const isToday = date === todayIso;

    const totalSpend = groupData.expenses
      .filter((e) => !e.excludeFromTotals)
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    const items: ItineraryTimelineItem[] = [];

    // Map passes
    groupData.passes.forEach((pass) => {
      const { time } = extractPassDateAndTime(pass);
      items.push({
        kind: 'pass',
        id: pass.id,
        date,
        time: time || '09:00',
        title: pass.title,
        category: pass.type,
        location: pass.origin || pass.destination || pass.address || pass.provider,
        data: pass,
      });
    });

    // Map activities
    groupData.activities.forEach((act) => {
      items.push({
        kind: 'activity',
        id: act.id,
        date,
        time: act.time || '10:00',
        title: act.title,
        category: act.category || 'activity',
        location: act.location,
        notes: act.notes,
        completed: !!act.completed,
        data: act,
      });
    });

    // Map expenses
    groupData.expenses.forEach((exp) => {
      items.push({
        kind: 'expense',
        id: exp.id,
        date,
        time: '12:00',
        title: exp.title,
        amount: Number(exp.amount) || 0,
        currency: exp.currency,
        category: exp.category,
        data: exp,
      });
    });

    // Sort items chronologically within the day
    items.sort((a, b) => {
      const timeDiff = a.time.localeCompare(b.time);
      if (timeDiff !== 0) return timeDiff;
      // Prioritize passes, then activities, then expenses
      const priority = { pass: 1, activity: 2, expense: 3 };
      return priority[a.kind] - priority[b.kind];
    });

    const completedActivitiesCount = groupData.activities.filter((a) => a.completed).length;

    return {
      date,
      dayNumber,
      dateLabel,
      isToday,
      totalSpend,
      activities: groupData.activities,
      passes: groupData.passes,
      expenses: groupData.expenses,
      items,
      completedActivitiesCount,
      totalActivitiesCount: groupData.activities.length,
    };
  });
}
