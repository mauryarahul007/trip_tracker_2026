import { useState } from 'react';
import type { FeatureRecord } from '../../services/featureApi';
import { updateFeature } from '../../services/featureApi';
import { logSuperadminAction } from '../../services/tripApi';
import type { FeatureFlagKey } from '../../types/admin';
import { FEATURE_FLAGS_META } from '../../utils/featureFlags';
import { useTripStore } from '../../store/tripStore';
import { IconCheck, IconRefresh, IconSearch } from '../Icons';

interface Props {
  features: FeatureRecord[];
  onFeaturesChanged: () => void | Promise<void>;
}

const STATUS_LABELS: Record<string, string> = {
  requested: 'Requested',
  planned: 'Planned',
  in_progress: 'In Progress',
  shipped: 'Shipped',
  wont_do: "Won't Do",
};

// Requested/Planned+In Progress/Shipped board -- priority reads as column
// position instead of requiring a status filter chip to see what's queued.
const BOARD_COLUMNS: { statuses: FeatureRecord['status'][]; label: string; color: string }[] = [
  { statuses: ['requested'], label: 'Requested', color: 'var(--text-tertiary)' },
  { statuses: ['planned', 'in_progress'], label: 'Planned', color: 'var(--amber)' },
  { statuses: ['shipped'], label: 'Shipped', color: 'var(--safe)' },
];

export function AdminFeaturesPage({ features, onFeaturesChanged }: Props) {
  const featureFlags = useTripStore((s) => s.featureFlags);
  const setFeatureFlag = useTripStore((s) => s.setFeatureFlag);

  const [searchQuery, setSearchQuery] = useState('');
  const [showWontDo, setShowWontDo] = useState(false);
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
    if (!showWontDo && f.status === 'wont_do') return false;
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
      void logSuperadminAction(null, 'feature_status_change', { featureId: f.id, status }).catch((err) =>
        console.error('Audit log failed', err)
      );
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
      void logSuperadminAction(null, 'feature_link_flag', { featureId: f.id, flagKey: key || null }).catch((err) =>
        console.error('Audit log failed', err)
      );
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
        <button type="button" className="ops-chip" data-active={showWontDo} onClick={() => setShowWontDo((v) => !v)}>
          {showWontDo ? "Hide won't-do" : "Show won't-do"}
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="ops-card">
          <div className="ops-empty">No feature requests match.</div>
        </div>
      ) : (
        <div className="ops-feature-board">
          {BOARD_COLUMNS.map((col) => {
            const colFeatures = filtered.filter((f) => col.statuses.includes(f.status));
            return (
              <div key={col.label} className="ops-feature-col">
                <div className="ops-feature-col-head">
                  <span className="dot" style={{ background: col.color }} />
                  {col.label}
                  <span className="count">{colFeatures.length}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {colFeatures.length === 0 ? (
                    <div className="ops-ov-empty">No requests</div>
                  ) : (
                    colFeatures.map((f) => (
                      <FeatureCard
                        key={f.id}
                        feature={f}
                        busy={busyId === f.id}
                        flagEntries={flagEntries}
                        featureFlags={featureFlags}
                        onStatusChange={handleStatusChange}
                        onLinkFlag={handleLinkFlag}
                        onToggleFlag={(key, on) => {
                          setFeatureFlag(key, on);
                          showToast(`${FEATURE_FLAGS_META[key].label} set to ${on ? 'Enabled' : 'Disabled'}`);
                        }}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
          {showWontDo && filtered.some((f) => f.status === 'wont_do') && (
            <div className="ops-feature-col">
              <div className="ops-feature-col-head">
                <span className="dot" style={{ background: 'var(--text-tertiary)' }} />
                Won&apos;t Do
                <span className="count">{filtered.filter((f) => f.status === 'wont_do').length}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {filtered
                  .filter((f) => f.status === 'wont_do')
                  .map((f) => (
                    <FeatureCard
                      key={f.id}
                      feature={f}
                      busy={busyId === f.id}
                      flagEntries={flagEntries}
                      featureFlags={featureFlags}
                      onStatusChange={handleStatusChange}
                      onLinkFlag={handleLinkFlag}
                      onToggleFlag={(key, on) => {
                        setFeatureFlag(key, on);
                        showToast(`${FEATURE_FLAGS_META[key].label} set to ${on ? 'Enabled' : 'Disabled'}`);
                      }}
                    />
                  ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function FeatureCard({
  feature: f,
  busy,
  flagEntries,
  featureFlags,
  onStatusChange,
  onLinkFlag,
  onToggleFlag,
}: {
  feature: FeatureRecord;
  busy: boolean;
  flagEntries: [FeatureFlagKey, (typeof FEATURE_FLAGS_META)[FeatureFlagKey]][];
  featureFlags: Partial<Record<FeatureFlagKey, boolean>>;
  onStatusChange: (f: FeatureRecord, status: FeatureRecord['status']) => void;
  onLinkFlag: (f: FeatureRecord, key: string) => void;
  onToggleFlag: (key: FeatureFlagKey, on: boolean) => void;
}) {
  const linkedMeta = f.linkedFlagKey ? FEATURE_FLAGS_META[f.linkedFlagKey as FeatureFlagKey] : undefined;
  const flagOn = linkedMeta && f.linkedFlagKey ? (featureFlags[f.linkedFlagKey as FeatureFlagKey] ?? linkedMeta.defaultEnabledForUsers) : false;

  return (
    <div className="ops-card">
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <span className="ops-trip-name">{f.title}</span>
        <span className="ops-switcher-row-code">{f.id}</span>
      </div>
      <div className="ops-trip-route">
        {f.category} &middot; requested by {f.requestedBy} &middot; {new Date(f.createdAt).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric' })}
      </div>
      {f.description && <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '8px' }}>{f.description}</p>}
      {f.status === 'shipped' && f.shippedNote && (
        <p style={{ fontSize: '11.5px', color: 'var(--safe)', marginTop: '6px' }}>
          Shipped by {f.shippedBy}: {f.shippedNote}
        </p>
      )}

      <div className="ops-manifest-actions" style={{ flexWrap: 'wrap', justifyContent: 'flex-start', marginTop: '10px' }}>
        {f.status !== 'planned' && (
          <button type="button" className="ops-mini-btn" disabled={busy} onClick={() => onStatusChange(f, 'planned')}>
            Plan
          </button>
        )}
        {f.status !== 'in_progress' && (
          <button type="button" className="ops-mini-btn" disabled={busy} onClick={() => onStatusChange(f, 'in_progress')}>
            Start
          </button>
        )}
        {f.status !== 'shipped' && (
          <button type="button" className="ops-mini-btn" disabled={busy} onClick={() => onStatusChange(f, 'shipped')}>
            Ship
          </button>
        )}
        {f.status !== 'wont_do' && (
          <button type="button" className="ops-mini-btn ground" disabled={busy} onClick={() => onStatusChange(f, 'wont_do')}>
            Won&apos;t Do
          </button>
        )}
      </div>

      <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <select className="ops-select" style={{ width: 'auto', minWidth: '160px' }} value={f.linkedFlagKey || ''} onChange={(e) => onLinkFlag(f, e.target.value)}>
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
            onClick={() => onToggleFlag(f.linkedFlagKey as FeatureFlagKey, !flagOn)}
          >
            <span className="ops-puck" />
          </button>
        )}
      </div>
    </div>
  );
}
