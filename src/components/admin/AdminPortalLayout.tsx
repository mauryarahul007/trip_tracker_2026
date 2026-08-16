import { useEffect, useState } from 'react';
import type { Category, Trip, Expense, Member } from '../../types';
import { useTripStore } from '../../store/tripStore';
import { useAuthStore } from '../../store/authStore';
import { AdminFlagsPage } from './AdminFlagsPage';
import { AdminAnalyticsPage } from './AdminAnalyticsPage';
import { AdminTripsPage } from './AdminTripsPage';
import { AdminToolsPage } from './AdminToolsPage';
import './ops-deck.css';

interface Props {
  trips: Trip[];
  expenses: Expense[];
  members: Record<string, Member>;
  categories: Category[];
  onExitToTravelerApp?: () => void;
}

export type AdminTab = 'flags' | 'analytics' | 'trips' | 'tools';

const SECTIONS: { id: AdminTab; label: string; code: string }[] = [
  { id: 'flags', label: 'Flags', code: 'SEC.01' },
  { id: 'analytics', label: 'Analytics', code: 'SEC.02' },
  { id: 'trips', label: 'Trips', code: 'SEC.03' },
  { id: 'tools', label: 'Tools', code: 'SEC.04' },
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
  expenses,
  members,
  categories,
  onExitToTravelerApp,
}: Props) {
  const [activeTab, setActiveTab] = useState<AdminTab>('flags');
  const lockSuperadmin = useTripStore((s) => s.lockSuperadmin);
  const signOut = useAuthStore((s) => s.signOut);
  const clock = useUtcClock();

  const handleAdminLogout = async () => {
    lockSuperadmin();
    await signOut();
  };

  return (
    <div
      className="ops-deck"
      style={{
        maxWidth: '1180px',
        margin: '0 auto',
        height: '100dvh',
        maxHeight: '100dvh',
        padding: '16px 20px 0 20px',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div className="ops-statusbar" style={{ padding: '14px 20px', border: '1px solid var(--line)', borderRadius: '4px', marginBottom: '18px', background: 'linear-gradient(180deg, var(--bg-panel-raised), var(--bg-panel))' }}>
        <div className="ops-callsign">
          <div className="ops-glyph">TT</div>
          <div>
            <h1>Trip Tracker &mdash; Ops Deck</h1>
            <div className="ops-sub">SUPERADMIN // ROOT ACCESS</div>
          </div>
        </div>
        <div className="ops-status-right">
          <div className="ops-status-lamp"><span className="ops-dot" /> ALL SYSTEMS NOMINAL</div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>{clock}</div>
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

      <div className="ops-layout" style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
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

        <main className="ops-panel" style={{ overflowY: 'auto', paddingBottom: '60px', overscrollBehavior: 'contain' }}>
          {activeTab === 'flags' && <AdminFlagsPage trips={trips} members={members} />}
          {activeTab === 'analytics' && (
            <AdminAnalyticsPage
              trips={trips}
              expenses={expenses}
              members={members}
              categories={categories}
            />
          )}
          {activeTab === 'trips' && <AdminTripsPage trips={trips} expenses={expenses} />}
          {activeTab === 'tools' && <AdminToolsPage categories={categories} />}
        </main>
      </div>
    </div>
  );
}
