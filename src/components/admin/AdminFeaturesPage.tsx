import { useState } from 'react';
import type { FeatureRecord } from '../../services/featureApi';
import { updateFeature } from '../../services/featureApi';
import type { FeatureFlagKey } from '../../types/admin';
import { FEATURE_FLAGS_META } from '../../utils/featureFlags';
import { useTripStore } from '../../store/tripStore';
import { IconCheck, IconRefresh, IconSearch } from '../Icons';

interface Props {
  features: FeatureRecord[];
  onFeaturesChanged: () => void | Promise<void>;
}

const STATUS_FILTERS = ['active', 'requested', 'planned', 'in_progress', 'shipped', 'wont_do', 'all'] as const;

const STATUS_LABELS: Record<string, string> = {
  requested: 'Requested',
  planned: 'Planned',
  in_progress: 'In Progress',
  shipped: 'Shipped',
  wont_do: "Won't Do",
};

export function AdminFeaturesPage({ features, onFeaturesChanged }: Props) {
  const featureFlags = useTripStore((s) => s.featureFlags);
  const setFeatureFlag = useTripStore((s) => s.setFeatureFlag);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>('active');
  const [toastMsg, setToastMsg] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onFeaturesChanged();
      showToast('Refreshed.');
    } finally {
      setIsRefreshing(false);
    }
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const filtered = features.filter((f) => {
    const matchesStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'active'
          ? f.status === 'requested' || f.status === 'planned' || f.status === 'in_progress'
          : f.status === statusFilter;
    if (!matchesStatus) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return f.title.toLowerCase().includes(q) || f.description.toLowerCase().includes(q) || f.requestedBy.toLowerCase().includes(q);
  });

  const handleStatusChange = async (f: FeatureRecord, status: FeatureRecord['status']) => {
    setBusyId(f.id);
    try {
      await updateFeature(f.id, {
        status,
        ...(status === 'shipped' ? { shippedNote: f.shippedNote || 'Shipped' } : {}),
      });
      showToast(`${f.id} marked ${STATUS_LABELS[status] || status}`);
      onFeaturesChanged();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update.');
    } finally {
      setBusyId(null);
    }
  };

  const handleLinkFlag = async (f: FeatureRecord, key: string) => {
    try {
      await updateFeature(f.id, { linkedFlagKey: key || undefined });
      showToast(key ? `Linked ${f.id} to ${key}` : `Unlinked ${f.id}`);
      onFeaturesChanged();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to link flag.');
    }
  };

  const flagEntries = Object.entries(FEATURE_FLAGS_META) as [FeatureFlagKey, (typeof FEATURE_FLAGS_META)[FeatureFlagKey]][];

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      <div className="ops-page-head">
        <div>
          <h2>Feature Requests</h2>
          <p>What travelers ask for, and what's queued, in progress, or shipped. Link a request to an existing flag to toggle it right here.</p>
        </div>
        <button type="button" className="ops-btn" disabled={isRefreshing} onClick={() => void handleRefresh()}>
          <IconRefresh size={13} className={isRefreshing ? 'icon-sm ops-spin' : 'icon-sm'} /> {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {toastMsg && (
        <div className="ops-toast">
          <IconCheck size={14} /> {toastMsg}
        </div>
      )}

      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="ops-search-wrap">
          <IconSearch size={16} />
          <input
            type="text"
            className="ops-input"
            placeholder="Search by title, description, or requester..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="ops-filter-row" style={{ marginBottom: 0 }}>
          {STATUS_FILTERS.map((s) => (
            <button key={s} type="button" className="ops-chip" data-active={statusFilter === s} onClick={() => setStatusFilter(s)}>
              {s === 'active' ? 'Active' : s === 'all' ? 'All' : STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="ops-card">
          <div className="ops-empty">No feature requests match.</div>
        </div>
      ) : (
        filtered.map((f) => {
          const linkedMeta = f.linkedFlagKey ? FEATURE_FLAGS_META[f.linkedFlagKey as FeatureFlagKey] : undefined;
          const flagOn = linkedMeta && f.linkedFlagKey ? (featureFlags[f.linkedFlagKey as FeatureFlagKey] ?? linkedMeta.defaultEnabledForUsers) : false;
          return (
            <div key={f.id} className="ops-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span className="ops-trip-name">{f.title}</span>
                    <span className={`ops-badge ${f.status === 'shipped' ? 'active' : f.status === 'wont_do' ? 'archived' : 'grounded'}`}>
                      {STATUS_LABELS[f.status]}
                    </span>
                    <span className="ops-switcher-row-code">{f.id}</span>
                  </div>
                  <div className="ops-trip-route">
                    {f.category} &middot; requested by {f.requestedBy} &middot; {new Date(f.createdAt).toLocaleDateString()}
                  </div>
                  {f.description && (
                    <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '8px' }}>{f.description}</p>
                  )}
                  {f.status === 'shipped' && f.shippedNote && (
                    <p style={{ fontSize: '11.5px', color: 'var(--safe)', marginTop: '6px' }}>
                      Shipped by {f.shippedBy}: {f.shippedNote}
                    </p>
                  )}
                </div>
                <div className="ops-manifest-actions" style={{ flexWrap: 'wrap' }}>
                  {f.status !== 'planned' && (
                    <button type="button" className="ops-mini-btn" disabled={busyId === f.id} onClick={() => handleStatusChange(f, 'planned')}>
                      Plan
                    </button>
                  )}
                  {f.status !== 'in_progress' && (
                    <button type="button" className="ops-mini-btn" disabled={busyId === f.id} onClick={() => handleStatusChange(f, 'in_progress')}>
                      Start
                    </button>
                  )}
                  {f.status !== 'shipped' && (
                    <button type="button" className="ops-mini-btn" disabled={busyId === f.id} onClick={() => handleStatusChange(f, 'shipped')}>
                      Ship
                    </button>
                  )}
                  {f.status !== 'wont_do' && (
                    <button type="button" className="ops-mini-btn ground" disabled={busyId === f.id} onClick={() => handleStatusChange(f, 'wont_do')}>
                      Won&apos;t Do
                    </button>
                  )}
                </div>
              </div>

              <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <select
                  className="ops-select"
                  style={{ width: 'auto', minWidth: '220px' }}
                  value={f.linkedFlagKey || ''}
                  onChange={(e) => handleLinkFlag(f, e.target.value)}
                >
                  <option value="">No linked flag</option>
                  {flagEntries.map(([key, meta]) => (
                    <option key={key} value={key}>
                      {meta.label}
                    </option>
                  ))}
                </select>
                {linkedMeta && f.linkedFlagKey && (
                  <button
                    type="button"
                    className="ops-relay"
                    data-on={flagOn}
                    aria-label={`Toggle ${linkedMeta.label}`}
                    onClick={() => {
                      const key = f.linkedFlagKey as FeatureFlagKey;
                      setFeatureFlag(key, !flagOn);
                      showToast(`${linkedMeta.label} set to ${!flagOn ? 'Enabled' : 'Disabled'}`);
                    }}
                  >
                    <span className="ops-puck" />
                  </button>
                )}
                {linkedMeta && <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{flagOn ? 'Enabled' : 'Disabled'} for users</span>}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
