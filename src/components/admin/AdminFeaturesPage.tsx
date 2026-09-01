import { useMemo, useState } from 'react';
import type { FeatureRecord } from '../../services/featureApi';
import { updateFeature, createFeatureRequest } from '../../services/featureApi';
import { logSuperadminAction } from '../../services/tripApi';
import type { FeatureFlagKey } from '../../types/admin';
import { FEATURE_FLAGS_META } from '../../utils/featureFlags';
import { useTripStore } from '../../store/tripStore';
import { IconCheck, IconRefresh, IconSearch, IconPlus, IconX } from '../Icons';

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

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  'ui-ux': { bg: 'rgba(168, 85, 247, 0.15)', text: '#C084FC' },
  analytics: { bg: 'rgba(59, 130, 246, 0.15)', text: '#60A5FA' },
  admin: { bg: 'rgba(245, 158, 11, 0.15)', text: '#FBBF24' },
  sync: { bg: 'rgba(20, 184, 166, 0.15)', text: '#2DD4BF' },
  notifications: { bg: 'rgba(236, 72, 153, 0.15)', text: '#F472B6' },
  security: { bg: 'rgba(239, 68, 68, 0.15)', text: '#F87171' },
  performance: { bg: 'rgba(16, 185, 129, 0.15)', text: '#34D399' },
  native: { bg: 'rgba(99, 102, 241, 0.15)', text: '#818CF8' },
  general: { bg: 'rgba(148, 163, 184, 0.15)', text: '#94A3B8' },
};

const BOARD_COLUMNS: { statuses: FeatureRecord['status'][]; label: string; color: string }[] = [
  { statuses: ['requested'], label: 'Requested', color: 'var(--text-tertiary)' },
  { statuses: ['planned', 'in_progress'], label: 'Planned & In Progress', color: 'var(--amber)' },
  { statuses: ['shipped'], label: 'Shipped', color: 'var(--safe)' },
];

export function AdminFeaturesPage({ features, onFeaturesChanged }: Props) {
  const featureFlags = useTripStore((s) => s.featureFlags);
  const setFeatureFlag = useTripStore((s) => s.setFeatureFlag);

  const [searchQuery, setSearchQuery] = useState('');
  const [showWontDo, setShowWontDo] = useState(false);
  const [viewMode, setViewMode] = useState<'board' | 'table'>('table');
  const [toastMsg, setToastMsg] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [linkingFeature, setLinkingFeature] = useState<FeatureRecord | null>(null);

  // New Request Form State
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newCategory, setNewCategory] = useState<FeatureRecord['category']>('ui-ux');
  const [newRequester, setNewRequester] = useState('superadmin');
  const [isSubmittingNew, setIsSubmittingNew] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onFeaturesChanged();
      showToast('Refreshed feature cases.');
    } finally {
      setIsRefreshing(false);
    }
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  // Roadmap Metrics
  const metrics = useMemo(() => {
    const total = features.filter((f) => f.status !== 'wont_do').length || 1;
    const shipped = features.filter((f) => f.status === 'shipped').length;
    const planned = features.filter((f) => f.status === 'planned' || f.status === 'in_progress').length;
    const requested = features.filter((f) => f.status === 'requested').length;
    const percentShipped = Math.round((shipped / total) * 100);

    return { total, shipped, planned, requested, percentShipped };
  }, [features]);

  const filtered = features.filter((f) => {
    if (!showWontDo && f.status === 'wont_do') return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return f.title.toLowerCase().includes(q) || f.description.toLowerCase().includes(q) || f.requestedBy.toLowerCase().includes(q) || f.id.toLowerCase().includes(q);
  });

  const handleStatusChange = async (f: FeatureRecord, status: FeatureRecord['status']) => {
    setBusyId(f.id);
    try {
      await updateFeature(f.id, {
        status,
        ...(status === 'shipped' ? { shippedNote: f.shippedNote || 'Shipped to production' } : {}),
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
      showToast(key ? `Linked ${f.id} to ${key}` : `Unlinked flag from ${f.id}`);
      setLinkingFeature(null);
      onFeaturesChanged();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to link flag.');
    }
  };

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setIsSubmittingNew(true);
    try {
      const created = await createFeatureRequest({
        title: newTitle.trim(),
        description: newDescription.trim(),
        category: newCategory,
        requestedBy: newRequester.trim() || 'superadmin',
      });
      showToast(`Created feature case ${created.id}`);
      setIsNewModalOpen(false);
      setNewTitle('');
      setNewDescription('');
      onFeaturesChanged();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to create feature request.');
    } finally {
      setIsSubmittingNew(false);
    }
  };

  const flagEntries = Object.entries(FEATURE_FLAGS_META) as [FeatureFlagKey, (typeof FEATURE_FLAGS_META)[FeatureFlagKey]][];

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div className="ops-page-head">
        <div>
          <h2>Feature Roadmap &amp; Requests</h2>
          <p>Linear-grade tracking of traveler feature requests, implementation velocity, and production flag linkages.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button type="button" className="ops-btn ops-btn-primary" onClick={() => setIsNewModalOpen(true)}>
            <IconPlus size={13} /> Log Request
          </button>
          <button type="button" className="ops-btn" disabled={isRefreshing} onClick={() => void handleRefresh()}>
            <IconRefresh size={13} className={isRefreshing ? 'icon-sm ops-spin' : 'icon-sm'} /> {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {toastMsg && (
        <div className="ops-toast">
          <IconCheck size={14} /> {toastMsg}
        </div>
      )}

      {/* Roadmap Velocity Progress Strip */}
      <div className="ops-velocity-strip">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Roadmap Velocity
            </span>
            <span className="ops-badge safe">{metrics.percentShipped}% Shipped</span>
          </div>
          <div style={{ display: 'flex', gap: '14px', fontSize: '12px', color: 'var(--text-secondary)' }}>
            <span><strong>{metrics.requested}</strong> Requested</span>
            <span><strong>{metrics.planned}</strong> In Flight</span>
            <span><strong>{metrics.shipped}</strong> Shipped</span>
          </div>
        </div>

        <div className="ops-velocity-progress" title={`${metrics.percentShipped}% Shipped`}>
          <div
            className="ops-velocity-segment seg-shipped"
            style={{ width: `${(metrics.shipped / metrics.total) * 100}%` }}
          />
          <div
            className="ops-velocity-segment seg-planned"
            style={{ width: `${(metrics.planned / metrics.total) * 100}%` }}
          />
          <div
            className="ops-velocity-segment seg-requested"
            style={{ width: `${(metrics.requested / metrics.total) * 100}%` }}
          />
        </div>
      </div>

      {/* Toolbar & View Switcher */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="ops-search-wrap">
          <IconSearch size={16} />
          <input
            type="text"
            className="ops-input"
            placeholder="Search by case ID, title, description, or requester..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div className="ops-view-switcher">
            <button
              type="button"
              className={`ops-view-btn ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode('table')}
            >
              List
            </button>
            <button
              type="button"
              className={`ops-view-btn ${viewMode === 'board' ? 'active' : ''}`}
              onClick={() => setViewMode('board')}
            >
              Kanban
            </button>
          </div>

          <button type="button" className="ops-chip" data-active={showWontDo} onClick={() => setShowWontDo((v) => !v)}>
            {showWontDo ? "Hide won't-do" : "Show won't-do"}
          </button>
        </div>
      </div>

      {/* Empty State */}
      {filtered.length === 0 ? (
        <div className="ops-card" style={{ padding: '40px' }}>
          <div className="ops-empty">No feature requests match your filters.</div>
        </div>
      ) : viewMode === 'table' ? (
        /* Linear-Grade Dense List/Table View with Sticky Headers */
        <div className="ops-feature-table-viewport">
          <table className="ops-dense-feature-table">
            <thead>
              <tr>
                <th style={{ width: '90px' }}>Case ID</th>
                <th>Title &amp; Category</th>
                <th style={{ width: '130px' }}>Status</th>
                <th style={{ width: '140px' }}>Requester</th>
                <th style={{ width: '220px' }}>Linked Runtime Flag</th>
                <th style={{ width: '130px', textAlign: 'right' }}>Workflow</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((f) => {
                const linkedMeta = f.linkedFlagKey ? FEATURE_FLAGS_META[f.linkedFlagKey as FeatureFlagKey] : undefined;
                const flagOn = linkedMeta && f.linkedFlagKey ? (featureFlags[f.linkedFlagKey as FeatureFlagKey] ?? linkedMeta.defaultEnabledForUsers) : false;
                const catStyle = CATEGORY_COLORS[f.category] || CATEGORY_COLORS.general;

                return (
                  <tr key={f.id}>
                    <td>
                      <span className="ops-feature-id-badge">{f.id}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{f.title}</span>
                        <span
                          className="ops-feature-cat-pill"
                          style={{ background: catStyle.bg, color: catStyle.text }}
                        >
                          {f.category}
                        </span>
                      </div>
                      {f.description && (
                        <div style={{ fontSize: '11.5px', color: 'var(--text-tertiary)', marginTop: '3px' }}>
                          {f.description.slice(0, 85)}{f.description.length > 85 ? '...' : ''}
                        </div>
                      )}
                    </td>
                    <td>
                      <span className={`ops-badge ${f.status === 'shipped' ? 'safe' : f.status === 'in_progress' || f.status === 'planned' ? 'caution' : f.status === 'wont_do' ? 'grounded' : 'archived'}`}>
                        {STATUS_LABELS[f.status] || f.status}
                      </span>
                    </td>
                    <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {f.requestedBy}
                    </td>
                    <td>
                      {linkedMeta && f.linkedFlagKey ? (
                        <div className="ops-card-flag-hub" style={{ padding: '3px 8px' }}>
                          <div className="ops-card-flag-info">
                            <span className={`ops-card-flag-dot ${flagOn ? 'on' : 'off'}`} />
                            <span style={{ fontSize: '11px', fontWeight: 600 }}>{linkedMeta.label}</span>
                          </div>
                          <button
                            type="button"
                            className="ops-relay"
                            data-on={flagOn}
                            aria-label={`Toggle ${linkedMeta.label}`}
                            onClick={() => {
                              setFeatureFlag(f.linkedFlagKey as FeatureFlagKey, !flagOn);
                              showToast(`${linkedMeta.label} set to ${!flagOn ? 'Enabled' : 'Disabled'}`);
                            }}
                          >
                            <span className="ops-puck" />
                          </button>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-tertiary)', fontSize: '12px' }}>—</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end' }}>
                        <select
                          className="ops-select"
                          style={{ width: 'auto', fontSize: '11px', padding: '3px 6px' }}
                          value={f.status}
                          disabled={busyId === f.id}
                          onChange={(e) => handleStatusChange(f, e.target.value as FeatureRecord['status'])}
                        >
                          <option value="requested">Requested</option>
                          <option value="planned">Planned</option>
                          <option value="in_progress">In Progress</option>
                          <option value="shipped">Shipped</option>
                          <option value="wont_do">Won&apos;t Do</option>
                        </select>
                        <button
                          type="button"
                          className="ops-mini-btn"
                          style={{ padding: '3px 6px', fontSize: '10.5px' }}
                          title={f.linkedFlagKey ? 'Change or remove linked flag' : 'Link to a runtime feature flag'}
                          onClick={() => setLinkingFeature(f)}
                        >
                          {f.linkedFlagKey ? 'Flag' : '+Flag'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* Kanban Board View */
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
                      <FeatureKanbanCard
                        key={f.id}
                        feature={f}
                        busy={busyId === f.id}
                        featureFlags={featureFlags}
                        onStatusChange={handleStatusChange}
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
                    <FeatureKanbanCard
                      key={f.id}
                      feature={f}
                      busy={busyId === f.id}
                      featureFlags={featureFlags}
                      onStatusChange={handleStatusChange}
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

      {/* Link Flag Modal */}
      {linkingFeature && (
        <div className="ops-modal-backdrop" onClick={() => setLinkingFeature(null)}>
          <div className="ops-modal-card fade-in" style={{ maxWidth: '420px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>
                Link Flag &middot; {linkingFeature.id}
              </h3>
              <button type="button" className="ops-btn" style={{ padding: '4px' }} onClick={() => setLinkingFeature(null)}>
                <IconX size={14} />
              </button>
            </div>
            <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
              Select a runtime feature flag to link to <strong>{linkingFeature.title}</strong>, allowing live production toggling.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <select
                className="ops-select"
                defaultValue={linkingFeature.linkedFlagKey || ''}
                id="link-flag-selector"
              >
                <option value="">No linked flag (Unlink)</option>
                {flagEntries.map(([key, meta]) => (
                  <option key={key} value={key}>
                    {meta.label} ({key})
                  </option>
                ))}
              </select>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                <button type="button" className="ops-btn" onClick={() => setLinkingFeature(null)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="ops-btn ops-btn-primary"
                  onClick={() => {
                    const sel = (document.getElementById('link-flag-selector') as HTMLSelectElement)?.value;
                    void handleLinkFlag(linkingFeature, sel);
                  }}
                >
                  Save Linkage
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Log New Feature Modal */}
      {isNewModalOpen && (
        <div className="ops-modal-backdrop" onClick={() => setIsNewModalOpen(false)}>
          <div className="ops-modal-card fade-in" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>Log Feature Request</h3>
              <button type="button" className="ops-btn" style={{ padding: '4px' }} onClick={() => setIsNewModalOpen(false)}>
                <IconX size={14} />
              </button>
            </div>
            <form onSubmit={handleCreateRequest} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label className="ops-label">Feature Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dynamic Split Weights for Multi-Caravans"
                  className="ops-input"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                />
              </div>

              <div>
                <label className="ops-label">Category</label>
                <select
                  className="ops-select"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as FeatureRecord['category'])}
                >
                  <option value="ui-ux">UI / UX Design</option>
                  <option value="analytics">Analytics &amp; Graphs</option>
                  <option value="sync">Sync &amp; Offline Cache</option>
                  <option value="notifications">Alerts &amp; Notifications</option>
                  <option value="security">Security &amp; Auth</option>
                  <option value="performance">Performance &amp; Bundle</option>
                  <option value="native">Native Mobile</option>
                  <option value="admin">Superadmin Ops</option>
                  <option value="general">General</option>
                </select>
              </div>

              <div>
                <label className="ops-label">Description &amp; Use Case</label>
                <textarea
                  rows={3}
                  placeholder="Detailed traveler context and workflow requirements..."
                  className="ops-input"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                />
              </div>

              <div>
                <label className="ops-label">Requested By</label>
                <input
                  type="text"
                  placeholder="e.g. Rahul / traveler email"
                  className="ops-input"
                  value={newRequester}
                  onChange={(e) => setNewRequester(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                <button type="button" className="ops-btn" onClick={() => setIsNewModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="ops-btn ops-btn-primary" disabled={isSubmittingNew || !newTitle.trim()}>
                  {isSubmittingNew ? 'Creating...' : 'Create Case'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function FeatureKanbanCard({
  feature: f,
  busy,
  featureFlags,
  onStatusChange,
  onToggleFlag,
}: {
  feature: FeatureRecord;
  busy: boolean;
  featureFlags: Partial<Record<FeatureFlagKey, boolean>>;
  onStatusChange: (f: FeatureRecord, status: FeatureRecord['status']) => void;
  onToggleFlag: (key: FeatureFlagKey, on: boolean) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const linkedMeta = f.linkedFlagKey ? FEATURE_FLAGS_META[f.linkedFlagKey as FeatureFlagKey] : undefined;
  const flagOn = linkedMeta && f.linkedFlagKey ? (featureFlags[f.linkedFlagKey as FeatureFlagKey] ?? linkedMeta.defaultEnabledForUsers) : false;
  const catStyle = CATEGORY_COLORS[f.category] || CATEGORY_COLORS.general;

  return (
    <div className="ops-feature-item-card">
      {/* Top Metadata Row */}
      <div className="ops-feature-top-meta">
        <span className="ops-feature-id-badge">{f.id}</span>
        <span
          className="ops-feature-cat-pill"
          style={{ background: catStyle.bg, color: catStyle.text }}
        >
          {f.category}
        </span>
      </div>

      {/* Card Title */}
      <div className="ops-feature-title">{f.title}</div>

      {/* Description Drawer */}
      {f.description && (
        <div
          className="ops-feature-desc"
          style={{
            cursor: 'pointer',
            display: '-webkit-box',
            WebkitLineClamp: isExpanded ? 'unset' : 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
          onClick={() => setIsExpanded((v) => !v)}
          title="Click to toggle full description"
        >
          {f.description}
        </div>
      )}

      {/* Shipped Release Banner */}
      {f.status === 'shipped' && (
        <div className="ops-shipped-banner">
          <IconCheck size={13} />
          <span>{f.shippedNote || 'Shipped to production'} {f.shippedBy ? `by ${f.shippedBy}` : ''}</span>
        </div>
      )}

      {/* Requester & Date */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-tertiary)' }}>
        <span>req. by <strong style={{ color: 'var(--text-secondary)' }}>{f.requestedBy}</strong></span>
        <span>{new Date(f.createdAt).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short' })}</span>
      </div>

      {/* Pipeline Status Stepper */}
      <div className="ops-pipeline-stepper">
        <button
          type="button"
          className={`ops-step-btn ${f.status === 'requested' ? 'current' : ''}`}
          disabled={busy}
          onClick={() => onStatusChange(f, 'requested')}
        >
          Req
        </button>
        <button
          type="button"
          className={`ops-step-btn ${f.status === 'planned' ? 'current' : ''}`}
          disabled={busy}
          onClick={() => onStatusChange(f, 'planned')}
        >
          Plan
        </button>
        <button
          type="button"
          className={`ops-step-btn ${f.status === 'in_progress' ? 'current' : ''}`}
          disabled={busy}
          onClick={() => onStatusChange(f, 'in_progress')}
        >
          Start
        </button>
        <button
          type="button"
          className={`ops-step-btn ${f.status === 'shipped' ? 'current' : ''}`}
          disabled={busy}
          onClick={() => onStatusChange(f, 'shipped')}
        >
          Ship
        </button>
      </div>

      {/* Embedded Runtime Flag Hub (only rendered if linked to an active flag) */}
      {linkedMeta && f.linkedFlagKey && (
        <div style={{ marginTop: '2px' }}>
          <div className="ops-card-flag-hub">
            <div className="ops-card-flag-info">
              <span className={`ops-card-flag-dot ${flagOn ? 'on' : 'off'}`} />
              <span style={{ fontWeight: 600 }}>{linkedMeta.label}</span>
            </div>
            <button
              type="button"
              className="ops-relay"
              data-on={flagOn}
              aria-label={`Toggle ${linkedMeta.label}`}
              onClick={() => onToggleFlag(f.linkedFlagKey as FeatureFlagKey, !flagOn)}
            >
              <span className="ops-puck" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
