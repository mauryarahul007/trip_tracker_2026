import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Trip, Member, TripStop } from '../types';
import { IconArchive, IconMapPin } from './Icons';
import { DateRangePicker } from './DateRangePicker';
import { formatTripStamp } from '../utils/dateRange';
import { initial } from '../utils/initials';
import { avatarColorForName } from '../utils/avatarColor';
import { newId } from '../utils/uuid';
import { useTripStore } from '../store/tripStore';
import { SwipeableRow } from './SwipeableRow';
import { TripStack } from './TripStack';
import { TripSlideLauncher } from './TripSlideLauncher';
import { HomeAmbientBackdrop } from './HomeAmbientBackdrop';
import { OnboardingSwipe } from './OnboardingSwipe';

type Props = {
  trips: Trip[];
  members: Record<string, Member>;
  showAddTrip: boolean;
  setShowAddTrip: (show: boolean) => void;
  newTripName: string;
  setNewTripName: (v: string) => void;
  newTripDestination: string;
  setNewTripDestination: (v: string) => void;
  newTripStops: TripStop[];
  setNewTripStops: React.Dispatch<React.SetStateAction<TripStop[]>>;
  newTripStart: string;
  setNewTripStart: (v: string) => void;
  newTripEnd: string;
  setNewTripEnd: (v: string) => void;
  newTripCurrency: string;
  setNewTripCurrency: (v: string) => void;
  editingTripId: string | null;
  onCreateTrip: (e: React.FormEvent) => void | Promise<void>;
  onCancelTripForm: () => void;
  onStartEditTrip: (trip: Trip) => void;
  onSelectTrip: (id: string) => void;
  onDeleteTrip: (trip: Trip) => void;
  onArchiveTrip: (trip: Trip) => void;
  onOpenSettings: () => void;
  onOpenBugTracker?: () => void;
  onLoadDemoTrip?: () => void;
  userAvatarUrl?: string;
  userDisplayName?: string | null;
};

export function TripsListScreen({
  trips,
  members,
  showAddTrip,
  setShowAddTrip,
  newTripName,
  setNewTripName,
  newTripDestination,
  setNewTripDestination,
  newTripStops,
  setNewTripStops,
  newTripStart,
  setNewTripStart,
  newTripEnd,
  setNewTripEnd,
  newTripCurrency,
  setNewTripCurrency,
  editingTripId,
  onCreateTrip,
  onCancelTripForm,
  onStartEditTrip,
  onSelectTrip,
  onDeleteTrip,
  onArchiveTrip,
  onOpenSettings,
  onOpenBugTracker,
  onLoadDemoTrip,
  userAvatarUrl,
  userDisplayName,
}: Props) {
  const navigate = useNavigate();
  const userId = useTripStore((s) => s.userId);
  const [showJoinTrip, setShowJoinTrip] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [honeypotVal, setHoneypotVal] = useState('');
  const [showList, setShowList] = useState(false);
  const [focusedTrip, setFocusedTrip] = useState<Trip | null>(null);
  const [isSavingTrip, setIsSavingTrip] = useState(false);
  const stackActive = trips.length >= 2 && !showList && !showAddTrip && !showJoinTrip;

  // First-run vs. "deleted my last trip" both hit trips.length === 0 — flag
  // per-account once they've ever had a trip so the two states get different
  // copy instead of onboarding repeating itself forever.
  const onboardKey = userId ? `tt-onboarded-${userId}` : null;
  const isFirstRun = trips.length === 0 && !!onboardKey && !localStorage.getItem(onboardKey);
  const ONBOARD_STORAGE_SUFFIX = '-tt-onboarded-v1';
  useEffect(() => {
    if (trips.length > 0 && onboardKey) localStorage.setItem(onboardKey, '1');
  }, [trips.length, onboardKey]);

  const handleJoinByCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (honeypotVal) return;
    const code = joinCode.trim();
    if (!code) return;
    navigate(`/join/${encodeURIComponent(code)}`);
  };

  const handleCreateTripSafe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingTrip || honeypotVal) return;
    // Dates are required server-side (the trips table's start_date/end_date
    // columns aren't nullable) -- the form used to label them "Optional"
    // while silently failing to create the trip if left blank. Block it
    // here with a clear reason instead of a confusing no-op submit.
    if (!newTripStart || !newTripEnd) {
      alert('Please choose a start and end date for the trip.');
      return;
    }
    setIsSavingTrip(true);
    try {
      await onCreateTrip(e);
    } finally {
      setIsSavingTrip(false);
    }
  };

  return (
    <div id="main-content" tabIndex={-1} className={`fade-in trips-screen-scroll${stackActive ? ' stack-viewport-lock' : ''}`}>
      <HomeAmbientBackdrop trip={stackActive ? focusedTrip : null} />
      <header className="trips-screen-header">
        <button
          type="button"
          className="profile-avatar-btn"
          onClick={onOpenSettings}
          aria-label="Profile & Settings"
          title="Profile & Settings"
        >
          {userAvatarUrl ? (
            <img src={userAvatarUrl} alt="" referrerPolicy="no-referrer" loading="lazy" decoding="async" width={40} height={40} />
          ) : (
            <span style={{ background: avatarColorForName(userDisplayName || 'Me') }}>
              {initial(userDisplayName || 'Me')}
            </span>
          )}
        </button>
        <div style={{ textAlign: 'center' }}>
          <h1 className="app-logo">Trip Tracker 2026</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
            Offline-first cost splitting & groups
          </p>
        </div>
        {onOpenBugTracker ? (
          <button
            type="button"
            className="secondary-btn"
            style={{
              width: '40px',
              height: '40px',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%',
              background: 'rgba(0, 191, 165, 0.08)',
              borderColor: 'rgba(0, 191, 165, 0.4)',
              color: 'var(--text-primary)',
            }}
            onClick={onOpenBugTracker}
            aria-label="Superadmin Bug Tracker"
            title="Superadmin Bug Tracker"
          >
            <span>🛡️</span>
          </button>
        ) : (
          <div aria-hidden="true" />
        )}
      </header>

      <main className={`trips-screen-main${stackActive ? ' stack-main' : ''}`}>
        <div className="trips-section-header">
          <h2 style={{ fontSize: '20px' }}>Your Trips</h2>
          {!showAddTrip && (
            <div className={`trip-home-actions${stackActive ? ' stack-active' : ''}`}>
              {!showJoinTrip && (
                <button className="secondary-btn" style={{ padding: '8px 16px', fontSize: '14px' }} onClick={() => setShowJoinTrip(true)}>
                  Join a Trip
                </button>
              )}
              <button className="gradient-btn" style={{ padding: '8px 16px', fontSize: '14px' }} onClick={() => setShowAddTrip(true)}>
                + New Trip
              </button>
            </div>
          )}
        </div>

        {/* Join by code collapsible form */}
        {showJoinTrip && (
          <form onSubmit={handleJoinByCode} className="glass-card" style={{ marginBottom: '24px', padding: '16px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '12px' }}>Join a Trip with Code</h3>
            {/* Honeypot field - visually hidden to trap bots */}
            <div style={{ display: 'none' }} aria-hidden="true">
              <label htmlFor="join_trip_code_hp">Leave this empty</label>
              <input
                id="join_trip_code_hp"
                type="text"
                name="join_trip_code_hp"
                value={honeypotVal}
                onChange={(e) => setHoneypotVal(e.target.value)}
                tabIndex={-1}
                autoComplete="off"
              />
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                className="input-field"
                placeholder="Enter 6-digit trip code (e.g. 123456)"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                style={{ flex: 1 }}
                autoFocus
              />
              <button type="submit" className="gradient-btn" disabled={!joinCode.trim()}>
                Join
              </button>
              <button type="button" className="secondary-btn" onClick={() => setShowJoinTrip(false)}>
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Add/Edit trip form */}
        {showAddTrip && (
          <form onSubmit={handleCreateTripSafe} className="glass-card" style={{ marginBottom: '24px', padding: '16px' }}>
            <div className="trip-form-header">
              <div>
                <div className="trip-form-eyebrow">TRIP TRACKER · 2026</div>
                <div className="trip-form-title">{editingTripId ? 'Edit Trip' : 'Create New Trip'}</div>
              </div>
              <span className="trip-form-stamp">{editingTripId ? '✎ EDIT' : '✈ NEW'}</span>
            </div>
            {/* Honeypot field - visually hidden to trap bots */}
            <div style={{ display: 'none' }} aria-hidden="true">
              <label htmlFor="add_trip_name_hp">Leave this empty</label>
              <input
                id="add_trip_name_hp"
                type="text"
                name="add_trip_name_hp"
                value={honeypotVal}
                onChange={(e) => setHoneypotVal(e.target.value)}
                tabIndex={-1}
                autoComplete="off"
              />
            </div>
            <div className="input-group">
              <label className="form-label" htmlFor="new_trip_name">Trip Name *</label>
              <input
                id="new_trip_name"
                type="text"
                className="input-field"
                placeholder="e.g. Goa Trip 2026"
                value={newTripName}
                onChange={(e) => setNewTripName(e.target.value)}
                autoFocus
              />
            </div>

            <div className="trip-form-perf" aria-hidden="true" />

            {/* Route Stops / Waypoints Builder */}
            <div className="input-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                <label className="form-label" htmlFor="new_trip_destination" style={{ marginBottom: 0 }}>
                  Destinations & Stops (Optional)
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const nextId = newId();
                    if (newTripStops.length === 0) {
                      const firstVal = newTripDestination.trim();
                      setNewTripStops([
                        { id: newId(), name: firstVal || '' },
                        { id: nextId, name: '' },
                      ]);
                      setNewTripDestination('');
                    } else {
                      setNewTripStops([...newTripStops, { id: nextId, name: '' }]);
                    }
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--primary-accent)',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <span>+ Add Stop</span>
                </button>
              </div>

              {newTripStops.length === 0 ? (
                <div>
                  <input
                    id="new_trip_destination"
                    type="text"
                    className="input-field"
                    placeholder="e.g. Manali, Himachal or Kyoto, Japan"
                    value={newTripDestination}
                    onChange={(e) => setNewTripDestination(e.target.value)}
                  />
                  <div style={{ marginTop: '4px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Auto-fetches tourism photography & route maps
                    </span>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {newTripStops.map((stop, sIdx) => {
                    const isStart = sIdx === 0;
                    const isLast = sIdx === newTripStops.length - 1;
                    return (
                      <div key={stop.id || sIdx} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span
                          style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '11px',
                            fontWeight: 800,
                            color: '#FFFFFF',
                            background: isStart ? '#0284C7' : isLast ? '#FF7A00' : '#0D5C9E',
                            flexShrink: 0,
                          }}
                        >
                          {sIdx + 1}
                        </span>
                        <input
                          type="text"
                          className="input-field"
                          placeholder={isStart ? 'Start place (e.g. Delhi)' : isLast ? 'Final destination (e.g. Kasol)' : `Stop ${sIdx + 1} (e.g. Manali)`}
                          value={stop.name}
                          onChange={(e) => {
                            const val = e.target.value;
                            setNewTripStops(newTripStops.map((s, idx) => (idx === sIdx ? { ...s, name: val } : s)));
                          }}
                          style={{ flex: 1, padding: '10px 12px' }}
                        />
                        {newTripStops.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              setNewTripStops(newTripStops.filter((_, idx) => idx !== sIdx));
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--text-muted)',
                              cursor: 'pointer',
                              padding: '6px',
                              fontSize: '14px',
                              lineHeight: 1,
                            }}
                            title="Remove stop"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    );
                  })}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Connects stops into a route map on the trip dashboard
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const nextId = newId();
                        setNewTripStops([...newTripStops, { id: nextId, name: '' }]);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--primary-accent)',
                        fontSize: '11.5px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      + Add another stop
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="trip-form-perf" aria-hidden="true" />

            <div className="input-group">
              <label className="form-label">Dates *</label>
              <DateRangePicker
                startDate={newTripStart}
                endDate={newTripEnd}
                onSelectStart={setNewTripStart}
                onSelectEnd={setNewTripEnd}
              />
            </div>

            {!editingTripId && (
              <div className="form-group">
                <label className="form-label" htmlFor="new-trip-currency">Base Currency</label>
                <select
                  id="new-trip-currency"
                  className="input-field select-field"
                  value={newTripCurrency}
                  onChange={(e) => setNewTripCurrency(e.target.value)}
                >
                  <option value="INR">INR (₹)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                </select>
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              <button type="submit" className="gradient-btn" style={{ flex: 1 }} disabled={isSavingTrip}>
                {isSavingTrip ? 'Saving…' : editingTripId ? 'Update Trip' : 'Save Trip'}
              </button>
              <button type="button" className="secondary-btn" style={{ flex: 1 }} onClick={onCancelTripForm} disabled={isSavingTrip}>Cancel</button>
            </div>
          </form>
        )}

        {/* Trips List Grid */}
        {trips.length === 0 ? (
          <div className="glass-card ledger-empty" style={{ borderStyle: 'dashed', position: 'relative' }}>
            <div className="ledger-rule" />
            <div className="ledger-empty-prompt">
              <span className="ledger-badge ledger-badge-tilt-right" aria-hidden="true">
                <IconMapPin size={14} className="icon-sm" />
              </span>
              {isFirstRun ? (
                <p>Welcome aboard. A trip holds your <strong>members</strong>, the <strong>expenses</strong> they log, and the <strong>splits</strong> between them — start one to see it come together.</p>
              ) : (
                <p>Nothing here yet. Start a trip and add who's coming.</p>
              )}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '12px' }}>
                <button className="gradient-btn" onClick={() => setShowAddTrip(true)}>
                  Create Your First Trip
                </button>
                {onLoadDemoTrip && (
                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={onLoadDemoTrip}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <span>✨</span> Load Demo Trip
                  </button>
                )}
              </div>
            </div>
            <div className="ledger-rule" />
            {isFirstRun && (
              <OnboardingSwipe
                userId={userId}
                onDismiss={() => {
                  const key = userId ? `tt-${userId}${ONBOARD_STORAGE_SUFFIX}` : null;
                  if (key) localStorage.setItem(key, '1');
                }}
              />
            )}
          </div>
        ) : (
          <>
            {stackActive && (
              <TripStack
                trips={trips}
                members={members}
                userId={userId}
                onSelectTrip={onSelectTrip}
                onStartEditTrip={onStartEditTrip}
                onDeleteTrip={onDeleteTrip}
                onArchiveTrip={onArchiveTrip}
                onShowList={() => setShowList(true)}
                onFrontChange={setFocusedTrip}
              />
            )}
            {stackActive && (
              <TripSlideLauncher
                onCreateTrip={() => setShowAddTrip(true)}
                onJoinTrip={() => setShowJoinTrip(true)}
              />
            )}
            {trips.length >= 2 && showList && (
              <button
                type="button"
                className="trip-stack-viewall"
                style={{ marginBottom: '14px' }}
                onClick={() => setShowList(false)}
              >
                Back to stack
              </button>
            )}
            <div className={`passport-list ${stackActive ? 'stack-mode' : ''}`}>
            {trips.map((trip, idx) => {
              const stamp = formatTripStamp(trip.startDate, trip.endDate);
              const tripMembers = trip.memberIds.map((id) => members[id]).filter(Boolean);
              const shown = tripMembers.slice(0, 3);
              const overflow = tripMembers.length - shown.length;
              const expenseCount = trip.expenseCount || 0;
              const canDelete = !trip.ownerId || !userId || trip.ownerId === userId ||
                Boolean(trip.adminMemberIds && trip.memberIds.some((mid) => members[mid]?.linkedUserId === userId && trip.adminMemberIds?.includes(mid)));
              return (
                <div
                  key={trip.id}
                  className="passport-card"
                  style={{ animationDelay: `${Math.min(idx * 30, 300)}ms` }}
                >
                  <SwipeableRow
                    onDelete={canDelete ? () => onDeleteTrip(trip) : undefined}
                    onEdit={() => onStartEditTrip(trip)}
                    reversed
                    plain
                  >
                    <div
                      style={{ padding: '18px 20px 16px', cursor: 'pointer' }}
                      role="button"
                      tabIndex={0}
                      aria-label={`Open trip ${trip.name}`}
                      onClick={() => onSelectTrip(trip.id)}
                      onKeyDown={(e) => {
                        if (e.target !== e.currentTarget) return;
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onSelectTrip(trip.id);
                        }
                      }}
                    >
                      <div className="pp-stamp">
                        <span>{stamp.top}</span>
                        <span>{stamp.bottom}</span>
                      </div>
                      <div className="pp-dest">Trip &middot; {trip.baseCurrency}</div>
                      <h3 className="pp-name">{trip.name}</h3>
                      <div className="pp-meta">
                        {tripMembers.length} member{tripMembers.length === 1 ? '' : 's'} &middot; {expenseCount} expense{expenseCount === 1 ? '' : 's'}
                      </div>
                      <div className="pp-foot">
                        <div className="pp-avatars">
                          {shown.map((m) =>
                            m.avatarUrl ? (
                              <img key={m.id} src={m.avatarUrl} alt={m.name} title={m.name} className="pp-avatar" referrerPolicy="no-referrer" loading="lazy" decoding="async" width={24} height={24} />
                            ) : (
                              <span key={m.id} className="pp-avatar" style={{ background: avatarColorForName(m.name) }} title={m.name}>{initial(m.name)}</span>
                            )
                          )}
                          {overflow > 0 && <span className="pp-avatar pp-avatar-more">+{overflow}</span>}
                        </div>
                        <div className="pp-actions">
                          <button
                            className="secondary-btn"
                            style={{ padding: '8px' }}
                            aria-label="Archive trip"
                            title="Archive trip"
                            onClick={(e) => {
                              e.stopPropagation();
                              onArchiveTrip(trip);
                            }}
                          >
                            <IconArchive size={15} className="icon-sm" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </SwipeableRow>
                </div>
              );
            })}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
