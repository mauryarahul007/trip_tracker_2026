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
  const activeTrips = trips.filter((t) => !t.archived);
  const activeTripIds = new Set(activeTrips.map((t) => t.id));
  const activeExpenses = expenses.filter((e) => activeTripIds.has(e.tripId) && !e.title.startsWith('Settlement:'));

  const totalSpendVolume = activeExpenses.reduce((sum, e) => sum + e.amount, 0);
  const totalTransactionsCount = activeExpenses.length;
  const totalUniqueMembers = Object.keys(members).length;

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
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <div className="ops-page-head">
        <div>
          <h2>Global Trip Analytics</h2>
          <p>Telemetry, aggregate volume, spending distributions, and category patterns across all trips.</p>
        </div>
      </div>

      <div className="ops-kpi-row">
        <div className="ops-card ops-kpi-card">
          <div className="ops-kpi-label">Total Volume</div>
          <div className="ops-kpi-value accent">
            &#8377;{totalSpendVolume.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="ops-kpi-delta">Across {activeTrips.length} active trips</div>
        </div>
        <div className="ops-card ops-kpi-card">
          <div className="ops-kpi-label">Active Trips</div>
          <div className="ops-kpi-value">{activeTrips.length}</div>
          <div className="ops-kpi-delta">{trips.filter((t) => t.archived).length} archived</div>
        </div>
        <div className="ops-card ops-kpi-card">
          <div className="ops-kpi-label">Transactions</div>
          <div className="ops-kpi-value">{totalTransactionsCount}</div>
          <div className="ops-kpi-delta">avg &#8377;{(totalSpendVolume / Math.max(1, totalTransactionsCount)).toFixed(2)} / tx</div>
        </div>
        <div className="ops-card ops-kpi-card">
          <div className="ops-kpi-label">Travelers</div>
          <div className="ops-kpi-value">{totalUniqueMembers}</div>
          <div className="ops-kpi-delta">across all rosters</div>
        </div>
      </div>

      <div className="ops-split-row">
        <div className="ops-card">
          <h3 className="ops-section-title">Category Aggregate Spend</h3>
          <p className="ops-section-sub">Cross-trip distribution, fleet-wide.</p>
          {categoryBreakdown.length === 0 ? (
            <div className="ops-empty">No expenses recorded yet.</div>
          ) : (
            categoryBreakdown.map((c) => (
              <div key={c.id} className="ops-bar-row">
                <span className="ops-bar-label">{c.icon} {c.name}</span>
                <div className="ops-bar-track">
                  <div className="ops-bar-fill" style={{ width: `${c.pct}%` }} />
                </div>
                <span className="ops-bar-val">&#8377;{c.amount.toFixed(2)}</span>
              </div>
            ))
          )}
        </div>

        <div className="ops-card">
          <h3 className="ops-section-title">Top Spenders</h3>
          <p className="ops-section-sub">Ranked across all trips.</p>
          {topSpenders.length === 0 ? (
            <div className="ops-empty">No payer data available yet.</div>
          ) : (
            topSpenders.map((s, idx) => (
              <div key={s.memberId} className="ops-leader-row">
                <span className="ops-leader-rank">{String(idx + 1).padStart(2, '0')}</span>
                <span className="ops-leader-name">{s.name}</span>
                <span className="ops-leader-amt">&#8377;{s.total.toFixed(2)}</span>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="ops-card">
        <h3 className="ops-section-title">Currency Volume Breakdown</h3>
        <p className="ops-section-sub">&nbsp;</p>
        {currencyBreakdown.length === 0 ? (
          <div className="ops-empty">No currency data yet.</div>
        ) : (
          <div className="ops-currency-row">
            {currencyBreakdown.map(([curr, data]) => (
              <div key={curr} className="ops-currency-chip">
                <div className="code">{curr}</div>
                <div className="amt">{getCurrencySymbol(curr)} {data.total.toFixed(2)}</div>
                <div className="cnt">{data.count} transactions</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
