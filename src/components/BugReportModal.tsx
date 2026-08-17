import { useState, useEffect } from 'react';
import { diagnosticLogger, type DiagnosticSnapshot } from '../utils/diagnosticLogger';
import { IconClose, IconCopy, IconDownload, IconSparkles } from './Icons';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  activeTripInfo?: { id: string | null; name: string | null };
  initialTitle?: string;
  initialError?: string;
};

const SEVERITIES: { value: 'critical' | 'high' | 'medium' | 'low'; label: string; color: string }[] = [
  { value: 'critical', label: 'Critical', color: 'var(--color-danger)' },
  { value: 'high', label: 'High', color: 'var(--secondary-accent)' },
  { value: 'medium', label: 'Medium', color: 'var(--text-secondary)' },
  { value: 'low', label: 'Low', color: 'var(--text-muted)' },
];

const CATEGORIES: { value: string; label: string }[] = [
  { value: 'navigation', label: 'Navigation & Routing' },
  { value: 'splits-math', label: 'Splits & Settlements' },
  { value: 'offline-sync', label: 'Offline & Cloud Sync' },
  { value: 'p2p-sync', label: 'P2P Sync' },
  { value: 'receipts-camera', label: 'Receipts & Camera' },
  { value: 'auth', label: 'Auth & Session' },
  { value: 'ui-ux', label: 'UI / Design' },
  { value: 'performance', label: 'Performance' },
  { value: 'general', label: 'General' },
];

export function BugReportModal({
  isOpen,
  onClose,
  activeTripInfo,
  initialTitle = '',
  initialError = '',
}: Props) {
  const [title, setTitle] = useState(initialTitle);
  const [severity, setSeverity] = useState<'critical' | 'high' | 'medium' | 'low'>('medium');
  const [category, setCategory] = useState<string>('general');
  const [description, setDescription] = useState(initialError ? `Error encountered: ${initialError}` : '');
  const [reproSteps, setReproSteps] = useState('');
  const [expectedBehavior, setExpectedBehavior] = useState('');
  const [actualBehavior, setActualBehavior] = useState('');
  const [snapshot, setSnapshot] = useState<DiagnosticSnapshot | null>(null);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [copiedStatus, setCopiedStatus] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      diagnosticLogger.captureSnapshot(activeTripInfo).then(setSnapshot);
      if (initialTitle) setTitle(initialTitle);
      if (initialError && !description) setDescription(`Error: ${initialError}`);
    }
  }, [isOpen, activeTripInfo, initialTitle, initialError]);

  if (!isOpen) return null;

  const handleCopyMarkdown = () => {
    if (!snapshot) return;
    const md = diagnosticLogger.formatReportForAI(
      title || 'Untitled Bug',
      description,
      severity,
      category,
      reproSteps,
      snapshot
    );
    navigator.clipboard.writeText(md).then(() => {
      setCopiedStatus('Markdown report copied for Claude / Antigravity');
      setTimeout(() => setCopiedStatus(null), 3000);
    });
  };

  const handleCopyCliCommand = () => {
    const cleanTitle = (title || 'New Bug').replace(/"/g, '\\"');
    const cleanDesc = (description || '').replace(/"/g, '\\"');
    const cmd = `npm run bug:add -- --title "${cleanTitle}" --severity ${severity} --category ${category} --desc "${cleanDesc}" --by in-app-tester`;
    navigator.clipboard.writeText(cmd).then(() => {
      setCopiedStatus('CLI command copied to clipboard');
      setTimeout(() => setCopiedStatus(null), 3000);
    });
  };

  const handleDownloadJson = () => {
    if (!snapshot) return;
    const data = {
      title: title || 'Untitled Bug',
      severity,
      category,
      description,
      reproSteps: reproSteps.split('\n').filter(Boolean),
      expectedBehavior,
      actualBehavior,
      snapshot,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bug-report-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setCopiedStatus('Diagnostic JSON downloaded');
    setTimeout(() => setCopiedStatus(null), 3000);
  };

  const handleSimulateLog = () => {
    diagnosticLogger.log('warn', `Simulated test warning at ${new Date().toLocaleTimeString()}`);
    diagnosticLogger.captureSnapshot(activeTripInfo).then(setSnapshot);
    setCopiedStatus('Added test log entry to ring buffer');
    setTimeout(() => setCopiedStatus(null), 2000);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="glass-card fade-in modal-sheet" style={{ maxWidth: '540px' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0, fontFamily: 'var(--font-family-title)' }}>File a case</h2>
          <button type="button" onClick={onClose} className="secondary-btn" style={{ padding: '6px 10px' }} aria-label="Close">
            <IconClose size={16} className="icon-sm" />
          </button>
        </div>

        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 16px' }}>
          Capture live device state and console traces, then export an AI-ready report for Antigravity or Claude CLI.
        </p>

        {copiedStatus && (
          <div className="bug-resolution-note" style={{ marginBottom: '16px', textAlign: 'center' }}>
            {copiedStatus}
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Case summary *</label>
          <input
            type="text"
            className="input-field"
            placeholder="e.g. Settlement transfer count incorrect when rounding pennies"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Severity</label>
          <div className="badge-row">
            {SEVERITIES.map((s) => (
              <button
                key={s.value}
                type="button"
                className={`category-badge${severity === s.value ? ' active' : ''}`}
                style={severity === s.value ? { borderColor: s.color, background: 'transparent', color: s.color } : undefined}
                onClick={() => setSeverity(s.value)}
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
                className={`category-badge${category === c.value ? ' active' : ''}`}
                onClick={() => setCategory(c.value)}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Description & observed behavior</label>
          <textarea
            rows={3}
            className="input-field bug-ruled-textarea"
            placeholder="What happened? What error or weird behavior occurred?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Steps to reproduce</label>
          <textarea
            rows={2}
            className="input-field"
            placeholder={'1. Open Goa trip\n2. Add split expense\n3. Tap delete member'}
            value={reproSteps}
            onChange={(e) => setReproSteps(e.target.value)}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div className="form-group">
            <label className="form-label">Expected behavior</label>
            <input type="text" className="input-field" placeholder="Shares sum to 100%" value={expectedBehavior} onChange={(e) => setExpectedBehavior(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Actual behavior</label>
            <input type="text" className="input-field" placeholder="Discrepancy of 0.01 remains" value={actualBehavior} onChange={(e) => setActualBehavior(e.target.value)} />
          </div>
        </div>

        <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-md)', overflow: 'hidden', marginBottom: '16px' }}>
          <button
            type="button"
            onClick={() => setShowDiagnostics(!showDiagnostics)}
            style={{
              width: '100%',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '10px 14px',
              background: 'var(--bg-app)',
              border: 'none',
              cursor: 'pointer',
              color: 'inherit',
              font: 'inherit',
            }}
          >
            <span style={{ fontSize: '13px', fontWeight: 600 }}>Device telemetry & buffer</span>
            <span className="form-label" style={{ margin: 0 }}>
              {snapshot?.network.isOnline ? 'online' : 'offline'} · queue {snapshot?.state.syncQueueLength ?? 0} · logs {snapshot?.recentLogs.length ?? 0} · {showDiagnostics ? 'hide' : 'view'}
            </span>
          </button>

          {showDiagnostics && snapshot && (
            <div style={{ padding: '12px 14px', borderTop: '1px dashed var(--border-color)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px', marginBottom: '10px', fontSize: '12px', fontFamily: 'var(--font-family-mono)', color: 'var(--text-secondary)' }}>
                <div><strong style={{ color: 'var(--text-primary)' }}>Platform</strong> {snapshot.platform}</div>
                <div><strong style={{ color: 'var(--text-primary)' }}>Route</strong> {snapshot.state.routeHash}</div>
                <div><strong style={{ color: 'var(--text-primary)' }}>Screen</strong> {snapshot.screen.width}x{snapshot.screen.height}</div>
                <div><strong style={{ color: 'var(--text-primary)' }}>Storage</strong> {snapshot.storage.usagePercent ?? 'N/A'}%</div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span className="form-label">Recent console logs ({snapshot.recentLogs.length})</span>
                <button type="button" onClick={handleSimulateLog} className="secondary-btn" style={{ padding: '3px 8px', fontSize: '11px' }}>
                  + Test log
                </button>
              </div>
              <div className="bug-stack-block">
                {snapshot.recentLogs.length === 0 ? (
                  <span style={{ color: 'var(--text-muted)' }}>No logs recorded yet.</span>
                ) : (
                  snapshot.recentLogs.map((l, idx) => (
                    <div key={idx} style={{ color: l.level === 'error' ? 'var(--color-danger)' : l.level === 'warn' ? 'var(--secondary-accent)' : 'inherit' }}>
                      [{l.timestamp.slice(11, 19)}] [{l.level.toUpperCase()}] {l.message}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button type="button" className="gradient-btn" onClick={handleCopyMarkdown}>
            <IconSparkles size={16} className="icon-sm" /> Copy report for AI (Claude / Antigravity)
          </button>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <button type="button" className="secondary-btn" onClick={handleCopyCliCommand}>
              <IconCopy size={14} className="icon-sm" /> Copy CLI command
            </button>
            <button type="button" className="secondary-btn" onClick={handleDownloadJson}>
              <IconDownload size={14} className="icon-sm" /> Download JSON
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
