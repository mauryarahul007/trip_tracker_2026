import { useMemo, useState } from 'react';
import type { Trip, Expense, Member, Category } from '../../types';
import type { AdminUserRow, AuditLogEntry } from '../../types/admin';
import type { BugRecord } from '../../services/bugApi';
import type { FeatureRecord } from '../../services/featureApi';
import { formatRelativeTime } from '../../utils/relativeTime';
import { IconRefresh } from '../Icons';
import type { AdminTab } from './AdminPortalLayout';
import { supabase, isMissingSupabaseEnv } from '../../services/supabaseClient';
import { useTripStore } from '../../store/tripStore';
import { RELEASE_PHASES, getPhaseStatus } from '../../utils/featureFlags';
import { convertCurrency, FALLBACK_USD_RATES } from '../../utils/currencyFx';
import { calculateSettlements } from '../../utils/settlement';

interface Props {
  trips: Trip[];
  bugs: BugRecord[];
  features: FeatureRecord[];
  users: AdminUserRow[];
  auditLogs: AuditLogEntry[];
  health: { ok: boolean; label: string };
  expenses?: Expense[];
  members?: Record<string, Member>;
  categories?: Category[];
  onNavigate: (tab: AdminTab) => void;
  onRefresh: () => void | Promise<void>;
  isRefreshing: boolean;
}

function humanizeAction(action: string): string {
  return action.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
}

export function AdminCommandCenterPage({
  trips,
  bugs,
  features,
  users,
  auditLogs,
  health,
  expenses,
  members,
  categories,
  onNavigate,
  onRefresh,
  isRefreshing,
}: Props) {
  const activeTrips = trips.filter((t) => !t.archived);
  const groundedTrips = trips.filter((t) => t.frozen);

  const openBugs = useMemo(() => bugs.filter((b) => b.status === 'open' || b.status === 'in_progress'), [bugs]);
  const criticalBugs = useMemo(
    () => bugs.filter((b) => b.severity === 'critical' && b.status !== 'resolved' && b.status !== 'wont_fix'),
    [bugs]
  );
  const activeFeatureRequests = useMemo(
    () => features.filter((f) => f.status === 'requested' || f.status === 'planned' || f.status === 'in_progress'),
    [features]
  );

  const needsAttention = useMemo(() => {
    type Item = { key: string; severity: 'crit' | 'warn'; title: string; meta: string; onOpen: () => void };
    const items: Item[] = [];
    criticalBugs.slice(0, 4).forEach((b) =>
      items.push({
        key: `bug-${b.id}`,
        severity: 'crit',
        title: `${b.id} — ${b.title}`,
        meta: `Critical · ${b.category} · open ${formatRelativeTime(b.createdAt)}`,
        onOpen: () => onNavigate('bugs'),
      })
    );
    groundedTrips.slice(0, 4).forEach((t) =>
      items.push({
        key: `trip-${t.id}`,
        severity: 'warn',
        title: `${t.name} is grounded`,
        meta: 'Trips · modifications stopped',
        onOpen: () => onNavigate('trips'),
      })
    );
    return items;
  }, [criticalBugs, groundedTrips, onNavigate]);

  const userNameById = useMemo(() => new Map(users.map((u) => [u.id, u.displayName || u.email])), [users]);
  const tripNameById = useMemo(() => new Map(trips.map((t) => [t.id, t.name])), [trips]);

  const [activityFilter, setActivityFilter] = useState<'all' | 'security' | 'trip' | 'user' | 'flag'>('all');
  const [isPinging, setIsPinging] = useState(false);
  const [latencies, setLatencies] = useState<{
    auth: { ms: number; status: 'ok' | 'warn' | 'crit' };
    db: { ms: number; status: 'ok' | 'warn' | 'crit' };
    storage: { ms: number; status: 'ok' | 'warn' | 'crit' };
  } | null>(null);

  const handlePingServices = async () => {
    setIsPinging(true);
    const time = async (fn: () => Promise<boolean>): Promise<{ ms: number; status: 'ok' | 'warn' | 'crit' }> => {
      const start = performance.now();
      try {
        const ok = await fn();
        const ms = Math.round(performance.now() - start);
        if (!ok) return { ms, status: 'crit' };
        return { ms, status: ms > 800 ? 'warn' : 'ok' };
      } catch {
        return { ms: Math.round(performance.now() - start), status: 'crit' };
      }
    };
    try {
      const [auth, db, storage] = await Promise.all([
        time(async () => {
          if (isMissingSupabaseEnv) return false;
          const { error } = await supabase.auth.getSession();
          return !error;
        }),
        time(async () => {
          if (isMissingSupabaseEnv) return false;
          const { error } = await supabase.from('bugs').select('id').limit(1);
          return !error;
        }),
        time(async () => {
          if (isMissingSupabaseEnv) return false;
          const { error } = await supabase.storage.from('receipts').list('', { limit: 1 });
          return !error;
        }),
      ]);
      setLatencies({ auth, db, storage });
    } finally {
      setIsPinging(false);
    }
  };

  const filteredActivity = useMemo(() => {
    let list = auditLogs;
    if (activityFilter === 'security') {
      list = list.filter((l) => l.action.includes('auth') || l.action.includes('admin') || l.action.includes('wipe') || l.action.includes('purge') || l.action.includes('suspend'));
    } else if (activityFilter === 'trip') {
      list = list.filter((l) => l.action.includes('trip') || !!l.tripId);
    } else if (activityFilter === 'user') {
      list = list.filter((l) => l.action.includes('user') || l.action.includes('ban') || l.action.includes('broadcast'));
    } else if (activityFilter === 'flag') {
      list = list.filter((l) => l.action.includes('flag') || l.action.includes('config'));
    }
    return list.slice(0, 8);
  }, [auditLogs, activityFilter]);

  const calendar = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7; // Monday-first
    const eventDays = new Set(
      auditLogs
        .map((l) => new Date(l.createdAt))
        .filter((d) => d.getFullYear() === year && d.getMonth() === month)
        .map((d) => d.getDate())
    );
    return {
      label: now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      today: now.getDate(),
      daysInMonth,
      firstWeekday,
      eventDays,
    };
  }, [auditLogs]);

  const handleExportBugs = () => {
    const blob = new Blob([JSON.stringify(bugs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trip-tracker-bugs-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Concept 4 Bento Data
  const featureFlags = useTripStore((s) => s.featureFlags);
  const phaseStatuses = useMemo(() => {
    return RELEASE_PHASES.map((p) => {
      const pStatus = getPhaseStatus(p.id, featureFlags);
      return {
        id: p.id,
        title: p.title,
        status: pStatus.status, // 'armed' | 'partial' | 'safed'
        activeCount: pStatus.activeCount,
        totalCount: pStatus.totalCount,
        flagCount: p.flagKeys.length,
      };
    });
  }, [featureFlags]);

  // Fallback to store expenses if props are still being loaded or offline
  const storeExpenses = useTripStore((s) => s.expenses);
  const effectiveExpenses = useMemo(() => {
    if (expenses && expenses.length > 0) return expenses;
    return storeExpenses;
  }, [expenses, storeExpenses]);

  // Map trips for currency and active state
  const tripMap = useMemo(() => new Map(trips.map((t) => [t.id, t])), [trips]);

  // Primary platform currency: most common across active trips (default INR)
  const primaryCurrency = useMemo(() => {
    if (trips.length === 0) return 'INR';
    const counts: Record<string, number> = {};
    trips.forEach((t) => {
      const c = (t.baseCurrency || 'INR').toUpperCase();
      counts[c] = (counts[c] || 0) + 1;
    });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return sorted[0]?.[0] || 'INR';
  }, [trips]);

  const currencySymbol = useMemo(() => {
    switch (primaryCurrency) {
      case 'INR': return '₹';
      case 'USD': return '$';
      case 'EUR': return '€';
      case 'GBP': return '£';
      case 'JPY': return '¥';
      default: return `${primaryCurrency} `;
    }
  }, [primaryCurrency]);

  // Filter out internal settlement transfers
  const cleanExpenses = useMemo(() => {
    return effectiveExpenses.filter((e) => !e.title?.startsWith('Settlement:') && !e.isSettlement);
  }, [effectiveExpenses]);

  // Normalized Platform Spend Volume & Fleet Financial KPIs
  const spendMetrics = useMemo(() => {
    if (cleanExpenses.length === 0) {
      return {
        totalNormalizedSpend: 0,
        activeTripSpend: 0,
        avgSpendPerTrip: 0,
        avgTicket: 0,
        sevenDaySpend: 0,
        sevenDayTxCount: 0,
        currencyDistribution: [] as { curr: string; total: number; count: number }[],
        isMultiCurrency: false,
        verifiedReceiptPct: 0,
      };
    }

    let totalNormalized = 0;
    let activeNormalized = 0;
    let sevenDayTotal = 0;
    let sevenDayCount = 0;
    let receiptCount = 0;
    const now = Date.now();
    const SEVEN_DAYS_MS = 7 * 24 * 3600 * 1000;
    const currMap: Record<string, { total: number; count: number }> = {};

    cleanExpenses.forEach((e) => {
      const trip = tripMap.get(e.tripId);
      const fromCurr = (e.currency || trip?.baseCurrency || primaryCurrency).toUpperCase();

      if (!currMap[fromCurr]) currMap[fromCurr] = { total: 0, count: 0 };
      currMap[fromCurr].total += e.amount;
      currMap[fromCurr].count += 1;

      const converted = convertCurrency(e.amount, fromCurr, primaryCurrency, FALLBACK_USD_RATES).convertedAmount;
      totalNormalized += converted;

      if (!trip?.archived) {
        activeNormalized += converted;
      }

      const txTime = new Date(e.date || e.createdAt).getTime();
      if (now - txTime <= SEVEN_DAYS_MS) {
        sevenDayTotal += converted;
        sevenDayCount += 1;
      }

      if (e.receiptImage || e.receiptPath) {
        receiptCount += 1;
      }
    });

    const currDist = Object.entries(currMap)
      .map(([curr, d]) => ({ curr, total: d.total, count: d.count }))
      .sort((a, b) => b.total - a.total);

    return {
      totalNormalizedSpend: totalNormalized,
      activeTripSpend: activeNormalized,
      avgSpendPerTrip: totalNormalized / Math.max(1, activeTrips.length),
      avgTicket: totalNormalized / Math.max(1, cleanExpenses.length),
      sevenDaySpend: sevenDayTotal,
      sevenDayTxCount: sevenDayCount,
      currencyDistribution: currDist,
      isMultiCurrency: currDist.length > 1,
      verifiedReceiptPct: Math.round((receiptCount / cleanExpenses.length) * 100),
    };
  }, [cleanExpenses, tripMap, primaryCurrency, activeTrips.length]);

  // 7-day activity sparkline with normalized daily spend
  const velocityData = useMemo(() => {
    const now = new Date();
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const daysSpend = [0, 0, 0, 0, 0, 0, 0];
    const daysCount = [0, 0, 0, 0, 0, 0, 0];
    const labels = [0, 1, 2, 3, 4, 5, 6].map((offset) => {
      const d = new Date();
      d.setDate(now.getDate() - (6 - offset));
      return offset === 6 ? 'Today' : dayNames[d.getDay()];
    });

    if (cleanExpenses.length > 0) {
      cleanExpenses.forEach((e) => {
        const trip = tripMap.get(e.tripId);
        const fromCurr = (e.currency || trip?.baseCurrency || primaryCurrency).toUpperCase();
        const converted = convertCurrency(e.amount, fromCurr, primaryCurrency, FALLBACK_USD_RATES).convertedAmount;
        const diffDays = Math.floor((now.getTime() - new Date(e.date || e.createdAt).getTime()) / (24 * 3600 * 1000));
        if (diffDays >= 0 && diffDays < 7) {
          daysSpend[6 - diffDays] += converted;
          daysCount[6 - diffDays] += 1;
        }
      });
    }

    const maxSpend = Math.max(...daysSpend, 1);
    return daysSpend.map((spend, i) => ({
      spend,
      count: daysCount[i],
      label: labels[i],
      height: spend > 0 ? Math.max(14, Math.round((spend / maxSpend) * 100)) : (daysCount[i] > 0 ? 20 : 6),
    }));
  }, [cleanExpenses, tripMap, primaryCurrency]);

  // Settlement Overhang & Debt Liquidity
  const settlementHealth = useMemo(() => {
    let settledCount = 0;
    let outstandingVolume = 0;
    activeTrips.forEach((t) => {
      const { balances } = calculateSettlements(t, members || {}, cleanExpenses);
      const outstanding = balances.reduce((sum, b) => sum + (b.balance > 0 ? b.balance : 0), 0);
      if (outstanding < 0.01) settledCount += 1;
      outstandingVolume += outstanding;
    });
    return {
      settledCount,
      outstandingVolume,
      settledPct: activeTrips.length > 0 ? (settledCount / activeTrips.length) * 100 : 0,
    };
  }, [activeTrips, members, cleanExpenses]);

  // Top Spending Category Concentration
  const topCategory = useMemo(() => {
    if (cleanExpenses.length === 0) return null;
    const catMap: Record<string, number> = {};
    cleanExpenses.forEach((e) => {
      catMap[e.category] = (catMap[e.category] || 0) + e.amount;
    });
    const sorted = Object.entries(catMap).sort((a, b) => b[1] - a[1]);
    if (sorted.length === 0) return null;
    const [topCatId, topAmount] = sorted[0];
    const catObj = (categories || []).find((c) => c.id === topCatId);
    const totalRaw = cleanExpenses.reduce((s, e) => s + e.amount, 0);
    return {
      name: catObj?.name || (topCatId.charAt(0).toUpperCase() + topCatId.slice(1)),
      icon: catObj?.icon || '🏷️',
      amount: topAmount,
      pct: totalRaw > 0 ? (topAmount / totalRaw) * 100 : 0,
    };
  }, [cleanExpenses, categories]);

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div className="ops-page-head">
        <div>
          <h2>Command Center</h2>
          <p>Everything that needs your eyes today, in one screen — before you drop into a section.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button type="button" className="ops-btn" disabled={isRefreshing} onClick={() => void onRefresh()}>
            <IconRefresh size={13} className={isRefreshing ? 'icon-sm ops-spin' : 'icon-sm'} /> {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>


      {/* Concept 4 Hero Bento Grid */}
      <div className="ops-bento-hero-grid">
        {/* Bento Card 1: Fleet & Spend Velocity */}
        <div className="ops-bento-card">
          <div>
            <div className="ops-bento-card-title">
              <span>🚀</span> Fleet &amp; Spend Velocity
            </div>
            <p className="ops-bento-card-sub">Real-time throughput across active trips and registered travelers.</p>

            {/* 4-up High Density Stat Grid */}
            <div className="ops-bento-stat-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
              <div className="ops-bento-stat-tile">
                <div className="ops-bento-stat-label">
                  <span>🧭</span> Active Fleet
                </div>
                <div className="ops-bento-stat-val">
                  {activeTrips.length} <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 500 }}>/ {trips.length}</span>
                </div>
                <div className="ops-bento-stat-sub">
                  {groundedTrips.length === 0 ? '🟢 100% Active' : `⚠️ ${groundedTrips.length} Grounded`}
                </div>
              </div>

              <div className="ops-bento-stat-tile">
                <div className="ops-bento-stat-label">
                  <span>🧾</span> Avg Ticket / Size
                </div>
                <div className="ops-bento-stat-val">
                  {currencySymbol}{Math.round(spendMetrics.avgTicket).toLocaleString('en-IN')}
                </div>
                <div className="ops-bento-stat-sub">Per clean transaction</div>
              </div>

              <div className="ops-bento-stat-tile">
                <div className="ops-bento-stat-label">
                  <span>⚖️</span> Settlement Overhang
                </div>
                <div className="ops-bento-stat-val">
                  {currencySymbol}{Math.round(settlementHealth.outstandingVolume).toLocaleString('en-IN')}
                </div>
                <div className="ops-bento-stat-sub">
                  {settlementHealth.settledPct.toFixed(0)}% Trips Settled
                </div>
              </div>

              <div className="ops-bento-stat-tile">
                <div className="ops-bento-stat-label">
                  <span>🏷️</span> Top Category
                </div>
                <div className="ops-bento-stat-val" style={{ fontSize: '14.5px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {topCategory ? `${topCategory.icon} ${topCategory.name}` : '—'}
                </div>
                <div className="ops-bento-stat-sub">
                  {topCategory ? `${topCategory.pct.toFixed(0)}% of total volume` : 'No category data'}
                </div>
              </div>
            </div>

            {/* Dedicated Spend & Velocity KPI Container */}
            <div className="ops-spend-kpi-container">
              <div className="ops-spend-kpi-head">
                <span className="ops-spend-kpi-label">
                  <span>💳</span> Platform Spend Volume
                </span>
                <span className="ops-spend-kpi-badge">
                  {spendMetrics.isMultiCurrency ? `${primaryCurrency} (Normalized FX)` : primaryCurrency}
                </span>
              </div>
              <div>
                <div className="ops-spend-kpi-val">
                  {currencySymbol}{Math.round(spendMetrics.totalNormalizedSpend).toLocaleString('en-IN')}
                </div>
                <div className="ops-spend-kpi-note">
                  {cleanExpenses.length} expense{cleanExpenses.length === 1 ? '' : 's'} logged &middot; {currencySymbol}{Math.round(spendMetrics.sevenDaySpend).toLocaleString('en-IN')} this week
                  {spendMetrics.isMultiCurrency && (
                    <span style={{ display: 'block', marginTop: '2px', color: 'var(--text-tertiary)', fontSize: '9.5px' }}>
                      Breakdown: {spendMetrics.currencyDistribution.map((c) => `${c.curr} ${Math.round(c.total).toLocaleString('en-IN')}`).join(' · ')}
                    </span>
                  )}
                </div>
              </div>

              {/* Sparkline Bar Chart */}
              <div className="ops-bento-spark-strip" title="7-day activity velocity">
                {velocityData.map((item, i) => (
                  <div
                    key={i}
                    className="ops-bento-spark-col"
                    title={`${currencySymbol}${Math.round(item.spend).toLocaleString('en-IN')} · ${item.count} expense(s) (${item.label})`}
                  >
                    <div className="ops-bento-spark-bar" style={{ height: `${item.height}%` }} />
                    <span className="ops-bento-spark-day">{item.label.slice(0, 1)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '10px', paddingTop: '8px', borderTop: '1px solid var(--line)' }}>
              <button
                type="button"
                className="ops-btn"
                style={{ fontSize: '11px', padding: '5px 10px', flex: 1, justifyContent: 'center' }}
                onClick={() => onNavigate('bugs')}
              >
                🐛 {openBugs.length} Bugs {criticalBugs.length > 0 ? `(${criticalBugs.length} crit)` : ''}
              </button>
              <button
                type="button"
                className="ops-btn"
                style={{ fontSize: '11px', padding: '5px 10px', flex: 1, justifyContent: 'center' }}
                onClick={() => onNavigate('features')}
              >
                ✨ {activeFeatureRequests.length} Features
              </button>
            </div>
          </div>
        </div>

        {/* Bento Card 2: Release Train Milestones */}
        <div className="ops-bento-card">
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="ops-bento-card-title" style={{ margin: 0 }}>
                <span>🎯</span> Release Train Milestones
              </div>
              <span className="ops-badge active" style={{ fontSize: '10px', padding: '2px 8px' }}>5 Tracks</span>
            </div>
            <p className="ops-bento-card-sub" style={{ marginTop: '4px' }}>Progressive release milestones &amp; feature gate control.</p>

            <div className="ops-milestone-rail">
              {phaseStatuses.map((phase) => (
                <div
                  key={phase.id}
                  className="ops-milestone-chip"
                  data-armed={phase.status === 'armed'}
                  data-staged={phase.status === 'safed'}
                  title={`${phase.title} · ${phase.activeCount}/${phase.totalCount} active flags`}
                >
                  <div className="ops-milestone-chip-info">
                    <div className="ops-milestone-chip-title">
                      {phase.id === 'deferred' ? 'Phase 5 · Extras' : phase.id.replace('phase', 'Phase ')}
                    </div>
                    <div className="ops-milestone-chip-sub">
                      {phase.title}
                    </div>
                  </div>
                  <span
                    className="ops-milestone-chip-badge"
                    data-status={phase.status}
                  >
                    {phase.status === 'armed' ? '🟢 Armed' : phase.status === 'partial' ? '🟡 Partial' : '⚪ Safe'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', paddingTop: '8px', borderTop: '1px solid var(--line)' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Global feature switches active</span>
            <button
              type="button"
              className="ops-btn"
              style={{ fontSize: '11px', padding: '4px 8px' }}
              onClick={() => onNavigate('flags')}
            >
              Manage Release Train &rarr;
            </button>
          </div>
        </div>


        {/* Bento Card 3: Real-Time Heartbeat & Telemetry */}
        <div className="ops-bento-card">
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="ops-bento-card-title" style={{ margin: 0 }}>
                <span>📡</span> Service Heartbeat
              </div>
              <span
                className={`ops-badge ${
                  !latencies
                    ? 'archived'
                    : Object.values(latencies).some((l) => l.status === 'crit')
                      ? 'grounded'
                      : Object.values(latencies).some((l) => l.status === 'warn')
                        ? 'caution'
                        : 'active'
                }`}
                style={{ fontSize: '10px' }}
              >
                {latencies
                  ? Object.values(latencies).some((l) => l.status === 'crit')
                    ? 'Degraded'
                    : 'Nominal'
                  : 'Idle'}
              </span>
            </div>
            <p className="ops-bento-card-sub" style={{ marginTop: '4px' }}>Supabase edge &amp; API response latencies.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', margin: '10px 0' }}>
              {(
                [
                  ['Auth Session', latencies?.auth],
                  ['Postgres Query', latencies?.db],
                  ['Storage Receipts', latencies?.storage],
                ] as const
              ).map(([label, probe]) => (
                <div
                  key={label}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: 'var(--r-sm)',
                    background: 'var(--bg-inset)',
                    border: '1px solid var(--line)',
                    fontSize: '11.5px',
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className={`ops-radar-dot ${probe?.status ?? 'idle'}`} />
                    <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{label}</span>
                  </span>
                  <span
                    style={{
                      fontFamily: 'var(--mono)',
                      fontSize: '10.5px',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: 'var(--r-xs)',
                      background: 'var(--bg-panel)',
                      border: '1px solid var(--line)',
                      color:
                        probe?.status === 'crit'
                          ? 'var(--danger)'
                          : probe?.status === 'warn'
                            ? 'var(--warning)'
                            : 'var(--text-primary)',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {probe ? `${probe.ms} ms` : '—'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <button
            type="button"
            className="ops-btn"
            disabled={isPinging}
            onClick={() => void handlePingServices()}
            style={{ width: '100%', justifyContent: 'center', marginTop: '6px' }}
          >
            <IconRefresh size={13} className={isPinging ? 'icon-sm ops-spin' : 'icon-sm'} />
            {isPinging ? 'Pinging Services...' : 'Ping Services Now'}
          </button>
        </div>
      </div>

      <div className="ops-split-row">
        <div className="ops-card">
          <h3 className="ops-section-title">Needs attention</h3>
          <p className="ops-section-sub">Pulled live from the Bug Ledger and Trips — nothing here is manually curated.</p>
          {needsAttention.length === 0 ? (
            <div className="ops-empty">Nothing needs attention right now.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {needsAttention.map((item) => (
                <div
                  className="ops-attn-row"
                  key={item.key}
                  role="button"
                  tabIndex={0}
                  onClick={item.onOpen}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); item.onOpen(); } }}
                  style={{ cursor: 'pointer' }}
                >
                  <div className={`ops-attn-stripe ${item.severity}`} />
                  <div className="body">
                    <div>
                      <h4 title={item.title}>{item.title}</h4>
                      <p title={item.meta}>{item.meta}</p>
                    </div>
                    <button type="button" className="ops-btn" onClick={item.onOpen}>
                      Open
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="ops-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
            <h3 className="ops-section-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="ops-live-pulse-dot" /> Live Fleet Stream
            </h3>
            <div style={{ display: 'flex', gap: '4px' }}>
              {(['all', 'security', 'trip', 'user', 'flag'] as const).map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className="ops-btn"
                  style={{
                    padding: '2px 7px',
                    fontSize: '10.5px',
                    textTransform: 'uppercase',
                    background: activityFilter === tag ? 'var(--line-strong)' : 'transparent',
                    color: activityFilter === tag ? 'var(--text-primary)' : 'var(--text-tertiary)',
                  }}
                  onClick={() => setActivityFilter(tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
          <p className="ops-section-sub">Real-time audit &amp; security event telemetry.</p>
          {filteredActivity.length === 0 ? (
            <div className="ops-empty">No {activityFilter === 'all' ? '' : activityFilter} events recorded yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {filteredActivity.map((l) => (
                <div key={l.id} style={{ fontSize: '11.5px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <code className="ops-flag-key" title={new Date(l.createdAt).toLocaleString()} style={{ flexShrink: 0, fontSize: '10px' }}>
                    {formatRelativeTime(l.createdAt)}
                  </code>
                  <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <strong style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                      {(l.actorUserId && userNameById.get(l.actorUserId)) || 'System'}
                    </strong>
                    {' '}&middot; {humanizeAction(l.action)}
                    {l.tripId && tripNameById.get(l.tripId) ? ` · ${tripNameById.get(l.tripId)}` : ''}
                  </span>
                </div>
              ))}
            </div>
          )}
          <button type="button" className="ops-btn" style={{ width: '100%', justifyContent: 'center', marginTop: '12px' }} onClick={() => onNavigate('audit')}>
            View full audit log &rarr;
          </button>
        </div>

        <div className="ops-card">
          <div className="ops-cal-head">
            <h3 className="ops-section-title" style={{ margin: 0 }}>Calendar</h3>
          </div>
          <p className="ops-section-sub" style={{ marginTop: '-4px' }}>{calendar.label} &middot; dots mark days with audit activity</p>
          <div className="ops-cal-grid">
            {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((d) => (
              <div className="hd" key={d}>{d}</div>
            ))}
            {Array.from({ length: calendar.firstWeekday }).map((_, i) => (
              <div className="ops-cal-day faint" key={`pad-${i}`} />
            ))}
            {Array.from({ length: calendar.daysInMonth }).map((_, i) => {
              const day = i + 1;
              const isToday = day === calendar.today;
              return (
                <div className={`ops-cal-day${isToday ? ' today' : ''}`} key={day}>
                  {day}
                  {calendar.eventDays.has(day) && <span className="evt" />}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="ops-card">
        <h3 className="ops-section-title">Quick actions</h3>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '10px' }}>
          <button type="button" className="ops-btn" onClick={() => onNavigate('users')}>
            Broadcast notification
          </button>
          <button type="button" className="ops-btn" onClick={() => onNavigate('bugs')}>
            Open bug ledger
          </button>
          <button type="button" className="ops-btn" onClick={handleExportBugs}>
            Export bug ledger
          </button>
          <button type="button" className="ops-btn" disabled={isRefreshing} onClick={() => void onRefresh()}>
            {isRefreshing ? 'Refreshing...' : 'Refresh all data'}
          </button>
        </div>
      </div>

      {!health.ok && (
        <div className="ops-notice" style={{ background: 'var(--warning-dim)', borderColor: 'var(--warning-line)' }}>
          <strong style={{ color: 'var(--warning)' }}>Heads up:</strong> {health.label}. Check the Bug Ledger and Trips sections above.
        </div>
      )}
    </div>
  );
}
