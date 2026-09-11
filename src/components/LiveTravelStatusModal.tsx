import { useState, useMemo, useEffect } from 'react';
import {
  type TravelStatusInfo,
  buildFlightUrls,
  parseFlightCode,
} from '../utils/travelStatusService';
import { useHistoryBack } from '../utils/useHistoryBack';
import { useEscapeKey } from '../utils/useEscapeKey';
import { triggerHaptic } from '../utils/haptics';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  statusInfo: TravelStatusInfo | null;
}

export function LiveTravelStatusModal({ isOpen, onClose, statusInfo }: Props) {
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [flightInput, setFlightInput] = useState('');
  const [isEditingFlight, setIsEditingFlight] = useState(false);

  // Sync state when modal opens or statusInfo changes
  useEffect(() => {
    if (statusInfo?.type === 'flight') {
      setFlightInput(`${statusInfo.carrierCode}-${statusInfo.flightNumber}`);
      setIsEditingFlight(false);
    }
  }, [statusInfo]);

  useHistoryBack(isOpen, onClose);
  useEscapeKey(isOpen, onClose);

  // Recomputed flight info if user edits flight code inline
  const activeFlight = useMemo(() => {
    if (!statusInfo || statusInfo.type !== 'flight') return null;
    const parsed = parseFlightCode(flightInput, statusInfo.airlineName);
    if (parsed) {
      const urls = buildFlightUrls(
        parsed.carrierCode,
        parsed.flightNumber,
        statusInfo.departureTime
      );
      return {
        ...statusInfo,
        carrierCode: parsed.carrierCode,
        flightNumber: parsed.flightNumber,
        airlineName: parsed.airlineName || statusInfo.airlineName,
        ...urls,
      };
    }
    return statusInfo;
  }, [statusInfo, flightInput]);

  if (!isOpen || !statusInfo) return null;

  const handleCopy = (text: string, label: string) => {
    triggerHaptic('light');
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const isFlight = statusInfo.type === 'flight';
  const displayFlight = isFlight ? (activeFlight || statusInfo) : null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '460px',
          width: '92%',
          padding: '24px',
          borderRadius: 'var(--border-radius-lg, 20px)',
          background: 'var(--card-bg, var(--bg-surface))',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '24px' }}>{isFlight ? '✈️' : '🚆'}</span>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>
                {isFlight ? 'Live Flight Status' : 'Live Train & PNR Tracker'}
              </h3>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>
                {isFlight ? 'Gate, terminal, radar & delay tracking' : 'Real-time PNR confirmation & running status'}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="secondary-btn"
            style={{ padding: '6px 10px', fontSize: '13px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Flight Card Hero */}
        {isFlight && displayFlight && (
          <>
            <div
              style={{
                padding: '16px',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.12), rgba(59, 130, 246, 0.12))',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                marginBottom: '12px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {displayFlight.airlineName}
                  </span>
                  {displayFlight.icaoCode && (
                    <span style={{ fontSize: '10.5px', padding: '1px 6px', borderRadius: '4px', background: 'rgba(59, 130, 246, 0.15)', color: '#2563eb', fontWeight: 600, fontFamily: 'monospace' }}>
                      ICAO: {displayFlight.icaoCode}{displayFlight.flightNumber}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setIsEditingFlight((prev) => !prev)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      fontSize: '11px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '2px',
                    }}
                    title="Edit flight code"
                  >
                    <span>{isEditingFlight ? '✓ Done' : '✏️ Edit'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCopy(displayFlight.fullFlightCode, 'flight')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      fontSize: '11px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <span>{copiedText === 'flight' ? '✓ Copied' : '📋 Copy Code'}</span>
                  </button>
                </div>
              </div>

              {isEditingFlight ? (
                <div style={{ marginBottom: '10px' }}>
                  <input
                    type="text"
                    className="input-field"
                    value={flightInput}
                    onChange={(e) => setFlightInput(e.target.value)}
                    placeholder="e.g. 6E-537 or AI 101"
                    style={{
                      fontFamily: 'var(--font-family-mono, monospace)',
                      fontWeight: 700,
                      fontSize: '18px',
                      padding: '6px 10px',
                      width: '100%',
                      borderRadius: '8px',
                    }}
                    autoFocus
                  />
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Carrier & flight number (e.g. 6E-537, AI-101, QP-1302)
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px', letterSpacing: '0.02em' }}>
                  {displayFlight.fullFlightCode}
                </div>
              )}

              {(displayFlight.origin || displayFlight.destination) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  <span>{displayFlight.origin || 'Origin'}</span>
                  <span>✈️ ➔</span>
                  <span>{displayFlight.destination || 'Destination'}</span>
                </div>
              )}

              {(displayFlight.formattedFlightDate || displayFlight.departureTime) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-secondary)', marginTop: '6px' }}>
                  <span>📅</span>
                  <span style={{ fontWeight: 600 }}>
                    {displayFlight.formattedFlightDate || displayFlight.departureTime}
                  </span>
                  {displayFlight.flightTime && (
                    <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                      · ⏰ {displayFlight.flightTime}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Explanatory Tracker Note */}
            <div
              style={{
                padding: '8px 12px',
                borderRadius: '10px',
                background: 'rgba(59, 130, 246, 0.08)',
                border: '1px solid rgba(59, 130, 246, 0.18)',
                fontSize: '11px',
                color: 'var(--text-secondary)',
                lineHeight: 1.4,
                marginBottom: '14px',
              }}
            >
              💡 <strong>Tracker Tip:</strong> Google & FlightAware track gate schedules, delays, and routes at all times. Flightradar24 displays active live GPS radar while the aircraft is currently airborne.
            </div>
          </>
        )}

        {/* Train Card Hero */}
        {!isFlight && (
          <div
            style={{
              padding: '16px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, rgba(6, 95, 70, 0.12), rgba(16, 185, 129, 0.12))',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              marginBottom: '16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {statusInfo.trainName || 'Indian Railways'}
              </span>
              {statusInfo.pnr && (
                <button
                  type="button"
                  onClick={() => handleCopy(statusInfo.pnr || '', 'pnr')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    fontSize: '11px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <span>{copiedText === 'pnr' ? '✓ Copied PNR' : '📋 Copy PNR'}</span>
                </button>
              )}
            </div>

            {statusInfo.pnr && (
              <div style={{ marginBottom: '8px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  10-Digit PNR
                </div>
                <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '0.05em', fontFamily: 'var(--font-family-mono, monospace)' }}>
                  {statusInfo.pnr}
                </div>
              </div>
            )}

            {statusInfo.trainNumber && (
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                Train No: {statusInfo.trainNumber}
              </div>
            )}

            {(statusInfo.origin || statusInfo.destination) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)', marginTop: '6px' }}>
                <span>{statusInfo.origin || 'Origin'}</span>
                <span>🚆 ➔</span>
                <span>{statusInfo.destination || 'Destination'}</span>
              </div>
            )}

            {statusInfo.departureTime && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-secondary)', marginTop: '6px' }}>
                <span>📅</span>
                <span style={{ fontWeight: 600 }}>{statusInfo.departureTime}</span>
              </div>
            )}
          </div>
        )}

        {/* 1-Tap Action Links */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
          {statusInfo.type === 'flight' && displayFlight ? (
            <>
              <a
                href={displayFlight.googleStatusUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => triggerHaptic('medium')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  background: 'var(--primary-accent)',
                  color: '#fff',
                  textDecoration: 'none',
                  fontWeight: 600,
                  fontSize: '14px',
                  boxShadow: '0 4px 12px rgba(15, 169, 143, 0.25)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '18px' }}>🛫</span>
                  <div>
                    <div>Google Live Gate & Flight Status</div>
                    <div style={{ fontSize: '11px', opacity: 0.85, fontWeight: 400 }}>
                      {displayFlight.formattedFlightDate
                        ? `Direct flight schedule & gate card for ${displayFlight.formattedFlightDate}`
                        : 'Real-time departure, delay, terminal, gate & carousel'}
                    </div>
                  </div>
                </div>
                <span>➔</span>
              </a>

              <a
                href={displayFlight.flightAwareUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => triggerHaptic('light')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  background: 'var(--bg-card-subtle, rgba(255, 255, 255, 0.05))',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  textDecoration: 'none',
                  fontWeight: 600,
                  fontSize: '14px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '18px' }}>🗺️</span>
                  <div>
                    <div>FlightAware Live Flight Tracker</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 400 }}>
                      Direct tracking via official airline callsign {displayFlight.icaoCode ? `(${displayFlight.icaoCode})` : ''}
                    </div>
                  </div>
                </div>
                <span>↗</span>
              </a>

              <a
                href={displayFlight.flightradar24Url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => triggerHaptic('light')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  background: 'var(--bg-card-subtle, rgba(255, 255, 255, 0.05))',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  textDecoration: 'none',
                  fontWeight: 600,
                  fontSize: '14px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '18px' }}>📡</span>
                  <div>
                    <div>Flightradar24 Live Radar Track</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 400 }}>
                      Live GPS airborne radar map (active during flight)
                    </div>
                  </div>
                </div>
                <span>↗</span>
              </a>

              {displayFlight.flightStatsUrl && (
                <a
                  href={displayFlight.flightStatsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => triggerHaptic('light')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    background: 'var(--bg-card-subtle, rgba(255, 255, 255, 0.05))',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    textDecoration: 'none',
                    fontWeight: 600,
                    fontSize: '14px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '18px' }}>⏱️</span>
                    <div>
                      <div>FlightStats Global Status</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 400 }}>
                        {displayFlight.formattedFlightDate
                          ? `Cirium schedule & timetable for ${displayFlight.formattedFlightDate}`
                          : 'Cirium airport departures, delay index & timetable'}
                      </div>
                    </div>
                  </div>
                  <span>↗</span>
                </a>
              )}
            </>
          ) : statusInfo.type === 'train' ? (
            <>
              {statusInfo.confirmTktUrl && (
                <a
                  href={statusInfo.confirmTktUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => triggerHaptic('medium')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    background: '#10b981',
                    color: '#fff',
                    textDecoration: 'none',
                    fontWeight: 600,
                    fontSize: '14px',
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '18px' }}>🎫</span>
                    <div>
                      <div>Check Live PNR Berth Status</div>
                      <div style={{ fontSize: '11px', opacity: 0.85, fontWeight: 400 }}>
                        Coach, berth number & chart preparation status
                      </div>
                    </div>
                  </div>
                  <span>➔</span>
                </a>
              )}

              {statusInfo.googleLiveTrainUrl && (
                <a
                  href={statusInfo.googleLiveTrainUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => triggerHaptic('light')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    background: 'var(--bg-card-subtle, rgba(255, 255, 255, 0.05))',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    textDecoration: 'none',
                    fontWeight: 600,
                    fontSize: '14px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '18px' }}>📍</span>
                    <div>
                      <div>Live Train Running Status (NTES)</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 400 }}>
                        Current station, platform & delay in minutes
                      </div>
                    </div>
                  </div>
                  <span>↗</span>
                </a>
              )}

              {statusInfo.railYatriUrl && (
                <a
                  href={statusInfo.railYatriUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => triggerHaptic('light')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    background: 'var(--bg-card-subtle, rgba(255, 255, 255, 0.05))',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    textDecoration: 'none',
                    fontWeight: 600,
                    fontSize: '14px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '18px' }}>🚆</span>
                    <div>
                      <div>RailYatri PNR Confirmation Check</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 400 }}>
                        Alternative official PNR inquiry
                      </div>
                    </div>
                  </div>
                  <span>↗</span>
                </a>
              )}
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="secondary-btn"
            style={{ padding: '8px 16px', fontSize: '13px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
