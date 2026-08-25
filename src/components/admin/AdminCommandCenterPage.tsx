import { useMemo } from 'react';
import type { Trip } from '../../types';
import type { AdminUserRow, AuditLogEntry } from '../../types/admin';
import type { BugRecord } from '../../services/bugApi';
import type { FeatureRecord } from '../../services/featureApi';
import { formatRelativeTime } from '../../utils/relativeTime';
import { IconRefresh } from '../Icons';
import type { AdminTab } from './AdminPortalLayout';

interface Props {
  trips: Trip[];
  bugs: BugRecord[];
  features: FeatureRecord[];
  users: AdminUserRow[];
  auditLogs: AuditLogEntry[];
  health: { ok: boolean; label: string };
  onNavigate: (tab: AdminTab) => void;
  onOpenBugTracker?: () => void;
  onRefresh: () => void | Promise<void>;
  isRefreshing: boolean;
}

function humanizeAction(action: string): string {
  return action.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
}

export function AdminCommandCenterPage({ trips, bugs, features, users, auditLogs, health, onNavigate, onOpenBugTracker, onRefresh, isRefreshing }: Props) {
  const activeTrips = trips.filter((t) => !t.archived);
  const groundedTrips = trips.filter((t) => t.frozen);

  const openBugs = useMemo(() => bugs.filter((b) => b.status === 'open' || b.status === 'in_progress'), [bugs]);
  const criticalBugs = useMemo(
    () => bugs.filter((b) => b.severity === 'critical' && b.status !== 'resolved' && b.status !== 'wont_fix'),
    [bugs]
  );
  const activeFeatureRequests = useMemo(
    () => features.filter((f) => f.status === 'requested' || f.status === 'planned' || f.status === 'in_progress'),
    [features]
  );

  const needsAttention = useMemo(() => {
    type Item = { key: string; severity: 'crit' | 'warn'; title: string; meta: string; onOpen: () => void };
    const items: Item[] = [];
    criticalBugs.slice(0, 4).forEach((b) =>
      items.push({
        key: `bug-${b.id}`,
        severity: 'crit',
        title: `${b.id} — ${b.title}`,
        meta: `Critical · ${b.category} · open ${formatRelativeTime(b.createdAt)}`,
        onOpen: () => onOpenBugTracker?.(),
      })
    );
    groundedTrips.slice(0, 4).forEach((t) =>
      items.push({
        key: `trip-${t.id}`,
        severity: 'warn',
        title: `${t.name} is grounded`,
        meta: 'Trips · modifications stopped',
        onOpen: () => onNavigate('trips'),
      })
    );
    return items;
  }, [criticalBugs, groundedTrips, onOpenBugTracker, onNavigate]);

  const recentActivity = useMemo(() => auditLogs.slice(0, 6), [auditLogs]);
  const userNameById = useMemo(() => new Map(users.map((u) => [u.id, u.displayName || u.email])), [users]);
  const tripNameById = useMemo(() => new Map(trips.map((t) => [t.id, t.name])), [trips]);

  const handleExportBugs = () => {
    const blob = new Blob([JSON.stringify(bugs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trip-tracker-bugs-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div className="ops-page-head">
        <div>
          <h2>Command Center</h2>
          <p>Everything that needs your eyes today, in one screen — before you drop into a section.</p>
        </div>
        <button type="button" className="ops-btn" disabled={isRefreshing} onClick={() => void onRefresh()}>
          <IconRefresh size={13} className={isRefreshing ? 'icon-sm ops-spin' : 'icon-sm'} /> {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      <div className="ops-kpi-row">
        <div className="ops-card ops-kpi-card">
          <div className="ops-kpi-label">Active Trips</div>
          <div className="ops-kpi-value">{activeTrips.length}</div>
          <div className="ops-kpi-delta">{groundedTrips.length} grounded</div>
        </div>
        <div className="ops-card ops-kpi-card">
          <div className="ops-kpi-label">Travelers</div>
          <div className="ops-kpi-value">{users.length}</div>
          <div className="ops-kpi-delta">registered accounts</div>
        </div>
        <div className="ops-card ops-kpi-card">
          <div className="ops-kpi-label">Open Bug Cases</div>
          <div className="ops-kpi-value" style={{ color: criticalBugs.length > 0 ? 'var(--danger)' : undefined }}>{openBugs.length}</div>
          <div className="ops-kpi-delta">{criticalBugs.length} critical</div>
        </div>
        <div className="ops-card ops-kpi-card">
          <div className="ops-kpi-label">Feature Requests</div>
          <div className="ops-kpi-value" style={{ color: 'var(--amber)' }}>{activeFeatureRequests.length}</div>
          <div className="ops-kpi-delta">requested, planned or in progress</div>
        </div>
      </div>

      <div className="ops-split-row">
        <div className="ops-card">
          <h3 className="ops-section-title">Needs attention</h3>
          <p className="ops-section-sub">Pulled live from the Bug Ledger and Trips — nothing here is manually curated.</p>
          {needsAttention.length === 0 ? (
            <div className="ops-empty">Nothing needs attention right now.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {needsAttention.map((item) => (
                <div className="ops-attn-row" key={item.key}>
                  <div className={`ops-attn-stripe ${item.severity}`} />
                  <div className="body">
                    <div>
                      <h4>{item.title}</h4>
                      <p>{item.meta}</p>
                    </div>
                    <button type="button" className="ops-btn" onClick={item.onOpen}>
                      Open
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="ops-card">
          <h3 className="ops-section-title">Recent activity</h3>
          <p className="ops-section-sub">Live tail of the Audit log.</p>
          {recentActivity.length === 0 ? (
            <div className="ops-empty">No audit events recorded yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {recentActivity.map((l) => (
                <div key={l.id} style={{ fontSize: '11.5px', color: 'var(--text-secondary)', display: 'flex', gap: '8px' }}>
                  <code className="ops-flag-key" title={new Date(l.createdAt).toLocaleString()} style={{ flexShrink: 0 }}>
                    {formatRelativeTime(l.createdAt)}
                  </code>
                  <span>
                    {(l.actorUserId && userNameById.get(l.actorUserId)) || 'System'} &middot; {humanizeAction(l.action)}
                    {l.tripId && tripNameById.get(l.tripId) ? ` · ${tripNameById.get(l.tripId)}` : ''}
                  </span>
                </div>
              ))}
            </div>
          )}
          <button type="button" className="ops-btn" style={{ width: '100%', justifyContent: 'center', marginTop: '12px' }} onClick={() => onNavigate('audit')}>
            View full audit log
          </button>
        </div>
      </div>

      <div className="ops-card">
        <h3 className="ops-section-title">Quick actions</h3>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '10px' }}>
          <button type="button" className="ops-btn" onClick={() => onNavigate('users')}>
            Broadcast notification
          </button>
          <button type="button" className="ops-btn" onClick={handleExportBugs}>
            Export bug ledger
          </button>
          <button type="button" className="ops-btn" disabled={isRefreshing} onClick={() => void onRefresh()}>
            {isRefreshing ? 'Refreshing...' : 'Refresh all data'}
          </button>
        </div>
      </div>

      {!health.ok && (
        <div className="ops-notice" style={{ background: 'var(--warning-dim)', borderColor: 'var(--warning-line)' }}>
          <strong style={{ color: 'var(--warning)' }}>Heads up:</strong> {health.label}. Check the Bug Ledger and Trips sections above.
        </div>
      )}
    </div>
  );
}
