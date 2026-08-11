import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
  error: Error | null;
};

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error inside ErrorBoundary:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
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
          <div className="glass-card" style={{ maxWidth: '400px', width: '100%' }}>
            <h2 style={{ color: 'var(--color-danger)', marginBottom: '12px' }}>Something went wrong</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px', lineHeight: '1.5' }}>
              An unexpected error occurred while rendering the application. This could be due to a corrupted data state or network issue.
            </p>
            {this.state.error?.message && (
              <pre
                style={{
                  background: 'rgba(226, 115, 90, 0.08)',
                  color: 'var(--color-danger)',
                  padding: '12px',
                  borderRadius: 'var(--border-radius-sm)',
                  fontSize: '12px',
                  fontFamily: 'var(--font-family-mono)',
                  marginBottom: '24px',
                  overflowX: 'auto',
                  textAlign: 'left',
                }}
              >
                {this.state.error.message}
              </pre>
            )}
            <button type="button" className="gradient-btn" style={{ width: '100%' }} onClick={this.handleReload}>
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
