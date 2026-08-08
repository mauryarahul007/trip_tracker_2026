import React, { useEffect, useState } from 'react';
import { useTripStore } from './store/tripStore';

export default function App() {
  const {
    trips,
    activeTripId,
    members,
    groups,
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
    createGroup,
    deleteGroup,
    addExpense,
    deleteExpense,
    exportDatabase,
    importDatabase,
  } = useTripStore();

  // Navigation tabs: 'expenses' | 'members' | 'settings'
  const [activeTab, setActiveTab] = useState<'expenses' | 'members' | 'settings'>('expenses');

  // Form states - Trips
  const [showAddTrip, setShowAddTrip] = useState(false);
  const [newTripName, setNewTripName] = useState('');
  const [newTripStart, setNewTripStart] = useState('');
  const [newTripEnd, setNewTripEnd] = useState('');
  const [newTripCurrency, setNewTripCurrency] = useState('INR');

  // Form states - Members
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');

  // Form states - Groups
  const [showAddGroup, setShowAddGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedGroupMembers, setSelectedGroupMembers] = useState<Record<string, boolean>>({});

  // Form states - Expenses
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [newExpTitle, setNewExpTitle] = useState('');
  const [newExpAmount, setNewExpAmount] = useState('');
  const [newExpCategory, setNewExpCategory] = useState('');
  const [newExpDate, setNewExpDate] = useState('');
  const [newExpPayer, setNewExpPayer] = useState('');
  const [selectedSplitMembers, setSelectedSplitMembers] = useState<Record<string, boolean>>({});

  // JSON Import state
  const [importJson, setImportJson] = useState('');
  const [showImportArea, setShowImportArea] = useState(false);
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Load state on mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  const activeTrip = trips.find((t) => t.id === activeTripId);
  const activeTripExpenses = expenses.filter((e) => e.tripId === activeTripId);

  // Get active trip members and groups
  const activeTripMembers = activeTrip
    ? activeTrip.memberIds.map((id) => members[id]).filter(Boolean)
    : [];
  const visibleMembers = activeTripMembers.filter((m) => !m.archived);
  const archivedMembers = activeTripMembers.filter((m) => m.archived);

  const activeTripGroups = activeTrip
    ? (activeTrip.groupIds || []).map((id) => groups[id]).filter(Boolean)
    : [];

  // Set default form values when opening forms
  useEffect(() => {
    if (categories.length > 0 && !newExpCategory) {
      setNewExpCategory(categories[0].id);
    }
  }, [categories, newExpCategory]);

  // Sync split checkboxes and payer selection when opening add expense form
  useEffect(() => {
    if (showAddExpense && visibleMembers.length > 0) {
      // Default: select all active members for split
      const initialSplit: Record<string, boolean> = {};
      visibleMembers.forEach((m) => {
        initialSplit[m.id] = true;
      });
      setSelectedSplitMembers(initialSplit);
      
      // Default: set first member as payer
      setNewExpPayer(visibleMembers[0].id);
    }
  }, [showAddExpense, activeTripId]);

  // Sync group checkboxes when opening add group form
  useEffect(() => {
    if (showAddGroup) {
      setSelectedGroupMembers({});
    }
  }, [showAddGroup]);

  // Form submissions
  const handleCreateTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTripName || !newTripStart || !newTripEnd) return;
    await createTrip(newTripName, newTripStart, newTripEnd, newTripCurrency);
    setNewTripName('');
    setNewTripStart('');
    setNewTripEnd('');
    setNewTripCurrency('INR');
    setShowAddTrip(false);
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim()) return;
    await addMember(newMemberName.trim());
    setNewMemberName('');
    setShowAddMember(false);
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    const selectedIds = Object.keys(selectedGroupMembers).filter((id) => selectedGroupMembers[id]);
    if (selectedIds.length === 0) {
      alert('Please select at least one member to add to the group.');
      return;
    }
    await createGroup(newGroupName.trim(), selectedIds);
    setNewGroupName('');
    setSelectedGroupMembers({});
    setShowAddGroup(false);
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountVal = parseFloat(newExpAmount);
    const splitIds = Object.keys(selectedSplitMembers).filter((id) => selectedSplitMembers[id]);

    if (!newExpTitle.trim() || isNaN(amountVal) || amountVal <= 0 || !newExpPayer || !newExpCategory || !newExpDate) {
      alert('Please fill out all required fields with valid entries.');
      return;
    }
    if (splitIds.length === 0) {
      alert('Please select at least one member for the expense division.');
      return;
    }

    await addExpense({
      title: newExpTitle.trim(),
      amount: amountVal,
      currency: activeTrip?.baseCurrency || 'INR',
      category: newExpCategory,
      date: newExpDate,
      paidBy: newExpPayer,
      splitMode: 'equal',
      splitMemberIds: splitIds,
    });

    setNewExpTitle('');
    setNewExpAmount('');
    setNewExpDate('');
    setShowAddExpense(false);
  };

  // Group quick select toggles for splits
  const applyGroupToSplit = (memberIds: string[], checked: boolean) => {
    const updated = { ...selectedSplitMembers };
    memberIds.forEach((id) => {
      if (members[id] && !members[id].archived) {
        updated[id] = checked;
      }
    });
    setSelectedSplitMembers(updated);
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

  // Loading view
  if (!initialized) {
    return (
      <div className="app-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontFamily: 'var(--font-family-title)', marginBottom: '16px' }}>Trip Tracker 2026</h2>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid rgba(15, 23, 42, 0.05)',
            borderTopColor: 'var(--primary-accent)',
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
      {/* Storage Toast Alert */}
      {storageError && (
        <div className="toast-alert">
          <div>
            <strong style={{ display: 'block', fontSize: '14px', marginBottom: '2px' }}>Storage Error</strong>
            <span style={{ fontSize: '13px', opacity: 0.9 }}>{storageError}</span>
          </div>
          <button className="toast-close" onClick={clearStorageError}>&times;</button>
        </div>
      )}

      {/* Screen 1: Trips List */}
      {!activeTripId ? (
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
                      style={{ padding: '8px 12px', color: 'var(--color-danger)', borderColor: 'rgba(225,29,72,0.2)' }}
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
                  <h3 style={{ fontSize: '18px' }}>Expenses</h3>
                  <button
                    className="gradient-btn"
                    style={{ padding: '8px 16px', fontSize: '14px' }}
                    onClick={() => {
                      if (visibleMembers.length === 0) {
                        alert('Please add members to the trip first before recording expenses.');
                        setActiveTab('members');
                        return;
                      }
                      setShowAddExpense(true);
                    }}
                  >
                    + Add Expense
                  </button>
                </div>

                {/* Add Expense Form Drawer */}
                {showAddExpense && (
                  <form className="glass-card fade-in" onSubmit={handleAddExpense} style={{ marginBottom: '24px' }}>
                    <h4 style={{ marginBottom: '16px', fontSize: '16px' }}>New Expense</h4>

                    <div className="form-group">
                      <label className="form-label">Expense Title</label>
                      <input
                        type="text"
                        required
                        className="input-field"
                        placeholder="e.g. Flight Tickets"
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

                    {/* Checkboxes to select division participants */}
                    <div className="form-group" style={{ marginTop: '8px' }}>
                      <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>Division of Expense</span>
                        <div style={{ display: 'flex', gap: '8px', fontSize: '11px', textTransform: 'none' }}>
                          <button
                            type="button"
                            style={{ background: 'none', border: 'none', color: 'var(--primary-accent)', cursor: 'pointer', fontWeight: 600 }}
                            onClick={() => {
                              const allChecked: Record<string, boolean> = {};
                              visibleMembers.forEach((m) => { allChecked[m.id] = true; });
                              setSelectedSplitMembers(allChecked);
                            }}
                          >
                            Select All
                          </button>
                          <span style={{ color: 'var(--text-muted)' }}>|</span>
                          <button
                            type="button"
                            style={{ background: 'none', border: 'none', color: 'var(--primary-accent)', cursor: 'pointer', fontWeight: 600 }}
                            onClick={() => setSelectedSplitMembers({})}
                          >
                            Clear All
                          </button>
                        </div>
                      </label>

                      {/* Quick Select Group Buttons */}
                      {activeTripGroups.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                          <span style={{ fontSize: '11px', color: 'var(--text-secondary)', alignSelf: 'center', marginRight: '4px' }}>Groups:</span>
                          {activeTripGroups.map((grp) => (
                            <button
                              key={grp.id}
                              type="button"
                              className="secondary-btn"
                              style={{ padding: '4px 8px', fontSize: '11px', borderRadius: '8px' }}
                              onClick={() => applyGroupToSplit(grp.memberIds, true)}
                            >
                              ＋ {grp.name}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Individual Member Checklist */}
                      <div className="input-field" style={{ maxHeight: '150px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', background: '#fff' }}>
                        {visibleMembers.map((m) => (
                          <label key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 500 }}>
                            <input
                              type="checkbox"
                              checked={!!selectedSplitMembers[m.id]}
                              onChange={(e) => {
                                setSelectedSplitMembers({
                                  ...selectedSplitMembers,
                                  [m.id]: e.target.checked
                                });
                              }}
                              style={{ width: '16px', height: '16px', accentColor: 'var(--primary-accent)' }}
                            />
                            {m.name}
                          </label>
                        ))}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                      <button type="submit" className="gradient-btn" style={{ flex: 1 }}>Add Expense</button>
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
                      const splitNames = exp.splitMemberIds.map((id) => members[id]?.name).filter(Boolean).join(', ');
                      return (
                        <div key={exp.id} className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px' }}>
                          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                            <div style={{ fontSize: '24px', background: 'rgba(15,23,42,0.03)', padding: '8px', borderRadius: '50%' }}>
                              {cat?.icon || '🏷️'}
                            </div>
                            <div>
                              <h4 style={{ fontSize: '15px' }}>{exp.title}</h4>
                              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                Paid by: <strong>{payer?.name || 'Deleted'}</strong> • {exp.date}
                              </p>
                              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={splitNames}>
                                Split with: {splitNames}
                              </p>
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)' }}>
                              {activeTrip?.baseCurrency === 'INR' ? '₹' : activeTrip?.baseCurrency} {exp.amount.toFixed(2)}
                            </span>
                            <button
                              className="secondary-btn"
                              style={{ padding: '4px 8px', fontSize: '11px', color: 'var(--color-danger)', borderColor: 'rgba(225,29,72,0.15)' }}
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
                {/* 1. Add Members Section */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '18px' }}>Trip Members</h3>
                  {!showAddMember && (
                    <button className="gradient-btn" style={{ padding: '6px 12px', fontSize: '13px' }} onClick={() => setShowAddMember(true)}>
                      + Add Member
                    </button>
                  )}
                </div>

                {showAddMember && (
                  <form className="glass-card fade-in" onSubmit={handleAddMember} style={{ marginBottom: '24px' }}>
                    <h4 style={{ marginBottom: '14px', fontSize: '15px' }}>New Member</h4>
                    <div className="form-group">
                      <label className="form-label">Name</label>
                      <input
                        type="text"
                        required
                        className="input-field"
                        placeholder="Enter full name"
                        value={newMemberName}
                        onChange={(e) => setNewMemberName(e.target.value)}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                      <button type="submit" className="gradient-btn" style={{ flex: 1, padding: '10px' }}>Add</button>
                      <button type="button" className="secondary-btn" style={{ flex: 1, padding: '10px' }} onClick={() => setShowAddMember(false)}>Cancel</button>
                    </div>
                  </form>
                )}

                {/* Members list */}
                {activeTripMembers.length === 0 ? (
                  <div className="glass-card" style={{ textAlign: 'center', padding: '24px', borderStyle: 'dashed', marginBottom: '32px' }}>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>No members added yet.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '32px' }}>
                    {visibleMembers.map((member) => (
                      <div key={member.id} className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px' }}>
                        <span style={{ fontSize: '15px', fontWeight: '500' }}>{member.name}</span>
                        <button
                          className="secondary-btn"
                          style={{ padding: '4px 10px', fontSize: '12px', color: 'var(--color-warning)', borderColor: 'rgba(217,119,6,0.2)' }}
                          onClick={() => toggleArchiveMember(member.id)}
                        >
                          Archive
                        </button>
                      </div>
                    ))}

                    {/* Archived Members */}
                    {archivedMembers.length > 0 && (
                      <div style={{ marginTop: '16px' }}>
                        <h4 style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                          Archived ({archivedMembers.length})
                        </h4>
                        {archivedMembers.map((member) => (
                          <div key={member.id} className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 16px', opacity: 0.5 }}>
                            <span style={{ fontSize: '14px', textDecoration: 'line-through' }}>{member.name}</span>
                            <button
                              className="secondary-btn"
                              style={{ padding: '3px 8px', fontSize: '11px' }}
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

                {/* 2. Group Management Section */}
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '24px', marginTop: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '18px' }}>Member Groups</h3>
                    {!showAddGroup && visibleMembers.length > 0 && (
                      <button className="gradient-btn" style={{ padding: '6px 12px', fontSize: '13px' }} onClick={() => setShowAddGroup(true)}>
                        + Create Group
                      </button>
                    )}
                  </div>

                  {showAddGroup && (
                    <form className="glass-card fade-in" onSubmit={handleCreateGroup} style={{ marginBottom: '24px' }}>
                      <h4 style={{ marginBottom: '14px', fontSize: '15px' }}>New Group</h4>
                      
                      <div className="form-group">
                        <label className="form-label">Group Name</label>
                        <input
                          type="text"
                          required
                          className="input-field"
                          placeholder="e.g. Couple A & B or Family"
                          value={newGroupName}
                          onChange={(e) => setNewGroupName(e.target.value)}
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Add Members to Group</label>
                        <div className="input-field" style={{ maxHeight: '150px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', background: '#fff' }}>
                          {visibleMembers.map((m) => (
                            <label key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px' }}>
                              <input
                                type="checkbox"
                                checked={!!selectedGroupMembers[m.id]}
                                onChange={(e) => {
                                  setSelectedGroupMembers({
                                    ...selectedGroupMembers,
                                    [m.id]: e.target.checked
                                  });
                                }}
                                style={{ width: '16px', height: '16px', accentColor: 'var(--primary-accent)' }}
                              />
                              {m.name}
                            </label>
                          ))}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                        <button type="submit" className="gradient-btn" style={{ flex: 1, padding: '10px' }}>Save Group</button>
                        <button type="button" className="secondary-btn" style={{ flex: 1, padding: '10px' }} onClick={() => setShowAddGroup(false)}>Cancel</button>
                      </div>
                    </form>
                  )}

                  {/* Groups list */}
                  {activeTripGroups.length === 0 ? (
                    <div className="glass-card" style={{ textAlign: 'center', padding: '24px', borderStyle: 'dashed' }}>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                        No groups created yet. Groups help you quickly select multiple members for expense divisions.
                      </p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {activeTripGroups.map((grp) => {
                        const grpMemberNames = grp.memberIds
                          .map((id) => members[id]?.name)
                          .filter(Boolean)
                          .join(', ');
                        return (
                          <div key={grp.id} className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px' }}>
                            <div>
                              <h4 style={{ fontSize: '15px', fontWeight: '600' }}>{grp.name}</h4>
                              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                Members: {grpMemberNames || 'None'}
                              </p>
                            </div>
                            <button
                              className="secondary-btn"
                              style={{ padding: '4px 10px', fontSize: '11px', color: 'var(--color-danger)', borderColor: 'rgba(225,29,72,0.15)' }}
                              onClick={() => {
                                if (confirm(`Delete group "${grp.name}"? (Individual members are NOT deleted)`)) {
                                  deleteGroup(grp.id);
                                }
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
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

          {/* Navigation Bar */}
          <nav className="nav-tabs">
            <button className={`nav-tab-item ${activeTab === 'expenses' ? 'active' : ''}`} onClick={() => setActiveTab('expenses')}>
              <span className="nav-tab-icon">💸</span>
              <span>Expenses</span>
            </button>
            <button className={`nav-tab-item ${activeTab === 'members' ? 'active' : ''}`} onClick={() => setActiveTab('members')}>
              <span className="nav-tab-icon">👥</span>
              <span>Members & Groups</span>
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
