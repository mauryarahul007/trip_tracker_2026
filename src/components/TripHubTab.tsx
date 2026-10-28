import React from 'react';
import { triggerHaptic } from '../utils/haptics';
import type { SquircleGlow } from './common/SettingsCell';
import { useTripPhoto, COVER_WIDTH } from './TripStack';

export interface TripHubItem {
  id: string;
  icon: React.ReactNode;
  iconGlow?: SquircleGlow;
  title: string;
  subtitle?: string;
  onClick: () => void;
}

type Props = {
  tripName?: string;
  tripDestination?: string;
  coverImageUrl?: string;
  stops?: string[];
  items: TripHubItem[];
};

/**
 * Calm Passport "Trip" hub (flag `enableCalmPassportUi`): a tile grid for everything that is not
 * the daily expense/balance loop, with an ambient destination-based blurred background photo.
 */
export function TripHubTab({ tripName, tripDestination, coverImageUrl, stops, items }: Props) {
  const photoUrl = useTripPhoto(tripDestination, coverImageUrl, tripName, COVER_WIDTH, stops);

  return (
    <div className="trip-hub-container fade-in" style={{ position: 'relative', overflow: 'hidden', minHeight: '100%', padding: '16px 16px 120px' }}>
      {/* Blurred destination background */}
      {photoUrl && (
        <div
          className="trip-hub-ambient-backdrop"
          style={{
            position: 'absolute',
            top: -24,
            left: -24,
            right: -24,
            height: '420px',
            backgroundImage: `url("${photoUrl}")`,
            backgroundSize: 'cover',
            backgroundPosition: 'center 20%',
            filter: 'blur(34px) saturate(145%) brightness(0.92)',
            opacity: 0.38,
            transform: 'scale(1.15)',
            pointerEvents: 'none',
            maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.6) 55%, rgba(0,0,0,0) 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.6) 55%, rgba(0,0,0,0) 100%)',
            zIndex: 0,
          }}
          aria-hidden="true"
        />
      )}

      <div style={{ position: 'relative', zIndex: 1 }}>
        {(tripName || tripDestination) && (
          <div style={{ marginBottom: '16px' }}>
            {tripName && (
              <h2 style={{ margin: 0, fontSize: 'clamp(1.1rem, 3vw, 1.4rem)', fontWeight: 700, letterSpacing: '-0.01em', color: 'var(--text-primary)' }}>
                {tripName}
              </h2>
            )}
            {tripDestination && (
              <p style={{ margin: '3px 0 0', fontSize: '13px', fontWeight: 500, color: 'var(--text-muted)' }}>{tripDestination}</p>
            )}
          </div>
        )}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
            gap: '10px',
          }}
        >
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              className="glass-card hub-tile-btn"
              onClick={() => {
                triggerHaptic('light');
                item.onClick();
              }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                textAlign: 'left',
                minHeight: '104px',
                padding: '14px',
                border: '1px solid var(--border-color)',
                borderRadius: '16px',
                background: 'color-mix(in srgb, var(--bg-surface) 86%, transparent)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                boxShadow: '0 2px 8px -2px rgba(0, 0, 0, 0.06)',
                cursor: 'pointer',
                transition: 'transform 0.15s ease, background-color 0.15s ease',
              }}
            >
              <div className={`settings-squircle squircle-${item.iconGlow ?? 'teal'}-glow`} aria-hidden="true">
                {item.icon}
              </div>
              <span style={{ marginTop: '10px', fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {item.title}
              </span>
              {item.subtitle && (
                <span
                  style={{
                    marginTop: '2px',
                    fontSize: '12px',
                    color: 'var(--text-muted)',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {item.subtitle}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
