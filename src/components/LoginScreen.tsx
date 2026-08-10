import { useEffect } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { IconMembers } from './Icons';

export function LoginScreen() {
  const [searchParams] = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/';

  const session = useAuthStore((s) => s.session);
  const initialized = useAuthStore((s) => s.initialized);
  const initialize = useAuthStore((s) => s.initialize);
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle);
  const authError = useAuthStore((s) => s.authError);
  const clearAuthError = useAuthStore((s) => s.clearAuthError);

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (initialized && session) {
    return <Navigate to={redirectPath} replace />;
  }

  return (
    <div
      className="fade-in"
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 20px',
        textAlign: 'center',
      }}
    >
      <h1 className="app-logo" style={{ marginBottom: '8px' }}>
        Trip Tracker 2026
      </h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '32px' }}>
        Sign in to create trips or join one a friend shared with you.
      </p>

      <div className="glass-card" style={{ width: '100%', maxWidth: '360px', padding: '28px 24px' }}>
        <div
          style={{
            width: '48px',
            height: '48px',
            margin: '0 auto 16px',
            borderRadius: '50%',
            background: 'var(--color-primary-soft, rgba(99,102,241,0.15))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <IconMembers size={22} className="icon" />
        </div>

        {authError && (
          <div
            role="alert"
            style={{
              marginBottom: '16px',
              padding: '10px 12px',
              borderRadius: '8px',
              background: 'var(--color-danger-soft, rgba(239,68,68,0.12))',
              color: 'var(--color-danger)',
              fontSize: '13px',
            }}
          >
            {authError}
            <button
              type="button"
              onClick={clearAuthError}
              style={{ marginLeft: '8px', background: 'none', border: 'none', color: 'inherit', textDecoration: 'underline', cursor: 'pointer' }}
            >
              dismiss
            </button>
          </div>
        )}

        <button
          type="button"
          className="gradient-btn"
          style={{ width: '100%', padding: '12px 16px', fontSize: '15px' }}
          onClick={() => signInWithGoogle(redirectPath)}
        >
          Continue with Google
        </button>

        <p style={{ marginTop: '16px', fontSize: '12px', color: 'var(--text-secondary)' }}>
          We only use your Google account to identify you to trip members you're invited by.
        </p>
      </div>
    </div>
  );
}
