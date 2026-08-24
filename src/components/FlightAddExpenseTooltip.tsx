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

      {/* 3D Isometric Aircraft Stage & Jet Emitter */}
      <div className="flight-airplane-stage" aria-hidden="true">
        {/* Animated Jet Exhaust Vapor Rings */}
        <div className="jet-exhaust-emitter">
          <span className="exhaust-ring ring-1" />
          <span className="exhaust-ring ring-2" />
        </div>

        {/* Multi-Faceted 3D Origami Aircraft */}
        <svg className="origami-airplane-svg" viewBox="0 0 36 36" fill="none">
          <defs>
            <linearGradient id="ttWingLeftGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="100%" stopColor="#7EE7DC" />
            </linearGradient>
            <linearGradient id="ttFuselageGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0F6F63" />
              <stop offset="100%" stopColor="#083B34" />
            </linearGradient>
            <linearGradient id="ttWingRightGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3FA396" />
              <stop offset="100%" stopColor="#0D594F" />
            </linearGradient>
            <linearGradient id="ttFinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FF9800" />
              <stop offset="100%" stopColor="#E65100" />
            </linearGradient>
          </defs>

          {/* Left Wing Facet */}
          <polygon points="18,4 3,25 18,21" fill="url(#ttWingLeftGrad)" />

          {/* Right Wing Facet */}
          <polygon points="18,4 33,25 18,21" fill="url(#ttWingRightGrad)" />

          {/* Fuselage Spine */}
          <polygon points="18,4 18,29 15,22" fill="url(#ttFuselageGrad)" />
          <polygon points="18,4 21,22 18,29" fill="url(#ttFuselageGrad)" opacity="0.85" />

          {/* Tail Fin Accent */}
          <polygon points="18,20 18,28 16.5,27" fill="url(#ttFinGrad)" />
          
          {/* Canopy Cockpit Sparkle */}
          <circle cx="18" cy="11" r="1.5" fill="#FFFFFF" opacity="0.9" />
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

      <div className="flight-tooltip-arrow" aria-hidden="true">
        <span className="arrow-beacon-pulse" />
      </div>
    </div>
  );
}
