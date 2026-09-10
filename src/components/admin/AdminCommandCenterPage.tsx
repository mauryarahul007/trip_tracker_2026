import { useMemo, useState } from 'react';
import type { Trip } from '../../types';
import type { AdminUserRow, AuditLogEntry } from '../../types/admin';
import type { BugRecord } from '../../services/bugApi';
import type { FeatureRecord } from '../../services/featureApi';
import { formatRelativeTime } from '../../utils/relativeTime';
import { IconRefresh } from '../Icons';
import type { AdminTab } from './AdminPortalLayout';
import { supabase, isMissingSupabaseEnv } from '../../services/supabaseClient';

interface Props {
  trips: Trip[];
  bugs: BugRecord[];
  features: FeatureRecord[];
  users: AdminUserRow[];
  auditLogs: AuditLogEntry[];
  health: { ok: boolean; label: string };
  onNavigate: (tab: AdminTab) => void;
  onRefresh: () => void | Promise<void>;
  isRefreshing: boolean;
}

function humanizeAction(action: string): string {
  return action.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
}

export function AdminCommandCenterPage({ trips, bugs, features, users, auditLogs, health, onNavigate, onRefresh, isRefreshing }: Props) {
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

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div className="ops-page-head">
        <div>
          <h2>Command Center</h2>
          <p>Everything that needs your eyes today, in one screen — before you drop into a section.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button type="button" className="ops-btn" disabled={isPinging} onClick={() => void handlePingServices()}>
            <IconRefresh size={13} className={isPinging ? 'icon-sm ops-spin' : 'icon-sm'} /> {isPinging ? 'Pinging Services...' : 'Ping Services'}
          </button>
          <button type="button" className="ops-btn" disabled={isRefreshing} onClick={() => void onRefresh()}>
            <IconRefresh size={13} className={isRefreshing ? 'icon-sm ops-spin' : 'icon-sm'} /> {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      <div className="ops-radar-strip">
        <div className="ops-radar-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="ops-dot" />
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Service heartbeat
            </span>
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
            style={{ fontSize: '11px' }}
          >
            {latencies
              ? Object.values(latencies).some((l) => l.status === 'crit')
                ? 'One or more checks failed'
                : Object.values(latencies).some((l) => l.status === 'warn')
                  ? 'Slow responses'
                  : 'Checks passed'
              : 'Ping to measure Auth, Postgres, and Storage'}
          </span>
        </div>

        <div className="ops-radar-grid">
          {(
            [
              ['Supabase Auth', latencies?.auth],
              ['Postgres (bugs)', latencies?.db],
              ['Storage (receipts)', latencies?.storage],
            ] as const
          ).map(([label, probe]) => (
            <div className="ops-radar-card" key={label}>
              <div className="ops-radar-label">
                <span>{label}</span>
                <span className={`ops-radar-dot ${probe?.status ?? 'idle'}`} />
              </div>
              <div className="ops-radar-value">{probe ? `${probe.ms} ms` : '—'}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="ops-kpi-row">
        <div className="ops-card ops-kpi-card">
          <div className="ops-kpi-label">Active Trips</div>
          <div className="ops-kpi-value">{activeTrips.length}</div>
          <div className="ops-kpi-delta" style={{ color: groundedTrips.length > 0 ? 'var(--warning)' : undefined }}>{groundedTrips.length} grounded</div>
        </div>
        <div className="ops-card ops-kpi-card">
          <div className="ops-kpi-label">Travelers</div>
          <div className="ops-kpi-value">{users.length}</div>
          <div className="ops-kpi-delta">registered accounts</div>
        </div>
        <div className="ops-card ops-kpi-card">
          <div className="ops-kpi-label">Open Bug Cases</div>
          <div className="ops-kpi-value" style={{ color: criticalBugs.length > 0 ? 'var(--danger)' : undefined }}>{openBugs.length}</div>
          <div className="ops-kpi-delta" style={{ color: criticalBugs.length > 0 ? 'var(--danger)' : undefined }}>{criticalBugs.length} critical</div>
        </div>
        <div className="ops-card ops-kpi-card">
          <div className="ops-kpi-label">Feature Requests</div>
          <div className="ops-kpi-value" style={{ color: 'var(--amber)' }}>{activeFeatureRequests.length}</div>
          <div className="ops-kpi-delta">requested, planned or in flight</div>
        </div>
      </div>

      <div className="ops-split-row" style={{ gridTemplateColumns: '1.1fr 1fr 0.85fr' }}>
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
