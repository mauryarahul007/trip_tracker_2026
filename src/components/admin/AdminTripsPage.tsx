import { useState } from 'react';
import type { Trip, Expense } from '../../types';
import { useTripStore } from '../../store/tripStore';
import { getCurrencySymbol } from '../../utils/currency';
import { IconSearch, IconCheck } from '../Icons';

interface Props {
  trips: Trip[];
  expenses: Expense[];
}

export function AdminTripsPage({ trips, expenses }: Props) {
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
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px 0' }}>
            🗂️ Trips Directory &amp; Moderation
          </h2>
          <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', margin: 0 }}>
            Audit all customer trips, inspect group telemetry, or execute emergency freeze controls to stop rogue activity.
          </p>
        </div>
      </div>

      {/* Privacy & Governance Notice */}
      <div
        style={{
          padding: '14px 16px',
          borderRadius: '12px',
          background: 'rgba(31, 110, 104, 0.08)',
          border: '1px solid rgba(31, 110, 104, 0.25)',
          fontSize: '13px',
          color: 'var(--text-primary)',
          lineHeight: '1.5',
        }}
      >
        <strong>🔒 Privacy &amp; Group Isolation:</strong> All trips and member rosters are strictly private to their group participants. Normal users manage their own team members. Superadmins hold emergency controls (Freeze / Archive / Remove) to suspend problematic or spammy activity.
      </div>

      {toastMsg && (
        <div
          style={{
            padding: '10px 14px',
            borderRadius: '10px',
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            color: '#10B981',
            fontSize: '13px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <IconCheck size={16} /> {toastMsg}
        </div>
      )}

      {/* Filters and Search Bar */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="input-icon-wrap" style={{ flex: '1 1 240px' }}>
          <IconSearch size={16} className="icon" />
          <input
            type="text"
            className="input-field"
            placeholder="Search trips by name or currency..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: '6px' }}>
          {(['all', 'active', 'frozen', 'archived'] as const).map((filter) => (
            <button
              key={filter}
              type="button"
              className={`category-badge${statusFilter === filter ? ' active' : ''}`}
              style={{ textTransform: 'capitalize', padding: '6px 12px', fontSize: '12px' }}
              onClick={() => setStatusFilter(filter)}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Trips Card List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {filteredTrips.length === 0 ? (
          <div className="glass-card" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No trips found matching the selected filter.
          </div>
        ) : (
          filteredTrips.map((t) => {
            const tripExpenses = expenses.filter((e) => e.tripId === t.id && !e.title.startsWith('Settlement:'));
            const tripTotal = tripExpenses.reduce((sum, e) => sum + e.amount, 0);

            return (
              <div
                key={t.id}
                className="glass-card"
                style={{
                  padding: '16px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  border: t.frozen
                    ? '1.5px solid rgba(239, 68, 68, 0.4)'
                    : '1px solid var(--border-color)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '12px',
                        background: t.frozen ? 'rgba(239, 68, 68, 0.12)' : 'rgba(31, 110, 104, 0.08)',
                        color: t.frozen ? '#EF4444' : 'var(--primary-accent)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '20px',
                      }}
                    >
                      {t.frozen ? '🔒' : '✈️'}
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>{t.name}</span>
                        {t.frozen && (
                          <span style={{ fontSize: '10.5px', fontWeight: 700, padding: '2px 7px', borderRadius: '8px', background: '#EF4444', color: '#fff' }}>
                            FROZEN (LOCKED)
                          </span>
                        )}
                        {t.archived && (
                          <span style={{ fontSize: '10.5px', fontWeight: 700, padding: '2px 7px', borderRadius: '8px', background: 'var(--text-muted)', color: '#fff' }}>
                            ARCHIVED
                          </span>
                        )}
                        {!t.frozen && !t.archived && (
                          <span style={{ fontSize: '10.5px', fontWeight: 700, padding: '2px 7px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.15)', color: '#10B981' }}>
                            ACTIVE
                          </span>
                        )}
                      </div>

                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        {t.startDate} → {t.endDate} · {t.memberIds.length} members · {tripExpenses.length} transactions · Code: <code>{t.joinCode || 'N/A'}</code>
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {getCurrencySymbol(t.baseCurrency)} {tripTotal.toFixed(2)}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Base Currency: {t.baseCurrency}
                    </div>
                  </div>
                </div>

                {/* Moderation Controls Action Bar */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingTop: '10px',
                    borderTop: '1px solid var(--border-color-subtle, rgba(0,0,0,0.05))',
                    flexWrap: 'wrap',
                    gap: '8px',
                  }}
                >
                  <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                    ID: <code>{t.id.slice(0, 8)}...</code>
                  </span>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      className="secondary-btn"
                      style={{
                        padding: '5px 12px',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: t.frozen ? '#10B981' : '#E67E22',
                        borderColor: t.frozen ? 'rgba(16, 185, 129, 0.35)' : 'rgba(230, 126, 34, 0.35)',
                      }}
                      onClick={async () => {
                        await freezeTrip(t.id, !t.frozen);
                        showToast(t.frozen ? `Unfroze trip "${t.name}"` : `Froze trip "${t.name}" — modifications stopped.`);
                      }}
                    >
                      {t.frozen ? '🔓 Unfreeze Trip' : '🛑 Freeze (Emergency Stop)'}
                    </button>

                    <button
                      type="button"
                      className="secondary-btn"
                      style={{ padding: '5px 12px', fontSize: '12px' }}
                      onClick={async () => {
                        await archiveTrip(t.id, !t.archived);
                        showToast(t.archived ? `Restored trip "${t.name}"` : `Archived trip "${t.name}"`);
                      }}
                    >
                      {t.archived ? 'Restore' : 'Archive'}
                    </button>

                    <button
                      type="button"
                      className="secondary-btn"
                      style={{ padding: '5px 12px', fontSize: '12px', color: '#EF4444', borderColor: 'rgba(239, 68, 68, 0.3)' }}
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
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
