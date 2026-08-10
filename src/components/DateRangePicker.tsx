import { useState } from 'react';
import { getMonthGrid, toISODate, fromISODate, isSameDate, isBetweenExclusive, formatSingleDate } from '../utils/calendar';
import { IconCalendar, IconChevronLeft, IconChevronRight } from './Icons';

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

type Props = {
  startDate: string;
  endDate: string;
  onSelectStart: (iso: string) => void;
  onSelectEnd: (iso: string) => void;
};

// Pick both ends of a trip's date range in one popover: tap a start day,
// tap an end day, done — no separate "from" and "to" fields to open twice.
export function DateRangePicker({ startDate, endDate, onSelectStart, onSelectEnd }: Props) {
  const [open, setOpen] = useState(false);
  const initial = fromISODate(startDate) || new Date();
  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());
  const [hoverDate, setHoverDate] = useState<Date | null>(null);

  const startD = fromISODate(startDate);
  const endD = fromISODate(endDate);
  const pickingEnd = !!startD && !endD;

  const weeks = getMonthGrid(viewYear, viewMonth);
  const today = new Date();

  const goMonth = (delta: number) => {
    let m = viewMonth + delta;
    let y = viewYear;
    if (m < 0) { m = 11; y -= 1; }
    if (m > 11) { m = 0; y += 1; }
    setViewMonth(m);
    setViewYear(y);
  };

  const handleDayClick = (date: Date) => {
    const iso = toISODate(date);
    if (!startD || (startD && endD)) {
      onSelectStart(iso);
      onSelectEnd('');
      return;
    }
    if (date.getTime() < startD.getTime()) {
      onSelectEnd(startDate);
      onSelectStart(iso);
    } else {
      onSelectEnd(iso);
    }
    setOpen(false);
  };

  const previewEnd = pickingEnd ? hoverDate : null;
  const rangeEnd = endD || previewEnd;

  const triggerLabel = startD && endD
    ? `${formatSingleDate(startDate)} – ${formatSingleDate(endDate)}`
    : startD
      ? `${formatSingleDate(startDate)} – select end date`
      : 'Select trip dates';

  return (
    <div
      style={{ position: 'relative' }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false);
      }}
    >
      <button
        type="button"
        className="flight-trigger"
        aria-label={triggerLabel}
        onClick={() => setOpen(!open)}
      >
        <span className="ft-leg">
          <span className={`ft-pin${startD ? ' ft-pin-filled' : ''}`} />
          <span className="ft-date" style={{ color: startD ? 'var(--text-primary)' : 'var(--text-muted)' }}>
            {startD ? formatSingleDate(startDate) : 'Depart'}
          </span>
        </span>
        <span className="ft-route">
          <span className="ft-plane" aria-hidden="true">✈️</span>
        </span>
        <span className="ft-leg">
          <span className={`ft-pin${endD ? ' ft-pin-filled' : ''}`} />
          <span className="ft-date" style={{ color: endD ? 'var(--text-primary)' : 'var(--text-muted)' }}>
            {endD ? formatSingleDate(endDate) : 'Return'}
          </span>
        </span>
        <span style={{ marginLeft: 'auto', alignSelf: 'center', color: 'var(--text-muted)', display: 'flex', flexShrink: 0 }}>
          <IconCalendar size={14} className="icon-sm" />
        </span>
      </button>

      {open && (
        <div className="date-picker-popover">
          <div className="date-picker-nav">
            <button type="button" aria-label="Previous month" onClick={() => goMonth(-1)}>
              <IconChevronLeft size={16} className="icon-sm" />
            </button>
            <span>{new Date(viewYear, viewMonth, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
            <button type="button" aria-label="Next month" onClick={() => goMonth(1)}>
              <IconChevronRight size={16} className="icon-sm" />
            </button>
          </div>

          <div className="date-picker-grid date-picker-weekdays">
            {WEEKDAYS.map((w) => <span key={w}>{w}</span>)}
          </div>

          {weeks.map((week, wi) => (
            <div className="date-picker-grid" key={wi}>
              {week.map((date, di) => {
                if (!date) return <span key={di} />;
                const isStart = isSameDate(date, startD);
                const isEnd = isSameDate(date, endD);
                const inRange = startD && rangeEnd && isBetweenExclusive(date, startD, rangeEnd);
                const isToday = isSameDate(date, today);
                return (
                  <button
                    key={di}
                    type="button"
                    className={`date-picker-day${isStart || isEnd ? ' selected' : ''}${inRange ? ' in-range' : ''}${isToday ? ' today' : ''}`}
                    onClick={() => handleDayClick(date)}
                    onMouseEnter={() => setHoverDate(date)}
                  >
                    {date.getDate()}
                  </button>
                );
              })}
            </div>
          ))}

          {startD && (
            <button
              type="button"
              className="date-picker-clear"
              onClick={() => { onSelectStart(''); onSelectEnd(''); }}
            >
              Clear dates
            </button>
          )}
        </div>
      )}
    </div>
  );
}
