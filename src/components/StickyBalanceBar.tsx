import { memo } from 'react';
import type { Trip } from '../types';
import { formatAmount } from '../utils/currency';
import { triggerHaptic } from '../utils/haptics';
import { IconCheckCircle, IconChevronUp } from './Icons';

interface StickyBalanceBarProps {
  trip: Trip;
  currencySymbol: string;
  totalSpent: number;
  myNetBalance: number;
  isFullySettled: boolean;
  isVisible: boolean;
  onScrollToTop: () => void;
}

export const StickyBalanceBar = memo(function StickyBalanceBar({
  trip,
  currencySymbol,
  totalSpent,
  myNetBalance,
  isFullySettled,
  isVisible,
  onScrollToTop,
}: StickyBalanceBarProps) {
  const handleScrollToTop = () => {
    triggerHaptic('light');
    onScrollToTop();
  };

  const isOwed = myNetBalance > 0.01;
  const isOwing = myNetBalance < -0.01;
  const destination = trip.destination || trip.name;

  return (
    <aside
      className={`sticky-balance-bar ${isVisible ? 'visible' : ''}`}
      role="region"
      aria-label="Sticky trip balance summary"
      aria-hidden={!isVisible}
    >
      <div className="sticky-balance-inner">
        {/* Left: Destination / Trip Pill */}
        <div className="sticky-balance-left">
          <span className="sticky-balance-icon" aria-hidden="true">✈️</span>
          <span className="sticky-balance-dest" title={destination}>
            {destination}
          </span>
        </div>

        {/* Center: Total Spent */}
        <div className="sticky-balance-center">
          <span className="sticky-balance-caption">Total</span>
          <strong className="sticky-balance-amount">
            {formatAmount(totalSpent, currencySymbol)}
          </strong>
        </div>

        {/* Right: Personal Status / Settle Pill */}
        <div className="sticky-balance-right">
          {isFullySettled ? (
            <span className="sticky-balance-tag settled">
              <IconCheckCircle size={12} />
              <span>Settled</span>
            </span>
          ) : isOwed ? (
            <span className="sticky-balance-tag credit">
              <span>Gets</span>
              <strong>+{formatAmount(myNetBalance, currencySymbol)}</strong>
            </span>
          ) : isOwing ? (
            <span className="sticky-balance-tag debit">
              <span>Owes</span>
              <strong>-{formatAmount(Math.abs(myNetBalance), currencySymbol)}</strong>
            </span>
          ) : (
            <span className="sticky-balance-tag neutral">
              <span>Even</span>
            </span>
          )}

          <button
            type="button"
            className="sticky-balance-top-btn"
            aria-label="Scroll back to top"
            onClick={handleScrollToTop}
          >
            <IconChevronUp size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
});
