import { useState } from 'react';
import type { TravelStatusInfo } from '../utils/travelStatusService';
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

  useHistoryBack(isOpen, onClose);
  useEscapeKey(isOpen, onClose);

  if (!isOpen || !statusInfo) return null;

  const handleCopy = (text: string, label: string) => {
    triggerHaptic('light');
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const isFlight = statusInfo.type === 'flight';

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
        {isFlight && (
          <div
            style={{
              padding: '16px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.12), rgba(59, 130, 246, 0.12))',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              marginBottom: '16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {statusInfo.airlineName}
              </span>
              <button
                type="button"
                onClick={() => handleCopy(statusInfo.fullFlightCode, 'flight')}
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

            <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px', letterSpacing: '0.02em' }}>
              {statusInfo.fullFlightCode}
            </div>

            {(statusInfo.origin || statusInfo.destination) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                <span>{statusInfo.origin || 'Origin'}</span>
                <span>✈️ ➔</span>
                <span>{statusInfo.destination || 'Destination'}</span>
              </div>
            )}
          </div>
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
          </div>
        )}

        {/* 1-Tap Action Links */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
          {isFlight ? (
            <>
              <a
                href={statusInfo.googleStatusUrl}
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
                    <div>Live Gate & Terminal Status</div>
                    <div style={{ fontSize: '11px', opacity: 0.85, fontWeight: 400 }}>
                      Real-time departure, delay, and baggage carousel
                    </div>
                  </div>
                </div>
                <span>➔</span>
              </a>

              <a
                href={statusInfo.flightradar24Url}
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
                      Live airborne GPS radar map
                    </div>
                  </div>
                </div>
                <span>↗</span>
              </a>

              <a
                href={statusInfo.flightAwareUrl}
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
                    <div>FlightAware Route & History</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 400 }}>
                      Detailed flight plan and inbound aircraft info
                    </div>
                  </div>
                </div>
                <span>↗</span>
              </a>
            </>
          ) : (
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
          )}
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
