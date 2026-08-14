import React, { useState, useMemo } from 'react';
import type { Category, Trip, Expense, Member } from '../types';
import type { FeatureFlagKey } from '../types/admin';
import { FEATURE_FLAGS_META } from '../utils/featureFlags';
import { useTripStore } from '../store/tripStore';
import { getCurrencySymbol } from '../utils/currency';
import {
  IconShield,
  IconChevronLeft,
  IconCheck,
  IconSearch,
} from './Icons';

interface Props {
  onBack: () => void;
  trips: Trip[];
  activeTrip?: Trip;
  expenses: Expense[];
  members: Record<string, Member>;
  groups?: any;
  categories: Category[];
}

export function SuperadminDashboard({
  onBack,
  trips,
  expenses,
  members,
  categories,
}: Props) {
  const lockSuperadmin = useTripStore((s) => s.lockSuperadmin);
  const featureFlags = useTripStore((s) => s.featureFlags);
  const setFeatureFlag = useTripStore((s) => s.setFeatureFlag);
  const resetFeatureFlags = useTripStore((s) => s.resetFeatureFlags);

  const exportDatabase = useTripStore((s) => s.exportDatabase);
  const clearDatabase = useTripStore((s) => s.clearDatabase);
  const loadDemoTrip = useTripStore((s) => s.loadDemoTrip);
  const updateCategoryKeywords = useTripStore((s) => s.updateCategoryKeywords);

  const [activeTab, setActiveTab] = useState<'flags' | 'analytics' | 'trips' | 'tools'>('flags');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTagCat, setSelectedTagCat] = useState<string>(categories[0]?.id || 'cat-food');
  const [newTagInput, setNewTagInput] = useState('');
  const [statusFeedback, setStatusFeedback] = useState('');

  // Cross-Trip Global Analytics Computation
  const globalAnalytics = useMemo(() => {
    let totalSpend = 0;
    const catMap: Record<string, number> = {};
    const currMap: Record<string, number> = {};
    const memberSpendMap: Record<string, { name: string; amount: number; tripName: string }> = {};

    expenses.forEach((e) => {
      totalSpend += e.amount;
      catMap[e.category] = (catMap[e.category] || 0) + e.amount;
      currMap[e.currency] = (currMap[e.currency] || 0) + e.amount;

      const payerName = members[e.paidBy]?.name || 'Unknown';
      const trip = trips.find((t) => t.id === e.tripId);
      const tripName = trip?.name || 'Current Trip';
      if (!memberSpendMap[e.paidBy]) {
        memberSpendMap[e.paidBy] = { name: payerName, amount: 0, tripName };
      }
      memberSpendMap[e.paidBy].amount += e.amount;
    });

    const categoryDistribution = Object.entries(catMap).map(([catId, amount]) => {
      const cat = categories.find((c) => c.id === catId);
      return {
        categoryId: catId,
        name: cat?.name || 'Other',
        icon: cat?.icon || '🏷️',
        amount,
        percentage: totalSpend > 0 ? (amount / totalSpend) * 100 : 0,
      };
    }).sort((a, b) => b.amount - a.amount);

    const topSpenders = Object.values(memberSpendMap).sort((a, b) => b.amount - a.amount).slice(0, 5);

    return {
      totalSpend,
      totalTripsCount: trips.length,
      activeTripsCount: trips.filter((t) => !t.archived).length,
      totalExpensesCount: expenses.length,
      totalMembersCount: Object.keys(members).length,
      categoryDistribution,
      currencyBreakdown: currMap,
      topSpenders,
    };
  }, [expenses, trips, members, categories]);

  const filteredTrips = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return trips;
    return trips.filter((t) => t.name.toLowerCase().includes(q) || t.baseCurrency.toLowerCase().includes(q));
  }, [trips, searchQuery]);

  const activeCategoryObj = categories.find((c) => c.id === selectedTagCat);

  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagInput.trim() || !activeCategoryObj) return;
    const currentTags = activeCategoryObj.keywords || [];
    if (!currentTags.includes(newTagInput.trim().toLowerCase())) {
      updateCategoryKeywords(activeCategoryObj.id, [...currentTags, newTagInput.trim().toLowerCase()]);
    }
    setNewTagInput('');
  };

  const handleRemoveTag = (tag: string) => {
    if (!activeCategoryObj) return;
    const currentTags = activeCategoryObj.keywords || [];
    updateCategoryKeywords(activeCategoryObj.id, currentTags.filter((t) => t !== tag));
  };

  return (
    <div className="fade-in settings-container" style={{ paddingBottom: '32px' }}>
      {/* Header Bar */}
      <div className="settings-subscreen-nav" style={{ marginBottom: '14px' }}>
        <button type="button" className="settings-back-btn" onClick={onBack}>
          <IconChevronLeft size={18} /> Exit Cockpit
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              padding: '3px 8px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #10B981, #059669)',
              color: '#fff',
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            ⚡ Superadmin
          </div>
        </div>
      </div>

      {/* Hero Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #1C2A38, #1F6E68)',
          borderRadius: '16px',
          padding: '18px 20px',
          color: '#F2ECDC',
          boxShadow: '0 8px 24px -4px rgba(28, 42, 56, 0.25)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <IconShield size={20} style={{ color: '#00BFA5' }} />
              <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: '#FFFFFF' }}>
                Superadmin Control Cockpit
              </h2>
            </div>
            <p style={{ fontSize: '12.5px', color: '#92A2AE', margin: 0 }}>
              Govern global feature flags, cross-trip analytics, keyword rules, and user roles.
            </p>
          </div>
          <button
            type="button"
            className="secondary-btn"
            style={{
              padding: '4px 10px',
              fontSize: '11.5px',
              color: '#F2ECDC',
              borderColor: 'rgba(242, 236, 220, 0.3)',
              background: 'rgba(255, 255, 255, 0.08)',
            }}
            onClick={() => {
              lockSuperadmin();
              onBack();
            }}
          >
            Lock Admin
          </button>
        </div>

        {/* Quick KPI Bar */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '10px',
            marginTop: '16px',
            paddingTop: '14px',
            borderTop: '1px solid rgba(255, 255, 255, 0.12)',
            textAlign: 'center',
          }}
        >
          <div>
            <span style={{ fontSize: '10.5px', color: '#92A2AE', textTransform: 'uppercase', display: 'block' }}>Trips</span>
            <strong style={{ fontSize: '16px', color: '#FFFFFF' }}>{globalAnalytics.totalTripsCount}</strong>
          </div>
          <div>
            <span style={{ fontSize: '10.5px', color: '#92A2AE', textTransform: 'uppercase', display: 'block' }}>Expenses</span>
            <strong style={{ fontSize: '16px', color: '#FFFFFF' }}>{globalAnalytics.totalExpensesCount}</strong>
          </div>
          <div>
            <span style={{ fontSize: '10.5px', color: '#92A2AE', textTransform: 'uppercase', display: 'block' }}>Members</span>
            <strong style={{ fontSize: '16px', color: '#FFFFFF' }}>{globalAnalytics.totalMembersCount}</strong>
          </div>
          <div>
            <span style={{ fontSize: '10.5px', color: '#92A2AE', textTransform: 'uppercase', display: 'block' }}>Volume</span>
            <strong style={{ fontSize: '16px', color: '#00BFA5' }}>₹{Math.round(globalAnalytics.totalSpend).toLocaleString()}</strong>
          </div>
        </div>
      </div>

      {statusFeedback && (
        <div
          style={{
            padding: '10px 14px',
            borderRadius: '10px',
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            color: '#10B981',
            fontSize: '12.5px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <IconCheck size={14} /> {statusFeedback}
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="segmented-control" style={{ margin: '8px 0 16px' }}>
        <button
          type="button"
          className={activeTab === 'flags' ? 'active' : ''}
          onClick={() => setActiveTab('flags')}
        >
          🚩 Flags
        </button>
        <button
          type="button"
          className={activeTab === 'analytics' ? 'active' : ''}
          onClick={() => setActiveTab('analytics')}
        >
          📊 Analytics
        </button>
        <button
          type="button"
          className={activeTab === 'trips' ? 'active' : ''}
          onClick={() => setActiveTab('trips')}
        >
          🗂️ Trips
        </button>
        <button
          type="button"
          className={activeTab === 'tools' ? 'active' : ''}
          onClick={() => setActiveTab('tools')}
        >
          ⚙️ Tools
        </button>
      </div>

      {/* TAB 1: FEATURE FLAGS */}
      {activeTab === 'flags' && (
        <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                Global Feature Flags
              </h4>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Toggles determine what features Normal Users see. (Superadmins always bypass).
              </span>
            </div>
            <button
              type="button"
              className="secondary-btn"
              style={{ padding: '4px 10px', fontSize: '11.5px' }}
              onClick={() => {
                resetFeatureFlags();
                setStatusFeedback('Feature flags reset to system defaults.');
                setTimeout(() => setStatusFeedback(''), 3000);
              }}
            >
              Reset Defaults
            </button>
          </div>

          <div className="settings-group-card" style={{ padding: '6px 0' }}>
            {Object.keys(FEATURE_FLAGS_META).map((k) => {
              const flagKey = k as FeatureFlagKey;
              const meta = FEATURE_FLAGS_META[flagKey];
              const isEnabled = featureFlags[flagKey] ?? meta.defaultEnabledForUsers;

              return (
                <div
                  key={flagKey}
                  className="settings-row"
                  style={{ cursor: 'default', borderBottom: '1px solid var(--border-color-subtle, rgba(15,23,42,0.06))' }}
                >
                  <div className="settings-row-left">
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        background: isEnabled ? 'rgba(0,191,165,0.12)' : 'rgba(15,23,42,0.06)',
                        color: isEnabled ? '#00BFA5' : 'var(--text-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '13px',
                      }}
                    >
                      {isEnabled ? 'ON' : 'OFF'}
                    </div>
                    <div className="settings-row-texts">
                      <span className="settings-row-title" style={{ fontSize: '14px' }}>{meta.label}</span>
                      <span className="settings-row-subtitle" style={{ fontSize: '11.5px', whiteSpace: 'normal' }}>
                        {meta.description}
                      </span>
                    </div>
                  </div>
                  <div className="settings-row-right">
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={isEnabled}
                        onChange={(e) => {
                          setFeatureFlag(flagKey, e.target.checked);
                          setStatusFeedback(`Updated ${meta.label} -> ${e.target.checked ? 'ENABLED' : 'DISABLED'}`);
                          setTimeout(() => setStatusFeedback(''), 2500);
                        }}
                      />
                      <span className="toggle-slider" />
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: MASTER GLOBAL ANALYTICS */}
      {activeTab === 'analytics' && (
        <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Top Category Distribution */}
          <div>
            <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '10px' }}>
              Cross-Trip Category Distribution
            </h4>
            <div className="settings-group-card" style={{ padding: '14px 16px' }}>
              {globalAnalytics.categoryDistribution.map((c) => (
                <div key={c.categoryId} style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>{c.icon}</span> {c.name}
                    </span>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      ₹{c.amount.toFixed(2)} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({c.percentage.toFixed(1)}%)</span>
                    </span>
                  </div>
                  <div style={{ height: '6px', width: '100%', background: 'var(--bg-app)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${c.percentage}%`,
                        background: 'linear-gradient(90deg, #1F6E68, #00BFA5)',
                        borderRadius: '3px',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Spenders Across Trips */}
          <div>
            <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '10px' }}>
              Top Spenders Across Trips
            </h4>
            <div className="settings-group-card" style={{ padding: '8px 0' }}>
              {globalAnalytics.topSpenders.map((s, idx) => (
                <div
                  key={s.name + idx}
                  className="settings-row"
                  style={{ borderBottom: idx < globalAnalytics.topSpenders.length - 1 ? '1px solid var(--border-color-subtle, rgba(15,23,42,0.06))' : 'none' }}
                >
                  <div className="settings-row-left">
                    <div
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        background: idx === 0 ? 'var(--secondary-accent)' : 'var(--primary-accent)',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        fontWeight: 700,
                      }}
                    >
                      #{idx + 1}
                    </div>
                    <div className="settings-row-texts">
                      <span className="settings-row-title">{s.name}</span>
                      <span className="settings-row-subtitle">{s.tripName}</span>
                    </div>
                  </div>
                  <div className="settings-row-right">
                    <strong style={{ fontSize: '14px', color: 'var(--primary-accent)' }}>
                      ₹{s.amount.toFixed(2)}
                    </strong>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: TRIPS DIRECTORY & AUDIT */}
      {activeTab === 'trips' && (
        <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="input-icon-wrap">
            <IconSearch size={16} className="icon" />
            <input
              type="text"
              className="input-field"
              placeholder="Search trips by name or currency..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="settings-group-card" style={{ padding: '6px 0' }}>
            {filteredTrips.map((t, idx) => {
              const tripExpenses = expenses.filter((e) => e.tripId === t.id);
              const tripTotal = tripExpenses.reduce((sum, e) => sum + e.amount, 0);

              return (
                <div
                  key={t.id}
                  className="settings-row"
                  style={{ borderBottom: idx < filteredTrips.length - 1 ? '1px solid var(--border-color-subtle, rgba(15,23,42,0.06))' : 'none' }}
                >
                  <div className="settings-row-left">
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        background: 'rgba(31, 110, 104, 0.08)',
                        color: 'var(--primary-accent)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '18px',
                      }}
                    >
                      ✈️
                    </div>
                    <div className="settings-row-texts">
                      <span className="settings-row-title">{t.name}</span>
                      <span className="settings-row-subtitle">
                        {t.startDate} → {t.endDate} · {t.memberIds.length} members · {tripExpenses.length} expenses
                      </span>
                    </div>
                  </div>
                  <div className="settings-row-right">
                    <strong style={{ fontSize: '13.5px', color: 'var(--text-primary)' }}>
                      {getCurrencySymbol(t.baseCurrency)} {tripTotal.toFixed(2)}
                    </strong>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: ADVANCED TOOLS & OPERATIONS */}
      {activeTab === 'tools' && (
        <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Keyword Tag Editor */}
          <div>
            <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
              Category &amp; Brand Auto-Tagging Editor
            </h4>
            <div className="glass-card" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
                {categories.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className={`category-badge${selectedTagCat === c.id ? ' active' : ''}`}
                    onClick={() => setSelectedTagCat(c.id)}
                  >
                    <span>{c.icon || '🏷️'}</span> {c.name}
                  </button>
                ))}
              </div>

              {activeCategoryObj && (
                <div>
                  <form onSubmit={handleAddTag} style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                    <input
                      type="text"
                      className="input-field"
                      placeholder={`Add new keyword or brand for ${activeCategoryObj.name}...`}
                      value={newTagInput}
                      onChange={(e) => setNewTagInput(e.target.value)}
                    />
                    <button type="submit" className="primary-btn" style={{ padding: '8px 14px', flexShrink: 0 }}>
                      + Add
                    </button>
                  </form>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '180px', overflowY: 'auto' }}>
                    {(activeCategoryObj.keywords || []).map((tag) => (
                      <span
                        key={tag}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '3px 8px',
                          borderRadius: '12px',
                          background: 'rgba(31, 110, 104, 0.08)',
                          border: '1px solid rgba(31, 110, 104, 0.2)',
                          fontSize: '12px',
                        }}
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                        >
                          &times;
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Database Backup & Seeding */}
          <div>
            <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
              Database Backup &amp; Demo Seeding
            </h4>
            <div className="glass-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => {
                    const json = exportDatabase();
                    const blob = new Blob([json], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `trip-tracker-backup-${new Date().toISOString().slice(0, 10)}.json`;
                    a.click();
                  }}
                >
                  📥 Export JSON Backup
                </button>
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={async () => {
                    await loadDemoTrip();
                    setStatusFeedback('Goa Road Trip Demo Seeded!');
                    setTimeout(() => setStatusFeedback(''), 3000);
                  }}
                >
                  ✨ Seed Demo Data
                </button>
                <button
                  type="button"
                  className="secondary-btn"
                  style={{ color: '#EF4444', borderColor: 'rgba(239,68,68,0.3)' }}
                  onClick={async () => {
                    if (window.confirm('Are you sure you want to permanently clear all trips and reset the database?')) {
                      await clearDatabase();
                      setStatusFeedback('Database cleared.');
                      setTimeout(() => setStatusFeedback(''), 3000);
                    }
                  }}
                >
                  🗑️ Reset All Data
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
