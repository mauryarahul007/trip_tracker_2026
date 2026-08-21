import { useMemo, useState } from 'react';
import type { Trip } from '../../types';
import type { AdminUserRow, AuditLogEntry } from '../../types/admin';
import { purgeAuditLogsOlderThan } from '../../services/tripApi';
import { IconCheck, IconSearch } from '../Icons';

interface Props {
  logs: AuditLogEntry[];
  trips: Trip[];
  users: AdminUserRow[];
  onLogsChanged: () => void;
}

const ACTION_LABELS: Record<string, string> = {
  user_suspended: 'User Suspended',
  user_restored: 'User Restored',
  broadcast_notification: 'Broadcast Sent',
  purge_recycle_bin: 'Recycle Bin Purged',
  set_app_config: 'Config Changed',
};

export function AdminAuditPage({ logs, trips, users, onLogsChanged }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [purgeDays, setPurgeDays] = useState('90');
  const [isPurging, setIsPurging] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const tripNameById = useMemo(() => new Map(trips.map((t) => [t.id, t.name])), [trips]);
  const userById = useMemo(() => new Map(users.map((u) => [u.id, u.displayName || u.email])), [users]);

  const filteredLogs = logs.filter((l) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const actorName = (l.actorUserId && userById.get(l.actorUserId)) || '';
    const tripName = (l.tripId && tripNameById.get(l.tripId)) || '';
    return l.action.toLowerCase().includes(q) || actorName.toLowerCase().includes(q) || tripName.toLowerCase().includes(q);
  });

  const handlePurge = async () => {
    const days = Number(purgeDays) || 90;
    if (!window.confirm(`Permanently delete every audit log entry older than ${days} days? This cannot be undone.`)) return;
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
  };

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      <div className="ops-page-head">
        <div>
          <h2>Security Audit Log</h2>
          <p>Every superadmin action that touches user access or fleet config — suspensions, broadcasts, purges, config changes.</p>
        </div>
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
                {filteredLogs.map((l) => (
                  <tr key={l.id}>
                    <td data-label="Time" style={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{new Date(l.createdAt).toLocaleString()}</td>
                    <td data-label="Action">{ACTION_LABELS[l.action] || l.action}</td>
                    <td data-label="Actor">{(l.actorUserId && userById.get(l.actorUserId)) || l.actorUserId || '—'}</td>
                    <td data-label="Trip">{(l.tripId && tripNameById.get(l.tripId)) || (l.tripId ? l.tripId : '—')}</td>
                    <td data-label="Details" style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--text-tertiary)', maxWidth: '260px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {l.details ? JSON.stringify(l.details) : ''}
                    </td>
                  </tr>
                ))}
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
