import { useEffect, useState } from 'react';
import type { Trip, Member } from '../../types';
import type { AppConfigKey, FeatureFlagKey, ReleasePhaseId } from '../../types/admin';
import { FEATURE_FLAGS_META, RELEASE_PHASES, getPhaseStatus } from '../../utils/featureFlags';
import { useTripStore } from '../../store/tripStore';
import { fetchAppConfig, setAppConfigValue } from '../../services/tripApi';
import { IconCheck, IconAlertCircle, IconRefresh, IconSearch, IconChevronDown, IconChevronUp } from '../Icons';

const FLAG_CATEGORY_LABELS: Record<string, string> = {
  core: 'Core',
  collab: 'Collab',
  transit: 'Transit',
  fintech: 'FinTech',
  geotagging: 'Geotagging',
  splits: 'Splits',
  sync: 'Sync',
  admin: 'Admin',
  security: 'Security',
};

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
  options: { value: string; label: string }[];
  selectedId: string;
  onSelect: (id: string) => void;
  overrides?: Record<string, boolean>;
  onSetOverride: (key: FeatureFlagKey, value: boolean | null) => void;
  flagEntries: [FeatureFlagKey, typeof FEATURE_FLAGS_META[FeatureFlagKey]][];
}) {
  const [search, setSearch] = useState('');
  const activeCount = overrides ? Object.keys(overrides).length : 0;

  const phaseGroups: { id: ReleasePhaseId; label: string; icon: string }[] = [
    { id: 'phase1', label: 'Phase 1: Core Social Splitter', icon: '🚀' },
    { id: 'phase2', label: 'Phase 2: Active Group Collab', icon: '🎙️' },
    { id: 'phase3', label: 'Phase 3: Smart Travel Navigator', icon: '🧭' },
    { id: 'phase4', label: 'Phase 4: FinTech Pro & Global Suite', icon: '💎' },
    { id: 'deferred', label: 'Platform Extras & Unphased Features', icon: '⚙️' },
  ];

  const q = search.trim().toLowerCase();
  const filteredEntries = flagEntries.filter(([key, meta]) => {
    if (!q) return true;
    return meta.label.toLowerCase().includes(q) || key.toLowerCase().includes(q) || meta.description.toLowerCase().includes(q);
  });

  return (
    <div className="ops-card">
      <div className="ops-ov-head">
        <span className="ops-ov-title">{title}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {activeCount > 0 && (
            <button
              type="button"
              style={{
                fontSize: '10px',
                padding: '2px 6px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#EF4444',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
              onClick={() => {
                flagEntries.forEach(([k]) => {
                  if (overrides?.[k] !== undefined) onSetOverride(k, null);
                });
              }}
            >
              Reset All
            </button>
          )}
          <span className="ops-ov-count">{activeCount} active overrides</span>
        </div>
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
        <div style={{ marginTop: '12px' }}>
          <div style={{ marginBottom: '10px' }}>
            <input
              type="text"
              className="ops-input"
              style={{ width: '100%', fontSize: '11px', padding: '6px 10px' }}
              placeholder="Filter overrides by feature name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {phaseGroups.map((group) => {
            const groupItems = filteredEntries.filter(([, meta]) => meta.phase === group.id);
            if (groupItems.length === 0) return null;

            return (
              <div key={group.id} style={{ marginBottom: '14px' }}>
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: 'var(--amber)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    padding: '4px 0',
                    borderBottom: '1px solid var(--line-strong)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>{group.icon} {group.label}</span>
                  <span style={{ fontSize: '10px', opacity: 0.7, fontFamily: 'var(--mono)' }}>{groupItems.length}</span>
                </div>

                {groupItems.map(([key, meta]) => {
                  const state = overrides?.[key];
                  const stateStr = state === undefined ? 'neutral' : state ? 'on' : 'off';
                  const isOverridden = state !== undefined;

                  return (
                    <div key={key} className="ops-ov-row" style={isOverridden ? { background: 'rgba(245, 158, 11, 0.04)', borderRadius: '4px', padding: '7px 6px' } : undefined}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0, flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span className="ops-ov-flag-name" style={{ fontWeight: isOverridden ? 600 : 400, color: isOverridden ? 'var(--text-primary)' : undefined }}>
                            {meta.label}
                          </span>
                          {isOverridden && (
                            <span style={{ fontSize: '9px', padding: '1px 5px', borderRadius: '3px', background: state ? 'var(--safe-dim)' : 'var(--danger-dim)', color: state ? 'var(--safe)' : 'var(--danger)', fontWeight: 700 }}>
                              {state ? 'FORCE ON' : 'FORCE OFF'}
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontFamily: 'var(--mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {key}
                        </span>
                      </div>
                      <div className="ops-tristate" role="group" aria-label={`${meta.label} override`}>
                        <button
                          type="button"
                          className="off"
                          data-active={stateStr === 'off'}
                          onClick={() => onSetOverride(key, false)}
                          title="Force disabled for this scope"
                        >
                          Force Off
                        </button>
                        <button
                          type="button"
                          className="neutral"
                          data-active={stateStr === 'neutral'}
                          onClick={() => onSetOverride(key, null)}
                          title="Inherit global switchboard setting"
                        >
                          Default
                        </button>
                        <button
                          type="button"
                          className="on"
                          data-active={stateStr === 'on'}
                          onClick={() => onSetOverride(key, true)}
                          title="Force enabled for this scope"
                        >
                          Force On
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}

          {filteredEntries.length === 0 && (
            <div className="ops-ov-empty">No features match &ldquo;{search}&rdquo;.</div>
          )}
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
  const loadAllFeatureFlagOverrides = useTripStore((s) => s.loadAllFeatureFlagOverrides);
  const setPhaseFlags = useTripStore((s) => s.setPhaseFlags);

  type FlagsSubTab = 'phases' | 'overrides' | 'system';
  const [activeSubTab, setActiveSubTab] = useState<FlagsSubTab>('phases');

  const [expandedPhases, setExpandedPhases] = useState<Record<ReleasePhaseId, boolean>>({
    phase1: false,
    phase2: false,
    phase3: false,
    phase4: false,
    deferred: false,
  });

  const togglePhaseExpand = (phaseId: ReleasePhaseId) => {
    setExpandedPhases((prev) => ({ ...prev, [phaseId]: !prev[phaseId] }));
  };

  const [selectedTripId, setSelectedTripId] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [toastMsg, setToastMsg] = useState('');
  const [flagSearch, setFlagSearch] = useState('');
  const [flagCategoryFilter, setFlagCategoryFilter] = useState<string>('all');

  const [config, setConfig] = useState<Partial<Record<AppConfigKey, unknown>>>({});
  const [savingKey, setSavingKey] = useState<AppConfigKey | null>(null);
  const [joinMaxAttemptsInput, setJoinMaxAttemptsInput] = useState('5');
  const [joinLockoutMinutesInput, setJoinLockoutMinutesInput] = useState('15');
  const [recycleBinHoursInput, setRecycleBinHoursInput] = useState('24');
  const [expenseCeilingInput, setExpenseCeilingInput] = useState('999999999.99');
  const [auditRetentionDaysInput, setAuditRetentionDaysInput] = useState('90');
  const [maintenanceWindowStart, setMaintenanceWindowStart] = useState('');
  const [maintenanceWindowEnd, setMaintenanceWindowEnd] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 2500);
  };

  const loadConfigAndOverrides = () =>
    Promise.all([
      fetchAppConfig().then((c) => {
        setConfig(c);
        if (typeof c.join_max_attempts === 'number') setJoinMaxAttemptsInput(String(c.join_max_attempts));
        if (typeof c.join_lockout_minutes === 'number') setJoinLockoutMinutesInput(String(c.join_lockout_minutes));
        if (typeof c.recycle_bin_retention_hours === 'number') setRecycleBinHoursInput(String(c.recycle_bin_retention_hours));
        if (typeof c.expense_amount_ceiling === 'number') setExpenseCeilingInput(String(c.expense_amount_ceiling));
        if (typeof c.audit_log_retention_days === 'number') setAuditRetentionDaysInput(String(c.audit_log_retention_days));
        const window = c.maintenance_window as { start?: string; end?: string } | undefined;
        if (window?.start) setMaintenanceWindowStart(window.start.slice(0, 16));
        if (window?.end) setMaintenanceWindowEnd(window.end.slice(0, 16));
      }),
      loadAllFeatureFlagOverrides(),
    ]).then(() => undefined);

  useEffect(() => {
    loadConfigAndOverrides().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await loadConfigAndOverrides();
      showToast('Refreshed.');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Refresh failed.');
    } finally {
      setIsRefreshing(false);
    }
  };

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
  const claimedMembersById = new Map<string, Member>();
  for (const m of Object.values(members)) {
    if (m.archived || !m.linkedUserId) continue;
    if (!claimedMembersById.has(m.linkedUserId)) claimedMembersById.set(m.linkedUserId, m);
  }
  const claimedMembersList = Array.from(claimedMembersById.values());
  const flagCategories = Array.from(new Set(flagEntries.map(([, meta]) => meta.category)));
  const visibleFlagEntries = flagEntries.filter(([key, meta]) => {
    if (flagCategoryFilter !== 'all' && meta.category !== flagCategoryFilter) return false;
    if (!flagSearch.trim()) return true;
    const q = flagSearch.toLowerCase();
    return meta.label.toLowerCase().includes(q) || key.toLowerCase().includes(q) || meta.description.toLowerCase().includes(q);
  });

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Page Header */}
      <div className="ops-page-head">
        <div>
          <h2>Feature Flags &amp; Release Switchboard</h2>
          <p>Govern progressive customer rollouts (Phases 1–4), device beta overrides, and system access gates.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button type="button" className="ops-btn" disabled={isRefreshing} onClick={() => void handleRefresh()}>
            <IconRefresh size={13} className={isRefreshing ? 'icon-sm ops-spin' : 'icon-sm'} /> {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </button>
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
      </div>

      {toastMsg && (
        <div className="ops-toast">
          <IconCheck size={14} /> {toastMsg}
        </div>
      )}

      {/* Sub-Navigation Tabs */}
      <div className="ops-subnav-bar" role="tablist" aria-label="Feature flag views">
        <button
          type="button"
          role="tab"
          aria-selected={activeSubTab === 'phases'}
          className={`ops-subnav-btn ${activeSubTab === 'phases' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('phases')}
        >
          🚀 Customer Release Phases (1–4)
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeSubTab === 'overrides'}
          className={`ops-subnav-btn ${activeSubTab === 'overrides' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('overrides')}
        >
          🎯 Staging &amp; Overrides
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeSubTab === 'system'}
          className={`ops-subnav-btn ${activeSubTab === 'system' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('system')}
        >
          ⚙️ Access Gates &amp; Limits
        </button>
      </div>

      {/* VIEW 1: CUSTOMER RELEASE PHASES */}
      {activeSubTab === 'phases' && (
        <div className="ops-phases-section">
          {/* Top Summary Bar */}
          <div className="ops-phase-summary-grid">
            {RELEASE_PHASES.filter((p) => p.id !== 'deferred').map((phase) => {
              const stats = getPhaseStatus(phase.id, featureFlags);
              const isExpanded = expandedPhases[phase.id];
              return (
                <button
                  key={phase.id}
                  type="button"
                  className={`ops-phase-summary-card ${isExpanded ? 'active' : ''}`}
                  onClick={() => togglePhaseExpand(phase.id)}
                >
                  <div className="ops-phase-summary-top">
                    <span className="ops-phase-summary-code">{phase.code}</span>
                    <span className={`ops-state-tag ${stats.status === 'armed' ? 'on' : stats.status === 'partial' ? 'on' : 'off'}`}>
                      {stats.status === 'armed' ? 'ARMED' : stats.status === 'partial' ? 'PARTIAL' : 'SAFED'}
                    </span>
                  </div>
                  <div className="ops-phase-summary-title">{phase.title}</div>
                  <div className="ops-phase-summary-count">
                    {stats.activeCount} of {stats.totalCount} active
                  </div>
                </button>
              );
            })}
          </div>

          {/* Phase Cards */}
          {RELEASE_PHASES.map((phase) => {
            const stats = getPhaseStatus(phase.id, featureFlags);
            const isExpanded = expandedPhases[phase.id];
            const phaseEntries = phase.flagKeys.map((k) => [k, FEATURE_FLAGS_META[k]] as [FeatureFlagKey, typeof FEATURE_FLAGS_META[FeatureFlagKey]]);

            return (
              <div key={phase.id} className={`ops-phase-card ${stats.status}`}>
                <div className="ops-phase-header">
                  <div className="ops-phase-info">
                    <div className="ops-phase-title-row">
                      <span className={`ops-phase-badge ${phase.id}`}>{phase.code}</span>
                      <span className="ops-phase-name">{phase.title}</span>
                      <span className={`ops-state-tag ${stats.status === 'armed' ? 'on' : stats.status === 'partial' ? 'on' : 'off'}`}>
                        {stats.status === 'armed' ? 'ALL ARMED' : stats.status === 'partial' ? `${stats.activeCount}/${stats.totalCount} ARMED` : 'SAFED (DISABLED)'}
                      </span>
                    </div>
                    <div className="ops-phase-tagline">{phase.tagline}</div>
                    <div className="ops-phase-target">
                      <strong>Audience:</strong> {phase.targetAudience}
                    </div>
                  </div>

                  <div className="ops-phase-controls">
                    <button
                      type="button"
                      className="ops-phase-btn arm"
                      style={stats.status === 'armed' ? { opacity: 0.5 } : undefined}
                      onClick={async () => {
                        await setPhaseFlags(phase.id, true);
                        showToast(`${phase.code} (${phase.title}): All flags ARMED`);
                      }}
                    >
                      Arm Phase (Turn On)
                    </button>
                    <button
                      type="button"
                      className="ops-phase-btn safe"
                      style={stats.status === 'safed' ? { opacity: 0.5 } : undefined}
                      onClick={async () => {
                        await setPhaseFlags(phase.id, false);
                        showToast(`${phase.code} (${phase.title}): All flags SAFED`);
                      }}
                    >
                      Safe Phase (Turn Off)
                    </button>
                  </div>
                </div>

                {/* Instant Visual Feature Badges */}
                <div className="ops-phase-feature-chips">
                  {phase.flagKeys.map((k) => {
                    const isArmed = featureFlags[k] ?? FEATURE_FLAGS_META[k]?.defaultEnabledForUsers ?? false;
                    return (
                      <span key={k} className={`ops-phase-chip ${isArmed ? 'armed' : 'safed'}`}>
                        <span className="dot" />
                        {FEATURE_FLAGS_META[k]?.label || k}
                      </span>
                    );
                  })}
                </div>

                {/* Collapsible Tuning Controls */}
                <button
                  type="button"
                  className="ops-phase-toggle-expand"
                  style={{ alignSelf: 'flex-start', marginTop: '6px' }}
                  onClick={() => togglePhaseExpand(phase.id)}
                  aria-label={`Toggle ${phase.title} individual flags`}
                >
                  {isExpanded ? (
                    <>Hide Detailed Flag Relays <IconChevronUp size={12} /></>
                  ) : (
                    <>Tune Individual Flags ({stats.activeCount}/{stats.totalCount}) <IconChevronDown size={12} /></>
                  )}
                </button>

                {isExpanded && (
                  <div className="ops-flag-grid" style={{ marginTop: '8px' }}>
                    {phaseEntries.map(([key, meta]) => {
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
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <span className={`ops-state-tag ${isEnabled ? 'on' : 'off'}`}>
                              {isEnabled ? 'ARMED' : 'SAFED'}
                            </span>
                            <span className="ops-state-tag off">
                              {FLAG_CATEGORY_LABELS[meta.category] || meta.category}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW 2: STAGING & GRANULAR OVERRIDES */}
      {activeSubTab === 'overrides' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <h3 className="ops-section-title">Granular Scoped Overrides</h3>
            <p className="ops-section-sub">Test unreleased Phase 3/4 features on specific test trips or VIP user accounts before wide public release.</p>
          </div>

          <div className="ops-override-split">
            <OverridePanel
              title="Per-Trip Override"
              subtitle="Force a flag on or off for one trip, ignoring the global switch."
              emptyLabel="Select a trip above to manage its overrides."
              selectedId={selectedTripId}
              onSelect={setSelectedTripId}
              options={trips.map((t) => {
                const hasOverride = Boolean(tripFlagOverrides[t.id] && Object.keys(tripFlagOverrides[t.id]).length);
                return { value: t.id, label: `${t.name} (${t.baseCurrency}) · Overrides: ${hasOverride ? 'Yes' : 'No'}` };
              })}
              overrides={tripFlagOverrides[selectedTripId]}
              onSetOverride={(key, value) => {
                setTripFlagOverride(selectedTripId, key, value);
                showToast(`Trip override updated for ${FEATURE_FLAGS_META[key].label}`);
              }}
              flagEntries={flagEntries}
            />

            <OverridePanel
              title="Per-Member Override"
              subtitle="Assign beta access or restrictions to one traveler (linked account required), across every trip they're in."
              emptyLabel="Select a member above to configure individual privileges."
              selectedId={selectedUserId}
              onSelect={setSelectedUserId}
              options={claimedMembersList.map((m) => ({ value: m.linkedUserId as string, label: m.name }))}
              overrides={userFlagOverrides[selectedUserId]}
              onSetOverride={(key, value) => {
                setUserFlagOverride(selectedUserId, key, value);
                showToast(`Member override updated for ${FEATURE_FLAGS_META[key].label}`);
              }}
              flagEntries={flagEntries}
            />
          </div>

          <div style={{ marginTop: '12px' }}>
            <h3 className="ops-section-title">Quick Search &amp; Filter All Flags</h3>
            <p className="ops-section-sub">Search or filter across all system flags simultaneously.</p>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <div className="ops-search-wrap" style={{ minWidth: '200px', flex: '1 1 200px' }}>
              <IconSearch size={16} />
              <input
                type="text"
                className="ops-input"
                placeholder="Search flags by name or key..."
                value={flagSearch}
                onChange={(e) => setFlagSearch(e.target.value)}
              />
            </div>
            <div className="ops-filter-row" style={{ marginBottom: 0 }}>
              <button type="button" className="ops-chip" data-active={flagCategoryFilter === 'all'} onClick={() => setFlagCategoryFilter('all')}>
                All
              </button>
              {flagCategories.map((cat) => (
                <button key={cat} type="button" className="ops-chip" data-active={flagCategoryFilter === cat} onClick={() => setFlagCategoryFilter(cat)}>
                  {FLAG_CATEGORY_LABELS[cat] || cat}
                </button>
              ))}
            </div>
          </div>

          {flagSearch.trim() && (
            visibleFlagEntries.length === 0 ? (
              <div className="ops-ov-empty">No flags match &ldquo;{flagSearch}&rdquo;.</div>
            ) : (
              <div className="ops-flag-grid">
                {visibleFlagEntries.map(([key, meta]) => {
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
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <span className={`ops-state-tag ${isEnabled ? 'on' : 'off'}`}>{isEnabled ? 'ARMED' : 'SAFED'}</span>
                        <span className="ops-state-tag off">{FLAG_CATEGORY_LABELS[meta.category] || meta.category}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>
      )}

      {/* VIEW 3: SYSTEM GATES & LIMITS */}
      {activeSubTab === 'system' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="ops-card">
            <h3 className="ops-section-title">Access Gates</h3>
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
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '10px', alignItems: 'flex-end' }}>
                <div className="ops-form-group">
                  <label className="ops-form-label" htmlFor="maintenance-window-start">Or schedule a window (start)</label>
                  <input
                    id="maintenance-window-start"
                    type="datetime-local"
                    className="ops-input"
                    value={maintenanceWindowStart}
                    onChange={(e) => setMaintenanceWindowStart(e.target.value)}
                  />
                </div>
                <div className="ops-form-group">
                  <label className="ops-form-label" htmlFor="maintenance-window-end">End</label>
                  <input
                    id="maintenance-window-end"
                    type="datetime-local"
                    className="ops-input"
                    value={maintenanceWindowEnd}
                    onChange={(e) => setMaintenanceWindowEnd(e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  className="ops-btn"
                  disabled={savingKey === 'maintenance_window'}
                  onClick={() =>
                    saveConfig(
                      'maintenance_window',
                      maintenanceWindowStart && maintenanceWindowEnd
                        ? { start: new Date(maintenanceWindowStart).toISOString(), end: new Date(maintenanceWindowEnd).toISOString() }
                        : null,
                      'Maintenance window'
                    )
                  }
                >
                  Save Window
                </button>
              </div>
              <p style={{ fontSize: '10.5px', color: 'var(--text-tertiary)', marginTop: '6px' }}>
                The app blocks non-superadmins if the toggle above is on, OR the current time falls inside this window — whichever fires first. Leave both fields blank and save to clear the window.
              </p>
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
          </div>

          <div className="ops-card">
            <h3 className="ops-section-title">Limits &amp; Retention</h3>
            <p className="ops-section-sub">Numeric thresholds and retention windows applied server-side.</p>

            <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', marginTop: '10px' }}>
              <div className="ops-form-group">
                <label className="ops-form-label" htmlFor="join-max-attempts">Join-Code Max Attempts</label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <input
                    id="join-max-attempts"
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
                <label className="ops-form-label" htmlFor="join-lockout-minutes">Join Lockout (minutes)</label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <input
                    id="join-lockout-minutes"
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
                <label className="ops-form-label" htmlFor="recycle-bin-hours">Recycle Bin Retention (hours)</label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <input
                    id="recycle-bin-hours"
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
              <div className="ops-form-group">
                <label className="ops-form-label" htmlFor="expense-ceiling">Expense Amount Ceiling</label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <input
                    id="expense-ceiling"
                    type="number"
                    min={0}
                    className="ops-input"
                    style={{ width: '140px' }}
                    value={expenseCeilingInput}
                    onChange={(e) => setExpenseCeilingInput(e.target.value)}
                  />
                  <button
                    type="button"
                    className="ops-btn"
                    disabled={savingKey === 'expense_amount_ceiling'}
                    onClick={() => saveConfig('expense_amount_ceiling', Number(expenseCeilingInput) || 999999999.99, 'Expense amount ceiling')}
                  >
                    Save
                  </button>
                </div>
              </div>
              <div className="ops-form-group">
                <label className="ops-form-label" htmlFor="audit-retention-days">Audit Log Retention (days)</label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <input
                    id="audit-retention-days"
                    type="number"
                    min={1}
                    className="ops-input"
                    style={{ width: '90px' }}
                    value={auditRetentionDaysInput}
                    onChange={(e) => setAuditRetentionDaysInput(e.target.value)}
                  />
                  <button
                    type="button"
                    className="ops-btn"
                    disabled={savingKey === 'audit_log_retention_days'}
                    onClick={() => saveConfig('audit_log_retention_days', Number(auditRetentionDaysInput) || 90, 'Audit log retention')}
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
            <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '10px', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <IconAlertCircle size={12} /> Defaults (5 attempts / 15 min lockout / 24h recycle bin / 90 day audit log / no amount ceiling) apply until a value is saved here.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
