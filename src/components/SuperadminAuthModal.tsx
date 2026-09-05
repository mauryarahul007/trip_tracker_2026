import { useState, useRef, useEffect } from 'react';
import { IconShield, IconClose, IconCheck, IconAlertCircle } from './Icons';
import { useTripStore } from '../store/tripStore';
import { useAuthStore } from '../store/authStore';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { isBiometricAvailable, verifyBiometricCredential } from '../utils/webAuthn';
import { triggerHaptic } from '../utils/haptics';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function SuperadminAuthModal({ isOpen, onClose, onSuccess }: Props) {
  const setUserIdentity = useTripStore((s) => s.setUserIdentity);
  const signInSuperadmin = useAuthStore((s) => s.signInSuperadmin);
  const requestSuperadminPasswordReset = useAuthStore((s) => s.requestSuperadminPasswordReset);
  const sheetRef = useRef<HTMLDivElement>(null);

  useFocusTrap(sheetRef, isOpen, false, onClose);

  // After a real Supabase sign-in, tripStore's userId must match the real
  // auth.uid() — writes (createTrip, addExpense, ...) carry it as an FK to
  // profiles, so the placeholder id used for offline/demo mode would
  // violate that FK for any real project.
  const syncRealIdentity = () => {
    const session = useAuthStore.getState().session;
    if (session?.user?.id) {
      const displayName =
        (session.user.user_metadata?.full_name as string | undefined) ||
        (session.user.user_metadata?.name as string | undefined) ||
        'Super Admin';
      setUserIdentity(session.user.id, displayName);
    }
  };

  const [mode, setMode] = useState<'login' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bioAvailable, setBioAvailable] = useState(false);

  useEffect(() => {
    isBiometricAvailable().then(setBioAvailable);
  }, []);

  const handleBiometricUnlock = async () => {
    setError('');
    setIsSubmitting(true);
    triggerHaptic('light');
    try {
      const res = await verifyBiometricCredential();
      if (res.success) {
        useTripStore.getState().setIsSuperadmin(true);
        triggerHaptic('success');
        setSuccessMsg('Biometric verification passed! Privileges activated.');
        setTimeout(() => {
          onSuccess?.();
          onClose();
        }, 500);
      } else {
        triggerHaptic('heavy');
        setError(res.error || 'Biometric verification failed.');
      }
    } catch {
      triggerHaptic('heavy');
      setError('Biometric verification error.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const ok = await signInSuperadmin(email, password);
      if (!ok) {
        setError(useAuthStore.getState().authError || 'Invalid email or password.');
        return;
      }
      syncRealIdentity();
      setSuccessMsg('Superadmin privileges activated!');
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 500);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const res = await requestSuperadminPasswordReset(email);
      if (res.success) {
        setSuccessMsg(res.message);
      } else {
        setError(res.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="superadmin-dialog-title"
        tabIndex={-1}
        className="glass-card fade-in modal-sheet"
        style={{
          maxWidth: '420px',
          background: 'var(--bg-surface)',
          border: '1.5px solid var(--primary-accent)',
          boxShadow: '0 12px 36px rgba(0, 0, 0, 0.25)',
          padding: '24px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #1F6E68, #14B8A6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFF',
                flexShrink: 0,
              }}
              aria-hidden="true"
            >
              <IconShield size={19} />
            </div>
            <div>
              <h3 id="superadmin-dialog-title" style={{ fontSize: '17px', margin: 0, fontWeight: 700 }}>
                {mode === 'login' ? 'Super User Login' : 'Reset Super Password'}
              </h3>
              <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: '2px 0 0' }}>
                {mode === 'login' ? 'Elevated access for system ops & bugledger' : 'Send password recovery link to admin email'}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="touch-target-btn"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              padding: '6px',
              borderRadius: '6px',
              minWidth: '44px',
              minHeight: '44px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onClick={onClose}
            aria-label="Close dialog"
          >
            <IconClose size={16} />
          </button>
        </div>

        {bioAvailable && mode === 'login' && (
          <div style={{ marginBottom: '16px' }}>
            <button
              type="button"
              onClick={handleBiometricUnlock}
              disabled={isSubmitting}
              className="primary-btn"
              style={{
                width: '100%',
                padding: '10px 14px',
                fontSize: '13px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                background: 'linear-gradient(135deg, #1F6E68, #14B8A6)',
                border: 'none',
                borderRadius: '10px',
                cursor: isSubmitting ? 'wait' : 'pointer',
              }}
            >
              <span>🔐 Quick Unlock with Biometrics</span>
            </button>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                margin: '14px 0 6px',
                color: 'var(--text-muted)',
                fontSize: '11px',
              }}
            >
              <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }} />
              <span>or sign in with password</span>
              <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }} />
            </div>
          </div>
        )}

        {error && (
          <div
            style={{
              padding: '10px 12px',
              borderRadius: '8px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#EF4444',
              fontSize: '12.5px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <IconAlertCircle size={14} /> {error}
          </div>
        )}

        {successMsg && (
          <div
            style={{
              padding: '10px 12px',
              borderRadius: '8px',
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              color: '#10B981',
              fontSize: '12.5px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <IconCheck size={14} /> {successMsg}
          </div>
        )}

        {mode === 'login' && (
          <form onSubmit={handleLoginSubmit}>
            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label className="form-label" htmlFor="superadmin-email">Superadmin Email</label>
              <input
                id="superadmin-email"
                type="email"
                required
                className="input-field"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>

            <div className="form-group" style={{ marginBottom: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label" style={{ margin: 0 }} htmlFor="superadmin-password">Superadmin Password</label>
                <button
                  type="button"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--primary-accent)',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: 0,
                  }}
                  onClick={() => {
                    setError('');
                    setSuccessMsg('');
                    setMode('forgot');
                  }}
                >
                  Forgot password?
                </button>
              </div>
              <input
                id="superadmin-password"
                type="password"
                required
                className="input-field"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                style={{ marginTop: '6px' }}
              />
            </div>

            <button
              type="submit"
              className="primary-btn"
              style={{ width: '100%', padding: '10px 16px', fontSize: '14px', fontWeight: 600 }}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Authenticating...' : 'Unlock Superadmin Cockpit'}
            </button>
          </form>
        )}

        {mode === 'forgot' && (
          <form onSubmit={handleForgotSubmit}>
            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label className="form-label" htmlFor="superadmin-email">Superadmin Email</label>
              <input
                id="superadmin-email"
                type="email"
                required
                className="input-field"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                className="secondary-btn"
                style={{ flex: 1, padding: '10px' }}
                onClick={() => {
                  setError('');
                  setSuccessMsg('');
                  setMode('login');
                }}
              >
                Back to Login
              </button>
              <button type="submit" className="primary-btn" style={{ flex: 1, padding: '10px' }} disabled={isSubmitting}>
                {isSubmitting ? 'Sending...' : 'Send Reset Link'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
