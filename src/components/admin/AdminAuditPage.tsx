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

const ACTION_LABELS: Record<string, string> = {
  user_suspended: 'User Suspended',
  user_restored: 'User Restored',
  broadcast_notification: 'Broadcast Sent',
  purge_recycle_bin: 'Recycle Bin Purged',
  purge_audit_logs: 'Audit Log Purged',
  set_app_config: 'Config Changed',
  delete_trip: 'Trip Deleted',
  archive_trip: 'Trip Archived',
  restore_trip: 'Trip Restored',
  ground_trip: 'Trip Grounded',
  unground_trip: 'Trip Ungrounded',
};

// Destructive actions read as danger, config/state changes as caution, and
// everything else (broadcasts, restores) stays neutral — so scanning a long
// log for "who deleted what" doesn't require reading every row.
function actionTone(action: string): 'danger' | 'caution' | 'neutral' {
  if (/delete|purge|suspend|remove|ban/i.test(action)) return 'danger';
  if (/config|flag|ground|archive|change/i.test(action)) return 'caution';
  return 'neutral';
}

const ACTION_TYPE_FILTERS = [
  { value: 'all', label: 'All actions' },
  { value: 'danger', label: 'Destructive' },
  { value: 'caution', label: 'Config change' },
] as const;

export function AdminAuditPage({ logs, trips, users, onLogsChanged, onRefresh, isRefreshing, onRequestConfirm }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [actionTypeFilter, setActionTypeFilter] = useState<(typeof ACTION_TYPE_FILTERS)[number]['value']>('all');
  const [actorFilter, setActorFilter] = useState<string>('all');
  const [purgeDays, setPurgeDays] = useState('90');
  const [isPurging, setIsPurging] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const tripNameById = useMemo(() => new Map(trips.map((t) => [t.id, t.name])), [trips]);
  const userById = useMemo(() => new Map(users.map((u) => [u.id, u.displayName || u.email])), [users]);

  // Top actors in the current log, for the actor filter row — computed from
  // the data itself rather than a hardcoded list.
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
    if (actionTypeFilter !== 'all' && actionTone(l.action) !== actionTypeFilter) return false;
    if (actorFilter !== 'all' && l.actorUserId !== actorFilter) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const actorName = (l.actorUserId && userById.get(l.actorUserId)) || '';
    const tripName = (l.tripId && tripNameById.get(l.tripId)) || '';
    return l.action.toLowerCase().includes(q) || actorName.toLowerCase().includes(q) || tripName.toLowerCase().includes(q);
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
          <h2>Security Audit Log</h2>
          <p>Every superadmin action that touches user access or fleet config — suspensions, broadcasts, purges, config changes.</p>
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
              placeholder="Search by action, actor, or trip..."
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

      <div className="ops-card" style={{ padding: '6px 0' }}>
        <div style={{ overflowX: 'auto' }}>
          {filteredLogs.length === 0 ? (
            <div className="ops-empty" style={{ padding: '32px' }}>
              {logs.length === 0 ? 'No audit events recorded yet.' : 'No events match your search.'}
            </div>
          ) : (
            <table className="ops-manifest">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Action</th>
                  <th>Actor</th>
                  <th>Trip</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((l) => {
                  const tone = actionTone(l.action);
                  return (
                  <tr key={l.id}>
                    <td data-label="Time" style={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }} title={new Date(l.createdAt).toLocaleString()}>
                      {formatRelativeTime(l.createdAt)}
                    </td>
                    <td data-label="Action">
                      <span className={`ops-badge ${tone === 'danger' ? 'grounded' : tone === 'caution' ? 'caution' : 'archived'}`}>
                        {ACTION_LABELS[l.action] || l.action}
                      </span>
                    </td>
                    <td data-label="Actor">{(l.actorUserId && userById.get(l.actorUserId)) || l.actorUserId || '—'}</td>
                    <td data-label="Trip">{(l.tripId && tripNameById.get(l.tripId)) || (l.tripId ? l.tripId : '—')}</td>
                    <td data-label="Details" style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--text-tertiary)', maxWidth: '260px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {l.details ? JSON.stringify(l.details) : ''}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <p style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
        Auto-purges nightly on the retention window set in Flags → Fleet Controls (default 90 days). Showing the {logs.length} most recent entries.
      </p>
    </div>
  );
}
