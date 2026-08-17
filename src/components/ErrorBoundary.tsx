import { Component, type ErrorInfo, type ReactNode } from 'react';
import { diagnosticLogger } from '../utils/diagnosticLogger';
import { autoReportError } from '../utils/autoBugReporter';

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  copied: boolean;
};

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    copied: false,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    diagnosticLogger.log('error', `React Crash: ${error.message}`, errorInfo.componentStack);
    console.error('Uncaught error inside ErrorBoundary:', error, errorInfo);
    void autoReportError(error.message, error.stack || errorInfo.componentStack || undefined, 'react-crash');
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleCopyReport = async () => {
    const snapshot = await diagnosticLogger.captureSnapshot();
    const md = diagnosticLogger.formatReportForAI(
      `App Crash: ${this.state.error?.message || 'Unknown Error'}`,
      `The React rendering engine caught an unhandled exception:\n\n${this.state.error?.stack || this.state.error?.message}\n\nComponent Stack:\n${this.state.errorInfo?.componentStack || 'N/A'}`,
      'critical',
      'general',
      '1. Open app\n2. Trigger component state leading to crash',
      snapshot
    );

    await navigator.clipboard.writeText(md);
    this.setState({ copied: true });
    setTimeout(() => this.setState({ copied: false }), 3000);
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div
          className="app-container"
          style={{
            justifyContent: 'center',
            alignItems: 'center',
            padding: '24px',
            textAlign: 'center',
          }}
        >
          <div className="glass-card" style={{ maxWidth: '440px', width: '100%', padding: '24px', borderRadius: '16px' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>💥</div>
            <h2 style={{ color: 'var(--color-danger, #ef4444)', marginBottom: '8px', fontSize: '18px', fontWeight: 600 }}>
              Application Render Crash
            </h2>
            <p style={{ color: 'var(--text-secondary, #64748b)', fontSize: '13px', marginBottom: '16px', lineHeight: '1.5' }}>
              An unexpected error occurred while rendering. You can copy the diagnostic crash report directly for Antigravity or Claude CLI.
            </p>

            {this.state.error?.message && (
              <pre
                style={{
                  background: 'rgba(226, 115, 90, 0.08)',
                  color: 'var(--color-danger, #ef4444)',
                  padding: '12px',
                  borderRadius: '8px',
                  fontSize: '11px',
                  fontFamily: 'var(--font-family-mono, monospace)',
                  marginBottom: '16px',
                  overflowX: 'auto',
                  textAlign: 'left',
                  maxHeight: '120px',
                }}
              >
                {this.state.error.message}
              </pre>
            )}

            {this.state.copied && (
              <div
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  background: 'rgba(34, 197, 94, 0.15)',
                  color: '#15803d',
                  fontSize: '12px',
                  fontWeight: 500,
                  marginBottom: '12px',
                }}
              >
                ✅ Copied AI Crash Report to clipboard!
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                type="button"
                className="gradient-btn"
                style={{ width: '100%', padding: '10px', fontSize: '14px', borderRadius: '8px', cursor: 'pointer' }}
                onClick={this.handleReload}
              >
                🔄 Reload Application
              </button>

              <button
                type="button"
                style={{
                  width: '100%',
                  padding: '8px',
                  fontSize: '12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color, #cbd5e1)',
                  background: 'var(--bg-card, #ffffff)',
                  color: 'inherit',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
                onClick={this.handleCopyReport}
              >
                📋 Copy Crash Report for Claude / Antigravity
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
