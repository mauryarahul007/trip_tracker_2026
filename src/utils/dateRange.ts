// Compact human-readable date range for the trip header, e.g. "12–18 Dec",
// "10 Oct – 18 Dec", or "28 Dec 2026 – 3 Jan 2027" across a year boundary.
export function formatDateRange(start: string, end: string): string {
  if (!start || !end) return '';
  const s = new Date(`${start}T00:00:00`);
  const e = new Date(`${end}T00:00:00`);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return '';

  const sDay = s.getDate();
  const eDay = e.getDate();
  const sMonth = s.toLocaleDateString('en-US', { month: 'short' });
  const eMonth = e.toLocaleDateString('en-US', { month: 'short' });
  const sYear = s.getFullYear();
  const eYear = e.getFullYear();

  if (sYear !== eYear) {
    return `${sDay} ${sMonth} ${sYear} – ${eDay} ${eMonth} ${eYear}`;
  }
  if (sMonth === eMonth) {
    return `${sDay}–${eDay} ${sMonth}`;
  }
  return `${sDay} ${sMonth} – ${eDay} ${eMonth}`;
}

// Which day of the trip a date falls on ("Day 1" = tripStartDate), the way
// travelers actually remember their spending rather than by raw calendar
// date. Returns null when the expense predates the trip or the dates don't
// parse, so callers can fall back to a plain date label.
export function tripDayNumber(tripStartDate: string, date: string): number | null {
  const start = new Date(`${tripStartDate}T00:00:00`);
  const d = new Date(`${date}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(d.getTime())) return null;
  const dayNum = Math.round((d.getTime() - start.getTime()) / 86400000) + 1;
  return dayNum >= 1 ? dayNum : null;
}

// Two-line postmark text for the trip-list stamp corner, e.g. { top: '12–18', bottom: 'DEC' }
// or { top: 'DEC', bottom: '– JAN' } when the trip spans a month boundary.
export function formatTripStamp(start: string, end: string): { top: string; bottom: string } {
  if (!start || !end) return { top: '', bottom: '' };
  const s = new Date(`${start}T00:00:00`);
  const e = new Date(`${end}T00:00:00`);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return { top: '', bottom: '' };

  const sDay = s.getDate();
  const eDay = e.getDate();
  const sMonth = s.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
  const eMonth = e.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();

  if (s.getFullYear() !== e.getFullYear()) {
    return { top: String(s.getFullYear()), bottom: `– ${e.getFullYear()}` };
  }
  if (sMonth === eMonth) {
    return { top: `${sDay}–${eDay}`, bottom: sMonth };
  }
  return { top: sMonth, bottom: `– ${eMonth}` };
}
