import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useTripStore } from '../store/tripStore';
import { isMissingSupabaseEnv } from '../services/supabaseClient';
import { fetchAppFlag } from '../services/tripApi';
import { IconShield, IconAlertCircle, IconCheck, IconLock } from './Icons';
import { triggerHaptic } from '../utils/haptics';

const showDevFallbacks = import.meta.env.DEV || isMissingSupabaseEnv;

export function LoginScreen() {
  const [searchParams] = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/';
  const navigate = useNavigate();

  const session = useAuthStore((s) => s.session);
  const initialized = useAuthStore((s) => s.initialized);
  const initialize = useAuthStore((s) => s.initialize);
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle);
  const signInAsGuest = useAuthStore((s) => s.signInAsGuest);
  const authError = useAuthStore((s) => s.authError);
  const clearAuthError = useAuthStore((s) => s.clearAuthError);

  const isSuperadmin = useTripStore((s) => s.isSuperadmin);
  const setUserIdentity = useTripStore((s) => s.setUserIdentity);
  const signInSuperadmin = useAuthStore((s) => s.signInSuperadmin);
  const requestSuperadminPasswordReset = useAuthStore((s) => s.requestSuperadminPasswordReset);

  const [persona, setPersona] = useState<'traveler' | 'admin'>('traveler');
  const [signInsPaused, setSignInsPaused] = useState(false);

  // Superadmin credentials form states
  const [adminMode, setAdminMode] = useState<'login' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [adminError, setAdminError] = useState('');
  const [adminSuccess, setAdminSuccess] = useState('');
  const [isSubmittingAdmin, setIsSubmittingAdmin] = useState(false);

  useEffect(() => {
    initialize();
  }, [initialize]);

  // Superadmin-set gate (Ops Deck > Flags > Fleet Controls)
  useEffect(() => {
    fetchAppFlag('signup_gate')
      .then((v) => setSignInsPaused(v === true))
      .catch(() => {});
  }, []);

  const syncRealIdentity = () => {
    const sessionState = useAuthStore.getState().session;
    if (sessionState?.user?.id) {
      const displayName =
        (sessionState.user.user_metadata?.full_name as string | undefined) ||
        (sessionState.user.user_metadata?.name as string | undefined) ||
        'Super Admin';
      setUserIdentity(sessionState.user.id, displayName);
    }
  };

  const handleAdminLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError('');
    setAdminSuccess('');
    setIsSubmittingAdmin(true);
    try {
      const ok = await signInSuperadmin(email, password);
      if (!ok) {
        setAdminError(useAuthStore.getState().authError || 'Invalid email or password.');
        return;
      }
      syncRealIdentity();
      setAdminSuccess('Superadmin privileges activated!');
      triggerHaptic('success');
      setTimeout(() => {
        navigate(redirectPath, { replace: true });
      }, 500);
    } finally {
      setIsSubmittingAdmin(false);
    }
  };

  const handleAdminForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError('');
    setAdminSuccess('');
    setIsSubmittingAdmin(true);
    try {
      const res = await requestSuperadminPasswordReset(email);
      if (res.success) {
        setAdminSuccess(res.message);
        triggerHaptic('success');
      } else {
        setAdminError(res.message);
        triggerHaptic('warning');
      }
    } finally {
      setIsSubmittingAdmin(false);
    }
  };

  if (initialized && (session || isSuperadmin)) {
    return <Navigate to={redirectPath} replace />;
  }

  return (
    <div className="login-screen-wrap">
      {/* Ambient decorative background layers */}
      <div className="login-ambient-mesh" aria-hidden="true" />
      <div className="login-flight-grid" aria-hidden="true" />

      {/* Boarding Pass Stub Card */}
      <main className="login-boarding-card fade-in">
        {/* Ticket Perforation Geometry */}
        <div className="login-card-notch-left" aria-hidden="true" />
        <div className="login-card-notch-right" aria-hidden="true" />
        <div className="login-card-perf-line" aria-hidden="true" />

        {/* Top Ticket Header (Stub) */}
        <div className="login-stub-header">
          <div className="login-stub-top-row">
            <div className="login-brand-group">
              <span className="login-brand-icon" aria-hidden="true">✈️</span>
              <div>
                <div className="login-brand-title">TRIP TRACKER</div>
                <div className="login-brand-edition">2026 EDITION</div>
              </div>
            </div>
            <span className="login-ticket-stamp">FLIGHT 2026</span>
          </div>

          <h1 className="login-main-heading">
            {persona === 'traveler' ? 'Passport & Sign In' : 'Ops Cockpit'}
          </h1>
          <p className="login-main-subheading">
            {persona === 'traveler'
              ? 'Shared travel ledger · Offline settlement engine'
              : 'Master administrative operations & fleet controls'}
          </p>

          {/* Dual-Persona Segmented Pill Toggle */}
          <div className="login-segmented-pill" role="tablist" aria-label="Sign in role">
            <button
              type="button"
              role="tab"
              aria-selected={persona === 'traveler'}
              className={`login-pill-btn${persona === 'traveler' ? ' active' : ''}`}
              onClick={() => {
                triggerHaptic('light');
                setPersona('traveler');
              }}
            >
              <span>✈️ Traveler</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={persona === 'admin'}
              className={`login-pill-btn${persona === 'admin' ? ' active-admin' : ''}`}
              onClick={() => {
                triggerHaptic('light');
                setPersona('admin');
              }}
            >
              <span>🛡️ Superadmin</span>
            </button>
          </div>
        </div>

        {/* Body: Traveler Mode */}
        {persona === 'traveler' && (
          <div className="login-stub-body fade-in">
            {authError && (
              <div role="alert" className="login-alert-banner danger">
                <div className="login-alert-header">
                  <IconAlertCircle size={15} />
                  <span>{authError}</span>
                </div>
                <div className="login-alert-actions">
                  {showDevFallbacks && (
                    <button
                      type="button"
                      onClick={() => {
                        signInAsGuest();
                        navigate(redirectPath, { replace: true });
                      }}
                      className="login-alert-link-btn"
                    >
                      Continue as Guest
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={clearAuthError}
                    className="login-alert-dismiss-btn"
                  >
                    dismiss
                  </button>
                </div>
              </div>
            )}

            {signInsPaused && (
              <div role="alert" className="login-alert-banner warning">
                <IconAlertCircle size={15} />
                <span>New sign-ins are temporarily paused. Please check back shortly.</span>
              </div>
            )}

            {/* Primary Action: Google Sign In */}
            <button
              type="button"
              disabled={signInsPaused}
              onClick={() => {
                triggerHaptic('medium');
                signInWithGoogle(redirectPath);
              }}
              className="login-btn-google"
              title="Sign in with Google Account"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" className="login-google-icon" aria-hidden="true">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              <span>Continue with Google</span>
            </button>

            {showDevFallbacks && (
              <div className="login-guest-fallback-wrap">
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    signInAsGuest();
                    navigate(redirectPath, { replace: true });
                  }}
                  className="login-guest-link-btn"
                >
                  Continue as Guest Traveler
                </button>
              </div>
            )}

            <div className="login-security-seal">
              <IconLock size={12} className="login-lock-icon" />
              <span>SUPABASE CLOUD AUTH · ZERO SPAM</span>
            </div>
          </div>
        )}

        {persona === 'admin' && (
          <div className="login-stub-body fade-in">
            <div className="login-admin-banner">
              <div className="login-admin-banner-icon">
                <IconShield size={16} />
              </div>
              <div>
                <div className="login-admin-banner-title">Master Ops Cockpit</div>
                <div className="login-admin-banner-sub">Authorized personnel credentials required</div>
              </div>
            </div>

            {adminError && (
              <div role="alert" className="login-alert-banner danger">
                <IconAlertCircle size={14} />
                <span>{adminError}</span>
              </div>
            )}

            {adminSuccess && (
              <div role="alert" className="login-alert-banner success">
                <IconCheck size={14} />
                <span>{adminSuccess}</span>
              </div>
            )}

            {adminMode === 'login' ? (
              <form onSubmit={handleAdminLoginSubmit} className="login-form-fields">
                <div className="form-group">
                  <label className="form-label" htmlFor="admin-email">Admin Email</label>
                  <input
                    id="admin-email"
                    type="email"
                    required
                    className="input-field login-input-field"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@triptracker.local"
                  />
                </div>

                <div className="form-group">
                  <div className="login-field-header-row">
                    <label className="form-label" htmlFor="admin-password" style={{ margin: 0 }}>Password</label>
                    <button
                      type="button"
                      className="login-forgot-link-btn"
                      onClick={() => {
                        triggerHaptic('light');
                        setAdminError('');
                        setAdminSuccess('');
                        setAdminMode('forgot');
                      }}
                    >
                      Forgot password?
                    </button>
                  </div>
                  <input
                    id="admin-password"
                    type="password"
                    required
                    className="input-field login-input-field font-mono"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                  />
                </div>

                <button
                  type="submit"
                  className="login-btn-admin-submit"
                  disabled={isSubmittingAdmin}
                  onClick={() => triggerHaptic('medium')}
                >
                  <IconShield size={16} />
                  <span>{isSubmittingAdmin ? 'Authenticating...' : '⚡ Unlock Cockpit & Admin Tools'}</span>
                </button>
              </form>
            ) : (
              <form onSubmit={handleAdminForgotSubmit} className="login-form-fields">
                <div className="form-group">
                  <label className="form-label" htmlFor="admin-reset-email">Admin Email</label>
                  <input
                    id="admin-reset-email"
                    type="email"
                    required
                    className="input-field login-input-field"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@triptracker.local"
                  />
                </div>

                <div className="login-form-actions-row">
                  <button
                    type="button"
                    className="secondary-btn"
                    style={{ flex: 1, padding: '11px' }}
                    onClick={() => {
                      triggerHaptic('light');
                      setAdminError('');
                      setAdminSuccess('');
                      setAdminMode('login');
                    }}
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    className="login-btn-admin-submit"
                    style={{ flex: 1.5, marginTop: 0 }}
                    disabled={isSubmittingAdmin}
                    onClick={() => triggerHaptic('medium')}
                  >
                    {isSubmittingAdmin ? 'Sending...' : 'Send Reset Link'}
                  </button>
                </div>
              </form>
            )}

            <div className="login-security-seal">
              <IconLock size={12} className="login-lock-icon" />
              <span>256-BIT ENCRYPTED · RLS PROTECTED</span>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
