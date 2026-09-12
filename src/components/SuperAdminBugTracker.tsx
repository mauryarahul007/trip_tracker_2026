import { useState, useEffect, useMemo, useRef, Fragment } from 'react';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { useHistoryBack } from '../utils/useHistoryBack';
import { useEscapeKey } from '../utils/useEscapeKey';
import {
  fetchBugs,
  createBug,
  updateBug,
  deleteBug,
  appendBugActivity,
  bugFingerprint,
  type BugRecord,
} from '../services/bugApi';
import { diagnosticLogger } from '../utils/diagnosticLogger';
import { formatRelativeTime } from '../utils/relativeTime';
import { initialsFrom } from '../utils/initials';
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
  onBack?: () => void;
  isAdmin?: boolean;
  onRequestConfirm?: (request: ConfirmRequest) => void;
  embedded?: boolean;
  onBugsChanged?: () => void | Promise<void>;
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
  { value: 'critical', label: 'Critical', color: 'var(--severity-critical)' },
  { value: 'high', label: 'High', color: 'var(--severity-high)' },
  { value: 'medium', label: 'Medium', color: 'var(--severity-medium)' },
  { value: 'low', label: 'Low', color: 'var(--severity-low)' },
];

function severityColor(severity: BugRecord['severity']): string {
  return SEVERITIES.find((s) => s.value === severity)?.color || 'var(--text-tertiary)';
}

function statusMeta(status: BugRecord['status']): { label: string; color: string } {
  switch (status) {
    case 'open':
      return { label: 'Open', color: 'var(--status-open)' };
    case 'in_progress':
      return { label: 'In Progress', color: 'var(--cyan)' };
    case 'resolved':
      return { label: 'Resolved', color: 'var(--safe)' };
    default:
      return { label: "Won't Fix", color: 'var(--text-tertiary)' };
  }
}

function BugDetailBody({
  bug,
  similarCount,
  onStatusChange,
  onCopyPrompt,
  onDelete,
  onAssign,
}: {
  bug: BugRecord;
  similarCount: number;
  onStatusChange: (bug: BugRecord, status: 'open' | 'in_progress' | 'resolved' | 'wont_fix') => void;
  onCopyPrompt: (bug: BugRecord) => void;
  onDelete: (id: string) => void;
  onAssign: (bug: BugRecord, assignee: string) => void;
}) {
  const hasDiagnostics = Boolean(bug.diagnostics?.stackTrace || bug.diagnostics?.consoleLogs?.length || bug.diagnostics?.syncQueueLength !== undefined || bug.diagnostics?.activeTripId || bug.diagnostics?.screenshot);
  const [tab, setTab] = useState<'details' | 'diagnostics' | 'history'>('details');

  return (
    <>
      {bug.status === 'resolved' && (
        <div className="ops-bug-field ops-bug-resolution">
          <strong>Resolution:</strong> {bug.resolutionNote || 'Resolved'}
          <div style={{ fontSize: '10.5px', marginTop: '3px', color: 'var(--text-secondary)' }}>
            Resolved by {bug.resolvedBy || 'superadmin'} on {bug.resolvedAt ? new Date(bug.resolvedAt).toLocaleDateString() : 'N/A'}
          </div>
        </div>
      )}

      <div className="ops-bug-tabs" role="tablist">
        <button type="button" role="tab" className="ops-bug-tab" data-active={tab === 'details'} onClick={() => setTab('details')}>Details</button>
        {hasDiagnostics && (
          <button type="button" role="tab" className="ops-bug-tab" data-active={tab === 'diagnostics'} onClick={() => setTab('diagnostics')}>Diagnostics</button>
        )}
        <button type="button" role="tab" className="ops-bug-tab" data-active={tab === 'history'} onClick={() => setTab('history')}>History</button>
      </div>

      {tab === 'details' && (
        <>
          {similarCount > 1 && (
            <div className="ops-bug-field" style={{ color: 'var(--warning)' }}>
              <span className="ops-bug-label">Similar cases</span>
              {similarCount} reports share this fingerprint
            </div>
          )}
          {bug.assignee && (
            <div className="ops-bug-field">
              <span className="ops-bug-label">Assignee</span>
              {bug.assignee}
            </div>
          )}
          {bug.githubSha && (
            <div className="ops-bug-field">
              <span className="ops-bug-label">Git SHA</span>
              <code className="ops-flag-key">{bug.githubSha}</code>
            </div>
          )}
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

          {!bug.reproSteps?.length && !bug.expectedBehavior && !bug.actualBehavior && (
            <div className="ops-empty" style={{ padding: '12px 0' }}>No repro details recorded.</div>
          )}
        </>
      )}

      {tab === 'diagnostics' && (
        <>
          {bug.diagnostics?.stackTrace && (
            <div className="ops-bug-field">
              <span className="ops-bug-label">Trace</span>
              <div className="ops-bug-stack">{bug.diagnostics.stackTrace}</div>
            </div>
          )}
          {bug.diagnostics?.consoleLogs && bug.diagnostics.consoleLogs.length > 0 && (
            <div className="ops-bug-field">
              <span className="ops-bug-label">Console (at time of report)</span>
              <div className="ops-bug-stack">{bug.diagnostics.consoleLogs.join('\n')}</div>
            </div>
          )}
          {(bug.diagnostics?.syncQueueLength !== undefined || bug.diagnostics?.activeTripId) && (
            <div className="ops-bug-field" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {bug.diagnostics?.syncQueueLength !== undefined && (
                <div>
                  <span className="ops-bug-label">Sync queue length</span>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{bug.diagnostics.syncQueueLength}</div>
                </div>
              )}
              {bug.diagnostics?.screenshot && (
                <div>
                  <span className="ops-bug-label">Screenshot</span>
                  <img src={bug.diagnostics.screenshot} alt={`Screenshot for ${bug.id}`} style={{ maxWidth: '100%', borderRadius: '10px', marginTop: '6px', border: '1px solid var(--line)' }} />
                </div>
              )}
            </div>
          )}
        </>
      )}

      {tab === 'history' && (
        <div className="ops-bug-field" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            <span className="ops-bug-label" style={{ display: 'inline' }}>Filed</span>{' '}
            {new Date(bug.createdAt).toLocaleString()} by {bug.foundBy}
          </div>
          {bug.updatedAt && bug.updatedAt !== bug.createdAt && (
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              <span className="ops-bug-label" style={{ display: 'inline' }}>Last updated</span>{' '}
              {new Date(bug.updatedAt).toLocaleString()}
            </div>
          )}
          {bug.resolvedAt && (
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              <span className="ops-bug-label" style={{ display: 'inline' }}>Resolved</span>{' '}
              {new Date(bug.resolvedAt).toLocaleString()} by {bug.resolvedBy || 'superadmin'}
            </div>
          )}
          {(bug.activity || []).map((entry, i) => (
            <div key={`${entry.at}-${i}`} style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              <span className="ops-bug-label" style={{ display: 'inline' }}>{entry.action}</span>{' '}
              {new Date(entry.at).toLocaleString()} by {entry.by}
              {entry.note ? ` — ${entry.note}` : ''}
            </div>
          ))}
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
            Mark resolved
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

        <label className="ops-form-label" htmlFor={`assign-${bug.id}`} style={{ marginTop: '8px' }}>Assign to</label>
        <input
          id={`assign-${bug.id}`}
          type="text"
          className="ops-input"
          defaultValue={bug.assignee || ''}
          placeholder="Name or email"
          onBlur={(e) => {
            const next = e.target.value.trim();
            if (next !== (bug.assignee || '')) onAssign(bug, next);
          }}
        />

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

export function SuperAdminBugTracker({ onBack, isAdmin = true, onRequestConfirm, embedded = false, onBugsChanged }: Props) {
  const [bugs, setBugs] = useState<BugRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
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
  const [draggedBugId, setDraggedBugId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<BugRecord['status'] | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedBugIds, setExpandedBugIds] = useState<Set<string>>(new Set());

  const toggleExpandBug = (id: string) => {
    setExpandedBugIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  useFocusTrap(drawerRef, Boolean(drawerBugId), false, () => setDrawerBugId(null));
  useFocusTrap(addModalRef, showAddModal, false, () => setShowAddModal(false));
  useFocusTrap(resolveDrawerRef, Boolean(resolvingBug), false, () => setResolvingBug(null));

  // Stack navigation: sub-modals pop first; parent owns closing the root tracker
  useHistoryBack(Boolean(resolvingBug), () => setResolvingBug(null));
  useHistoryBack(showAddModal, () => setShowAddModal(false));
  useHistoryBack(Boolean(drawerBugId), () => setDrawerBugId(null));

  useEscapeKey(Boolean(resolvingBug), () => setResolvingBug(null));
  useEscapeKey(showAddModal, () => setShowAddModal(false));
  useEscapeKey(Boolean(drawerBugId), () => setDrawerBugId(null));
  const [toasts, setToasts] = useState<{ id: number; text: string; tone: 'success' | 'danger' }[]>([]);

  const [newTitle, setNewTitle] = useState('');
  const [newSeverity, setNewSeverity] = useState<BugRecord['severity']>('medium');
  const [newCategory, setNewCategory] = useState<BugRecord['category']>('general');
  const [newDesc, setNewDesc] = useState('');
  const [newSteps, setNewSteps] = useState('');
  const [newExpected, setNewExpected] = useState('');
  const [newActual, setNewActual] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const showToast = (text: string, tone: 'success' | 'danger' = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, text, tone }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  };

  const loadBugs = async (opts?: { quiet?: boolean }) => {
    if (!opts?.quiet) setLoading(true);
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

  const similarCountByFp = useMemo(() => {
    const counts = new Map<string, number>();
    for (const bug of bugs) {
      if (!bug.fingerprint) continue;
      counts.set(bug.fingerprint, (counts.get(bug.fingerprint) || 0) + 1);
    }
    return counts;
  }, [bugs]);

  const drawerBug = drawerBugId ? bugs.find((b) => b.id === drawerBugId) || null : null;

  const stats = useMemo(() => {
    const total = bugs.length;
    const open = bugs.filter((b) => b.status === 'open').length;
    const inProgress = bugs.filter((b) => b.status === 'in_progress').length;
    const resolved = bugs.filter((b) => b.status === 'resolved').length;
    const wontFix = bugs.filter((b) => b.status === 'wont_fix').length;
    const critical = bugs.filter((b) => b.severity === 'critical' && b.status !== 'resolved' && b.status !== 'wont_fix').length;
    const pipeline = Math.max(open + inProgress + resolved, 1);
    return { total, open, inProgress, resolved, wontFix, critical, pipeline };
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
        fingerprint: bugFingerprint({
          title: newTitle.trim(),
          category: newCategory,
          route: snapshot.state.routeHash,
        }),
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

    const updated = await updateBug(bug.id, {
      status: newStatus,
      activity: appendBugActivity(bug.activity, {
        by: resolvedByName || 'superadmin',
        action: 'status',
        note: `${bug.status} → ${newStatus}`,
      }),
    });
    if (updated) {
      setBugs((prev) => prev.map((b) => (b.id === bug.id ? updated : b)));
      showToast(`${bug.id} marked ${statusMeta(newStatus).label}`);
      void onBugsChanged?.();
    }
  };

  const handleConfirmResolve = async () => {
    if (!resolvingBug) return;
    const shaMatch = resolutionNote.match(/\b[0-9a-f]{7,40}\b/i);
    const updated = await updateBug(resolvingBug.id, {
      status: 'resolved',
      resolvedBy: resolvedByName,
      resolutionNote: resolutionNote.trim() || 'Resolved by superadmin',
      resolvedAt: new Date().toISOString(),
      githubSha: shaMatch ? shaMatch[0] : resolvingBug.githubSha,
      activity: appendBugActivity(resolvingBug.activity, {
        by: resolvedByName || 'superadmin',
        action: 'resolved',
        note: resolutionNote.trim() || undefined,
      }),
    });

    if (updated) {
      setBugs((prev) => prev.map((b) => (b.id === resolvingBug.id ? updated : b)));
      setResolvingBug(null);
      showToast(`${resolvingBug.id} resolved`);
      void onBugsChanged?.();
    }
  };

  const handleAssign = async (bug: BugRecord, assignee: string) => {
    const updated = await updateBug(bug.id, {
      assignee,
      activity: appendBugActivity(bug.activity, {
        by: resolvedByName || 'superadmin',
        action: 'assign',
        note: assignee || 'unassigned',
      }),
    });
    if (updated) {
      setBugs((prev) => prev.map((b) => (b.id === bug.id ? updated : b)));
      showToast(assignee ? `${bug.id} assigned to ${assignee}` : `${bug.id} unassigned`);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === sortedBugs.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(sortedBugs.map((b) => b.id)));
  };

  const handleBulkStatusChange = async (status: BugRecord['status']) => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    if (status === 'resolved') {
      if (!onRequestConfirm) {
        showToast('Confirm the resolve action from the Ops Deck', 'danger');
        return;
      }
      onRequestConfirm({
        title: 'Resolve selected cases',
        message: `Mark ${ids.length} case${ids.length === 1 ? '' : 's'} resolved?`,
        confirmLabel: 'Resolve',
        onConfirm: async () => {
          for (const id of ids) {
            const bug = bugs.find((b) => b.id === id);
            if (!bug) continue;
            await updateBug(id, {
              status: 'resolved',
              resolvedBy: resolvedByName,
              resolutionNote: 'Resolved via bulk action',
              resolvedAt: new Date().toISOString(),
              activity: appendBugActivity(bug.activity, { by: resolvedByName || 'superadmin', action: 'resolved', note: 'bulk' }),
            });
          }
          setSelectedIds(new Set());
          await loadBugs();
          void onBugsChanged?.();
          showToast(`Resolved ${ids.length} cases`);
        },
      });
      return;
    }
    for (const id of ids) {
      const bug = bugs.find((b) => b.id === id);
      if (!bug) continue;
      await updateBug(id, {
        status,
        activity: appendBugActivity(bug.activity, { by: resolvedByName || 'superadmin', action: 'status', note: `bulk → ${status}` }),
      });
    }
    setSelectedIds(new Set());
    await loadBugs();
    void onBugsChanged?.();
    showToast(`Updated ${ids.length} cases to ${statusMeta(status).label}`);
  };

  const handleDeleteBug = (id: string) => {
    const performDelete = async () => {
      const success = await deleteBug(id);
      if (success) {
        setBugs((prev) => prev.filter((b) => b.id !== id));
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        showToast(`${id} removed from the ledger`);
        void onBugsChanged?.();
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
      return;
    }
    showToast('Confirm dialog is required to delete a case', 'danger');
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
          {onBack && (
            <button type="button" className="ops-btn" onClick={onBack} aria-label="Go back" title="Go back">
              <IconChevronLeft size={14} className="icon-sm" /> Back
            </button>
          )}
        </div>
        <div className="ops-card" style={{ textAlign: 'center', padding: '32px 20px' }}>
          <span style={{ color: 'var(--amber)', margin: '0 auto 12px', display: 'inline-block' }}>
            <IconAlertCircle size={28} className="icon" />
          </span>
          <h3 style={{ fontFamily: 'var(--display)', fontSize: '15px', fontWeight: 700, marginBottom: '8px', color: 'var(--text-primary)' }}>Superadmin access required</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '12.5px', maxWidth: '360px', margin: '0 auto 20px' }}>
            The bug ledger is restricted to superadmins and trip admins for system maintenance.
          </p>
          {onBack && (
          <button type="button" className="ops-btn ops-btn-primary" onClick={onBack} style={{ padding: '9px 18px' }} aria-label="Go back" title="Go back">
            Return to Previous Screen
          </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={embedded ? 'fade-in' : 'ops-deck fade-in'}
      style={embedded ? { display: 'flex', flexDirection: 'column', gap: '16px' } : { margin: '-16px -20px', padding: '20px', paddingBottom: '40px', minHeight: '100%' }}
    >
      <div className="ops-page-head">
        <div>
          <h2>Bug Ledger</h2>
          <p>Triage traveler-reported cases. Scan the table, open a drawer, or drag the board.</p>
        </div>
        <div className="ops-page-head-actions">
          {stats.critical > 0 && (
            <button
              type="button"
              className="ops-badge grounded"
              onClick={() => setStatusFilter(statusFilter === 'critical' ? 'all' : 'critical')}
              aria-pressed={statusFilter === 'critical'}
            >
              {stats.critical} critical
            </button>
          )}
          <button type="button" className="ops-btn" disabled={loading} onClick={() => void loadBugs({ quiet: true })} title="Sync with the ledger" aria-label="Refresh cases">
            <IconRefresh size={13} className={loading ? 'icon-sm ops-spin' : 'icon-sm'} /> {loading ? 'Refreshing...' : 'Refresh'}
          </button>
          <button type="button" className="ops-btn ops-btn-primary" onClick={() => setShowAddModal(true)}>
            <IconPlus size={13} /> New case
          </button>
          {onBack && (
            <button type="button" className="ops-btn" onClick={onBack} aria-label="Go back" title="Go back">
              <IconChevronLeft size={14} className="icon-sm" /> Back
            </button>
          )}
        </div>
      </div>

      {toasts.length > 0 && (
        <div className="ops-toast-stack">
          {toasts.map((t) => (
            <div key={t.id} className="ops-toast" data-tone={t.tone}>
              {t.tone === 'success' ? <IconCheckCircle size={14} /> : <IconAlertCircle size={14} />}
              {t.text}
            </div>
          ))}
        </div>
      )}

      <div className="ops-velocity-strip">
        <div className="ops-radar-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>Triage pipeline</span>
            <span className="ops-badge">{stats.total} cases</span>
          </div>
          <div style={{ display: 'flex', gap: '14px', fontSize: '12px', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
            {([
              ['open', stats.open, 'Open'],
              ['in_progress', stats.inProgress, 'In Progress'],
              ['resolved', stats.resolved, 'Resolved'],
              ['wont_fix', stats.wontFix, "Won't Fix"],
            ] as const).map(([key, count, label]) => (
              <button
                key={key}
                type="button"
                className="ops-velocity-count"
                data-active={statusFilter === key}
                onClick={() => setStatusFilter(statusFilter === key ? 'all' : key)}
              >
                <strong>{count}</strong> {label}
              </button>
            ))}
          </div>
        </div>
        <div className="ops-velocity-progress" title="Share of open, in progress, and resolved">
          <div className="ops-velocity-segment seg-open" style={{ width: `${(stats.open / stats.pipeline) * 100}%` }} />
          <div className="ops-velocity-segment seg-in-progress" style={{ width: `${(stats.inProgress / stats.pipeline) * 100}%` }} />
          <div className="ops-velocity-segment seg-resolved" style={{ width: `${(stats.resolved / stats.pipeline) * 100}%` }} />
        </div>
      </div>

      <div className="ops-bug-toolbar">
        <div className="ops-search-wrap">
          <IconSearch size={16} />
          <input
            type="text"
            className="ops-input"
            placeholder="Search case, category, reporter..."
            aria-label="Search cases"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="ops-select"
          aria-label="Filter by category"
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

        <div className="ops-view-switcher">
          <button type="button" className={`ops-view-btn${viewMode === 'list' ? ' active' : ''}`} onClick={() => setViewMode('list')}>
            List
          </button>
          <button type="button" className={`ops-view-btn${viewMode === 'kanban' ? ' active' : ''}`} onClick={() => setViewMode('kanban')}>
            Board
          </button>
        </div>

        <button type="button" className="ops-btn" onClick={handleExportJson}>
          <IconDownload size={14} className="icon-sm" /> Export
        </button>
      </div>

      {selectedIds.size > 0 && (
        <div className="ops-bulk-dock" style={{ marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="ops-dot" />
            <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {selectedIds.size} case{selectedIds.size === 1 ? '' : 's'} selected
            </span>
          </div>
          <div className="ops-bulk-actions">
            <button type="button" className="ops-btn" onClick={() => void handleBulkStatusChange('in_progress')}>
              Mark In Progress
            </button>
            <button type="button" className="ops-btn ops-btn-primary" onClick={() => void handleBulkStatusChange('resolved')}>
              Mark Resolved
            </button>
            <button type="button" className="ops-btn" onClick={() => setSelectedIds(new Set())}>
              Clear
            </button>
          </div>
        </div>
      )}

      {loading && bugs.length === 0 ? (
        <>
          <div className="ops-skeleton-row">
            <div className="ops-skeleton-block" style={{ height: 76 }} />
            <div className="ops-skeleton-block" style={{ height: 76 }} />
            <div className="ops-skeleton-block" style={{ height: 76 }} />
            <div className="ops-skeleton-block" style={{ height: 76 }} />
          </div>
          <div className="ops-skeleton-block" style={{ height: 160 }} />
        </>
      ) : sortedBugs.length === 0 ? (
        <div className="ops-card ops-empty-prompt">
          <IconSearch size={20} className="icon" style={{ color: 'var(--text-tertiary)', marginBottom: '8px' }} />
          <p style={{ margin: 0 }}>No cases match. Great sign, or try clearing filters.</p>
        </div>
      ) : viewMode === 'kanban' ? (
        <div className="ops-kanban">
          {(
            [
              { status: 'open' as const, label: 'Open', color: 'var(--status-open)' },
              { status: 'in_progress' as const, label: 'In Progress', color: 'var(--cyan)' },
              { status: 'resolved' as const, label: 'Resolved', color: 'var(--safe)' },
              { status: 'wont_fix' as const, label: "Won't Fix", color: 'var(--text-tertiary)' },
            ]
          ).map((col) => {
            const colBugs = sortedBugs.filter((b) => b.status === col.status);
            return (
              <div
                className="ops-kanban-col"
                key={col.status}
                data-status={col.status}
                data-drag-over={dragOverStatus === col.status}
                onDragOver={(e) => {
                  if (!draggedBugId) return;
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                  setDragOverStatus(col.status);
                }}
                onDragLeave={() => setDragOverStatus((prev) => (prev === col.status ? null : prev))}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOverStatus(null);
                  const id = e.dataTransfer.getData('text/plain') || draggedBugId;
                  const bug = bugs.find((b) => b.id === id);
                  setDraggedBugId(null);
                  if (bug && bug.status !== col.status) void handleStatusChange(bug, col.status);
                }}
              >
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
                      data-dragging={draggedBugId === bug.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.effectAllowed = 'move';
                        e.dataTransfer.setData('text/plain', bug.id);
                        setDraggedBugId(bug.id);
                      }}
                      onDragEnd={() => {
                        setDraggedBugId(null);
                        setDragOverStatus(null);
                      }}
                      onClick={() => setDrawerBugId(bug.id)}
                    >
                      <span className="ops-bug-id">{bug.id}</span>
                      <div className="title">{bug.title}</div>
                      <div className="ops-kanban-card-meta-row">
                        <span className="ops-kanban-avatar" title={bug.assignee || bug.foundBy}>
                          {initialsFrom(bug.assignee || bug.foundBy)}
                        </span>
                        <span className="meta" style={{ marginTop: 0 }}>{bug.category}</span>
                        {bug.fingerprint && (similarCountByFp.get(bug.fingerprint) || 1) > 1 && (
                          <span className="ops-pill" style={{ color: 'var(--status-open)', background: 'var(--warning-dim)' }}>
                            {similarCountByFp.get(bug.fingerprint)} similar
                          </span>
                        )}
                        <span className="ops-kanban-age" data-stale={bug.status === 'open' && Date.now() - new Date(bug.createdAt).getTime() > 3 * 24 * 60 * 60 * 1000}>
                          {formatRelativeTime(bug.createdAt)}
                        </span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="ops-bug-table-viewport">
          <table className="ops-dense-bug-table">
            <thead>
              <tr>
                <th style={{ width: 28, padding: '0 4px' }} title="Expand / collapse inline details" />
                <th className="ops-bug-check">
                  <input
                    type="checkbox"
                    checked={sortedBugs.length > 0 && selectedIds.size === sortedBugs.length}
                    onChange={toggleSelectAll}
                    aria-label="Select all cases"
                  />
                </th>
                <th>Id</th>
                <th>Title</th>
                <th>Severity</th>
                <th>Status</th>
                <th>Assignee</th>
                <th>Age</th>
              </tr>
            </thead>
            <tbody>
              {sortedBugs.map((bug) => {
                const status = statusMeta(bug.status);
                const similar = bug.fingerprint ? similarCountByFp.get(bug.fingerprint) || 1 : 1;
                const isExpanded = expandedBugIds.has(bug.id);

                return (
                  <Fragment key={bug.id}>
                    <tr
                      className="ops-linear-row"
                      data-severity={bug.severity}
                      data-expanded={isExpanded}
                      onClick={() => toggleExpandBug(bug.id)}
                    >
                      <td style={{ width: 28, textAlign: 'center', padding: '0 4px' }} onClick={(e) => { e.stopPropagation(); toggleExpandBug(bug.id); }}>
                        <span className="ops-expand-chevron" data-expanded={isExpanded}>
                          &#9656;
                        </span>
                      </td>
                      <td className="ops-bug-check" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(bug.id)}
                          onChange={() => toggleSelect(bug.id)}
                          aria-label={`Select ${bug.id}`}
                        />
                      </td>
                      <td><span className="ops-feature-id-badge">{bug.id}</span></td>
                      <td className="ops-bug-title-cell">
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{bug.title}</div>
                        <div className="ops-bug-meta">
                          <span className="cat">{bug.category}</span>
                          {similar > 1 ? ` · ${similar} similar` : ''}
                          {bug.environment?.route ? ` · ${bug.environment.route}` : ''}
                        </div>
                      </td>
                      <td>
                        <span className="ops-pill" style={{ color: severityColor(bug.severity), background: 'var(--bg-inset)' }}>
                          {SEVERITIES.find((s) => s.value === bug.severity)?.label || bug.severity}
                        </span>
                      </td>
                      <td>
                        <span className="ops-pill" style={{ color: status.color, background: 'var(--bg-inset)' }}>
                          {status.label}
                        </span>
                      </td>
                      <td>
                        {bug.assignee ? (
                          <span className="ops-kanban-card-meta-row" style={{ marginTop: 0 }}>
                            <span className="ops-kanban-avatar">{initialsFrom(bug.assignee)}</span>
                            {bug.assignee}
                          </span>
                        ) : (
                          <span className="ops-bug-meta">—</span>
                        )}
                      </td>
                      <td>
                        <span className="ops-kanban-age" data-stale={bug.status === 'open' && Date.now() - new Date(bug.createdAt).getTime() > 3 * 24 * 60 * 60 * 1000}>
                          {formatRelativeTime(bug.createdAt)}
                        </span>
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr className="ops-linear-tray-row" key={`${bug.id}-tray`}>
                        <td colSpan={8}>
                          <div className="ops-linear-tray-content">
                            {/* Inline Tray Quick Bar */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontSize: '10.5px', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontFamily: 'var(--mono)' }}>
                                  Transition:
                                </span>
                                {bug.status !== 'in_progress' && (
                                  <button
                                    type="button"
                                    className="ops-btn"
                                    style={{ fontSize: '11px', padding: '3px 8px' }}
                                    onClick={(e) => { e.stopPropagation(); void handleStatusChange(bug, 'in_progress'); }}
                                  >
                                    Mark In Progress
                                  </button>
                                )}
                                {bug.status !== 'resolved' && (
                                  <button
                                    type="button"
                                    className="ops-btn ops-btn-primary"
                                    style={{ fontSize: '11px', padding: '3px 8px' }}
                                    onClick={(e) => { e.stopPropagation(); void handleStatusChange(bug, 'resolved'); }}
                                  >
                                    Mark Resolved
                                  </button>
                                )}
                                {bug.status === 'resolved' && (
                                  <button
                                    type="button"
                                    className="ops-btn"
                                    style={{ fontSize: '11px', padding: '3px 8px' }}
                                    onClick={(e) => { e.stopPropagation(); void handleStatusChange(bug, 'open'); }}
                                  >
                                    Re-open Case
                                  </button>
                                )}
                                {bug.status !== 'wont_fix' && (
                                  <button
                                    type="button"
                                    className="ops-btn"
                                    style={{ fontSize: '11px', padding: '3px 8px' }}
                                    onClick={(e) => { e.stopPropagation(); void handleStatusChange(bug, 'wont_fix'); }}
                                  >
                                    Won&apos;t Fix
                                  </button>
                                )}
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <button
                                  type="button"
                                  className="ops-btn"
                                  style={{ fontSize: '11px', padding: '3px 8px' }}
                                  onClick={(e) => { e.stopPropagation(); void handleCopyPrompt(bug); }}
                                  title="Copy markdown diagnostic prompt for AI assistant"
                                >
                                  <IconCopy size={12} className="icon-sm" /> Copy AI Prompt
                                </button>
                                <button
                                  type="button"
                                  className="ops-btn"
                                  style={{ fontSize: '11px', padding: '3px 8px' }}
                                  onClick={(e) => { e.stopPropagation(); setDrawerBugId(bug.id); }}
                                >
                                  &#8599; Full Drawer
                                </button>
                                <button
                                  type="button"
                                  className="ops-btn ops-btn-danger"
                                  style={{ fontSize: '11px', padding: '3px 8px' }}
                                  onClick={(e) => { e.stopPropagation(); handleDeleteBug(bug.id); }}
                                >
                                  <IconTrash size={12} className="icon-sm" /> Delete
                                </button>
                              </div>
                            </div>

                            {/* Inline Tray Content Grid: Reproduction vs Diagnostics */}
                            <div className="ops-linear-tray-grid">
                              {/* Left Column: Narrative & Reproduction */}
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {bug.description && (
                                  <div style={{ fontSize: '12px', color: 'var(--text-primary)', background: 'var(--bg-panel)', padding: '8px 10px', borderRadius: 'var(--r-sm)', border: '1px solid var(--line)' }}>
                                    <strong style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '3px' }}>Description:</strong>
                                    {bug.description}
                                  </div>
                                )}

                                {bug.reproSteps && bug.reproSteps.length > 0 && (
                                  <div style={{ fontSize: '12px', background: 'var(--bg-panel)', padding: '8px 10px', borderRadius: 'var(--r-sm)', border: '1px solid var(--line)' }}>
                                    <strong style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Steps to Reproduce:</strong>
                                    <ol style={{ margin: 0, paddingLeft: '18px', fontSize: '11.5px', color: 'var(--text-primary)' }}>
                                      {bug.reproSteps.map((step, idx) => (
                                        <li key={idx} style={{ marginBottom: '2px' }}>{step}</li>
                                      ))}
                                    </ol>
                                  </div>
                                )}

                                {(bug.expectedBehavior || bug.actualBehavior) && (
                                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                    {bug.expectedBehavior && (
                                      <div style={{ fontSize: '11px', background: 'var(--bg-panel)', padding: '6px 8px', borderRadius: 'var(--r-sm)', border: '1px solid var(--line)' }}>
                                        <span style={{ color: 'var(--safe)', fontWeight: 600 }}>Expected:</span> {bug.expectedBehavior}
                                      </div>
                                    )}
                                    {bug.actualBehavior && (
                                      <div style={{ fontSize: '11px', background: 'var(--bg-panel)', padding: '6px 8px', borderRadius: 'var(--r-sm)', border: '1px solid var(--line)' }}>
                                        <span style={{ color: 'var(--danger)', fontWeight: 600 }}>Actual:</span> {bug.actualBehavior}
                                      </div>
                                    )}
                                  </div>
                                )}

                                {bug.environment && (
                                  <div style={{ fontSize: '10.5px', color: 'var(--text-tertiary)', fontFamily: 'var(--mono)', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                    <span>Platform: {bug.environment.platform || 'web'}</span>
                                    <span>Browser: {bug.environment.browser || 'N/A'}</span>
                                    <span>App: v{bug.environment.appVersion || '3.14.4'}</span>
                                    <span>Online: {bug.environment.isOnline ? 'Yes' : 'No'}</span>
                                  </div>
                                )}
                              </div>

                              {/* Right Column: Diagnostics & Stack Trace */}
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <strong style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontFamily: 'var(--mono)' }}>
                                    Diagnostics &amp; Telemetry
                                  </strong>
                                  {bug.diagnostics?.stackTrace && (
                                    <button
                                      type="button"
                                      className="ops-btn"
                                      style={{ fontSize: '10px', padding: '2px 6px' }}
                                      onClick={async (e) => {
                                        e.stopPropagation();
                                        if (bug.diagnostics?.stackTrace) {
                                          await navigator.clipboard.writeText(bug.diagnostics.stackTrace);
                                          showToast('Stack trace copied');
                                        }
                                      }}
                                    >
                                      Copy Trace
                                    </button>
                                  )}
                                </div>

                                {bug.diagnostics?.stackTrace ? (
                                  <pre className="ops-mono-trace-box">{bug.diagnostics.stackTrace}</pre>
                                ) : bug.diagnostics?.consoleLogs && bug.diagnostics.consoleLogs.length > 0 ? (
                                  <pre className="ops-mono-trace-box">
                                    {bug.diagnostics.consoleLogs.map((l) => (typeof l === 'string' ? l : JSON.stringify(l))).join('\n')}
                                  </pre>
                                ) : (
                                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', padding: '12px', background: 'var(--bg-panel)', borderRadius: 'var(--r-sm)', border: '1px solid var(--line)', textAlign: 'center' }}>
                                    No active error stack trace logged for this report.
                                    {bug.diagnostics?.syncQueueLength !== undefined && (
                                      <div style={{ marginTop: '4px', fontFamily: 'var(--mono)' }}>
                                        Sync queue depth: {bug.diagnostics.syncQueueLength}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
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
              <BugDetailBody
                bug={drawerBug}
                similarCount={drawerBug.fingerprint ? similarCountByFp.get(drawerBug.fingerprint) || 1 : 1}
                onStatusChange={handleStatusChange}
                onCopyPrompt={handleCopyPrompt}
                onDelete={handleDeleteBug}
                onAssign={handleAssign}
              />
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
              Resolve {resolvingBug.id}
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
              <label className="ops-form-label" htmlFor="resolve-settled-by">Resolved by</label>
              <input id="resolve-settled-by" type="text" className="ops-input" value={resolvedByName} onChange={(e) => setResolvedByName(e.target.value)} />
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
              <button type="button" className="ops-btn ops-btn-primary" onClick={handleConfirmResolve} style={{ flex: 1, justifyContent: 'center' }}>
                Confirm resolve
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
