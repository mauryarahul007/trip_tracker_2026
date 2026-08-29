import { memo } from 'react';
import type { Trip } from '../types';
import { formatAmount } from '../utils/currency';
import { triggerHaptic } from '../utils/haptics';
import { IconCheckCircle, IconChevronUp } from './Icons';
import { useAnimatedNumber } from '../hooks/useAnimatedNumber';
import { parseTripRoute } from '../utils/routeHelper';

interface StickyBalanceBarProps {
  trip: Trip;
  currencySymbol: string;
  totalOutstanding: number;
  myNetBalance: number;
  isFullySettled: boolean;
  isVisible: boolean;
  onScrollToTop: () => void;
}

function getTripDurationLabel(startDate?: string, endDate?: string, stopCount?: number): string {
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
  if (stopCount && stopCount > 1) {
    return daysText ? `${daysText} · ${stopCount} Stops` : `${stopCount} Stops`;
  }
  return daysText || 'Direct';
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
  const route = parseTripRoute(trip);
  const durationLabel = getTripDurationLabel(trip.startDate, trip.endDate, route.allStops.length > 1 ? route.allStops.length : undefined);

  const handleScrollToTop = () => {
    triggerHaptic('light');
    onScrollToTop();
  };

  return (
    <aside
      className={`sticky-balance-bar ${isVisible ? 'visible' : ''}`}
      role="region"
      aria-label="Sticky mini boarding pass summary"
      aria-hidden={!isVisible}
      onClick={handleScrollToTop}
    >
      <div className="mini-bp-capsule">
        {/* Left Stub: Complete Route */}
        <div className="mini-bp-section left">
          <span className="mini-bp-stub-tag">PASS</span>
          <span className="mini-bp-title" title={route.fullRoute}>
            {route.fullRoute}
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
