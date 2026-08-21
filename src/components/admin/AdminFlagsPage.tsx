import { useEffect, useState } from 'react';
import type { Trip, Member } from '../../types';
import type { AppConfigKey, FeatureFlagKey } from '../../types/admin';
import { FEATURE_FLAGS_META } from '../../utils/featureFlags';
import { useTripStore } from '../../store/tripStore';
import { fetchAppConfig, setAppConfigValue } from '../../services/tripApi';
import { IconCheck, IconAlertCircle } from '../Icons';

interface Props {
  trips: Trip[];
  members: Record<string, Member>;
}

function OverridePanel({
  title,
  subtitle,
  emptyLabel,
  selectedId,
  onSelect,
  options,
  overrides,
  onSetOverride,
  flagEntries,
}: {
  title: string;
  subtitle: string;
  emptyLabel: string;
  selectedId: string;
  onSelect: (id: string) => void;
  options: { value: string; label: string }[];
  overrides: Record<string, boolean> | undefined;
  onSetOverride: (key: FeatureFlagKey, value: boolean | null) => void;
  flagEntries: [FeatureFlagKey, typeof FEATURE_FLAGS_META[FeatureFlagKey]][];
}) {
  const activeCount = overrides ? Object.keys(overrides).length : 0;

  return (
    <div className="ops-card">
      <div className="ops-ov-head">
        <span className="ops-ov-title">{title}</span>
        <span className="ops-ov-count">{activeCount} active</span>
      </div>
      <p className="ops-ov-sub">{subtitle}</p>
      <select className="ops-select" value={selectedId} onChange={(e) => onSelect(e.target.value)}>
        <option value="">Select&hellip;</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      {selectedId ? (
        <div style={{ marginTop: '10px' }}>
          {flagEntries.map(([key, meta]) => {
            const state = overrides?.[key];
            const stateStr = state === undefined ? 'neutral' : state ? 'on' : 'off';
            return (
              <div key={key} className="ops-ov-row">
                <span className="ops-ov-flag-name">{meta.label}</span>
                <div className="ops-tristate" role="group" aria-label={`${meta.label} override`}>
                  <button
                    type="button"
                    className="off"
                    data-active={stateStr === 'off'}
                    onClick={() => onSetOverride(key, false)}
                  >
                    Force Off
                  </button>
                  <button
                    type="button"
                    className="neutral"
                    data-active={stateStr === 'neutral'}
                    onClick={() => onSetOverride(key, null)}
                  >
                    Default
                  </button>
                  <button
                    type="button"
                    className="on"
                    data-active={stateStr === 'on'}
                    onClick={() => onSetOverride(key, true)}
                  >
                    Force On
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="ops-ov-empty">{emptyLabel}</div>
      )}
    </div>
  );
}

export function AdminFlagsPage({ trips, members }: Props) {
  const featureFlags = useTripStore((s) => s.featureFlags);
  const setFeatureFlag = useTripStore((s) => s.setFeatureFlag);
  const tripFlagOverrides = useTripStore((s) => s.tripFlagOverrides);
  const setTripFlagOverride = useTripStore((s) => s.setTripFlagOverride);
  const userFlagOverrides = useTripStore((s) => s.userFlagOverrides);
  const setUserFlagOverride = useTripStore((s) => s.setUserFlagOverride);
  const resetFeatureFlags = useTripStore((s) => s.resetFeatureFlags);

  const [selectedTripId, setSelectedTripId] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [toastMsg, setToastMsg] = useState('');

  const [config, setConfig] = useState<Partial<Record<AppConfigKey, unknown>>>({});
  const [savingKey, setSavingKey] = useState<AppConfigKey | null>(null);
  const [joinMaxAttemptsInput, setJoinMaxAttemptsInput] = useState('5');
  const [joinLockoutMinutesInput, setJoinLockoutMinutesInput] = useState('15');
  const [recycleBinHoursInput, setRecycleBinHoursInput] = useState('24');

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 2500);
  };

  useEffect(() => {
    fetchAppConfig()
      .then((c) => {
        setConfig(c);
        if (typeof c.join_max_attempts === 'number') setJoinMaxAttemptsInput(String(c.join_max_attempts));
        if (typeof c.join_lockout_minutes === 'number') setJoinLockoutMinutesInput(String(c.join_lockout_minutes));
        if (typeof c.recycle_bin_retention_hours === 'number') setRecycleBinHoursInput(String(c.recycle_bin_retention_hours));
      })
      .catch(() => {});
  }, []);

  const saveConfig = async (key: AppConfigKey, value: unknown, label: string) => {
    setSavingKey(key);
    try {
      await setAppConfigValue(key, value);
      setConfig((c) => ({ ...c, [key]: value }));
      showToast(`${label} updated.`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save setting.');
    } finally {
      setSavingKey(null);
    }
  };

  const flagEntries = Object.entries(FEATURE_FLAGS_META) as [FeatureFlagKey, typeof FEATURE_FLAGS_META[FeatureFlagKey]][];
  const allMembersList = Object.values(members).filter((m) => !m.archived);

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      <div className="ops-page-head">
        <div>
          <h2>Feature Flags</h2>
          <p>Live switchboard for every traveler-facing feature. Superadmin always bypasses &mdash; these govern normal users only.</p>
        </div>
        <button
          type="button"
          className="ops-btn"
          onClick={() => {
            resetFeatureFlags();
            showToast('Reset all feature flags to defaults.');
          }}
        >
          Reset to Defaults
        </button>
      </div>

      {toastMsg && (
        <div className="ops-toast">
          <IconCheck size={14} /> {toastMsg}
        </div>
      )}

      <div className="ops-card">
        <h3 className="ops-section-title">Fleet Controls</h3>
        <p className="ops-section-sub">Server-enforced, not device-local — these apply instantly for every user.</p>

        <div className="ops-flag-card" style={{ marginTop: '10px' }}>
          <div className="ops-flag-top">
            <div>
              <div className="ops-flag-name">Maintenance Mode</div>
              <div className="ops-flag-key">maintenance_mode</div>
            </div>
            <button
              type="button"
              className="ops-relay"
              data-on={config.maintenance_mode === true}
              aria-label="Toggle maintenance mode"
              disabled={savingKey === 'maintenance_mode'}
              onClick={() => saveConfig('maintenance_mode', !(config.maintenance_mode === true), 'Maintenance mode')}
            >
              <span className="ops-puck" />
            </button>
          </div>
          <div className="ops-flag-desc">Blocks non-superadmin users behind a maintenance screen. Use before a risky migration.</div>
        </div>

        <div className="ops-flag-card" style={{ marginTop: '10px' }}>
          <div className="ops-flag-top">
            <div>
              <div className="ops-flag-name">Sign-Ins Paused</div>
              <div className="ops-flag-key">signup_gate</div>
            </div>
            <button
              type="button"
              className="ops-relay"
              data-on={config.signup_gate === true}
              aria-label="Toggle sign-ins paused"
              disabled={savingKey === 'signup_gate'}
              onClick={() => saveConfig('signup_gate', !(config.signup_gate === true), 'Sign-ins paused')}
            >
              <span className="ops-puck" />
            </button>
          </div>
          <div className="ops-flag-desc">Disables the Google Sign-In and Guest buttons on the login screen. Superadmin login is unaffected.</div>
        </div>

        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', marginTop: '16px' }}>
          <div className="ops-form-group">
            <label className="ops-form-label">Join-Code Max Attempts</label>
            <div style={{ display: 'flex', gap: '6px' }}>
              <input
                type="number"
                min={1}
                className="ops-input"
                style={{ width: '90px' }}
                value={joinMaxAttemptsInput}
                onChange={(e) => setJoinMaxAttemptsInput(e.target.value)}
              />
              <button
                type="button"
                className="ops-btn"
                disabled={savingKey === 'join_max_attempts'}
                onClick={() => saveConfig('join_max_attempts', Number(joinMaxAttemptsInput) || 5, 'Join max attempts')}
              >
                Save
              </button>
            </div>
          </div>
          <div className="ops-form-group">
            <label className="ops-form-label">Join Lockout (minutes)</label>
            <div style={{ display: 'flex', gap: '6px' }}>
              <input
                type="number"
                min={1}
                className="ops-input"
                style={{ width: '90px' }}
                value={joinLockoutMinutesInput}
                onChange={(e) => setJoinLockoutMinutesInput(e.target.value)}
              />
              <button
                type="button"
                className="ops-btn"
                disabled={savingKey === 'join_lockout_minutes'}
                onClick={() => saveConfig('join_lockout_minutes', Number(joinLockoutMinutesInput) || 15, 'Join lockout minutes')}
              >
                Save
              </button>
            </div>
          </div>
          <div className="ops-form-group">
            <label className="ops-form-label">Recycle Bin Retention (hours)</label>
            <div style={{ display: 'flex', gap: '6px' }}>
              <input
                type="number"
                min={1}
                className="ops-input"
                style={{ width: '90px' }}
                value={recycleBinHoursInput}
                onChange={(e) => setRecycleBinHoursInput(e.target.value)}
              />
              <button
                type="button"
                className="ops-btn"
                disabled={savingKey === 'recycle_bin_retention_hours'}
                onClick={() => saveConfig('recycle_bin_retention_hours', Number(recycleBinHoursInput) || 24, 'Recycle bin retention')}
              >
                Save
              </button>
            </div>
          </div>
        </div>
        <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '10px', display: 'flex', alignItems: 'center', gap: '5px' }}>
          <IconAlertCircle size={12} /> Defaults (5 attempts / 15 min lockout / 24h retention) apply until a value is saved here.
        </p>
      </div>

      <div className="ops-flag-grid">
        {flagEntries.map(([key, meta]) => {
          const isEnabled = featureFlags[key] ?? meta.defaultEnabledForUsers;
          return (
            <div key={key} className="ops-card ops-flag-card">
              <div className="ops-flag-top">
                <div>
                  <div className="ops-flag-name">{meta.label}</div>
                  <div className="ops-flag-key">{key}</div>
                </div>
                <button
                  type="button"
                  className="ops-relay"
                  data-on={isEnabled}
                  aria-label={`Toggle ${meta.label}`}
                  onClick={() => {
                    setFeatureFlag(key, !isEnabled);
                    showToast(`${meta.label} set to ${!isEnabled ? 'Enabled' : 'Disabled'}`);
                  }}
                >
                  <span className="ops-puck" />
                </button>
              </div>
              <div className="ops-flag-desc">{meta.description}</div>
              <span className={`ops-state-tag ${isEnabled ? 'on' : 'off'}`}>{isEnabled ? 'ARMED' : 'SAFED'}</span>
            </div>
          );
        })}
      </div>

      <div className="ops-override-split">
        <OverridePanel
          title="Per-Trip Override"
          subtitle="Force a flag on or off for one trip, ignoring the global switch."
          emptyLabel="Select a trip above to manage its overrides."
          selectedId={selectedTripId}
          onSelect={setSelectedTripId}
          options={trips.map((t) => ({ value: t.id, label: `${t.name} (${t.baseCurrency})` }))}
          overrides={tripFlagOverrides[selectedTripId]}
          onSetOverride={(key, value) => {
            setTripFlagOverride(selectedTripId, key, value);
            showToast(`Trip override updated for ${FEATURE_FLAGS_META[key].label}`);
          }}
          flagEntries={flagEntries}
        />

        <OverridePanel
          title="Per-Member Override"
          subtitle="Assign beta access or restrictions to one traveler, across every trip they're in."
          emptyLabel="Select a member above to configure individual privileges."
          selectedId={selectedUserId}
          onSelect={setSelectedUserId}
          options={allMembersList.map((m) => ({ value: m.id, label: `${m.name}${m.linkedUserId ? ' (Claimed)' : ''}` }))}
          overrides={userFlagOverrides[selectedUserId]}
          onSetOverride={(key, value) => {
            setUserFlagOverride(selectedUserId, key, value);
            showToast(`Member override updated for ${FEATURE_FLAGS_META[key].label}`);
          }}
          flagEntries={flagEntries}
        />
      </div>
    </div>
  );
}
