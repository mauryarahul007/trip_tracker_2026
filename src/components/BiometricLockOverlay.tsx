import { useState, useEffect } from 'react';
import { verifyBiometricCredential } from '../utils/webAuthn';
import { triggerHaptic } from '../utils/haptics';
import { useAuthStore } from '../store/authStore';

interface Props {
  userId: string;
  userDisplayName?: string | null;
  onUnlocked: () => void;
}

export function BiometricLockOverlay({ userId, userDisplayName, onUnlocked }: Props) {
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const signOut = useAuthStore((s) => s.signOut);

  const handleUnlock = async () => {
    if (isVerifying) return;
    setIsVerifying(true);
    setErrorMsg(null);
    triggerHaptic('light');

    try {
      const res = await verifyBiometricCredential(userId);
      if (res.success) {
        triggerHaptic('success');
        onUnlocked();
      } else {
        triggerHaptic('heavy');
        setErrorMsg(res.error || 'Biometric verification failed.');
      }
    } catch {
      triggerHaptic('heavy');
      setErrorMsg('Failed to verify biometrics. Please tap to try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  // Attempt auto-prompt on mount
  useEffect(() => {
    let unmounted = false;
    const autoPrompt = async () => {
      // Small pause to allow UI transition
      await new Promise((r) => setTimeout(r, 200));
      if (unmounted) return;
      handleUnlock();
    };
    autoPrompt();
    return () => {
      unmounted = true;
    };
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Screen Lock"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'rgba(10, 15, 26, 0.88)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        color: '#FFFFFF',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '380px',
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.14)',
          borderRadius: '24px',
          padding: '36px 24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          boxShadow: '0 24px 48px rgba(0, 0, 0, 0.4)',
        }}
      >
        {/* Biometric Icon Button */}
        <button
          type="button"
          onClick={handleUnlock}
          disabled={isVerifying}
          aria-label="Unlock with biometrics"
          style={{
            position: 'relative',
            width: '84px',
            height: '84px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            border: 'none',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: isVerifying ? 'default' : 'pointer',
            boxShadow: '0 8px 24px rgba(59, 130, 246, 0.45)',
            marginBottom: '20px',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
          }}
        >
          <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* Fingerprint icon path */}
            <path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4" />
            <path d="M14 13.12c0 2.38 0 6.38-1 8.88" />
            <path d="M2 16h.01" />
            <path d="M21.8 16c.2-2 .131-5.354 0-6" />
            <path d="M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2" />
            <path d="M8.65 22c.21-.66.45-1.32.57-2" />
            <path d="M9 6.8a6 6 0 0 1 9 5.2v2" />
            <path d="M17 21a11.96 11.96 0 0 0 1.25-3.5" />
            <path d="M17 11.5a4 4 0 0 0-8 0v1" />
            <path d="M12 2a10 10 0 0 0-10 10" />
            <path d="M18.8 4A10.05 10.05 0 0 1 22 12" />
          </svg>
        </button>

        <h2 style={{ margin: '0 0 6px', fontSize: '20px', fontWeight: 700, letterSpacing: '-0.02em' }}>
          Trip Tracker is Locked
        </h2>
        <p style={{ margin: '0 0 24px', fontSize: '13px', color: 'rgba(255, 255, 255, 0.7)', lineHeight: 1.4 }}>
          {userDisplayName ? `Welcome back, ${userDisplayName}. ` : ''}
          Authenticate with Touch ID, Face ID, or Windows Hello to continue.
        </p>

        {errorMsg && (
          <div
            style={{
              padding: '8px 14px',
              borderRadius: '10px',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              color: '#fca5a5',
              fontSize: '12px',
              marginBottom: '18px',
              lineHeight: 1.4,
            }}
          >
            {errorMsg}
          </div>
        )}

        <button
          type="button"
          onClick={handleUnlock}
          disabled={isVerifying}
          className="primary-btn"
          style={{
            width: '100%',
            padding: '12px 18px',
            fontSize: '14px',
            fontWeight: 600,
            borderRadius: '12px',
            marginBottom: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
        >
          <span>{isVerifying ? 'Verifying…' : 'Unlock Now'}</span>
        </button>

        <button
          type="button"
          onClick={async () => {
            triggerHaptic('medium');
            await signOut();
          }}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'rgba(255, 255, 255, 0.55)',
            fontSize: '12px',
            fontWeight: 500,
            cursor: 'pointer',
            padding: '8px',
          }}
        >
          Sign out or switch account
        </button>
      </div>
    </div>
  );
}
