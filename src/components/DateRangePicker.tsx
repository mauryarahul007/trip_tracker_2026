import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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
  const wrapperRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [popoverPos, setPopoverPos] = useState({ top: 0, left: 0 });

  // The trigger sits inside a `.glass-card`, which uses `content-visibility:
  // auto` for list-scroll performance -- that implicitly clips overflowing
  // absolutely-positioned children to the card bounds. Portal the popover to
  // <body> and position it with fixed coords so it isn't cut off.
  useEffect(() => {
    if (!open) return;
    const updatePos = () => {
      const rect = wrapperRef.current?.getBoundingClientRect();
      if (rect) setPopoverPos({ top: rect.bottom + 6, left: rect.left });
    };
    updatePos();
    window.addEventListener('resize', updatePos);
    window.addEventListener('scroll', updatePos, true);
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (wrapperRef.current?.contains(target) || popoverRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('resize', updatePos);
      window.removeEventListener('scroll', updatePos, true);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

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
    <div ref={wrapperRef} style={{ position: 'relative' }}>
      <button
        type="button"
        className="flight-trigger"
        aria-label={triggerLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
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

      {open && createPortal(
        <div
          ref={popoverRef}
          className="date-picker-popover"
          role="dialog"
          aria-label="Trip dates calendar"
          style={{ position: 'fixed', top: popoverPos.top, left: popoverPos.left }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setOpen(false);
          }}
        >
          <div className="date-picker-nav">
            <button type="button" aria-label="Previous month" onClick={() => goMonth(-1)}>
              <IconChevronLeft size={16} className="icon-sm" />
            </button>
            <span aria-live="polite" style={{ fontWeight: 600 }}>
              {new Date(viewYear, viewMonth, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </span>
            <button type="button" aria-label="Next month" onClick={() => goMonth(1)}>
              <IconChevronRight size={16} className="icon-sm" />
            </button>
          </div>

          <div className="date-picker-grid date-picker-weekdays" role="row">
            {WEEKDAYS.map((w) => (
              <span key={w} role="columnheader" aria-label={w === 'Su' ? 'Sunday' : w === 'Mo' ? 'Monday' : w === 'Tu' ? 'Tuesday' : w === 'We' ? 'Wednesday' : w === 'Th' ? 'Thursday' : w === 'Fr' ? 'Friday' : 'Saturday'}>
                {w}
              </span>
            ))}
          </div>

          <div role="grid" aria-label="Calendar month">
            {weeks.map((week, wi) => (
              <div className="date-picker-grid" key={wi} role="row">
                {week.map((date, di) => {
                  if (!date) return <span key={di} role="gridcell" aria-hidden="true" />;
                  const isStart = isSameDate(date, startD);
                  const isEnd = isSameDate(date, endD);
                  const inRange = startD && rangeEnd && isBetweenExclusive(date, startD, rangeEnd);
                  const isToday = isSameDate(date, today);
                  const fullDateLabel = date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
                  return (
                    <button
                      key={di}
                      type="button"
                      role="gridcell"
                      aria-selected={Boolean(isStart || isEnd || inRange)}
                      aria-label={`${fullDateLabel}${isStart ? ', trip start date' : ''}${isEnd ? ', trip end date' : ''}${isToday ? ', today' : ''}`}
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
          </div>

          {startD && (
            <button
              type="button"
              className="date-picker-clear"
              onClick={() => { onSelectStart(''); onSelectEnd(''); }}
            >
              Clear dates
            </button>
          )}
        </div>,
        document.body
      )}

    </div>
  );
}
