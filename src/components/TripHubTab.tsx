import React from 'react';
import { SettingsSection } from './common/SettingsSection';
import { SettingsCell, type SquircleGlow } from './common/SettingsCell';

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
 * Calm Passport "Trip" hub (flag `enableCalmPassportUi`): everything that is not the daily
 * expense/balance loop lives here as one list, mirroring the tile grid in
 * flutter_app/lib/features/trip_details/presentation/trip_hub_screen.dart. People and Plans
 * (Notes) also keep working as plain tabs underneath -- this just gives them a second,
 * always-visible entry point once they drop off the bottom bar.
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
      <SettingsSection>
        {items.map((item, i) => (
          <SettingsCell
            key={item.id}
            icon={item.icon}
            title={item.title}
            subtitle={item.subtitle}
            onClick={item.onClick}
            hasDivider={i < items.length - 1}
          />
        ))}
      </SettingsSection>
    </div>
  );
}
