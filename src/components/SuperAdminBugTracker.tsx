import { Fragment, useState, useEffect, useMemo } from 'react';
import {
  fetchBugs,
  createBug,
  updateBug,
  deleteBug,
  type BugRecord,
} from '../services/bugApi';
import { diagnosticLogger } from '../utils/diagnosticLogger';
import type { ConfirmRequest } from './ConfirmDialog';
import {
  IconChevronLeft,
  IconRefresh,
  IconTrash,
  IconSearch,
  IconPlus,
  IconCopy,
  IconDownload,
  IconAlertCircle,
  IconCheckCircle,
} from './Icons';

type Props = {
  onBack: () => void;
  isAdmin?: boolean;
  onRequestConfirm?: (request: ConfirmRequest) => void;
};

type StatusFilter = 'all' | 'open' | 'in_progress' | 'resolved' | 'critical';

const CATEGORIES: { value: BugRecord['category']; label: string }[] = [
  { value: 'navigation', label: 'Navigation & Routing' },
  { value: 'splits-math', label: 'Splits & Math' },
  { value: 'offline-sync', label: 'Offline & Cloud Sync' },
  { value: 'p2p-sync', label: 'P2P Sync' },
  { value: 'receipts-camera', label: 'Receipts & Camera' },
  { value: 'auth', label: 'Auth & Session' },
  { value: 'ui-ux', label: 'UI / UX' },
  { value: 'performance', label: 'Performance' },
  { value: 'general', label: 'General' },
];

const SEVERITIES: { value: BugRecord['severity']; label: string; color: string }[] = [
  { value: 'critical', label: 'Critical', color: 'var(--color-danger)' },
  { value: 'high', label: 'High', color: 'var(--secondary-accent)' },
  { value: 'medium', label: 'Medium', color: 'var(--text-secondary)' },
  { value: 'low', label: 'Low', color: 'var(--text-muted)' },
];

function severityColor(severity: BugRecord['severity']): string {
  return SEVERITIES.find((s) => s.value === severity)?.color || 'var(--text-muted)';
}

function statusMeta(status: BugRecord['status']): { label: string; color: string } {
  switch (status) {
    case 'open':
      return { label: 'Open', color: 'var(--primary-accent)' };
    case 'in_progress':
      return { label: 'Working', color: 'var(--secondary-accent)' };
    case 'resolved':
      return { label: 'Settled', color: 'var(--color-success)' };
    default:
      return { label: "Won't Fix", color: 'var(--text-muted)' };
  }
}

export function SuperAdminBugTracker({ onBack, isAdmin = true, onRequestConfirm }: Props) {
  const [bugs, setBugs] = useState<BugRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [expandedBugId, setExpandedBugId] = useState<string | null>(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [resolvingBug, setResolvingBug] = useState<BugRecord | null>(null);
  const [resolutionNote, setResolutionNote] = useState('');
  const [resolvedByName, setResolvedByName] = useState('superadmin');
  const [toastMessage, setToastMessage] = useState<{ text: string; tone: 'success' | 'danger' } | null>(null);

  const [newTitle, setNewTitle] = useState('');
  const [newSeverity, setNewSeverity] = useState<BugRecord['severity']>('medium');
  const [newCategory, setNewCategory] = useState<BugRecord['category']>('general');
  const [newDesc, setNewDesc] = useState('');
  const [newSteps, setNewSteps] = useState('');
  const [newExpected, setNewExpected] = useState('');
  const [newActual, setNewActual] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const showToast = (text: string, tone: 'success' | 'danger' = 'success') => {
    setToastMessage({ text, tone });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadBugs = async () => {
    setLoading(true);
    try {
      const data = await fetchBugs();
      setBugs(data);
    } catch {
      showToast('Could not load the ledger', 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBugs();
  }, []);

  const filteredBugs = useMemo(() => {
    return bugs.filter((bug) => {
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

      if (statusFilter === 'open' && bug.status !== 'open') return false;
      if (statusFilter === 'in_progress' && bug.status !== 'in_progress') return false;
      if (statusFilter === 'resolved' && bug.status !== 'resolved') return false;
      if (statusFilter === 'critical' && bug.severity !== 'critical') return false;

      if (categoryFilter !== 'all' && bug.category !== categoryFilter) return false;

      return true;
    });
  }, [bugs, searchQuery, statusFilter, categoryFilter]);

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
      showToast('Give the case a summary first', 'danger');
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
        category: newCategory,
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
      setNewSeverity('medium');
      setNewCategory('general');
      showToast(`Filed ${created.id} to the ledger`);
    } catch {
      showToast('Could not save the case', 'danger');
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
      showToast(`${bug.id} marked ${statusMeta(newStatus).label}`);
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
      showToast(`${resolvingBug.id} settled`);
    }
  };

  const handleDeleteBug = (id: string) => {
    const performDelete = async () => {
      const success = await deleteBug(id);
      if (success) {
        setBugs((prev) => prev.filter((b) => b.id !== id));
        showToast(`${id} removed from the ledger`);
      }
    };

    if (onRequestConfirm) {
      onRequestConfirm({
        title: 'Delete case',
        message: `Delete ${id}? This removes it from the ledger for good.`,
        confirmLabel: 'Delete',
        danger: true,
        onConfirm: performDelete,
      });
    } else if (window.confirm(`Delete ${id}? This removes it from the ledger.`)) {
      performDelete();
    }
  };

  const handleCopyPrompt = async (bug: BugRecord) => {
    const md = `### Bug Report: [${bug.id}] ${bug.title}
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
    showToast(`Copied AI prompt for ${bug.id}`);
  };

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(bugs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trip-tracker-bugs-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Exported bugs.json');
  };

  if (!isAdmin) {
    return (
      <div>
        <div className="settings-subscreen-nav">
          <button type="button" className="settings-back-btn" onClick={onBack}>
            <IconChevronLeft size={18} /> Settings
          </button>
          <h3 className="settings-subscreen-title">Bug Ledger</h3>
          <div style={{ width: '20px' }} />
        </div>
        <div className="glass-card" style={{ textAlign: 'center', padding: '32px 20px' }}>
          <span style={{ color: 'var(--secondary-accent)', margin: '0 auto 12px', display: 'inline-block' }}>
            <IconAlertCircle size={28} className="icon" />
          </span>
          <h3 style={{ fontSize: '17px', fontWeight: 600, marginBottom: '8px' }}>Superadmin access required</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13.5px', maxWidth: '360px', margin: '0 auto 20px' }}>
            The bug ledger is restricted to superadmins and trip admins for system maintenance.
          </p>
          <button type="button" className="gradient-btn" onClick={onBack}>
            Return to Settings
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in" style={{ paddingBottom: '40px' }}>
      <div className="settings-subscreen-nav">
        <button type="button" className="settings-back-btn" onClick={onBack}>
          <IconChevronLeft size={18} /> Settings
        </button>
        <h3 className="settings-subscreen-title">Bug Ledger</h3>
        <button type="button" className="settings-back-btn" onClick={loadBugs} title="Sync with the CLI ledger">
          <IconRefresh size={16} />
        </button>
      </div>

      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 16px' }}>
        Every case found by Antigravity, Claude CLI, or human QA — synced to one ledger.
      </p>

      {toastMessage && (
        <div style={{ position: 'fixed', top: 'calc(16px + env(safe-area-inset-top, 0px))', left: '50%', transform: 'translateX(-50%)', zIndex: 1200 }}>
          <div className="postmark-toast">
            <span
              className="pm-stamp"
              aria-hidden="true"
              style={{
                borderColor: toastMessage.tone === 'success' ? 'var(--color-success)' : 'var(--color-danger)',
                color: toastMessage.tone === 'success' ? 'var(--color-success)' : 'var(--color-danger)',
              }}
            >
              {toastMessage.tone === 'success' ? <IconCheckCircle size={14} className="icon-sm" /> : <IconAlertCircle size={14} className="icon-sm" />}
            </span>
            <span className="pm-text">{toastMessage.text}</span>
          </div>
        </div>
      )}

      <div className="bug-stat-strip" style={{ marginBottom: '14px' }}>
        <button type="button" className={`bug-stat${statusFilter === 'all' ? ' active' : ''}`} onClick={() => setStatusFilter('all')}>
          <span className="n">{stats.total}</span>
          <span className="l">Total</span>
        </button>
        <button type="button" className={`bug-stat${statusFilter === 'open' ? ' active' : ''}`} onClick={() => setStatusFilter('open')}>
          <span className="n" style={{ color: 'var(--primary-accent)' }}>{stats.open}</span>
          <span className="l">Open</span>
        </button>
        <button type="button" className={`bug-stat${statusFilter === 'in_progress' ? ' active' : ''}`} onClick={() => setStatusFilter('in_progress')}>
          <span className="n" style={{ color: 'var(--secondary-accent)' }}>{stats.inProgress}</span>
          <span className="l">Working</span>
        </button>
        <button type="button" className={`bug-stat${statusFilter === 'resolved' ? ' active' : ''}`} onClick={() => setStatusFilter('resolved')}>
          <span className="n" style={{ color: 'var(--color-success)' }}>{stats.resolved}</span>
          <span className="l">Settled</span>
        </button>
        <button type="button" className={`bug-stat${statusFilter === 'critical' ? ' active' : ''}`} onClick={() => setStatusFilter('critical')}>
          <span className="n" style={{ color: 'var(--color-danger)' }}>{stats.critical}</span>
          <span className="l">Critical</span>
        </button>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
        <div className="input-icon-wrap" style={{ flex: 1, minWidth: '180px' }}>
          <IconSearch size={16} className="icon-sm" />
          <input
            type="text"
            className="input-field"
            placeholder="Search case, category, reporter..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="input-field select-field"
          style={{ width: 'auto', flex: '0 0 auto' }}
        >
          <option value="all">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>

        <button type="button" className="secondary-btn" onClick={handleExportJson}>
          <IconDownload size={15} className="icon-sm" /> Export
        </button>

        <button type="button" className="gradient-btn" onClick={() => setShowAddModal(true)} style={{ marginLeft: 'auto' }}>
          <IconPlus size={15} className="icon-sm" /> New Case
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)', fontSize: '13.5px' }}>
          Loading the ledger&hellip;
        </div>
      ) : filteredBugs.length === 0 ? (
        <div className="ledger-empty-prompt" style={{ padding: '32px 16px' }}>
          <div className="ledger-pencil">
            <IconSearch size={15} className="icon-sm" />
          </div>
          <p>No cases match. Great sign, or try clearing filters.</p>
        </div>
      ) : (
        <div className="settings-group-card">
          {filteredBugs.map((bug) => {
            const isExpanded = expandedBugId === bug.id;
            const status = statusMeta(bug.status);

            return (
              <Fragment key={bug.id}>
                <button
                  type="button"
                  className="bug-entry"
                  onClick={() => setExpandedBugId(isExpanded ? null : bug.id)}
                  aria-expanded={isExpanded}
                >
                  <div className="bug-entry-top">
                    <span className="bug-case-id">{bug.id}</span>
                    <span className="stamp-badge" style={{ color: severityColor(bug.severity), fontSize: '10.5px', padding: '1px 8px' }}>
                      {SEVERITIES.find((s) => s.value === bug.severity)?.label || bug.severity}
                    </span>
                    <span className="stamp-badge" style={{ color: status.color, fontSize: '10.5px', padding: '1px 8px', transform: 'rotate(-3deg)' }}>
                      {status.label}
                    </span>
                  </div>
                  <p className="bug-entry-title">{bug.title}</p>
                  <div className="bug-entry-meta">
                    <span className="bug-cat">{bug.category}</span>
                    {' · found by '}{bug.foundBy}{' · '}{new Date(bug.createdAt).toLocaleDateString()}
                    {bug.environment?.route && ` · ${bug.environment.route}`}
                  </div>
                </button>

                {isExpanded && (
                  <div className="bug-case-detail">
                    {bug.reproSteps && bug.reproSteps.length > 0 && (
                      <div className="bug-field">
                        <span className="form-label">Steps to reproduce</span>
                        <ol>
                          {bug.reproSteps.map((step, idx) => (
                            <li key={idx}>{step}</li>
                          ))}
                        </ol>
                      </div>
                    )}

                    {(bug.expectedBehavior || bug.actualBehavior) && (
                      <div className="bug-field" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        {bug.expectedBehavior && (
                          <div>
                            <span className="form-label">Expected</span>
                            <div style={{ fontSize: '12.5px', marginTop: '3px' }}>{bug.expectedBehavior}</div>
                          </div>
                        )}
                        {bug.actualBehavior && (
                          <div>
                            <span className="form-label">Actual</span>
                            <div style={{ fontSize: '12.5px', marginTop: '3px' }}>{bug.actualBehavior}</div>
                          </div>
                        )}
                      </div>
                    )}

                    {bug.diagnostics?.stackTrace && (
                      <div className="bug-field">
                        <span className="form-label">Trace</span>
                        <div className="bug-stack-block" style={{ marginTop: '4px' }}>{bug.diagnostics.stackTrace}</div>
                      </div>
                    )}

                    {bug.status === 'resolved' && (
                      <div className="bug-field bug-resolution-note">
                        <strong>Resolution:</strong> {bug.resolutionNote || 'Resolved'}
                        <div style={{ fontSize: '11px', marginTop: '3px', color: 'var(--text-secondary)' }}>
                          Settled by {bug.resolvedBy || 'superadmin'} on {bug.resolvedAt ? new Date(bug.resolvedAt).toLocaleDateString() : 'N/A'}
                        </div>
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
                      {bug.status === 'open' && (
                        <button type="button" className="secondary-btn" onClick={() => handleStatusChange(bug, 'in_progress')} style={{ fontSize: '12.5px', padding: '8px 14px' }}>
                          Start work
                        </button>
                      )}

                      {bug.status !== 'resolved' ? (
                        <button type="button" className="secondary-btn" onClick={() => handleStatusChange(bug, 'resolved')} style={{ fontSize: '12.5px', padding: '8px 14px', color: 'var(--color-success)', borderColor: 'var(--color-success)' }}>
                          Mark settled
                        </button>
                      ) : (
                        <button type="button" className="secondary-btn" onClick={() => handleStatusChange(bug, 'open')} style={{ fontSize: '12.5px', padding: '8px 14px' }}>
                          Reopen
                        </button>
                      )}

                      <button type="button" className="secondary-btn" onClick={() => handleCopyPrompt(bug)} style={{ fontSize: '12.5px', padding: '8px 14px' }}>
                        <IconCopy size={13} className="icon-sm" /> Copy for AI
                      </button>

                      <button
                        type="button"
                        className="secondary-btn"
                        onClick={() => handleDeleteBug(bug.id)}
                        style={{ marginLeft: 'auto', padding: '8px 10px', color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}
                        aria-label={`Delete ${bug.id}`}
                      >
                        <IconTrash size={14} className="icon-sm" />
                      </button>
                    </div>
                  </div>
                )}
              </Fragment>
            );
          })}
        </div>
      )}

      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="glass-card fade-in modal-sheet" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0, fontFamily: 'var(--font-family-title)' }}>File a case</h3>
              <button type="button" onClick={() => setShowAddModal(false)} className="secondary-btn" style={{ padding: '6px 10px' }}>
                Close
              </button>
            </div>

            <form onSubmit={handleCreateBug}>
              <div className="form-group">
                <label className="form-label">Case summary *</label>
                <input
                  type="text"
                  required
                  className="input-field"
                  placeholder="e.g. Offline sync drops member delete transaction"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Severity</label>
                <div className="badge-row">
                  {SEVERITIES.map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      className={`category-badge${newSeverity === s.value ? ' active' : ''}`}
                      style={newSeverity === s.value ? { borderColor: s.color, background: 'transparent', color: s.color } : undefined}
                      onClick={() => setNewSeverity(s.value)}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Category</label>
                <div className="badge-row">
                  {CATEGORIES.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      className={`category-badge${newCategory === c.value ? ' active' : ''}`}
                      onClick={() => setNewCategory(c.value)}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">What happened</label>
                <textarea
                  rows={3}
                  className="input-field bug-ruled-textarea"
                  placeholder="Explain what's breaking and the impact..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Steps to reproduce (one per line)</label>
                <textarea
                  rows={2}
                  className="input-field"
                  placeholder={'1. Open app\n2. Add 2 members\n3. Tap delete'}
                  value={newSteps}
                  onChange={(e) => setNewSteps(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Expected</label>
                  <input type="text" className="input-field" placeholder="Member deleted successfully" value={newExpected} onChange={(e) => setNewExpected(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Actual</label>
                  <input type="text" className="input-field" placeholder="Member remains in split balances" value={newActual} onChange={(e) => setNewActual(e.target.value)} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                <button type="submit" disabled={isSubmitting} className="gradient-btn" style={{ flex: 1 }}>
                  {isSubmitting ? 'Saving...' : 'Save & sync to ledger'}
                </button>
                <button type="button" className="secondary-btn" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {resolvingBug && (
        <div className="modal-overlay" onClick={() => setResolvingBug(null)}>
          <div className="glass-card fade-in modal-sheet" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: '17px', fontWeight: 700, margin: '0 0 4px', fontFamily: 'var(--font-family-title)' }}>
              Settle {resolvingBug.id}
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 16px' }}>
              {resolvingBug.title}
            </p>

            <div className="form-group">
              <label className="form-label">Fix note / commit reference</label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. Fixed penny distribution in resolveShares inside tripStore.ts"
                value={resolutionNote}
                onChange={(e) => setResolutionNote(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Settled by</label>
              <input type="text" className="input-field" value={resolvedByName} onChange={(e) => setResolvedByName(e.target.value)} />
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
              <button type="button" className="gradient-btn" onClick={handleConfirmResolve} style={{ flex: 1 }}>
                Confirm settlement
              </button>
              <button type="button" className="secondary-btn" onClick={() => setResolvingBug(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
