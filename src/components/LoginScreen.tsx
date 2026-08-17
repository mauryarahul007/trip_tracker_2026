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

  const signInAsDemoUser = useAuthStore((s) => s.signInAsDemoUser);

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (initialized && session) {
    return <Navigate to={redirectPath} replace />;
  }

  return (
    <div className="app-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
      <div
        className="fade-in"
        style={{
          width: '100%',
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
          onClick={() => signInWithGoogle(redirectPath)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            width: '100%',
            padding: '12px 16px',
            fontSize: '15px',
            fontWeight: 600,
            color: '#1C2A38',
            background: '#FFFFFF',
            border: '1.5px solid var(--border-color)',
            borderRadius: 'var(--border-radius-sm)',
            cursor: 'pointer',
            transition: 'var(--transition-smooth)',
            boxShadow: '0 1px 2px rgba(28, 42, 56, 0.05)',
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = 'var(--bg-app)';
            e.currentTarget.style.borderColor = 'rgba(31, 110, 104, 0.3)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = '#FFFFFF';
            e.currentTarget.style.borderColor = 'var(--border-color)';
          }}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0, display: 'block' }}>
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" stroke="none" style={{ fill: '#4285F4', stroke: 'none' }}/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" stroke="none" style={{ fill: '#34A853', stroke: 'none' }}/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" stroke="none" style={{ fill: '#FBBC05', stroke: 'none' }}/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" stroke="none" style={{ fill: '#EA4335', stroke: 'none' }}/>
          </svg>
          <span>Sign in with Google</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', margin: '18px 0', color: 'var(--text-muted)', fontSize: '12px' }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }} />
          <span style={{ padding: '0 10px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>or</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }} />
        </div>

        <button
          type="button"
          onClick={() => signInAsDemoUser()}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            width: '100%',
            padding: '11px 16px',
            fontSize: '14px',
            fontWeight: 600,
            color: '#FFFFFF',
            background: 'linear-gradient(135deg, #1f6e68 0%, #154c48 100%)',
            border: 'none',
            borderRadius: 'var(--border-radius-sm)',
            cursor: 'pointer',
            transition: 'var(--transition-smooth)',
            boxShadow: '0 2px 6px rgba(31, 110, 104, 0.25)',
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.opacity = '0.92';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.opacity = '1';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          <span>⚡ Continue in Demo Mode (Local Testing)</span>
        </button>

        <p style={{ marginTop: '16px', fontSize: '12px', color: 'var(--text-secondary)' }}>
          Instant local access to test all trips, settings & SuperAdmin Bug Tracker.
        </p>
      </div>
    </div>
  </div>
  );
}
