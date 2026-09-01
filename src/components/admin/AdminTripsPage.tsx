import { useState, useMemo } from 'react';
import type { Trip, Expense, Member } from '../../types';
import { useTripStore } from '../../store/tripStore';
import { getCurrencySymbol } from '../../utils/currency';
import { logSuperadminAction } from '../../services/tripApi';
import { IconSearch, IconCheck, IconRefresh, IconChevronDown, IconChevronUp, IconX } from '../Icons';
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
  const [inspectingTripId, setInspectingTripId] = useState<string | null>(null);
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
      .map((t) => ({
        id: t.id,
        name: t.name,
        currency: t.baseCurrency,
        startDate: t.startDate,
        endDate: t.endDate,
        membersCount: t.memberIds.length,
        volume: tripVolume(t.id),
        status: t.frozen ? 'grounded' : t.archived ? 'archived' : 'active',
      }));
    const blob = new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trips-export-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Exported ${rows.length} trips.`);
  };

  const sortIndicator = (key: SortKey) => {
    if (sortKey !== key) return null;
    return sortDir === 'asc' ? <IconChevronUp size={12} /> : <IconChevronDown size={12} />;
  };

  const activeInspectedTrip = trips.find((t) => t.id === inspectingTripId);
  const inspectedExpenses = activeInspectedTrip
    ? expenses.filter((e) => e.tripId === activeInspectedTrip.id)
    : [];
  const inspectedSpendExpenses = inspectedExpenses.filter((e) => !e.title.startsWith('Settlement:'));
  const inspectedTotalSpend = inspectedSpendExpenses.reduce((sum, e) => sum + e.amount, 0);

  const memberBalances = useMemo(() => {
    if (!activeInspectedTrip) return [];
    const balances: Record<string, { paid: number; share: number }> = {};
    activeInspectedTrip.memberIds.forEach((mId) => {
      balances[mId] = { paid: 0, share: 0 };
    });

    inspectedSpendExpenses.forEach((exp) => {
      if (balances[exp.paidBy]) {
        balances[exp.paidBy].paid += exp.amount;
      }
      if (exp.resolvedShares && Object.keys(exp.resolvedShares).length > 0) {
        Object.entries(exp.resolvedShares).forEach(([memberId, share]) => {
          if (balances[memberId]) {
            balances[memberId].share += share;
          }
        });
      } else if (exp.splitMemberIds && exp.splitMemberIds.length > 0) {
        const splitAmount = exp.amount / exp.splitMemberIds.length;
        exp.splitMemberIds.forEach((mId) => {
          if (balances[mId]) balances[mId].share += splitAmount;
        });
      } else if (activeInspectedTrip.memberIds.length > 0) {
        const splitAmount = exp.amount / activeInspectedTrip.memberIds.length;
        activeInspectedTrip.memberIds.forEach((mId) => {
          if (balances[mId]) balances[mId].share += splitAmount;
        });
      }
    });

    return activeInspectedTrip.memberIds.map((mId) => {
      const b = balances[mId] || { paid: 0, share: 0 };
      const net = b.paid - b.share;
      return {
        id: mId,
        name: members[mId]?.name || 'Unknown Member',
        paid: b.paid,
        share: b.share,
        net,
      };
    });
  }, [activeInspectedTrip, inspectedSpendExpenses, members]);

  const categoryBreakdown = useMemo(() => {
    if (!activeInspectedTrip) return [];
    const map: Record<string, number> = {};
    inspectedSpendExpenses.forEach((e) => {
      const cat = e.category || 'General';
      map[cat] = (map[cat] || 0) + e.amount;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [activeInspectedTrip, inspectedSpendExpenses]);

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
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
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedTrips.map((t) => {
                  const tripExpenses = expenses.filter((e) => e.tripId === t.id && !e.title.startsWith('Settlement:'));
                  const tripTotal = tripExpenses.reduce((sum, e) => sum + e.amount, 0);
                  const status = t.frozen ? 'grounded' : t.archived ? 'archived' : 'active';

                  return (
                    <tr key={t.id}>
                      <td data-label="">
                        <input type="checkbox" checked={selectedIds.has(t.id)} onChange={() => toggleSelect(t.id)} aria-label={`Select ${t.name}`} />
                      </td>
                      <td data-label="">
                        <button
                          type="button"
                          onClick={() => setInspectingTripId(t.id)}
                          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', font: 'inherit', color: 'inherit' }}
                          title="Open deep inspector drawer"
                        >
                          <div className="ops-trip-name" style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{t.name}</div>
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
                      <td data-label="" style={{ textAlign: 'right' }}>
                        <div className="ops-manifest-actions" style={{ justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            className="ops-mini-btn"
                            title="Inspect trip telemetry in side drawer"
                            onClick={() => setInspectingTripId(t.id)}
                          >
                            Inspect
                          </button>
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
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {activeInspectedTrip && (
        <div className="ops-drawer-backdrop" onClick={() => setInspectingTripId(null)}>
          <div className="ops-trip-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="ops-drawer-header">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {activeInspectedTrip.name}
                  </h3>
                  <span className={`ops-badge ${activeInspectedTrip.frozen ? 'grounded' : activeInspectedTrip.archived ? 'archived' : 'safe'}`}>
                    {activeInspectedTrip.frozen ? 'Grounded' : activeInspectedTrip.archived ? 'Archived' : 'Active'}
                  </span>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px', fontFamily: 'var(--mono)' }}>
                  ID: {activeInspectedTrip.id} &middot; {activeInspectedTrip.baseCurrency}
                </div>
              </div>
              <button
                type="button"
                className="ops-btn"
                style={{ padding: '4px' }}
                onClick={() => setInspectingTripId(null)}
              >
                <IconX size={15} />
              </button>
            </div>

            <div className="ops-drawer-body">
              <div className="ops-drawer-section">
                <div className="ops-drawer-section-title">Trip Telemetry &amp; Financials</div>
                <div className="ops-kpi-row" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', margin: 0 }}>
                  <div className="ops-radar-card">
                    <div className="ops-radar-label">Total Spend</div>
                    <div className="ops-radar-value">{getCurrencySymbol(activeInspectedTrip.baseCurrency)}{inspectedTotalSpend.toFixed(0)}</div>
                  </div>
                  <div className="ops-radar-card">
                    <div className="ops-radar-label">Expenses</div>
                    <div className="ops-radar-value">{inspectedSpendExpenses.length}</div>
                  </div>
                  <div className="ops-radar-card">
                    <div className="ops-radar-label">Travelers</div>
                    <div className="ops-radar-value">{activeInspectedTrip.memberIds.length}</div>
                  </div>
                </div>
              </div>

              <div className="ops-drawer-section">
                <div className="ops-drawer-section-title">Member Roster &amp; Net Balances</div>
                {memberBalances.length === 0 ? (
                  <div className="ops-empty">No members attached.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {memberBalances.map((mb) => (
                      <div key={mb.id} className="ops-member-balance-row">
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{mb.name}</div>
                          <div style={{ fontSize: '10.5px', color: 'var(--text-tertiary)' }}>
                            Paid: {getCurrencySymbol(activeInspectedTrip.baseCurrency)}{mb.paid.toFixed(0)} &middot; Share: {getCurrencySymbol(activeInspectedTrip.baseCurrency)}{mb.share.toFixed(0)}
                          </div>
                        </div>
                        <div className={mb.net > 0.01 ? 'balance-pos' : mb.net < -0.01 ? 'balance-neg' : 'balance-zero'}>
                          {mb.net > 0.01 ? `+${getCurrencySymbol(activeInspectedTrip.baseCurrency)}${mb.net.toFixed(0)}` : mb.net < -0.01 ? `-${getCurrencySymbol(activeInspectedTrip.baseCurrency)}${Math.abs(mb.net).toFixed(0)}` : 'Settled'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {categoryBreakdown.length > 0 && (
                <div className="ops-drawer-section">
                  <div className="ops-drawer-section-title">Top Spending Categories</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {categoryBreakdown.slice(0, 5).map(([cat, amt]) => {
                      const pct = Math.round((amt / (inspectedTotalSpend || 1)) * 100);
                      return (
                        <div key={cat} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>{cat}</span>
                            <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--mono)' }}>
                              {getCurrencySymbol(activeInspectedTrip.baseCurrency)}{amt.toFixed(0)} ({pct}%)
                            </span>
                          </div>
                          <div style={{ height: '5px', background: 'var(--bg-inset)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ width: `${pct}%`, height: '100%', background: 'var(--amber)', borderRadius: '3px' }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="ops-drawer-section">
                <div className="ops-drawer-section-title">Superadmin Actions</div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {onInspectTrip && (
                    <button
                      type="button"
                      className="ops-btn"
                      onClick={() => {
                        setInspectingTripId(null);
                        onInspectTrip(activeInspectedTrip.id);
                      }}
                    >
                      Open in Traveler View
                    </button>
                  )}
                  <button
                    type="button"
                    className={`ops-btn${activeInspectedTrip.frozen ? '' : ' ops-btn-danger'}`}
                    onClick={async () => {
                      await freezeTrip(activeInspectedTrip.id, !activeInspectedTrip.frozen);
                      void logSuperadminAction(activeInspectedTrip.id, activeInspectedTrip.frozen ? 'unground_trip' : 'ground_trip', { tripName: activeInspectedTrip.name });
                      showToast(activeInspectedTrip.frozen ? `Unfroze trip "${activeInspectedTrip.name}"` : `Grounded trip "${activeInspectedTrip.name}"`);
                    }}
                  >
                    {activeInspectedTrip.frozen ? 'Lift Ground Lock' : 'Emergency Ground'}
                  </button>
                  <button
                    type="button"
                    className="ops-btn"
                    onClick={async () => {
                      await archiveTrip(activeInspectedTrip.id, !activeInspectedTrip.archived);
                      void logSuperadminAction(activeInspectedTrip.id, activeInspectedTrip.archived ? 'restore_trip' : 'archive_trip', { tripName: activeInspectedTrip.name });
                      showToast(activeInspectedTrip.archived ? `Restored "${activeInspectedTrip.name}"` : `Archived "${activeInspectedTrip.name}"`);
                    }}
                  >
                    {activeInspectedTrip.archived ? 'Restore Trip' : 'Archive Trip'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
