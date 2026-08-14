import { useState } from 'react';
import type { Trip, Member } from '../../types';
import type { FeatureFlagKey } from '../../types/admin';
import { FEATURE_FLAGS_META } from '../../utils/featureFlags';
import { useTripStore } from '../../store/tripStore';
import { IconCheck } from '../Icons';

interface Props {
  trips: Trip[];
  members: Record<string, Member>;
}

export function AdminFlagsPage({ trips, members }: Props) {
  const featureFlags = useTripStore((s) => s.featureFlags);
  const setFeatureFlag = useTripStore((s) => s.setFeatureFlag);
  const tripFlagOverrides = useTripStore((s) => s.tripFlagOverrides);
  const setTripFlagOverride = useTripStore((s) => s.setTripFlagOverride);
  const userFlagOverrides = useTripStore((s) => s.userFlagOverrides);
  const setUserFlagOverride = useTripStore((s) => s.setUserFlagOverride);
  const resetFeatureFlags = useTripStore((s) => s.resetFeatureFlags);

  const [selectedTripId, setSelectedTripId] = useState<string>('');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [saveToast, setSaveToast] = useState('');

  const showNotification = (msg: string) => {
    setSaveToast(msg);
    setTimeout(() => setSaveToast(''), 2500);
  };

  const flagEntries = Object.entries(FEATURE_FLAGS_META) as [FeatureFlagKey, typeof FEATURE_FLAGS_META[FeatureFlagKey]][];

  // Group members list for per-user override
  const allMembersList = Object.values(members).filter((m) => !m.archived);

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px 0' }}>
            🚩 Feature Flags &amp; Governance Switchboard
          </h2>
          <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', margin: 0 }}>
            Configure global feature rollouts, toggle 2-tier geotagging, or assign per-trip and per-member overrides.
          </p>
        </div>

        <button
          type="button"
          className="secondary-btn"
          style={{ fontSize: '12px', padding: '6px 12px' }}
          onClick={() => {
            resetFeatureFlags();
            showNotification('Reset all feature flags to defaults.');
          }}
        >
          Reset to Factory Defaults
        </button>
      </div>

      {saveToast && (
        <div
          style={{
            padding: '10px 14px',
            borderRadius: '10px',
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            color: '#10B981',
            fontSize: '13px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <IconCheck size={16} /> {saveToast}
        </div>
      )}

      {/* Global Flags Grid */}
      <div>
        <h3 style={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' }}>
          Global Switches (Applies to all normal users by default)
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '12px' }}>
          {flagEntries.map(([key, meta]) => {
            const isEnabled = featureFlags[key] ?? meta.defaultEnabledForUsers;

            return (
              <div
                key={key}
                className="glass-card"
                style={{
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '12px',
                  border: isEnabled ? '1.5px solid rgba(31, 110, 104, 0.3)' : '1px solid var(--border-color)',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{meta.label}</span>
                    <span
                      style={{
                        fontSize: '10.5px',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '10px',
                        background: isEnabled ? 'rgba(16, 185, 129, 0.15)' : 'rgba(100, 116, 139, 0.15)',
                        color: isEnabled ? '#10B981' : 'var(--text-muted)',
                      }}
                    >
                      {isEnabled ? 'ENABLED' : 'DISABLED'}
                    </span>
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.45', margin: 0 }}>
                    {meta.description}
                  </p>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid var(--border-color-subtle, rgba(0,0,0,0.05))' }}>
                  <code style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{key}</code>
                  <label className="toggle-switch" style={{ cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={isEnabled}
                      onChange={(e) => {
                        setFeatureFlag(key, e.target.checked);
                        showNotification(`${meta.label} set to ${e.target.checked ? 'Enabled' : 'Disabled'}`);
                      }}
                    />
                    <span className="toggle-slider" />
                  </label>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Per-Trip & Per-User Specific Overrides */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
        {/* Per Trip Override Card */}
        <div className="glass-card" style={{ padding: '18px' }}>
          <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
            🎯 Per-Trip Flag Overrides
          </h4>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
            Enforce custom feature behavior for a specific trip regardless of global settings.
          </p>

          <select
            className="input-field select-field"
            style={{ width: '100%', marginBottom: '14px' }}
            value={selectedTripId}
            onChange={(e) => setSelectedTripId(e.target.value)}
          >
            <option value="">Select a trip to configure...</option>
            {trips.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.baseCurrency})
              </option>
            ))}
          </select>

          {selectedTripId ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {flagEntries.map(([key, meta]) => {
                const tripOverride = tripFlagOverrides[selectedTripId]?.[key];
                return (
                  <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12.5px' }}>
                    <span>{meta.label}</span>
                    <select
                      className="input-field select-field"
                      style={{ width: '110px', padding: '4px 8px', fontSize: '11.5px' }}
                      value={tripOverride === undefined ? 'default' : tripOverride ? 'true' : 'false'}
                      onChange={(e) => {
                        const val = e.target.value === 'default' ? null : e.target.value === 'true';
                        setTripFlagOverride(selectedTripId, key, val);
                        showNotification(`Trip override updated for ${meta.label}`);
                      }}
                    >
                      <option value="default">Default</option>
                      <option value="true">Force ON</option>
                      <option value="false">Force OFF</option>
                    </select>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
              Select a trip above to manage its specific flags.
            </div>
          )}
        </div>

        {/* Per Member Override Card */}
        <div className="glass-card" style={{ padding: '18px' }}>
          <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
            👤 Per-Member Flag Overrides
          </h4>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
            Assign beta feature flags or restriction policies to individual travelers.
          </p>

          <select
            className="input-field select-field"
            style={{ width: '100%', marginBottom: '14px' }}
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
          >
            <option value="">Select a member to configure...</option>
            {allMembersList.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} {m.linkedUserId ? '(Claimed)' : ''}
              </option>
            ))}
          </select>

          {selectedUserId ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {flagEntries.map(([key, meta]) => {
                const userOverride = userFlagOverrides[selectedUserId]?.[key];
                return (
                  <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12.5px' }}>
                    <span>{meta.label}</span>
                    <select
                      className="input-field select-field"
                      style={{ width: '110px', padding: '4px 8px', fontSize: '11.5px' }}
                      value={userOverride === undefined ? 'default' : userOverride ? 'true' : 'false'}
                      onChange={(e) => {
                        const val = e.target.value === 'default' ? null : e.target.value === 'true';
                        setUserFlagOverride(selectedUserId, key, val);
                        showNotification(`Member override updated for ${meta.label}`);
                      }}
                    >
                      <option value="default">Default</option>
                      <option value="true">Force ON</option>
                      <option value="false">Force OFF</option>
                    </select>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
              Select a member above to configure individual privileges.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
