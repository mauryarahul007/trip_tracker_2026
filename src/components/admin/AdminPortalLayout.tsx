import { useState } from 'react';
import type { Category, Trip, Expense, Member } from '../../types';
import { useTripStore } from '../../store/tripStore';
import { useAuthStore } from '../../store/authStore';
import { IconShield } from '../Icons';
import { AdminFlagsPage } from './AdminFlagsPage';
import { AdminAnalyticsPage } from './AdminAnalyticsPage';
import { AdminTripsPage } from './AdminTripsPage';
import { AdminToolsPage } from './AdminToolsPage';

interface Props {
  trips: Trip[];
  expenses: Expense[];
  members: Record<string, Member>;
  categories: Category[];
  onExitToTravelerApp?: () => void;
}

export type AdminTab = 'flags' | 'analytics' | 'trips' | 'tools';

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

  const handleAdminLogout = async () => {
    lockSuperadmin();
    await signOut();
  };

  return (
    <div
      className="app-container"
      style={{
        maxWidth: '960px',
        padding: '16px 20px 60px 20px',
        minHeight: '100dvh',
      }}
    >
      {/* Superadmin Master Portal Header */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          paddingBottom: '16px',
          marginBottom: '20px',
          borderBottom: '1.5px solid var(--border-color)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'rgba(31, 110, 104, 0.12)',
              color: 'var(--primary-accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <IconShield size={20} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                Superadmin Management Portal
              </h1>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  padding: '2px 7px',
                  borderRadius: '10px',
                  background: 'rgba(31, 110, 104, 0.15)',
                  color: 'var(--primary-accent)',
                  letterSpacing: '0.04em',
                }}
              >
                ROOT PRIVILEGES
              </span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Trip Tracker 2026 Governance &amp; Administration Console
            </div>
          </div>
        </div>

        {/* Header Actions: Switch to Traveler View or Logout */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {onExitToTravelerApp && (
            <button
              type="button"
              className="secondary-btn"
              style={{ fontSize: '12px', padding: '6px 12px' }}
              onClick={onExitToTravelerApp}
            >
              👁️ Preview Traveler View
            </button>
          )}

          <button
            type="button"
            className="secondary-btn"
            style={{
              fontSize: '12px',
              padding: '6px 12px',
              color: '#EF4444',
              borderColor: 'rgba(239, 68, 68, 0.3)',
            }}
            onClick={handleAdminLogout}
          >
            Lock Admin &amp; Logout
          </button>
        </div>
      </header>

      {/* 4 Dedicated Page Navigation Tabs */}
      <nav
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '8px',
          marginBottom: '24px',
          background: 'rgba(0,0,0,0.03)',
          padding: '4px',
          borderRadius: '12px',
        }}
      >
        <button
          type="button"
          className={`primary-btn${activeTab === 'flags' ? '' : ' secondary-btn'}`}
          style={{
            padding: '10px 8px',
            fontSize: '13px',
            fontWeight: activeTab === 'flags' ? 700 : 500,
            borderRadius: '9px',
            border: activeTab === 'flags' ? 'none' : '1px solid transparent',
          }}
          onClick={() => setActiveTab('flags')}
        >
          🚩 Flags
        </button>

        <button
          type="button"
          className={`primary-btn${activeTab === 'analytics' ? '' : ' secondary-btn'}`}
          style={{
            padding: '10px 8px',
            fontSize: '13px',
            fontWeight: activeTab === 'analytics' ? 700 : 500,
            borderRadius: '9px',
            border: activeTab === 'analytics' ? 'none' : '1px solid transparent',
          }}
          onClick={() => setActiveTab('analytics')}
        >
          📊 Analytics
        </button>

        <button
          type="button"
          className={`primary-btn${activeTab === 'trips' ? '' : ' secondary-btn'}`}
          style={{
            padding: '10px 8px',
            fontSize: '13px',
            fontWeight: activeTab === 'trips' ? 700 : 500,
            borderRadius: '9px',
            border: activeTab === 'trips' ? 'none' : '1px solid transparent',
          }}
          onClick={() => setActiveTab('trips')}
        >
          🗂️ Trips
        </button>

        <button
          type="button"
          className={`primary-btn${activeTab === 'tools' ? '' : ' secondary-btn'}`}
          style={{
            padding: '10px 8px',
            fontSize: '13px',
            fontWeight: activeTab === 'tools' ? 700 : 500,
            borderRadius: '9px',
            border: activeTab === 'tools' ? 'none' : '1px solid transparent',
          }}
          onClick={() => setActiveTab('tools')}
        >
          ⚙️ Tools
        </button>
      </nav>

      {/* Render Active Dedicated Page */}
      <main>
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
  );
}
