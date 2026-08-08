import React, { useEffect, useState } from 'react';
import { useTripStore } from './store/tripStore';

export default function App() {
  const {
    trips,
    activeTripId,
    members,
    expenses,
    categories,
    initialized,
    storageError,
    initialize,
    clearStorageError,
    createTrip,
    selectTrip,
    deleteTrip,
    addMember,
    toggleArchiveMember,
    addExpense,
    deleteExpense,
    exportDatabase,
    importDatabase,
  } = useTripStore();

  // Navigation tabs: 'expenses' | 'members' | 'settings'
  const [activeTab, setActiveTab] = useState<'expenses' | 'members' | 'settings'>('expenses');

  // Form states
  const [showAddTrip, setShowAddTrip] = useState(false);
  const [newTripName, setNewTripName] = useState('');
  const [newTripStart, setNewTripStart] = useState('');
  const [newTripEnd, setNewTripEnd] = useState('');
  const [newTripCurrency, setNewTripCurrency] = useState('INR');

  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberType, setNewMemberType] = useState<'individual' | 'group'>('individual');
  const [newMemberHeadCount, setNewMemberHeadCount] = useState(1);
  const [newMemberWeight, setNewMemberWeight] = useState(1);

  const [showAddExpense, setShowAddExpense] = useState(false);
  const [newExpTitle, setNewExpTitle] = useState('');
  const [newExpAmount, setNewExpAmount] = useState('');
  const [newExpCategory, setNewExpCategory] = useState('');
  const [newExpDate, setNewExpDate] = useState('');
  const [newExpPayer, setNewExpPayer] = useState('');

  // JSON Import state
  const [importJson, setImportJson] = useState('');
  const [showImportArea, setShowImportArea] = useState(false);
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Load state on mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Set default form values when opening forms
  useEffect(() => {
    if (categories.length > 0 && !newExpCategory) {
      setNewExpCategory(categories[0].id);
    }
  }, [categories, newExpCategory]);

  const activeTrip = trips.find((t) => t.id === activeTripId);
  const activeTripExpenses = expenses.filter((e) => e.tripId === activeTripId);

  // Get active trip members list
  const activeTripMembers = activeTrip
    ? activeTrip.memberIds.map((id) => members[id]).filter(Boolean)
    : [];

  const visibleMembers = activeTripMembers.filter((m) => !m.archived);
  const archivedMembers = activeTripMembers.filter((m) => m.archived);

  // Form submissions
  const handleCreateTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTripName || !newTripStart || !newTripEnd) return;
    await createTrip(newTripName, newTripStart, newTripEnd, newTripCurrency);
    // Reset
    setNewTripName('');
    setNewTripStart('');
    setNewTripEnd('');
    setNewTripCurrency('INR');
    setShowAddTrip(false);
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName) return;
    const finalHeadCount = newMemberType === 'individual' ? 1 : newMemberHeadCount;
    await addMember(
      newMemberName,
      newMemberType,
      finalHeadCount,
      newMemberWeight
    );
    // Reset
    setNewMemberName('');
    setNewMemberWeight(1);
    setNewMemberHeadCount(1);
    setNewMemberType('individual');
    setShowAddMember(false);
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountVal = parseFloat(newExpAmount);
    if (!newExpTitle || isNaN(amountVal) || amountVal <= 0 || !newExpPayer || !newExpCategory || !newExpDate) {
      alert('Please fill out all required fields with valid entries.');
      return;
    }

    await addExpense({
      title: newExpTitle,
      amount: amountVal,
      currency: activeTrip?.baseCurrency || 'INR',
      category: newExpCategory,
      date: newExpDate,
      paidBy: newExpPayer,
      splitMode: 'equal', // default mode for Phase 1
    });

    // Reset
    setNewExpTitle('');
    setNewExpAmount('');
    setNewExpDate('');
    if (activeTripMembers.length > 0) {
      setNewExpPayer(activeTripMembers[0].id);
    }
    setShowAddExpense(false);
  };

  const handleImport = async () => {
    if (!importJson) return;
    const success = await importDatabase(importJson);
    if (success) {
      setImportStatus('success');
      setImportJson('');
      setTimeout(() => {
        setImportStatus('idle');
        setShowImportArea(false);
      }, 2000);
    } else {
      setImportStatus('error');
      setTimeout(() => setImportStatus('idle'), 3000);
    }
  };

  const triggerExport = () => {
    const json = exportDatabase();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `trip-tracker-backup-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Loading spinner view
  if (!initialized) {
    return (
      <div className="app-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontFamily: 'var(--font-family-title)', marginBottom: '16px' }}>Trip Tracker 2026</h2>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid rgba(255,255,255,0.1)',
            borderTopColor: 'var(--primary-accent-light)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto'
          }} />
          <style>{`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Quota Exceeded / Storage Blocked Error Notification */}
      {storageError && (
        <div className="toast-alert">
          <div>
            <strong style={{ display: 'block', fontSize: '14px', marginBottom: '2px' }}>Storage Error</strong>
            <span style={{ fontSize: '13px', opacity: 0.9 }}>{storageError}</span>
          </div>
          <button className="toast-close" onClick={clearStorageError}>&times;</button>
        </div>
      )}

      {/* Screen 1: Trips List (if no active trip selected) */}
      {!activeTripId ? (
        <div className="fade-in" style={{ padding: '24px 20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
          <header style={{ marginBottom: '32px' }}>
            <h1 className="app-logo">Trip Tracker 2026</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
              Offline-first cost splitting & analytics
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

            {/* Create Trip Form inline */}
            {showAddTrip && (
              <form className="glass-card fade-in" onSubmit={handleCreateTrip} style={{ marginBottom: '24px' }}>
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
                <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>No trips registered yet.</p>
                <button className="gradient-btn" style={{ margin: '0 auto' }} onClick={() => setShowAddTrip(true)}>
                  Create Your First Trip
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {trips.map((trip) => (
                  <div key={trip.id} className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => selectTrip(trip.id)}>
                    <div>
                      <h3 style={{ fontSize: '18px', marginBottom: '4px' }}>{trip.name}</h3>
                      <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                        📅 {trip.startDate} to {trip.endDate}
                      </p>
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                        👥 {trip.memberIds.length} members • Currency: {trip.baseCurrency}
                      </p>
                    </div>
                    <button
                      className="secondary-btn"
                      style={{ padding: '8px 12px', color: 'var(--color-danger)', borderColor: 'rgba(239,68,68,0.2)' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Are you sure you want to delete "${trip.name}"?`)) {
                          deleteTrip(trip.id);
                        }
                      }}
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </main>
        </div>
      ) : (
        /* Screen 2: Active Trip Dashboard */
        <div className="fade-in" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <header className="app-header">
            <div className="app-title-group">
              <h2 style={{ fontSize: '20px' }}>{activeTrip?.name}</h2>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Base: {activeTrip?.baseCurrency} • 📅 {activeTrip?.startDate} to {activeTrip?.endDate}
              </span>
            </div>
            <button className="secondary-btn" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => selectTrip(null)}>
              ◀ Back to Trips
            </button>
          </header>

          <main style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
            {/* View Switching Tab Content */}
            {activeTab === 'expenses' && (
              <div className="fade-in">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '18px' }}>Trip Expenses</h3>
                  <button
                    className="gradient-btn"
                    style={{ padding: '8px 16px', fontSize: '14px' }}
                    onClick={() => {
                      if (activeTripMembers.length === 0) {
                        alert('Please add members to the trip first before recording expenses.');
                        setActiveTab('members');
                        return;
                      }
                      setShowAddExpense(true);
                      // Pre-select first member
                      setNewExpPayer(activeTripMembers[0].id);
                    }}
                  >
                    + Add Expense
                  </button>
                </div>

                {/* Add Expense Drawer/Form */}
                {showAddExpense && (
                  <form className="glass-card fade-in" onSubmit={handleAddExpense} style={{ marginBottom: '24px' }}>
                    <h4 style={{ marginBottom: '16px', fontSize: '16px' }}>New Expense</h4>

                    <div className="form-group">
                      <label className="form-label">Expense Title</label>
                      <input
                        type="text"
                        required
                        className="input-field"
                        placeholder="e.g. Dinner at Airport"
                        value={newExpTitle}
                        onChange={(e) => setNewExpTitle(e.target.value)}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div className="form-group">
                        <label className="form-label">Amount ({activeTrip?.baseCurrency})</label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          className="input-field"
                          placeholder="0.00"
                          value={newExpAmount}
                          onChange={(e) => setNewExpAmount(e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Category</label>
                        <select
                          className="input-field select-field"
                          value={newExpCategory}
                          onChange={(e) => setNewExpCategory(e.target.value)}
                        >
                          {categories.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.icon} {c.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div className="form-group">
                        <label className="form-label">Paid By (Payer)</label>
                        <select
                          className="input-field select-field"
                          value={newExpPayer}
                          onChange={(e) => setNewExpPayer(e.target.value)}
                        >
                          {visibleMembers.map((m) => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Date</label>
                        <input
                          type="date"
                          required
                          className="input-field"
                          value={newExpDate}
                          onChange={(e) => setNewExpDate(e.target.value)}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                      <button type="submit" className="gradient-btn" style={{ flex: 1 }}>Add</button>
                      <button type="button" className="secondary-btn" style={{ flex: 1 }} onClick={() => setShowAddExpense(false)}>Cancel</button>
                    </div>
                  </form>
                )}

                {/* Expenses List */}
                {activeTripExpenses.length === 0 ? (
                  <div className="glass-card" style={{ textAlign: 'center', padding: '32px', borderStyle: 'dashed' }}>
                    <p style={{ color: 'var(--text-secondary)' }}>No expenses recorded yet.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {activeTripExpenses.map((exp) => {
                      const payer = members[exp.paidBy];
                      const cat = categories.find((c) => c.id === exp.category);
                      return (
                        <div key={exp.id} className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px' }}>
                          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                            <div style={{ fontSize: '24px', background: 'rgba(255,255,255,0.05)', padding: '8px', borderRadius: '50%' }}>
                              {cat?.icon || '🏷️'}
                            </div>
                            <div>
                              <h4 style={{ fontSize: '15px' }}>{exp.title}</h4>
                              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                Paid by: {payer?.name || 'Deleted member'} • {exp.date}
                              </p>
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)' }}>
                              {activeTrip?.baseCurrency === 'INR' ? '₹' : activeTrip?.baseCurrency} {exp.amount.toFixed(2)}
                            </span>
                            <button
                              className="secondary-btn"
                              style={{ padding: '4px 8px', fontSize: '11px', color: 'var(--color-danger)', borderColor: 'rgba(239,68,68,0.15)' }}
                              onClick={() => {
                                if (confirm(`Delete "${exp.title}"?`)) {
                                  deleteExpense(exp.id);
                                }
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'members' && (
              <div className="fade-in">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '18px' }}>Members</h3>
                  {!showAddMember && (
                    <button className="gradient-btn" style={{ padding: '8px 16px', fontSize: '14px' }} onClick={() => setShowAddMember(true)}>
                      + Add Member
                    </button>
                  )}
                </div>

                {/* Add Member Form */}
                {showAddMember && (
                  <form className="glass-card fade-in" onSubmit={handleAddMember} style={{ marginBottom: '24px' }}>
                    <h4 style={{ marginBottom: '16px', fontSize: '16px' }}>New Member</h4>

                    <div className="form-group">
                      <label className="form-label">Full Name</label>
                      <input
                        type="text"
                        required
                        className="input-field"
                        placeholder="e.g. John Doe"
                        value={newMemberName}
                        onChange={(e) => setNewMemberName(e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Member Type</label>
                      <select
                        className="input-field select-field"
                        value={newMemberType}
                        onChange={(e) => {
                          const val = e.target.value as 'individual' | 'group';
                          setNewMemberType(val);
                          if (val === 'group') {
                            setNewMemberHeadCount(2);
                            setNewMemberWeight(2);
                          } else {
                            setNewMemberHeadCount(1);
                            setNewMemberWeight(1);
                          }
                        }}
                      >
                        <option value="individual">Individual (1 Person)</option>
                        <option value="group">Group / Family (N People)</option>
                      </select>
                    </div>

                    {newMemberType === 'group' && (
                      <div className="form-group fade-in">
                        <label className="form-label">Number of People (Head Count)</label>
                        <input
                          type="number"
                          min="2"
                          required
                          className="input-field"
                          value={newMemberHeadCount}
                          onChange={(e) => {
                            const count = parseInt(e.target.value) || 2;
                            setNewMemberHeadCount(count);
                            setNewMemberWeight(count);
                          }}
                        />
                      </div>
                    )}

                    <div className="form-group">
                      <label className="form-label">Default Share Weight</label>
                      <input
                        type="number"
                        step="0.1"
                        required
                        className="input-field"
                        value={newMemberWeight}
                        onChange={(e) => setNewMemberWeight(parseFloat(e.target.value) || 1)}
                      />
                    </div>

                    <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                      <button type="submit" className="gradient-btn" style={{ flex: 1 }}>Add</button>
                      <button type="button" className="secondary-btn" style={{ flex: 1 }} onClick={() => setShowAddMember(false)}>Cancel</button>
                    </div>
                  </form>
                )}

                {/* Members list */}
                {activeTripMembers.length === 0 ? (
                  <div className="glass-card" style={{ textAlign: 'center', padding: '32px', borderStyle: 'dashed' }}>
                    <p style={{ color: 'var(--text-secondary)' }}>No members registered yet. Add some to get started.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {/* Active Members */}
                    {visibleMembers.map((member) => (
                      <div key={member.id} className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px' }}>
                        <div>
                          <h4 style={{ fontSize: '15px' }}>
                            {member.name}
                          </h4>
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                            {member.type === 'group' ? `Group of ${member.headCount}` : 'Individual'} • Weight: {member.defaultWeight}
                          </span>
                        </div>
                        <button
                          className="secondary-btn"
                          style={{ padding: '6px 12px', fontSize: '12px', color: 'var(--color-warning)', borderColor: 'rgba(245,158,11,0.2)' }}
                          onClick={() => toggleArchiveMember(member.id)}
                        >
                          Archive
                        </button>
                      </div>
                    ))}

                    {/* Archived Members */}
                    {archivedMembers.length > 0 && (
                      <div style={{ marginTop: '24px' }}>
                        <h4 style={{ fontSize: '13px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
                          Archived Members ({archivedMembers.length})
                        </h4>
                        {archivedMembers.map((member) => (
                          <div key={member.id} className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', opacity: 0.5, background: 'rgba(255,255,255,0.02)' }}>
                            <div>
                              <h4 style={{ fontSize: '14px', textDecoration: 'line-through' }}>{member.name}</h4>
                            </div>
                            <button
                              className="secondary-btn"
                              style={{ padding: '4px 10px', fontSize: '11px', color: 'var(--text-secondary)' }}
                              onClick={() => toggleArchiveMember(member.id)}
                            >
                              Restore
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="fade-in">
                <h3 style={{ fontSize: '18px', marginBottom: '20px' }}>Settings & Data Utility</h3>

                <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
                  <h4 style={{ fontSize: '16px' }}>JSON Database Backups</h4>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    Export your complete local database state to import onto another device or keep as a secure offline backup.
                  </p>
                  
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button className="gradient-btn" style={{ flex: 1, padding: '12px' }} onClick={triggerExport}>
                      📥 Export Backup JSON
                    </button>
                    <button className="secondary-btn" style={{ flex: 1, padding: '12px' }} onClick={() => setShowImportArea(!showImportArea)}>
                      📤 Import Backup JSON
                    </button>
                  </div>

                  {showImportArea && (
                    <div className="fade-in" style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <textarea
                        className="input-field"
                        rows={6}
                        placeholder="Paste backup JSON string here..."
                        style={{ fontFamily: 'monospace', fontSize: '12px' }}
                        value={importJson}
                        onChange={(e) => setImportJson(e.target.value)}
                      />
                      <button className="gradient-btn" style={{ padding: '10px' }} onClick={handleImport}>
                        Restore State
                      </button>
                      
                      {importStatus === 'success' && (
                        <p style={{ color: 'var(--color-success)', fontSize: '13px', textAlign: 'center' }}>
                          ✔ Database restored successfully! Reloading...
                        </p>
                      )}
                      {importStatus === 'error' && (
                        <p style={{ color: 'var(--color-danger)', fontSize: '13px', textAlign: 'center' }}>
                          ❌ Invalid database backup format. Please verify the string.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </main>

          {/* Nav Tab Menu */}
          <nav className="nav-tabs">
            <button className={`nav-tab-item ${activeTab === 'expenses' ? 'active' : ''}`} onClick={() => setActiveTab('expenses')}>
              <span className="nav-tab-icon">💸</span>
              <span>Expenses</span>
            </button>
            <button className={`nav-tab-item ${activeTab === 'members' ? 'active' : ''}`} onClick={() => setActiveTab('members')}>
              <span className="nav-tab-icon">👥</span>
              <span>Members</span>
            </button>
            <button className={`nav-tab-item ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>
              <span className="nav-tab-icon">⚙</span>
              <span>Settings</span>
            </button>
          </nav>
        </div>
      )}
    </div>
  );
}
