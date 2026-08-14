import { useMemo } from 'react';
import type { Trip, Expense, Member, Category } from '../../types';
import { getCurrencySymbol } from '../../utils/currency';

interface Props {
  trips: Trip[];
  expenses: Expense[];
  members: Record<string, Member>;
  categories: Category[];
}

export function AdminAnalyticsPage({ trips, expenses, members, categories }: Props) {
  // Global Aggregated Financial Metrics
  const activeTrips = trips.filter((t) => !t.archived);
  const activeTripIds = new Set(activeTrips.map((t) => t.id));
  const activeExpenses = expenses.filter((e) => activeTripIds.has(e.tripId) && !e.title.startsWith('Settlement:'));

  const totalSpendVolume = activeExpenses.reduce((sum, e) => sum + e.amount, 0);
  const totalTransactionsCount = activeExpenses.length;
  const totalUniqueMembers = Object.keys(members).length;

  // Breakdown by Currency
  const currencyBreakdown = useMemo(() => {
    const map: Record<string, { total: number; count: number }> = {};
    activeExpenses.forEach((e) => {
      const curr = e.currency || 'USD';
      if (!map[curr]) map[curr] = { total: 0, count: 0 };
      map[curr].total += e.amount;
      map[curr].count += 1;
    });
    return Object.entries(map).sort((a, b) => b[1].total - a[1].total);
  }, [activeExpenses]);

  // Category Aggregate Breakdown
  const categoryBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    activeExpenses.forEach((e) => {
      map[e.category] = (map[e.category] || 0) + e.amount;
    });
    return Object.entries(map)
      .map(([catId, amount]) => {
        const cat = categories.find((c) => c.id === catId);
        return {
          id: catId,
          name: cat?.name || 'Other',
          icon: cat?.icon || '🏷️',
          amount,
          pct: totalSpendVolume > 0 ? (amount / totalSpendVolume) * 100 : 0,
        };
      })
      .sort((a, b) => b.amount - a.amount);
  }, [activeExpenses, categories, totalSpendVolume]);

  // Top Spenders Leaderboard Across All Trips
  const topSpenders = useMemo(() => {
    const map: Record<string, number> = {};
    activeExpenses.forEach((e) => {
      map[e.paidBy] = (map[e.paidBy] || 0) + e.amount;
    });
    return Object.entries(map)
      .map(([memberId, total]) => ({
        memberId,
        name: members[memberId]?.name || 'Unknown',
        total,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [activeExpenses, members]);

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px 0' }}>
          📊 Global High-End Trip Analytics
        </h2>
        <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', margin: 0 }}>
          Telemetry, aggregate volume, spending distributions, and category patterns across all trips.
        </p>
      </div>

      {/* Top Level Metric KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
        <div className="glass-card" style={{ padding: '16px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Total Spend Volume
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--primary-accent)', marginTop: '4px' }}>
            ₹{totalSpendVolume.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Across {activeTrips.length} active trips
          </div>
        </div>

        <div className="glass-card" style={{ padding: '16px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Active Trips
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
            {activeTrips.length}
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
            {trips.filter((t) => t.archived).length} archived
          </div>
        </div>

        <div className="glass-card" style={{ padding: '16px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Total Transactions
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
            {totalTransactionsCount}
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Avg ₹{(totalSpendVolume / Math.max(1, totalTransactionsCount)).toFixed(2)} / tx
          </div>
        </div>

        <div className="glass-card" style={{ padding: '16px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Total Travelers
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
            {totalUniqueMembers}
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Across all group rosters
          </div>
        </div>
      </div>

      {/* Two Column Layout: Category Distribution & Top Spenders */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        {/* Category Distribution Card */}
        <div className="glass-card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '14px' }}>
            🏷️ Category Aggregate Spend
          </h3>

          {categoryBreakdown.length === 0 ? (
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>
              No expenses recorded yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {categoryBreakdown.map((c) => (
                <div key={c.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                    <span>
                      {c.icon} <strong>{c.name}</strong>
                    </span>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      ₹{c.amount.toFixed(2)} ({c.pct.toFixed(1)}%)
                    </span>
                  </div>
                  <div style={{ width: '100%', height: '7px', background: 'rgba(0,0,0,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${c.pct}%`,
                        height: '100%',
                        background: 'var(--primary-accent)',
                        borderRadius: '4px',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Spenders Leaderboard */}
        <div className="glass-card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '14px' }}>
            🏆 Top Spenders Leaderboard
          </h3>

          {topSpenders.length === 0 ? (
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>
              No payer data available yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {topSpenders.map((s, idx) => (
                <div
                  key={s.memberId}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: idx === 0 ? 'rgba(31, 110, 104, 0.08)' : 'rgba(0,0,0,0.02)',
                    border: idx === 0 ? '1px solid rgba(31, 110, 104, 0.2)' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', width: '18px' }}>
                      #{idx + 1}
                    </span>
                    <span style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary)' }}>{s.name}</span>
                  </div>
                  <strong style={{ fontSize: '13.5px', color: 'var(--primary-accent)' }}>
                    ₹{s.total.toFixed(2)}
                  </strong>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Currency Breakdown Table */}
      <div className="glass-card" style={{ padding: '20px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' }}>
          💱 Currency Volume Breakdown
        </h3>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {currencyBreakdown.map(([curr, data]) => (
            <div
              key={curr}
              style={{
                padding: '12px 16px',
                borderRadius: '10px',
                background: 'rgba(0,0,0,0.03)',
                border: '1px solid var(--border-color)',
                minWidth: '140px',
              }}
            >
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>{curr}</div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                {getCurrencySymbol(curr)} {data.total.toFixed(2)}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                {data.count} transactions
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
