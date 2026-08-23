import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Trip, Member, TripStop } from '../types';
import { IconTrash, IconEdit, IconSettings, IconArchive, IconMapPin } from './Icons';
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
  onCreateTrip: (e: React.FormEvent) => void;
  onCancelTripForm: () => void;
  onStartEditTrip: (trip: Trip) => void;
  onSelectTrip: (id: string) => void;
  onDeleteTrip: (trip: Trip) => void;
  onArchiveTrip: (trip: Trip) => void;
  onOpenSettings: () => void;
  onOpenBugTracker?: () => void;
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
    // Dates are required server-side (the trips table's start_date/end_date
    // columns aren't nullable) -- the form used to label them "Optional"
    // while silently failing to create the trip if left blank. Block it
    // here with a clear reason instead of a confusing no-op submit.
    if (!newTripStart || !newTripEnd) {
      alert('Please choose a start and end date for the trip.');
      return;
    }
    onCreateTrip(e);
  };

  return (
    <div className="fade-in trips-screen-scroll">
      <header style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <h1 className="app-logo">Trip Tracker 2026</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
            Offline-first cost splitting & groups
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {onOpenBugTracker && (
            <button
              type="button"
              className="secondary-btn"
              onClick={onOpenBugTracker}
              title="Open superadmin bug ledger"
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <span>🐛 Bug Ledger</span>
            </button>
          )}
          <button
            type="button"
            className="secondary-btn"
            onClick={onOpenSettings}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <IconSettings size={16} className="icon-sm" /> Settings
          </button>
        </div>
      </header>

      <section>
        <div className="trips-section-header" style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <h2 style={{ fontSize: '19px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Your Trips</h2>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className="secondary-btn"
              onClick={() => {
                setShowJoinTrip(!showJoinTrip);
                setShowAddTrip(false);
              }}
            >
              Join a Trip
            </button>
            <button
              type="button"
              className="gradient-btn"
              onClick={() => {
                setShowAddTrip(!showAddTrip);
                setShowJoinTrip(false);
              }}
            >
              + New Trip
            </button>
          </div>
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
            <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '12px' }}>
              {editingTripId ? 'Edit Trip' : 'Create New Trip'}
            </h3>
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
              <label className="input-label" htmlFor="new_trip_name">Trip Name *</label>
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

            {/* Route Stops / Waypoints Builder */}
            <div className="input-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                <label className="input-label" htmlFor="new_trip_destination" style={{ marginBottom: 0 }}>
                  Destinations & Stops (Optional)
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const nextId = crypto.randomUUID();
                    if (newTripStops.length === 0) {
                      const firstVal = newTripDestination.trim();
                      setNewTripStops([
                        { id: crypto.randomUUID(), name: firstVal || '' },
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Auto-fetches tourism photography & route maps
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const firstVal = newTripDestination.trim();
                        setNewTripStops([
                          { id: crypto.randomUUID(), name: firstVal || '' },
                          { id: crypto.randomUUID(), name: '' },
                        ]);
                        setNewTripDestination('');
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--primary-accent)',
                        fontSize: '11.5px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        textDecoration: 'underline',
                      }}
                    >
                      + Plan multi-stop route
                    </button>
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
                        const nextId = crypto.randomUUID();
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

            <div className="input-group">
              <label className="input-label">Dates *</label>
              <DateRangePicker
                startDate={newTripStart}
                endDate={newTripEnd}
                onSelectStart={setNewTripStart}
                onSelectEnd={setNewTripEnd}
              />
            </div>

            <div className="input-group">
              <label className="input-label" htmlFor="new_trip_currency">Base Currency</label>
              <select
                id="new_trip_currency"
                className="select-field"
                value={newTripCurrency}
                onChange={(e) => setNewTripCurrency(e.target.value)}
              >
                <option value="INR">INR (₹)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="AED">AED (د.إ)</option>
                <option value="SGD">SGD (S$)</option>
                <option value="THB">THB (฿)</option>
                <option value="JPY">JPY (¥)</option>
              </select>
            </div>

            {/* Cloudflare Turnstile Bot Protection */}
            {!editingTripId && (
              <div style={{ marginBottom: '14px', display: 'flex', justifyContent: 'center' }}>
                <TurnstileWidget />
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
                  <div className="pp-dest" style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <span>Trip &middot; {trip.baseCurrency}</span>
                    {trip.destination && (
                      <span style={{ color: 'var(--primary-accent)', fontWeight: 600 }}>
                        &middot; 📍 {trip.destination}
                      </span>
                    )}
                  </div>
                  <h3 className="pp-name">{trip.name}</h3>

                  {/* Route Stops / Destinations preview on trip card */}
                  {trip.stops && trip.stops.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap', margin: '4px 0 8px' }}>
                      {trip.stops.map((stop, sIdx) => (
                        <span
                          key={stop.id || sIdx}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            fontSize: '11px',
                            fontWeight: 600,
                            padding: '2px 7px',
                            borderRadius: '10px',
                            background: sIdx === 0 ? 'rgba(2, 132, 199, 0.12)' : sIdx === trip.stops!.length - 1 ? 'rgba(255, 122, 0, 0.12)' : 'var(--bg-surface-hover)',
                            color: sIdx === 0 ? '#0284C7' : sIdx === trip.stops!.length - 1 ? '#FF7A00' : 'var(--text-primary)',
                          }}
                        >
                          <span style={{ opacity: 0.7 }}>{sIdx + 1}.</span> {stop.name}
                        </span>
                      ))}
                    </div>
                  )}

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
      </section>
    </div>
  );
}
