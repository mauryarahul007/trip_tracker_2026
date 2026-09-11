import React, { useState, useMemo } from 'react';
import type { Trip, TravelPass } from '../types';
import { getTravelStatusInfo, type TravelStatusInfo } from '../utils/travelStatusService';
import { parseFlightDate } from '../utils/travelStatusService';
import { LiveTravelStatusModal } from './LiveTravelStatusModal';
import { PassScannerModal } from './PassScannerModal';
import { triggerHaptic } from '../utils/haptics';

interface Props {
  trip: Trip;
  passes?: TravelPass[];
  onOpenWallet?: () => void;
}

interface ImminentPassTarget {
  pass: TravelPass;
  type: 'flight' | 'train' | 'stay' | 'other';
  status: 'boarding-soon' | 'upcoming' | 'en-route' | 'today';
  countdownText: string;
  badgeColor: string;
  diffHours: number;
}

export const NextUpTravelCapsule: React.FC<Props> = ({ trip, passes, onOpenWallet }) => {
  const [selectedScannerPass, setSelectedScannerPass] = useState<TravelPass | null>(null);
  const [statusModalInfo, setStatusModalInfo] = useState<TravelStatusInfo | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);

  // Combine trip.passes with prop passes
  const allPasses = useMemo(() => {
    return passes || trip.passes || [];
  }, [passes, trip.passes]);

  // Evaluate the most relevant "Next Up" travel pass
  const imminentTarget = useMemo<ImminentPassTarget | null>(() => {
    if (!allPasses || allPasses.length === 0) return null;

    const now = Date.now();
    const candidates: ImminentPassTarget[] = [];

    for (const pass of allPasses) {
      if (!pass.startDateTime) continue;

      // Parse timestamp
      const parsedDate = parseFlightDate(pass.startDateTime);
      let eventTime: number | null = null;

      if (parsedDate?.year && parsedDate?.month && parsedDate?.day) {
        // Construct approximate or exact date
        const timePart = parsedDate.timeString || '00:00';
        const match = timePart.match(/(\d{1,2}):(\d{2})(?:\s*([AaPp][Mm]))?/);
        let h = 0;
        let m = 0;
        if (match) {
          h = parseInt(match[1], 10);
          m = parseInt(match[2], 10);
          if (match[3]?.toUpperCase() === 'PM' && h < 12) h += 12;
          if (match[3]?.toUpperCase() === 'AM' && h === 12) h = 0;
        }
        eventTime = new Date(parsedDate.year, parsedDate.month - 1, parsedDate.day, h, m).getTime();
      } else {
        const ts = Date.parse(pass.startDateTime);
        if (!isNaN(ts)) eventTime = ts;
      }

      if (!eventTime) continue;

      const diffMs = eventTime - now;
      const diffHours = diffMs / (1000 * 60 * 60);

      // Only include passes occurring within 36 hours (or departed < 3 hours ago)
      if (diffHours >= -3 && diffHours <= 36) {
        let status: ImminentPassTarget['status'] = 'upcoming';
        let countdownText = '';
        let badgeColor = '#3b82f6';

        if (diffHours < 0) {
          status = 'en-route';
          countdownText = 'En Route / Airborne';
          badgeColor = '#10b981';
        } else if (diffHours <= 1.5) {
          status = 'boarding-soon';
          const mins = Math.max(1, Math.round(diffMs / (1000 * 60)));
          countdownText = `Boarding in ${mins}m`;
          badgeColor = '#ef4444';
        } else if (diffHours <= 24) {
          status = 'upcoming';
          const h = Math.floor(diffHours);
          const m = Math.round((diffHours - h) * 60);
          countdownText = m > 0 ? `Departs in ${h}h ${m}m` : `Departs in ${h}h`;
          badgeColor = '#2563eb';
        } else {
          status = 'today';
          countdownText = `Tomorrow · ${parsedDate?.formattedDateString || pass.startDateTime}`;
          badgeColor = '#6366f1';
        }

        candidates.push({
          pass,
          type: pass.type as any,
          status,
          countdownText,
          badgeColor,
          diffHours,
        });
      }
    }

    if (candidates.length === 0) return null;

    // Pick the most imminent event (lowest positive diffHours or active en-route)
    candidates.sort((a, b) => {
      // Prioritize active boarding or en-route
      if (a.diffHours >= -1 && b.diffHours < -1) return -1;
      if (b.diffHours >= -1 && a.diffHours < -1) return 1;
      return Math.abs(a.diffHours) - Math.abs(b.diffHours);
    });

    return candidates[0];
  }, [allPasses]);

  if (!imminentTarget) return null;

  const { pass, countdownText, badgeColor, type } = imminentTarget;
  const isFlight = type === 'flight';
  const isTrain = type === 'train';
  const statusInfo = getTravelStatusInfo(pass);

  return (
    <>
      <div
        className="next-up-capsule-card fade-in"
        style={{
          marginBottom: '16px',
          borderRadius: '16px',
          background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.12), rgba(15, 23, 42, 0.08))',
          border: '1.5px solid rgba(59, 130, 246, 0.28)',
          boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.15)',
          overflow: 'hidden',
          transition: 'all 0.2s ease',
        }}
      >
        {/* Top Capsule Banner */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 14px',
            background: 'rgba(59, 130, 246, 0.08)',
            borderBottom: isMinimized ? 'none' : '1px solid rgba(59, 130, 246, 0.15)',
            cursor: 'pointer',
          }}
          onClick={() => {
            triggerHaptic('light');
            setIsMinimized((prev) => !prev);
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '15px' }}>{isFlight ? '✈️' : isTrain ? '🚆' : '🏨'}</span>
            <span
              style={{
                fontSize: '10.5px',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: 'var(--text-muted)',
              }}
            >
              Next Up
            </span>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '9999px',
                background: badgeColor,
                color: '#fff',
                boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
              }}
            >
              {countdownText}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              {isMinimized ? 'Expand ▾' : 'Collapse ▴'}
            </span>
          </div>
        </div>

        {/* Expanded Travel Details Body */}
        {!isMinimized && (
          <div style={{ padding: '12px 14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', marginBottom: '8px' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {pass.title}
                </h4>
                {(pass.origin || pass.destination) && (
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>{pass.origin || 'Origin'}</span>
                    <span style={{ color: 'var(--text-muted)' }}>➔</span>
                    <span>{pass.destination || 'Destination'}</span>
                  </div>
                )}
              </div>

              {pass.seatOrRoom && (
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>
                    {isFlight ? 'Seat' : isTrain ? 'Berth' : 'Room'}
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: 900, color: 'var(--primary-accent)', fontFamily: 'monospace' }}>
                    {pass.seatOrRoom}
                  </div>
                </div>
              )}
            </div>

            {/* Quick Action Button Strip */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="primary-btn"
                onClick={() => {
                  triggerHaptic('light');
                  setSelectedScannerPass(pass);
                }}
                style={{
                  padding: '6px 12px',
                  fontSize: '12px',
                  borderRadius: '10px',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  background: '#0F172A',
                  color: '#FFFFFF',
                }}
              >
                <span>📲</span>
                <span>Show Pass</span>
              </button>

              {statusInfo && (
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => {
                    triggerHaptic('light');
                    setStatusModalInfo(statusInfo);
                  }}
                  style={{
                    padding: '6px 12px',
                    fontSize: '12px',
                    borderRadius: '10px',
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    color: isFlight ? '#2563eb' : '#059669',
                    borderColor: isFlight ? 'rgba(37, 99, 235, 0.3)' : 'rgba(5, 150, 105, 0.3)',
                    background: isFlight ? 'rgba(37, 99, 235, 0.08)' : 'rgba(5, 150, 105, 0.08)',
                  }}
                >
                  <span>{isFlight ? '🛫 Live Status' : '🚆 PNR Status'}</span>
                </button>
              )}

              {onOpenWallet && (
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => {
                    triggerHaptic('light');
                    onOpenWallet();
                  }}
                  style={{
                    padding: '6px 10px',
                    fontSize: '12px',
                    borderRadius: '10px',
                    marginLeft: 'auto',
                  }}
                  title="Open Travel Pass Wallet"
                >
                  <span>Wallet ➔</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* High-Contrast Fullscreen Scanner Modal */}
      <PassScannerModal
        isOpen={Boolean(selectedScannerPass)}
        onClose={() => setSelectedScannerPass(null)}
        pass={selectedScannerPass}
      />

      {/* Live Flight & Train Status Modal */}
      <LiveTravelStatusModal
        isOpen={Boolean(statusModalInfo)}
        onClose={() => setStatusModalInfo(null)}
        statusInfo={statusModalInfo}
      />
    </>
  );
};
