import React, { useState, useEffect } from 'react';
import { triggerHaptic } from '../utils/haptics';

export const STORAGE_KEY = 'tt_flight_add_tooltip_dismissed_v1';

export function getFlightTooltipMessage(_expenseCount: number, _tripDestination?: string): { badge: string; text: string } {
  return { badge: '', text: 'Add expense' };
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
    const checkDismissed = () => {
      try {
        const dismissed = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
        if (!dismissed) {
          setIsDismissed(false);
          const timer = setTimeout(() => setVisible(true), 600);
          return () => clearTimeout(timer);
        } else {
          setIsDismissed(true);
          setVisible(false);
        }
      } catch {
        setIsDismissed(true);
      }
    };

    checkDismissed();

    const handleResetEvent = () => {
      setIsDismissed(false);
      requestAnimationFrame(() => setVisible(true));
    };

    window.addEventListener('tt:reset-coachmarks', handleResetEvent);
    return () => window.removeEventListener('tt:reset-coachmarks', handleResetEvent);
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

      {/* 3D Aerodynamic Aircraft Stage & Jet Thrusters */}
      <div className="flight-airplane-stage" aria-hidden="true">
        {/* Dual Jet Exhaust Vapor Emitters under Engine Pylons */}
        <div className="jet-engines-emitter">
          <span className="engine-flame flame-left" />
          <span className="engine-flame flame-right" />
        </div>

        {/* High-Fidelity Aerodynamic Jetliner SVG */}
        <svg className="origami-airplane-svg aero-jetliner-svg" viewBox="0 0 44 44" fill="none">
          <defs>
            <linearGradient id="fuselageBody" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="50%" stopColor="#E2F7F4" />
              <stop offset="100%" stopColor="#AEE7E0" />
            </linearGradient>
            <linearGradient id="wingSwept" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="100%" stopColor="#15887B" />
            </linearGradient>
            <linearGradient id="cockpitGlass" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3FCBBD" />
              <stop offset="100%" stopColor="#0B4B43" />
            </linearGradient>
            <linearGradient id="tailLivery" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FF9800" />
              <stop offset="100%" stopColor="#E65100" />
            </linearGradient>
            <linearGradient id="engineNacelle" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#D5DFE5" />
              <stop offset="100%" stopColor="#0F6F63" />
            </linearGradient>
          </defs>

          {/* Underwing Turbofan Engines */}
          <rect x="11.5" y="24" width="3" height="7" rx="1.5" fill="url(#engineNacelle)" />
          <rect x="29.5" y="24" width="3" height="7" rx="1.5" fill="url(#engineNacelle)" />

          {/* Swept Main Wings with Winglets */}
          <path
            d="M22 17 L3 27 C2 27.6 2 29 3 29.5 L8 29.5 L22 25 L36 29.5 L41 29.5 C42 29 42 27.6 41 27 Z"
            fill="url(#wingSwept)"
            stroke="rgba(15,111,99,0.2)"
            strokeWidth="0.5"
          />

          {/* Wingtip Winglet Highlights */}
          <polygon points="3,27 2,24 3.5,27.5" fill="url(#tailLivery)" />
          <polygon points="41,27 42,24 40.5,27.5" fill="url(#tailLivery)" />

          {/* Horizontal Tail Stabilizers */}
          <path d="M22 36 L13 40.5 C12.5 40.8 12.5 41.5 13 41.8 L15.5 41.8 L22 39.5 L28.5 41.8 L31 41.8 C31.5 41.5 31.5 40.8 31 40.5 Z" fill="#9CD8D0" />

          {/* Main Fuselage Needle */}
          <path
            d="M22 3 C20 7 19.5 14 19.5 34 C19.5 37.5 20.5 41 22 42.5 C23.5 41 24.5 37.5 24.5 34 C24.5 14 24 7 22 3 Z"
            fill="url(#fuselageBody)"
          />

          {/* Cockpit Canopy Windshield */}
          <path d="M20.5 7.5 C20.5 6 23.5 6 23.5 7.5 L24 10 C24 10.8 20 10.8 20 10 Z" fill="url(#cockpitGlass)" />

          {/* Vertical Tail Fin with Sunset Livery */}
          <path d="M22 30 L22 40 L20.5 39 C20 37 21 32 22 30 Z" fill="url(#tailLivery)" />

          {/* Passenger Cabin Windows */}
          <circle cx="21" cy="13" r="0.6" fill="#0F6F63" opacity="0.6" />
          <circle cx="23" cy="13" r="0.6" fill="#0F6F63" opacity="0.6" />
          <circle cx="21" cy="15.5" r="0.6" fill="#0F6F63" opacity="0.6" />
          <circle cx="23" cy="15.5" r="0.6" fill="#0F6F63" opacity="0.6" />
          <circle cx="21" cy="18" r="0.6" fill="#0F6F63" opacity="0.6" />
          <circle cx="23" cy="18" r="0.6" fill="#0F6F63" opacity="0.6" />

          {/* Wingtip Navigation Lights: Port (Red) & Starboard (Green) */}
          <circle cx="2.5" cy="27.5" r="1.2" fill="#EF4444" className="nav-light light-port" />
          <circle cx="41.5" cy="27.5" r="1.2" fill="#10B981" className="nav-light light-starboard" />
          <circle cx="22" cy="42" r="0.8" fill="#FFFFFF" className="nav-light light-tail" />
        </svg>
      </div>

      <div className="flight-tooltip-content">
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
