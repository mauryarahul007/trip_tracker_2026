import { useState, useEffect, useMemo } from 'react';
import {
  fetchBugs,
  createBug,
  updateBug,
  deleteBug,
  type BugRecord,
} from '../services/bugApi';
import { diagnosticLogger } from '../utils/diagnosticLogger';
import {
  IconChevronLeft,
  IconRefresh,
  IconTrash,
} from './Icons';

type Props = {
  onBack: () => void;
  isAdmin?: boolean;
};

export function SuperAdminBugTracker({ onBack, isAdmin = true }: Props) {
  const [bugs, setBugs] = useState<BugRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'in_progress' | 'resolved' | 'critical'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [expandedBugId, setExpandedBugId] = useState<string | null>(null);

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [resolvingBug, setResolvingBug] = useState<BugRecord | null>(null);
  const [resolutionNote, setResolutionNote] = useState('');
  const [resolvedByName, setResolvedByName] = useState('superadmin');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // New bug form state
  const [newTitle, setNewTitle] = useState('');
  const [newSeverity, setNewSeverity] = useState<'critical' | 'high' | 'medium' | 'low'>('medium');
  const [newCategory, setNewCategory] = useState<string>('general');
  const [newDesc, setNewDesc] = useState('');
  const [newSteps, setNewSteps] = useState('');
  const [newExpected, setNewExpected] = useState('');
  const [newActual, setNewActual] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadBugs = async () => {
    setLoading(true);
    try {
      const data = await fetchBugs();
      setBugs(data);
    } catch {
      showToast('Error loading bugs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBugs();
  }, []);

  // Filtered bugs
  const filteredBugs = useMemo(() => {
    return bugs.filter((bug) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesQuery =
          bug.id.toLowerCase().includes(q) ||
          bug.title.toLowerCase().includes(q) ||
          bug.description.toLowerCase().includes(q) ||
          bug.category.toLowerCase().includes(q) ||
          bug.foundBy.toLowerCase().includes(q);
        if (!matchesQuery) return false;
      }

      // Status filter
      if (statusFilter === 'open' && bug.status !== 'open') return false;
      if (statusFilter === 'in_progress' && bug.status !== 'in_progress') return false;
      if (statusFilter === 'resolved' && bug.status !== 'resolved') return false;
      if (statusFilter === 'critical' && bug.severity !== 'critical') return false;

      // Category filter
      if (categoryFilter !== 'all' && bug.category !== categoryFilter) return false;

      return true;
    });
  }, [bugs, searchQuery, statusFilter, categoryFilter]);

  // Statistics
  const stats = useMemo(() => {
    const total = bugs.length;
    const open = bugs.filter((b) => b.status === 'open').length;
    const inProgress = bugs.filter((b) => b.status === 'in_progress').length;
    const resolved = bugs.filter((b) => b.status === 'resolved').length;
    const critical = bugs.filter((b) => b.severity === 'critical' && b.status !== 'resolved').length;
    return { total, open, inProgress, resolved, critical };
  }, [bugs]);

  const handleCreateBug = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      alert('Please enter a bug title.');
      return;
    }

    setIsSubmitting(true);
    try {
      const snapshot = await diagnosticLogger.captureSnapshot();
      const stepsArray = newSteps
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);

      const created = await createBug({
        title: newTitle.trim(),
        description: newDesc.trim(),
        severity: newSeverity,
        category: newCategory as any,
        status: 'open',
        foundBy: 'superadmin',
        reproSteps: stepsArray,
        expectedBehavior: newExpected.trim(),
        actualBehavior: newActual.trim(),
        diagnostics: {
          consoleLogs: snapshot.recentLogs.map((l) => `[${l.level}] ${l.message}`),
          syncQueueLength: snapshot.state.syncQueueLength,
          activeTripId: snapshot.state.activeTripId || undefined,
        },
      });

      setBugs((prev) => [created, ...prev.filter((b) => b.id !== created.id)]);
      setShowAddModal(false);
      setNewTitle('');
      setNewDesc('');
      setNewSteps('');
      setNewExpected('');
      setNewActual('');
      showToast(`✅ Created [${created.id}] & synced with CLI ledger!`);
    } catch {
      showToast('❌ Failed to create bug.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (bug: BugRecord, newStatus: 'open' | 'in_progress' | 'resolved') => {
    if (newStatus === 'resolved') {
      setResolvingBug(bug);
      setResolutionNote(bug.resolutionNote || '');
      return;
    }

    const updated = await updateBug(bug.id, { status: newStatus });
    if (updated) {
      setBugs((prev) => prev.map((b) => (b.id === bug.id ? updated : b)));
      showToast(`Updated [${bug.id}] status to ${newStatus.toUpperCase()}`);
    }
  };

  const handleConfirmResolve = async () => {
    if (!resolvingBug) return;
    const updated = await updateBug(resolvingBug.id, {
      status: 'resolved',
      resolvedBy: resolvedByName,
      resolutionNote: resolutionNote.trim() || 'Resolved by superadmin',
      resolvedAt: new Date().toISOString(),
    });

    if (updated) {
      setBugs((prev) => prev.map((b) => (b.id === resolvingBug.id ? updated : b)));
      setResolvingBug(null);
      showToast(`✅ [${resolvingBug.id}] marked as RESOLVED`);
    }
  };

  const handleDeleteBug = async (id: string) => {
    if (!window.confirm(`Are you sure you want to delete ${id}? This will remove it from the ledger.`)) {
      return;
    }
    const success = await deleteBug(id);
    if (success) {
      setBugs((prev) => prev.filter((b) => b.id !== id));
      showToast(`🗑️ Deleted [${id}]`);
    }
  };

  const handleCopyPrompt = async (bug: BugRecord) => {
    const md = `### 🐞 Bug Report: [${bug.id}] ${bug.title}
- **Severity**: \`${bug.severity.toUpperCase()}\`
- **Category**: \`${bug.category}\`
- **Status**: \`${bug.status}\`
- **Reported By**: \`${bug.foundBy}\` (${bug.createdAt})
- **Platform**: \`${bug.environment?.platform || 'web'}\` (Online: \`${bug.environment?.isOnline ?? true}\`)

#### Description
${bug.description || 'No description.'}

#### Steps to Reproduce
${bug.reproSteps && bug.reproSteps.length > 0 ? bug.reproSteps.map((s, i) => `${i + 1}. ${s}`).join('\n') : 'N/A'}

#### Expected Behavior
${bug.expectedBehavior || 'N/A'}

#### Actual Behavior
${bug.actualBehavior || 'N/A'}

${bug.diagnostics?.stackTrace ? `#### Stack Trace\n\`\`\`text\n${bug.diagnostics.stackTrace}\n\`\`\`\n` : ''}
`;
    await navigator.clipboard.writeText(md);
    showToast(`📋 Copied AI Prompt for ${bug.id}!`);
  };

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(bugs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trip-tracker-bugs-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('💾 Exported bugs.json');
  };

  if (!isAdmin) {
    return (
      <div className="subscreen-container">
        <div className="subscreen-header">
          <button type="button" className="subscreen-back-btn" onClick={onBack}>
            <IconChevronLeft size={20} />
            <span>Settings</span>
          </button>
          <h2 className="subscreen-title">Superadmin Bug Tracker</h2>
        </div>
        <div className="glass-card" style={{ textAlign: 'center', padding: '32px 16px', margin: '24px 0' }}>
          <div style={{ fontSize: '36px', marginBottom: '12px' }}>🔒</div>
          <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>Superadmin Access Required</h3>
          <p style={{ color: 'var(--text-secondary, #64748b)', fontSize: '14px', maxWidth: '380px', margin: '0 auto 20px auto' }}>
            The Bug Tracker Console is restricted to Superadmins and Trip Admins for system maintenance.
          </p>
          <button type="button" className="gradient-btn" onClick={onBack}>
            Return to Settings
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="subscreen-container" style={{ maxWidth: '840px', margin: '0 auto', paddingBottom: '60px' }}>
      {/* Header */}
      <div className="subscreen-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <button type="button" className="subscreen-back-btn" onClick={onBack}>
          <IconChevronLeft size={20} />
          <span>Settings</span>
        </button>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={loadBugs}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '8px',
              border: '1px solid var(--border-color, #cbd5e1)',
              background: 'var(--bg-card, #ffffff)',
              color: 'inherit',
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            <IconRefresh size={14} />
            <span>Sync</span>
          </button>
          <button
            type="button"
            className="gradient-btn"
            onClick={() => setShowAddModal(true)}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              border: 'none',
            }}
          >
            + Add Bug
          </button>
        </div>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>🛡️</span> Superadmin Bug Console
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary, #64748b)', margin: 0 }}>
          Manage, track, and sync all bugs across Antigravity, Claude CLI, and human QA.
        </p>
      </div>

      {/* Toast */}
      {toastMessage && (
        <div
          style={{
            padding: '10px 16px',
            borderRadius: '8px',
            background: 'var(--color-primary, #00BFA5)',
            color: '#ffffff',
            fontSize: '13px',
            fontWeight: 600,
            marginBottom: '16px',
            boxShadow: '0 4px 12px rgba(0, 191, 165, 0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>{toastMessage}</span>
        </div>
      )}

      {/* KPI Stats Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: '10px',
          marginBottom: '20px',
        }}
      >
        <div
          className="glass-card"
          style={{
            padding: '12px 14px',
            borderRadius: '12px',
            cursor: 'pointer',
            border: statusFilter === 'all' ? '2px solid var(--color-primary, #00BFA5)' : '1px solid var(--border-color, #e2e8f0)',
          }}
          onClick={() => setStatusFilter('all')}
        >
          <div style={{ fontSize: '12px', color: 'var(--text-secondary, #64748b)', fontWeight: 500 }}>Total Bugs</div>
          <div style={{ fontSize: '22px', fontWeight: 700, marginTop: '2px' }}>{stats.total}</div>
        </div>

        <div
          className="glass-card"
          style={{
            padding: '12px 14px',
            borderRadius: '12px',
            cursor: 'pointer',
            border: statusFilter === 'open' ? '2px solid #22c55e' : '1px solid var(--border-color, #e2e8f0)',
          }}
          onClick={() => setStatusFilter('open')}
        >
          <div style={{ fontSize: '12px', color: '#16a34a', fontWeight: 600 }}>🟢 Open</div>
          <div style={{ fontSize: '22px', fontWeight: 700, marginTop: '2px', color: '#16a34a' }}>{stats.open}</div>
        </div>

        <div
          className="glass-card"
          style={{
            padding: '12px 14px',
            borderRadius: '12px',
            cursor: 'pointer',
            border: statusFilter === 'in_progress' ? '2px solid #f59e0b' : '1px solid var(--border-color, #e2e8f0)',
          }}
          onClick={() => setStatusFilter('in_progress')}
        >
          <div style={{ fontSize: '12px', color: '#d97706', fontWeight: 600 }}>🟡 In Progress</div>
          <div style={{ fontSize: '22px', fontWeight: 700, marginTop: '2px', color: '#d97706' }}>{stats.inProgress}</div>
        </div>

        <div
          className="glass-card"
          style={{
            padding: '12px 14px',
            borderRadius: '12px',
            cursor: 'pointer',
            border: statusFilter === 'resolved' ? '2px solid #3b82f6' : '1px solid var(--border-color, #e2e8f0)',
          }}
          onClick={() => setStatusFilter('resolved')}
        >
          <div style={{ fontSize: '12px', color: '#2563eb', fontWeight: 600 }}>✅ Resolved</div>
          <div style={{ fontSize: '22px', fontWeight: 700, marginTop: '2px', color: '#2563eb' }}>{stats.resolved}</div>
        </div>

        <div
          className="glass-card"
          style={{
            padding: '12px 14px',
            borderRadius: '12px',
            cursor: 'pointer',
            border: statusFilter === 'critical' ? '2px solid #ef4444' : '1px solid var(--border-color, #e2e8f0)',
          }}
          onClick={() => setStatusFilter('critical')}
        >
          <div style={{ fontSize: '12px', color: '#dc2626', fontWeight: 600 }}>🚨 Critical</div>
          <div style={{ fontSize: '22px', fontWeight: 700, marginTop: '2px', color: '#dc2626' }}>{stats.critical}</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '10px',
          alignItems: 'center',
          marginBottom: '16px',
        }}
      >
        <input
          type="text"
          placeholder="🔍 Search bugs by title, ID, category..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            flex: 1,
            minWidth: '220px',
            padding: '8px 14px',
            borderRadius: '8px',
            border: '1px solid var(--border-color, #cbd5e1)',
            background: 'var(--bg-input, #ffffff)',
            color: 'inherit',
            fontSize: '13px',
          }}
        />

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          style={{
            padding: '8px 12px',
            borderRadius: '8px',
            border: '1px solid var(--border-color, #cbd5e1)',
            background: 'var(--bg-input, #ffffff)',
            color: 'inherit',
            fontSize: '13px',
          }}
        >
          <option value="all">All Categories</option>
          <option value="navigation">Navigation & Routing</option>
          <option value="splits-math">Splits & Math</option>
          <option value="offline-sync">Offline & Cloud Sync</option>
          <option value="p2p-sync">P2P Sync</option>
          <option value="receipts-camera">Receipts & Camera</option>
          <option value="auth">Auth & Session</option>
          <option value="ui-ux">UI / UX</option>
          <option value="performance">Performance</option>
          <option value="general">General</option>
        </select>

        <button
          type="button"
          onClick={handleExportJson}
          style={{
            padding: '8px 12px',
            borderRadius: '8px',
            border: '1px solid var(--border-color, #cbd5e1)',
            background: 'var(--bg-card, #ffffff)',
            color: 'inherit',
            cursor: 'pointer',
            fontSize: '13px',
          }}
        >
          💾 Export JSON
        </button>
      </div>

      {/* Bugs List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary, #64748b)' }}>
          Loading bugs from ledger...
        </div>
      ) : filteredBugs.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '40px 16px', borderRadius: '12px' }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>🎉</div>
          <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>No bugs found matching criteria</h3>
          <p style={{ color: 'var(--text-secondary, #64748b)', fontSize: '13px', marginTop: '4px' }}>
            Great job! You can add a new bug using the "+ Add Bug" button above.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredBugs.map((bug) => {
            const isExpanded = expandedBugId === bug.id;
            const isCritical = bug.severity === 'critical';
            const isHigh = bug.severity === 'high';

            const severityBadge = (
              <span
                style={{
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  background: isCritical
                    ? 'rgba(239, 68, 68, 0.15)'
                    : isHigh
                    ? 'rgba(249, 115, 22, 0.15)'
                    : bug.severity === 'medium'
                    ? 'rgba(234, 179, 8, 0.15)'
                    : 'rgba(148, 163, 184, 0.15)',
                  color: isCritical
                    ? '#dc2626'
                    : isHigh
                    ? '#ea580c'
                    : bug.severity === 'medium'
                    ? '#ca8a04'
                    : '#64748b',
                }}
              >
                {bug.severity}
              </span>
            );

            const statusBadge = (
              <span
                style={{
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: 600,
                  background:
                    bug.status === 'open'
                      ? 'rgba(34, 197, 94, 0.15)'
                      : bug.status === 'in_progress'
                      ? 'rgba(245, 158, 11, 0.15)'
                      : 'rgba(59, 130, 246, 0.15)',
                  color:
                    bug.status === 'open'
                      ? '#16a34a'
                      : bug.status === 'in_progress'
                      ? '#d97706'
                      : '#2563eb',
                }}
              >
                {bug.status === 'open' ? '🟢 Open' : bug.status === 'in_progress' ? '🟡 In Progress' : '✅ Resolved'}
              </span>
            );

            return (
              <div
                key={bug.id}
                className="glass-card"
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  border: isCritical && bug.status !== 'resolved' ? '1.5px solid #ef4444' : '1px solid var(--border-color, #e2e8f0)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
                      <strong style={{ fontFamily: 'var(--font-family-mono, monospace)', color: 'var(--color-primary, #00BFA5)' }}>
                        {bug.id}
                      </strong>
                      {severityBadge}
                      {statusBadge}
                      <span style={{ fontSize: '11px', padding: '2px 6px', background: 'rgba(0, 0, 0, 0.04)', borderRadius: '4px', color: 'var(--text-secondary, #64748b)' }}>
                        📂 {bug.category}
                      </span>
                    </div>

                    <h3 style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 6px 0', color: 'inherit' }}>
                      {bug.title}
                    </h3>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary, #64748b)', margin: 0, lineHeight: 1.4 }}>
                      {bug.description}
                    </p>
                  </div>
                </div>

                {/* Sub info */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: '12px',
                    fontSize: '11px',
                    color: 'var(--text-secondary, #64748b)',
                    flexWrap: 'wrap',
                    gap: '8px',
                  }}
                >
                  <div>
                    👤 Found by <strong>{bug.foundBy}</strong> on {new Date(bug.createdAt).toLocaleDateString()}
                    {bug.environment?.route && ` • Route: ${bug.environment.route}`}
                  </div>

                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                      type="button"
                      onClick={() => setExpandedBugId(isExpanded ? null : bug.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--color-primary, #00BFA5)',
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: '12px',
                      }}
                    >
                      {isExpanded ? '▲ Hide Specs' : '▼ View Specs'}
                    </button>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div
                    style={{
                      marginTop: '14px',
                      paddingTop: '12px',
                      borderTop: '1px dashed var(--border-color, #e2e8f0)',
                      fontSize: '13px',
                    }}
                  >
                    {bug.reproSteps && bug.reproSteps.length > 0 && (
                      <div style={{ marginBottom: '10px' }}>
                        <strong style={{ fontSize: '12px' }}>Steps to Reproduce:</strong>
                        <ol style={{ margin: '4px 0 0 0', paddingLeft: '20px', fontSize: '12px' }}>
                          {bug.reproSteps.map((step, idx) => (
                            <li key={idx}>{step}</li>
                          ))}
                        </ol>
                      </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px', fontSize: '12px' }}>
                      {bug.expectedBehavior && (
                        <div>
                          <strong>Expected:</strong> {bug.expectedBehavior}
                        </div>
                      )}
                      {bug.actualBehavior && (
                        <div>
                          <strong>Actual:</strong> {bug.actualBehavior}
                        </div>
                      )}
                    </div>

                    {bug.diagnostics?.stackTrace && (
                      <div style={{ marginBottom: '10px' }}>
                        <strong style={{ fontSize: '12px' }}>Stack / Logs:</strong>
                        <pre
                          style={{
                            background: 'rgba(0, 0, 0, 0.05)',
                            padding: '8px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontFamily: 'var(--font-family-mono, monospace)',
                            overflowX: 'auto',
                            maxHeight: '100px',
                            margin: '4px 0 0 0',
                          }}
                        >
                          {bug.diagnostics.stackTrace}
                        </pre>
                      </div>
                    )}

                    {bug.status === 'resolved' && (
                      <div
                        style={{
                          background: 'rgba(34, 197, 94, 0.1)',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          marginBottom: '10px',
                          fontSize: '12px',
                          color: '#15803d',
                        }}
                      >
                        <strong>✅ Resolution Note:</strong> {bug.resolutionNote || 'Resolved'}
                        <div style={{ fontSize: '11px', marginTop: '2px', color: '#166534' }}>
                          Resolved by {bug.resolvedBy || 'superadmin'} on {bug.resolvedAt ? new Date(bug.resolvedAt).toLocaleDateString() : 'N/A'}
                        </div>
                      </div>
                    )}

                    {/* Action Bar */}
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px' }}>
                      {bug.status === 'open' && (
                        <button
                          type="button"
                          onClick={() => handleStatusChange(bug, 'in_progress')}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '6px',
                            border: '1px solid #f59e0b',
                            background: 'rgba(245, 158, 11, 0.1)',
                            color: '#d97706',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          🟡 Start Work (In Progress)
                        </button>
                      )}

                      {bug.status !== 'resolved' ? (
                        <button
                          type="button"
                          onClick={() => handleStatusChange(bug, 'resolved')}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '6px',
                            border: '1px solid #22c55e',
                            background: 'rgba(34, 197, 94, 0.15)',
                            color: '#15803d',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          ✅ Mark Resolved
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleStatusChange(bug, 'open')}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '6px',
                            border: '1px solid var(--border-color, #cbd5e1)',
                            background: 'var(--bg-card, #ffffff)',
                            color: 'inherit',
                            fontSize: '12px',
                            cursor: 'pointer',
                          }}
                        >
                          🔄 Re-open Bug
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleCopyPrompt(bug)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '6px',
                          border: '1px solid var(--border-color, #cbd5e1)',
                          background: 'var(--bg-card, #ffffff)',
                          color: 'inherit',
                          fontSize: '12px',
                          cursor: 'pointer',
                        }}
                      >
                        📋 Copy Prompt for AI
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteBug(bug.id)}
                        style={{
                          marginLeft: 'auto',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          border: '1px solid rgba(239, 68, 68, 0.4)',
                          background: 'rgba(239, 68, 68, 0.1)',
                          color: '#dc2626',
                          fontSize: '12px',
                          cursor: 'pointer',
                        }}
                      >
                        <IconTrash size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Bug Modal */}
      {showAddModal && (
        <div
          className="modal-backdrop"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="glass-card"
            style={{
              width: '100%',
              maxWidth: '560px',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '24px',
              borderRadius: '16px',
              background: 'var(--bg-card, #ffffff)',
              color: 'var(--text-primary, #1e293b)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>🐞</span> File New Bug
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--text-secondary, #64748b)' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateBug} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                  Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Offline sync drops member delete transaction"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color, #cbd5e1)',
                    background: 'var(--bg-input, #ffffff)',
                    color: 'inherit',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                    Severity
                  </label>
                  <select
                    value={newSeverity}
                    onChange={(e) => setNewSeverity(e.target.value as any)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color, #cbd5e1)',
                      background: 'var(--bg-input, #ffffff)',
                      color: 'inherit',
                      fontSize: '13px',
                    }}
                  >
                    <option value="critical">🔴 Critical (Crash / Data loss)</option>
                    <option value="high">🟠 High (Major feature broken)</option>
                    <option value="medium">🟡 Medium (Glitch / Math issue)</option>
                    <option value="low">⚪ Low (Visual / Minor edge case)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                    Category
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color, #cbd5e1)',
                      background: 'var(--bg-input, #ffffff)',
                      color: 'inherit',
                      fontSize: '13px',
                    }}
                  >
                    <option value="navigation">Navigation & Routing</option>
                    <option value="splits-math">Splits & Math</option>
                    <option value="offline-sync">Offline & Cloud Sync</option>
                    <option value="p2p-sync">P2P Sync</option>
                    <option value="receipts-camera">Receipts & Camera</option>
                    <option value="auth">Auth & Session</option>
                    <option value="ui-ux">UI / UX</option>
                    <option value="performance">Performance</option>
                    <option value="general">General</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                  Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Explain what is breaking and what the impact is..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color, #cbd5e1)',
                    background: 'var(--bg-input, #ffffff)',
                    color: 'inherit',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                    resize: 'vertical',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                  Reproduction Steps (one per line)
                </label>
                <textarea
                  rows={2}
                  placeholder="1. Open app&#10;2. Add 2 members&#10;3. Tap delete"
                  value={newSteps}
                  onChange={(e) => setNewSteps(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color, #cbd5e1)',
                    background: 'var(--bg-input, #ffffff)',
                    color: 'inherit',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                    resize: 'vertical',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                    Expected
                  </label>
                  <input
                    type="text"
                    placeholder="Member deleted successfully"
                    value={newExpected}
                    onChange={(e) => setNewExpected(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color, #cbd5e1)',
                      background: 'var(--bg-input, #ffffff)',
                      color: 'inherit',
                      fontSize: '12px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                    Actual
                  </label>
                  <input
                    type="text"
                    placeholder="Member remains in split balances"
                    value={newActual}
                    onChange={(e) => setNewActual(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color, #cbd5e1)',
                      background: 'var(--bg-input, #ffffff)',
                      color: 'inherit',
                      fontSize: '12px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="gradient-btn"
                  style={{ flex: 1, padding: '10px', fontSize: '14px', borderRadius: '8px', cursor: 'pointer' }}
                >
                  {isSubmitting ? 'Saving...' : 'Save & Sync Bug to Ledger'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{
                    padding: '10px 16px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color, #cbd5e1)',
                    background: 'none',
                    color: 'inherit',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Resolve Modal */}
      {resolvingBug && (
        <div
          className="modal-backdrop"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={() => setResolvingBug(null)}
        >
          <div
            className="glass-card"
            style={{
              width: '100%',
              maxWidth: '460px',
              padding: '24px',
              borderRadius: '16px',
              background: 'var(--bg-card, #ffffff)',
              color: 'var(--text-primary, #1e293b)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 12px 0' }}>
              ✅ Resolve [{resolvingBug.id}]
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary, #64748b)', margin: '0 0 16px 0' }}>
              {resolvingBug.title}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                  Fix Note / Commit Reference
                </label>
                <input
                  type="text"
                  placeholder="e.g. Fixed penny distribution in resolveShares inside tripStore.ts"
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color, #cbd5e1)',
                    background: 'var(--bg-input, #ffffff)',
                    color: 'inherit',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                  Resolved By
                </label>
                <input
                  type="text"
                  value={resolvedByName}
                  onChange={(e) => setResolvedByName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color, #cbd5e1)',
                    background: 'var(--bg-input, #ffffff)',
                    color: 'inherit',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                <button
                  type="button"
                  className="gradient-btn"
                  onClick={handleConfirmResolve}
                  style={{ flex: 1, padding: '10px', fontSize: '14px', borderRadius: '8px', cursor: 'pointer' }}
                >
                  Confirm Resolution
                </button>
                <button
                  type="button"
                  onClick={() => setResolvingBug(null)}
                  style={{
                    padding: '10px 16px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color, #cbd5e1)',
                    background: 'none',
                    color: 'inherit',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
