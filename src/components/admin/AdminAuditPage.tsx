import { useMemo, useState } from 'react';
import type { Trip } from '../../types';
import type { AdminUserRow, AuditLogEntry } from '../../types/admin';
import { purgeAuditLogsOlderThan } from '../../services/tripApi';
import { formatRelativeTime } from '../../utils/relativeTime';
import { IconCheck, IconSearch, IconRefresh } from '../Icons';
import type { ConfirmRequest } from '../ConfirmDialog';

interface Props {
  logs: AuditLogEntry[];
  trips: Trip[];
  users: AdminUserRow[];
  onLogsChanged: () => void;
  onRefresh: () => void | Promise<void>;
  isRefreshing: boolean;
  onRequestConfirm: (req: ConfirmRequest) => void;
}

export function formatAuditNarrative(
  log: AuditLogEntry,
  tripNameById: Map<string, string>,
  userById: Map<string, string>
): { title: string; subtitle: string; tag: string; tagClass: string; nodeClass: string; icon: string; resourceLabel?: string } {
  const actor = (log.actorUserId && userById.get(log.actorUserId)) || log.actorUserId || 'Superadmin';
  const tripName = (log.tripId && tripNameById.get(log.tripId)) || '';
  const details = (typeof log.details === 'object' && log.details !== null ? log.details : {}) as Record<string, any>;
  const resolvedTripName = tripName || details.tripName || (log.tripId ? `Trip ${log.tripId.slice(0, 8)}` : '');

  let title = '';
  let subtitle = '';
  let tag = 'Activity';
  let tagClass = 'archived';
  let nodeClass = 'node-info';
  let icon = '⚡';
  let resourceLabel = resolvedTripName ? `Trip: ${resolvedTripName}` : undefined;

  switch (log.action) {
    case 'user_suspended':
      title = `${actor} suspended user account`;
      subtitle = details.targetEmail || details.userId ? `Blocked sign-in and app access for ${details.targetEmail || details.userId}` : 'Suspended user account';
      tag = 'User Security';
      tagClass = 'grounded';
      nodeClass = 'node-danger';
      icon = '🚫';
      resourceLabel = details.targetEmail ? `User: ${details.targetEmail}` : undefined;
      break;

    case 'user_restored':
      title = `${actor} restored user account`;
      subtitle = details.targetEmail || details.userId ? `Restored login access for ${details.targetEmail || details.userId}` : 'Restored user access';
      tag = 'User Access';
      tagClass = 'safe';
      nodeClass = 'node-safe';
      icon = '🛡️';
      resourceLabel = details.targetEmail ? `User: ${details.targetEmail}` : undefined;
      break;

    case 'broadcast_notification':
      title = `${actor} dispatched a global broadcast notification`;
      subtitle = details.message || details.title ? `"${details.title ? details.title + ': ' : ''}${details.message || ''}"` : 'Dispatched broadcast alert to all fleet users';
      tag = 'Broadcast';
      tagClass = 'caution';
      nodeClass = 'node-purple';
      icon = '📢';
      break;

    case 'ground_trip':
      title = `${actor} grounded trip "${resolvedTripName || 'Trip'}"`;
      subtitle = 'Emergency kill-switch enabled — all expense and member modifications locked';
      tag = 'Trip Grounded';
      tagClass = 'grounded';
      nodeClass = 'node-danger';
      icon = '🛑';
      break;

    case 'unground_trip':
      title = `${actor} lifted ground lock on trip "${resolvedTripName || 'Trip'}"`;
      subtitle = 'Normal traveler access and write operations resumed';
      tag = 'Trip Resumed';
      tagClass = 'safe';
      nodeClass = 'node-safe';
      icon = '✈️';
      break;

    case 'archive_trip':
      title = `${actor} archived trip "${resolvedTripName || 'Trip'}"`;
      subtitle = 'Moved trip to archived status';
      tag = 'Trip Archive';
      tagClass = 'archived';
      nodeClass = 'node-info';
      icon = '📦';
      break;

    case 'restore_trip':
      title = `${actor} unarchived trip "${resolvedTripName || 'Trip'}"`;
      subtitle = 'Restored trip to active fleet list';
      tag = 'Trip Active';
      tagClass = 'safe';
      nodeClass = 'node-safe';
      icon = '✨';
      break;

    case 'delete_trip':
      title = `${actor} permanently deleted trip "${resolvedTripName || 'Trip'}"`;
      subtitle = 'Permanently removed trip records and associated expense graph from database';
      tag = 'Destructive';
      tagClass = 'grounded';
      nodeClass = 'node-danger';
      icon = '🗑️';
      break;

    case 'purge_recycle_bin':
      title = `${actor} forced a global Recycle Bin purge`;
      subtitle = details.purgedCount ? `Purged ${details.purgedCount} soft-deleted expenses older than ${details.days || 30} days` : `Purged deleted expenses older than ${details.days || 30} days across fleet`;
      tag = 'Data Purge';
      tagClass = 'grounded';
      nodeClass = 'node-danger';
      icon = '🧹';
      break;

    case 'purge_audit_logs':
      title = `${actor} purged security audit logs`;
      subtitle = details.purgedCount ? `Permanently removed ${details.purgedCount} audit records older than ${details.days || 90} days` : `Purged records older than ${details.days || 90} days`;
      tag = 'Audit Purge';
      tagClass = 'grounded';
      nodeClass = 'node-danger';
      icon = '📜';
      break;

    case 'set_app_config':
      title = `${actor} modified system configuration`;
      subtitle = details.key ? `Set configuration "${details.key}" = "${typeof details.value === 'object' ? JSON.stringify(details.value) : details.value}"` : 'Updated global system parameters';
      tag = 'System Config';
      tagClass = 'caution';
      nodeClass = 'node-caution';
      icon = '⚙️';
      resourceLabel = details.key ? `Key: ${details.key}` : undefined;
      break;

    case 'set_feature_flag':
    case 'override_feature_flag':
      title = `${actor} changed feature flag setting`;
      subtitle = details.flagKey ? `Flag "${details.flagKey}" set to ${details.enabled ? 'Enabled' : 'Disabled'}${details.scope ? ` (${details.scope} scope)` : ''}` : 'Updated feature flag settings';
      tag = 'Feature Flags';
      tagClass = 'caution';
      nodeClass = 'node-caution';
      icon = '🚩';
      resourceLabel = details.flagKey ? `Flag: ${details.flagKey}` : undefined;
      break;

    case 'feature_status_change':
      title = `${actor} updated feature case ${details.featureId || ''}`;
      subtitle = `Changed status to "${details.status || 'Updated'}"`;
      tag = 'Roadmap';
      tagClass = 'safe';
      nodeClass = 'node-safe';
      icon = '📋';
      resourceLabel = details.featureId ? `Case: ${details.featureId}` : undefined;
      break;

    case 'feature_link_flag':
      title = `${actor} linked feature case ${details.featureId || ''}`;
      subtitle = details.flagKey ? `Linked to toggleable flag "${details.flagKey}"` : 'Unlinked toggleable flag';
      tag = 'Roadmap';
      tagClass = 'safe';
      nodeClass = 'node-info';
      icon = '🔗';
      resourceLabel = details.featureId ? `Case: ${details.featureId}` : undefined;
      break;

    default:
      title = `${actor} performed ${log.action.replace(/_/g, ' ')}`;
      subtitle = Object.keys(details).length > 0 ? Object.entries(details).map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`).join(' · ') : 'Superadmin operation executed';
      tag = /delete|purge|suspend|ban/i.test(log.action) ? 'Security' : /config|flag|ground/i.test(log.action) ? 'Config' : 'Activity';
      tagClass = /delete|purge|suspend|ban/i.test(log.action) ? 'grounded' : /config|flag|ground/i.test(log.action) ? 'caution' : 'archived';
      nodeClass = /delete|purge|suspend|ban/i.test(log.action) ? 'node-danger' : /config|flag|ground/i.test(log.action) ? 'node-caution' : 'node-info';
      icon = /delete|purge|suspend|ban/i.test(log.action) ? '⚠️' : '⚡';
  }

  return { title, subtitle, tag, tagClass, nodeClass, icon, resourceLabel };
}

const ACTION_CATEGORY_FILTERS = [
  { value: 'all', label: 'All Categories' },
  { value: 'security', label: 'Security & Access' },
  { value: 'trip', label: 'Trip State & Locks' },
  { value: 'flag', label: 'Feature Flags & Config' },
  { value: 'broadcast', label: 'Broadcast Alerts' },
] as const;

const DATE_RANGE_FILTERS = [
  { value: 'all', label: 'All Time' },
  { value: '24h', label: 'Last 24 Hours' },
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
] as const;

export function AdminAuditPage({ logs, trips, users, onLogsChanged, onRefresh, isRefreshing, onRequestConfirm }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<(typeof ACTION_CATEGORY_FILTERS)[number]['value']>('all');
  const [dateRangeFilter, setDateRangeFilter] = useState<(typeof DATE_RANGE_FILTERS)[number]['value']>('all');
  const [actorFilter, setActorFilter] = useState<string>('all');
  const [purgeDays, setPurgeDays] = useState('90');
  const [isPurging, setIsPurging] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [expandedLogIds, setExpandedLogIds] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const toggleRaw = (id: string) => {
    setExpandedLogIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const copyPayload = (log: AuditLogEntry) => {
    const payload = JSON.stringify({ action: log.action, actorUserId: log.actorUserId, tripId: log.tripId, details: log.details, timestamp: log.createdAt }, null, 2);
    navigator.clipboard.writeText(payload);
    setCopiedId(log.id);
    showToast('Payload copied to clipboard.');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const tripNameById = useMemo(() => new Map(trips.map((t) => [t.id, t.name])), [trips]);
  const userById = useMemo(() => new Map(users.map((u) => [u.id, u.displayName || u.email])), [users]);

  const topActors = useMemo(() => {
    const counts = new Map<string, number>();
    logs.forEach((l) => {
      if (!l.actorUserId) return;
      counts.set(l.actorUserId, (counts.get(l.actorUserId) || 0) + 1);
    });
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([id]) => id);
  }, [logs]);

  // Telemetry KPIs
  const telemetry = useMemo(() => {
    const securityCount = logs.filter((l) => /delete|purge|suspend|ban/i.test(l.action)).length;
    const configCount = logs.filter((l) => /config|flag|ground|archive/i.test(l.action)).length;
    return {
      total: logs.length,
      security: securityCount,
      config: configCount,
      actorsCount: topActors.length,
    };
  }, [logs, topActors]);

  const filteredLogs = logs.filter((l) => {
    const isSecurity = /delete|purge|suspend|ban|auth/i.test(l.action);
    const isTrip = /trip|ground|archive|restore/i.test(l.action) || !!l.tripId;
    const isFlag = /flag|config|override/i.test(l.action);
    const isBroadcast = /broadcast|notify/i.test(l.action);

    if (categoryFilter === 'security' && !isSecurity) return false;
    if (categoryFilter === 'trip' && !isTrip) return false;
    if (categoryFilter === 'flag' && !isFlag) return false;
    if (categoryFilter === 'broadcast' && !isBroadcast) return false;

    if (actorFilter !== 'all' && l.actorUserId !== actorFilter) return false;

    if (dateRangeFilter !== 'all') {
      const logTime = new Date(l.createdAt).getTime();
      const now = Date.now();
      const diffHours = (now - logTime) / (1000 * 60 * 60);
      if (dateRangeFilter === '24h' && diffHours > 24) return false;
      if (dateRangeFilter === '7d' && diffHours > 24 * 7) return false;
      if (dateRangeFilter === '30d' && diffHours > 24 * 30) return false;
    }

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const actorName = (l.actorUserId && userById.get(l.actorUserId)) || '';
    const tripName = (l.tripId && tripNameById.get(l.tripId)) || '';
    const narrative = formatAuditNarrative(l, tripNameById, userById);
    return (
      l.action.toLowerCase().includes(q) ||
      actorName.toLowerCase().includes(q) ||
      tripName.toLowerCase().includes(q) ||
      narrative.title.toLowerCase().includes(q) ||
      narrative.subtitle.toLowerCase().includes(q)
    );
  });

  const handleExportCsv = () => {
    const headers = ['Timestamp (IST)', 'Event ID', 'Actor', 'Action', 'Trip ID', 'Narrative Title', 'Narrative Subtitle', 'Payload JSON'];
    const rows = filteredLogs.map((l) => {
      const actor = (l.actorUserId && userById.get(l.actorUserId)) || l.actorUserId || 'Superadmin';
      const narrative = formatAuditNarrative(l, tripNameById, userById);
      const istTime = new Date(l.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
      return [
        `"${istTime}"`,
        `"${l.id}"`,
        `"${actor}"`,
        `"${l.action}"`,
        `"${l.tripId || ''}"`,
        `"${narrative.title.replace(/"/g, '""')}"`,
        `"${narrative.subtitle.replace(/"/g, '""')}"`,
        `"${JSON.stringify(l.details || {}).replace(/"/g, '""')}"`,
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-trail-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Exported ${filteredLogs.length} audit records to CSV.`);
  };

  const handlePurge = () => {
    const days = Number(purgeDays) || 90;
    onRequestConfirm({
      title: 'Purge audit logs',
      message: `Permanently delete every audit log entry older than ${days} days? This cannot be undone.`,
      confirmLabel: 'Purge',
      danger: true,
      onConfirm: async () => {
        setIsPurging(true);
        try {
          const count = await purgeAuditLogsOlderThan(days);
          showToast(`Purged ${count} audit log entr${count === 1 ? 'y' : 'ies'}.`);
          onLogsChanged();
        } catch (err) {
          showToast(err instanceof Error ? err.message : 'Purge failed.');
        } finally {
          setIsPurging(false);
        }
      },
    });
  };

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div className="ops-page-head">
        <div>
          <h2>Security &amp; Operations Audit Log</h2>
          <p>Real-time chronological telemetry of all administrative and security actions taken across the fleet.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button type="button" className="ops-btn" onClick={handleExportCsv}>
            Export CSV
          </button>
          <button type="button" className="ops-btn" disabled={isRefreshing} onClick={() => void onRefresh()}>
            <IconRefresh size={13} className={isRefreshing ? 'icon-sm ops-spin' : 'icon-sm'} /> {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {toastMsg && (
        <div className="ops-toast">
          <IconCheck size={14} /> {toastMsg}
        </div>
      )}

      {/* Executive Telemetry KPI Ribbon */}
      <div className="ops-audit-kpi-grid">
        <div className="ops-card ops-kpi-card">
          <div className="ops-kpi-label">Total Logged Events</div>
          <div className="ops-kpi-value">{telemetry.total}</div>
          <div className="ops-kpi-delta">Recorded operations</div>
        </div>
        <div className="ops-card ops-kpi-card">
          <div className="ops-kpi-label">Security &amp; Access</div>
          <div className="ops-kpi-value" style={{ color: telemetry.security > 0 ? '#F87171' : undefined }}>{telemetry.security}</div>
          <div className="ops-kpi-delta">Bans &amp; deletions</div>
        </div>
        <div className="ops-card ops-kpi-card">
          <div className="ops-kpi-label">Config &amp; Flag Changes</div>
          <div className="ops-kpi-value" style={{ color: telemetry.config > 0 ? '#38BDF8' : undefined }}>{telemetry.config}</div>
          <div className="ops-kpi-delta">Overrides &amp; locks</div>
        </div>
        <div className="ops-card ops-kpi-card">
          <div className="ops-kpi-label">Active Administrators</div>
          <div className="ops-kpi-value" style={{ color: '#FBBF24' }}>{telemetry.actorsCount || 1}</div>
          <div className="ops-kpi-delta">Acting operators</div>
        </div>
      </div>

      {/* Multi-Filter Matrix Toolbar */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="ops-search-wrap" style={{ flex: '1 1 240px' }}>
          <IconSearch size={16} />
          <input
            type="text"
            className="ops-input"
            placeholder="Search by action, actor, trip, or narrative..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <select
            className="ops-select"
            style={{ width: 'auto', fontSize: '11.5px', padding: '6px 28px 6px 10px' }}
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as any)}
          >
            {ACTION_CATEGORY_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>

          <select
            className="ops-select"
            style={{ width: 'auto', fontSize: '11.5px', padding: '6px 28px 6px 10px' }}
            value={dateRangeFilter}
            onChange={(e) => setDateRangeFilter(e.target.value as any)}
          >
            {DATE_RANGE_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>

          {topActors.length > 0 && (
            <select
              className="ops-select"
              style={{ width: 'auto', fontSize: '11.5px', padding: '6px 28px 6px 10px' }}
              value={actorFilter}
              onChange={(e) => setActorFilter(e.target.value)}
            >
              <option value="all">All Administrators ({topActors.length})</option>
              {topActors.map((actorId) => (
                <option key={actorId} value={actorId}>
                  {userById.get(actorId) || actorId}
                </option>
              ))}
            </select>
          )}

          <div style={{ display: 'flex', gap: '4px', alignItems: 'center', marginLeft: 'auto' }}>
            <input
              type="number"
              min={1}
              className="ops-input"
              style={{ width: '65px', padding: '5px 8px', fontSize: '11.5px' }}
              value={purgeDays}
              onChange={(e) => setPurgeDays(e.target.value)}
              title="Days to retain"
            />
            <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>days</span>
            <button type="button" className="ops-btn ops-btn-danger" style={{ padding: '5px 10px' }} disabled={isPurging} onClick={handlePurge}>
              {isPurging ? 'Purging...' : 'Purge'}
            </button>
          </div>
        </div>
      </div>

      {/* Timeline Event Stream Card */}
      <div className="ops-card" style={{ padding: 0, overflow: 'hidden' }}>
        {filteredLogs.length === 0 ? (
          <div className="ops-empty" style={{ padding: '40px' }}>
            {logs.length === 0 ? 'No audit events recorded yet.' : 'No events match your current search filters.'}
          </div>
        ) : (
          <div className="ops-audit-timeline-container">
            {filteredLogs.map((l) => {
              const narrative = formatAuditNarrative(l, tripNameById, userById);
              const isRawExpanded = expandedLogIds.has(l.id);
              const actorName = (l.actorUserId && userById.get(l.actorUserId)) || l.actorUserId || 'Superadmin';
              const detailsObj = (typeof l.details === 'object' && l.details !== null ? l.details : {}) as Record<string, any>;

              return (
                <div key={l.id} className="ops-audit-timeline-item">
                  <div className={`ops-audit-icon-node ${narrative.nodeClass}`} title={narrative.tag}>
                    {narrative.icon}
                  </div>

                  <div className="ops-audit-content">
                    <div className="ops-audit-title-row">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span className={`ops-badge ${narrative.tagClass}`}>
                          {narrative.tag}
                        </span>
                        <div className="ops-audit-actor-pill">
                          <span className="ops-audit-actor-avatar">{actorName[0]?.toUpperCase() || 'S'}</span>
                          <span>{actorName}</span>
                        </div>
                        <span className="ops-audit-action-text">&middot; {narrative.title.replace(actorName, '').trim()}</span>
                      </div>

                      <div className="ops-audit-meta">
                        {narrative.resourceLabel && (
                          <span className="ops-flag-key" style={{ fontSize: '10px' }}>
                            {narrative.resourceLabel}
                          </span>
                        )}
                        <span className="ops-audit-time" title={new Date(l.createdAt).toLocaleString()}>
                          {formatRelativeTime(l.createdAt)}
                        </span>
                        <button
                          type="button"
                          className="ops-audit-json-btn"
                          onClick={() => toggleRaw(l.id)}
                          title="Inspect structured event properties"
                        >
                          {isRawExpanded ? 'Close Inspector' : 'Inspect'}
                        </button>
                      </div>
                    </div>

                    <div className="ops-audit-sub">{narrative.subtitle}</div>

                    {/* Structured Inspector Grid */}
                    {isRawExpanded && (
                      <div className="ops-inspector-card">
                        <div className="ops-inspector-header">
                          <span>Event Property Inspector</span>
                          <button
                            type="button"
                            className="ops-audit-json-btn"
                            onClick={() => copyPayload(l)}
                            style={{ margin: 0 }}
                          >
                            {copiedId === l.id ? '✓ Copied' : 'Copy JSON'}
                          </button>
                        </div>
                        <div className="ops-inspector-grid">
                          <div className="ops-inspector-cell">
                            <span className="ops-inspector-label">Event ID</span>
                            <span className="ops-inspector-val">{l.id}</span>
                          </div>
                          <div className="ops-inspector-cell">
                            <span className="ops-inspector-label">Action Code</span>
                            <span className="ops-inspector-val">{l.action}</span>
                          </div>
                          <div className="ops-inspector-cell">
                            <span className="ops-inspector-label">Actor ID</span>
                            <span className="ops-inspector-val">{l.actorUserId || 'system'}</span>
                          </div>
                          <div className="ops-inspector-cell">
                            <span className="ops-inspector-label">Trip Reference</span>
                            <span className="ops-inspector-val">{l.tripId ? (tripNameById.get(l.tripId) || l.tripId) : 'none'}</span>
                          </div>
                          <div className="ops-inspector-cell">
                            <span className="ops-inspector-label">Timestamp</span>
                            <span className="ops-inspector-val">{new Date(l.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</span>
                          </div>
                          {Object.entries(detailsObj).map(([k, v]) => (
                            <div key={k} className="ops-inspector-cell">
                              <span className="ops-inspector-label">{k}</span>
                              <span className="ops-inspector-val">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <p style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
        Auto-purges nightly on the retention window set in Flags → Fleet Controls (default 90 days). Showing the {logs.length} most recent entries.
      </p>
    </div>
  );
}
