import React, { useState, useEffect } from 'react';
import { triggerHaptic } from '../utils/haptics';

export const STORAGE_KEY = 'tt_flight_add_tooltip_dismissed_v1';

export function getFlightTooltipMessage(expenseCount: number, tripDestination?: string): { badge: string; text: string } {
  const destinationLabel = tripDestination ? tripDestination.split(/[→\->,/|]/)[0].trim() : '';
  if (expenseCount === 0) {
    return {
      badge: '✈️ Takeoff',
      text: destinationLabel ? `Ready for ${destinationLabel}? Log your 1st expense!` : 'Ready for takeoff? Tap + to log an expense!',
    };
  }
  return {
    badge: '⚡ Quick Add',
    text: 'Tap + to split flights, stay or food',
  };
}

interface Props {
  onAddExpense: () => void;
  expenseCount?: number;
  tripDestination?: string;
}

export function FlightAddExpenseTooltip({ onAddExpense, expenseCount = 0, tripDestination }: Props) {
  const [visible, setVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(true);

  useEffect(() => {
    // Check if previously dismissed
    try {
      const dismissed = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
      if (!dismissed) {
        setIsDismissed(false);
        // Small delay for smooth entrance after page load
        const timer = setTimeout(() => setVisible(true), 600);
        return () => clearTimeout(timer);
      }
    } catch {
      // localStorage disabled / private browsing
      setIsDismissed(true);
    }
  }, []);

  if (isDismissed) return null;

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic('light');
    setVisible(false);
    setTimeout(() => {
      setIsDismissed(true);
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(STORAGE_KEY, 'true');
        }
      } catch {
        // ignore
      }
    }, 280);
  };

  const handleTooltipClick = () => {
    triggerHaptic('medium');
    handleDismiss({ stopPropagation: () => {} } as React.MouseEvent);
    onAddExpense();
  };

  const message = getFlightTooltipMessage(expenseCount, tripDestination);

  return (
    <div
      className={`flight-add-tooltip ${visible ? 'enter' : 'leave'}`}
      onClick={handleTooltipClick}
      role="tooltip"
      aria-label="Quick add transaction guide"
    >
      {/* Curved vapor flight contrail SVG */}
      <svg className="flight-contrail-svg" viewBox="0 0 160 36" fill="none" preserveAspectRatio="none" aria-hidden="true">
        <path
          d="M 10 28 C 45 4, 115 4, 150 28"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeDasharray="3 3"
          className="contrail-path"
        />
      </svg>

      {/* Floating Animated Airplane */}
      <div className="flight-airplane-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
          <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
        </svg>
      </div>

      <div className="flight-tooltip-content">
        <span className="flight-tooltip-badge">{message.badge}</span>
        <p className="flight-tooltip-text">{message.text}</p>
      </div>

      <button
        type="button"
        className="flight-tooltip-close"
        onClick={handleDismiss}
        aria-label="Dismiss tooltip"
        title="Dismiss"
      >
        &times;
      </button>

      <div className="flight-tooltip-arrow" aria-hidden="true" />
    </div>
  );
}
