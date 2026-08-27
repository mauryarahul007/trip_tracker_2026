import { Fragment, useState, useEffect, useMemo, useRef } from 'react';
import { useFocusTrap } from '../hooks/useFocusTrap';
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
import './admin/ops-deck.css';

type Props = {
  onBack: () => void;
  isAdmin?: boolean;
  onRequestConfirm?: (request: ConfirmRequest) => void;
};

type StatusFilter = 'all' | 'open' | 'in_progress' | 'resolved' | 'wont_fix' | 'critical';
type SortMode = 'newest' | 'severity' | 'status';
type ViewMode = 'list' | 'kanban';

const SEVERITY_RANK: Record<BugRecord['severity'], number> = { critical: 0, high: 1, medium: 2, low: 3 };
const STATUS_RANK: Record<BugRecord['status'], number> = { open: 0, in_progress: 1, resolved: 2, wont_fix: 3 };

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
  { value: 'critical', label: 'Critical', color: 'var(--danger)' },
  { value: 'high', label: 'High', color: 'var(--amber)' },
  { value: 'medium', label: 'Medium', color: 'var(--text-secondary)' },
  { value: 'low', label: 'Low', color: 'var(--text-tertiary)' },
];

function severityColor(severity: BugRecord['severity']): string {
  return SEVERITIES.find((s) => s.value === severity)?.color || 'var(--text-tertiary)';
}

function statusMeta(status: BugRecord['status']): { label: string; color: string } {
  switch (status) {
    case 'open':
      return { label: 'Open', color: 'var(--amber)' };
    case 'in_progress':
      return { label: 'Working', color: 'var(--cyan)' };
    case 'resolved':
      return { label: 'Settled', color: 'var(--safe)' };
    default:
      return { label: "Won't Fix", color: 'var(--text-tertiary)' };
  }
}

function BugDetailBody({
  bug,
  onStatusChange,
  onCopyPrompt,
  onDelete,
}: {
  bug: BugRecord;
  onStatusChange: (bug: BugRecord, status: 'open' | 'in_progress' | 'resolved' | 'wont_fix') => void;
  onCopyPrompt: (bug: BugRecord) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <>
      {bug.reproSteps && bug.reproSteps.length > 0 && (
        <div className="ops-bug-field">
          <span className="ops-bug-label">Steps to reproduce</span>
          <ol>
            {bug.reproSteps.map((step, idx) => (
              <li key={idx}>{step}</li>
            ))}
          </ol>
        </div>
      )}

      {(bug.expectedBehavior || bug.actualBehavior) && (
        <div className="ops-bug-field" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          {bug.expectedBehavior && (
            <div>
              <span className="ops-bug-label">Expected</span>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{bug.expectedBehavior}</div>
            </div>
          )}
          {bug.actualBehavior && (
            <div>
              <span className="ops-bug-label">Actual</span>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{bug.actualBehavior}</div>
            </div>
          )}
        </div>
      )}

      {bug.diagnostics?.stackTrace && (
        <div className="ops-bug-field">
          <span className="ops-bug-label">Trace</span>
          <div className="ops-bug-stack">{bug.diagnostics.stackTrace}</div>
        </div>
      )}

      {bug.status === 'resolved' && (
        <div className="ops-bug-field ops-bug-resolution">
          <strong>Resolution:</strong> {bug.resolutionNote || 'Resolved'}
          <div style={{ fontSize: '10.5px', marginTop: '3px', color: 'var(--text-secondary)' }}>
            Settled by {bug.resolvedBy || 'superadmin'} on {bug.resolvedAt ? new Date(bug.resolvedAt).toLocaleDateString() : 'N/A'}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
        {bug.status === 'open' && (
          <button type="button" className="ops-btn" onClick={() => onStatusChange(bug, 'in_progress')}>
            Start work
          </button>
        )}

        {bug.status !== 'resolved' && bug.status !== 'wont_fix' && (
          <button
            type="button"
            className="ops-btn"
            onClick={() => onStatusChange(bug, 'resolved')}
            style={{ color: 'var(--safe)', borderColor: 'var(--safe-line)' }}
          >
            Mark settled
          </button>
        )}

        {bug.status !== 'resolved' && bug.status !== 'wont_fix' && (
          <button type="button" className="ops-btn" onClick={() => onStatusChange(bug, 'wont_fix')}>
            Won't fix
          </button>
        )}

        {(bug.status === 'resolved' || bug.status === 'wont_fix') && (
          <button type="button" className="ops-btn" onClick={() => onStatusChange(bug, 'open')}>
            Reopen
          </button>
        )}

        <button type="button" className="ops-btn" onClick={() => onCopyPrompt(bug)}>
          <IconCopy size={13} className="icon-sm" /> Copy for AI
        </button>

        <button
          type="button"
          className="ops-btn"
          onClick={() => onDelete(bug.id)}
          style={{ marginLeft: 'auto', color: 'var(--danger)', borderColor: 'rgba(255,107,94,0.4)' }}
          aria-label={`Delete ${bug.id}`}
        >
          <IconTrash size={14} className="icon-sm" />
        </button>
      </div>
    </>
  );
}

export function SuperAdminBugTracker({ onBack, isAdmin = true, onRequestConfirm }: Props) {
  const [bugs, setBugs] = useState<BugRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [expandedBugId, setExpandedBugId] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>('newest');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [drawerBugId, setDrawerBugId] = useState<string | null>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const addModalRef = useRef<HTMLDivElement>(null);
  const resolveDrawerRef = useRef<HTMLDivElement>(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [resolvingBug, setResolvingBug] = useState<BugRecord | null>(null);
  const [resolutionNote, setResolutionNote] = useState('');
  const [resolvedByName, setResolvedByName] = useState('superadmin');

  useFocusTrap(drawerRef, Boolean(drawerBugId), false, () => setDrawerBugId(null));
  useFocusTrap(addModalRef, showAddModal, false, () => setShowAddModal(false));
  useFocusTrap(resolveDrawerRef, Boolean(resolvingBug), false, () => setResolvingBug(null));
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
      if (statusFilter === 'wont_fix' && bug.status !== 'wont_fix') return false;
      if (statusFilter === 'critical' && bug.severity !== 'critical') return false;

      if (categoryFilter !== 'all' && bug.category !== categoryFilter) return false;

      return true;
    });
  }, [bugs, searchQuery, statusFilter, categoryFilter]);

  const sortedBugs = useMemo(() => {
    if (sortMode === 'newest') return filteredBugs;
    const sorted = [...filteredBugs];
    if (sortMode === 'severity') sorted.sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]);
    if (sortMode === 'status') sorted.sort((a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status]);
    return sorted;
  }, [filteredBugs, sortMode]);

  const drawerBug = drawerBugId ? bugs.find((b) => b.id === drawerBugId) || null : null;

  const stats = useMemo(() => {
    const total = bugs.length;
    const open = bugs.filter((b) => b.status === 'open').length;
    const inProgress = bugs.filter((b) => b.status === 'in_progress').length;
    const resolved = bugs.filter((b) => b.status === 'resolved').length;
    const wontFix = bugs.filter((b) => b.status === 'wont_fix').length;
    const critical = bugs.filter((b) => b.severity === 'critical' && b.status !== 'resolved').length;
    return { total, open, inProgress, resolved, wontFix, critical };
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

  const handleStatusChange = async (bug: BugRecord, newStatus: 'open' | 'in_progress' | 'resolved' | 'wont_fix') => {
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
      <div className="ops-deck" style={{ margin: '-16px -20px', padding: '20px', minHeight: '100%' }}>
        <div className="ops-page-head">
          <div>
            <h2>Bug Ledger</h2>
            <p>Restricted to superadmins and trip admins for system maintenance.</p>
          </div>
          <button type="button" className="ops-btn" onClick={onBack}>
            <IconChevronLeft size={14} className="icon-sm" /> Settings
          </button>
        </div>
        <div className="ops-card" style={{ textAlign: 'center', padding: '32px 20px' }}>
          <span style={{ color: 'var(--amber)', margin: '0 auto 12px', display: 'inline-block' }}>
            <IconAlertCircle size={28} className="icon" />
          </span>
          <h3 style={{ fontFamily: 'var(--display)', fontSize: '15px', fontWeight: 700, marginBottom: '8px', color: 'var(--text-primary)' }}>Superadmin access required</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '12.5px', maxWidth: '360px', margin: '0 auto 20px' }}>
            The bug ledger is restricted to superadmins and trip admins for system maintenance.
          </p>
          <button type="button" className="ops-btn ops-btn-primary" onClick={onBack} style={{ padding: '9px 18px' }}>
            Return to Settings
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="ops-deck fade-in" style={{ margin: '-16px -20px', padding: '20px', paddingBottom: '40px', minHeight: '100%' }}>
      <div className="ops-page-head">
        <div>
          <h2>Bug Ledger</h2>
          <p>Every case found by Antigravity, Claude CLI, or human QA — synced to one ledger.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button type="button" className="ops-btn" onClick={loadBugs} title="Sync with the CLI ledger">
            <IconRefresh size={14} className="icon-sm" />
          </button>
          <button type="button" className="ops-btn" onClick={onBack}>
            <IconChevronLeft size={14} className="icon-sm" /> Settings
          </button>
        </div>
      </div>

      {toastMessage && (
        <div
          className="ops-toast"
          style={
            toastMessage.tone === 'danger'
              ? { background: 'var(--danger-dim)', borderColor: 'rgba(255,107,94,0.35)', color: 'var(--danger)' }
              : undefined
          }
        >
          {toastMessage.tone === 'success' ? <IconCheckCircle size={14} /> : <IconAlertCircle size={14} />}
          {toastMessage.text}
        </div>
      )}

      <div className="ops-stat-row" style={{ marginBottom: '14px' }}>
        <button type="button" className="ops-stat-btn" data-active={statusFilter === 'all'} onClick={() => setStatusFilter('all')}>
          <span className="n">{stats.total}</span>
          <span className="l">Total</span>
        </button>
        <button type="button" className="ops-stat-btn" data-active={statusFilter === 'open'} onClick={() => setStatusFilter('open')}>
          <span className="n" style={{ color: 'var(--amber)' }}>{stats.open}</span>
          <span className="l">Open</span>
        </button>
        <button type="button" className="ops-stat-btn" data-active={statusFilter === 'in_progress'} onClick={() => setStatusFilter('in_progress')}>
          <span className="n" style={{ color: 'var(--cyan)' }}>{stats.inProgress}</span>
          <span className="l">Working</span>
        </button>
        <button type="button" className="ops-stat-btn" data-active={statusFilter === 'resolved'} onClick={() => setStatusFilter('resolved')}>
          <span className="n" style={{ color: 'var(--safe)' }}>{stats.resolved}</span>
          <span className="l">Settled</span>
        </button>
        <button type="button" className="ops-stat-btn" data-active={statusFilter === 'wont_fix'} onClick={() => setStatusFilter('wont_fix')}>
          <span className="n" style={{ color: 'var(--text-tertiary)' }}>{stats.wontFix}</span>
          <span className="l">Won't Fix</span>
        </button>
        <button type="button" className="ops-stat-btn" data-active={statusFilter === 'critical'} onClick={() => setStatusFilter('critical')}>
          <span className="n" style={{ color: 'var(--danger)' }}>{stats.critical}</span>
          <span className="l">Critical</span>
        </button>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
        <div className="ops-search-wrap" style={{ minWidth: '180px' }}>
          <IconSearch size={16} />
          <input
            type="text"
            className="ops-input"
            placeholder="Search case, category, reporter..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="ops-select"
          style={{ width: 'auto', flex: '0 0 auto' }}
        >
          <option value="all">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>

        <select
          value={sortMode}
          onChange={(e) => setSortMode(e.target.value as SortMode)}
          className="ops-select"
          style={{ width: 'auto', flex: '0 0 auto' }}
          aria-label="Sort cases"
        >
          <option value="newest">Sort: Newest</option>
          <option value="severity">Sort: Severity</option>
          <option value="status">Sort: Status</option>
        </select>

        <div style={{ display: 'flex', gap: '2px', background: 'var(--bg-inset)', border: '1px solid var(--line-strong)', borderRadius: '10px', padding: '2px' }}>
          <button
            type="button"
            className="ops-chip"
            data-active={viewMode === 'list'}
            style={{ border: 'none', padding: '5px 10px' }}
            onClick={() => setViewMode('list')}
          >
            List
          </button>
          <button
            type="button"
            className="ops-chip"
            data-active={viewMode === 'kanban'}
            style={{ border: 'none', padding: '5px 10px' }}
            onClick={() => setViewMode('kanban')}
          >
            Kanban
          </button>
        </div>

        <button type="button" className="ops-btn" onClick={handleExportJson}>
          <IconDownload size={14} className="icon-sm" /> Export
        </button>

        <button type="button" className="ops-btn ops-btn-primary" onClick={() => setShowAddModal(true)} style={{ marginLeft: 'auto' }}>
          <IconPlus size={14} className="icon-sm" /> New Case
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)', fontSize: '13px' }}>
          Loading the ledger&hellip;
        </div>
      ) : sortedBugs.length === 0 ? (
        <div className="ops-card ops-empty-prompt">
          <IconSearch size={20} className="icon" style={{ color: 'var(--text-tertiary)', marginBottom: '8px' }} />
          <p style={{ margin: 0 }}>No cases match. Great sign, or try clearing filters.</p>
        </div>
      ) : viewMode === 'kanban' ? (
        <div className="ops-kanban">
          {(
            [
              { status: 'open' as const, label: 'Backlog (Open)', color: 'var(--amber)' },
              { status: 'in_progress' as const, label: 'Working (In Progress)', color: 'var(--cyan)' },
              { status: 'resolved' as const, label: 'Settled (Resolved)', color: 'var(--safe)' },
              { status: 'wont_fix' as const, label: "Won't Fix", color: 'var(--text-tertiary)' },
            ]
          ).map((col) => {
            const colBugs = sortedBugs.filter((b) => b.status === col.status);
            return (
              <div className="ops-kanban-col" key={col.status}>
                <div className="ops-kanban-col-head">
                  <span className="dot" style={{ background: col.color }} />
                  {col.label}
                  <span className="count">{colBugs.length}</span>
                </div>
                {colBugs.length === 0 ? (
                  <div className="ops-ov-empty">No cases</div>
                ) : (
                  colBugs.map((bug) => (
                    <button
                      key={bug.id}
                      type="button"
                      className="ops-kanban-card"
                      data-severity={bug.severity}
                      onClick={() => setDrawerBugId(bug.id)}
                    >
                      <span className="ops-bug-id">{bug.id}</span>
                      <div className="title">{bug.title}</div>
                      <div className="meta">{bug.category} &middot; {bug.foundBy}</div>
                    </button>
                  ))
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="ops-bug-list">
          {sortedBugs.map((bug) => {
            const isExpanded = expandedBugId === bug.id;
            const status = statusMeta(bug.status);

            return (
              <Fragment key={bug.id}>
                <button
                  type="button"
                  className="ops-bug-entry"
                  data-severity={bug.severity}
                  onClick={() => setExpandedBugId(isExpanded ? null : bug.id)}
                  aria-expanded={isExpanded}
                >
                  <div className="ops-bug-top">
                    <span className="ops-bug-id">{bug.id}</span>
                    <span
                      className="ops-pill"
                      style={{ color: severityColor(bug.severity), background: 'var(--bg-inset)' }}
                    >
                      {SEVERITIES.find((s) => s.value === bug.severity)?.label || bug.severity}
                    </span>
                    <span className="ops-pill" style={{ color: status.color, background: 'var(--bg-inset)' }}>
                      {status.label}
                    </span>
                  </div>
                  <p className="ops-bug-title">{bug.title}</p>
                  <div className="ops-bug-meta">
                    <span className="cat">{bug.category}</span>
                    {' · found by '}{bug.foundBy}{' · '}{new Date(bug.createdAt).toLocaleDateString()}
                    {bug.environment?.route && ` · ${bug.environment.route}`}
                  </div>
                </button>

                {isExpanded && (
                  <div className="ops-bug-detail">
                    <BugDetailBody bug={bug} onStatusChange={handleStatusChange} onCopyPrompt={handleCopyPrompt} onDelete={handleDeleteBug} />
                  </div>
                )}
              </Fragment>
            );
          })}
        </div>
      )}

      {drawerBug && (
        <div className="ops-drawer-overlay" onClick={() => setDrawerBugId(null)}>
          <div
            ref={drawerRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="bug-drawer-title"
            className="ops-drawer"
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px', gap: '10px' }}>
              <div>
                <span className="ops-bug-id">{drawerBug.id}</span>
                <h3 id="bug-drawer-title" style={{ fontFamily: 'var(--display)', fontSize: '16px', fontWeight: 700, margin: '4px 0 0', color: 'var(--text-primary)' }}>{drawerBug.title}</h3>
              </div>
              <button type="button" onClick={() => setDrawerBugId(null)} className="ops-btn" style={{ padding: '6px 10px', flexShrink: 0 }}>
                Close
              </button>
            </div>
            <div className="ops-bug-detail" style={{ padding: 0, border: 'none', background: 'transparent' }}>
              <BugDetailBody bug={drawerBug} onStatusChange={handleStatusChange} onCopyPrompt={handleCopyPrompt} onDelete={handleDeleteBug} />
            </div>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="ops-drawer-overlay" onClick={() => setShowAddModal(false)}>
          <div
            ref={addModalRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-bug-title"
            className="ops-drawer"
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 id="add-bug-title" style={{ fontFamily: 'var(--display)', fontSize: '17px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>File a case</h3>
              <button type="button" onClick={() => setShowAddModal(false)} className="ops-btn" style={{ padding: '6px 10px' }}>
                Close
              </button>
            </div>

            <form onSubmit={handleCreateBug}>
              <div className="ops-form-group">
                <label className="ops-form-label" htmlFor="new-bug-title">Case summary *</label>
                <input
                  id="new-bug-title"
                  type="text"
                  required
                  className="ops-input"
                  placeholder="e.g. Offline sync drops member delete transaction"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                />
              </div>

              <fieldset className="ops-form-group">
                <legend className="ops-form-label">Severity</legend>
                <div className="ops-filter-row" style={{ marginBottom: 0 }}>
                  {SEVERITIES.map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      className="ops-chip"
                      data-active={newSeverity === s.value}
                      style={newSeverity === s.value ? { borderColor: s.color, color: s.color, background: 'var(--bg-inset)' } : undefined}
                      onClick={() => setNewSeverity(s.value)}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </fieldset>

              <fieldset className="ops-form-group">
                <legend className="ops-form-label">Category</legend>
                <div className="ops-filter-row" style={{ marginBottom: 0 }}>
                  {CATEGORIES.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      className="ops-chip"
                      data-active={newCategory === c.value}
                      onClick={() => setNewCategory(c.value)}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </fieldset>

              <div className="ops-form-group">
                <label className="ops-form-label" htmlFor="new-bug-desc">What happened</label>
                <textarea
                  id="new-bug-desc"
                  rows={3}
                  className="ops-input"
                  placeholder="Explain what's breaking and the impact..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                />
              </div>

              <div className="ops-form-group">
                <label className="ops-form-label" htmlFor="new-bug-steps">Steps to reproduce (one per line)</label>
                <textarea
                  id="new-bug-steps"
                  rows={2}
                  className="ops-input"
                  placeholder={'1. Open app\n2. Add 2 members\n3. Tap delete'}
                  value={newSteps}
                  onChange={(e) => setNewSteps(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="ops-form-group">
                  <label className="ops-form-label" htmlFor="new-bug-expected">Expected</label>
                  <input id="new-bug-expected" type="text" className="ops-input" placeholder="Member deleted successfully" value={newExpected} onChange={(e) => setNewExpected(e.target.value)} />
                </div>
                <div className="ops-form-group">
                  <label className="ops-form-label" htmlFor="new-bug-actual">Actual</label>
                  <input id="new-bug-actual" type="text" className="ops-input" placeholder="Member remains in split balances" value={newActual} onChange={(e) => setNewActual(e.target.value)} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                <button type="submit" disabled={isSubmitting} className="ops-btn ops-btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
                  {isSubmitting ? 'Saving...' : 'Save & sync to ledger'}
                </button>
                <button type="button" className="ops-btn" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {resolvingBug && (
        <div className="ops-drawer-overlay" onClick={() => setResolvingBug(null)}>
          <div
            ref={resolveDrawerRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="resolve-bug-title"
            className="ops-drawer"
            style={{ maxWidth: '420px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="resolve-bug-title" style={{ fontFamily: 'var(--display)', fontSize: '16px', fontWeight: 700, margin: '0 0 4px', color: 'var(--text-primary)' }}>
              Settle {resolvingBug.id}
            </h3>
            <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', margin: '0 0 16px' }}>
              {resolvingBug.title}
            </p>

            <div className="ops-form-group">
              <label className="ops-form-label" htmlFor="resolve-fix-note">Fix note / commit reference</label>
              <input
                id="resolve-fix-note"
                type="text"
                className="ops-input"
                placeholder="e.g. Fixed penny distribution in resolveShares inside tripStore.ts"
                value={resolutionNote}
                onChange={(e) => setResolutionNote(e.target.value)}
              />
            </div>

            <div className="ops-form-group">
              <label className="ops-form-label" htmlFor="resolve-settled-by">Settled by</label>
              <input id="resolve-settled-by" type="text" className="ops-input" value={resolvedByName} onChange={(e) => setResolvedByName(e.target.value)} />
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
              <button type="button" className="ops-btn ops-btn-primary" onClick={handleConfirmResolve} style={{ flex: 1, justifyContent: 'center' }}>
                Confirm settlement
              </button>
              <button type="button" className="ops-btn" onClick={() => setResolvingBug(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
