import { useEffect, useState } from 'react';
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
import { IconChevronRight } from '../Icons';
import { AdminFlagsPage } from './AdminFlagsPage';
import { AdminAnalyticsPage } from './AdminAnalyticsPage';
import { AdminTripsPage } from './AdminTripsPage';
import { AdminUsersPage } from './AdminUsersPage';
import { AdminAuditPage } from './AdminAuditPage';
import { AdminToolsPage } from './AdminToolsPage';
import './ops-deck.css';

interface Props {
  trips: Trip[];
  members: Record<string, Member>;
  categories: Category[];
  onExitToTravelerApp?: () => void;
  onOpenBugTracker?: () => void;
  onInspectTrip?: (tripId: string) => void;
}

export type AdminTab = 'flags' | 'analytics' | 'trips' | 'users' | 'audit' | 'tools';

const SECTIONS: { id: AdminTab; label: string; code: string }[] = [
  { id: 'flags', label: 'Flags', code: 'SEC.01' },
  { id: 'analytics', label: 'Analytics', code: 'SEC.02' },
  { id: 'trips', label: 'Trips', code: 'SEC.03' },
  { id: 'users', label: 'Users', code: 'SEC.04' },
  { id: 'audit', label: 'Audit', code: 'SEC.05' },
  { id: 'tools', label: 'Tools', code: 'SEC.06' },
];

function useUtcClock() {
  const [clock, setClock] = useState('--:--:-- UTC');
  useEffect(() => {
    const pad = (n: number) => String(n).padStart(2, '0');
    const tick = () => {
      const d = new Date();
      setClock(`${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())} UTC`);
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
  onExitToTravelerApp,
  onOpenBugTracker,
  onInspectTrip,
}: Props) {
  const [activeTab, setActiveTab] = useState<AdminTab>('flags');
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [bugs, setBugs] = useState<BugRecord[]>([]);
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [platformCounts, setPlatformCounts] = useState<DevicePlatformCount[]>([]);
  const [superadminIds, setSuperadminIds] = useState<string[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [notificationStats, setNotificationStats] = useState<NotificationStats>({ totalCount: 0, readCount: 0, last7dCount: 0 });
  const [recycledCount, setRecycledCount] = useState(0);
  const [showSectionSwitcher, setShowSectionSwitcher] = useState(false);
  const lockSuperadmin = useTripStore((s) => s.lockSuperadmin);
  const signOut = useAuthStore((s) => s.signOut);
  const clock = useUtcClock();

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

  const reloadFleetData = () => {
    fetchBugs().then(setBugs).catch(() => setBugs([]));
    fetchAllProfilesForAdmin().then(setUsers).catch(() => setUsers([]));
    fetchDevicePlatformCounts().then(setPlatformCounts).catch(() => setPlatformCounts([]));
    fetchSuperadminIds().then(setSuperadminIds).catch(() => setSuperadminIds([]));
    fetchAuditLogs().then(setAuditLogs).catch(() => setAuditLogs([]));
    fetchNotificationStats().then(setNotificationStats).catch(() => {});
    fetchRecycledExpenseCount().then(setRecycledCount).catch(() => {});
  };

  useEffect(() => {
    reloadFleetData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAdminLogout = async () => {
    lockSuperadmin();
    await signOut();
  };

  const currentSection = SECTIONS.find((s) => s.id === activeTab) ?? SECTIONS[0];

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
        <div className="ops-status-right">
          <div className="ops-status-lamp"><span className="ops-dot" /> <span className="ops-lamp-text">ALL SYSTEMS NOMINAL</span></div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>{clock}</div>
          {onOpenBugTracker && (
            <button type="button" className="ops-btn" onClick={onOpenBugTracker}>
              Bug Ledger
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
          <div className="ops-rail-label">Sections</div>
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              className="ops-switch-item"
              data-current={activeTab === s.id}
              onClick={() => setActiveTab(s.id)}
            >
              <span className="ops-lamp" />
              <span>
                <span className="ops-lbl">{s.label}</span>
                <span className="ops-code">{s.code}</span>
              </span>
            </button>
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

        <main className="ops-panel">
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
            />
          )}
          {activeTab === 'trips' && <AdminTripsPage trips={trips} expenses={expenses} onInspectTrip={onInspectTrip} />}
          {activeTab === 'users' && (
            <AdminUsersPage users={users} trips={trips} superadminIds={superadminIds} onUsersChanged={reloadFleetData} />
          )}
          {activeTab === 'audit' && (
            <AdminAuditPage logs={auditLogs} trips={trips} users={users} onLogsChanged={reloadFleetData} />
          )}
          {activeTab === 'tools' && <AdminToolsPage categories={categories} trips={trips} expenses={expenses} />}
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
                    setActiveTab(s.id);
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
