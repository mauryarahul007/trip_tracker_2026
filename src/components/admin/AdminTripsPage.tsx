import { useState } from 'react';
import type { Trip, Expense } from '../../types';
import { useTripStore } from '../../store/tripStore';
import { getCurrencySymbol } from '../../utils/currency';
import { IconSearch, IconCheck } from '../Icons';

interface Props {
  trips: Trip[];
  expenses: Expense[];
  onInspectTrip?: (tripId: string) => void;
}

export function AdminTripsPage({ trips, expenses, onInspectTrip }: Props) {
  const freezeTrip = useTripStore((s) => s.freezeTrip);
  const archiveTrip = useTripStore((s) => s.archiveTrip);
  const deleteTrip = useTripStore((s) => s.deleteTrip);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'frozen' | 'archived'>('all');
  const [toastMsg, setToastMsg] = useState('');

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

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

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <div className="ops-page-head">
        <div>
          <h2>Trips Directory</h2>
          <p>Audit customer trips, inspect group telemetry, or ground rogue activity.</p>
        </div>
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
          {(['all', 'active', 'frozen', 'archived'] as const).map((filter) => (
            <button
              key={filter}
              type="button"
              className="ops-chip"
              data-active={statusFilter === filter}
              onClick={() => setStatusFilter(filter)}
            >
              {filter === 'frozen' ? 'Grounded' : filter}
            </button>
          ))}
        </div>
      </div>

      <div className="ops-card" style={{ padding: '6px 0' }}>
        <div style={{ overflowX: 'auto' }}>
          {filteredTrips.length === 0 ? (
            <div className="ops-empty" style={{ padding: '32px' }}>No trips found matching the selected filter.</div>
          ) : (
            <table className="ops-manifest">
              <thead>
                <tr>
                  <th>Trip</th>
                  <th>Status</th>
                  <th className="ops-num-right">Pax</th>
                  <th className="ops-num-right">Volume</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filteredTrips.map((t) => {
                  const tripExpenses = expenses.filter((e) => e.tripId === t.id && !e.title.startsWith('Settlement:'));
                  const tripTotal = tripExpenses.reduce((sum, e) => sum + e.amount, 0);
                  const status = t.frozen ? 'grounded' : t.archived ? 'archived' : 'active';

                  return (
                    <tr key={t.id}>
                      <td data-label="">
                        <div className="ops-trip-name">{t.name}</div>
                        <div className="ops-trip-route">{t.startDate} &rarr; {t.endDate} &middot; {t.baseCurrency}</div>
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
                              showToast(t.archived ? `Restored trip "${t.name}"` : `Archived trip "${t.name}"`);
                            }}
                          >
                            {t.archived ? 'Restore' : 'Archive'}
                          </button>
                          <button
                            type="button"
                            className="ops-mini-btn ground"
                            onClick={async () => {
                              if (window.confirm(`Permanently remove trip "${t.name}" and its expenses? This cannot be undone.`)) {
                                await deleteTrip(t.id);
                                showToast(`Deleted trip "${t.name}"`);
                              }
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
    </div>
  );
}
