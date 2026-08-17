import { useState } from 'react';
import { IconShield, IconClose, IconCheck, IconAlertCircle } from './Icons';
import {
  SUPERADMIN_EMAIL,
  RECOVERY_PHONES,
  requestPhoneRecoveryOtp,
  verifyPhoneRecoveryOtp,
  maskPhoneNumber,
} from '../utils/superadminAuth';
import { useTripStore } from '../store/tripStore';
import { useAuthStore } from '../store/authStore';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function SuperadminAuthModal({ isOpen, onClose, onSuccess }: Props) {
  const unlockSuperadmin = useTripStore((s) => s.unlockSuperadmin);
  const lockSuperadmin = useTripStore((s) => s.lockSuperadmin);
  const setUserIdentity = useTripStore((s) => s.setUserIdentity);
  const setSuperadminSession = useAuthStore((s) => s.setSuperadminSession);

  // After a real Supabase sign-in, tripStore's userId must match the real
  // auth.uid() — writes (createTrip, addExpense, ...) carry it as an FK to
  // profiles, so the placeholder id unlockSuperadmin sets for offline/demo
  // mode would violate that FK for any real project.
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

  const [mode, setMode] = useState<'login' | 'recovery' | 'otp'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedPhone, setSelectedPhone] = useState<string>(RECOVERY_PHONES[0]);
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const ok = unlockSuperadmin(email, password);
      if (!ok) {
        setError('Invalid Superadmin credentials. Check email & password or reset via phone.');
        return;
      }
      try {
        await setSuperadminSession(email);
        syncRealIdentity();
      } catch (sessionError) {
        lockSuperadmin();
        setError(sessionError instanceof Error ? sessionError.message : 'Failed to establish superadmin session.');
        return;
      }
      setSuccessMsg('Superadmin privileges activated!');
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 500);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const res = requestPhoneRecoveryOtp(selectedPhone);
    if (res.success) {
      setSuccessMsg(res.message);
      setMode('otp');
    } else {
      setError(res.message);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const res = verifyPhoneRecoveryOtp(selectedPhone, otp);
    if (!res.success) {
      setError(res.message || 'Invalid or expired OTP.');
      return;
    }
    unlockSuperadmin(undefined, undefined, true); // skip verification on successful OTP
    try {
      await setSuperadminSession(SUPERADMIN_EMAIL);
      syncRealIdentity();
    } catch (sessionError) {
      lockSuperadmin();
      setError(sessionError instanceof Error ? sessionError.message : 'Failed to establish superadmin session.');
      return;
    }
    setSuccessMsg('Phone verified! Superadmin session unlocked.');
    setTimeout(() => {
      onSuccess?.();
      onClose();
    }, 500);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
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
                color: '#fff',
              }}
            >
              <IconShield size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '17px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                {mode === 'login' ? 'Superadmin Login' : mode === 'recovery' ? 'Password Recovery' : 'Enter Verification OTP'}
              </h3>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {mode === 'login' ? 'Master administrative access' : 'Authorized phone verification'}
              </span>
            </div>
          </div>
          <button
            type="button"
            className="secondary-btn"
            style={{ padding: '6px', borderRadius: '50%', border: 'none' }}
            onClick={onClose}
          >
            <IconClose size={16} />
          </button>
        </div>

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
              <label className="form-label">Superadmin Email</label>
              <input
                type="email"
                required
                className="input-field"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Superadmin@triptracker.com"
              />
            </div>

            <div className="form-group" style={{ marginBottom: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label" style={{ margin: 0 }}>Superadmin Password</label>
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
                    setMode('recovery');
                  }}
                >
                  Forgot / Reset via Phone?
                </button>
              </div>
              <input
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

        {mode === 'recovery' && (
          <form onSubmit={handleRequestOtp}>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: '1.4' }}>
              Select one of the registered authorized recovery phone numbers to receive the verification OTP and reset credentials:
            </p>

            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label className="form-label">Authorized Recovery Phone</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
                {RECOVERY_PHONES.map((phone) => (
                  <label
                    key={phone}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: selectedPhone === phone ? '1.5px solid var(--primary-accent)' : '1px solid var(--border-color)',
                      background: selectedPhone === phone ? 'rgba(31, 110, 104, 0.08)' : 'var(--bg-surface)',
                      cursor: 'pointer',
                      fontSize: '13.5px',
                      fontWeight: selectedPhone === phone ? 600 : 400,
                      color: 'var(--text-primary)',
                    }}
                  >
                    <input
                      type="radio"
                      name="recoveryPhone"
                      value={phone}
                      checked={selectedPhone === phone}
                      onChange={() => setSelectedPhone(phone)}
                    />
                    <span>{maskPhoneNumber(phone)} <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>({phone})</span></span>
                  </label>
                ))}
              </div>
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
              <button
                type="submit"
                className="primary-btn"
                style={{ flex: 1, padding: '10px' }}
              >
                Send OTP
              </button>
            </div>
          </form>
        )}

        {mode === 'otp' && (
          <form onSubmit={handleVerifyOtp}>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '14px', lineHeight: '1.4' }}>
              Enter the 6-digit verification code sent to <strong>{maskPhoneNumber(selectedPhone)}</strong>:
            </p>

            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label className="form-label">Verification OTP</label>
              <input
                type="text"
                required
                maxLength={6}
                className="input-field"
                style={{ fontSize: '18px', letterSpacing: '0.25em', textAlign: 'center', fontWeight: 700 }}
                placeholder="849201"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                autoFocus
              />
              <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                Default demo OTP: <strong>849201</strong>
              </span>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                className="secondary-btn"
                style={{ flex: 1, padding: '10px' }}
                onClick={() => {
                  setError('');
                  setMode('recovery');
                }}
              >
                Change Phone
              </button>
              <button
                type="submit"
                className="primary-btn"
                style={{ flex: 1, padding: '10px' }}
              >
                Verify &amp; Unlock
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
