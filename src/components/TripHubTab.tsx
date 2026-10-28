import React from 'react';
import { triggerHaptic } from '../utils/haptics';
import type { SquircleGlow } from './common/SettingsCell';

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
  items: TripHubItem[];
};

/**
 * Calm Passport "Trip" hub (flag `enableCalmPassportUi`): a tile grid for everything that is not
 * the daily expense/balance loop, mirroring the Wrap of icon tiles in
 * flutter_app/lib/features/trip_details/presentation/trip_hub_screen.dart (cols = 2 under 560px,
 * 3 above it). People and Plans also keep working as plain tabs underneath -- this just gives
 * them a second, always-visible entry point once they drop off the bottom bar.
 */
export function TripHubTab({ tripName, tripDestination, items }: Props) {
  return (
    <div className="fade-in" style={{ padding: '16px 16px 120px' }}>
      {(tripName || tripDestination) && (
        <div style={{ marginBottom: '16px' }}>
          {tripName && (
            <h2 style={{ margin: 0, fontSize: 'clamp(1.1rem, 3vw, 1.4rem)', fontWeight: 600, letterSpacing: '-0.01em' }}>
              {tripName}
            </h2>
          )}
          {tripDestination && (
            <p style={{ margin: '2px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>{tripDestination}</p>
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
            className="glass-card"
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
              borderRadius: 'var(--border-radius-md)',
              background: 'var(--bg-surface)',
              cursor: 'pointer',
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
  );
}
