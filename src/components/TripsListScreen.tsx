import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Trip, Member } from '../types';
import { IconTrash, IconEdit, IconSettings, IconArchive } from './Icons';
import { DateRangePicker } from './DateRangePicker';
import { formatTripStamp } from '../utils/dateRange';
import { initial } from '../utils/initials';
import { avatarColorForName } from '../utils/avatarColor';
import { TurnstileWidget } from './TurnstileWidget';
import { useTripStore } from '../store/tripStore';

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
  editingTripId: string | null;
  onCreateTrip: (e: React.FormEvent) => void;
  onCancelTripForm: () => void;
  onStartEditTrip: (trip: Trip) => void;
  onSelectTrip: (id: string) => void;
  onDeleteTrip: (trip: Trip) => void;
  onArchiveTrip: (trip: Trip) => void;
  onOpenSettings: () => void;
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
  editingTripId,
  onCreateTrip,
  onCancelTripForm,
  onStartEditTrip,
  onSelectTrip,
  onDeleteTrip,
  onArchiveTrip,
  onOpenSettings,
}: Props) {
  const navigate = useNavigate();
  const userId = useTripStore((s) => s.userId);
  const [showJoinTrip, setShowJoinTrip] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [honeypotVal, setHoneypotVal] = useState('');

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
      <header style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
        <div>
          <h1 className="app-logo">Trip Tracker 2026</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
            Offline-first cost splitting & groups
          </p>
        </div>
        <button
          className="secondary-btn"
          style={{ padding: '10px', borderRadius: '50%', flexShrink: 0 }}
          onClick={onOpenSettings}
          aria-label="App Settings"
          title="App Settings"
        >
          <IconSettings size={18} />
        </button>
      </header>

      <main style={{ flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '8px', flexWrap: 'wrap' }}>
          <h2 style={{ fontSize: '20px' }}>Your Trips</h2>
          {!showAddTrip && (
            <div style={{ display: 'flex', gap: '8px' }}>
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
          <div className="glass-card" style={{ textAlign: 'center', padding: '40px 20px', borderStyle: 'dashed' }}>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>Nothing here yet. Start a trip and add who's coming.</p>
            <button className="gradient-btn" style={{ margin: '0 auto' }} onClick={() => setShowAddTrip(true)}>
              Create Your First Trip
            </button>
          </div>
        ) : (
          <div className="passport-list">
            {trips.map((trip, idx) => {
              const stamp = formatTripStamp(trip.startDate, trip.endDate);
              const tripMembers = trip.memberIds.map((id) => members[id]).filter(Boolean);
              const shown = tripMembers.slice(0, 3);
              const overflow = tripMembers.length - shown.length;
              const expenseCount = trip.expenseCount || 0;
              return (
                <div
                  key={trip.id}
                  className="passport-card"
                  style={{ animationDelay: `${Math.min(idx * 30, 300)}ms` }}
                  onClick={() => onSelectTrip(trip.id)}
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
                        aria-label="Edit trip"
                        title="Edit trip"
                        onClick={(e) => {
                          e.stopPropagation();
                          onStartEditTrip(trip);
                        }}
                      >
                        <IconEdit size={15} className="icon-sm" />
                      </button>
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
                      {(!trip.ownerId || !userId || trip.ownerId === userId || Boolean(trip.adminMemberIds && trip.memberIds.some((mid) => members[mid]?.linkedUserId === userId && trip.adminMemberIds?.includes(mid)))) && (
                        <button
                          className="secondary-btn"
                          style={{ padding: '8px', color: 'var(--color-danger)', borderColor: 'rgba(184,69,46,0.2)' }}
                          aria-label="Delete trip"
                          title="Delete trip"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteTrip(trip);
                          }}
                        >
                          <IconTrash size={15} className="icon-sm" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
