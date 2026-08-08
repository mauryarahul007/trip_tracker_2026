import React from 'react';
import type { Trip } from '../types';
import { IconCalendar, IconMembers, IconTrash } from './Icons';

type Props = {
  trips: Trip[];
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
  onCreateTrip: (e: React.FormEvent) => void;
  onSelectTrip: (id: string) => void;
  onDeleteTrip: (trip: Trip) => void;
};

export function TripsListScreen({
  trips,
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
  onCreateTrip,
  onSelectTrip,
  onDeleteTrip,
}: Props) {
  return (
    <div className="fade-in" style={{ padding: '24px 20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
      <header style={{ marginBottom: '32px' }}>
        <h1 className="app-logo">Trip Tracker 2026</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
          Offline-first cost splitting & groups
        </p>
      </header>

      <main style={{ flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '20px' }}>Your Trips</h2>
          {!showAddTrip && (
            <button className="gradient-btn" style={{ padding: '8px 16px', fontSize: '14px' }} onClick={() => setShowAddTrip(true)}>
              + New Trip
            </button>
          )}
        </div>

        {/* Create Trip Form */}
        {showAddTrip && (
          <form className="glass-card fade-in" onSubmit={onCreateTrip} style={{ marginBottom: '24px' }}>
            <h3 style={{ marginBottom: '16px', fontSize: '18px' }}>Create New Trip</h3>

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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Start Date</label>
                <input
                  type="date"
                  required
                  className="input-field"
                  value={newTripStart}
                  onChange={(e) => setNewTripStart(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">End Date</label>
                <input
                  type="date"
                  required
                  className="input-field"
                  value={newTripEnd}
                  onChange={(e) => setNewTripEnd(e.target.value)}
                />
              </div>
            </div>

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

            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              <button type="submit" className="gradient-btn" style={{ flex: 1 }}>Save Trip</button>
              <button type="button" className="secondary-btn" style={{ flex: 1 }} onClick={() => setShowAddTrip(false)}>Cancel</button>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {trips.map((trip) => (
              <div key={trip.id} className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => onSelectTrip(trip.id)}>
                <div>
                  <h3 style={{ fontSize: '18px', marginBottom: '6px' }}>{trip.name}</h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <IconCalendar size={13} className="icon-sm" /> {trip.startDate} to {trip.endDate}
                  </p>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <IconMembers size={13} className="icon-sm" /> {trip.memberIds.length} members · {trip.baseCurrency}
                  </p>
                </div>
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
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
