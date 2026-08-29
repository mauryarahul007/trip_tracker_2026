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

function getTripDurationLabel(startDate?: string, endDate?: string): string {
  if (startDate && endDate) {
    try {
      const s = new Date(startDate);
      const e = new Date(endDate);
      const diffMs = e.getTime() - s.getTime();
      const days = Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1;
      if (days > 0) return `${days} Days`;
    } catch {}
  }
  return 'Trip Route';
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
  const durationLabel = getTripDurationLabel(trip.startDate, trip.endDate);

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
        {/* Left Side: Route & Meta */}
        <div className="mini-bp-left-group">
          <div className="mini-bp-route-line">
            <span className="mini-bp-stub-tag">PASS</span>
            <strong className="mini-bp-route-text" title={route.fullRoute}>
              {route.fullRoute}
            </strong>
          </div>
          <div className="mini-bp-sub-meta">
            <span>{durationLabel}</span>
            <span className="mini-bp-dot">•</span>
            <span>{route.isMultiStop ? `${route.allStops.length} Stops` : 'Direct Route'}</span>
          </div>
        </div>

        {/* Right Side: Outstanding & Jump Action */}
        <div className="mini-bp-right-group">
          <div className="mini-bp-amount-wrap">
            <span className="mini-bp-label">
              {isFullySettled ? 'STATUS' : 'OUTSTANDING'}
            </span>
            {isFullySettled ? (
              <span className="mini-bp-settled">
                <IconCheckCircle size={13} />
                <span>All Settled</span>
              </span>
            ) : (
              <strong className="mini-bp-amount tabular-nums">
                {formatAmount(animatedOutstanding, currencySymbol)}
              </strong>
            )}
          </div>

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
      </div>
    </aside>
  );
});
