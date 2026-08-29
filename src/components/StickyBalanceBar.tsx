import { memo } from 'react';
import type { Trip } from '../types';
import { formatAmount } from '../utils/currency';
import { triggerHaptic } from '../utils/haptics';
import { IconCheckCircle, IconChevronUp } from './Icons';
import { useAnimatedNumber } from '../hooks/useAnimatedNumber';

interface StickyBalanceBarProps {
  trip: Trip;
  currencySymbol: string;
  totalOutstanding: number;
  myNetBalance: number;
  isFullySettled: boolean;
  isVisible: boolean;
  onScrollToTop: () => void;
}

function getTripDurationLabel(startDate?: string, endDate?: string, stops?: { name: string }[]): string {
  let daysText = '';
  if (startDate && endDate) {
    try {
      const s = new Date(startDate);
      const e = new Date(endDate);
      const diffMs = e.getTime() - s.getTime();
      const days = Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1;
      if (days > 0) daysText = `${days}D`;
    } catch {}
  }
  const stopCount = stops?.length || 0;
  if (stopCount > 0) {
    return daysText ? `${daysText} · ${stopCount} Stop${stopCount === 1 ? '' : 's'}` : `${stopCount} Stop${stopCount === 1 ? '' : 's'}`;
  }
  return daysText || 'Route';
}

export const StickyBalanceBar = memo(function StickyBalanceBar({
  trip,
  currencySymbol,
  totalOutstanding,
  isFullySettled,
  isVisible,
  onScrollToTop,
}: StickyBalanceBarProps) {
  const animatedOutstanding = useAnimatedNumber(totalOutstanding, 280);

  const handleScrollToTop = () => {
    triggerHaptic('light');
    onScrollToTop();
  };

  const destination = trip.destination || trip.name;
  const durationLabel = getTripDurationLabel(trip.startDate, trip.endDate, trip.stops);

  return (
    <aside
      className={`sticky-balance-bar ${isVisible ? 'visible' : ''}`}
      role="region"
      aria-label="Sticky mini boarding pass summary"
      aria-hidden={!isVisible}
      onClick={handleScrollToTop}
    >
      <div className="mini-bp-capsule">
        {/* Left Stub: Route / Destination */}
        <div className="mini-bp-section left">
          <span className="mini-bp-stub-tag">PASS</span>
          <span className="mini-bp-title" title={destination}>
            {destination}
          </span>
        </div>

        {/* Center Stub: Duration & Stops */}
        <div className="mini-bp-section center">
          <span className="mini-bp-duration">
            {durationLabel}
          </span>
        </div>

        {/* Right Stub: Outstanding Amount / Settle Status */}
        <div className="mini-bp-section right">
          {isFullySettled ? (
            <span className="mini-bp-settled">
              <IconCheckCircle size={13} />
              <span>All Settled</span>
            </span>
          ) : (
            <div className="mini-bp-amount-wrap">
              <span className="mini-bp-label">OUTSTANDING</span>
              <strong className="mini-bp-amount tabular-nums">
                {formatAmount(animatedOutstanding, currencySymbol)}
              </strong>
            </div>
          )}
        </div>

        {/* Scroll back to top icon */}
        <button
          type="button"
          className="mini-bp-top-btn"
          aria-label="Scroll back to Boarding Pass"
          onClick={(e) => {
            e.stopPropagation();
            handleScrollToTop();
          }}
        >
          <IconChevronUp size={14} />
        </button>
      </div>
    </aside>
  );
});
