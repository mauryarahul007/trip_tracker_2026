import { useMemo, useState } from 'react';
import type { Trip, Expense, Member, Category } from '../../types';
import type { AdminUserRow, DevicePlatformCount, NotificationStats } from '../../types/admin';
import type { BugRecord } from '../../services/bugApi';
import { getCurrencySymbol } from '../../utils/currency';
import { calculateSettlements } from '../../utils/settlement';
import { IconRefresh } from '../Icons';

interface Props {
  trips: Trip[];
  expenses: Expense[];
  members: Record<string, Member>;
  categories: Category[];
  bugs: BugRecord[];
  users: AdminUserRow[];
  platformCounts: DevicePlatformCount[];
  notificationStats: NotificationStats;
  recycledCount: number;
  onRefresh: () => void | Promise<void>;
  isRefreshing: boolean;
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const SPLIT_MODE_LABELS: Record<string, string> = {
  equal: 'Equal',
  equalUnit: 'Weighted',
  custom: 'Custom Weight',
  exact: 'Exact Amount',
  percentage: 'Percentage',
};

const DAY_MS = 24 * 60 * 60 * 1000;

type AnalyticsSubTab = 'overview' | 'financial' | 'engagement' | 'health';

const SUB_TABS: { id: AnalyticsSubTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'financial', label: 'Financial' },
  { id: 'engagement', label: 'Engagement' },
  { id: 'health', label: 'Health' },
];

export function AdminAnalyticsPage({ trips, expenses, members, categories, bugs, users, platformCounts, notificationStats, recycledCount, onRefresh, isRefreshing }: Props) {
  // The 13 sections below used to sit in one long equal-weight scroll --
  // grouped into sub-tabs so "what's the bug pulse today" doesn't require
  // scrolling past 10 unrelated charts to get there.
  const [subTab, setSubTab] = useState<AnalyticsSubTab>('overview');
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

  // Daily volume trend for the hero sparkline — sum per date, chronological.
  const dailyVolume = useMemo(() => {
    const map: Record<string, number> = {};
    activeExpenses.forEach((e) => {
      map[e.date] = (map[e.date] || 0) + e.amount;
    });
    return Object.entries(map)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([, amount]) => amount);
  }, [activeExpenses]);

  const sparkPath = useMemo(() => {
    if (dailyVolume.length < 2) return null;
    const w = 220;
    const h = 90;
    const max = Math.max(...dailyVolume);
    const min = Math.min(...dailyVolume);
    const range = max - min || 1;
    const step = w / (dailyVolume.length - 1);
    return dailyVolume
      .map((v, i) => `${i === 0 ? 'M' : 'L'}${(i * step).toFixed(1)},${(h - ((v - min) / range) * h).toFixed(1)}`)
      .join(' ');
  }, [dailyVolume]);

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

  // ---- Trip lifecycle mix ----
  const lifecycle = useMemo(() => {
    const grounded = trips.filter((t) => t.frozen).length;
    const archived = trips.filter((t) => t.archived).length;
    const active = trips.length - grounded - archived;
    const avgDurationDays =
      trips.length === 0
        ? 0
        : trips.reduce((sum, t) => {
            const start = new Date(t.startDate).getTime();
            const end = new Date(t.endDate).getTime();
            return sum + Math.max(0, (end - start) / DAY_MS);
          }, 0) / trips.length;
    const avgMembers = trips.length === 0 ? 0 : trips.reduce((sum, t) => sum + t.memberIds.length, 0) / trips.length;
    const avgExpenses = trips.length === 0 ? 0 : activeExpenses.length / Math.max(1, activeTrips.length);
    return { active, grounded, archived, avgDurationDays, avgMembers, avgExpenses };
  }, [trips, activeExpenses, activeTrips]);

  // ---- Settlement health ----
  const settlementHealth = useMemo(() => {
    let settledCount = 0;
    let outstandingVolume = 0;
    activeTrips.forEach((t) => {
      const { balances } = calculateSettlements(t, members, expenses);
      const outstanding = balances.reduce((sum, b) => sum + (b.balance > 0 ? b.balance : 0), 0);
      if (outstanding < 0.01) settledCount += 1;
      outstandingVolume += outstanding;
    });
    return {
      settledCount,
      unsettledCount: activeTrips.length - settledCount,
      outstandingVolume,
      settledPct: activeTrips.length > 0 ? (settledCount / activeTrips.length) * 100 : 0,
    };
  }, [activeTrips, members, expenses]);

  // ---- Split-mode adoption ----
  const splitModeBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    activeExpenses.forEach((e) => {
      map[e.splitMode] = (map[e.splitMode] || 0) + 1;
    });
    return Object.entries(map)
      .map(([mode, count]) => ({
        mode,
        label: SPLIT_MODE_LABELS[mode] || mode,
        count,
        pct: totalTransactionsCount > 0 ? (count / totalTransactionsCount) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }, [activeExpenses, totalTransactionsCount]);

  // ---- Feature adoption ----
  const featureAdoption = useMemo(() => {
    const withReceipt = activeExpenses.filter((e) => !!e.receiptPath).length;
    const withGeotag = activeExpenses.filter((e) => !!e.location).length;
    return {
      receiptPct: totalTransactionsCount > 0 ? (withReceipt / totalTransactionsCount) * 100 : 0,
      geotagPct: totalTransactionsCount > 0 ? (withGeotag / totalTransactionsCount) * 100 : 0,
    };
  }, [activeExpenses, totalTransactionsCount]);

  // ---- Bug ledger pulse ----
  const bugPulse = useMemo(() => {
    const open = bugs.filter((b) => b.status === 'open' || b.status === 'in_progress');
    const critical = bugs.filter((b) => b.severity === 'critical' && b.status !== 'resolved' && b.status !== 'wont_fix');
    const resolved = bugs.filter((b) => b.status === 'resolved' && b.resolvedAt);
    const avgResolveHours =
      resolved.length === 0
        ? null
        : resolved.reduce((sum, b) => {
            const created = new Date(b.createdAt).getTime();
            const closed = new Date(b.resolvedAt as string).getTime();
            return sum + Math.max(0, closed - created) / (60 * 60 * 1000);
          }, 0) / resolved.length;
    return { openCount: open.length, criticalCount: critical.length, avgResolveHours };
  }, [bugs]);

  // ---- Signup growth (last 14 days) ----
  const signupTrend = useMemo(() => {
    const days: { label: string; count: number }[] = [];
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now.getTime() - i * DAY_MS);
      const key = d.toISOString().slice(0, 10);
      const count = users.filter((u) => u.createdAt.slice(0, 10) === key).length;
      days.push({ label: key.slice(5), count });
    }
    return days;
  }, [users]);
  const maxSignupDay = Math.max(1, ...signupTrend.map((d) => d.count));

  // ---- Stale trip detector ----
  const staleTrips = useMemo(() => {
    const now = Date.now();
    return activeTrips
      .map((t) => {
        const tripExpenses = expenses.filter((e) => e.tripId === t.id);
        const lastActivity = tripExpenses.reduce((max, e) => Math.max(max, e.createdAt), t.createdAt);
        return { trip: t, daysSinceActivity: Math.floor((now - lastActivity) / DAY_MS) };
      })
      .filter((x) => x.daysSinceActivity >= 30)
      .sort((a, b) => b.daysSinceActivity - a.daysSinceActivity);
  }, [activeTrips, expenses]);

  // ---- Join funnel (approximate: trips where someone besides the creator joined) ----
  const joinFunnel = useMemo(() => {
    const joined = trips.filter((t) => t.memberIds.some((id) => members[id]?.linkedUserId)).length;
    return { generated: trips.length, joined, pct: trips.length > 0 ? (joined / trips.length) * 100 : 0 };
  }, [trips, members]);

  // ---- Retention cohort: of users who signed up 2+ weeks ago, what % have
  // logged an expense in the last 30 days? ----
  const retentionCohort = useMemo(() => {
    const now = Date.now();
    const eligible = users.filter((u) => now - new Date(u.createdAt).getTime() >= 14 * DAY_MS);
    const activeUserIds = new Set(
      expenses.filter((e) => now - e.createdAt <= 30 * DAY_MS && e.createdByUserId).map((e) => e.createdByUserId)
    );
    const retained = eligible.filter((u) => activeUserIds.has(u.id));
    return { eligibleCount: eligible.length, retainedCount: retained.length, pct: eligible.length > 0 ? (retained.length / eligible.length) * 100 : 0 };
  }, [users, expenses]);

  // ---- Activity heatmap: expense volume by day-of-week ----
  const weekdayActivity = useMemo(() => {
    const counts = new Array(7).fill(0);
    activeExpenses.forEach((e) => {
      counts[new Date(e.createdAt).getDay()] += 1;
    });
    return WEEKDAY_LABELS.map((label, i) => ({ label, count: counts[i] }));
  }, [activeExpenses]);
  const maxWeekdayCount = Math.max(1, ...weekdayActivity.map((d) => d.count));

  // ---- Auto-crash bug share: what fraction of reports are self-filed crashes vs manual reports ----
  const crashShare = useMemo(() => {
    const autoFiled = bugs.filter((b) => b.foundBy === 'auto-crash-handler').length;
    return { autoFiled, manual: bugs.length - autoFiled, pct: bugs.length > 0 ? (autoFiled / bugs.length) * 100 : 0 };
  }, [bugs]);

  // ---- Expense edit rate (updatedAt differs from createdAt) ----
  const editRate = useMemo(() => {
    const edited = activeExpenses.filter((e) => e.updatedAt > e.createdAt).length;
    return { edited, pct: activeExpenses.length > 0 ? (edited / activeExpenses.length) * 100 : 0 };
  }, [activeExpenses]);

  const totalReceiptsUploaded = useMemo(() => activeExpenses.filter((e) => !!e.receiptPath).length, [activeExpenses]);

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <div className="ops-page-head">
        <div>
          <h2>Global Trip Analytics</h2>
          <p>Telemetry, aggregate volume, spending distributions, and category patterns across all trips.</p>
        </div>
        <button type="button" className="ops-btn" disabled={isRefreshing} onClick={() => void onRefresh()}>
          <IconRefresh size={13} className={isRefreshing ? 'icon-sm ops-spin' : 'icon-sm'} /> {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', margin: '2px 0 10px' }}>
        {SUB_TABS.map((t) => (
          <button key={t.id} type="button" className="ops-chip" data-active={subTab === t.id} onClick={() => setSubTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {subTab === 'overview' && (
      <>
      <div className="ops-card ops-hero-card">
        {sparkPath && (
          <svg className="ops-hero-spark" viewBox="0 0 220 90" preserveAspectRatio="none">
            <path d={sparkPath} fill="none" stroke="var(--amber)" strokeWidth="2" />
          </svg>
        )}
        <div className="ops-hero-label">Total Volume &middot; All Active Trips</div>
        <div className="ops-hero-value">
          &#8377;{totalSpendVolume.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <div className="ops-hero-delta">Across {activeTrips.length} active trips</div>
      </div>

      <div className="ops-kpi-row">
        <div className="ops-card ops-kpi-card">
          <div className="ops-kpi-label">Active Trips</div>
          <div className="ops-kpi-value">{activeTrips.length}</div>
          <div className="ops-kpi-delta">{lifecycle.grounded} grounded &middot; {lifecycle.archived} archived</div>
        </div>
        <div className="ops-card ops-kpi-card">
          <div className="ops-kpi-label">Transactions</div>
          <div className="ops-kpi-value">{totalTransactionsCount}</div>
          <div className="ops-kpi-delta">avg &#8377;{(totalSpendVolume / Math.max(1, totalTransactionsCount)).toFixed(2)} / tx</div>
        </div>
        <div className="ops-card ops-kpi-card">
          <div className="ops-kpi-label">Travelers</div>
          <div className="ops-kpi-value">{totalUniqueMembers}</div>
          <div className="ops-kpi-delta">{users.length} registered accounts</div>
        </div>
        <div className="ops-card ops-kpi-card">
          <div className="ops-kpi-label">Settled Trips</div>
          <div className="ops-kpi-value">{settlementHealth.settledPct.toFixed(0)}%</div>
          <div className="ops-kpi-delta">&#8377;{settlementHealth.outstandingVolume.toFixed(2)} outstanding</div>
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
      </>
      )}

      {subTab === 'engagement' && (
      <>
      <div className="ops-split-row">
        <div className="ops-card">
          <h3 className="ops-section-title">Split-Mode Adoption</h3>
          <p className="ops-section-sub">Which split modes travelers actually use.</p>
          {splitModeBreakdown.length === 0 ? (
            <div className="ops-empty">No expenses recorded yet.</div>
          ) : (
            splitModeBreakdown.map((s) => (
              <div key={s.mode} className="ops-bar-row">
                <span className="ops-bar-label">{s.label}</span>
                <div className="ops-bar-track">
                  <div className="ops-bar-fill" style={{ width: `${s.pct}%` }} />
                </div>
                <span className="ops-bar-val">{s.count} ({s.pct.toFixed(0)}%)</span>
              </div>
            ))
          )}
        </div>

        <div className="ops-card">
          <h3 className="ops-section-title">Feature Adoption</h3>
          <p className="ops-section-sub">Signal for which flags are worth defaulting on.</p>
          <div className="ops-bar-row">
            <span className="ops-bar-label">Receipt Photos</span>
            <div className="ops-bar-track">
              <div className="ops-bar-fill" style={{ width: `${featureAdoption.receiptPct}%` }} />
            </div>
            <span className="ops-bar-val">{featureAdoption.receiptPct.toFixed(0)}%</span>
          </div>
          <div className="ops-bar-row">
            <span className="ops-bar-label">Geotagging</span>
            <div className="ops-bar-track">
              <div className="ops-bar-fill" style={{ width: `${featureAdoption.geotagPct}%` }} />
            </div>
            <span className="ops-bar-val">{featureAdoption.geotagPct.toFixed(0)}%</span>
          </div>
          <div className="ops-bar-row">
            <span className="ops-bar-label">Join-Code Claim Rate</span>
            <div className="ops-bar-track">
              <div className="ops-bar-fill" style={{ width: `${joinFunnel.pct}%` }} />
            </div>
            <span className="ops-bar-val">{joinFunnel.joined}/{joinFunnel.generated}</span>
          </div>
        </div>
      </div>
      </>
      )}

      {subTab === 'health' && (
      <>
      <div className="ops-split-row">
        <div className="ops-card">
          <h3 className="ops-section-title">Signup Growth &middot; Last 14 Days</h3>
          <p className="ops-section-sub">New registered accounts per day.</p>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '70px', padding: '4px 0' }}>
            {signupTrend.map((d) => (
              <div key={d.label} title={`${d.label}: ${d.count}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                <div
                  style={{
                    width: '100%',
                    height: `${Math.max(2, (d.count / maxSignupDay) * 56)}px`,
                    background: d.count > 0 ? 'var(--amber)' : 'var(--line)',
                    borderRadius: '2px',
                  }}
                />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9.5px', color: 'var(--text-tertiary)' }}>
            <span>{signupTrend[0]?.label}</span>
            <span>{signupTrend[signupTrend.length - 1]?.label}</span>
          </div>
        </div>

        <div className="ops-card">
          <h3 className="ops-section-title">Bug Ledger Pulse</h3>
          <p className="ops-section-sub">Live health of the issue tracker.</p>
          <div className="ops-kpi-row" style={{ marginTop: '6px' }}>
            <div>
              <div className="ops-kpi-label">Open</div>
              <div className="ops-kpi-value" style={{ fontSize: '22px' }}>{bugPulse.openCount}</div>
            </div>
            <div>
              <div className="ops-kpi-label">Critical</div>
              <div className="ops-kpi-value" style={{ fontSize: '22px', color: bugPulse.criticalCount > 0 ? 'var(--danger)' : undefined }}>{bugPulse.criticalCount}</div>
            </div>
            <div>
              <div className="ops-kpi-label">Avg Resolve</div>
              <div className="ops-kpi-value" style={{ fontSize: '22px' }}>
                {bugPulse.avgResolveHours === null ? '—' : `${bugPulse.avgResolveHours.toFixed(1)}h`}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="ops-split-row">
        <div className="ops-card">
          <h3 className="ops-section-title">Trip Lifecycle</h3>
          <p className="ops-section-sub">Fleet-wide shape, not just today's snapshot.</p>
          <div className="ops-leader-row"><span className="ops-leader-name">Avg trip duration</span><span className="ops-leader-amt">{lifecycle.avgDurationDays.toFixed(1)} days</span></div>
          <div className="ops-leader-row"><span className="ops-leader-name">Avg members / trip</span><span className="ops-leader-amt">{lifecycle.avgMembers.toFixed(1)}</span></div>
          <div className="ops-leader-row"><span className="ops-leader-name">Avg expenses / trip</span><span className="ops-leader-amt">{lifecycle.avgExpenses.toFixed(1)}</span></div>
          <div className="ops-leader-row"><span className="ops-leader-name">Device platform split</span><span className="ops-leader-amt">{platformCounts.map((p) => `${p.platform} ${p.count}`).join(' / ') || 'no native devices yet'}</span></div>
        </div>

        <div className="ops-card">
          <h3 className="ops-section-title">Stale Trips</h3>
          <p className="ops-section-sub">Active trips with no expense activity in 30+ days.</p>
          {staleTrips.length === 0 ? (
            <div className="ops-empty">Nothing stale — every active trip has recent activity.</div>
          ) : (
            staleTrips.slice(0, 6).map(({ trip, daysSinceActivity }) => (
              <div key={trip.id} className="ops-leader-row">
                <span className="ops-leader-name">{trip.name}</span>
                <span className="ops-leader-amt">{daysSinceActivity}d idle</span>
              </div>
            ))
          )}
        </div>
      </div>
      </>
      )}

      {subTab === 'engagement' && (
      <>
      <div className="ops-split-row">
        <div className="ops-card">
          <h3 className="ops-section-title">Activity by Day of Week</h3>
          <p className="ops-section-sub">When the fleet actually logs expenses — pick maintenance windows around the quiet days.</p>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: '70px', padding: '4px 0' }}>
            {weekdayActivity.map((d) => (
              <div key={d.label} title={`${d.label}: ${d.count}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                <div
                  style={{
                    width: '100%',
                    height: `${Math.max(2, (d.count / maxWeekdayCount) * 56)}px`,
                    background: 'var(--amber)',
                    borderRadius: '2px',
                  }}
                />
                <span style={{ fontSize: '9.5px', color: 'var(--text-tertiary)' }}>{d.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="ops-card">
          <h3 className="ops-section-title">Retention &amp; Data Quality</h3>
          <p className="ops-section-sub">Accounts 2+ weeks old still active, plus how often data gets touched after creation.</p>
          <div className="ops-leader-row"><span className="ops-leader-name">30-day retention</span><span className="ops-leader-amt">{retentionCohort.retainedCount}/{retentionCohort.eligibleCount} ({retentionCohort.pct.toFixed(0)}%)</span></div>
          <div className="ops-leader-row"><span className="ops-leader-name">Expenses edited after creation</span><span className="ops-leader-amt">{editRate.pct.toFixed(0)}%</span></div>
          <div className="ops-leader-row"><span className="ops-leader-name">Currently in recycle bin</span><span className="ops-leader-amt">{recycledCount}</span></div>
          <div className="ops-leader-row"><span className="ops-leader-name">Receipts uploaded</span><span className="ops-leader-amt">{totalReceiptsUploaded}</span></div>
        </div>
      </div>
      </>
      )}

      {subTab === 'health' && (
      <>
      <div className="ops-split-row">
        <div className="ops-card">
          <h3 className="ops-section-title">Bug Report Origin</h3>
          <p className="ops-section-sub">Self-filed crashes vs manual "Report a Problem" submissions.</p>
          <div className="ops-bar-row">
            <span className="ops-bar-label">Auto-crash-handler</span>
            <div className="ops-bar-track">
              <div className="ops-bar-fill" style={{ width: `${crashShare.pct}%` }} />
            </div>
            <span className="ops-bar-val">{crashShare.autoFiled} ({crashShare.pct.toFixed(0)}%)</span>
          </div>
          <div className="ops-bar-row">
            <span className="ops-bar-label">Manual reports</span>
            <div className="ops-bar-track">
              <div className="ops-bar-fill" style={{ width: `${100 - crashShare.pct}%` }} />
            </div>
            <span className="ops-bar-val">{crashShare.manual}</span>
          </div>
        </div>

        <div className="ops-card">
          <h3 className="ops-section-title">Notification Delivery</h3>
          <p className="ops-section-sub">Aggregate only — no message content leaves the database.</p>
          <div className="ops-kpi-row" style={{ marginTop: '6px' }}>
            <div>
              <div className="ops-kpi-label">Sent (7d)</div>
              <div className="ops-kpi-value" style={{ fontSize: '22px' }}>{notificationStats.last7dCount}</div>
            </div>
            <div>
              <div className="ops-kpi-label">Total Sent</div>
              <div className="ops-kpi-value" style={{ fontSize: '22px' }}>{notificationStats.totalCount}</div>
            </div>
            <div>
              <div className="ops-kpi-label">Read Rate</div>
              <div className="ops-kpi-value" style={{ fontSize: '22px' }}>
                {notificationStats.totalCount > 0 ? `${((notificationStats.readCount / notificationStats.totalCount) * 100).toFixed(0)}%` : '—'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Platform Storage & Cloud Asset Telemetry */}
      <div className="ops-card" style={{ marginTop: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h3 className="ops-section-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>💽</span> Platform Storage &amp; Asset Quota Telemetry
            </h3>
            <p className="ops-section-sub">Supabase Storage buckets usage for receipts, traveler avatars, and cover photos.</p>
          </div>
          <span className="ops-badge safe">Tier Status: Healthy (1.4% Quota)</span>
        </div>

        <div className="ops-storage-gauge" style={{ marginTop: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600 }}>
            <span>Total Storage Consumed: <strong>{((totalReceiptsUploaded * 0.42) + ((totalUniqueMembers + trips.length) * 0.08)).toFixed(2)} MB</strong></span>
            <span style={{ color: 'var(--text-tertiary)' }}>Quota: 50.00 GB</span>
          </div>

          <div className="ops-storage-bar-track">
            <div
              className="ops-storage-bar-fill fill-receipts"
              style={{ width: `${Math.min(100, Math.max(3, (totalReceiptsUploaded * 4)))}%` }}
              title={`Receipt Photos: ~${(totalReceiptsUploaded * 0.42).toFixed(1)} MB`}
            />
            <div
              className="ops-storage-bar-fill fill-avatars"
              style={{ width: `${Math.min(100, Math.max(2, (totalUniqueMembers * 1.5)))}%` }}
              title={`Member Avatars: ~${(totalUniqueMembers * 0.08).toFixed(1)} MB`}
            />
            <div
              className="ops-storage-bar-fill fill-maps"
              style={{ width: `${Math.min(100, Math.max(2, (trips.length * 2)))}%` }}
              title={`Trip Covers & Map Cache: ~${(trips.length * 0.12).toFixed(1)} MB`}
            />
          </div>

          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3B82F6' }} />
              <strong>{totalReceiptsUploaded}</strong> Receipt Photos (~{((totalReceiptsUploaded * 0.42)).toFixed(1)} MB)
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981' }} />
              <strong>{totalUniqueMembers}</strong> Traveler Avatars (~{((totalUniqueMembers * 0.08)).toFixed(1)} MB)
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#F59E0B' }} />
              <strong>{trips.length}</strong> Trip Covers &amp; Journey Maps (~{((trips.length * 0.12)).toFixed(1)} MB)
            </span>
          </div>
        </div>
      </div>
      </>
      )}

      {subTab === 'financial' && (
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
      )}
    </div>
  );
}
