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

  private handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null, copied: false });
  };

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
            <h2 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>
              This screen hit a problem
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: '0 0 16px', lineHeight: 1.5 }}>
              Your trips and expenses are still on this device. Try again, or reload if it keeps happening.
            </p>

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
                Report copied
              </div>
            )}

            <div className="u-col-8">
              <button
                type="button"
                className="gradient-btn"
                style={{ width: '100%', padding: '10px', fontSize: '14px', cursor: 'pointer' }}
                onClick={this.handleRetry}
              >
                Try again
              </button>
              <button
                type="button"
                className="secondary-btn"
                style={{ width: '100%', padding: '10px', fontSize: '14px', cursor: 'pointer' }}
                onClick={this.handleReload}
              >
                Reload
              </button>
              <button
                type="button"
                className="secondary-btn"
                style={{ width: '100%', padding: '8px', fontSize: '13px', cursor: 'pointer' }}
                onClick={this.handleCopyReport}
              >
                Copy report
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
