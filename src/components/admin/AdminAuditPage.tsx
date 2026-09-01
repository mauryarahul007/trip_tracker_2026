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
): { title: string; subtitle: string; tag: string; tagClass: string; resourceLabel?: string } {
  const actor = (log.actorUserId && userById.get(log.actorUserId)) || log.actorUserId || 'Superadmin';
  const tripName = (log.tripId && tripNameById.get(log.tripId)) || '';
  const details = (typeof log.details === 'object' && log.details !== null ? log.details : {}) as Record<string, any>;
  const resolvedTripName = tripName || details.tripName || (log.tripId ? `Trip ${log.tripId.slice(0, 8)}` : '');

  let title = '';
  let subtitle = '';
  let tag = 'Activity';
  let tagClass = 'archived';
  let resourceLabel = resolvedTripName ? `Trip: ${resolvedTripName}` : undefined;

  switch (log.action) {
    case 'user_suspended':
      title = `${actor} suspended user account`;
      subtitle = details.targetEmail || details.userId ? `Blocked sign-in and app access for ${details.targetEmail || details.userId}` : 'Suspended user account';
      tag = 'User Security';
      tagClass = 'grounded';
      resourceLabel = details.targetEmail ? `User: ${details.targetEmail}` : undefined;
      break;

    case 'user_restored':
      title = `${actor} restored user account`;
      subtitle = details.targetEmail || details.userId ? `Restored login access for ${details.targetEmail || details.userId}` : 'Restored user access';
      tag = 'User Access';
      tagClass = 'safe';
      resourceLabel = details.targetEmail ? `User: ${details.targetEmail}` : undefined;
      break;

    case 'broadcast_notification':
      title = `${actor} dispatched a global broadcast notification`;
      subtitle = details.message || details.title ? `"${details.title ? details.title + ': ' : ''}${details.message || ''}"` : 'Dispatched broadcast alert to all fleet users';
      tag = 'Broadcast';
      tagClass = 'caution';
      break;

    case 'ground_trip':
      title = `${actor} grounded trip "${resolvedTripName || 'Trip'}"`;
      subtitle = 'Emergency kill-switch enabled — all expense and member modifications locked';
      tag = 'Trip Grounded';
      tagClass = 'grounded';
      break;

    case 'unground_trip':
      title = `${actor} lifted ground lock on trip "${resolvedTripName || 'Trip'}"`;
      subtitle = 'Normal traveler access and write operations resumed';
      tag = 'Trip Resumed';
      tagClass = 'safe';
      break;

    case 'archive_trip':
      title = `${actor} archived trip "${resolvedTripName || 'Trip'}"`;
      subtitle = 'Moved trip to archived status';
      tag = 'Trip Archive';
      tagClass = 'archived';
      break;

    case 'restore_trip':
      title = `${actor} unarchived trip "${resolvedTripName || 'Trip'}"`;
      subtitle = 'Restored trip to active fleet list';
      tag = 'Trip Active';
      tagClass = 'safe';
      break;

    case 'delete_trip':
      title = `${actor} permanently deleted trip "${resolvedTripName || 'Trip'}"`;
      subtitle = 'Permanently removed trip records and associated expense graph from database';
      tag = 'Destructive';
      tagClass = 'grounded';
      break;

    case 'purge_recycle_bin':
      title = `${actor} forced a global Recycle Bin purge`;
      subtitle = details.purgedCount ? `Purged ${details.purgedCount} soft-deleted expenses older than ${details.days || 30} days` : `Purged deleted expenses older than ${details.days || 30} days across fleet`;
      tag = 'Data Purge';
      tagClass = 'grounded';
      break;

    case 'purge_audit_logs':
      title = `${actor} purged security audit logs`;
      subtitle = details.purgedCount ? `Permanently removed ${details.purgedCount} audit records older than ${details.days || 90} days` : `Purged records older than ${details.days || 90} days`;
      tag = 'Audit Purge';
      tagClass = 'grounded';
      break;

    case 'set_app_config':
      title = `${actor} modified system configuration`;
      subtitle = details.key ? `Set configuration "${details.key}" = "${typeof details.value === 'object' ? JSON.stringify(details.value) : details.value}"` : 'Updated global system parameters';
      tag = 'System Config';
      tagClass = 'caution';
      resourceLabel = details.key ? `Key: ${details.key}` : undefined;
      break;

    case 'set_feature_flag':
    case 'override_feature_flag':
      title = `${actor} changed feature flag setting`;
      subtitle = details.flagKey ? `Flag "${details.flagKey}" set to ${details.enabled ? 'Enabled' : 'Disabled'}${details.scope ? ` (${details.scope} scope)` : ''}` : 'Updated feature flag settings';
      tag = 'Feature Flags';
      tagClass = 'caution';
      resourceLabel = details.flagKey ? `Flag: ${details.flagKey}` : undefined;
      break;

    case 'feature_status_change':
      title = `${actor} updated feature case ${details.featureId || ''}`;
      subtitle = `Changed status to "${details.status || 'Updated'}"`;
      tag = 'Roadmap';
      tagClass = 'safe';
      resourceLabel = details.featureId ? `Case: ${details.featureId}` : undefined;
      break;

    case 'feature_link_flag':
      title = `${actor} linked feature case ${details.featureId || ''}`;
      subtitle = details.flagKey ? `Linked to toggleable flag "${details.flagKey}"` : 'Unlinked toggleable flag';
      tag = 'Roadmap';
      tagClass = 'safe';
      resourceLabel = details.featureId ? `Case: ${details.featureId}` : undefined;
      break;

    default:
      title = `${actor} performed ${log.action.replace(/_/g, ' ')}`;
      subtitle = Object.keys(details).length > 0 ? Object.entries(details).map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`).join(' · ') : 'Superadmin operation executed';
      tag = /delete|purge|suspend|ban/i.test(log.action) ? 'Security' : /config|flag|ground/i.test(log.action) ? 'Config' : 'Activity';
      tagClass = /delete|purge|suspend|ban/i.test(log.action) ? 'grounded' : /config|flag|ground/i.test(log.action) ? 'caution' : 'archived';
  }

  return { title, subtitle, tag, tagClass, resourceLabel };
}

const ACTION_TYPE_FILTERS = [
  { value: 'all', label: 'All actions' },
  { value: 'danger', label: 'Destructive / Security' },
  { value: 'caution', label: 'Config / Flags' },
] as const;

export function AdminAuditPage({ logs, trips, users, onLogsChanged, onRefresh, isRefreshing, onRequestConfirm }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [actionTypeFilter, setActionTypeFilter] = useState<(typeof ACTION_TYPE_FILTERS)[number]['value']>('all');
  const [actorFilter, setActorFilter] = useState<string>('all');
  const [purgeDays, setPurgeDays] = useState('90');
  const [isPurging, setIsPurging] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [expandedLogIds, setExpandedLogIds] = useState<Set<string>>(new Set());

  const toggleRaw = (id: string) => {
    setExpandedLogIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
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
      .slice(0, 5)
      .map(([id]) => id);
  }, [logs]);

  const filteredLogs = logs.filter((l) => {
    const isDanger = /delete|purge|suspend|ban/i.test(l.action);
    const isCaution = /config|flag|ground|archive/i.test(l.action);
    if (actionTypeFilter === 'danger' && !isDanger) return false;
    if (actionTypeFilter === 'caution' && !isCaution) return false;
    if (actorFilter !== 'all' && l.actorUserId !== actorFilter) return false;
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
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      <div className="ops-page-head">
        <div>
          <h2>Security &amp; Operations Audit Log</h2>
          <p>Every administrative action and security event translated into readable chronological stories.</p>
        </div>
        <button type="button" className="ops-btn" disabled={isRefreshing} onClick={() => void onRefresh()}>
          <IconRefresh size={13} className={isRefreshing ? 'icon-sm ops-spin' : 'icon-sm'} /> {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {toastMsg && (
        <div className="ops-toast">
          <IconCheck size={14} /> {toastMsg}
        </div>
      )}

      <div className="ops-sticky-toolbar">
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="ops-search-wrap">
            <IconSearch size={16} />
            <input
              type="text"
              className="ops-input"
              placeholder="Search actions, stories, users, or trips..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="number"
              min={1}
              className="ops-input"
              style={{ width: '80px' }}
              value={purgeDays}
              onChange={(e) => setPurgeDays(e.target.value)}
            />
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>days</span>
            <button type="button" className="ops-btn ops-btn-danger" disabled={isPurging} onClick={handlePurge}>
              {isPurging ? 'Purging...' : 'Purge Older Than'}
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
          {ACTION_TYPE_FILTERS.map((f) => (
            <button key={f.value} type="button" className="ops-chip" data-active={actionTypeFilter === f.value} onClick={() => setActionTypeFilter(f.value)}>
              {f.label}
            </button>
          ))}
          {topActors.length > 0 && (
            <>
              <span style={{ width: '1px', background: 'var(--line)', margin: '0 2px' }} />
              <button type="button" className="ops-chip" data-active={actorFilter === 'all'} onClick={() => setActorFilter('all')}>
                All actors
              </button>
              {topActors.map((id) => (
                <button key={id} type="button" className="ops-chip" data-active={actorFilter === id} onClick={() => setActorFilter(id)}>
                  {userById.get(id) || id}
                </button>
              ))}
            </>
          )}
        </div>
      </div>

      <div className="ops-card" style={{ padding: 0, overflow: 'hidden' }}>
        {filteredLogs.length === 0 ? (
          <div className="ops-empty" style={{ padding: '36px' }}>
            {logs.length === 0 ? 'No audit events recorded yet.' : 'No events match your search filters.'}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {filteredLogs.map((l) => {
              const narrative = formatAuditNarrative(l, tripNameById, userById);
              const isRawExpanded = expandedLogIds.has(l.id);
              return (
                <div key={l.id} className="ops-audit-row">
                  <div className="ops-audit-head">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span className={`ops-badge ${narrative.tagClass}`}>
                        {narrative.tag}
                      </span>
                      <span className="ops-audit-narrative">{narrative.title}</span>
                    </div>
                    <div className="ops-audit-meta">
                      <span title={new Date(l.createdAt).toLocaleString()} style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {formatRelativeTime(l.createdAt)}
                      </span>
                      {narrative.resourceLabel && (
                        <span className="ops-flag-key" style={{ fontSize: '10.5px' }}>
                          {narrative.resourceLabel}
                        </span>
                      )}
                      <button
                        type="button"
                        className="ops-audit-json-btn"
                        onClick={() => toggleRaw(l.id)}
                        title="Toggle raw audit payload"
                      >
                        {isRawExpanded ? 'Hide Payload' : 'Payload'}
                      </button>
                    </div>
                  </div>
                  <div className="ops-audit-sub">{narrative.subtitle}</div>
                  {isRawExpanded && (
                    <pre className="ops-audit-raw-box">
                      {JSON.stringify({ action: l.action, actorUserId: l.actorUserId, tripId: l.tripId, details: l.details, timestamp: l.createdAt }, null, 2)}
                    </pre>
                  )}
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
