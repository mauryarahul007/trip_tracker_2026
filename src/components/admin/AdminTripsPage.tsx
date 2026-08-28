import { Fragment, useState } from 'react';
import type { Trip, Expense, Member } from '../../types';
import { useTripStore } from '../../store/tripStore';
import { getCurrencySymbol } from '../../utils/currency';
import { logSuperadminAction } from '../../services/tripApi';
import { IconSearch, IconCheck, IconRefresh, IconChevronDown, IconChevronUp } from '../Icons';
import type { ConfirmRequest } from '../ConfirmDialog';

interface Props {
  trips: Trip[];
  expenses: Expense[];
  members: Record<string, Member>;
  onInspectTrip?: (tripId: string) => void;
  onRefresh: () => void | Promise<void>;
  isRefreshing: boolean;
  onRequestConfirm: (req: ConfirmRequest) => void;
}

type SortKey = 'name' | 'members' | 'volume';

export function AdminTripsPage({ trips, expenses, members, onInspectTrip, onRefresh, isRefreshing, onRequestConfirm }: Props) {
  const freezeTrip = useTripStore((s) => s.freezeTrip);
  const archiveTrip = useTripStore((s) => s.archiveTrip);
  const deleteTrip = useTripStore((s) => s.deleteTrip);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'frozen' | 'archived'>('all');
  const [toastMsg, setToastMsg] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [expandedTripId, setExpandedTripId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const tripVolume = (tripId: string) =>
    expenses.filter((e) => e.tripId === tripId && !e.title.startsWith('Settlement:')).reduce((sum, e) => sum + e.amount, 0);

  const filteredTrips = trips.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.baseCurrency.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (statusFilter === 'active') return !t.archived && !t.frozen;
    if (statusFilter === 'frozen') return !!t.frozen;
    if (statusFilter === 'archived') return !!t.archived;
    return true;
  });

  const sortedTrips = [...filteredTrips].sort((a, b) => {
    let cmp = 0;
    if (sortKey === 'name') cmp = a.name.localeCompare(b.name);
    if (sortKey === 'members') cmp = a.memberIds.length - b.memberIds.length;
    if (sortKey === 'volume') cmp = tripVolume(a.id) - tripVolume(b.id);
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkArchive = () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    onRequestConfirm({
      title: 'Archive trips',
      message: `Archive ${ids.length} trip${ids.length === 1 ? '' : 's'}?`,
      confirmLabel: 'Archive',
      onConfirm: async () => {
        for (const id of ids) {
          const trip = trips.find((t) => t.id === id);
          if (!trip || trip.archived) continue;
          await archiveTrip(id, true);
          void logSuperadminAction(id, 'archive_trip', { tripName: trip.name }).catch(() => {});
        }
        showToast(`Archived ${ids.length} trip${ids.length === 1 ? '' : 's'}.`);
        setSelectedIds(new Set());
      },
    });
  };

  const handleBulkExport = () => {
    const rows = trips
      .filter((t) => selectedIds.has(t.id))
      .map((t) => ({ id: t.id, name: t.name, currency: t.baseCurrency, members: t.memberIds.length, volume: tripVolume(t.id), archived: t.archived, frozen: t.frozen }));
    const blob = new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trip-tracker-selected-trips-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Exported ${selectedIds.size} trip${selectedIds.size === 1 ? '' : 's'}.`);
  };

  const sortIndicator = (key: SortKey) =>
    sortKey === key ? (sortDir === 'asc' ? <IconChevronUp size={11} className="icon-sm" /> : <IconChevronDown size={11} className="icon-sm" />) : <IconChevronDown size={11} className="icon-sm" />;

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <div className="ops-page-head">
        <div>
          <h2>Trips Directory</h2>
          <p>Audit customer trips, inspect group telemetry, or ground rogue activity.</p>
        </div>
        <button type="button" className="ops-btn" disabled={isRefreshing} onClick={() => void onRefresh()}>
          <IconRefresh size={13} className={isRefreshing ? 'icon-sm ops-spin' : 'icon-sm'} /> {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      <div className="ops-notice">
        <strong>&#128274; Privacy &amp; Group Isolation:</strong> All trips and member rosters are private to their group participants. Superadmins hold emergency controls (Ground / Archive / Remove) to suspend problematic or spammy activity.
      </div>

      {toastMsg && (
        <div className="ops-toast">
          <IconCheck size={14} /> {toastMsg}
        </div>
      )}

      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '14px' }}>
        <div className="ops-search-wrap">
          <IconSearch size={16} />
          <input
            type="text"
            className="ops-input"
            placeholder="Search trips by name or currency..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="ops-filter-row" style={{ marginBottom: 0 }}>
          {(['all', 'active', 'frozen', 'archived'] as const).map((filter) => {
            const count =
              filter === 'all'
                ? trips.length
                : filter === 'active'
                  ? trips.filter((t) => !t.archived && !t.frozen).length
                  : filter === 'frozen'
                    ? trips.filter((t) => t.frozen).length
                    : trips.filter((t) => t.archived).length;
            return (
              <button
                key={filter}
                type="button"
                className="ops-chip"
                data-active={statusFilter === filter}
                onClick={() => setStatusFilter(filter)}
              >
                {filter === 'frozen' ? 'Grounded' : filter} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {selectedIds.size > 0 && (
        <div className="ops-bulk-bar">
          <strong>{selectedIds.size}</strong> selected
          <div className="spacer">
            <button type="button" className="ops-mini-btn" onClick={() => void handleBulkArchive()}>
              Archive selected
            </button>
            <button type="button" className="ops-mini-btn" onClick={handleBulkExport}>
              Export selected
            </button>
            <button type="button" className="ops-mini-btn" onClick={() => setSelectedIds(new Set())}>
              Clear
            </button>
          </div>
        </div>
      )}

      <div className="ops-card" style={{ padding: '6px 0' }}>
        <div style={{ overflowX: 'auto' }}>
          {sortedTrips.length === 0 ? (
            <div className="ops-empty" style={{ padding: '32px' }}>No trips found matching the selected filter.</div>
          ) : (
            <table className="ops-manifest">
              <thead>
                <tr>
                  <th style={{ width: '26px' }} />
                  <th>
                    <button type="button" className="ops-sort-th" data-active={sortKey === 'name'} onClick={() => toggleSort('name')}>
                      Trip {sortIndicator('name')}
                    </button>
                  </th>
                  <th>Status</th>
                  <th className="ops-num-right">
                    <button type="button" className="ops-sort-th" data-active={sortKey === 'members'} onClick={() => toggleSort('members')}>
                      Pax {sortIndicator('members')}
                    </button>
                  </th>
                  <th className="ops-num-right">
                    <button type="button" className="ops-sort-th" data-active={sortKey === 'volume'} onClick={() => toggleSort('volume')}>
                      Volume {sortIndicator('volume')}
                    </button>
                  </th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {sortedTrips.map((t) => {
                  const tripExpenses = expenses.filter((e) => e.tripId === t.id && !e.title.startsWith('Settlement:'));
                  const tripTotal = tripExpenses.reduce((sum, e) => sum + e.amount, 0);
                  const status = t.frozen ? 'grounded' : t.archived ? 'archived' : 'active';
                  const isExpanded = expandedTripId === t.id;

                  return (
                    <Fragment key={t.id}>
                    <tr>
                      <td data-label="">
                        <input type="checkbox" checked={selectedIds.has(t.id)} onChange={() => toggleSelect(t.id)} aria-label={`Select ${t.name}`} />
                      </td>
                      <td data-label="">
                        <button
                          type="button"
                          onClick={() => setExpandedTripId(isExpanded ? null : t.id)}
                          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', font: 'inherit', color: 'inherit' }}
                        >
                          <div className="ops-trip-name">{t.name}</div>
                          <div className="ops-trip-route">{t.startDate} &rarr; {t.endDate} &middot; {t.baseCurrency}</div>
                        </button>
                      </td>
                      <td data-label="Status">
                        <span className={`ops-badge ${status}`}>
                          {status === 'grounded' ? 'Grounded' : status === 'archived' ? 'Archived' : 'Active'}
                        </span>
                      </td>
                      <td className="ops-num-right" data-label="Members">{t.memberIds.length}</td>
                      <td className="ops-num-right" data-label="Total">{getCurrencySymbol(t.baseCurrency)} {tripTotal.toFixed(2)}</td>
                      <td data-label="">
                        <div className="ops-manifest-actions">
                          {onInspectTrip && (
                            <button
                              type="button"
                              className="ops-mini-btn"
                              title="Open this trip in the traveler view for support debugging"
                              onClick={() => onInspectTrip(t.id)}
                            >
                              Inspect
                            </button>
                          )}
                          <button
                            type="button"
                            className={`ops-mini-btn${t.frozen ? '' : ' ground'}`}
                            onClick={async () => {
                              await freezeTrip(t.id, !t.frozen);
                              void logSuperadminAction(t.id, t.frozen ? 'unground_trip' : 'ground_trip', { tripName: t.name }).catch((err) =>
                                console.error('Audit log failed', err)
                              );
                              showToast(t.frozen ? `Unfroze trip "${t.name}"` : `Grounded trip "${t.name}" — modifications stopped.`);
                            }}
                          >
                            {t.frozen ? 'Unground' : 'Ground'}
                          </button>
                          <button
                            type="button"
                            className="ops-mini-btn"
                            onClick={async () => {
                              await archiveTrip(t.id, !t.archived);
                              void logSuperadminAction(t.id, t.archived ? 'restore_trip' : 'archive_trip', { tripName: t.name }).catch((err) =>
                                console.error('Audit log failed', err)
                              );
                              showToast(t.archived ? `Restored trip "${t.name}"` : `Archived trip "${t.name}"`);
                            }}
                          >
                            {t.archived ? 'Restore' : 'Archive'}
                          </button>
                          <button
                            type="button"
                            className="ops-mini-btn ground"
                            onClick={() => {
                              onRequestConfirm({
                                title: 'Delete trip',
                                message: `Permanently remove trip "${t.name}" and its expenses? This cannot be undone.`,
                                confirmLabel: 'Delete',
                                danger: true,
                                onConfirm: async () => {
                                  await deleteTrip(t.id);
                                  // trip_id references trips(id) on delete cascade -- log against
                                  // null (trip no longer exists) with the id/name in details instead.
                                  void logSuperadminAction(null, 'delete_trip', { tripId: t.id, tripName: t.name }).catch((err) =>
                                    console.error('Audit log failed', err)
                                  );
                                  showToast(`Deleted trip "${t.name}"`);
                                },
                              });
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td data-label="" colSpan={6} style={{ background: 'var(--bg-inset)' }}>
                          <div style={{ fontFamily: 'var(--mono)', fontSize: '9.5px', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: '6px' }}>
                            Roster ({t.memberIds.length})
                          </div>
                          {t.memberIds.length === 0 ? (
                            <span style={{ fontSize: '11.5px', color: 'var(--text-tertiary)' }}>No members yet.</span>
                          ) : (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                              {t.memberIds.map((mid) => (
                                <span key={mid} className="ops-badge archived">
                                  {members[mid]?.name || 'Unknown'}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
