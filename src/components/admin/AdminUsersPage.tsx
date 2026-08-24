import { useState } from 'react';
import type { Trip } from '../../types';
import type { AdminUserRow } from '../../types/admin';
import { setUserBanned, deleteUserAccount, broadcastNotification } from '../../services/tripApi';
import { IconSearch, IconCheck, IconAlertCircle, IconRefresh } from '../Icons';

interface Props {
  users: AdminUserRow[];
  trips: Trip[];
  superadminIds: string[];
  onUsersChanged: () => void;
  onRefresh: () => void | Promise<void>;
  isRefreshing: boolean;
}

export function AdminUsersPage({ users, trips, superadminIds, onUsersChanged, onRefresh, isRefreshing }: Props) {
  const superadminIdSet = new Set(superadminIds);
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMsg, setToastMsg] = useState('');
  const [busyUserId, setBusyUserId] = useState<string | null>(null);

  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastBody, setBroadcastBody] = useState('');
  const [broadcastTripId, setBroadcastTripId] = useState('');
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const filteredUsers = users.filter(
    (u) =>
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.displayName || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleToggleBan = async (user: AdminUserRow) => {
    const nextBanned = !user.banned;
    if (nextBanned && !window.confirm(`Suspend ${user.email}? They will lose access to every trip immediately.`)) {
      return;
    }
    setBusyUserId(user.id);
    try {
      await setUserBanned(user.id, nextBanned);
      showToast(nextBanned ? `Suspended ${user.email}` : `Restored ${user.email}`);
      onUsersChanged();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update user.');
    } finally {
      setBusyUserId(null);
    }
  };

  const handleDeleteUser = async (user: AdminUserRow) => {
    const typed = window.prompt(
      `This permanently deletes ${user.email} and every trip they own. This cannot be undone.\n\nType DELETE to confirm.`
    );
    if (typed !== 'DELETE') return;
    setBusyUserId(user.id);
    try {
      await deleteUserAccount(user.id);
      showToast(`Deleted ${user.email}`);
      onUsersChanged();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to delete user.');
    } finally {
      setBusyUserId(null);
    }
  };

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle.trim() || !broadcastBody.trim()) return;
    setIsBroadcasting(true);
    try {
      const count = await broadcastNotification(broadcastTitle.trim(), broadcastBody.trim(), broadcastTripId || null);
      showToast(`Sent to ${count} recipient${count === 1 ? '' : 's'}.`);
      setBroadcastTitle('');
      setBroadcastBody('');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Broadcast failed.');
    } finally {
      setIsBroadcasting(false);
    }
  };

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      <div className="ops-page-head">
        <div>
          <h2>User Directory</h2>
          <p>Every account across the fleet. Suspend an account to lock it out of every trip immediately.</p>
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

      <div className="ops-card">
        <h3 className="ops-section-title">Broadcast Notification</h3>
        <p className="ops-section-sub">Send an announcement to every user, or scope it to one trip's members.</p>
        <form onSubmit={handleBroadcast} style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '480px' }}>
          <input
            type="text"
            className="ops-input"
            placeholder="Title"
            maxLength={100}
            value={broadcastTitle}
            onChange={(e) => setBroadcastTitle(e.target.value)}
            required
          />
          <textarea
            className="ops-input"
            rows={2}
            placeholder="Message"
            maxLength={400}
            value={broadcastBody}
            onChange={(e) => setBroadcastBody(e.target.value)}
            required
          />
          <select className="ops-select" value={broadcastTripId} onChange={(e) => setBroadcastTripId(e.target.value)}>
            <option value="">Everyone (all trips)</option>
            {trips.map((t) => (
              <option key={t.id} value={t.id}>
                Only: {t.name}
              </option>
            ))}
          </select>
          <button type="submit" className="ops-btn ops-btn-primary" style={{ alignSelf: 'flex-start' }} disabled={isBroadcasting}>
            {isBroadcasting ? 'Sending...' : 'Send Broadcast'}
          </button>
        </form>
      </div>

      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="ops-search-wrap">
          <IconSearch size={16} />
          <input
            type="text"
            className="ops-input"
            placeholder="Search users by email or name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="ops-card" style={{ padding: '6px 0' }}>
        <div style={{ overflowX: 'auto' }}>
          {filteredUsers.length === 0 ? (
            <div className="ops-empty" style={{ padding: '32px' }}>No users found.</div>
          ) : (
            <table className="ops-manifest">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Joined</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => {
                  const isSuperadmin = superadminIdSet.has(u.id);
                  return (
                    <tr key={u.id}>
                      <td data-label="">
                        <div className="ops-trip-name">
                          {u.displayName || u.email}
                          {isSuperadmin && <span className="ops-badge archived" style={{ marginLeft: '8px' }}>Superadmin</span>}
                        </div>
                        <div className="ops-trip-route">{u.email}</div>
                      </td>
                      <td data-label="Joined">{new Date(u.createdAt).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric' })}</td>
                      <td data-label="Status">
                        <span className={`ops-badge ${u.banned ? 'grounded' : 'active'}`}>
                          {u.banned ? 'Suspended' : 'Active'}
                        </span>
                      </td>
                      <td data-label="">
                        <div className="ops-manifest-actions">
                          <button
                            type="button"
                            className={`ops-mini-btn${u.banned ? '' : ' ground'}`}
                            disabled={busyUserId === u.id || isSuperadmin}
                            title={isSuperadmin ? 'Superadmin accounts cannot be suspended' : undefined}
                            onClick={() => handleToggleBan(u)}
                          >
                            {u.banned ? 'Restore' : 'Suspend'}
                          </button>
                          <button
                            type="button"
                            className="ops-mini-btn ground"
                            disabled={busyUserId === u.id || isSuperadmin}
                            title={isSuperadmin ? 'Superadmin accounts cannot be deleted' : undefined}
                            onClick={() => void handleDeleteUser(u)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="ops-notice">
        <IconAlertCircle size={14} /> Suspension is enforced at the database level — a suspended account loses read and write access to every trip on its next request, even mid-session. Superadmin accounts cannot be suspended.
      </div>
    </div>
  );
}
