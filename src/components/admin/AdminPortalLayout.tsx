import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import type { Category, Trip, Expense, Member } from '../../types';
import type { AdminUserRow, AuditLogEntry, DevicePlatformCount, NotificationStats } from '../../types/admin';
import type { BugRecord } from '../../services/bugApi';
import { useTripStore } from '../../store/tripStore';
import { useAuthStore } from '../../store/authStore';
import {
  fetchAllExpensesForTrips,
  fetchAllProfilesForAdmin,
  fetchAuditLogs,
  fetchDevicePlatformCounts,
  fetchNotificationStats,
  fetchRecycledExpenseCount,
  fetchSuperadminIds,
} from '../../services/tripApi';
import { fetchBugs } from '../../services/bugApi';
import { fetchFeatures, type FeatureRecord } from '../../services/featureApi';
import { IconChevronRight, IconSearch } from '../Icons';
// Each admin tab only ever renders one at a time (see the activeTab
// switches in <main> below) -- lazy per sub-page so opening the Ops Deck
// to check one tab doesn't also download the other seven's code (~2.9k
// lines combined) up front.
const AdminCommandCenterPage = lazy(() => import('./AdminCommandCenterPage').then((m) => ({ default: m.AdminCommandCenterPage })));
const AdminFlagsPage = lazy(() => import('./AdminFlagsPage').then((m) => ({ default: m.AdminFlagsPage })));
const AdminAnalyticsPage = lazy(() => import('./AdminAnalyticsPage').then((m) => ({ default: m.AdminAnalyticsPage })));
const AdminTripsPage = lazy(() => import('./AdminTripsPage').then((m) => ({ default: m.AdminTripsPage })));
const AdminUsersPage = lazy(() => import('./AdminUsersPage').then((m) => ({ default: m.AdminUsersPage })));
const AdminAuditPage = lazy(() => import('./AdminAuditPage').then((m) => ({ default: m.AdminAuditPage })));
const AdminFeaturesPage = lazy(() => import('./AdminFeaturesPage').then((m) => ({ default: m.AdminFeaturesPage })));
const AdminToolsPage = lazy(() => import('./AdminToolsPage').then((m) => ({ default: m.AdminToolsPage })));
import './ops-deck.css';

function AdminTabLoadingFallback() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 0' }}>
      <span className="icon-spin" style={{ width: 24, height: 24, border: '2px solid var(--border-color)', borderTopColor: 'var(--primary-accent)', borderRadius: '50%' }} />
    </div>
  );
}

interface Props {
  trips: Trip[];
  members: Record<string, Member>;
  categories: Category[];
  activeTab: AdminTab;
  onActiveTabChange: (tab: AdminTab) => void;
  onExitToTravelerApp?: () => void;
  onOpenBugTracker?: () => void;
  onInspectTrip?: (tripId: string) => void;
}

export type AdminTab = 'command' | 'flags' | 'analytics' | 'trips' | 'users' | 'audit' | 'features' | 'tools';

type Section = { id: AdminTab; label: string; code: string };

// Grouped by what a superadmin is actually doing, not by build order --
// replaces the previous flat 7-item list where Flags, Analytics and Tools
// all sat at the same level with no relationship to each other.
const SECTION_GROUPS: { label: string; items: Section[] }[] = [
  { label: 'Overview', items: [{ id: 'command', label: 'Command Center', code: 'SEC.00' }] },
  {
    label: 'Operations',
    items: [
      { id: 'flags', label: 'Flags', code: 'SEC.01' },
      { id: 'trips', label: 'Trips', code: 'SEC.03' },
      { id: 'features', label: 'Features', code: 'SEC.06' },
    ],
  },
  {
    label: 'People',
    items: [
      { id: 'users', label: 'Users', code: 'SEC.04' },
      { id: 'audit', label: 'Audit', code: 'SEC.05' },
    ],
  },
  { label: 'Insights', items: [{ id: 'analytics', label: 'Analytics', code: 'SEC.02' }] },
  { label: 'System', items: [{ id: 'tools', label: 'Tools', code: 'SEC.07' }] },
];

const SECTIONS: Section[] = SECTION_GROUPS.flatMap((g) => g.items);

type JumpResult = { kind: 'Trip' | 'User' | 'Bug'; label: string; sublabel: string; onSelect: () => void };

function useIstClock() {
  const [clock, setClock] = useState('--:--:-- IST');
  useEffect(() => {
    const tick = () => {
      const d = new Date();
      const timeStr = d.toLocaleTimeString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });
      setClock(`${timeStr} IST`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return clock;
}

export function AdminPortalLayout({
  trips,
  members,
  categories,
  activeTab,
  onActiveTabChange,
  onExitToTravelerApp,
  onOpenBugTracker,
  onInspectTrip,
}: Props) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [bugs, setBugs] = useState<BugRecord[]>([]);
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [platformCounts, setPlatformCounts] = useState<DevicePlatformCount[]>([]);
  const [superadminIds, setSuperadminIds] = useState<string[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [notificationStats, setNotificationStats] = useState<NotificationStats>({ totalCount: 0, readCount: 0, last7dCount: 0 });
  const [recycledCount, setRecycledCount] = useState(0);
  const [features, setFeatures] = useState<FeatureRecord[]>([]);
  const [showSectionSwitcher, setShowSectionSwitcher] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const panelRef = useRef<HTMLElement>(null);
  const lockSuperadmin = useTripStore((s) => s.lockSuperadmin);
  const signOut = useAuthStore((s) => s.signOut);
  const clock = useIstClock();

  // The traveler app only ever loads one trip's expenses at a time
  // (fetchExpensesForTrip); cross-trip analytics needs every trip's real
  // rows, which RLS now allows for a superadmin (see migration 0054).
  useEffect(() => {
    const tripIds = trips.map((t) => t.id);
    if (tripIds.length === 0) {
      setExpenses([]);
      return;
    }
    let cancelled = false;
    fetchAllExpensesForTrips(tripIds)
      .then((rows) => {
        if (!cancelled) setExpenses(rows);
      })
      .catch(() => {
        if (!cancelled) setExpenses([]);
      });
    return () => {
      cancelled = true;
    };
  }, [trips]);

  // Returns a Promise so callers that want to know when a refresh actually
  // finished (e.g. a manual Refresh button showing a spinner) can await it;
  // fire-and-forget callers (mutation handlers) are unaffected either way.
  const reloadFleetData = () =>
    Promise.all([
      fetchBugs().then(setBugs).catch(() => setBugs([])),
      fetchAllProfilesForAdmin().then(setUsers).catch(() => setUsers([])),
      fetchDevicePlatformCounts().then(setPlatformCounts).catch(() => setPlatformCounts([])),
      fetchSuperadminIds().then(setSuperadminIds).catch(() => setSuperadminIds([])),
      fetchAuditLogs().then(setAuditLogs).catch(() => setAuditLogs([])),
      fetchNotificationStats().then(setNotificationStats).catch(() => {}),
      fetchRecycledExpenseCount().then(setRecycledCount).catch(() => {}),
      fetchFeatures().then(setFeatures).catch(() => setFeatures([])),
    ]).then(() => undefined);

  useEffect(() => {
    reloadFleetData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // On-demand counterpart to the trips-keyed expenses effect above, for the
  // per-section manual Refresh buttons (Analytics/Trips/Users/Audit/Tools).
  const reloadExpenses = () => {
    const tripIds = trips.map((t) => t.id);
    if (tripIds.length === 0) {
      setExpenses([]);
      return Promise.resolve();
    }
    return fetchAllExpensesForTrips(tripIds).then(setExpenses).catch(() => setExpenses([]));
  };

  const handleRefreshAll = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([reloadFleetData(), reloadExpenses()]);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleAdminLogout = async () => {
    lockSuperadmin();
    await signOut();
  };

  const currentSection = SECTIONS.find((s) => s.id === activeTab) ?? SECTIONS[0];

  // Switching sections should land at the top of the new one, not wherever
  // the scroll happened to be on the previous section's (independently
  // scrollable) panel.
  useEffect(() => {
    panelRef.current?.scrollTo({ top: 0, behavior: 'instant' });
  }, [activeTab]);

  // Real fleet-state signal for the top bar lamp, replacing a lamp that
  // always read "ALL SYSTEMS NOMINAL" regardless of what was actually
  // happening.
  const criticalBugCount = bugs.filter((b) => b.severity === 'critical' && b.status !== 'resolved' && b.status !== 'wont_fix').length;
  const groundedTripCount = trips.filter((t) => t.frozen).length;
  const health =
    criticalBugCount > 0
      ? { ok: false, label: `${criticalBugCount} critical case${criticalBugCount === 1 ? '' : 's'} open` }
      : groundedTripCount > 0
        ? { ok: false, label: `${groundedTripCount} trip${groundedTripCount === 1 ? '' : 's'} grounded` }
        : { ok: true, label: 'All systems nominal' };

  // Global jump search: find a trip, user or bug case by name from
  // anywhere in the portal instead of picking the right tab first.
  const [jumpQuery, setJumpQuery] = useState('');
  const [jumpOpen, setJumpOpen] = useState(false);
  const jumpResults = useMemo<JumpResult[]>(() => {
    const q = jumpQuery.trim().toLowerCase();
    if (!q) return [];
    const results: JumpResult[] = [];
    trips
      .filter((t) => t.name.toLowerCase().includes(q))
      .slice(0, 4)
      .forEach((t) =>
        results.push({
          kind: 'Trip',
          label: t.name,
          sublabel: t.baseCurrency,
          onSelect: () => onActiveTabChange('trips'),
        })
      );
    users
      .filter((u) => u.email.toLowerCase().includes(q) || (u.displayName || '').toLowerCase().includes(q))
      .slice(0, 4)
      .forEach((u) =>
        results.push({
          kind: 'User',
          label: u.displayName || u.email,
          sublabel: u.email,
          onSelect: () => onActiveTabChange('users'),
        })
      );
    bugs
      .filter((b) => b.id.toLowerCase().includes(q) || b.title.toLowerCase().includes(q))
      .slice(0, 4)
      .forEach((b) =>
        results.push({
          kind: 'Bug',
          label: `${b.id} — ${b.title}`,
          sublabel: b.severity,
          onSelect: () => onOpenBugTracker?.(),
        })
      );
    return results.slice(0, 8);
  }, [jumpQuery, trips, users, bugs, onActiveTabChange, onOpenBugTracker]);

  return (
    <div className="ops-deck ops-shell">
      <div className="ops-statusbar">
        <div className="ops-callsign">
          <div className="ops-glyph">TT</div>
          <div>
            <h1>Trip Tracker &mdash; Ops Deck</h1>
            <div className="ops-sub">SUPERADMIN // ROOT ACCESS</div>
          </div>
        </div>
        <div className="ops-cmdk-wrap">
          <div className="ops-cmdk">
            <IconSearch size={15} className="icon-sm" style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
            <input
              type="text"
              placeholder="Jump to a trip, user or case..."
              value={jumpQuery}
              onChange={(e) => setJumpQuery(e.target.value)}
              onFocus={() => setJumpOpen(true)}
              onBlur={() => setTimeout(() => setJumpOpen(false), 120)}
            />
          </div>
          {jumpOpen && jumpQuery.trim() && (
            <div className="ops-cmdk-results">
              {jumpResults.length === 0 ? (
                <div className="ops-cmdk-empty">No trip, user or case matches &ldquo;{jumpQuery}&rdquo;.</div>
              ) : (
                jumpResults.map((r, i) => (
                  <button
                    key={`${r.kind}-${i}`}
                    type="button"
                    className="ops-cmdk-row"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      r.onSelect();
                      setJumpQuery('');
                      setJumpOpen(false);
                    }}
                  >
                    <span className="kind">{r.kind}</span>
                    <span style={{ minWidth: 0, overflow: 'hidden' }}>
                      <span style={{ display: 'block', fontSize: '12.5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.label}</span>
                      <span style={{ display: 'block', fontSize: '10.5px', color: 'var(--text-tertiary)' }}>{r.sublabel}</span>
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
        <div className="ops-status-right">
          <div className={`ops-health-pill ${health.ok ? 'ok' : 'warn'}`}>
            <span className="dot" /> <span className="label">{health.label}</span>
          </div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>{clock}</div>
          {onOpenBugTracker && (
            <button type="button" className="ops-btn" onClick={onOpenBugTracker} style={{ position: 'relative' }}>
              Bug Ledger
              {criticalBugCount > 0 && (
                <span
                  aria-hidden="true"
                  style={{ position: 'absolute', top: '-3px', right: '-3px', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--danger)', boxShadow: '0 0 6px var(--danger)' }}
                />
              )}
            </button>
          )}
          {onExitToTravelerApp && (
            <button type="button" className="ops-btn" onClick={onExitToTravelerApp}>
              Preview Traveler View
            </button>
          )}
          <button type="button" className="ops-btn ops-btn-danger" onClick={handleAdminLogout}>
            Lock &amp; Logout
          </button>
        </div>
      </div>

      <div className="ops-layout">
        <nav className="ops-rail" aria-label="Ops sections">
          {SECTION_GROUPS.map((group) => (
            <div className="ops-rail-group" key={group.label}>
              <div className="ops-rail-label">{group.label}</div>
              {group.items.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className="ops-switch-item"
                  data-current={activeTab === s.id}
                  onClick={() => onActiveTabChange(s.id)}
                >
                  <span className="ops-lamp" />
                  <span>
                    <span className="ops-lbl">{s.label}</span>
                    <span className="ops-code">{s.code}</span>
                  </span>
                  {s.id === 'tools' && recycledCount > 0 && <span className="ops-rail-item-flag" title={`${recycledCount} item(s) in recycle bin`} />}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <button
          type="button"
          className="ops-section-trigger"
          aria-haspopup="listbox"
          aria-expanded={showSectionSwitcher}
          onClick={() => setShowSectionSwitcher(true)}
        >
          <span className="ops-section-trigger-left">
            <span className="ops-lamp" />
            <span className="ops-section-trigger-code">{currentSection.code}</span>
            <span className="ops-section-trigger-label">{currentSection.label}</span>
          </span>
          <IconChevronRight size={16} className="ops-section-trigger-chevron" />
        </button>

        <main className="ops-panel" ref={panelRef}>
          <Suspense fallback={<AdminTabLoadingFallback />}>
          {activeTab === 'command' && (
            <AdminCommandCenterPage
              trips={trips}
              bugs={bugs}
              features={features}
              users={users}
              auditLogs={auditLogs}
              health={health}
              onNavigate={onActiveTabChange}
              onOpenBugTracker={onOpenBugTracker}
              onRefresh={handleRefreshAll}
              isRefreshing={isRefreshing}
            />
          )}
          {activeTab === 'flags' && <AdminFlagsPage trips={trips} members={members} />}
          {activeTab === 'analytics' && (
            <AdminAnalyticsPage
              trips={trips}
              expenses={expenses}
              members={members}
              categories={categories}
              bugs={bugs}
              users={users}
              platformCounts={platformCounts}
              notificationStats={notificationStats}
              recycledCount={recycledCount}
              onRefresh={handleRefreshAll}
              isRefreshing={isRefreshing}
            />
          )}
          {activeTab === 'trips' && (
            <AdminTripsPage
              trips={trips}
              expenses={expenses}
              members={members}
              onInspectTrip={onInspectTrip}
              onRefresh={handleRefreshAll}
              isRefreshing={isRefreshing}
            />
          )}
          {activeTab === 'users' && (
            <AdminUsersPage
              users={users}
              trips={trips}
              superadminIds={superadminIds}
              onUsersChanged={reloadFleetData}
              onRefresh={handleRefreshAll}
              isRefreshing={isRefreshing}
            />
          )}
          {activeTab === 'audit' && (
            <AdminAuditPage
              logs={auditLogs}
              trips={trips}
              users={users}
              onLogsChanged={reloadFleetData}
              onRefresh={handleRefreshAll}
              isRefreshing={isRefreshing}
            />
          )}
          {activeTab === 'features' && <AdminFeaturesPage features={features} onFeaturesChanged={reloadFleetData} />}
          {activeTab === 'tools' && (
            <AdminToolsPage
              categories={categories}
              trips={trips}
              expenses={expenses}
              onRefresh={handleRefreshAll}
              isRefreshing={isRefreshing}
            />
          )}
          </Suspense>
        </main>
      </div>

      {showSectionSwitcher && (
        <div className="ops-overlay" onClick={() => setShowSectionSwitcher(false)}>
          <div className="ops-sheet fade-in" style={{ maxWidth: '360px', padding: '18px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <h3 style={{ fontFamily: 'var(--display)', fontSize: '15px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                Switch Section
              </h3>
              <button type="button" onClick={() => setShowSectionSwitcher(false)} className="ops-btn" style={{ padding: '6px 10px' }}>
                Close
              </button>
            </div>
            <div className="ops-switcher-list" role="listbox">
              {SECTIONS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  role="option"
                  aria-selected={activeTab === s.id}
                  className="ops-switcher-row"
                  data-current={activeTab === s.id}
                  onClick={() => {
                    onActiveTabChange(s.id);
                    setShowSectionSwitcher(false);
                  }}
                >
                  <span className="ops-lamp" />
                  <span className="ops-switcher-row-code">{s.code}</span>
                  <span className="ops-switcher-row-label">{s.label}</span>
                  {activeTab === s.id && <span className="ops-switcher-row-current">CURRENT</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
