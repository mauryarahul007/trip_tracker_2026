import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Trip, Member } from '../types';
import { IconArchive, IconMapPin } from './Icons';
import { DateRangePicker } from './DateRangePicker';
import { formatTripStamp } from '../utils/dateRange';
import { initial } from '../utils/initials';
import { avatarColorForName } from '../utils/avatarColor';
import { TurnstileWidget } from './TurnstileWidget';
import { useTripStore } from '../store/tripStore';
import { SwipeableRow } from './SwipeableRow';
import { TripStack } from './TripStack';
import { TripSlideLauncher } from './TripSlideLauncher';

type Props = {
  trips: Trip[];
  members: Record<string, Member>;
  showAddTrip: boolean;
  setShowAddTrip: (show: boolean) => void;
  newTripName: string;
  setNewTripName: (v: string) => void;
  newTripStart: string;
  setNewTripStart: (v: string) => void;
  newTripEnd: string;
  setNewTripEnd: (v: string) => void;
  newTripCurrency: string;
  setNewTripCurrency: (v: string) => void;
  newTripDestination: string;
  setNewTripDestination: (v: string) => void;
  editingTripId: string | null;
  onCreateTrip: (e: React.FormEvent) => void;
  onCancelTripForm: () => void;
  onStartEditTrip: (trip: Trip) => void;
  onSelectTrip: (id: string) => void;
  onDeleteTrip: (trip: Trip) => void;
  onArchiveTrip: (trip: Trip) => void;
  onOpenSettings: () => void;
  onOpenBugTracker?: () => void;
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
  newTripStart,
  setNewTripStart,
  newTripEnd,
  setNewTripEnd,
  newTripCurrency,
  setNewTripCurrency,
  newTripDestination,
  setNewTripDestination,
  editingTripId,
  onCreateTrip,
  onCancelTripForm,
  onStartEditTrip,
  onSelectTrip,
  onDeleteTrip,
  onArchiveTrip,
  onOpenSettings,
  onOpenBugTracker,
  userAvatarUrl,
  userDisplayName,
}: Props) {
  const navigate = useNavigate();
  const userId = useTripStore((s) => s.userId);
  const [showJoinTrip, setShowJoinTrip] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [honeypotVal, setHoneypotVal] = useState('');
  const [showList, setShowList] = useState(false);
  const stackActive = trips.length >= 2 && !showList && !showAddTrip && !showJoinTrip;

  const handleJoinByCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (honeypotVal) return;
    const code = joinCode.trim();
    if (!code) return;
    navigate(`/join/${encodeURIComponent(code)}`);
  };

  const handleCreateTripSafe = (e: React.FormEvent) => {
    e.preventDefault();
    if (honeypotVal) return;
    onCreateTrip(e);
  };

  return (
    <div className="fade-in trips-screen-scroll">
      <header style={{ marginBottom: '24px', display: 'grid', gridTemplateColumns: '40px 1fr 40px', alignItems: 'center', gap: '12px' }}>
        <button
          type="button"
          className="profile-avatar-btn"
          onClick={onOpenSettings}
          aria-label="Profile & Settings"
          title="Profile & Settings"
        >
          {userAvatarUrl ? (
            <img src={userAvatarUrl} alt="" referrerPolicy="no-referrer" loading="lazy" width={40} height={40} />
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

      <main style={{ flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '8px', flexWrap: 'wrap' }}>
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

        {/* Join by Code Form */}
        {showJoinTrip && (
          <form className="glass-card fade-in" onSubmit={handleJoinByCode} style={{ marginBottom: '24px' }}>
            {/* Honeypot field for bot trap */}
            <div style={{ position: 'absolute', left: '-9999px', opacity: 0, pointerEvents: 'none', height: 0, overflow: 'hidden' }} aria-hidden="true">
              <input
                type="text"
                name="trip_join_security_token"
                tabIndex={-1}
                autoComplete="off"
                value={honeypotVal}
                onChange={(e) => setHoneypotVal(e.target.value)}
              />
            </div>

            <h3 style={{ marginBottom: '16px', fontSize: '18px' }}>Join a Trip</h3>
            <div className="form-group">
              <label className="form-label">Invite Code</label>
              <input
                type="text"
                required
                autoFocus
                className="input-field"
                placeholder="e.g. ABC123"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                style={{ letterSpacing: '0.1em', textTransform: 'uppercase' }}
                maxLength={6}
              />
            </div>

            <TurnstileWidget />

            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              <button type="submit" className="gradient-btn" style={{ flex: 1 }}>Join</button>
              <button
                type="button"
                className="secondary-btn"
                style={{ flex: 1 }}
                onClick={() => { setShowJoinTrip(false); setJoinCode(''); }}
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Create/Edit Trip Form */}
        {showAddTrip && (
          <form className="glass-card fade-in" onSubmit={handleCreateTripSafe} style={{ marginBottom: '24px' }}>
            {/* Honeypot field for bot trap */}
            <div style={{ position: 'absolute', left: '-9999px', opacity: 0, pointerEvents: 'none', height: 0, overflow: 'hidden' }} aria-hidden="true">
              <input
                type="text"
                name="trip_create_security_token"
                tabIndex={-1}
                autoComplete="off"
                value={honeypotVal}
                onChange={(e) => setHoneypotVal(e.target.value)}
              />
            </div>

            <h3 style={{ marginBottom: '16px', fontSize: '18px' }}>{editingTripId ? 'Edit Trip' : 'Create New Trip'}</h3>

            <div className="form-group">
              <label className="form-label">Trip Name</label>
              <input
                type="text"
                required
                className="input-field"
                placeholder="e.g. Europe Backpacking"
                value={newTripName}
                onChange={(e) => setNewTripName(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Trip Dates</label>
              <DateRangePicker
                startDate={newTripStart}
                endDate={newTripEnd}
                onSelectStart={setNewTripStart}
                onSelectEnd={setNewTripEnd}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Destination (optional)</label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. Manali, Goa"
                value={newTripDestination}
                onChange={(e) => setNewTripDestination(e.target.value)}
              />
            </div>

            {!editingTripId && (
              <div className="form-group">
                <label className="form-label">Base Currency</label>
                <select
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
              <button type="submit" className="gradient-btn" style={{ flex: 1 }}>
                {editingTripId ? 'Update Trip' : 'Save Trip'}
              </button>
              <button type="button" className="secondary-btn" style={{ flex: 1 }} onClick={onCancelTripForm}>Cancel</button>
            </div>
          </form>
        )}

        {/* Trips List Grid */}
        {trips.length === 0 ? (
          <div className="glass-card ledger-empty" style={{ borderStyle: 'dashed' }}>
            <div className="ledger-rule" />
            <div className="ledger-empty-prompt">
              <span className="ledger-badge ledger-badge-tilt-right" aria-hidden="true">
                <IconMapPin size={14} className="icon-sm" />
              </span>
              <p>Nothing here yet. Start a trip and add who's coming.</p>
              <button className="gradient-btn" onClick={() => setShowAddTrip(true)}>
                Create Your First Trip
              </button>
            </div>
            <div className="ledger-rule" />
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
                    <div style={{ padding: '18px 20px 16px', cursor: 'pointer' }} onClick={() => onSelectTrip(trip.id)}>
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
                              <img key={m.id} src={m.avatarUrl} alt={m.name} title={m.name} className="pp-avatar" referrerPolicy="no-referrer" loading="lazy" width={24} height={24} />
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
