import React from 'react';
import type { Trip, Member, Expense } from '../types';
import { IconTrash, IconEdit } from './Icons';
import { DateRangePicker } from './DateRangePicker';
import { formatTripStamp } from '../utils/dateRange';
import { initial } from '../utils/initials';

type Props = {
  trips: Trip[];
  members: Record<string, Member>;
  expenses: Expense[];
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
};

export function TripsListScreen({
  trips,
  members,
  expenses,
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

        {/* Create/Edit Trip Form */}
        {showAddTrip && (
          <form className="glass-card fade-in" onSubmit={onCreateTrip} style={{ marginBottom: '24px' }}>
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
            {trips.map((trip) => {
              const stamp = formatTripStamp(trip.startDate, trip.endDate);
              const tripMembers = trip.memberIds.map((id) => members[id]).filter(Boolean);
              const shown = tripMembers.slice(0, 3);
              const overflow = tripMembers.length - shown.length;
              const expenseCount = expenses.filter((e) => e.tripId === trip.id).length;
              return (
                <div key={trip.id} className="passport-card" onClick={() => onSelectTrip(trip.id)}>
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
                      {shown.map((m) => (
                        <span key={m.id} className="pp-avatar" title={m.name}>{initial(m.name)}</span>
                      ))}
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
