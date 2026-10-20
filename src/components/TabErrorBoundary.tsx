import { Component, type ErrorInfo, type ReactNode } from 'react';
import { diagnosticLogger } from '../utils/diagnosticLogger';
import { IconAlertCircle } from './Icons';

type Props = {
  children: ReactNode;
  label?: string;
};

type State = {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  copied: boolean;
};

export class TabErrorBoundary extends Component<Props, State> {
  public state: State = { hasError: false, error: null, errorInfo: null, copied: false };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    diagnosticLogger.log('error', `Tab crash (${this.props.label ?? 'unknown'}): ${error.message}`, errorInfo.componentStack);
    console.error('TabErrorBoundary caught:', error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null, copied: false });
  };

  private handleCopyReport = async () => {
    const snapshot = await diagnosticLogger.captureSnapshot();
    const label = this.props.label ?? 'this section';
    const md = diagnosticLogger.formatReportForAI(
      `Tab problem: ${label}`,
      `${this.state.error?.message || 'Unknown'}\n\n${this.state.errorInfo?.componentStack || ''}`,
      'high',
      'general',
      `1. Open the ${label} tab`,
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
          style={{
            padding: '32px 16px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
            textAlign: 'center',
          }}
        >
          <div style={{ display: 'inline-flex', color: 'var(--color-warning)' }}><IconAlertCircle size={28} /></div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0, lineHeight: 1.5, maxWidth: '320px' }}>
            {this.props.label ? `The ${this.props.label} tab hit a problem.` : 'This section hit a problem.'}{' '}
            Your trip data is still on this device.
          </p>
          {this.state.copied ? (
            <p style={{ color: 'var(--color-success, #15803d)', fontSize: '12px', margin: 0 }}>Report copied</p>
          ) : null}
          <button
            type="button"
            className="gradient-btn"
            style={{ padding: '8px 20px', fontSize: '13px', cursor: 'pointer' }}
            onClick={this.handleRetry}
          >
            Try again
          </button>
          <button
            type="button"
            className="secondary-btn"
            style={{ padding: '8px 20px', fontSize: '13px', cursor: 'pointer' }}
            onClick={() => window.location.reload()}
          >
            Reload
          </button>
          <button
            type="button"
            className="secondary-btn"
            style={{ padding: '8px 20px', fontSize: '13px', cursor: 'pointer' }}
            onClick={() => { void this.handleCopyReport(); }}
          >
            Copy report
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
