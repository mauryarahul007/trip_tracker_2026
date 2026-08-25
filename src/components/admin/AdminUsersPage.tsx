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

const PAGE_SIZE = 25;

export function AdminUsersPage({ users, trips, superadminIds, onUsersChanged, onRefresh, isRefreshing }: Props) {
  const superadminIdSet = new Set(superadminIds);
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMsg, setToastMsg] = useState('');
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkBusy, setIsBulkBusy] = useState(false);

  const [showBroadcastDrawer, setShowBroadcastDrawer] = useState(false);
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
  const pageCount = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const pagedUsers = filteredUsers.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  const selectableIds = pagedUsers.filter((u) => !superadminIdSet.has(u.id)).map((u) => u.id);
  const allPageSelected = selectableIds.length > 0 && selectableIds.every((id) => selectedIds.has(id));

  const toggleSelectAllOnPage = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allPageSelected) {
        selectableIds.forEach((id) => next.delete(id));
      } else {
        selectableIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkBan = async (banned: boolean) => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    if (banned && !window.confirm(`Suspend ${ids.length} user${ids.length === 1 ? '' : 's'}? They lose access immediately.`)) return;
    setIsBulkBusy(true);
    try {
      await Promise.all(ids.map((id) => setUserBanned(id, banned)));
      showToast(`${banned ? 'Suspended' : 'Restored'} ${ids.length} user${ids.length === 1 ? '' : 's'}.`);
      setSelectedIds(new Set());
      onUsersChanged();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Bulk update failed.');
    } finally {
      setIsBulkBusy(false);
    }
  };

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
      setShowBroadcastDrawer(false);
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
        <div style={{ display: 'flex', gap: '8px' }}>
          <button type="button" className="ops-btn" onClick={() => setShowBroadcastDrawer(true)}>
            Broadcast
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

      {showBroadcastDrawer && (
        <div className="ops-drawer-overlay" onClick={() => setShowBroadcastDrawer(false)}>
          <div className="ops-drawer" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontFamily: 'var(--display)', fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Broadcast notification</h3>
              <button type="button" onClick={() => setShowBroadcastDrawer(false)} className="ops-btn" style={{ padding: '6px 10px' }}>
                Close
              </button>
            </div>
            <p className="ops-section-sub">Send an announcement to every user, or scope it to one trip's members.</p>
            <form onSubmit={handleBroadcast} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
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
                rows={3}
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
        </div>
      )}

      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="ops-search-wrap">
          <IconSearch size={16} />
          <input
            type="text"
            className="ops-input"
            placeholder="Search users by email or name..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(0);
            }}
          />
        </div>
      </div>

      {selectedIds.size > 0 && (
        <div className="ops-bulk-bar">
          <strong>{selectedIds.size}</strong> selected
          <div className="spacer">
            <button type="button" className="ops-mini-btn" disabled={isBulkBusy} onClick={() => void handleBulkBan(true)}>
              Suspend selected
            </button>
            <button type="button" className="ops-mini-btn" disabled={isBulkBusy} onClick={() => void handleBulkBan(false)}>
              Restore selected
            </button>
            <button type="button" className="ops-mini-btn" onClick={() => setSelectedIds(new Set())}>
              Clear
            </button>
          </div>
        </div>
      )}

      <div className="ops-card" style={{ padding: '6px 0' }}>
        <div style={{ overflowX: 'auto' }}>
          {filteredUsers.length === 0 ? (
            <div className="ops-empty" style={{ padding: '32px' }}>No users found.</div>
          ) : (
            <table className="ops-manifest">
              <thead>
                <tr>
                  <th style={{ width: '30px' }}>
                    <input type="checkbox" checked={allPageSelected} onChange={toggleSelectAllOnPage} aria-label="Select all on page" />
                  </th>
                  <th>User</th>
                  <th>Role</th>
                  <th>Joined</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {pagedUsers.map((u) => {
                  const isSuperadmin = superadminIdSet.has(u.id);
                  return (
                    <tr key={u.id}>
                      <td data-label="">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(u.id)}
                          disabled={isSuperadmin}
                          onChange={() => toggleSelect(u.id)}
                          aria-label={`Select ${u.email}`}
                        />
                      </td>
                      <td data-label="">
                        <div className="ops-trip-name">{u.displayName || u.email}</div>
                        <div className="ops-trip-route">{u.email}</div>
                      </td>
                      <td data-label="Role">
                        <span className={`ops-badge ${isSuperadmin ? 'grounded' : 'archived'}`}>{isSuperadmin ? 'Superadmin' : 'Member'}</span>
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
        {filteredUsers.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderTop: '1px solid var(--line)' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
              Showing {page * PAGE_SIZE + 1}&ndash;{Math.min(filteredUsers.length, page * PAGE_SIZE + PAGE_SIZE)} of {filteredUsers.length}
            </span>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button type="button" className="ops-mini-btn" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
                Prev
              </button>
              <button type="button" className="ops-mini-btn" disabled={page >= pageCount - 1} onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}>
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="ops-notice">
        <IconAlertCircle size={14} /> Suspension is enforced at the database level — a suspended account loses read and write access to every trip on its next request, even mid-session. Superadmin accounts cannot be suspended.
      </div>
    </div>
  );
}
