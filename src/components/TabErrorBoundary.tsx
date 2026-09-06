import { Component, type ErrorInfo, type ReactNode } from 'react';
import { diagnosticLogger } from '../utils/diagnosticLogger';

type Props = {
  children: ReactNode;
  label?: string;
};

type State = {
  hasError: boolean;
  error: Error | null;
};

export class TabErrorBoundary extends Component<Props, State> {
  public state: State = { hasError: false, error: null };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    diagnosticLogger.log('error', `Tab crash (${this.props.label ?? 'unknown'}): ${error.message}`, errorInfo.componentStack);
    console.error('TabErrorBoundary caught:', error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
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
          <div style={{ fontSize: '28px' }}>⚠️</div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0, lineHeight: 1.5 }}>
            {this.props.label ? `The ${this.props.label} tab` : 'This section'} ran into an error.
          </p>
          <button
            type="button"
            className="gradient-btn"
            style={{ padding: '8px 20px', fontSize: '13px', borderRadius: '8px', cursor: 'pointer' }}
            onClick={this.handleRetry}
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
