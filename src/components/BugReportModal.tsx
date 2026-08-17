import { useState, useEffect } from 'react';
import { diagnosticLogger, type DiagnosticSnapshot } from '../utils/diagnosticLogger';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  activeTripInfo?: { id: string | null; name: string | null };
  initialTitle?: string;
  initialError?: string;
};

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
      setCopiedStatus('Markdown report copied for Claude / Antigravity!');
      setTimeout(() => setCopiedStatus(null), 3000);
    });
  };

  const handleCopyCliCommand = () => {
    const cleanTitle = (title || 'New Bug').replace(/"/g, '\\"');
    const cleanDesc = (description || '').replace(/"/g, '\\"');
    const cmd = `npm run bug:add -- --title "${cleanTitle}" --severity ${severity} --category ${category} --desc "${cleanDesc}" --by in-app-tester`;
    navigator.clipboard.writeText(cmd).then(() => {
      setCopiedStatus('CLI command copied to clipboard!');
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
    setCopiedStatus('Diagnostic JSON downloaded!');
    setTimeout(() => setCopiedStatus(null), 3000);
  };

  const handleSimulateLog = () => {
    diagnosticLogger.log('warn', `Simulated test warning at ${new Date().toLocaleTimeString()}`);
    diagnosticLogger.captureSnapshot(activeTripInfo).then(setSnapshot);
    setCopiedStatus('Added test log entry to ring buffer');
    setTimeout(() => setCopiedStatus(null), 2000);
  };

  return (
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
      onClick={onClose}
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
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '24px' }}>🐞</span>
            <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>Bug Reporter & Diagnostics</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '20px',
              cursor: 'pointer',
              color: 'var(--text-secondary, #64748b)',
              padding: '4px 8px',
            }}
          >
            ✕
          </button>
        </div>

        <p style={{ fontSize: '13px', color: 'var(--text-secondary, #64748b)', marginTop: 0, marginBottom: '16px' }}>
          Capture live device state, console traces, and export an AI-ready report for Antigravity or Claude CLI.
        </p>

        {copiedStatus && (
          <div
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              background: 'rgba(34, 197, 94, 0.15)',
              color: '#15803d',
              fontSize: '13px',
              fontWeight: 500,
              marginBottom: '16px',
              textAlign: 'center',
            }}
          >
            ✅ {copiedStatus}
          </div>
        )}

        {/* Bug Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
              Bug Title *
            </label>
            <input
              type="text"
              placeholder="e.g. Settlement transfer count incorrect when rounding pennies"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border-color, #cbd5e1)',
                background: 'var(--bg-input, #ffffff)',
                color: 'inherit',
                fontSize: '14px',
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
                value={severity}
                onChange={(e) => setSeverity(e.target.value as any)}
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
                <option value="critical">🔴 Critical (App crash/Data loss)</option>
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
                value={category}
                onChange={(e) => setCategory(e.target.value)}
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
                <option value="splits-math">Splits & Settlements Math</option>
                <option value="offline-sync">Offline & Cloud Sync</option>
                <option value="p2p-sync">P2P Sync</option>
                <option value="receipts-camera">Receipts & Camera</option>
                <option value="auth">Auth & Session</option>
                <option value="ui-ux">UI / Design & Styling</option>
                <option value="performance">Performance & Memory</option>
                <option value="general">General / Other</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
              Description & Observed Behavior
            </label>
            <textarea
              rows={3}
              placeholder="What happened? What error or weird behavior occurred?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
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
              Steps to Reproduce
            </label>
            <textarea
              rows={2}
              placeholder="1. Open Goa trip&#10;2. Add split expense&#10;3. Tap delete member"
              value={reproSteps}
              onChange={(e) => setReproSteps(e.target.value)}
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
                Expected Behavior
              </label>
              <input
                type="text"
                placeholder="Shares sum to 100%"
                value={expectedBehavior}
                onChange={(e) => setExpectedBehavior(e.target.value)}
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
                Actual Behavior
              </label>
              <input
                type="text"
                placeholder="Discrepancy of 0.01 remains"
                value={actualBehavior}
                onChange={(e) => setActualBehavior(e.target.value)}
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

          {/* Collapsible Telemetry */}
          <div
            style={{
              border: '1px solid var(--border-color, #e2e8f0)',
              borderRadius: '8px',
              padding: '10px 12px',
              background: 'rgba(0, 0, 0, 0.02)',
              marginTop: '4px',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                cursor: 'pointer',
                userSelect: 'none',
              }}
              onClick={() => setShowDiagnostics(!showDiagnostics)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600 }}>
                <span>⚙️ Device Telemetry & Buffer</span>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary, #64748b)' }}>
                  ({snapshot?.network.isOnline ? '🟢 Online' : '🔴 Offline'} | Queue: {snapshot?.state.syncQueueLength ?? 0} | Logs: {snapshot?.recentLogs.length ?? 0})
                </span>
              </div>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary, #64748b)' }}>
                {showDiagnostics ? '▲ Hide' : '▼ View'}
              </span>
            </div>

            {showDiagnostics && snapshot && (
              <div style={{ marginTop: '10px', fontSize: '12px', fontFamily: 'var(--font-family-mono, monospace)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '8px' }}>
                  <div><strong>Platform:</strong> {snapshot.platform}</div>
                  <div><strong>Route:</strong> {snapshot.state.routeHash}</div>
                  <div><strong>Screen:</strong> {snapshot.screen.width}x{snapshot.screen.height}</div>
                  <div><strong>Storage:</strong> {snapshot.storage.usagePercent ?? 'N/A'}%</div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', marginBottom: '4px' }}>
                  <strong>Recent Console Logs ({snapshot.recentLogs.length}):</strong>
                  <button
                    type="button"
                    onClick={handleSimulateLog}
                    style={{
                      background: 'none',
                      border: '1px dashed #94a3b8',
                      borderRadius: '4px',
                      fontSize: '10px',
                      padding: '2px 6px',
                      cursor: 'pointer',
                    }}
                  >
                    + Test Log
                  </button>
                </div>
                <div
                  style={{
                    maxHeight: '100px',
                    overflowY: 'auto',
                    background: 'rgba(0, 0, 0, 0.05)',
                    padding: '6px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                  }}
                >
                  {snapshot.recentLogs.length === 0 ? (
                    <div style={{ color: '#94a3b8' }}>No logs recorded yet.</div>
                  ) : (
                    snapshot.recentLogs.map((l, idx) => (
                      <div key={idx} style={{ color: l.level === 'error' ? '#ef4444' : l.level === 'warn' ? '#f59e0b' : 'inherit' }}>
                        [{l.timestamp.slice(11, 19)}] [{l.level.toUpperCase()}] {l.message}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
            <button
              type="button"
              className="gradient-btn"
              onClick={handleCopyMarkdown}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '10px 16px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                borderRadius: '8px',
                border: 'none',
                width: '100%',
              }}
            >
              📋 Copy Bug Report for AI (Claude / Antigravity)
            </button>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button
                type="button"
                onClick={handleCopyCliCommand}
                style={{
                  padding: '8px 12px',
                  fontSize: '12px',
                  fontWeight: 500,
                  borderRadius: '8px',
                  border: '1px solid var(--border-color, #cbd5e1)',
                  background: 'var(--bg-card, #ffffff)',
                  color: 'inherit',
                  cursor: 'pointer',
                }}
              >
                ⚡ Copy CLI Command
              </button>

              <button
                type="button"
                onClick={handleDownloadJson}
                style={{
                  padding: '8px 12px',
                  fontSize: '12px',
                  fontWeight: 500,
                  borderRadius: '8px',
                  border: '1px solid var(--border-color, #cbd5e1)',
                  background: 'var(--bg-card, #ffffff)',
                  color: 'inherit',
                  cursor: 'pointer',
                }}
              >
                💾 Download JSON
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
